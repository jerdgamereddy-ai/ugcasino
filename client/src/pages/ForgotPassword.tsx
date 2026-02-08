import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_SECURITY_QUESTIONS } from "@shared/schema";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<"username" | "questions" | "reset">("username");
  const [username, setUsername] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [verifiedUserId, setVerifiedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyAnswers = async () => {
    const submittedAnswers = ADMIN_SECURITY_QUESTIONS
      .filter(q => answers[q]?.trim())
      .map(q => ({ question: q, answer: answers[q] }));

    if (submittedAnswers.length < 2) {
      toast({ title: "Error", description: "Please answer at least 2 security questions", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/verify-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, answers: submittedAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setVerifiedUserId(data.userId);
      setStep("reset");
      toast({ title: "Verified!", description: "You can now reset your password.", className: "bg-green-600 text-white" });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 10) {
      toast({ title: "Error", description: "Password must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      toast({ title: "Error", description: "Password must contain uppercase, digits, and symbols", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: verifiedUserId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast({ title: "Password Reset!", description: "You can now log in with your new password.", className: "bg-green-600 text-white" });
      setStep("username");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-xl w-fit shadow-lg shadow-yellow-500/20">
            <KeyRound className="h-8 w-8 text-black" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display text-primary">Password Recovery</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {step === "username" && "Enter your admin username to begin"}
              {step === "questions" && "Answer at least 2 security questions"}
              {step === "reset" && "Set your new password"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "username" && (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground font-bold">Admin Username</label>
                <Input
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/5 border-white/10"
                  data-testid="input-forgot-username"
                />
              </div>
              <Button className="w-full" onClick={() => {
                if (!username.trim()) {
                  toast({ title: "Error", description: "Please enter username", variant: "destructive" });
                  return;
                }
                setStep("questions");
              }} data-testid="button-next">
                Next
              </Button>
            </>
          )}

          {step === "questions" && (
            <>
              {ADMIN_SECURITY_QUESTIONS.map((q) => (
                <div key={q} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{q}</label>
                  <Input
                    placeholder="Your answer (optional - answer at least 2)"
                    value={answers[q] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                    className="bg-white/5 border-white/10"
                    data-testid={`input-answer-${q.substring(0, 10).replace(/\s/g, '-')}`}
                  />
                </div>
              ))}
              <Button className="w-full" onClick={handleVerifyAnswers} disabled={isLoading} data-testid="button-verify">
                {isLoading ? <Loader2 className="animate-spin" /> : "Verify Answers"}
              </Button>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground font-bold">New Password</label>
                <Input
                  type="password"
                  placeholder="Min 10 chars: uppercase, digits, symbols"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border-white/10"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground font-bold">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border-white/10"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button className="w-full" onClick={handleResetPassword} disabled={isLoading} data-testid="button-reset-password">
                {isLoading ? <Loader2 className="animate-spin" /> : "Reset Password"}
              </Button>
            </>
          )}

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-primary underline" data-testid="link-back-login">
              <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
