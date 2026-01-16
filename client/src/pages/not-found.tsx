import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-background">
      <div className="bg-red-500/10 p-6 rounded-full mb-6">
        <AlertCircle className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-display font-bold mb-2 text-white">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" variant="secondary">
          Return to Lobby
        </Button>
      </Link>
    </div>
  );
}
