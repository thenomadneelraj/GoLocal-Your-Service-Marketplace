import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  MessageSquare,
  ArrowLeft,
  Loader2,
  CheckCheck,
  Check,
  LayoutGrid,
  Calendar,
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
  return date.toLocaleDateString("en-IN", { weekday: "short" });
};

const formatMessageTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ProviderChat() {
  const { user } = useAuth();
  const accountAccess = getAccountAccessState(user);
  const canUseChat = accountAccess.canRespondToBookings;
  const [searchParams] = useSearchParams();
  const contactParam =
    searchParams.get("client") || searchParams.get("contact");

  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeUserId, setActiveUserId] = useState(contactParam || null);
  const [participant, setParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Fetch conversation list
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

  // Load thread for selected conversation
  const fetchMessages = useCallback(async (otherUserId) => {
    if (!otherUserId || !canUseChat) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/api/messages/${otherUserId}`);
      const data = res.data?.data || {};
      setMessages(data.messages || []);
      setParticipant(data.participant || null);
      setConversationId(data.conversationId || null);

      // Join socket room for this conversation
      const socket = getSocket();
      if (socket && data.conversationId) {
        socket.emit("join:conversation", data.conversationId);
      }

      // Mark read
      api.put(`/api/messages/${otherUserId}/read`).catch(() => {});
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

  // Socket subscriptions
  useEffect(() => {
    if (!user?.id) return;
    initiateSocketConnection(user.id, user.role);

    const unsubMsg = subscribeToNewMessages((err, payload) => {
      if (err || !payload?.message) return;
      const msg = payload.message;

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
        api.put(`/api/messages/${activeUserId}/read`).catch(() => {});
      }

      fetchConversations();
    });

    const unsubRead = subscribeToReadReceipts((err, payload) => {
      if (err) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.senderId) === String(user?.id) ? { ...m, read: true } : m,
        ),
      );
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

    const optimistic = {
      id: `opt-${Date.now()}`,
      content,
      senderId: user?.id,
      receiverId: activeUserId,
      direction: "outgoing",
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
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
            m.id === optimistic.id ? { ...savedMsg, direction: "outgoing" } : m,
          ),
        );
      }
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send message.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
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
              "Messaging with clients is available after admin approval."}
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
    <div className="h-[calc(100vh-10rem)] flex gap-4 pb-6 font-sans">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "w-80" : "w-20"
        } hidden lg:flex flex-col bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl transition-all duration-500 shadow-sm relative`}
      >
        <div className="p-6 border-b border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className={`font-bold text-xl tracking-tight transition-opacity ${
                showSidebar ? "opacity-100" : "opacity-0"
              }`}
            >
              Messaging
              {totalUnread > 0 && (
                <span className="ml-2 text-xs text-emerald-600 font-black">
                  ({totalUnread})
                </span>
              )}
            </h2>
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9 hover:bg-emerald-500/10 hover:text-emerald-600 hidden md:flex transition-all"
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
          {showSidebar && (
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-muted/40 border border-border/60 rounded-xl pl-10 pr-4 text-xs font-medium outline-none focus:border-emerald-500/40 focus:bg-background transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {loadingConvos ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-emerald-500" size={22} />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p>No conversations yet.</p>
            </div>
          ) : (
            filteredConvos.map((convo) => {
              const p = convo.participant || {};
              const isActive = activeUserId === p.userId;
              return (
                <button
                  key={p.userId || convo.conversationId}
                  onClick={() => handleSelectConversation(convo)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group/item relative overflow-hidden ${
                    isActive
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border-2 border-background shadow-sm overflow-hidden ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-muted/80 text-muted-foreground"
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

                  {showSidebar && (
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex items-center justify-between mb-0.5">
                        <p
                          className={`text-sm font-bold tracking-tight truncate ${
                            isActive ? "text-emerald-700" : "text-foreground"
                          }`}
                        >
                          {p.name || "Client"}
                        </p>
                        <span
                          className={`text-[9px] font-bold opacity-60 ${
                            isActive
                              ? "text-emerald-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(convo.lastMessageAt)}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] font-medium truncate italic ${
                          isActive
                            ? "text-emerald-600/80"
                            : "text-muted-foreground opacity-70"
                        }`}
                      >
                        {convo.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  )}

                  {showSidebar && (convo.unreadCount || 0) > 0 && (
                    <div className="w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      {convo.unreadCount}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-sm relative">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare size={64} className="mb-4 opacity-10" />
            <h3 className="text-xl font-bold text-foreground">
              Select a conversation
            </h3>
            <p className="text-sm mt-2 max-w-xs">
              Pick a client from the sidebar to start messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-border/60 flex items-center justify-between relative backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-lg text-emerald-600 shadow-sm overflow-hidden">
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
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    {participant?.name || "Client"}
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 italic leading-none">
                    {participant?.role === "CLIENT"
                      ? "Verified Client"
                      : "User"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-border/60"
              >
                <MoreVertical size={18} className="text-muted-foreground" />
              </Button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2
                    className="animate-spin text-emerald-500"
                    size={28}
                  />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <MessageSquare size={40} className="mb-3 opacity-20" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe =
                    msg.direction === "outgoing" ||
                    String(msg.senderId) === String(user?.id);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] group/msg relative`}>
                        <div
                          className={`p-4 rounded-2xl shadow-sm ${
                            isMe
                              ? "bg-emerald-500 text-white rounded-tr-sm"
                              : "bg-muted/50 border border-border/60 text-foreground rounded-tl-sm backdrop-blur-sm"
                          }`}
                        >
                          <p className="text-sm font-medium leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={`flex items-center gap-1.5 mt-2 ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span
                              className={`text-[8px] font-bold uppercase tracking-widest ${
                                isMe
                                  ? "text-white/60"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              {formatMessageTime(msg.createdAt)}
                            </span>
                            {isMe &&
                              (msg.read ? (
                                <CheckCheck
                                  size={10}
                                  className="text-white/80"
                                />
                              ) : (
                                <Check size={10} className="text-white/40" />
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-border/60 bg-muted/5 backdrop-blur-md">
              <div className="bg-card/90 border border-border/60 rounded-2xl p-2 flex items-center gap-2 shadow-sm focus-within:border-emerald-500/40 transition-all">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <Smile size={20} className="text-muted-foreground" />
                </Button>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none h-10 text-sm font-medium px-2"
                />
                <Button
                  size="icon"
                  className="rounded-xl h-10 w-10 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 shrink-0 transition-all active:scale-90"
                  onClick={handleSend}
                  disabled={!msgInput.trim() || sending}
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} className="text-white ml-0.5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
