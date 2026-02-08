import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Coins, Loader2, Ticket } from "lucide-react";
import { insertUserSchema } from "@shared/schema";

export default function Login() {
  const [_, setLocation] = useLocation();
  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);

  const onVoucherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;
    setIsVoucherLoading(true);
    try {
      const res = await fetch("/api/login/voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast({ title: "Welcome!", description: data.message, className: "bg-primary text-black" });
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsVoucherLoading(false);
    }
  };

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "", role: "user" as const },
  });

  const onLogin = (data: any) => {
    login(data, {
      onSuccess: () => {
        toast({ title: "Welcome back!", className: "bg-primary text-black" });
        setLocation("/");
      },
      onError: (err) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  const onRegister = (data: any) => {
    register(data, {
      onSuccess: () => {
        toast({ title: "Account created!", description: "Please log in.", className: "bg-green-600 text-white" });
        // Switch to login tab ideally, but simplistic here
      },
      onError: (err) => {
        toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />

      <Card className="w-full max-w-md relative z-10 border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-xl w-fit shadow-lg shadow-yellow-500/20">
            <Coins className="h-8 w-8 text-black" />
          </div>
          <div>
            <CardTitle className="text-3xl font-display text-primary">Royal Fortune</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Enter the world of luxury gaming</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="voucher">Voucher</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} className="bg-white/5 border-white/10 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10 focus:border-primary/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" variant="luxury" disabled={isLoginPending}>
                    {isLoginPending ? <Loader2 className="animate-spin" /> : "Access Account"}
                  </Button>
                  <div className="text-center pt-2">
                    <a href="/forgot-password" className="text-xs text-primary underline" data-testid="link-forgot-password">Forgot Admin Password?</a>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose username" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create password" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" variant="outline" disabled={isRegisterPending}>
                    {isRegisterPending ? <Loader2 className="animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="voucher">
              <form onSubmit={onVoucherLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voucher Code</label>
                  <Input 
                    placeholder="Enter your luxury voucher code" 
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="bg-white/5 border-white/10 focus:border-primary/50 text-center font-mono text-lg tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full" variant="luxury" disabled={isVoucherLoading}>
                  {isVoucherLoading ? <Loader2 className="animate-spin" /> : <><Ticket className="w-4 h-4 mr-2" /> Play Now</>}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-tighter">
                  Instant access. No account required.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
