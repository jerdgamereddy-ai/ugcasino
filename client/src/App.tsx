import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import AdminDashboard from "@/pages/AdminDashboard";
import SuperManagerDashboard from "@/pages/SuperManagerDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import GameSlots from "@/pages/GameSlots";
import GameRoulette from "@/pages/GameRoulette";
import GameDice from "@/pages/GameDice";
import GameHiLo from "@/pages/GameHiLo";
import CoinFlip from "@/pages/CoinFlip";
import GamePlinko from "@/pages/GamePlinko";
import GameWheel from "@/pages/GameWheel";
import GameFishHunt from "@/pages/GameFishHunt";
import GameClassicSlots from "@/pages/GameClassicSlots";
import Reports from "@/pages/Reports";
import GameControl from "@/pages/GameControl";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/" component={Lobby} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/super-manager" component={SuperManagerDashboard} />
      <Route path="/sm-reports" component={Reports} />
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/slots" component={GameSlots} />
      <Route path="/roulette" component={GameRoulette} />
      <Route path="/dice" component={GameDice} />
      <Route path="/hilo" component={GameHiLo} />
      <Route path="/coinflip" component={CoinFlip} />
      <Route path="/plinko" component={GamePlinko} />
      <Route path="/wheel" component={GameWheel} />
      <Route path="/fishhunt" component={GameFishHunt} />
      <Route path="/classic-slots" component={GameClassicSlots} />
      <Route path="/reports" component={Reports} />
      <Route path="/game-control" component={GameControl} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <span className="font-bold text-primary">UG CASINO</span>
                </div>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-4">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
