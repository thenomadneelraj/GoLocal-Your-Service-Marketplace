import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  CheckCheck,
  Circle,
  MessageSquare,
  ShieldCheck,
  Zap,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  initiateSocketConnection,
  subscribeToNewMessages,
  subscribeToReadReceipts,
  disconnectSocket,
  getSocket,
} from "@/lib/socket";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";
import { useSearchParams } from "react-router-dom";

const getInitials = (name = "") =>
  String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 2) return "Now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const formatMessageTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ClientChat() {
  const { user } = useAuth();
  const accountAccess = getAccountAccessState(user);
  const canUseChat = accountAccess.canCreateBookings;
  const [searchParams] = useSearchParams();
  const contactParam =
    searchParams.get("contact") || searchParams.get("provider");

  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeUserId, setActiveUserId] = useState(contactParam || null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [participant, setParticipant] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load conversations list
  const fetchConversations = useCallback(async () => {
    if (!canUseChat) {
      setConversations([]);
      setLoadingConvos(false);
      return;
    }

    try {
      setLoadingConvos(true);
      const res = await api.get("/api/messages");
      setConversations(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConvos(false);
    }
  }, [canUseChat]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for active conversation
  const fetchMessages = useCallback(async (otherUserId) => {
    if (!otherUserId || !canUseChat) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/api/messages/${otherUserId}`);
      const data = res.data?.data || {};
      setMessages(data.messages || []);
      setParticipant(data.participant || null);
      setConversationId(data.conversationId || null);

      // Mark as read immediately
      api.put(`/api/messages/${otherUserId}/read`).catch(() => {});

      // Join the conversation room in socket
      const socket = getSocket();
      if (socket && data.conversationId) {
        socket.emit("join:conversation", data.conversationId);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [canUseChat]);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages(activeUserId);
    }
  }, [activeUserId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket: connect + subscribe
  useEffect(() => {
    if (!user?.id) return;
    initiateSocketConnection(user.id, user.role);

    const unsubMsg = subscribeToNewMessages((err, payload) => {
      if (err || !payload?.message) return;

      const msg = payload.message;
      const senderId = String(payload.conversationUserId || msg.senderId || "");

      // Add to messages if this is the active conversation
      const isActiveConvo =
        activeUserId &&
        (String(msg.senderId) === String(activeUserId) ||
          String(msg.receiverId) === String(activeUserId));

      if (isActiveConvo) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m.id) === String(msg.id));
          if (exists) return prev;
          return [...prev, msg];
        });
        // Mark as read
        api.put(`/api/messages/${activeUserId}/read`).catch(() => {});
      }

      // Refresh conversation list to update last message + unread counts
      fetchConversations();
    });

    const unsubRead = subscribeToReadReceipts((err, payload) => {
      if (err) return;
      if (payload?.conversationUserId) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.senderId) === String(user?.id) ? { ...m, read: true } : m,
          ),
        );
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
      disconnectSocket();
    };
  }, [user?.id, activeUserId, fetchConversations]);

  const handleSelectConversation = (convo) => {
    const otherUserId = convo.participant?.userId;
    if (!otherUserId) return;
    setActiveUserId(otherUserId);
    setParticipant(convo.participant);
    // Clear unread count optimistically
    setConversations((prev) =>
      prev.map((c) =>
        c.participant?.userId === otherUserId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  };

  const handleSend = async () => {
    const content = msgInput.trim();
    if (!content || !activeUserId || sending) return;
    if (!canUseChat) {
      toast.error(accountAccess.description || "Messaging is available after admin approval.");
      return;
    }

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      content,
      senderId: user?.id,
      receiverId: activeUserId,
      direction: "outgoing",
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMsgInput("");

    try {
      setSending(true);
      const res = await api.post("/messages", {
        receiverId: activeUserId,
        content,
      });
      const savedMsg = res.data?.data?.message;
      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...savedMsg, direction: "outgoing" }
              : m,
          ),
        );
      }
      fetchConversations();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not send your message.",
      );
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  if (!canUseChat) {
    return (
      <div className="rounded-[2rem] border border-border/60 bg-card/50 p-8">
        <div className="mx-auto max-w-xl text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Messaging unavailable</h2>
          <p className="mt-3 text-muted-foreground">
            {accountAccess.description ||
              "Messaging with providers is available after admin approval."}
          </p>
        </div>
      </div>
    );
  }

  const filteredConvos = conversations.filter((c) => {
    if (!searchQuery) return true;
    return c.participant?.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  return (
    <div className="h-[calc(100vh-160px)] flex bg-card/40 border border-border/60 rounded-[3rem] overflow-hidden backdrop-blur-xl">
      {/* Sidebar */}
      <aside className="w-96 border-r border-border/60 flex flex-col bg-muted/10">
        <div className="p-8 border-b border-border/60">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Messages
              </h2>
              {totalUnread > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalUnread} unread
                </p>
              )}
            </div>
            <button className="p-2 hover:bg-muted/50 rounded-xl text-primary transition-all shadow-sm">
              <Zap size={18} />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">Book a service to start chatting.</p>
            </div>
          ) : (
            filteredConvos.map((convo) => {
              const p = convo.participant || {};
              const isActive = activeUserId === p.userId;
              return (
                <button
                  key={p.userId || convo.conversationId}
                  onClick={() => handleSelectConversation(convo)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[2rem] transition-all group relative ${
                    isActive
                      ? "bg-primary text-white shadow-xl shadow-primary/20"
                      : "hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border-2 overflow-hidden ${
                        isActive
                          ? "bg-white/20 border-white/30"
                          : "bg-primary/10 border-primary/10 text-primary"
                      }`}
                    >
                      {p.profilePhoto ? (
                        <img
                          src={p.profilePhoto}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(p.name)
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3
                        className={`font-bold text-sm truncate ${
                          isActive ? "text-white" : "text-foreground"
                        }`}
                      >
                        {p.name || "User"}
                      </h3>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-widest ${
                          isActive ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(convo.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate italic ${
                        isActive ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      {convo.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>

                  {convo.unreadCount > 0 && !isActive && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shadow-lg">
                      {convo.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-card/20 relative overflow-hidden">
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare size={64} className="mb-4 opacity-20" />
            <h3 className="text-xl font-semibold text-foreground">
              Select a conversation
            </h3>
            <p className="text-sm mt-2 max-w-xs">
              Choose a provider from the left to start messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-8 border-b border-border/60 flex items-center justify-between bg-card/60 backdrop-blur-md relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm overflow-hidden">
                  {participant?.profilePhoto ? (
                    <img
                      src={participant.profilePhoto}
                      alt={participant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(participant?.name)
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {participant?.name || "Provider"}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground">
                    <span className="capitalize">
                      {participant?.serviceType || participant?.role || ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-border/60"
                >
                  <MoreVertical size={18} />
                </Button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe =
                    msg.direction === "outgoing" ||
                    String(msg.senderId) === String(user?.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-3 ${
                        isMe ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                          isMe
                            ? "bg-primary/20 border-primary/30 text-primary"
                            : "bg-muted/60 border-border/40 text-muted-foreground"
                        }`}
                      >
                        {isMe
                          ? getInitials(user?.name)
                          : getInitials(participant?.name)}
                      </div>
                      <div
                        className={`max-w-md group relative ${
                          isMe ? "items-end text-right" : "items-start"
                        }`}
                      >
                        <div
                          className={`p-5 rounded-[1.8rem] text-sm leading-relaxed shadow-sm transition-all hover:shadow-md ${
                            isMe
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-muted/80 backdrop-blur-md text-foreground rounded-bl-none border border-border/40"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 mt-2 px-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMe && msg.read && (
                            <CheckCheck size={14} className="text-primary/70" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-8 bg-card/80 backdrop-blur-lg border-t border-border/60 relative z-10">
              <div className="flex items-center gap-3 bg-muted/40 border border-border/60 p-2 pl-6 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-background/80 transition-all overflow-hidden">
                <button className="text-muted-foreground hover:text-primary transition-all">
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60 h-12 italic leading-relaxed"
                />
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all shrink-0"
                  onClick={handleSend}
                  disabled={!msgInput.trim() || sending}
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
