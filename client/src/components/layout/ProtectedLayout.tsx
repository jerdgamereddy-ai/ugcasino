import { useUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Navbar } from "./Navbar";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Need to use useEffect or setTimeout to avoid updates during render, 
    // or just return null and let the redirect happen
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
