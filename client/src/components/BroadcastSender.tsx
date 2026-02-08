import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type Broadcast } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BroadcastSenderProps {
  senderRole: "admin" | "super_manager" | "manager";
}

export function BroadcastSender({ senderRole }: BroadcastSenderProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<string>("");

  const { data: sentBroadcasts, isLoading } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts/sent"],
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { targetRole: string; message: string }) => {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts/sent"] });
      setMessage("");
      setTargetRole("");
      toast({ title: "Broadcast Sent", description: "Your message has been sent to the target group." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!targetRole) {
      toast({ title: "Select Target", description: "Choose who should receive this broadcast.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Empty Message", description: "Please type a message to broadcast.", variant: "destructive" });
      return;
    }
    sendMutation.mutate({ targetRole, message: message.trim() });
  };

  const targetOptions = senderRole === "admin"
    ? [
        { value: "super_manager", label: "Super Managers" },
        { value: "manager", label: "Managers" },
        { value: "user", label: "Players" },
        { value: "all", label: "Everyone" },
      ]
    : senderRole === "super_manager"
    ? [{ value: "manager", label: "My Managers" }]
    : [{ value: "user", label: "My Players" }];

  const getTargetLabel = (role: string) => {
    switch (role) {
      case "super_manager": return "Super Managers";
      case "manager": return "Managers";
      case "user": return "Players";
      case "all": return "Everyone";
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Send Broadcast</CardTitle>
          <CardDescription>Send an announcement to your team. Recipients will see it as a banner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold">Target Audience</label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger data-testid="select-broadcast-target">
                <SelectValue placeholder="Select who to broadcast to..." />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-target-${opt.value}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground font-bold">Message</label>
            <Textarea
              placeholder="Type your broadcast message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/5 border-white/10 min-h-[100px]"
              maxLength={500}
              data-testid="textarea-broadcast-message"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !message.trim() || !targetRole}
            className="w-full"
            data-testid="button-send-broadcast"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Broadcast
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5" /> Sent Broadcasts</CardTitle>
          <CardDescription>Your recent broadcast history.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : !sentBroadcasts || sentBroadcasts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-broadcasts">No broadcasts sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>Message</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentBroadcasts.map((b) => (
                  <TableRow key={b.id} className="border-white/10" data-testid={`row-broadcast-${b.id}`}>
                    <TableCell className="max-w-xs truncate">{b.message}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTargetLabel(b.targetRole)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
