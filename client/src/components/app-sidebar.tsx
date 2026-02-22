import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from "@/components/ui/sidebar"
import { Home, Dice5, Target, Dices, Settings, FileText, Users, LogOut, Club, Shield, LayoutDashboard, Coins, Zap, RotateCcw, Wallet, BarChart3, UserCog } from "lucide-react"
import { Link, useLocation } from "wouter"
import { useQuery, useMutation } from "@tanstack/react-query"
import { User } from "@shared/schema"
import { api } from "@shared/routes"
import { queryClient } from "@/lib/queryClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: [api.auth.me.path] });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      window.location.href = '/login';
    }
  });

  const playerItems = [
    { title: "Lobby", url: "/", icon: Home },
    { title: "Slots", url: "/slots", icon: Dice5 },
    { title: "Roulette", url: "/roulette", icon: Target },
    { title: "Dice", url: "/dice", icon: Dices },
    { title: "Hi-Lo", url: "/hilo", icon: Club },
    { title: "Coin Flip", url: "/coinflip", icon: Coins },
    { title: "Plinko", url: "/plinko", icon: Zap },
    { title: "Wheel", url: "/wheel", icon: RotateCcw },
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'super_manager': return 'Super Manager';
      case 'manager': return 'Manager';
      default: return 'Player';
    }
  };

  const getManagementItems = () => {
    if (!user) return [];
    const items = [];

    if (user.role === 'admin') {
      items.push({ title: "Admin Panel", url: "/admin", icon: Shield });
      items.push({ title: "Game Control", url: "/game-control", icon: Settings });
      items.push({ title: "Business Reports", url: "/reports", icon: BarChart3 });
    }

    if (user.role === 'super_manager') {
      items.push({ title: "Management Panel", url: "/super-manager", icon: UserCog });
      items.push({ title: "Reports", url: "/reports", icon: BarChart3 });
    }

    if (user.role === 'manager') {
      items.push({ title: "Manager Panel", url: "/manager", icon: Users });
      items.push({ title: "Reports", url: "/reports", icon: BarChart3 });
    }

    return items;
  };

  const managementItems = getManagementItems();

  return (
    <Sidebar className="border-r border-white/5 bg-black/95">
      <SidebarContent className="p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
            <div className="bg-primary p-2 rounded-lg">
                <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
                <h1 className="font-display font-bold text-lg text-primary tracking-tight">UG CASINO</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Luxury Play</p>
            </div>
        </div>

        {(user?.role === 'user' || !user) && (
          <SidebarGroup>
            <SidebarMenu>
              {playerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} className="transition-colors">
                    <Link href={item.url}>
                      <item.icon className={location === item.url ? "text-primary" : "text-muted-foreground"} />
                      <span className={location === item.url ? "text-primary font-medium" : "text-muted-foreground"}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {managementItems.length > 0 && (
          <SidebarGroup className={user?.role === 'user' ? "mt-4 pt-4 border-t border-white/5" : ""}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url} className="transition-colors">
                      <Link href={item.url}>
                        <item.icon className={location === item.url ? "text-primary" : "text-muted-foreground"} />
                        <span className={location === item.url ? "text-primary font-medium" : "text-muted-foreground"}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(user?.role === 'admin' || user?.role === 'super_manager' || user?.role === 'manager') && (
          <SidebarGroup className="mt-4 pt-4 border-t border-white/5">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Games</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {playerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url} className="transition-colors">
                      <Link href={item.url}>
                        <item.icon className={location === item.url ? "text-primary" : "text-muted-foreground"} />
                        <span className={location === item.url ? "text-primary font-medium" : "text-muted-foreground"}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5">
         {user && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8 border border-primary/20">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.username}</span>
                        <span className="text-[10px] text-primary uppercase font-bold tracking-tighter">{getRoleLabel(user.role)}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between mb-3 bg-black/40 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-primary/20 rounded-full p-1">
                            <Wallet className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-xs font-bold text-primary">{user.balance.toLocaleString()} UGX</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] bg-transparent border-white/10" asChild>
                        <Link href="/profile">
                            <Settings className="w-3 h-3 mr-1" /> Pwd
                        </Link>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 h-8 text-[10px]"
                        onClick={() => logoutMutation.mutate()}
                        data-testid="button-logout"
                    >
                        <LogOut className="w-3 h-3 mr-1" /> Exit
                    </Button>
                </div>
            </div>
         )}
      </SidebarFooter>
    </Sidebar>
  )
}
