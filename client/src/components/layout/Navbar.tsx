import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, User as UserIcon, Shield, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Navbar() {
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const NavLink = ({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon?: any }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`} onClick={() => setIsOpen(false)}>
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-700 p-2 rounded-lg group-hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-300">
              <Coins className="h-6 w-6 text-black" />
            </div>
            <span className="font-display font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200">
              ROYAL FORTUNE
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {user && (
              <>
                <NavLink href="/" icon={UserIcon}>Lobby</NavLink>
                <NavLink href="/slots" icon={Coins}>Slots</NavLink>
                <NavLink href="/roulette" icon={Coins}>Roulette</NavLink>
                {isAdminOrManager && (
                  <>
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <NavLink href="/admin" icon={Shield}>Admin</NavLink>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Balance</span>
                <span className="font-mono text-primary font-bold text-lg">
                  UGX {user.balance.toLocaleString()}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full border-primary/30">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-primary">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-card border-l border-white/10 w-[80%] max-w-[300px]">
                  <div className="flex flex-col gap-4 mt-8">
                     <div className="p-4 bg-white/5 rounded-lg border border-white/5 mb-4">
                        <span className="text-xs text-muted-foreground uppercase">Balance</span>
                        <div className="font-mono text-primary font-bold text-xl mt-1">
                          UGX {user.balance.toLocaleString()}
                        </div>
                     </div>
                     
                    <NavLink href="/" icon={UserIcon}>Lobby</NavLink>
                    <NavLink href="/slots" icon={Coins}>Slots</NavLink>
                    <NavLink href="/roulette" icon={Coins}>Roulette</NavLink>
                    {isAdminOrManager && (
                       <NavLink href="/admin" icon={Shield}>Admin Dashboard</NavLink>
                    )}
                    <Button variant="destructive" className="mt-8 w-full justify-start" onClick={() => logout()}>
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Link href="/login">
              <Button variant="luxury" size="sm">Login / Join</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
