import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";
import { hashPassword } from "./auth";
import { adminPasswordSchema, securityAnswersSchema, securityVerifySchema, ADMIN_SECURITY_QUESTIONS, updateUniversalHouseEdgeSchema, type User } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user?.id) {
      storage.updateLastActive(req.user.id).catch(() => {});
    }
    next();
  });

  // === HOUSE EDGE & HIGH-BET PROTECTION HELPERS ===
  // In-memory locked-loss flag for split bet/win games (key: `${userId}:${gameType}`)
  const lockedLossMap = new Map<string, boolean>();
  const lockedBetAmountMap = new Map<string, number>();
  const lossKey = (userId: number, gameType: string) => `${userId}:${gameType}`;

  // Pending rounds for split bet/win games. Each /bet mints a roundId that the
  // matching /win must present; this prevents settling a win without a bet,
  // settling the same bet twice, or claiming a payout larger than bet × maxOdds.
  type PendingRound = { userId: number; gameType: string; betAmount: number; maxOdds: number; createdAt: number };
  const pendingRoundsMap = new Map<string, PendingRound>();
  const newRoundId = () => randomBytes(12).toString("hex");
  // Stale-round purge (10 min TTL).
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [id, r] of Array.from(pendingRoundsMap.entries())) {
      if (r.createdAt < cutoff) pendingRoundsMap.delete(id);
    }
  }, 60 * 1000).unref?.();

  // ===== UNIVERSAL HOUSE EDGE =====
  // When the admin enables the universal house edge, every game consults this
  // single config (RTP target + minimum house bankroll) instead of its own
  // per-game houseEdgePct/totalBet/totalPaid stats. We additionally block any
  // payout that would push the combined house bankroll (admin + super
  // managers + managers) below `minHouseBalance`.
  //
  // Returns the per-game force-lose decision against universal stats, or null
  // when the universal toggle is OFF (callers should fall back to per-game).
  async function checkUniversalForceLose(probeWin: number): Promise<boolean | null> {
    let u;
    try { u = await storage.getUniversalHouseEdge(); } catch { return null; }
    if (!u.enabled) return null;
    // Bankroll floor: never let a win drag the house below the configured floor.
    if (u.minHouseBalance > 0) {
      const bankroll = await storage.getHouseBankroll().catch(() => 0);
      if (bankroll - probeWin < u.minHouseBalance) return true;
    }
    // RTP target across all games.
    const targetRTP = 1 - (u.houseEdgePct ?? 5) / 100;
    if (u.totalBet > 0 && (u.totalPaid + Math.max(1, probeWin)) / u.totalBet > targetRTP) return true;
    return false;
  }

  // Pre-bet bankroll guard: if the universal house edge is enabled with a
  // minimum-bankroll floor, refuse a bet whose maximum possible payout would
  // drop the combined house bankroll below that floor. This stops the player
  // from seeing a "win" animation that the server would later have to void.
  async function checkBankrollFloorForBet(maxPotentialWin: number): Promise<{ blocked: boolean; bankroll?: number; floor?: number }> {
    let u;
    try { u = await storage.getUniversalHouseEdge(); } catch { return { blocked: false }; }
    if (!u.enabled || u.minHouseBalance <= 0) return { blocked: false };
    const bankroll = await storage.getHouseBankroll().catch(() => 0);
    if (bankroll - maxPotentialWin < u.minHouseBalance) {
      return { blocked: true, bankroll, floor: u.minHouseBalance };
    }
    return { blocked: false };
  }

  async function recordBet(gameType: string, betAmount: number) {
    if (betAmount <= 0) return;
    await storage.recordHouseEdgeBet(gameType, betAmount).catch(() => {});
    await storage.recordUniversalBet(betAmount).catch(() => {});
  }

  async function recordPayout(gameType: string, payout: number) {
    if (payout <= 0) return;
    await storage.recordHouseEdgePayout(gameType, payout).catch(() => {});
    await storage.recordUniversalPayout(payout).catch(() => {});
  }

  // Single-call helper: records the bet, then validates the intended win against
  // house-edge & high-bet protection. Returns the actually-paid win amount.
  async function processCombinedBetAndWin(
    gameType: string, userId: number, betAmount: number, intendedWin: number
  ): Promise<number> {
    await recordBet(gameType, betAmount);
    if (intendedWin <= 0) return 0;
    const settings = await storage.getGameSettings(gameType);
    if (!settings) {
      const blockedByUniversal = await checkUniversalForceLose(intendedWin);
      if (blockedByUniversal) return 0;
      await recordPayout(gameType, intendedWin);
      return intendedWin;
    }
    // High-bet protection (always active)
    if (settings.highBetThreshold > 0 && betAmount >= settings.highBetThreshold) {
      const totalWagered = await storage.getUserTotalWagered(userId);
      const required = settings.highBetThreshold * settings.highBetWagerMultiplier;
      if (totalWagered < required) return 0;
    }
    // Universal house edge takes precedence when enabled.
    const universalDecision = await checkUniversalForceLose(intendedWin);
    if (universalDecision === true) return 0;
    if (universalDecision === null) {
      // Per-game house edge
      const targetRTP = 1 - (settings.houseEdgePct ?? 5) / 100;
      const newTotalBet = settings.totalBet + betAmount;
      if (newTotalBet > 0 && (settings.totalPaid + intendedWin) / newTotalBet > targetRTP) {
        return 0;
      }
    }
    await recordPayout(gameType, intendedWin);
    return intendedWin;
  }

  // Split-call helpers: bet endpoint records and may flag a forced loss; win endpoint applies it.
  async function recordBetAndCheckHighBet(gameType: string, userId: number, betAmount: number) {
    await recordBet(gameType, betAmount);
    lockedBetAmountMap.set(lossKey(userId, gameType), betAmount);
    const settings = await storage.getGameSettings(gameType);
    if (!settings) { lockedLossMap.delete(lossKey(userId, gameType)); return; }
    if (settings.highBetThreshold > 0 && betAmount >= settings.highBetThreshold) {
      const totalWagered = await storage.getUserTotalWagered(userId);
      const required = settings.highBetThreshold * settings.highBetWagerMultiplier;
      if (totalWagered < required) {
        lockedLossMap.set(lossKey(userId, gameType), true);
        return;
      }
    }
    lockedLossMap.delete(lossKey(userId, gameType));
  }

  // Pre-flight: would the maximum credible win for this round be blocked right now?
  // Used by /bet endpoints so the iframe game can force a losing visual outcome
  // (avoids showing a "win" that the server then silently refuses to credit).
  // maxPotentialWin should be the largest payout this bet can produce (e.g. bet * maxOdds).
  async function computeForceLose(gameType: string, userId: number, maxPotentialWin: number = 1): Promise<boolean> {
    const k = lossKey(userId, gameType);
    if (lockedLossMap.get(k)) return true;
    const probe = Math.max(1, maxPotentialWin);
    const universalDecision = await checkUniversalForceLose(probe);
    if (universalDecision === true) return true;
    if (universalDecision === false) return false; // universal is enabled and allows it
    // Universal disabled — fall back to per-game
    const settings = await storage.getGameSettings(gameType);
    if (!settings) return false;
    const targetRTP = 1 - (settings.houseEdgePct ?? 5) / 100;
    if (settings.totalBet > 0 && (settings.totalPaid + probe) / settings.totalBet > targetRTP) return true;
    return false;
  }

  async function applyHouseEdgeForWin(
    gameType: string, userId: number, intendedWin: number
  ): Promise<number> {
    if (intendedWin <= 0) return 0;
    const k = lossKey(userId, gameType);
    if (lockedLossMap.get(k)) {
      lockedLossMap.delete(k);
      lockedBetAmountMap.delete(k);
      return 0;
    }
    const universalDecision = await checkUniversalForceLose(intendedWin);
    if (universalDecision === true) {
      lockedBetAmountMap.delete(k);
      return 0;
    }
    if (universalDecision === null) {
      // Universal disabled — apply per-game RTP cap.
      const settings = await storage.getGameSettings(gameType);
      if (settings) {
        const targetRTP = 1 - (settings.houseEdgePct ?? 5) / 100;
        if (settings.totalBet > 0 && (settings.totalPaid + intendedWin) / settings.totalBet > targetRTP) {
          lockedBetAmountMap.delete(k);
          return 0;
        }
      }
    }
    await recordPayout(gameType, intendedWin);
    lockedBetAmountMap.delete(k);
    return intendedWin;
  }

  // === PER-USER GAME ENABLE / DISABLE (admin-controlled, cascades) ===
  // gateGame returns `true` (and writes a response) when the request should be
  // blocked: either unauthenticated, or this game is disabled for the user OR
  // any of their ancestors in the createdBy chain. Callers do
  // `if (await gateGame(req, res, "dice")) return;` at the top of game routes.
  async function gateGame(req: any, res: any, gameType: string): Promise<boolean> {
    if (!req.isAuthenticated()) { res.status(401).send("Unauthorized"); return true; }
    try {
      const disabled = await storage.getEffectiveDisabledGames(req.user.id);
      if (disabled.includes(gameType)) {
        res.status(403).json({ message: "This game is currently disabled for your account.", gameDisabled: true, gameType });
        return true;
      }
    } catch (e) {
      // Fail-CLOSED: if we cannot determine whether this game is allowed for
      // the user, refuse the request. This prevents a transient DB error from
      // becoming an authorization-bypass that lets disabled games run.
      res.status(503).json({ message: "Game access check unavailable, please try again." });
      return true;
    }
    return false;
  }

  // Effective disabled list for the logged-in player (used by the lobby UI).
  app.get("/api/user/disabled-games", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const list = await storage.getEffectiveDisabledGames(req.user.id);
    res.json(list);
  });

  // Admin: read the disable rows that were set *directly* on a user (not the
  // effective/cascaded list) — this is what the toggle UI binds to.
  app.get("/api/admin/users/:id/disabled-games", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ message: "Invalid user id" });
    const own = await storage.getDisabledGamesForUser(userId);
    const effective = await storage.getEffectiveDisabledGames(userId);
    res.json({ own, effective });
  });

  // Admin: toggle a single (user, gameType) on/off. Cascades to all sub-users
  // automatically because the lookup walks the createdBy chain on every check.
  app.post("/api/admin/users/:id/disabled-games", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ message: "Invalid user id" });
    const { gameType, disabled } = z.object({
      gameType: z.string().min(1),
      disabled: z.boolean(),
    }).parse(req.body);
    await storage.setGameDisabled(userId, gameType, disabled);
    res.json({ ok: true });
  });

  // === ADMIN USER STATS ===
  app.get("/api/admin/user-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const allUsers = await storage.getAllUsers();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stats = {
      superManagers: { total: 0, online: 0 },
      managers: { total: 0, online: 0 },
      users: { total: 0, online: 0 },
    };
    for (const u of allUsers) {
      if (u.role === 'admin') continue;
      const isOnline = u.lastActive && new Date(u.lastActive) > fiveMinAgo;
      if (u.role === 'super_manager') {
        stats.superManagers.total++;
        if (isOnline) stats.superManagers.online++;
      } else if (u.role === 'manager') {
        stats.managers.total++;
        if (isOnline) stats.managers.online++;
      } else if (u.role === 'user') {
        stats.users.total++;
        if (isOnline) stats.users.online++;
      }
    }
    res.json(stats);
  });

  // === ADMIN SECURITY QUESTIONS ===
  app.post("/api/admin/security-questions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const answers = securityAnswersSchema.parse(req.body.answers);
      const loweredAnswers = answers.map(a => ({ question: a.question, answer: a.answer.toLowerCase().trim() }));
      await storage.setSecurityAnswers(req.user.id, loweredAnswers);
      res.json({ message: "Security questions saved successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid security questions" });
    }
  });

  app.get("/api/admin/security-questions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const answers = await storage.getSecurityAnswers(req.user.id);
    res.json(answers.map(a => ({ question: a.question, hasAnswer: true })));
  });

  app.post("/api/admin/verify-security", async (req, res) => {
    try {
      const { username, answers } = z.object({
        username: z.string(),
        answers: securityVerifySchema,
      }).parse(req.body);

      const admin = await storage.getUserByUsername(username);
      if (!admin || admin.role !== 'admin') return res.status(404).json({ message: "Admin account not found" });

      const storedAnswers = await storage.getSecurityAnswers(admin.id);
      if (storedAnswers.length === 0) return res.status(400).json({ message: "Security questions not set up" });

      let correctCount = 0;
      for (const provided of answers) {
        const stored = storedAnswers.find(s => s.question === provided.question);
        if (stored && stored.answer === provided.answer.toLowerCase().trim()) {
          correctCount++;
        }
      }

      if (correctCount < 2) {
        return res.status(400).json({ message: "At least 2 security answers must be correct" });
      }

      res.json({ verified: true, userId: admin.id });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { userId, newPassword } = z.object({
        userId: z.number(),
        newPassword: adminPasswordSchema,
      }).parse(req.body);

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') return res.status(404).json({ message: "Admin not found" });

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      res.json({ message: "Password reset successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid password format" });
    }
  });

  // === ADMIN USERNAME MANAGEMENT ===
  app.post("/api/admin/update-username", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { newUsername } = z.object({ newUsername: z.string().min(2) }).parse(req.body);

      if (newUsername !== "Admin") {
        const existing = await storage.getUserByUsername(newUsername);
        if (existing) return res.status(400).json({ message: "Username already taken" });
      }

      const updatedUser = await storage.updateUsername(req.user.id, newUsername);
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ message: "Invalid username" });
    }
  });

  // === ADMIN: MANAGE SUPER MANAGERS ===
  app.post("/api/admin/promote-to-super-manager", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { userId } = z.object({ userId: z.number() }).parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === 'admin') return res.status(400).json({ message: "Cannot change admin role" });

      const updatedUser = await storage.updateUserRole(userId, "super_manager");
      await storage.approveUser(userId);
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/suspend-user", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { userId } = z.object({ userId: z.number() }).parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === 'admin') return res.status(400).json({ message: "Cannot suspend admin" });

      await storage.suspendUser(userId);

      if (user.role === 'super_manager') {
        const managers = await storage.getUsersByCreator(userId);
        for (const mgr of managers) {
          await storage.suspendUser(mgr.id);
          const mgrUsers = await storage.getUsersByCreator(mgr.id);
          for (const u of mgrUsers) {
            await storage.suspendUser(u.id);
          }
        }
      } else if (user.role === 'manager') {
        const mgrUsers = await storage.getUsersByCreator(userId);
        for (const u of mgrUsers) {
          await storage.suspendUser(u.id);
        }
      }

      res.json({ message: "User and subordinates suspended" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/unsuspend-user", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { userId } = z.object({ userId: z.number() }).parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.unsuspendUser(userId);

      if (user.role === 'super_manager') {
        const managers = await storage.getUsersByCreator(userId);
        for (const mgr of managers) {
          await storage.unsuspendUser(mgr.id);
          const mgrUsers = await storage.getUsersByCreator(mgr.id);
          for (const u of mgrUsers) {
            await storage.unsuspendUser(u.id);
          }
        }
      } else if (user.role === 'manager') {
        const mgrUsers = await storage.getUsersByCreator(userId);
        for (const u of mgrUsers) {
          await storage.unsuspendUser(u.id);
        }
      }

      res.json({ message: "User and subordinates unsuspended" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { userId } = z.object({ userId: z.number() }).parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === 'admin') return res.status(400).json({ message: "Cannot delete admin" });

      if (user.role === 'super_manager') {
        const managers = await storage.getUsersByCreator(userId);
        for (const mgr of managers) {
          const mgrUsers = await storage.getUsersByCreator(mgr.id);
          for (const u of mgrUsers) {
            await storage.suspendUser(u.id);
          }
          await storage.suspendUser(mgr.id);
        }
      } else if (user.role === 'manager') {
        const mgrUsers = await storage.getUsersByCreator(userId);
        for (const u of mgrUsers) {
          await storage.suspendUser(u.id);
        }
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted and subordinates suspended" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/reset-super-manager-password", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { userId, newPassword } = z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      }).parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== 'super_manager') return res.status(400).json({ message: "Can only reset super manager passwords" });

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedPassword);
      res.json({ message: "Password reset successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === SUPER MANAGER: Create managers ===
  app.post("/api/super-manager/create-manager", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'super_manager') return res.status(403).send("Forbidden");
    try {
      const { username, password, phoneNumber } = z.object({
        username: z.string().min(2),
        password: z.string().min(6),
        phoneNumber: z.string().optional(),
      }).parse(req.body);

      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(400).json({ message: "Username already exists" });

      const hashedPassword = await hashPassword(password);
      const manager = await storage.createUser({
        username,
        password: hashedPassword,
        role: "manager",
        phoneNumber: phoneNumber || null,
        isApproved: true,
        isSuspended: false,
        createdBy: req.user.id,
      });

      res.status(201).json(manager);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === MANAGER: Create users ===
  app.post("/api/manager/create-user", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'manager') return res.status(403).send("Forbidden");
    try {
      const { username, password, phoneNumber } = z.object({
        username: z.string().min(2),
        password: z.string().min(6),
        phoneNumber: z.string().optional(),
      }).parse(req.body);

      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(400).json({ message: "Username already exists" });

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "user",
        phoneNumber: phoneNumber || null,
        isApproved: true,
        isSuspended: false,
        createdBy: req.user.id,
      });

      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === UNIFIED REPORTS API ===
  // Supports: admin (all data, can filter by manager), super_manager (their network), manager (their players)
  // Query params: from, to (ISO timestamps), managerId (admin/super_manager only)
  app.get("/api/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const role = req.user.role;
    if (role !== 'admin' && role !== 'super_manager' && role !== 'manager') return res.status(403).send("Forbidden");

    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const managerIdParam = req.query.managerId as string | undefined;
    const gameTypeParam = (req.query.gameType as string | undefined)?.toLowerCase();

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    // Map a transaction description to a game key (or "non-game" for deposits/withdrawals/etc.)
    const detectGameType = (desc: string | null | undefined): string => {
      if (!desc) return "non-game";
      const d = desc.toLowerCase();
      if (d.startsWith("hilo")) return "hilo";
      if (d.startsWith("dice")) return "dice";
      if (d.startsWith("coin flip")) return "coinflip";
      if (d.startsWith("plinko")) return "plinko";
      if (d.startsWith("wheel")) return "wheel";
      if (d.startsWith("greyhound racing")) return "dog-racing";
      if (d.startsWith("horse4 racing")) return "horse4";
      if (d.startsWith("horse racing")) return "horse-js";
      if (d.startsWith("fish hunt")) return "fishhunt";
      if (d.startsWith("fish joy")) return "fishjoy";
      if (d.startsWith("classic slots")) return "classic-slots";
      if (d.startsWith("slots")) return "slots";
      if (d.startsWith("roulette")) return "roulette";
      if (d.startsWith("aviator")) return "aviator";
      return "non-game";
    };

    const gameLabels: Record<string, string> = {
      "hilo": "HiLo",
      "dice": "Dice",
      "coinflip": "Coin Flip",
      "plinko": "Plinko",
      "wheel": "Wheel of Fortune",
      "dog-racing": "Greyhound Racing",
      "horse4": "Horse4 Racing",
      "horse-js": "Quick Horse Race",
      "fishhunt": "Fish Hunt",
      "fishjoy": "Fish Joy",
      "classic-slots": "Classic Slots",
      "slots": "Slots",
      "roulette": "Roulette",
      "aviator": "Aviator",
    };

    try {
      let relevantUserIds: number[] = [];
      let allRelevantUsers: any[] = [];
      let managersList: { id: number; username: string; role: string }[] = [];

      if (role === 'admin') {
        const allUsers = await storage.getAllUsers();

        // Build managers list for the filter dropdown (super managers + managers)
        managersList = allUsers
          .filter(u => u.role === 'super_manager' || u.role === 'manager')
          .map(u => ({ id: u.id, username: u.username, role: u.role }));

        if (managerIdParam) {
          const filterId = parseInt(managerIdParam);
          const filterUser = allUsers.find(u => u.id === filterId);
          if (!filterUser) return res.status(404).json({ message: "Manager not found" });

          if (filterUser.role === 'super_manager') {
            const smManagers = await storage.getUsersByCreator(filterId);
            relevantUserIds = smManagers.map(m => m.id);
            for (const mgr of smManagers) {
              const mgrPlayers = await storage.getUsersByCreator(mgr.id);
              relevantUserIds = relevantUserIds.concat(mgrPlayers.map(u => u.id));
            }
            allRelevantUsers = allUsers.filter(u => relevantUserIds.includes(u.id));
          } else if (filterUser.role === 'manager') {
            const mgrPlayers = await storage.getUsersByCreator(filterId);
            relevantUserIds = mgrPlayers.map(u => u.id);
            allRelevantUsers = mgrPlayers;
          }
        } else {
          relevantUserIds = allUsers.filter(u => u.role !== 'admin').map(u => u.id);
          allRelevantUsers = allUsers.filter(u => u.role !== 'admin');
        }
      } else if (role === 'super_manager') {
        const myManagers = await storage.getUsersByCreator(req.user.id);
        managersList = myManagers.map(m => ({ id: m.id, username: m.username, role: m.role }));
        
        let userIds = myManagers.map(m => m.id);
        for (const mgr of myManagers) {
          const mgrPlayers = await storage.getUsersByCreator(mgr.id);
          userIds = userIds.concat(mgrPlayers.map(u => u.id));
        }

        if (managerIdParam) {
          const filterId = parseInt(managerIdParam);
          if (!myManagers.find(m => m.id === filterId)) {
            return res.status(403).json({ message: "This manager is not in your network" });
          }
          const mgrPlayers = await storage.getUsersByCreator(filterId);
          relevantUserIds = mgrPlayers.map(u => u.id);
          allRelevantUsers = mgrPlayers;
        } else {
          relevantUserIds = userIds;
          const allUsers = await storage.getAllUsers();
          allRelevantUsers = allUsers.filter(u => userIds.includes(u.id));
        }
      } else if (role === 'manager') {
        const myPlayers = await storage.getUsersByCreator(req.user.id);
        relevantUserIds = myPlayers.map(u => u.id);
        allRelevantUsers = myPlayers;
      }

      // Fetch transactions with time filtering
      let txns: any[];
      if (role === 'admin' && !managerIdParam) {
        txns = await storage.getTransactionsByDateRange(from, to);
      } else {
        txns = await storage.getTransactionsByUserIdsAndDateRange(relevantUserIds, from, to);
      }

      // Fetch withdrawals with time filtering
      let withdrawals: any[];
      if (role === 'admin' && !managerIdParam) {
        withdrawals = await storage.getAllWithdrawalsByDateRange(from, to);
      } else {
        withdrawals = await storage.getWithdrawalsByUserIdsAndDateRange(relevantUserIds, from, to);
      }

      const approvedWithdrawals = withdrawals.filter((w: any) => w.status === 'approved');
      const totalWithdrawn = approvedWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);

      // Annotate every transaction with detected gameType (used for breakdown + filtering)
      const txnsAnnotated = txns.map((tx: any) => ({ ...tx, gameType: detectGameType(tx.description) }));

      // If a specific gameType filter is supplied, narrow transactions to that game.
      // Deposits/withdrawals are always counted in totals, but bet/win-only metrics
      // for the filtered game come from this subset.
      const txnsForMetrics = gameTypeParam && gameTypeParam !== 'all'
        ? txnsAnnotated.filter((tx: any) => tx.gameType === gameTypeParam || tx.type === 'deposit' || tx.type === 'voucher_redemption' || tx.type === 'withdrawal')
        : txnsAnnotated;

      // Compute aggregate report metrics
      const report = txnsForMetrics.reduce((acc: any, tx: any) => {
        const date = tx.createdAt ? new Date(tx.createdAt).toISOString().split('T')[0] : 'unknown';
        if (!acc.dailyStats[date]) {
          acc.dailyStats[date] = { date, bets: 0, wins: 0, deposits: 0, withdrawals: 0 };
        }
        if (tx.type === 'deposit' || tx.type === 'voucher_redemption') {
          acc.totalDeposits += tx.amount;
          acc.dailyStats[date].deposits += tx.amount;
        }
        if (tx.type === 'withdrawal') {
          acc.totalWithdrawals += Math.abs(tx.amount);
          acc.dailyStats[date].withdrawals += Math.abs(tx.amount);
        }
        if (tx.type === 'bet') {
          acc.totalBets += Math.abs(tx.amount);
          acc.dailyStats[date].bets += Math.abs(tx.amount);
        }
        if (tx.type === 'win') {
          acc.totalWins += tx.amount;
          acc.dailyStats[date].wins += tx.amount;
        }
        return acc;
      }, {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBets: 0,
        totalWins: 0,
        dailyStats: {} as Record<string, { date: string; bets: number; wins: number; deposits: number; withdrawals: number }>,
      });

      // Per-game breakdown: bets, wins, profit, plays, RTP — across ALL transactions (not narrowed)
      const perGameMap: Record<string, { gameType: string; label: string; bets: number; wins: number; profit: number; plays: number; rtp: number }> = {};
      for (const tx of txnsAnnotated) {
        if (tx.type !== 'bet' && tx.type !== 'win') continue;
        const gt = tx.gameType;
        if (gt === 'non-game') continue;
        if (!perGameMap[gt]) {
          perGameMap[gt] = { gameType: gt, label: gameLabels[gt] || gt, bets: 0, wins: 0, profit: 0, plays: 0, rtp: 0 };
        }
        if (tx.type === 'bet') {
          perGameMap[gt].bets += Math.abs(tx.amount);
          perGameMap[gt].plays += 1;
        } else {
          perGameMap[gt].wins += tx.amount;
        }
      }
      const perGame = Object.values(perGameMap)
        .map(g => ({ ...g, profit: g.bets - g.wins, rtp: g.bets > 0 ? +(g.wins / g.bets * 100).toFixed(2) : 0 }))
        .sort((a, b) => b.bets - a.bets);

      const totalAccountBalances = allRelevantUsers.reduce((sum: number, u: any) => sum + u.balance, 0);
      const playersCount = allRelevantUsers.filter((u: any) => u.role === 'user').length;
      const managersCount = allRelevantUsers.filter((u: any) => u.role === 'manager').length;
      const profit = report.totalBets - report.totalWins;

      const txnsToReturn = (gameTypeParam && gameTypeParam !== 'all'
        ? txnsAnnotated.filter((tx: any) => tx.gameType === gameTypeParam)
        : txnsAnnotated
      ).slice(0, 200);

      res.json({
        totalDeposits: report.totalDeposits,
        totalWithdrawals: totalWithdrawn,
        totalBets: report.totalBets,
        totalWins: report.totalWins,
        totalAccountBalances,
        profit,
        playersCount,
        managersCount,
        transactions: txnsToReturn,
        dailyStats: Object.values(report.dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        managers: managersList,
        perGame,
        gameTypes: Object.entries(gameLabels).map(([value, label]) => ({ value, label })),
        selectedGameType: gameTypeParam || 'all',
      });
    } catch (err) {
      console.error("Reports error:", err);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Keep legacy endpoint for backwards compat
  app.get(api.admin.reports.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    res.redirect('/api/reports');
  });

  // === GAME SETTINGS (admin only for changing) ===
  app.get(api.games.settings.get.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    
    let settings = await storage.getAllGameSettings();
    const gameTypes = ["classic-slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "dog-racing", "horse4", "horse-js"] as const;
    const existingTypes = settings.map(s => s.gameType);
    
    for (const type of gameTypes) {
      if (!existingTypes.includes(type)) {
        const defaultChance = (type === "dice" || type === "hilo" || type === "coinflip" || type === "plinko" || type === "wheel") ? 0.48 : 0.3;
        const newSetting = await storage.updateGameSettings(type as any, defaultChance, req.user.id);
        settings.push(newSetting);
      }
    }
    
    res.json(settings);
  });

  app.post(api.games.settings.update.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    
    try {
      const { gameType, winChance } = z.object({
        gameType: z.enum(["classic-slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "dog-racing", "horse4", "horse-js"]),
        winChance: z.number().min(0).max(100)
      }).parse(req.body);
      
      const settings = await storage.updateGameSettings(gameType as any, winChance / 100, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/games/settings/payout-multiplier", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    
    try {
      const { gameType, payoutMultiplier } = z.object({
        gameType: z.enum(["coinflip", "classic-slots", "dice", "hilo"]),
        payoutMultiplier: z.number().min(1.01).max(100)
      }).parse(req.body);
      
      const settings = await storage.updateGamePayoutMultiplier(gameType as any, payoutMultiplier, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === HOUSE EDGE & HIGH-BET PROTECTION (admin) ===
  app.post("/api/games/settings/house-edge", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { gameType, houseEdgePct, highBetThreshold, highBetWagerMultiplier } = z.object({
        gameType: z.enum(["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "fishjoy", "classic-slots", "dog-racing", "horse4", "horse-js"] as any),
        houseEdgePct: z.number().min(0).max(50).optional(),
        highBetThreshold: z.number().int().min(0).max(100000000).optional(),
        highBetWagerMultiplier: z.number().min(0).max(1000).optional(),
      }).parse(req.body);
      const settings = await storage.updateGameHouseEdge(gameType as any, { houseEdgePct, highBetThreshold, highBetWagerMultiplier }, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/games/settings/reset-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const { gameType } = z.object({
        gameType: z.enum(["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "fishjoy", "classic-slots", "dog-racing", "horse4", "horse-js"] as any),
      }).parse(req.body);
      const settings = await storage.resetGameHouseEdgeStats(gameType as any, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === UNIVERSAL HOUSE EDGE (admin) ===
  // GET returns the current config + the live house bankroll (admin + manager
  // balances) so the admin UI can show whether wins are currently being capped
  // by the bankroll floor.
  app.get("/api/admin/universal-house-edge", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const [config, bankroll] = await Promise.all([
      storage.getUniversalHouseEdge(),
      storage.getHouseBankroll().catch(() => 0),
    ]);
    const rtp = config.totalBet > 0 ? config.totalPaid / config.totalBet : 0;
    res.json({ ...config, bankroll, currentRTP: rtp });
  });

  app.patch("/api/admin/universal-house-edge", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const data = updateUniversalHouseEdgeSchema.parse(req.body);
      const updated = await storage.updateUniversalHouseEdge(data, req.user.id);
      res.json(updated);
    } catch {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/admin/universal-house-edge/reset-stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const updated = await storage.resetUniversalHouseEdgeStats(req.user.id);
    res.json(updated);
  });

  // === DIRECT CREDIT USER BALANCE (admin / super_manager / manager) ===
  app.post("/api/admin/users/:id/credit", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'super_manager' && req.user.role !== 'manager')) {
      return res.status(403).send("Forbidden");
    }
    try {
      const userId = parseInt(req.params.id);
      const parsed = z.object({
        amount: z.number().int().min(-100000000).max(100000000).refine(v => v !== 0, "Amount cannot be zero"),
        note: z.string().max(200).optional(),
        description: z.string().max(200).optional(),
      }).parse(req.body);
      const amount: number = parsed.amount;
      const note = parsed.note ?? parsed.description;

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.id === req.user.id) return res.status(400).json({ message: "Cannot credit your own account" });

      // Authorization: enforce hierarchy
      if (req.user.role === 'manager') {
        if (targetUser.createdBy !== req.user.id) {
          return res.status(403).json({ message: "You can only credit your own players" });
        }
      } else if (req.user.role === 'super_manager') {
        if (targetUser.createdBy !== req.user.id) {
          const managers = await storage.getUsersByCreator(req.user.id);
          const managerIds = managers.map(m => m.id);
          if (!managerIds.includes(targetUser.createdBy ?? -1)) {
            return res.status(403).json({ message: "You can only credit users in your network" });
          }
        }
      }
      // Admin can credit anyone (except self, blocked above)

      // Debits (negative amounts) cannot exceed user balance
      if (amount < 0 && targetUser.balance + amount < 0) {
        return res.status(400).json({ message: "User balance is insufficient for this debit" });
      }

      const updated = await storage.updateUserBalance(userId, amount);
      const txType = amount > 0 ? "deposit" : "withdrawal";
      const desc = `Direct ${amount > 0 ? "credit" : "debit"} by ${req.user.username}${note ? `: ${note}` : ""}`;
      await storage.createTransaction({ userId, amount, type: txType, description: desc });

      res.json({ success: true, balance: updated.balance });
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Invalid input" });
    }
  });

  // === GAME SETTINGS ENDPOINTS (per-game multiplier) ===
  app.get("/api/games/slots/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("slots");
      const payoutMultiplier = settings?.payoutMultiplier ?? 10;
      res.json({ payoutMultiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/games/dice/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("dice");
      const payoutMultiplier = settings?.payoutMultiplier ?? 2;
      res.json({ payoutMultiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get("/api/games/hilo/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("hilo");
      const payoutMultiplier = settings?.payoutMultiplier ?? 2;
      res.json({ payoutMultiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === HILO GAME ===
  app.post("/api/games/hilo/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "hilo")) return;
    try {
      const { bet, prediction, lastCard } = z.object({ 
        bet: z.number().min(500),
        prediction: z.enum(["higher", "lower"]),
        lastCard: z.number().nullable()
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("hilo");
      const winChance = settings?.winChance ?? 0.48;
      // Bankroll floor is enforced inside processCombinedBetAndWin via
      // checkUniversalForceLose — the round will simply be a guaranteed loss
      // when the bet's max payout would breach the floor. No pre-block needed.

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "HiLo play" });

      let won = Math.random() < winChance;
      const multiplier = settings?.payoutMultiplier ?? 2;
      let intendedPayout = won ? Math.floor(bet * multiplier) : 0;
      const allowedPayout = await processCombinedBetAndWin("hilo", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0) won = false;
      const payout = allowedPayout;

      const nextCard = won 
        ? (prediction === "higher" 
            ? Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1
            : Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1)
        : (prediction === "higher"
            ? Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1
            : Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1);
      const card = Math.max(1, Math.min(13, nextCard));
      const user = payout > 0 ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "HiLo win" });

      res.json({ won, payout, balance: user?.balance ?? 0, card });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === DOG RACING GAME ===
  app.get("/api/games/dog-racing/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("dog-racing");
      const extraParsed = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      const defaultOdds = [3.7, 5.5, 2.2, 11.75, 17.25, 8.75];
      const defaultPlace = defaultOdds.map(o => Math.max(1.05, +(o * 0.45).toFixed(2)));
      const defaultShow = defaultOdds.map(o => Math.max(1.02, +(o * 0.25).toFixed(2)));
      res.json({
        winOccurrence: Math.round((settings?.winChance ?? 0.3) * 100),
        odds: extraParsed.odds ?? defaultOdds,
        placeOdds: extraParsed.placeOdds ?? defaultPlace,
        showOdds: extraParsed.showOdds ?? defaultShow,
      });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/dog-racing/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { odds, placeOdds, showOdds } = z.object({
        odds: z.array(z.number().min(1.01).max(200)).length(6),
        placeOdds: z.array(z.number().min(1.01).max(200)).length(6).optional(),
        showOdds: z.array(z.number().min(1.01).max(200)).length(6).optional(),
      }).parse(req.body);
      const existing = await storage.getGameSettings("dog-racing");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      const newExtra = JSON.stringify({
        ...existingExtra,
        odds,
        placeOdds: placeOdds ?? existingExtra.placeOdds,
        showOdds: showOdds ?? existingExtra.showOdds,
      });
      await storage.updateGameExtraSettings("dog-racing", newExtra, req.user.id);
      res.json({ success: true, odds, placeOdds, showOdds });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/dog-racing/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "dog-racing")) return;
    try {
      const { totBet } = z.object({ bet: z.number().min(1), totBet: z.number().min(1) }).parse(req.body);
      if (req.user.balance < totBet) return res.status(400).json({ message: "Insufficient balance" });
      const dogSettingsPre = await storage.getGameSettings("dog-racing");
      const dogExtraPre = (() => { try { return dogSettingsPre?.extraSettings ? JSON.parse(dogSettingsPre.extraSettings) : {}; } catch { return {}; } })();
      const dogMaxOdds = Math.max(...((dogExtraPre.odds as number[]) ?? [3.7, 5.5, 2.2, 11.75, 17.25, 8.75]));
      // Race games are the ONLY games where a player can guarantee a win by
      // dutching across every runner — forceLose can't help if they covered
      // all positions. So we hard-block here when the worst-case payout would
      // breach the bankroll floor.
      const dogGuard = await checkBankrollFloorForBet(totBet * dogMaxOdds);
      if (dogGuard.blocked) {
        return res.status(400).json({ message: "Bet too large — maximum possible payout exceeds the house bankroll. Please lower your bet.", bankrollBlocked: true });
      }
      await storage.updateUserBalance(req.user.id, -totBet);
      await storage.createTransaction({ userId: req.user.id, amount: -totBet, type: "bet", description: "Greyhound Racing bet" });
      await recordBetAndCheckHighBet("dog-racing", req.user.id, totBet);
      const forceLose = await computeForceLose("dog-racing", req.user.id, totBet * dogMaxOdds);
      const roundId = newRoundId();
      pendingRoundsMap.set(roundId, { userId: req.user.id, gameType: "dog-racing", betAmount: totBet, maxOdds: dogMaxOdds, createdAt: Date.now() });
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, forceLose, roundId });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/dog-racing/win", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "dog-racing")) return;
    try {
      const { winAmount, roundId } = z.object({
        winAmount: z.number().min(0).max(50000000),
        roundId: z.string().min(1).nullable().optional(),
      }).parse(req.body);
      // Server-side validation: a /win MUST reference a /bet from this user
      // for this game, and cannot exceed bet × maxOdds.
      const round = roundId ? pendingRoundsMap.get(roundId) : undefined;
      if (!round || round.userId !== req.user.id || round.gameType !== "dog-racing") {
        return res.status(400).json({ message: "Invalid or expired round" });
      }
      pendingRoundsMap.delete(roundId!);
      const cappedWin = Math.min(winAmount, Math.floor(round.betAmount * round.maxOdds));
      const finalWin = await applyHouseEdgeForWin("dog-racing", req.user.id, cappedWin);
      if (finalWin > 0) {
        await storage.updateUserBalance(req.user.id, finalWin);
        await storage.createTransaction({ userId: req.user.id, amount: finalWin, type: "win", description: "Greyhound Racing win" });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, blocked: winAmount > 0 && finalWin === 0 });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid request", errors: err.errors });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === HORSE4 RACING GAME ===
  app.get("/api/games/horse4/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("horse4");
      const extraParsed = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      const defaultOdds = [3.7, 5.5, 2.2, 11.75, 17.25, 8.75, 7.15, 6.15];
      const defaultPlace = defaultOdds.map(o => Math.max(1.05, +(o * 0.45).toFixed(2)));
      const defaultShow = defaultOdds.map(o => Math.max(1.02, +(o * 0.25).toFixed(2)));
      res.json({
        winOccurrence: Math.round((settings?.winChance ?? 0.4) * 100),
        odds: extraParsed.odds ?? defaultOdds,
        placeOdds: extraParsed.placeOdds ?? defaultPlace,
        showOdds: extraParsed.showOdds ?? defaultShow,
      });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/horse4/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { odds, placeOdds, showOdds } = z.object({
        odds: z.array(z.number().min(1.01).max(200)).length(8),
        placeOdds: z.array(z.number().min(1.01).max(200)).length(8).optional(),
        showOdds: z.array(z.number().min(1.01).max(200)).length(8).optional(),
      }).parse(req.body);
      const existing = await storage.getGameSettings("horse4");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateGameExtraSettings("horse4", JSON.stringify({
        ...existingExtra,
        odds,
        placeOdds: placeOdds ?? existingExtra.placeOdds,
        showOdds: showOdds ?? existingExtra.showOdds,
      }), req.user.id);
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: "Invalid input" }); }
  });

  app.post("/api/games/horse4/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "horse4")) return;
    try {
      const { totBet } = z.object({ bet: z.number().min(1), totBet: z.number().min(1) }).parse(req.body);
      if (req.user.balance < totBet) return res.status(400).json({ message: "Insufficient balance" });
      const h4Settings = await storage.getGameSettings("horse4");
      const h4Extra = (() => { try { return h4Settings?.extraSettings ? JSON.parse(h4Settings.extraSettings) : {}; } catch { return {}; } })();
      const h4MaxOdds = Math.max(...((h4Extra.odds as number[]) ?? [3.7, 5.5, 2.2, 11.75, 17.25, 8.75, 7.15, 6.15]));
      // Race games are the ONLY games where a player can guarantee a win by
      // dutching across every runner — hard-block when worst-case payout
      // would breach the bankroll floor.
      const h4Guard = await checkBankrollFloorForBet(totBet * h4MaxOdds);
      if (h4Guard.blocked) {
        return res.status(400).json({ message: "Bet too large — maximum possible payout exceeds the house bankroll. Please lower your bet.", bankrollBlocked: true });
      }
      await storage.updateUserBalance(req.user.id, -totBet);
      await storage.createTransaction({ userId: req.user.id, amount: -totBet, type: "bet", description: "Horse4 Racing bet" });
      await recordBetAndCheckHighBet("horse4", req.user.id, totBet);
      const forceLose = await computeForceLose("horse4", req.user.id, totBet * h4MaxOdds);
      const roundId = newRoundId();
      pendingRoundsMap.set(roundId, { userId: req.user.id, gameType: "horse4", betAmount: totBet, maxOdds: h4MaxOdds, createdAt: Date.now() });
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, forceLose, roundId });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/horse4/win", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "horse4")) return;
    try {
      const { winAmount, roundId } = z.object({
        winAmount: z.number().min(0).max(50000000),
        roundId: z.string().min(1).nullable().optional(),
      }).parse(req.body);
      const round = roundId ? pendingRoundsMap.get(roundId) : undefined;
      if (!round || round.userId !== req.user.id || round.gameType !== "horse4") {
        return res.status(400).json({ message: "Invalid or expired round" });
      }
      pendingRoundsMap.delete(roundId!);
      const cappedWin = Math.min(winAmount, Math.floor(round.betAmount * round.maxOdds));
      const finalWin = await applyHouseEdgeForWin("horse4", req.user.id, cappedWin);
      if (finalWin > 0) {
        await storage.updateUserBalance(req.user.id, finalWin);
        await storage.createTransaction({ userId: req.user.id, amount: finalWin, type: "win", description: "Horse4 Racing win" });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, blocked: winAmount > 0 && finalWin === 0 });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid request", errors: err.errors });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === HORSE-JS RACING GAME (simple 4-horse) ===
  app.get("/api/games/horse-js/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("horse-js");
      const extra = settings?.extraSettings ? JSON.parse(settings.extraSettings) : {};
      const defaultOdds = [2.0, 2.5, 3.0, 3.5];
      const defaultPlace = defaultOdds.map(o => Math.max(1.05, +(o * 0.5).toFixed(2)));
      const defaultShow = defaultOdds.map(o => Math.max(1.02, +(o * 0.3).toFixed(2)));
      res.json({
        winOccurrence: Math.round((settings?.winChance ?? 0.25) * 100),
        maxLaps: extra.maxLaps ?? 1,
        odds: extra.odds ?? defaultOdds,
        placeOdds: extra.placeOdds ?? defaultPlace,
        showOdds: extra.showOdds ?? defaultShow,
      });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/horse-js/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { maxLaps, odds, placeOdds, showOdds } = z.object({
        maxLaps: z.number().int().min(1).max(10),
        odds: z.array(z.number().min(1).max(100)).length(4),
        placeOdds: z.array(z.number().min(1).max(100)).length(4).optional(),
        showOdds: z.array(z.number().min(1).max(100)).length(4).optional(),
      }).parse(req.body);
      const existing = await storage.getGameSettings("horse-js");
      const currentExtra = existing?.extraSettings ? JSON.parse(existing.extraSettings) : {};
      const newExtra = JSON.stringify({
        ...currentExtra,
        maxLaps,
        odds,
        placeOdds: placeOdds ?? currentExtra.placeOdds,
        showOdds: showOdds ?? currentExtra.showOdds,
      });
      await storage.updateGameExtraSettings("horse-js", newExtra, req.user.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/horse-js/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "horse-js")) return;
    try {
      const { totBet } = z.object({ bet: z.number().min(500), totBet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < totBet) return res.status(400).json({ message: "Insufficient balance" });
      const hjSettings = await storage.getGameSettings("horse-js");
      const hjExtra = (() => { try { return hjSettings?.extraSettings ? JSON.parse(hjSettings.extraSettings) : {}; } catch { return {}; } })();
      const hjMaxOdds = Math.max(...((hjExtra.odds as number[]) ?? [2.0, 2.5, 3.0, 3.5]));
      // Race games are the ONLY games where a player can guarantee a win by
      // dutching across every runner (especially with only 4 horses) —
      // hard-block when worst-case payout would breach the bankroll floor.
      const hjGuard = await checkBankrollFloorForBet(totBet * hjMaxOdds);
      if (hjGuard.blocked) {
        return res.status(400).json({ message: "Bet too large — maximum possible payout exceeds the house bankroll. Please lower your bet.", bankrollBlocked: true });
      }
      await storage.updateUserBalance(req.user.id, -totBet);
      await storage.createTransaction({ userId: req.user.id, amount: -totBet, type: "bet", description: "Horse Racing bet" });
      await recordBetAndCheckHighBet("horse-js", req.user.id, totBet);
      const forceLose = await computeForceLose("horse-js", req.user.id, totBet * hjMaxOdds);
      const roundId = newRoundId();
      pendingRoundsMap.set(roundId, { userId: req.user.id, gameType: "horse-js", betAmount: totBet, maxOdds: hjMaxOdds, createdAt: Date.now() });
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, forceLose, roundId });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/horse-js/win", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "horse-js")) return;
    try {
      const { winAmount, roundId } = z.object({
        winAmount: z.number().min(0).max(50000000),
        roundId: z.string().min(1).nullable().optional(),
      }).parse(req.body);
      const round = roundId ? pendingRoundsMap.get(roundId) : undefined;
      if (!round || round.userId !== req.user.id || round.gameType !== "horse-js") {
        return res.status(400).json({ message: "Invalid or expired round" });
      }
      pendingRoundsMap.delete(roundId!);
      const cappedWin = Math.min(winAmount, Math.floor(round.betAmount * round.maxOdds));
      const finalWin = await applyHouseEdgeForWin("horse-js", req.user.id, cappedWin);
      if (finalWin > 0) {
        await storage.updateUserBalance(req.user.id, finalWin);
        await storage.createTransaction({ userId: req.user.id, amount: finalWin, type: "win", description: "Horse Racing win" });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, blocked: winAmount > 0 && finalWin === 0 });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid request", errors: err.errors });
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === DICE GAME ===
  app.post("/api/games/dice/roll", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "dice")) return;
    try {
      const { bet, choice } = z.object({ 
        bet: z.number().min(500),
        choice: z.enum(["low", "high"])
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("dice");
      const winChance = settings?.winChance ?? 0.48;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Dice roll" });

      let won = Math.random() < winChance;
      const multiplier = settings?.payoutMultiplier ?? 2;
      let intendedPayout = won ? Math.floor(bet * multiplier) : 0;
      const allowedPayout = await processCombinedBetAndWin("dice", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0) won = false;
      const payout = allowedPayout;
      const roll = won 
        ? (choice === "low" ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4)
        : (choice === "low" ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1);
      const user = payout > 0 ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Dice win" });

      res.json({ won, payout, balance: user?.balance ?? 0, roll });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === COIN FLIP GAME ===
  app.get("/api/games/coinflip/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("coinflip");
      const payoutMultiplier = settings?.payoutMultiplier ?? 1.95;
      res.json({ payoutMultiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/games/coinflip/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "coinflip")) return;
    try {
      const { bet, choice } = z.object({ 
        bet: z.number().min(500),
        choice: z.enum(["heads", "tails"])
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("coinflip");
      const winChance = settings?.winChance ?? 0.48;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Coin Flip play" });

      let won = Math.random() < winChance;
      const multiplier = settings?.payoutMultiplier ?? 1.95;
      let intendedPayout = won ? Math.floor(bet * multiplier) : 0;
      const allowedPayout = await processCombinedBetAndWin("coinflip", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0) won = false;
      const result = won ? choice : (choice === "heads" ? "tails" : "heads");
      const payout = allowedPayout;
      const user = won ? await storage.updateUserBalance(req.user.id, Math.floor(payout)) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: Math.floor(payout), type: "win", description: "Coin Flip win" });

      res.json({ won, payout: Math.floor(payout), balance: user?.balance ?? 0, result });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === PLINKO GAME ===
  const PLINKO_DEFAULT_MULTIPLIERS = [0.2, 0.5, 1.2, 2, 5, 2, 1.2, 0.5, 0.2];
  app.get("/api/games/plinko/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const s = await storage.getGameSettings("plinko");
    const extra = (() => { try { return s?.extraSettings ? JSON.parse(s.extraSettings) : {}; } catch { return {}; } })();
    res.json({ multipliers: extra.multipliers ?? PLINKO_DEFAULT_MULTIPLIERS });
  });
  app.post("/api/games/plinko/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { multipliers } = z.object({ multipliers: z.array(z.number().min(0).max(1000)).length(9) }).parse(req.body);
      const existing = await storage.getGameSettings("plinko");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateGameExtraSettings("plinko", JSON.stringify({ ...existingExtra, multipliers }), req.user.id);
      res.json({ success: true });
    } catch { res.status(400).json({ message: "Invalid input" }); }
  });

  app.post("/api/games/plinko/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "plinko")) return;
    try {
      const { bet } = z.object({ bet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      const settings = await storage.getGameSettings("plinko");
      const winChance = settings?.winChance ?? 0.48;
      const extraParsed = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Plinko play" });
      
      const multipliers: number[] = (Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 9) ? extraParsed.multipliers : PLINKO_DEFAULT_MULTIPLIERS;
      // Derive win/loss slots from the actual multiplier array so admin edits
      // (e.g. zeroing out a center slot) don't desync the win/lose decision.
      // A "win slot" is any slot with multiplier >= 1 (player at least breaks even).
      const winIndicesAll = multipliers.map((m, i) => m >= 1 ? i : -1).filter(i => i >= 0);
      const loseIndicesAll = multipliers.map((m, i) => m < 1 ? i : -1).filter(i => i >= 0);
      let won = Math.random() < winChance;
      let multiplierIndex: number;
      if (won && winIndicesAll.length > 0) {
        multiplierIndex = winIndicesAll[Math.floor(Math.random() * winIndicesAll.length)];
      } else if (loseIndicesAll.length > 0) {
        won = false;
        multiplierIndex = loseIndicesAll[Math.floor(Math.random() * loseIndicesAll.length)];
      } else {
        // All slots are wins — fallback: pick any slot.
        multiplierIndex = Math.floor(Math.random() * multipliers.length);
      }
      let multiplier = multipliers[multiplierIndex];
      let intendedPayout = Math.floor(bet * multiplier);
      const allowedPayout = await processCombinedBetAndWin("plinko", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0 && intendedPayout > 0) {
        // Force loss outcome — pick any slot whose multiplier is < 1.
        if (loseIndicesAll.length > 0) {
          multiplierIndex = loseIndicesAll[Math.floor(Math.random() * loseIndicesAll.length)];
          multiplier = multipliers[multiplierIndex];
        }
        won = false;
      }
      const payout = allowedPayout;
      const user = payout > 0 ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Plinko win" });
      res.json({ won: payout > 0, payout, balance: user?.balance ?? 0, multiplier, multiplierIndex });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === WHEEL GAME ===
  const WHEEL_DEFAULT_MULTIPLIERS = [0, 0.5, 0, 1, 0, 1.5, 0, 2, 0, 0.5, 0, 3, 0, 1, 5, 10];
  app.get("/api/games/wheel/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const s = await storage.getGameSettings("wheel");
    const extra = (() => { try { return s?.extraSettings ? JSON.parse(s.extraSettings) : {}; } catch { return {}; } })();
    res.json({ multipliers: extra.multipliers ?? WHEEL_DEFAULT_MULTIPLIERS });
  });
  app.post("/api/games/wheel/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { multipliers } = z.object({ multipliers: z.array(z.number().min(0).max(1000)).length(16) }).parse(req.body);
      const existing = await storage.getGameSettings("wheel");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateGameExtraSettings("wheel", JSON.stringify({ ...existingExtra, multipliers }), req.user.id);
      res.json({ success: true });
    } catch { res.status(400).json({ message: "Invalid input" }); }
  });

  app.post("/api/games/wheel/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "wheel")) return;
    try {
      const { bet } = z.object({ bet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      
      const settings = await storage.getGameSettings("wheel");
      const winChance = settings?.winChance ?? 0.48;
      const extraParsed = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Wheel spin" });

      const wheelMults: number[] = (Array.isArray(extraParsed.multipliers) && extraParsed.multipliers.length === 16) ? extraParsed.multipliers : WHEEL_DEFAULT_MULTIPLIERS;
      const SEGMENTS = wheelMults.map(m => ({ multiplier: m }));

      const houseRoll = Math.random();
      const isWinSpin = houseRoll < winChance;

      let segmentIndex: number;
      if (isWinSpin) {
        const winIndices = SEGMENTS.map((s, i) => s.multiplier > 0 ? i : -1).filter(i => i >= 0);
        const weights = winIndices.map(i => {
          const m = SEGMENTS[i].multiplier;
          if (m <= 0.5) return 5;
          if (m <= 1) return 4;
          if (m <= 1.5) return 3;
          if (m <= 2) return 2.5;
          if (m <= 3) return 1.5;
          if (m <= 5) return 0.8;
          return 0.3;
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        segmentIndex = winIndices[0];
        for (let i = 0; i < winIndices.length; i++) {
          r -= weights[i];
          if (r <= 0) { segmentIndex = winIndices[i]; break; }
        }
      } else {
        const lossIndices = SEGMENTS.map((s, i) => s.multiplier === 0 ? i : -1).filter(i => i >= 0);
        segmentIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
      }

      let multiplier = SEGMENTS[segmentIndex].multiplier;
      let intendedPayout = Math.floor(bet * multiplier);
      const allowedPayout = await processCombinedBetAndWin("wheel", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0 && intendedPayout > 0) {
        // Force a loss segment
        const lossIndices = SEGMENTS.map((s, i) => s.multiplier === 0 ? i : -1).filter(i => i >= 0);
        segmentIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
        multiplier = SEGMENTS[segmentIndex].multiplier;
      }
      const payout = allowedPayout;
      const won = payout > 0;
      if (payout > 0) {
        await storage.updateUserBalance(req.user.id, payout);
        await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: `Wheel win x${multiplier}` });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ won, payout, balance: user?.balance ?? 0, segmentIndex, multiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/login/voucher", async (req, res) => {
    try {
      const { code } = z.object({ code: z.string() }).parse(req.body);
      const voucher = await storage.getVoucherByCode(code);

      if (!voucher || voucher.isRedeemed) {
        return res.status(400).json({ message: "Invalid or already redeemed voucher" });
      }

      const guestUsername = `Guest_${randomBytes(3).toString("hex").toUpperCase()}`;
      const guestUser = await storage.createUser({
        username: guestUsername,
        password: randomBytes(16).toString("hex"),
        role: "user",
        isApproved: true,
        isSuspended: false,
        createdBy: voucher.createdBy,
      });

      req.login(guestUser, async (err) => {
        if (err) return res.status(500).json({ message: "Login failed" });

        try {
          await storage.redeemVoucher(voucher.id, guestUser.id);
          await storage.updateUserBalance(guestUser.id, voucher.amount);
          await storage.createTransaction({
            userId: guestUser.id,
            amount: voucher.amount,
            type: "voucher_redemption",
            description: `Guest login with voucher ${voucher.code}`,
          });

          res.json({ user: guestUser, message: "Logged in as guest successfully" });
        } catch (redeemErr) {
          res.status(500).json({ message: "Voucher redemption failed" });
        }
      });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === VOUCHERS ===
  app.post(api.vouchers.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.role === 'user') return res.status(403).send("Forbidden");

    try {
      const input = api.vouchers.create.input.parse(req.body);
      const code = randomBytes(4).toString('hex').toUpperCase();
      const voucher = await storage.createVoucher({
        ...input,
        code,
        createdBy: req.user.id,
      });
      res.status(201).json(voucher);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.post(api.vouchers.redeem.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const input = api.vouchers.redeem.input.parse(req.body);
      const voucher = await storage.getVoucherByCode(input.code);

      if (!voucher || voucher.isRedeemed) return res.status(400).json({ message: "Invalid or already redeemed voucher" });

      await storage.redeemVoucher(voucher.id, req.user.id);
      const user = await storage.updateUserBalance(req.user.id, voucher.amount);
      await storage.createTransaction({
        userId: req.user.id,
        amount: voucher.amount,
        type: "voucher_redemption",
        description: `Redeemed voucher ${voucher.code}`,
      });

      res.json({ balance: user.balance, message: "Voucher redeemed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.vouchers.list.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role === 'user') return res.status(403).send("Forbidden");
    const vouchers = await storage.getAllVouchers();
    res.json(vouchers);
  });

  // === FISH HUNT GAME ===
  app.post("/api/games/fishhunt/shoot", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "fishhunt")) return;

    try {
      const settings = await storage.getGameSettings("fishhunt");
      const winChance = settings?.winChance ?? 0.45;

      const { bet, fishType } = z.object({
        bet: z.number().min(1),
        fishType: z.string()
      }).parse(req.body);

      if (req.user.balance < bet) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const FISH_MULTIPLIERS: Record<string, number> = {
        small_fish: 2,
        medium_fish: 3,
        pufferfish: 5,
        turtle: 4,
        jellyfish: 6,
        shark: 10,
        octopus: 8,
        whale: 15,
        mermaid: 20,
        scorpion_king: 50,
      };

      const multiplier = FISH_MULTIPLIERS[fishType] || 2;

      const catchDifficulty: Record<string, number> = {
        small_fish: 1.0,
        medium_fish: 0.85,
        pufferfish: 0.7,
        turtle: 0.75,
        jellyfish: 0.6,
        shark: 0.4,
        octopus: 0.5,
        whale: 0.25,
        mermaid: 0.2,
        scorpion_king: 0.08,
      };

      const difficulty = catchDifficulty[fishType] || 1.0;
      const adjustedChance = winChance * difficulty;
      let caught = Math.random() < adjustedChance;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: `Fish Hunt: Shot at ${fishType}` });

      let intendedPayout = caught ? Math.floor(bet * multiplier) : 0;
      const allowedPayout = await processCombinedBetAndWin("fishhunt", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0) caught = false;
      const payout = allowedPayout;
      if (payout > 0) {
        await storage.updateUserBalance(req.user.id, payout);
        await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: `Fish Hunt: Caught ${fishType} (x${multiplier})` });
      }

      const user = await storage.getUser(req.user.id);
      res.json({ caught, payout, multiplier, fishType, balance: user?.balance ?? 0 });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === AVIATOR (CRASH GAME) ===
  // In-memory active rounds; lost on server restart (player has already been debited - same as a crash).
  type AviatorRound = { userId: number; bet: number; crashPoint: number; startTime: number };
  const aviatorRounds = new Map<string, AviatorRound>();
  const AVIATOR_GROWTH = 0.06; // multiplier growth: m(t) = exp(0.06 * seconds_elapsed)
  const AVIATOR_CRASH_CAP = 1000.0; // safety cap

  function aviatorMultiplierAt(elapsedMs: number): number {
    const seconds = Math.max(0, elapsedMs / 1000);
    return Math.exp(AVIATOR_GROWTH * seconds);
  }

  function generateAviatorCrashPoint(houseEdgePct: number): number {
    // Provably-fair-style crash distribution.
    // With probability houseEdgePct/100 the round insta-crashes at 1.00x (the house's cut).
    // Otherwise the crash point follows a 1/(1-r) distribution with target RTP = 1 - houseEdgePct/100.
    const e = 2 ** 32;
    const r = Math.floor(Math.random() * e);
    if ((r % 100) < Math.max(0, Math.min(99, houseEdgePct))) return 1.00;
    const cp = Math.floor((100 * e - r) / (e - r)) / 100;
    return Math.max(1.01, Math.min(AVIATOR_CRASH_CAP, cp));
  }

  // Periodically purge stale rounds (a player who never cashes out before crash is just a loss; round is dead)
  setInterval(() => {
    const now = Date.now();
    for (const [id, round] of Array.from(aviatorRounds.entries())) {
      const elapsed = now - round.startTime;
      const m = aviatorMultiplierAt(elapsed);
      // 5 seconds of grace after the natural crash, then drop the round
      if (m >= round.crashPoint && elapsed > (Math.log(round.crashPoint) / AVIATOR_GROWTH) * 1000 + 5000) {
        aviatorRounds.delete(id);
      }
      // Hard expiry after 10 minutes regardless
      if (elapsed > 10 * 60 * 1000) aviatorRounds.delete(id);
    }
  }, 30 * 1000).unref?.();

  app.get("/api/games/aviator/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      let settings = await storage.getGameSettings("aviator");
      if (!settings) {
        // Seed with sensible defaults so admin sees the card immediately
        settings = await storage.updateGameHouseEdge("aviator", { houseEdgePct: 5 }, req.user.id);
      }
      const houseEdgePct = settings?.houseEdgePct ?? 5;
      res.json({ houseEdgePct, growth: AVIATOR_GROWTH, maxMultiplier: AVIATOR_CRASH_CAP });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/aviator/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "aviator")) return;
    try {
      const { bet } = z.object({ bet: z.number().int().min(100) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("aviator");
      const houseEdgePct = settings?.houseEdgePct ?? 5;
      // Aviator can theoretically pay up to AVIATOR_CRASH_CAP (1000x). If even
      // a 1.01x cashout would breach the bankroll floor, force an insta-crash
      // so the player still gets to bet but can't win on this round.
      const aviatorGuard = await checkBankrollFloorForBet(bet * AVIATOR_CRASH_CAP);

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: `Aviator: bet placed (${bet} UGX)` });
      await recordBetAndCheckHighBet("aviator", req.user.id, bet);

      // If high-bet anti-laundering or the bankroll floor flagged this round,
      // the plane crashes instantly at 1.00x.
      const locked = lockedLossMap.get(lossKey(req.user.id, "aviator"));
      const forceCrash = locked || aviatorGuard.blocked;
      let crashPoint = forceCrash ? 1.00 : generateAviatorCrashPoint(houseEdgePct);
      if (locked) {
        lockedLossMap.delete(lossKey(req.user.id, "aviator"));
        lockedBetAmountMap.delete(lossKey(req.user.id, "aviator"));
      }

      const roundId = `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const startTime = Date.now() + 3000; // 3-second pre-flight countdown so the player can see the bet
      aviatorRounds.set(roundId, { userId: req.user.id, bet, crashPoint, startTime });

      const user = await storage.getUser(req.user.id);
      res.json({ roundId, startTime, balance: user?.balance ?? 0 });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/games/aviator/cashout", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "aviator")) return;
    try {
      const { roundId } = z.object({ roundId: z.string().min(1) }).parse(req.body);
      const round = aviatorRounds.get(roundId);
      if (!round || round.userId !== req.user.id) {
        return res.status(404).json({ message: "Round not found" });
      }

      // Atomically remove the round so a duplicate cashout request can't double-pay
      aviatorRounds.delete(roundId);

      const elapsed = Date.now() - round.startTime;
      if (elapsed < 0) {
        // Cash-out attempted before takeoff — disallow.
        // (Allowing a refund here would be a risk-free no-op exploit:
        //  bet -> instantly cash out -> refund -> repeat to inflate wager history.)
        // Re-insert the round so the player can still cash out normally once it starts.
        aviatorRounds.set(roundId, round);
        return res.status(400).json({ message: "Cannot cash out before takeoff" });
      }

      const liveMultiplier = aviatorMultiplierAt(elapsed);
      if (liveMultiplier >= round.crashPoint) {
        // Already crashed
        const user = await storage.getUser(req.user.id);
        return res.json({ won: false, multiplier: round.crashPoint, payout: 0, crashed: true, balance: user?.balance ?? 0 });
      }

      const cashoutMultiplier = Math.min(liveMultiplier, round.crashPoint);
      const intendedPayout = Math.floor(round.bet * cashoutMultiplier);
      // Apply RTP ceiling so a hot streak can't push (totalPaid / totalBet) past target RTP.
      // applyHouseEdgeForWin handles the recordHouseEdgePayout call internally.
      const payout = await applyHouseEdgeForWin("aviator", req.user.id, intendedPayout);
      if (payout > 0) {
        await storage.updateUserBalance(req.user.id, payout);
        await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: `Aviator: cashed out at ${cashoutMultiplier.toFixed(2)}x (+${payout})` });
      }

      const user = await storage.getUser(req.user.id);
      res.json({
        won: payout > 0,
        multiplier: +cashoutMultiplier.toFixed(2),
        payout,
        blocked: intendedPayout > 0 && payout === 0,
        balance: user?.balance ?? 0,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // After the plane has crashed, the client can ask the server to reveal the crash point so it can show the result.
  app.post("/api/games/aviator/reveal", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { roundId } = z.object({ roundId: z.string().min(1) }).parse(req.body);
      const round = aviatorRounds.get(roundId);
      if (!round || round.userId !== req.user.id) {
        return res.json({ revealed: false });
      }
      const elapsed = Date.now() - round.startTime;
      const m = aviatorMultiplierAt(elapsed);
      if (m < round.crashPoint) return res.json({ revealed: false });
      // Crashed - safe to reveal and clean up
      aviatorRounds.delete(roundId);
      res.json({ revealed: true, crashPoint: +round.crashPoint.toFixed(2) });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === FISH JOY ===
  app.post("/api/games/fishjoy/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "fishjoy")) return;
    try {
      const { bet } = z.object({ bet: z.number().min(1) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      const fjSettings = await storage.getGameSettings("fishjoy");
      const fjExtra = (() => { try { return fjSettings?.extraSettings ? JSON.parse(fjSettings.extraSettings) : {}; } catch { return {}; } })();
      const fjMaxOdds = Math.max(...((fjExtra.fishOdds as number[]) ?? [2, 4, 6, 10, 15, 25, 40, 60, 80, 100, 150, 300]));
      const fjGuard = await checkBankrollFloorForBet(bet * fjMaxOdds);
      if (fjGuard.blocked) {
        return res.status(400).json({ message: "Shot too large — maximum possible payout exceeds the house bankroll. Please lower your bet.", bankrollBlocked: true });
      }
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Fish Joy: Shot fired" });
      await recordBetAndCheckHighBet("fishjoy", req.user.id, bet);
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0 });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post("/api/games/fishjoy/win", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "fishjoy")) return;
    try {
      const { winAmount } = z.object({ winAmount: z.number().min(1) }).parse(req.body);
      const finalWin = await applyHouseEdgeForWin("fishjoy", req.user.id, winAmount);
      if (finalWin > 0) {
        await storage.updateUserBalance(req.user.id, finalWin);
        await storage.createTransaction({ userId: req.user.id, amount: finalWin, type: "win", description: `Fish Joy: Fish caught (+${finalWin})` });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, blocked: finalWin === 0 });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === FISH JOY SETTINGS ===
  const DEFAULT_FISH_WIN_RATES = [55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2];

  app.get("/api/games/fishjoy/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("fishjoy");
      const extra = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      const fishOdds = extra.fishOdds ?? [2, 4, 6, 10, 15, 25, 40, 60, 80, 100, 150, 300];
      const fishWinRates = extra.fishWinRates ?? DEFAULT_FISH_WIN_RATES;
      res.json({ fishOdds, fishWinRates });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/fishjoy/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { fishOdds, fishWinRates } = z.object({
        fishOdds: z.array(z.number().min(0.1).max(10000)).length(12),
        fishWinRates: z.array(z.number().min(0).max(100)).length(12),
      }).parse(req.body);
      const existing = await storage.getGameSettings("fishjoy");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateGameExtraSettings("fishjoy", JSON.stringify({ ...existingExtra, fishOdds, fishWinRates }), req.user.id);
      res.json({ success: true, fishOdds, fishWinRates });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  // === CLASSIC SLOTS ===
  app.get("/api/games/classic-slots/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("classic-slots");
      res.json({ winOccurrence: Math.round((settings?.winChance ?? 0.4) * 100) });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/classic-slots/bet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "classic-slots")) return;
    try {
      const { bet, totBet } = z.object({ bet: z.number().min(1), totBet: z.number().min(1) }).parse(req.body);
      const amount = totBet || bet;
      if (req.user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });
      // Classic-slots iframe sends arbitrary winAmount, so probe against the
      // game's actual top paytable multiplier (200x, see classic-slots/index.html).
      const csSettings = await storage.getGameSettings("classic-slots");
      const csMaxMult = Math.max(200, csSettings?.payoutMultiplier ?? 200);
      const csGuard = await checkBankrollFloorForBet(amount * csMaxMult);
      if (csGuard.blocked) {
        return res.status(400).json({ message: "Bet too large — maximum possible payout exceeds the house bankroll. Please lower your bet.", bankrollBlocked: true });
      }
      await storage.updateUserBalance(req.user.id, -amount);
      await storage.createTransaction({ userId: req.user.id, amount: -amount, type: "bet", description: "Classic Slots bet" });
      await recordBetAndCheckHighBet("classic-slots", req.user.id, amount);
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0 });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/classic-slots/win", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (await gateGame(req, res, "classic-slots")) return;
    try {
      const { winAmount } = z.object({ winAmount: z.number().min(0) }).parse(req.body);
      const finalWin = await applyHouseEdgeForWin("classic-slots", req.user.id, winAmount);
      if (finalWin > 0) {
        await storage.updateUserBalance(req.user.id, finalWin);
        await storage.createTransaction({ userId: req.user.id, amount: finalWin, type: "win", description: `Classic Slots win (+${finalWin})` });
      }
      const user = await storage.getUser(req.user.id);
      res.json({ balance: user?.balance ?? 0, blocked: winAmount > 0 && finalWin === 0 });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  // === SLOTS ===
  app.post(api.games.slots.spin.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet } = api.games.slots.spin.input.parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("slots");
      const winChance = settings?.winChance ?? 0.3;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Slots spin" });

      let won = Math.random() < winChance;
      const symbols = ["banana", "berries", "coconut", "mango", "melon", "orange", "pineapple"];
      const slotsMultiplier = settings?.payoutMultiplier ?? 10;
      let intendedPayout = won ? Math.floor(bet * slotsMultiplier) : 0;
      const allowedPayout = await processCombinedBetAndWin("slots", req.user.id, bet, intendedPayout);
      if (allowedPayout === 0) won = false;
      const payout = allowedPayout;

      let reels: string[];
      if (won) {
        const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        reels = [winSymbol, winSymbol, winSymbol];
      } else {
        reels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        while(reels[0] === reels[1] && reels[1] === reels[2]) {
           reels[2] = symbols[(symbols.indexOf(reels[2]) + 1) % symbols.length];
        }
      }

      const user = payout > 0 ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Slots win" });

      res.json({ won, payout, balance: user?.balance ?? 0, reels });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === ROULETTE ===
  app.get("/api/games/roulette/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const settings = await storage.getGameSettings("roulette");
      const extraParsed = (() => { try { return settings?.extraSettings ? JSON.parse(settings.extraSettings) : {}; } catch { return {}; } })();
      res.json({ numberOdds: extraParsed.numberOdds ?? 35, colorOdds: extraParsed.colorOdds ?? 1, parityOdds: extraParsed.parityOdds ?? 1 });
    } catch (err) { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/games/roulette/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const { numberOdds, colorOdds, parityOdds } = z.object({
        numberOdds: z.number().min(1).max(200),
        colorOdds: z.number().min(0.1).max(50),
        parityOdds: z.number().min(0.1).max(50),
      }).parse(req.body);
      const existing = await storage.getGameSettings("roulette");
      const existingExtra = (() => { try { return existing?.extraSettings ? JSON.parse(existing.extraSettings) : {}; } catch { return {}; } })();
      await storage.updateGameExtraSettings("roulette", JSON.stringify({ ...existingExtra, numberOdds, colorOdds, parityOdds }), req.user.id);
      res.json({ success: true });
    } catch (err) { res.status(400).json({ message: "Invalid input" }); }
  });

  app.post(api.games.roulette.spin.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet, type, value } = api.games.roulette.spin.input.parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("roulette");
      const houseEdgeChance = settings?.winChance ?? 0.45;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Roulette spin" });

      const shouldWin = Math.random() < houseEdgeChance;
      
      let number: number;
      const colors: Record<number, string> = { 0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red' };

      if (shouldWin) {
        const winningNumbers = Object.keys(colors).map(Number).filter(n => {
          if (type === 'number') return n === Number(value);
          if (type === 'color') return colors[n] === value;
          if (type === 'parity') {
             if (n === 0) return false;
             return value === (n % 2 === 0 ? 'even' : 'odd');
          }
          return false;
        });
        number = winningNumbers.length > 0 ? winningNumbers[Math.floor(Math.random() * winningNumbers.length)] : Math.floor(Math.random() * 37);
      } else {
        const losingNumbers = Object.keys(colors).map(Number).filter(n => {
          if (type === 'number') return n !== Number(value);
          if (type === 'color') return colors[n] !== value;
          if (type === 'parity') {
             if (n === 0) return true;
             return value !== (n % 2 === 0 ? 'even' : 'odd');
          }
          return true;
        });
        number = losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
      }

      let color = colors[number];
      let won = false;
      let payout = 0;

      const rouletteSettings = await storage.getGameSettings("roulette");
      const rouletteExtra = (() => { try { return rouletteSettings?.extraSettings ? JSON.parse(rouletteSettings.extraSettings) : {}; } catch { return {}; } })();
      const numberOdds = rouletteExtra.numberOdds ?? 35;
      const colorOdds = rouletteExtra.colorOdds ?? 1;
      const parityOdds = rouletteExtra.parityOdds ?? 1;

      if (type === 'number' && number === Number(value)) { won = true; payout = bet * (numberOdds + 1); }
      else if (type === 'color' && color === value) { won = true; payout = bet * (colorOdds + 1); }
      else if (type === 'parity' && number !== 0) {
        const isEven = number % 2 === 0;
        if ((value === 'even' && isEven) || (value === 'odd' && !isEven)) { won = true; payout = bet * (parityOdds + 1); }
      }

      const allowedPayout = await processCombinedBetAndWin("roulette", req.user.id, bet, payout);
      if (allowedPayout === 0 && payout > 0) {
        // House edge or high-bet protection forces a loss: pick a non-winning number
        const losingNumbers = Object.keys(colors).map(Number).filter(n => {
          if (type === 'number') return n !== Number(value);
          if (type === 'color') return colors[n] !== value;
          if (type === 'parity') {
            if (n === 0) return true;
            return value !== (n % 2 === 0 ? 'even' : 'odd');
          }
          return true;
        });
        if (losingNumbers.length > 0) number = losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
        color = colors[number];
        won = false;
        payout = 0;
      } else {
        payout = allowedPayout;
      }

      const user = payout > 0 ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Roulette win" });

      res.json({ won, payout, balance: user?.balance ?? 0, result: { number, color } });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === ADMIN USERS ===
  app.get(api.admin.users.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(403).send("Forbidden");
    
    if (req.user.role === 'admin') {
      const usersList = await storage.getAllUsers();
      return res.json(usersList);
    } else if (req.user.role === 'super_manager') {
      const managers = await storage.getUsersByCreator(req.user.id);
      let allUsers = [...managers];
      for (const mgr of managers) {
        const mgrUsers = await storage.getUsersByCreator(mgr.id);
        allUsers = allUsers.concat(mgrUsers);
      }
      return res.json(allUsers);
    } else if (req.user.role === 'manager') {
      const mgrUsers = await storage.getUsersByCreator(req.user.id);
      return res.json(mgrUsers);
    }
    
    return res.status(403).send("Forbidden");
  });

  app.post("/api/admin/users/:id/approve", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'super_manager' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    const userId = parseInt(req.params.id);
    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (req.user.role === 'manager' && targetUser.createdBy !== req.user.id) {
      return res.status(403).json({ message: "You can only approve users you manage" });
    }

    const updatedUser = await storage.approveUser(userId);
    res.json(updatedUser);
  });

  app.post("/api/admin/users/:id/reject", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'super_manager' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    const userId = parseInt(req.params.id);
    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (req.user.role === 'manager' && targetUser.createdBy !== req.user.id) {
      return res.status(403).json({ message: "You can only reject users you manage" });
    }

    if (targetUser.isApproved) return res.status(400).json({ message: "Cannot reject an already approved user" });

    await storage.deleteUser(userId);
    res.json({ message: "Signup rejected and user removed" });
  });

  app.get("/api/manager/pending-signups", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'manager') return res.status(403).send("Forbidden");
    const pending = await storage.getPendingUsersByManager(req.user.id);
    res.json(pending);
  });

  app.get("/api/manager/vouchers", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'manager') return res.status(403).send("Forbidden");
    const managerVouchers = await storage.getVouchersByCreator(req.user.id);
    res.json(managerVouchers);
  });

  app.post("/api/admin/users/:id/password", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'super_manager' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    
    try {
      const userId = parseInt(req.params.id);
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      if (req.user.role === 'super_manager') {
        if (targetUser.createdBy !== req.user.id) {
          const managers = await storage.getUsersByCreator(req.user.id);
          const managerIds = managers.map(m => m.id);
          if (!managerIds.includes(targetUser.createdBy!)) {
            return res.status(403).json({ message: "You can only change passwords for users in your network" });
          }
        }
      } else if (req.user.role === 'manager') {
        if (targetUser.createdBy !== req.user.id) {
          return res.status(403).json({ message: "You can only change passwords for your own players" });
        }
      }
      
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(userId, hashedPassword);
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      res.status(400).json({ message: "Invalid password" });
    }
  });

  app.post("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      if (req.user.role === 'admin') {
        const { password } = z.object({ password: adminPasswordSchema }).parse(req.body);
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(req.user.id, hashedPassword);
      } else {
        const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(req.user.id, hashedPassword);
      }
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid password" });
    }
  });

  // === WITHDRAWAL REQUESTS ===
  app.post("/api/withdraw/request", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { amount, managerCode } = z.object({ amount: z.number().min(500), managerCode: z.string().length(6) }).parse(req.body);
      if (req.user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

      const manager = await storage.getUserByWithdrawCode(managerCode);
      if (!manager || manager.role !== 'manager') return res.status(400).json({ message: "Invalid manager code" });

      await storage.updateUserBalance(req.user.id, -amount);
      const withdrawalRequest = await storage.createWithdrawalRequest({
        userId: req.user.id,
        amount,
        managerCode,
        managerId: manager.id,
      });

      await storage.createTransaction({
        userId: req.user.id,
        amount: -amount,
        type: "withdrawal",
        description: `Withdrawal request pending: ${withdrawalRequest.id} (Manager: ${manager.username})`,
      });

      res.status(201).json(withdrawalRequest);
    } catch (err: any) {
      if (err?.issues) return res.status(400).json({ message: "Please enter a valid amount and 6-digit manager code" });
      res.status(400).json({ message: err?.message || "Invalid amount or insufficient funds" });
    }
  });

  app.get("/api/withdraw/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    if (req.user.role === 'user') {
      const requests = await storage.getUserWithdrawalRequests(req.user.id);
      return res.json(requests);
    } else if (req.user.role === 'manager') {
      const requests = await storage.getPendingWithdrawalRequestsByManagerId(req.user.id);
      return res.json(requests);
    } else if (req.user.role === 'admin') {
      const requests = await storage.getPendingWithdrawalRequests();
      return res.json(requests);
    } else {
      return res.json([]);
    }
  });

  app.post("/api/withdraw/requests/:id/process", async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'manager')) return res.status(403).send("Forbidden");
    
    const { id } = req.params;
    const { status } = z.object({ status: z.enum(["approved", "rejected"]) }).parse(req.body);
    
    const request = await storage.getWithdrawalRequest(parseInt(id));
    if (!request || request.status !== 'pending') return res.status(404).json({ message: "Request not found or already processed" });

    if (req.user.role === 'manager' && request.managerId !== req.user.id) {
      return res.status(403).json({ message: "This request is not assigned to you" });
    }

    if (status === 'rejected') {
      await storage.updateUserBalance(request.userId, request.amount);
      await storage.createTransaction({
        userId: request.userId,
        amount: request.amount,
        type: "deposit",
        description: `Withdrawal request rejected: ${request.id}`,
      });
    }

    const updated = await storage.updateWithdrawalRequest(request.id, status, req.user.id);
    res.json(updated);
  });

  app.post("/api/withdraw-code/set", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.role !== 'super_manager' && req.user.role !== 'admin') return res.status(403).send("Forbidden");

    const { managerId, code } = z.object({ managerId: z.number(), code: z.string().length(6).regex(/^\d{6}$/, "Code must be 6 digits") }).parse(req.body);

    const manager = await storage.getUser(managerId);
    if (!manager || manager.role !== 'manager') return res.status(404).json({ message: "Manager not found" });

    if (req.user.role === 'super_manager' && manager.createdBy !== req.user.id) {
      return res.status(403).json({ message: "You can only set codes for managers you created" });
    }

    const existing = await storage.getUserByWithdrawCode(code);
    if (existing && existing.id !== managerId) return res.status(400).json({ message: "This code is already assigned to another manager" });

    const updated = await storage.updateWithdrawCode(managerId, code);
    res.json({ message: "Withdraw code updated", withdrawCode: updated.withdrawCode });
  });

  app.post(api.admin.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    
    try {
      const { userId, amount } = api.admin.withdraw.input.parse(req.body);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.balance < amount) return res.status(400).json({ message: "Insufficient user balance" });

      const updatedUser = await storage.updateUserBalance(userId, -amount);
      await storage.createTransaction({
        userId,
        amount: -amount,
        type: "withdrawal",
        description: `Admin withdrawal: ${req.user.username}`,
      });

      res.json({ balance: updatedUser.balance, message: "Withdrawal successful" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === BROADCAST SYSTEM ===
  app.post("/api/broadcasts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const role = req.user.role;

    if (role !== 'admin' && role !== 'super_manager' && role !== 'manager') {
      return res.status(403).json({ message: "Only admins, super managers, and managers can broadcast" });
    }

    try {
      const { targetRole, message, fontFamily, color, scrollSpeed, durationHours } = z.object({
        targetRole: z.enum(["super_manager", "manager", "user", "all", "public"]),
        message: z.string().min(1).max(500),
        fontFamily: z.string().optional().default("sans-serif"),
        color: z.string().optional().default("#FFD700"),
        scrollSpeed: z.number().min(5).max(60).optional().default(15),
        durationHours: z.number().min(0).max(8760).optional(),
      }).parse(req.body);

      let expiresAt: Date | null = null;
      if (durationHours && durationHours > 0) {
        expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
      }

      if (targetRole === 'public' && role !== 'admin') {
        return res.status(403).json({ message: "Only admins can send public broadcasts" });
      }
      if (role === 'super_manager' && targetRole !== 'manager') {
        return res.status(403).json({ message: "Super managers can only broadcast to their managers" });
      }
      if (role === 'manager' && targetRole !== 'user') {
        return res.status(403).json({ message: "Managers can only broadcast to their players" });
      }

      const broadcast = await storage.createBroadcast({
        senderId: req.user.id,
        senderRole: role,
        targetRole,
        message,
        fontFamily,
        color,
        scrollSpeed,
        expiresAt,
      });

      res.status(201).json(broadcast);
    } catch (err) {
      res.status(400).json({ message: "Invalid broadcast input" });
    }
  });

  app.get("/api/broadcasts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const myBroadcasts = await storage.getBroadcastsForUser(
        req.user.id,
        req.user.role,
        req.user.createdBy
      );
      res.json(myBroadcasts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch broadcasts" });
    }
  });

  app.get("/api/broadcasts/public", async (_req, res) => {
    try {
      const publicBroadcasts = await storage.getPublicBroadcasts();
      res.json(publicBroadcasts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch public broadcasts" });
    }
  });

  app.get("/api/broadcasts/sent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const role = req.user.role;
    if (role !== 'admin' && role !== 'super_manager' && role !== 'manager') {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const sent = await storage.getSentBroadcasts(req.user.id);
      res.json(sent);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sent broadcasts" });
    }
  });

  app.post("/api/broadcasts/:id/dismiss", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const broadcastId = parseInt(req.params.id);
      await storage.dismissBroadcast(broadcastId, req.user.id);
      res.json({ message: "Broadcast dismissed" });
    } catch (err) {
      res.status(400).json({ message: "Failed to dismiss" });
    }
  });

  // Disable a broadcast: marks it expired so the marquee stops showing it for
  // every viewer. Admins can disable any broadcast; managers/super-managers
  // can only disable their own.
  app.post("/api/broadcasts/:id/disable", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const id = parseInt(req.params.id);
      const broadcast = await storage.getBroadcastById(id);
      if (!broadcast) return res.status(404).json({ message: "Broadcast not found" });
      if (req.user.role !== "admin" && broadcast.senderId !== req.user.id) {
        return res.status(403).json({ message: "You can only disable your own broadcasts" });
      }
      const updated = await storage.expireBroadcast(id);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to disable broadcast" });
    }
  });

  // === GAME SCHEDULES (automated odds/multiplier rotation) ===
  // Admin defines rules like "between 18:00-22:00 on weekends, set Roulette
  // win-chance to 25% and payout-multiplier to 1.8". A background tick (below)
  // reconciles game settings against the active rules every minute.
  const SCHEDULABLE_GAMES = ["classic-slots", "roulette", "dice", "hilo", "coinflip", "plinko", "wheel", "fishhunt", "dog-racing", "horse4", "horse-js", "aviator"] as const;
  const scheduleSchema = z.object({
    gameType: z.enum(SCHEDULABLE_GAMES as any),
    label: z.string().min(1).max(100),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
    daysOfWeek: z.string().regex(/^([0-6])(,[0-6])*$/, "CSV of 0-6").default("0,1,2,3,4,5,6"),
    winChancePct: z.number().min(0).max(100).nullable().optional(),
    payoutMultiplier: z.number().min(1.01).max(100).nullable().optional(),
    enabled: z.boolean().default(true),
  });

  app.get("/api/admin/game-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    res.json(await storage.listGameSchedules());
  });

  app.post("/api/admin/game-schedules", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const parsed = scheduleSchema.parse(req.body);
      const created = await storage.createGameSchedule(parsed as any, req.user.id);
      res.json(created);
    } catch (e: any) {
      res.status(400).json({ message: e.errors?.[0]?.message || "Invalid input" });
    }
  });

  app.patch("/api/admin/game-schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const parsed = scheduleSchema.partial().parse(req.body);
      const updated = await storage.updateGameSchedule(parseInt(req.params.id), parsed as any);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.errors?.[0]?.message || "Invalid input" });
    }
  });

  app.delete("/api/admin/game-schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    await storage.deleteGameSchedule(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Background tick: every 60s, find enabled schedules whose current
  // (HH:MM, weekday) falls inside their window and force-write their
  // winChance/payoutMultiplier to gameSettings if different. Only one tick
  // ever runs (registerRoutes is called once at boot).
  const SCHEDULE_TICK_MS = 60_000;
  const ADMIN_SYSTEM_USER_ID = 1; // for `updatedBy` audit trail
  let scheduleTickRunning = false;
  const applySchedules = async () => {
    if (scheduleTickRunning) return; // skip if previous tick is still in flight
    scheduleTickRunning = true;
    try {
      const rules = await storage.listGameSchedules();
      const now = new Date();
      const dow = String(now.getDay());
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const isInWindow = (s: string, e: string) => {
        // Supports overnight windows (e.g. 22:00-02:00).
        if (s <= e) return hhmm >= s && hhmm <= e;
        return hhmm >= s || hhmm <= e;
      };
      const active = rules.filter(r => r.enabled && r.daysOfWeek.split(",").includes(dow) && isInWindow(r.startTime, r.endTime));
      // For each game, last-defined active rule wins (deterministic ordering by gameType,startTime in storage).
      const perGame = new Map<string, typeof active[number]>();
      for (const r of active) perGame.set(r.gameType, r);
      for (const [gameType, r] of Array.from(perGame.entries())) {
        const current = await storage.getGameSettings(gameType);
        if (r.winChancePct != null) {
          const wc = r.winChancePct / 100;
          if (!current || Math.abs((current.winChance ?? 0) - wc) > 1e-6) {
            await storage.updateGameSettings(gameType, wc, ADMIN_SYSTEM_USER_ID);
          }
        }
        if (r.payoutMultiplier != null) {
          if (!current || Math.abs((current.payoutMultiplier ?? 0) - r.payoutMultiplier) > 1e-6) {
            await storage.updateGamePayoutMultiplier(gameType, r.payoutMultiplier, ADMIN_SYSTEM_USER_ID);
          }
        }
      }
    } catch (err) {
      console.error("[schedule-tick] failed:", err);
    } finally {
      scheduleTickRunning = false;
    }
  };
  // Avoid double-registration in dev HMR scenarios.
  if (!(global as any).__gameScheduleTick) {
    (global as any).__gameScheduleTick = setInterval(applySchedules, SCHEDULE_TICK_MS);
    setTimeout(applySchedules, 5_000); // initial run shortly after boot
  }

  // Permanently delete a broadcast. Same authorization as disable.
  app.delete("/api/broadcasts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const id = parseInt(req.params.id);
      const broadcast = await storage.getBroadcastById(id);
      if (!broadcast) return res.status(404).json({ message: "Broadcast not found" });
      if (req.user.role !== "admin" && broadcast.senderId !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own broadcasts" });
      }
      await storage.deleteBroadcast(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete broadcast" });
    }
  });

  // === PROFIT SHARING ROUTES ===

  app.post("/api/profit-share/set", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const { userId, percentage } = req.body;
    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      return res.status(400).json({ message: "Percentage must be between 0 and 100" });
    }

    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const role = req.user.role;
    if (role === 'admin') {
      if (targetUser.role !== 'super_manager') {
        return res.status(403).json({ message: "Admin can only set profit share for super managers" });
      }
    } else if (role === 'super_manager') {
      if (targetUser.role !== 'manager' || targetUser.createdBy !== req.user.id) {
        return res.status(403).json({ message: "You can only set profit share for your managers" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await storage.updateProfitSharePercentage(userId, percentage);
    res.json({ message: "Profit share percentage updated", user: updated });
  });

  app.get("/api/profit-share/calculate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const role = req.user.role;
    if (role !== 'admin' && role !== 'super_manager') {
      return res.status(403).json({ message: "Forbidden" });
    }

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    try {
      let subordinates: User[] = [];
      if (role === 'admin') {
        const allUsers = await storage.getAllUsers();
        subordinates = allUsers.filter(u => u.role === 'super_manager');
      } else if (role === 'super_manager') {
        subordinates = await storage.getUsersByCreator(req.user.id);
        subordinates = subordinates.filter(u => u.role === 'manager');
      }

      const results = [];
      for (const sub of subordinates) {
        let playerIds: number[] = [];
        if (sub.role === 'super_manager') {
          const managers = await storage.getUsersByCreator(sub.id);
          for (const mgr of managers) {
            const players = await storage.getUsersByCreator(mgr.id);
            playerIds = playerIds.concat(players.map(p => p.id));
          }
        } else if (sub.role === 'manager') {
          const players = await storage.getUsersByCreator(sub.id);
          playerIds = players.map(p => p.id);
        }

        let totalBets = 0;
        let totalWins = 0;
        if (playerIds.length > 0) {
          const txns = await storage.getTransactionsByUserIdsAndDateRange(playerIds, from, to);
          for (const tx of txns) {
            if (tx.type === 'bet') totalBets += Math.abs(tx.amount);
            if (tx.type === 'win') totalWins += tx.amount;
          }
        }

        const profit = totalBets - totalWins;
        const sharePercentage = sub.profitSharePercentage || 0;
        const amountOwed = profit > 0 ? Math.round(profit * sharePercentage / 100) : 0;

        results.push({
          id: sub.id,
          username: sub.username,
          role: sub.role,
          profitSharePercentage: sharePercentage,
          totalBets,
          totalWins,
          profit,
          amountOwed,
        });
      }

      res.json(results);
    } catch (err) {
      console.error("Profit share calc error:", err);
      res.status(500).json({ message: "Failed to calculate profit shares" });
    }
  });

  app.get("/api/user/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

    const requester = req.user;
    if (requester.role === 'admin') {
      // admin can view anyone
    } else if (requester.role === 'super_manager') {
      const targetUser = await storage.getUser(userId);
      if (!targetUser || (targetUser.createdBy !== requester.id && targetUser.id !== requester.id)) {
        return res.status(403).json({ message: "Not authorized" });
      }
    } else if (requester.role === 'manager') {
      if (userId !== requester.createdBy && userId !== requester.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
    } else {
      return res.status(403).json({ message: "Not authorized" });
    }

    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    const { password, ...safeUser } = targetUser;
    res.json(safeUser);
  });

  // === CHAT SYSTEM ===
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { receiverId, content } = z.object({
        receiverId: z.number(),
        content: z.string().min(1).max(1000),
      }).parse(req.body);

      const sender = req.user;
      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ message: "User not found" });

      if (sender.role === 'admin') {
        // admin can message anyone
      } else if (sender.role === 'super_manager') {
        if (receiver.role !== 'manager' || receiver.createdBy !== sender.id) {
          return res.status(403).json({ message: "You can only message managers you created" });
        }
      } else if (sender.role === 'manager') {
        if (receiver.id !== sender.createdBy) {
          return res.status(403).json({ message: "You can only message your super manager" });
        }
      } else if (sender.role === 'user') {
        return res.status(403).json({ message: "Players cannot send messages in chat" });
      }

      const message = await storage.createMessage({
        senderId: sender.id,
        receiverId,
        content,
      });

      res.status(201).json(message);
    } catch (err) {
      res.status(400).json({ message: "Invalid message input" });
    }
  });

  app.get("/api/messages/unread/count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    const count = await storage.getUnreadCount(req.user.id);
    res.json({ count });
  });

  app.get("/api/messages/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    if (req.user.role === 'user') return res.status(403).json({ message: "Not authorized" });

    const contacts = await storage.getChatContacts(req.user.id);
    res.json(contacts);
  });

  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    const otherUserId = parseInt(req.params.userId);
    if (isNaN(otherUserId)) return res.status(400).json({ message: "Invalid user ID" });

    const sender = req.user;
    if (sender.role === 'user') return res.status(403).json({ message: "Not authorized" });

    const otherUser = await storage.getUser(otherUserId);
    if (!otherUser) return res.status(404).json({ message: "User not found" });

    if (sender.role === 'super_manager') {
      if (otherUser.role !== 'manager' || otherUser.createdBy !== sender.id) {
        return res.status(403).json({ message: "Not authorized to view this conversation" });
      }
    } else if (sender.role === 'manager') {
      if (otherUser.id !== sender.createdBy) {
        return res.status(403).json({ message: "Not authorized to view this conversation" });
      }
    }

    const conversation = await storage.getConversation(sender.id, otherUserId);

    await storage.markMessagesAsRead(otherUserId, sender.id);

    res.json(conversation);
  });

  // === AUDIO TRACKS ===
  const AUDIO_UPLOAD_DIR = path.join(process.cwd(), "uploads", "audio");
  if (!fs.existsSync(AUDIO_UPLOAD_DIR)) fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });

  const audioStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AUDIO_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `audio_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  });

  const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4", "audio/webm", "audio/flac"];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|aac|m4a|flac|webm)$/i)) {
        cb(null, true);
      } else {
        cb(new Error("Only audio files are allowed"));
      }
    },
  });

  app.use("/uploads/audio", async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    const filename = path.basename(req.path);
    const filePath = path.join(AUDIO_UPLOAD_DIR, filename);
    // Prefer filesystem (fast, supports range requests) but fall back to the
    // DB-stored binary so deployed environments (where /uploads is wiped on
    // each build) can still serve audio.
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }
    try {
      const track = await storage.getAudioTrackByFilename(filename);
      if (!track || !track.data) return res.status(404).send("Not found");
      res.setHeader("Content-Type", track.mimeType || "audio/mpeg");
      res.setHeader("Content-Length", String(track.data.length));
      res.send(track.data);
    } catch {
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/audio", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const tracks = await storage.getAudioTracks();
      res.json(tracks);
    } catch { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/admin/audio", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    const count = await storage.countAudioTracks();
    if (count >= 20) return res.status(400).json({ message: "Maximum of 20 audio tracks allowed. Delete one first." });
    audioUpload.single("audio")(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ message: "No file provided" });
      try {
        // Read the uploaded file into memory so we can also persist it in the
        // database. This is what allows audio to survive Replit deployments,
        // where /uploads is rebuilt fresh on each deploy.
        const buffer = await fs.promises.readFile(req.file.path);
        const track = await storage.createAudioTrack({
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedBy: req.user.id,
          data: buffer,
        });
        // Don't ship the binary back to the admin client.
        const { data: _omit, ...rest } = track as any;
        res.json(rest);
      } catch {
        fs.unlink(req.file.path, () => {});
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
  });

  app.delete("/api/admin/audio/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const id = parseInt(req.params.id);
      const track = await storage.deleteAudioTrack(id);
      if (!track) return res.status(404).json({ message: "Track not found" });
      const filePath = path.join(AUDIO_UPLOAD_DIR, track.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Internal Server Error" }); }
  });

  // === SITE SETTINGS (admin-customizable site background) ===
  // Public read so the login page can apply the background BEFORE auth.
  app.get("/api/site-settings", async (_req, res) => {
    try {
      const s = await storage.getSiteSettings();
      res.json(s);
    } catch {
      res.json({ id: 1, bgType: "default", bgColor: null, bgGradient: null, bgImageUrl: null, bgAnimation: null });
    }
  });

  app.post("/api/admin/site-settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    const allowedTypes = ["default", "color", "gradient", "image", "animation"];
    const allowedAnimations = ["site-bg-aurora", "site-bg-casino-neon", "site-bg-gold-rush", "site-bg-starfield"];
    const { bgType, bgColor, bgGradient, bgImageUrl, bgAnimation } = req.body || {};
    if (bgType && !allowedTypes.includes(bgType)) return res.status(400).json({ message: "Invalid bgType" });
    if (bgAnimation && !allowedAnimations.includes(bgAnimation)) return res.status(400).json({ message: "Invalid animation preset" });
    // bgImageUrl must be one of our own /uploads/backgrounds/ paths to prevent
    // pointing the body at an arbitrary external URL (mixed-content / tracking).
    if (bgImageUrl && !/^\/uploads\/backgrounds\/[\w.\-]+$/.test(bgImageUrl)) {
      return res.status(400).json({ message: "Invalid image URL" });
    }
    // bgColor must be a hex color (#rgb / #rrggbb / #rrggbbaa).
    if (bgColor && !/^#[0-9a-fA-F]{3,8}$/.test(bgColor)) {
      return res.status(400).json({ message: "Invalid color (use hex like #1a2b3c)" });
    }
    // bgGradient must look like a CSS gradient — no quotes / parens balance for safety.
    if (bgGradient && (!/^(linear|radial|conic)-gradient\(/.test(bgGradient) || /["';<>]/.test(bgGradient))) {
      return res.status(400).json({ message: "Invalid gradient value" });
    }
    const patch: any = {};
    if (bgType !== undefined) patch.bgType = bgType;
    if (bgColor !== undefined) patch.bgColor = bgColor;
    if (bgGradient !== undefined) patch.bgGradient = bgGradient;
    if (bgImageUrl !== undefined) patch.bgImageUrl = bgImageUrl;
    if (bgAnimation !== undefined) patch.bgAnimation = bgAnimation;
    try {
      const updated = await storage.updateSiteSettings(patch, req.user.id);
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to update site settings" });
    }
  });

  // Background image library — uploaded once, reused across deploys via bytea.
  const BG_UPLOAD_DIR = path.join(process.cwd(), "uploads", "backgrounds");
  if (!fs.existsSync(BG_UPLOAD_DIR)) fs.mkdirSync(BG_UPLOAD_DIR, { recursive: true });

  const bgUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, BG_UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `bg_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpe?g|png|webp|gif|avif)$/i)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed (jpg, png, webp, gif, avif)"));
      }
    },
  });

  app.use("/uploads/backgrounds", async (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    const filename = path.basename(req.path);
    const filePath = path.join(BG_UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    try {
      const img = await storage.getBackgroundImageByFilename(filename);
      if (!img || !img.data) return res.status(404).send("Not found");
      res.setHeader("Content-Type", img.mimeType || "image/png");
      res.setHeader("Content-Length", String(img.data.length));
      res.send(img.data);
    } catch {
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/api/admin/backgrounds", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const list = await storage.getBackgroundImages();
      res.json(list);
    } catch { res.status(500).json({ message: "Internal Server Error" }); }
  });

  app.post("/api/admin/backgrounds", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    bgUpload.single("image")(req, res, async (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ message: "No file provided" });
      try {
        const buffer = await fs.promises.readFile(req.file.path);
        const img = await storage.createBackgroundImage({
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          uploadedBy: req.user!.id,
          data: buffer,
        });
        const { data: _omit, ...rest } = img as any;
        res.json({ ...rest, url: `/uploads/backgrounds/${img.filename}` });
      } catch {
        fs.unlink(req.file.path, () => {});
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
  });

  app.delete("/api/admin/backgrounds/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") return res.status(403).send("Forbidden");
    try {
      const id = parseInt(req.params.id);
      const img = await storage.deleteBackgroundImage(id);
      if (!img) return res.status(404).json({ message: "Image not found" });
      const filePath = path.join(BG_UPLOAD_DIR, img.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Internal Server Error" }); }
  });

  return httpServer;
}
