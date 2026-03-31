# UG Casino - Online Casino Platform

## Overview

UG Casino is a full-stack web application providing an online casino experience with slot machine and roulette games. The platform features a 4-tier role-based user system (admin, super_manager, manager, user), voucher-based currency deposits, real-time game mechanics with configurable win probabilities, and comprehensive time-based financial reporting with hierarchical access control.

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
- **Users**: id, username, password, role (admin/manager/user), balance (UGX integer), profitSharePercentage (double), phoneNumber (optional text)
- **Vouchers**: code-based deposit system, tracks creator and redeemer
- **Transactions**: audit log of all balance changes (deposits, withdrawals, bets, wins)
- **Game Settings**: per-game win probability configuration (0.0-1.0), payoutMultiplier (double, admin-configurable payout multiplier for coinflip)

### Game Mechanics
- **Slots**: 3-reel slot machine with emoji symbols, configurable win chance; balance displayed in header
- **Roulette**: European-style with number, color, and parity betting options; configurable odds per bet type (numberOdds, colorOdds, parityOdds) via admin panel; displays odds reference table; balance in header
- **Fish Joy** (`/fishhunt`): Canvas-based cannon fish game (`/games/fish-new/`). Players fire at fish swimming across screen. 500 UGX per coin scale; postMessage protocol (`init_balance` → set coins, `bet`/`win` → API calls); backend `/api/games/fishjoy/bet` and `/api/games/fishjoy/win`
- **Greyhound Racing** (`/dog-racing`): Imported greyhound race HTML5 game with UGX currency, postMessage protocol; bet/win backend endpoints at `/api/games/dog-racing/bet` and `/api/games/dog-racing/win`
- **Horse4 Racing** (`/horse4`): Imported 8-horse racing HTML5 game (CMain/CHorse/CreateJS stack) with postMessage protocol; admin can configure all 8 horse odds (Engineer, Pin, Doughnut, Mayhem, Last Things, Chatterbox, Hypno, Croquette); custom odds passed in `init_balance` message; backend endpoints at `/api/games/horse4/bet` and `/api/games/horse4/win`; settings at `/api/games/horse4/settings`
- **Quick Horse Race** (`/horse-racing`): Custom 4-horse race JS game with UGX UI, 500 UGX bet steps, per-horse odds configurable by admin (stored in extraSettings JSON), admin-configurable max laps; backend settings at `/api/games/horse-js/settings`, bet/win at `/api/games/horse-js/bet` and `/api/games/horse-js/win`
- **House Edge**: Administrators can adjust win probabilities per game type and coinflip payout multiplier through the Game Control panel; horse-js has special panel for per-horse odds and max laps; roulette has per-type odds panel
- **Fullscreen**: Clicking any game card in the Lobby triggers fullscreen mode before navigating; all iframe game pages fill 100vh with collapsible top bar; floating Minimize button overlay in fullscreen
- **Balance Display**: All game pages show live balance in the top navigation bar in UGX

### Role-Based Access Control (4-tier hierarchy)
- **User**: Play games, redeem vouchers, view balance
- **Manager**: All user permissions + create players, manage their players' passwords, view performance reports for their players
- **Super Manager**: All manager permissions + create managers, view network-wide reports (their managers and players), filter by specific manager
- **Admin**: All permissions + modify game settings (admin-only), view full business reports with filter by any manager, manage all users, security questions for password recovery

### Reporting System
- **Unified Reports API** (`GET /api/reports`): Server-side time filtering with `from`/`to` ISO timestamps, `managerId` filter
- **Time Presets**: 15min, 30min, 1hour, 6hours, today, yesterday, 7days, 30days, 3months, 6months, 1year, custom date range
- **Metrics**: Profit/Loss, Amount in User Accounts, Total Deposited, Total Withdrawn, Amount Won, Amount Bet
- **Hierarchical Access**: Admin sees all; Super Manager sees their network only; Manager sees their players only
- **Manager Filter**: Admin can filter by any super_manager or manager; Super Manager can filter by their managers

### Withdrawal Request System
- **Manager Withdraw Codes**: 6-digit codes assigned to managers by their super managers; admin can also change codes
- **Player Withdrawal Flow**: Players enter amount + manager's 6-digit code → request routed to that specific manager
- **Manager View**: Managers see only withdrawal requests directed to them (matched by code) in their Withdrawals tab
- **Admin View**: Admin sees ALL pending withdrawal requests with manager code and manager name
- **Processing**: Both admin and the assigned manager can approve/reject requests; rejected requests refund balance
- **Code Uniqueness**: Each 6-digit code must be unique across all managers
- **API**: `POST /api/withdraw/request`, `GET /api/withdraw/requests`, `POST /api/withdraw/requests/:id/process`, `POST /api/withdraw-code/set`

### Profit Sharing System
- **Profit Calculator**: Available in Admin and Super Manager dashboards as a tab
- **Admin → Super Managers**: Admin sets profit share percentage for each super manager; super manager owes that % of their network's profit (bets - wins)
- **Super Manager → Managers**: Super Manager sets profit share percentage for each manager; manager owes that % of their players' profit
- **Time Filtering**: Supports time presets (today, 7 days, 30 days, etc.) for calculating profit within specific periods
- **API**: `POST /api/profit-share/set` (set percentage), `GET /api/profit-share/calculate` (calculate owed amounts with time filtering)

### Manager Financial Reports
- **Reports Tab**: Available in Manager Dashboard with time-based filtering
- **Metrics**: Profit/Loss, Amount in Accounts, Total Deposited, Total Withdrawn, Amount Won, Amount Bet
- **Bar Charts**: Daily activity trends using Recharts (deposits, bets, wins, withdrawals)
- **Time Presets**: Same as admin reports (15min to 1year + custom range)
- **API**: Uses existing `GET /api/reports` which supports manager role

### Player Signup Approval System
- **Registration Flow**: New players must enter a manager's 6-digit withdraw code during registration
- **Pending State**: New signups are created with `isApproved: false` and `createdBy` = manager ID
- **Login Blocked**: Unapproved users see "Account pending approval" and cannot log in
- **Manager Approval**: Managers see "Pending Signups" tab with approve/decline buttons (auto-refreshes every 10s)
- **Suspended Check**: Cannot register under a suspended manager
- **API**: `GET /api/manager/pending-signups`, `POST /api/admin/users/:id/approve`, `POST /api/admin/users/:id/reject`

### Manager Voucher Creation
- **Create Vouchers**: Managers can generate deposit vouchers from "Vouchers" tab
- **View Vouchers**: Managers see list of their created vouchers with code, amount, status, copy and print buttons
- **Print Voucher**: Individual print button per voucher opens a print-ready styled popup with code, amount, date; "Print All" button prints all unredeemed vouchers in a grid
- **Admin Vouchers**: Admin voucher table also has per-voucher print and "Print All Active" buttons
- **API**: `GET /api/manager/vouchers`, `POST /api/vouchers` (existing, already allows manager role)

### Broadcast System
- **Hierarchical Broadcasts**: Admin broadcasts to all roles + public; Super Managers to their managers; Managers to their players
- **Public Broadcasts**: Admin-only public broadcasts visible on login screen to all visitors (including non-logged-in users)
- **Customization**: Font family (sans-serif, serif, monospace, cursive, fantasy), text color (8 options), scroll speed (Slow/Medium-Slow/Normal/Fast/Very Fast)
- **Duration/Expiry**: Broadcasts can run forever or auto-expire after 15min to 30 days; expired broadcasts are filtered server-side
- **Scroll Speed**: Configurable per broadcast (5-60 seconds animation duration), applied via inline `animationDuration` style
- **Dismissable**: Logged-in users can dismiss broadcasts; dismissals tracked in `broadcast_dismissals` table
- **API**: `POST /api/broadcasts`, `GET /api/broadcasts`, `GET /api/broadcasts/public`, `GET /api/broadcasts/sent`, `POST /api/broadcasts/:id/dismiss`

### Chat System
- **Admin Chat**: Admin can message any non-admin user directly from the Chat tab
- **Super Manager Chat**: Super managers can message their managers from the Chat tab
- **Manager Chat**: Managers can reply to their super manager (creator) from the Chat tab
- **Role-Based Access**: Strict server-side enforcement - users can only chat with permitted contacts
- **Auto-Refresh**: Conversations refresh every 3 seconds, contact list every 5 seconds
- **Unread Badges**: Unread message counts shown on contact list
- **API**: `POST /api/messages`, `GET /api/messages/:userId`, `GET /api/messages/contacts`, `GET /api/messages/unread/count`

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