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
- **Per-User Game Enable/Disable** (`user_game_disables` table + `gateGame` middleware): Admin-only "Game Access Control" tab in `AdminDashboard` lets the admin toggle any individual game on/off for any user. The toggle writes a row keyed by `(user_id, game_type)`. Server-side enforcement walks the `createdBy` chain on every game request via `storage.getEffectiveDisabledGames(userId)`, so disabling a game for a super manager OR manager automatically blocks every player below them — admins can yank a buggy game out of circulation for an entire branch with one click. Every `/api/games/<id>/(bet|win|play|roll|spin|cashout|shoot)` endpoint now starts with `if (await gateGame(req, res, "<id>")) return;` returning 403 + `{gameDisabled:true}`. The lobby (`Lobby.tsx`) reads `/api/user/disabled-games` and grays out + locks (with a "Out of order — Disabled by admin" overlay) any tile whose `id` is in the list; clicking blocked tiles shows a toast instead of navigating. The `id` of the Quick-Horse tile was renamed `horse-racing → horse-js` so it lines up with the server `gameType`.
- **Role-Based Access Control**:
    - **User**: Play games, redeem vouchers, view balance.
    - **Manager**: User permissions + create players, manage player passwords, view player reports.
    - **Super Manager**: Manager permissions + create managers, view network-wide reports, filter by manager.
    - **Admin**: All permissions + modify game settings, view full business reports, manage all users, security questions for password recovery.
- **Race Game House-Edge Safety** (Greyhound, Horse4, Horse-JS): each `/bet` endpoint pre-checks via `computeForceLose(gameType, userId, bet*maxOdds)` (combines `lockedLossMap` + RTP-cap probe using bet-amount × max odds), mints a `roundId` into `pendingRoundsMap` (`{userId, gameType, betAmount, maxOdds, createdAt}`, 10-min TTL), and returns `{balance, forceLose, roundId}`. Wrappers store `roundId` in a ref and forward it to `/win`; `/win` rejects unknown/foreign rounds with 400 ("Invalid or expired round"), caps `winAmount` to `betAmount × maxOdds`, then runs through `applyHouseEdgeForWin`. This blocks settling a win without a bet, double-settling, or claiming a payout larger than the largest credible odds. Wrappers also expose a manual **Refresh Balance** button (`RefreshCw` icon) that re-fetches `/api/user` and posts `sync_balance` to the iframe so any pending credit reflects immediately without leaving the game. When `/win` returns `blocked:true`, the wrapper auto-syncs and shows a destructive toast ("Round result voided"). Wrappers also postMessage `set_win_chance` (dog/horse4) or `set_force_lose` (horse-js) so subsequent rounds can avoid showing a phantom win in the first place.
- **Aviator RTP cap**: `/cashout` now runs the intended payout through `applyHouseEdgeForWin("aviator", ...)` so that even if the random crash-point distribution is generous, a cashout that would push `totalPaid/totalBet` past the configured RTP is zeroed and reported as `blocked:true` (in addition to the existing `lockedLossMap`-driven instant-crash on flagged rounds).
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

### Customizable Site Background (Admin → "Appearance" tab)
- New `site_settings` singleton table (id=1, CHECK enforced) holds `bgType` (`default`|`color`|`gradient`|`image`|`animation`) plus the corresponding payload fields. Public `GET /api/site-settings` exposes it (needed even pre-login for the login page) and admin-only `POST /api/admin/site-settings` mutates it.
- New `background_images` table mirrors the `audio_tracks` pattern: file is written to `uploads/backgrounds/` AND stored as `bytea` so wallpapers survive Replit deploys. `/uploads/backgrounds/:filename` serves disk first, then falls back to the DB blob. Admin endpoints: `GET/POST/DELETE /api/admin/backgrounds`.
- Client: `client/src/components/SiteBackground.tsx` is mounted once in `App.tsx`; it polls site-settings and applies the result directly to `document.body` (background-color OR background-image OR adds one of the `site-bg-*` animation classes). The main app shell uses `bg-background/80` so a body wallpaper bleeds through.
- Animated presets (pure CSS keyframes in `index.css`): `site-bg-aurora`, `site-bg-casino-neon`, `site-bg-gold-rush`, `site-bg-starfield`. The Appearance tab also offers 6 gradient presets, a hex color picker, and JPG/PNG/WEBP/GIF/AVIF uploads (15 MB cap).

### Casino Visual Polish
- Game tiles in `Lobby.tsx` now carry a `casino-tile` class (slow gold/rose/violet box-shadow pulse) plus a `casino-neon-ring` hover overlay that paints a rotating multicolor conic-gradient marquee around the tile (gold → pink → purple → cyan → emerald). Both keyframes live in `client/src/index.css`.
- Disabled tiles get a grayscale + brightness-75 treatment plus a `Lock` icon "Out of order" badge so blocked games are visually obvious at a glance.

### Background Music Player (`GlobalMusicPlayer`)
- Audio binaries are stored as `bytea` in `audio_tracks.data` so the music survives Replit deploys (the `/uploads` folder is rebuilt on each deploy and would otherwise lose all tracks).
- `/uploads/audio/:filename` serves the file from disk first (fast path) and falls back to the DB blob otherwise. Upload writes to both disk and DB.
- Player has a 3-strike consecutive-error cap on the `error` event so a missing/404 audio file no longer ping-pongs the play/pause UI in an infinite retry loop. The `playing` event resets the counter on successful playback.
- Prev/Next buttons are sequential (`(idx ± 1) mod len`), not random.

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