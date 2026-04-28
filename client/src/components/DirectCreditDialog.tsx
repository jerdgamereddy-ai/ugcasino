import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Banknote, Loader2 } from "lucide-react";

interface DirectCreditDialogProps {
  userId: number;
  username: string;
  currentBalance: number;
  invalidateKeys?: (string | string[])[];
}

export function DirectCreditDialog({ userId, username, currentBalance, invalidateKeys = [] }: DirectCreditDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = parseInt(amount);
      if (!amt || isNaN(amt)) throw new Error("Enter a valid amount");
      const res = await apiRequest("POST", `/api/admin/users/${userId}/credit`, {
        amount: amt,
        description: note || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Balance updated", description: `${username} new balance: UGX ${data.balance?.toLocaleString?.() ?? "—"}`, className: "bg-green-600 text-white" });
      setAmount("");
      setNote("");
      setOpen(false);
      invalidateKeys.forEach(k => queryClient.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Failed to credit", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`button-credit-${userId}`}>
          <Banknote className="w-3 h-3 mr-1" /> Credit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/95 border-[#D4AF37]/30 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#D4AF37]">Credit Balance — {username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="text-xs text-muted-foreground">
            Current balance: <span className="text-primary font-bold font-mono">UGX {currentBalance.toLocaleString()}</span>
          </div>
          <div>
            <Label className="text-xs">Amount (UGX) — use negative to debit</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000 or -2000"
              className="bg-white/5 border-white/10 mt-1"
              data-testid="input-credit-amount"
            />
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. promo bonus"
              className="bg-white/5 border-white/10 mt-1"
              data-testid="input-credit-note"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} data-testid="button-credit-cancel">Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !amount}
            data-testid="button-credit-confirm"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
