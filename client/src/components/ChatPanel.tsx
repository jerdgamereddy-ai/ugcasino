import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, ArrowLeft } from "lucide-react";
import type { User, Message } from "@shared/schema";

interface ChatPanelProps {
  currentUserId: number;
  chatTargets: User[];
  title?: string;
}

export function ChatPanel({ currentUserId, chatTargets, title = "Chat" }: ChatPanelProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: contacts } = useQuery<{ userId: number; lastMessage: string; lastMessageAt: string | null; unreadCount: number }[]>({
    queryKey: ["/api/messages/contacts"],
    refetchInterval: 5000,
  });

  const { data: conversation, isLoading: conversationLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { receiverId: number; content: string }) => {
      const res = await fetch("/api/messages", {
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
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/contacts"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedUserId) return;
    sendMutation.mutate({ receiverId: selectedUserId, content: messageText.trim() });
  };

  const getUnreadForUser = (userId: number) => {
    const contact = contacts?.find(c => c.userId === userId);
    return contact?.unreadCount || 0;
  };

  const selectedUser = chatTargets.find(u => u.id === selectedUserId);

  if (!selectedUserId) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chatTargets.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8" data-testid="text-no-chat-targets">No users available to chat with.</p>
          ) : (
            <div className="space-y-1">
              {chatTargets.map((target) => {
                const unread = getUnreadForUser(target.id);
                const contact = contacts?.find(c => c.userId === target.id);
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedUserId(target.id)}
                    className="w-full flex items-center justify-between p-3 rounded-md hover-elevate text-left transition-colors"
                    data-testid={`button-chat-user-${target.id}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{target.username}</span>
                      {contact?.lastMessage && (
                        <span className="text-xs text-muted-foreground truncate">{contact.lastMessage}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">{target.role}</Badge>
                      {unread > 0 && (
                        <Badge variant="destructive" className="text-[10px] min-w-[20px] justify-center" data-testid={`badge-unread-${target.id}`}>
                          {unread}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card flex flex-col" style={{ height: "500px" }}>
      <CardHeader className="flex flex-row items-center gap-2 pb-2 flex-shrink-0">
        <Button size="icon" variant="ghost" onClick={() => setSelectedUserId(null)} data-testid="button-chat-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="w-4 h-4" /> {selectedUser?.username}
          <Badge variant="outline" className="text-[10px]">{selectedUser?.role}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
          {conversationLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : conversation && conversation.length > 0 ? (
            conversation.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-md text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <span className="text-[10px] opacity-70 block mt-1">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8" data-testid="text-no-messages">No messages yet. Start the conversation!</p>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border-white/10"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
