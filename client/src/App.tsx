import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import AdminDashboard from "@/pages/AdminDashboard";
import GameSlots from "@/pages/GameSlots";
import GameRoulette from "@/pages/GameRoulette";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Lobby} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/slots" component={GameSlots} />
      <Route path="/roulette" component={GameRoulette} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
