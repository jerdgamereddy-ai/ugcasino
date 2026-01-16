import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { randomBytes } from "crypto";

import { hashPassword } from "./auth";

async function seed() {
  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length === 0) {
    const adminPassword = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: adminPassword,
      role: "admin",
    });

    const managerPassword = await hashPassword("manager123");
    await storage.createUser({
      username: "manager",
      password: managerPassword,
      role: "manager",
    });

    const userPassword = await hashPassword("player1");
    await storage.createUser({
      username: "player1",
      password: userPassword,
      role: "user",
    });
    // Give player1 some initial balance for testing
    const player = await storage.getUserByUsername("player1");
    if (player) {
      await storage.updateUserBalance(player.id, 50000); // 50,000 UGX
    }

    console.log("Database seeded!");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seed();
  setupAuth(app);

  // === VOUCHERS ===
  app.post(api.vouchers.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.role === 'user') return res.status(403).send("Forbidden");

    try {
      const input = api.vouchers.create.input.parse(req.body);
      const code = randomBytes(4).toString('hex').toUpperCase(); // Simple 8-char code
      const voucher = await storage.createVoucher({
        ...input,
        code,
        createdBy: req.user.id,
      });
      res.status(201).json(voucher);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post(api.vouchers.redeem.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const input = api.vouchers.redeem.input.parse(req.body);
      const voucher = await storage.getVoucherByCode(input.code);

      if (!voucher) return res.status(404).json({ message: "Invalid voucher code" });
      if (voucher.isRedeemed) return res.status(400).json({ message: "Voucher already redeemed" });

      // Transaction
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

  // === GAMES ===
  app.post(api.games.slots.spin.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    try {
      const { bet } = api.games.slots.spin.input.parse(req.body);

      if (req.user.balance < bet) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct bet
      await storage.updateUserBalance(req.user.id, -bet);
      await storage.createTransaction({
        userId: req.user.id,
        amount: -bet,
        type: "bet",
        description: "Slots spin",
      });

      // Simple Slot Logic
      const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣"];
      const reels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];

      let payout = 0;
      let won = false;

      // Win Logic
      if (reels[0] === reels[1] && reels[1] === reels[2]) {
        // 3 match
        payout = bet * 10;
        won = true;
      } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        // 2 match
        payout = bet * 2;
        won = true;
      }

      let newBalance = req.user.balance - bet; // Already deducted in DB, but for response calculation
      // Refetch user to get accurate balance after deduction
      const userAfterBet = await storage.getUser(req.user.id);
      if (!userAfterBet) throw new Error("User not found");
      newBalance = userAfterBet.balance;

      if (won) {
        const user = await storage.updateUserBalance(req.user.id, payout);
        newBalance = user.balance;
        await storage.createTransaction({
          userId: req.user.id,
          amount: payout,
          type: "win",
          description: `Slots win: ${reels.join(" ")}`,
        });
      }

      res.json({
        won,
        payout,
        balance: newBalance,
        reels,
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.games.roulette.spin.path, async (req, res) => {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

      try {
        const { bet, type, value } = api.games.roulette.spin.input.parse(req.body);

        if (req.user.balance < bet) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Deduct bet
        await storage.updateUserBalance(req.user.id, -bet);
        await storage.createTransaction({
          userId: req.user.id,
          amount: -bet,
          type: "bet",
          description: `Roulette bet on ${type}: ${value}`,
        });

        // Roulette Logic
        const number = Math.floor(Math.random() * 37); // 0-36
        const colors = {
          0: 'green',
          1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
          7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
          13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
          19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
          25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
          31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
        };
        // @ts-ignore
        const color = colors[number];

        let won = false;
        let payout = 0;

        if (type === 'number' && Number(value) === number) {
          won = true;
          payout = bet * 35;
        } else if (type === 'color' && value === color) {
          won = true;
          payout = bet * 2;
        } else if (type === 'parity') {
          const isEven = number !== 0 && number % 2 === 0;
          const isOdd = number !== 0 && number % 2 !== 0;
          if ((value === 'even' && isEven) || (value === 'odd' && isOdd)) {
            won = true;
            payout = bet * 2;
          }
        }

        let newBalance = 0;
        const userAfterBet = await storage.getUser(req.user.id);
        if(!userAfterBet) throw new Error("User not found");
        newBalance = userAfterBet.balance;

        if (won) {
          const user = await storage.updateUserBalance(req.user.id, payout);
          newBalance = user.balance;
          await storage.createTransaction({
            userId: req.user.id,
            amount: payout,
            type: "win",
            description: `Roulette win on ${number} (${color})`,
          });
        }

        res.json({
          won,
          payout,
          balance: newBalance,
          result: { number, color },
        });

      } catch (err) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

  // === ADMIN ===
  app.get(api.admin.users.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.status(403).send("Forbidden");
    const users = await storage.getAllUsers();
    res.json(users);
  });

  return httpServer;
}
