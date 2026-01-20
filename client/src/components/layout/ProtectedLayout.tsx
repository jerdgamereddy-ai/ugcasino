import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Gamepad2, History, ShieldCheck, LogOut, Coins, Key, User as UserIcon, Loader2 } from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error("Failed to update password");
      toast({ title: "Success", description: "Password updated successfully", className: "bg-green-600 text-white" });
      setNewPassword("");
      setIsPasswordDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const navItems = [
    { label: "Lobby", href: "/", icon: Gamepad2 },
    { label: "Transactions", href: "/transactions", icon: History },
  ];

  if (user?.role === "admin" || user?.role === "manager") {
    navItems.push({ label: "Admin Panel", href: "/admin", icon: ShieldCheck });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0a0a0a] text-white">
        <Sidebar className="border-r border-white/5 bg-[#0f0f0f]">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#F1C40F] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <ShieldCheck className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold tracking-tight text-white">UG CASINO</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">Luxury Play</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href}
                    className={`h-12 rounded-xl transition-all duration-300 ${
                      location === item.href 
                        ? "bg-gradient-to-r from-[#D4AF37]/20 to-transparent text-[#D4AF37] border-l-2 border-[#D4AF37]" 
                        : "hover:bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full px-4">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-white/5">
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{user?.username}</p>
                    <p className="text-[10px] uppercase text-[#D4AF37] font-bold">{user?.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Coins className="w-4 h-4" />
                  <span className="text-lg font-display font-bold">
                    {user?.balance.toLocaleString()} <span className="text-[10px]">UGX</span>
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-xs h-9">
                      <Key className="w-3 h-3 mr-1" /> Pwd
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">New Password</label>
                        <Input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-black/40 border-white/10"
                          placeholder="Min 6 characters"
                        />
                      </div>
                      <Button onClick={handlePasswordChange} className="w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-bold">
                        Update Password
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()}
                  className="w-full hover:bg-destructive/10 hover:text-destructive text-xs h-9"
                >
                  <LogOut className="w-3 h-3 mr-1" /> Exit
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-[#0a0a0a] relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05),transparent_50%)]" />
          <div className="p-8 relative z-10">
            <div className="max-w-7xl mx-auto">
              <div className="md:hidden mb-6">
                <SidebarTrigger className="text-[#D4AF37]" />
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
