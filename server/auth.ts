import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function seedAdmin() {
  const existingAdmin = await storage.getUserByUsername("Admin");
  if (!existingAdmin) {
    const hashedPassword = await hashPassword("Admin100%-0");
    await storage.createUser({
      username: "Admin",
      password: hashedPassword,
      role: "admin",
      isApproved: true,
      isSuspended: false,
    });
    console.log("Admin account created with default credentials");
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else if (user.isSuspended) {
        if (user.role === "manager") {
          return done(null, false, { message: "Your account has been suspended. Please contact your Super Manager." });
        } else if (user.role === "user") {
          return done(null, false, { message: "Your account has been suspended. Please contact your Manager." });
        } else {
          return done(null, false, { message: "Your account has been suspended. Please contact the Admin." });
        }
      } else if (user.role !== 'admin' && !user.isApproved) {
        return done(null, false, { message: "Account pending approval" });
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, managerCode } = req.body;

      if (!username || !password || !managerCode) {
        return res.status(400).send("Username, password, and manager code are required");
      }

      if (username === "Admin") {
        return res.status(400).send("Username 'Admin' is reserved");
      }

      const manager = await storage.getUserByWithdrawCode(managerCode);
      if (!manager || manager.role !== 'manager') {
        return res.status(400).send("Invalid manager code. Please get a valid 6-digit code from your manager.");
      }

      if (manager.isSuspended) {
        return res.status(400).send("This manager's account is currently suspended. Please contact another manager.");
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "user",
        createdBy: manager.id,
        isApproved: false,
      });

      res.status(201).json({ message: "Account created! Please wait for your manager to approve your account before you can log in." });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
