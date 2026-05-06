# UG Casino - Online Casino Platform

## Overview

UG Casino is a full-stack web application providing an online casino experience with various games like slot machines and roulette. It features a 4-tier role-based user system, a voucher-based currency deposit system using Ugandan Shillings (UGX), real-time game mechanics with configurable win probabilities, and comprehensive time-based financial reporting with hierarchical access control. The platform is designed with a luxury gold-and-black aesthetic. The business vision is to deliver a robust and engaging online gambling platform with detailed financial oversight and flexible management tools, aiming for significant market potential in the online casino industry.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design Theme**: Luxury gold-and-black aesthetic with custom styling via Tailwind CSS.
- **UI Components**: Utilizes shadcn/ui built on Radix UI for accessible and customizable components.
- **Animations**: Framer Motion for dynamic and engaging user interface interactions.
- **Layout**: Features a clear sidebar navigation and protected routes to manage access.
- **Visual Polish**: Includes casino-themed visual effects like glowing win-lines, water shimmer overlays, custom 3D dice, visually rich card graphics for games, a real 3D coin flip (perspective + preserve-3d with two backface-hidden faces), Titanic-themed Hi-Lo card faces and back, and a spinning propeller overlaid on the Aviator plane's nose.
- **Customizable Site Background**: Admins can set site-wide backgrounds including colors, gradients, images, and CSS animations (e.g., aurora, casino-neon, gold-rush, starfield).

### Technical Implementations
- **Frontend**: Developed with React 18, TypeScript, and Vite, using Wouter for routing and TanStack React Query for server state management.
- **Backend**: Built on Node.js with Express.js, using TypeScript and ESM.
- **Authentication**: Implemented with Passport.js (local strategy) and session-based authentication via express-session, securing passwords with scrypt hashing.
- **API**: Follows a RESTful design for efficient data exchange.
- **Database**: PostgreSQL is used for data storage, managed with Drizzle ORM and drizzle-zod for schema validation.

### Feature Specifications
- **Game Mechanics**: Offers a variety of games including Classic Slots, Roulette, Fish Joy/Hunt, Greyhound Racing, Horse4 Racing, Quick Horse Race, Aviator (crash game), Plinko, Wheel of Fortune, Royal Dice, and Hi-Lo. Games include configurable win probabilities, payout multipliers, and mechanisms for integrating external HTML5 games.
- **Per-User Game Enable/Disable**: Admin-controlled system allowing specific games to be enabled or disabled for individual users, managers, or super managers, with server-side enforcement and UI updates.
- **Per-Super-Manager Game Overrides**: Each super-manager can override `winChance` and `payoutMultiplier` per game (table `manager_game_overrides`, keyed by the super-manager's user id) so the override applies uniformly to every player under their line — across all of their managers. All other game-settings fields (house edge, bet limits, special multipliers like dog odds / plinko / wheel) remain admin-global. Server-side helper `getEffectiveGameSettings(userId, gameType)` walks the createdBy chain to the nearest super_manager ancestor and merges that super-manager's override on top of the admin-global row. UI lives in the SuperManagerDashboard "Game Control" tab; blank inputs inherit global, and a Clear button removes the override row. Managers themselves do NOT see this tab.
- **Role-Based Access Control (RBAC)**: A 4-tier system (User, Manager, Super Manager, Admin) with granular permissions for game access, financial management, user management, reporting, and administrative tasks.
- **Race Game House-Edge Safety**: Implements `computeForceLose` and `applyHouseEdgeForWin` to ensure house edge and prevent over-payouts in race games.
- **Universal House Edge**: Admin-toggleable global house-edge override. When enabled, all games consult a single `houseEdgePct` and shared `totalBet`/`totalPaid` counters instead of per-game stats. A configurable `minHouseBalance` floor blocks any payout that would drop the combined house bankroll (admin + super_manager + manager balances) below the threshold. Live bankroll, totals, and RTP are shown in the Admin → Game Control tab. Per-game bypass switches (`bypassClassicSlotsBankroll`, `bypassHorse4Bankroll`, `bypassDogRacingBankroll`) let admins keep specific games playable below the floor — bets are accepted but excessive payouts are still voided server-side. A "Reset House Bankroll Stats" button zeroes out both the universal counters and every per-game `totalBet`/`totalPaid` row in one click (does NOT touch user balances).
- **Decentralised Manager-Owned Bankroll**: Each player's bets/wins flow through their direct manager's casino pool only (no upstream cascade). A bet credits the manager pool; a win debits it. If the manager pool can't cover a potential win, the player is force-lost (universal house bankroll floor still guards admin/super-manager-direct players who have no manager ancestor). Per-manager toggle `useSeparateBusinessMoney` chooses whether the pool is the manager's wallet `balance` (default) or a separate `businessMoney` column. Super-manager dashboard exposes per-manager Credit, Withdraw Profits, Adjust Business Money, mode toggle, and non-destructive "Reset Reports" (stamps `reportSinceAt` so future report queries hide everything before that moment).
- **Aviator RTP Cap**: Ensures the Return To Player (RTP) for Aviator stays within configured limits.
- **Reporting System**: Unified API for time-filtered financial reports (Profit/Loss, Deposits, Withdrawals, Bets, Wins) with per-game breakdowns and hierarchical access. Each manager can also set a non-destructive `reportSinceAt` cutoff via the super-manager dashboard — once stamped, that manager's own and their direct players' activity before the stamp is hidden from every reports view (admin/super-manager/manager) without deleting any rows.
- **Withdrawal System**: Player-initiated withdrawal requests, manager approval/rejection, and admin oversight.
- **Profit Sharing**: Configurable profit share percentages for managers and super managers, with time-filtered calculations.
- **Player Signup Approval**: New player registrations require manager approval.
- **Manager Voucher Creation**: Managers can generate, view, and print deposit vouchers.
- **Broadcast System**: Hierarchical messaging system for Admins, Super Managers, and Managers, supporting public broadcasts with customizable styling and duration.
- **Automated Game Schedules**: Admin-defined rules to automatically adjust game settings (e.g., win chance, payout multiplier) based on time and day.
- **Customizable Game Multipliers**: Admins can customize multipliers for Plinko (9-slot) and Wheel of Fortune (16 segments).
- **Chat System**: Role-based direct messaging with auto-refresh and unread indicators.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **connect-pg-simple**: Used for PostgreSQL session storage.

### Frontend Libraries
- **@tanstack/react-query**: For managing and caching server state.
- **framer-motion**: For animations and transitions.
- **lucide-react**: Icon library.
- **wouter**: A small routing library for React.
- **react-hook-form** + **@hookform/resolvers**: For robust form handling and validation.

### UI Framework
- **Radix UI**: Provides unstyled, accessible UI components.
- **class-variance-authority**: For managing component variants and conditional styling.
- **tailwind-merge**, **clsx**: Utilities for merging Tailwind CSS classes and conditional class application.

### Development Tools
- **Vite**: Modern frontend build tool.
- **esbuild**: Used for fast server-side bundling.
- **Drizzle Kit**: Tooling for database migrations and schema management with Drizzle ORM.

### Integrations
- **Background Music Player**: Stores audio tracks as `bytea` in the database to ensure persistence across deployments.