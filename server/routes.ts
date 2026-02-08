import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";
import { hashPassword } from "./auth";
import { adminPasswordSchema, securityAnswersSchema, securityVerifySchema, ADMIN_SECURITY_QUESTIONS, type User } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

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

      // Compute report metrics
      const report = txns.reduce((acc, tx) => {
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

      const totalAccountBalances = allRelevantUsers.reduce((sum: number, u: any) => sum + u.balance, 0);
      const playersCount = allRelevantUsers.filter((u: any) => u.role === 'user').length;
      const managersCount = allRelevantUsers.filter((u: any) => u.role === 'manager').length;
      const profit = report.totalBets - report.totalWins;

      res.json({
        totalDeposits: report.totalDeposits,
        totalWithdrawals: totalWithdrawn,
        totalBets: report.totalBets,
        totalWins: report.totalWins,
        totalAccountBalances,
        profit,
        playersCount,
        managersCount,
        transactions: txns.slice(0, 200),
        dailyStats: Object.values(report.dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)),
        managers: managersList,
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
    const gameTypes = ["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "mines", "wheel", "poker", "keno"] as const;
    const existingTypes = settings.map(s => s.gameType);
    
    for (const type of gameTypes) {
      if (!existingTypes.includes(type)) {
        const defaultChance = (type === "dice" || type === "hilo" || type === "coinflip" || type === "plinko" || type === "mines" || type === "wheel" || type === "poker" || type === "keno") ? 0.48 : 0.3;
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
        gameType: z.enum(["slots", "roulette", "dice", "hilo", "coinflip", "plinko", "mines", "wheel", "poker", "keno"]),
        winChance: z.number().min(0).max(100)
      }).parse(req.body);
      
      const settings = await storage.updateGameSettings(gameType as any, winChance / 100, req.user.id);
      res.json(settings);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === HILO GAME ===
  app.post("/api/games/hilo/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet, prediction, lastCard } = z.object({ 
        bet: z.number().min(500),
        prediction: z.enum(["higher", "lower"]),
        lastCard: z.number().nullable()
      }).parse(req.body);

      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });

      const settings = await storage.getGameSettings("hilo");
      const winChance = settings?.winChance ?? 0.48;

      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "HiLo play" });

      const won = Math.random() < winChance;
      const nextCard = won 
        ? (prediction === "higher" 
            ? Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1
            : Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1)
        : (prediction === "higher"
            ? Math.floor(Math.random() * ((lastCard || 7) - 1)) + 1
            : Math.floor(Math.random() * (13 - (lastCard || 7))) + (lastCard || 7) + 1);
      
      const card = Math.max(1, Math.min(13, nextCard));
      const payout = won ? bet * 2 : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "HiLo win" });

      res.json({ won, payout, balance: user?.balance ?? 0, card });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === DICE GAME ===
  app.post("/api/games/dice/roll", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
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

      const won = Math.random() < winChance;
      const roll = won 
        ? (choice === "low" ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4)
        : (choice === "low" ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1);
      
      const payout = won ? bet * 2 : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Dice win" });

      res.json({ won, payout, balance: user?.balance ?? 0, roll });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === COIN FLIP GAME ===
  app.post("/api/games/coinflip/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
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

      const won = Math.random() < winChance;
      const result = won ? choice : (choice === "heads" ? "tails" : "heads");
      
      const payout = won ? bet * 1.95 : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, Math.floor(payout)) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: Math.floor(payout), type: "win", description: "Coin Flip win" });

      res.json({ won, payout: Math.floor(payout), balance: user?.balance ?? 0, result });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === PLINKO GAME ===
  app.post("/api/games/plinko/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet } = z.object({ bet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      const settings = await storage.getGameSettings("plinko");
      const winChance = settings?.winChance ?? 0.48;
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Plinko play" });
      
      const multipliers = [0.2, 0.5, 1.2, 2, 5, 2, 1.2, 0.5, 0.2];
      const won = Math.random() < winChance;
      let multiplierIndex;
      if (won) {
        const winIndices = [2, 3, 4, 5, 6];
        multiplierIndex = winIndices[Math.floor(Math.random() * winIndices.length)];
      } else {
        const loseIndices = [0, 1, 7, 8];
        multiplierIndex = loseIndices[Math.floor(Math.random() * loseIndices.length)];
      }
      
      const multiplier = multipliers[multiplierIndex];
      const payout = Math.floor(bet * multiplier);
      const user = await storage.updateUserBalance(req.user.id, payout);
      if (payout > 0) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Plinko win" });
      res.json({ won: multiplier > 1, payout, balance: user.balance, multiplier, multiplierIndex });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === MINES GAME ===
  app.post("/api/games/mines/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet, minesCount, selectedCells } = z.object({ 
        bet: z.number().min(500),
        minesCount: z.number().min(1).max(24),
        selectedCells: z.array(z.number())
      }).parse(req.body);
      
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      const settings = await storage.getGameSettings("mines");
      const winChance = settings?.winChance ?? 0.48;
      
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Mines play" });
      
      const won = Math.random() < winChance;
      const payout = won ? Math.floor(bet * (1 + (minesCount * selectedCells.length * 0.2))) : 0;
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Mines win" });
      
      res.json({ won, payout, balance: user?.balance ?? 0 });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === WHEEL GAME ===
  app.post("/api/games/wheel/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet } = z.object({ bet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      
      const settings = await storage.getGameSettings("wheel");
      const winChance = settings?.winChance ?? 0.48;
      
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Wheel spin" });
      
      const won = Math.random() < winChance;
      const segmentIndex = won ? (Math.floor(Math.random() * 4) * 2) : (Math.floor(Math.random() * 4) * 2 + 1);
      const multiplier = won ? 2 : 0;
      const payout = Math.floor(bet * multiplier);
      
      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Wheel win" });
      
      res.json({ won, payout, balance: user?.balance ?? 0, segmentIndex, multiplier });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === POKER GAME ===
  app.post("/api/games/poker/deal", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet } = z.object({ bet: z.number().min(500) }).parse(req.body);
      if (req.user.balance < bet) return res.status(400).json({ message: "Insufficient balance" });
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({ userId: req.user.id, amount: -bet, type: "bet", description: "Poker deal" });
      const suits = ["spades", "clubs", "hearts", "diamonds"];
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const hand = Array.from({ length: 5 }).map(() => ({
        value: values[Math.floor(Math.random() * values.length)],
        suit: suits[Math.floor(Math.random() * suits.length)]
      }));
      res.json({ hand });
    } catch (err) { res.status(500).send("Error"); }
  });

  app.post("/api/games/poker/draw", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const { bet, holds, hand } = z.object({ 
        bet: z.number(), 
        holds: z.array(z.boolean()),
        hand: z.array(z.object({ value: z.string(), suit: z.string() }))
      }).parse(req.body);
      
      const settings = await storage.getGameSettings("poker");
      const winChance = settings?.winChance ?? 0.3;
      
      const suits = ["spades", "clubs", "hearts", "diamonds"];
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      
      const newHand = hand.map((card, i) => holds[i] ? card : {
        value: values[Math.floor(Math.random() * values.length)],
        suit: suits[Math.floor(Math.random() * suits.length)]
      });

      const won = Math.random() < winChance;
      const payout = won ? bet * 2 : 0;
      const result = won ? "JACKS OR BETTER" : "NO PAIR";
      
      if (won) {
        await storage.updateUserBalance(req.user.id, payout);
        await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Poker win" });
      }
      
      const user = await storage.getUser(req.user.id);
      res.json({ won, payout, balance: user?.balance, hand: newHand, result });
    } catch (err) { res.status(500).send("Error"); }
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

  // === KENO GAME ===
  app.post("/api/games/keno/play", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { bet, selectedNumbers } = z.object({
        bet: z.number().min(500),
        selectedNumbers: z.array(z.number()).min(1).max(10)
      }).parse(req.body);

      if (req.user.balance < bet) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const settings = await storage.getGameSettings("keno");
      const winChance = settings?.winChance ?? 0.48;

      const allNumbers = Array.from({ length: 80 }, (_, i) => i + 1);
      const drawnNumbers: number[] = [];
      
      const availableNumbers = [...allNumbers];
      for (let i = 0; i < 20; i++) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        drawnNumbers.push(availableNumbers.splice(randomIndex, 1)[0]);
      }

      const hits = selectedNumbers.filter(num => drawnNumbers.includes(num)).length;
      
      const hitRatios: Record<number, Record<number, number>> = {
        1: { 1: 3 },
        2: { 1: 1, 2: 9 },
        3: { 2: 2, 3: 16 },
        4: { 2: 1, 3: 5, 4: 40 },
        5: { 3: 3, 4: 15, 5: 100 },
        10: { 5: 2, 6: 15, 7: 100, 8: 500, 9: 1000, 10: 5000 }
      };

      const count = selectedNumbers.length;
      let multiplier = 0;
      
      const selectionKey = Object.keys(hitRatios)
        .map(Number)
        .sort((a, b) => b - a)
        .find(k => k <= count) || 1;

      multiplier = hitRatios[selectionKey][hits] || 0;

      const isRiggedWin = Math.random() < winChance;
      if (!isRiggedWin && multiplier > 1) {
        multiplier = 0;
      }

      const won = multiplier > 0;
      const payout = won ? Math.floor(bet * multiplier) : 0;

      const user = await storage.updateUserBalance(req.user.id, payout - bet);
      await storage.createTransaction({
        userId: req.user.id,
        amount: payout - bet,
        type: won ? "win" : "bet",
        description: `Keno: ${hits} hits on ${count} numbers`
      });

      res.json({ won, payout, drawnNumbers, hits, balance: user.balance });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
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

      const won = Math.random() < winChance;
      const symbols = ["cherry", "lemon", "orange", "grape", "bell", "diamond", "seven"];
      
      let reels: string[];
      let payout = 0;

      if (won) {
        const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        reels = [winSymbol, winSymbol, winSymbol];
        payout = bet * 10;
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

      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Slots win" });

      res.json({ won, payout, balance: user?.balance ?? 0, reels });
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === ROULETTE ===
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

      const color = colors[number];
      let won = false;
      let payout = 0;

      if (type === 'number' && number === Number(value)) { won = true; payout = bet * 35; }
      else if (type === 'color' && color === value) { won = true; payout = bet * 2; }
      else if (type === 'parity' && number !== 0) {
        const isEven = number % 2 === 0;
        if ((value === 'even' && isEven) || (value === 'odd' && !isEven)) { won = true; payout = bet * 2; }
      }

      const user = won ? await storage.updateUserBalance(req.user.id, payout) : await storage.getUser(req.user.id);
      if (won) await storage.createTransaction({ userId: req.user.id, amount: payout, type: "win", description: "Roulette win" });

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
    const updatedUser = await storage.approveUser(userId);
    res.json(updatedUser);
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
      const { targetRole, message } = z.object({
        targetRole: z.enum(["super_manager", "manager", "user", "all"]),
        message: z.string().min(1).max(500),
      }).parse(req.body);

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

  return httpServer;
}
