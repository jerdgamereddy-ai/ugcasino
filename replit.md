# UG Casino - Online Casino Platform

## Overview

UG Casino is a full-stack web application offering an online casino experience with various games like slot machines and roulette. It features a 4-tier role-based user system (admin, super_manager, manager, user), a voucher-based currency deposit system, real-time game mechanics with configurable win probabilities, and comprehensive time-based financial reporting with hierarchical access control. The platform uses Ugandan Shillings (UGX) as its currency and is designed with a luxury gold-and-black aesthetic. The business vision is to provide a robust and engaging online gambling platform with detailed financial oversight and flexible management tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with a custom luxury gold/black theme.
- **Animations**: Framer Motion.
- **Layout**: Sidebar navigation, protected routes.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM.
- **Authentication**: Passport.js with local strategy, session-based via express-session.
- **Password Security**: scrypt hashing.
- **API Design**: RESTful endpoints.

### Data Storage
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with drizzle-zod for schema validation.
- **Key Models**: Users (with roles, balance, profit share), Vouchers, Transactions, Game Settings.

### Core Features
- **Game Mechanics**: Includes Classic Slots, Roulette, Fish Joy/Hunt, Greyhound Racing, Horse4 Racing, Quick Horse Race, and Aviator (crash game). Games feature configurable win probabilities, payout multipliers, and use `postMessage` for integration with external HTML5 games.
    - **Roulette** (`RouletteBoard`): segmented spinning wheel with counter-rotating ball, decelerating tick SFX during the spin, ball-drop bounce on land; spin button gated on both API + animation lifecycle. Timers tracked in refs and cleaned up on unmount.
    - **Classic Slots iframe wrapper** (`GameClassicSlots`): adds a glowing win-line overlay (CSS only, `pointer-events:none`) on top of the iframe whenever a paying win is settled. Iframe game itself plays its own `reel_stop`/`reels` sounds via Howler.
    - **Fish Hunt iframe wrapper** (`GameFishJoy`): overlays a light water shimmer + surface caustics layer on top of the iframe via CSS keyframes (`fishhunt-water-shimmer`, `fishhunt-water-caustics` in `index.css`); pointer-events:none preserves click-through.
    - **React `SlotMachine` + `GameFishHunt`** (currently un-routed but kept polished): staggered reel stops with per-reel tick + flash, glowing win-line bar, ambient bubble loop and water shimmer.
- **Role-Based Access Control**:
    - **User**: Play games, redeem vouchers, view balance.
    - **Manager**: User permissions + create players, manage player passwords, view player reports.
    - **Super Manager**: Manager permissions + create managers, view network-wide reports, filter by manager.
    - **Admin**: All permissions + modify game settings, view full business reports, manage all users, security questions for password recovery.
- **Reporting System**: Unified API for time-filtered financial reports (Profit/Loss, Deposits, Withdrawals, Bets, Wins) with per-game breakdowns. Hierarchical access ensures users only see relevant data.
- **Withdrawal System**: Players request withdrawals using manager-assigned codes; managers approve/reject requests. Admins oversee all requests.
- **Profit Sharing**: Admin sets profit share percentages for super managers, who then set for their managers. Calculations are time-filtered.
- **Player Signup Approval**: New players register under a manager's code and require manager approval to log in.
- **Manager Voucher Creation**: Managers can generate, view, and print deposit vouchers for their players.
- **Broadcast System**: Hierarchical messaging (Admin to all, Super Manager to managers, Manager to players) with public broadcasts, customizable styling, duration, and dismissibility.
- **Chat System**: Role-based direct messaging (Admin to any user, Super Manager to their managers, Manager to their Super Manager) with auto-refresh and unread badges.

## External Dependencies

### Database
- **PostgreSQL**: Main database.
- **connect-pg-simple**: For PostgreSQL session storage.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **framer-motion**: Animations.
- **lucide-react**: Icons.
- **wouter**: React router.
- **react-hook-form** + **@hookform/resolvers**: Form handling and validation.

### UI Framework
- **Radix UI**: Accessible UI primitives.
- **class-variance-authority**: Component variants.
- **tailwind-merge**, **clsx**: Utility class merging.

### Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Server bundling.
- **Drizzle Kit**: Database migrations and schema management.