import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { type Broadcast } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Megaphone, Send, Loader2, Power, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BroadcastSenderProps {
  senderRole: "admin" | "super_manager" | "manager";
}

const FONT_OPTIONS = [
  { value: "sans-serif", label: "Sans Serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "cursive", label: "Cursive" },
  { value: "fantasy", label: "Fantasy" },
];

const COLOR_OPTIONS = [
  { value: "#FFD700", label: "Gold" },
  { value: "#FF4444", label: "Red" },
  { value: "#44FF44", label: "Green" },
  { value: "#4FC3F7", label: "Blue" },
  { value: "#FF69B4", label: "Pink" },
  { value: "#FF8C00", label: "Orange" },
  { value: "#E040FB", label: "Purple" },
  { value: "#FFFFFF", label: "White" },
];

export function BroadcastSender({ senderRole }: BroadcastSenderProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<string>("");
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [color, setColor] = useState("#FFD700");
  const [scrollSpeed, setScrollSpeed] = useState(15);
  const [durationHours, setDurationHours] = useState<string>("");

  const { data: sentBroadcasts, isLoading } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts/sent"],
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { targetRole: string; message: string; fontFamily: string; color: string; scrollSpeed: number; durationHours?: number }) => {
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

  const disableMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/broadcasts/${id}/disable`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts/public"] });
      toast({ title: "Broadcast Disabled", description: "It will no longer scroll for viewers." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/broadcasts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts/public"] });
      toast({ title: "Broadcast Deleted" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
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
    const parsed = durationHours ? parseFloat(durationHours) : undefined;
    sendMutation.mutate({ targetRole, message: message.trim(), fontFamily, color, scrollSpeed, durationHours: parsed && parsed > 0 ? parsed : undefined });
  };

  const targetOptions = senderRole === "admin"
    ? [
        { value: "public", label: "Public (All Visitors)" },
        { value: "super_manager", label: "Super Managers" },
        { value: "manager", label: "Managers" },
        { value: "user", label: "Players" },
        { value: "all", label: "Everyone (Logged In)" },
      ]
    : senderRole === "super_manager"
    ? [{ value: "manager", label: "My Managers" }]
    : [{ value: "user", label: "My Players" }];

  const getTargetLabel = (role: string) => {
    switch (role) {
      case "public": return "Public";
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
          <CardDescription>Send an announcement to your team. Recipients will see it as a scrolling banner.</CardDescription>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground font-bold">Font Style</label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger data-testid="select-broadcast-font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-font-${opt.value}`}>
                      <span style={{ fontFamily: opt.value }}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground font-bold">Text Color</label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger data-testid="select-broadcast-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-color-${opt.value}`}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: opt.value }} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground font-bold">Duration</label>
              <Select value={durationHours || "forever"} onValueChange={(v) => setDurationHours(v === "forever" ? "" : v)}>
                <SelectTrigger data-testid="select-broadcast-duration">
                  <SelectValue placeholder="How long to run..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forever">Forever (no expiry)</SelectItem>
                  <SelectItem value="0.25">15 Minutes</SelectItem>
                  <SelectItem value="0.5">30 Minutes</SelectItem>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="3">3 Hours</SelectItem>
                  <SelectItem value="6">6 Hours</SelectItem>
                  <SelectItem value="12">12 Hours</SelectItem>
                  <SelectItem value="24">1 Day</SelectItem>
                  <SelectItem value="72">3 Days</SelectItem>
                  <SelectItem value="168">1 Week</SelectItem>
                  <SelectItem value="720">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground font-bold">Scroll Speed</label>
              <Select value={String(scrollSpeed)} onValueChange={(v) => setScrollSpeed(parseInt(v))}>
                <SelectTrigger data-testid="select-broadcast-speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Slow</SelectItem>
                  <SelectItem value="20">Medium-Slow</SelectItem>
                  <SelectItem value="15">Normal</SelectItem>
                  <SelectItem value="10">Fast</SelectItem>
                  <SelectItem value="6">Very Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          {message.trim() && (
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground font-bold">Preview</label>
              <div className="overflow-hidden rounded-md border border-white/10 bg-black/80 py-2">
                <div className="marquee-scroll whitespace-nowrap" style={{ fontFamily, color, fontSize: "1rem", fontWeight: "bold", animationDuration: `${scrollSpeed}s` }}>
                  <span className="marquee-text">
                    {message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>
                </div>
              </div>
            </div>
          )}

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
                  <TableHead>Style</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentBroadcasts.map((b) => {
                  const isExpired = b.expiresAt ? new Date(b.expiresAt) <= new Date() : false;
                  return (
                  <TableRow key={b.id} className="border-white/10" data-testid={`row-broadcast-${b.id}`}>
                    <TableCell className="max-w-xs truncate">{b.message}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTargetLabel(b.targetRole)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: b.color || "#FFD700" }} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.scrollSpeed === 30 ? "Slow" : b.scrollSpeed === 20 ? "Med-Slow" : b.scrollSpeed === 10 ? "Fast" : b.scrollSpeed === 6 ? "V.Fast" : "Normal"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isExpired ? (
                        <Badge variant="outline" className="text-red-400 border-red-500/40">Disabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-400 border-green-500/40">Live</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!isExpired && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => disableMutation.mutate(b.id)}
                            disabled={disableMutation.isPending}
                            className="h-7 px-2 text-xs"
                            data-testid={`button-disable-broadcast-${b.id}`}
                          >
                            <Power className="w-3 h-3 mr-1" /> Disable
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Permanently delete this broadcast?")) deleteMutation.mutate(b.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          data-testid={`button-delete-broadcast-${b.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
