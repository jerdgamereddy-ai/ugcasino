# UG Casino - Online Casino Platform

## Overview

UG Casino is a full-stack web application providing an online casino experience with slot machine and roulette games. The platform features a role-based user system (admin, manager, user), voucher-based currency deposits, real-time game mechanics with configurable win probabilities, and comprehensive financial reporting for administrators.

The application uses Ugandan Shillings (UGX) as its currency and features a luxury gold-and-black visual theme designed for an upscale gambling experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, with custom hooks abstracting API interactions
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom luxury theme (gold/black color palette), CSS variables for theming
- **Animations**: Framer Motion for game animations (slot reels, roulette wheel)
- **Layout**: Sidebar-based navigation with collapsible menu, protected routes for authenticated users

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Security**: scrypt for password hashing with timing-safe comparison
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **API Design**: RESTful endpoints with shared route definitions between client and server

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` - contains users, vouchers, transactions, and game settings tables
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push` for development)

### Key Data Models
- **Users**: id, username, password, role (admin/manager/user), balance (UGX integer)
- **Vouchers**: code-based deposit system, tracks creator and redeemer
- **Transactions**: audit log of all balance changes (deposits, withdrawals, bets, wins)
- **Game Settings**: per-game win probability configuration (0.0-1.0)

### Game Mechanics
- **Slots**: 3-reel slot machine with emoji symbols, configurable win chance
- **Roulette**: European-style with number, color, and parity betting options
- **House Edge**: Administrators can adjust win probabilities per game type through the Game Control panel

### Role-Based Access Control
- **User**: Play games, redeem vouchers, view balance
- **Manager**: All user permissions + create vouchers, view user list
- **Admin**: All manager permissions + modify game settings, view financial reports

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage in PostgreSQL

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **framer-motion**: Complex animations for game UI
- **lucide-react**: Icon library
- **wouter**: Lightweight React router
- **react-hook-form** + **@hookform/resolvers**: Form handling with Zod validation

### UI Framework
- **Radix UI**: Full suite of accessible UI primitives (dialog, dropdown, tabs, etc.)
- **class-variance-authority**: Component variant management
- **tailwind-merge** + **clsx**: Utility class merging

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database migrations and schema management

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (defaults to "secret" in development)