import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquare, Search, SendHorizonal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import {
  disconnectSocket,
  initiateSocketConnection,
  subscribeToNewMessages,
  subscribeToReadReceipts,
} from "@/lib/socket";

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();
  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return isSameDay
    ? date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
};

const getInitials = (value = "") =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

function Avatar({ participant, size = "h-12 w-12" }) {
  const photo = resolveMediaUrl(participant?.profilePhoto);

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/12 text-sm font-semibold text-primary`}
    >
      {photo ? (
        <img
          src={photo}
          alt={participant?.name || "User"}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(participant?.name)
      )}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <MessageSquare size={28} />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function MessagesWorkspace() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedUserId = searchParams.get("contact") || "";

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(requestedUserId);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const threadRef = useRef(null);
  const previousRequestedUserIdRef = useRef(requestedUserId);
  const currentRole = String(user?.role || "").toLowerCase();

  const loadConversations = async (preferredUserId = "") => {
    try {
      setLoadingConversations(true);
      const response = await api.get("/api/messages");
      const nextConversations = response.data?.data || [];
      setConversations(nextConversations);

      setSelectedUserId((currentValue) => {
        const requested =
          preferredUserId || requestedUserId || currentValue || "";

        if (requested) {
          return requested;
        }

        return nextConversations[0]?.participant?.userId || "";
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load conversations right now."
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadThread = async (otherUserId, options = {}) => {
    if (!otherUserId) {
      setSelectedParticipant(null);
      setMessages([]);
      return;
    }

    if (!options.silent) {
      setLoadingThread(true);
    }

    try {
      const response = await api.get(`/api/messages/${otherUserId}`);
      const payload = response.data?.data || {};
      const nextMessages = payload.messages || [];

      setSelectedParticipant(payload.participant || null);
      setMessages(nextMessages);
      setError("");

      const hasUnreadIncoming = nextMessages.some(
        (message) => message.direction === "incoming" && !message.read
      );

      if (hasUnreadIncoming) {
        await api.put(`/api/messages/${otherUserId}/read`);
        await loadConversations(otherUserId);
      }
    } catch (err) {
      setSelectedParticipant(null);
      setMessages([]);
      setError(
        err.response?.data?.message || "Could not load this conversation."
      );
    } finally {
      if (!options.silent) {
        setLoadingThread(false);
      }
    }
  };

  useEffect(() => {
    if (!user?.id) return undefined;

    initiateSocketConnection(user.id, user.role);
    return () => {
      disconnectSocket();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadConversations(requestedUserId);
  }, [user?.id, requestedUserId]);

  useEffect(() => {
    if (
      requestedUserId &&
      requestedUserId !== previousRequestedUserIdRef.current
    ) {
      setSelectedUserId(requestedUserId);
    }
    previousRequestedUserIdRef.current = requestedUserId;
  }, [requestedUserId]);

  useEffect(() => {
    if (!selectedUserId || selectedUserId === requestedUserId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("contact", selectedUserId);
    setSearchParams(nextParams, { replace: true });
  }, [
    requestedUserId,
    searchParams,
    selectedUserId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!selectedUserId || !user?.id) return;
    loadThread(selectedUserId);
  }, [selectedUserId, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const refresh = async () => {
      await loadConversations(selectedUserId || requestedUserId);
      if (selectedUserId) {
        await loadThread(selectedUserId, { silent: true });
      }
    };

    const unsubscribeMessages = subscribeToNewMessages(() => {
      refresh();
    });

    const unsubscribeReadReceipts = subscribeToReadReceipts(() => {
      loadConversations(selectedUserId || requestedUserId);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeReadReceipts();
    };
  }, [user?.id, selectedUserId, requestedUserId]);

  useEffect(() => {
    if (!threadRef.current) return;

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const filteredConversations = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const participant = conversation.participant || {};
      return [participant.name, participant.email, participant.serviceType, participant.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [conversations, search]);

  const activeConversation = conversations.find(
    (conversation) => conversation.participant?.userId === selectedUserId
  );
  const activeParticipant =
    activeConversation?.participant || selectedParticipant || null;

  const handleSend = async (event) => {
    event.preventDefault();

    if (!selectedUserId || !draft.trim()) {
      return;
    }

    try {
      setSending(true);
      setError("");
      await api.post("/api/messages", {
        receiverId: selectedUserId,
        content: draft.trim(),
      });
      setDraft("");
      await loadConversations(selectedUserId);
      await loadThread(selectedUserId, { silent: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  const subtitle =
    currentRole === "provider"
      ? "Keep every client conversation in one place and reply from here."
      : "Ask questions, confirm timings, and stay connected with your providers.";

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/18 via-primary/6 to-transparent" />
        <div className="relative flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
            Shared Inbox
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Messages
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.56)] backdrop-blur-xl">
          <div className="border-b border-border/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Conversations
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {conversations.length} active chats
                </p>
              </div>
            </div>

            <label className="relative mt-4 flex items-center">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or service"
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
              />
            </label>
          </div>

          <div className="max-h-[72vh] overflow-y-auto p-3">
            {loadingConversations ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-[1.5rem] border border-border/60 bg-muted/30"
                  />
                ))}
              </div>
            ) : filteredConversations.length ? (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const participant = conversation.participant || {};
                  const isActive =
                    participant.userId &&
                    participant.userId === selectedUserId;

                  return (
                    <button
                      key={participant.userId}
                      type="button"
                      onClick={() => setSelectedUserId(participant.userId)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition-all ${
                        isActive
                          ? "border-primary/25 bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/45 hover:border-primary/20 hover:bg-muted/35"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar participant={participant} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {participant.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {participant.role === "provider"
                                  ? participant.serviceType || "Provider"
                                  : "Client"}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {formatTime(conversation.lastMessageAt)}
                              </span>
                              {conversation.unreadCount ? (
                                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                                  {conversation.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {conversation.lastMessage?.content || "Start the conversation"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No conversations yet"
                description="Use the Send Message button from a provider profile to start a conversation."
              />
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.56)] backdrop-blur-xl">
          {activeParticipant ? (
            <div className="flex h-full min-h-[72vh] flex-col">
              <div className="border-b border-border/60 p-5">
                <div className="flex items-center gap-4">
                  <Avatar participant={activeParticipant} size="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                        {activeParticipant.name}
                      </h2>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        {activeParticipant.role === "provider"
                          ? "Provider"
                          : "Client"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeParticipant.role === "provider"
                        ? [
                            activeParticipant.serviceType,
                            activeParticipant.location,
                          ]
                            .filter(Boolean)
                            .join(" · ") || activeParticipant.email
                        : activeParticipant.address || activeParticipant.email}
                    </p>
                  </div>
                </div>
              </div>

              <div
                ref={threadRef}
                className="flex-1 space-y-4 overflow-y-auto bg-background/25 px-5 py-6"
              >
                {loadingThread ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-20 animate-pulse rounded-[1.5rem] border border-border/60 bg-muted/35 ${
                          index % 2 ? "ml-auto max-w-[70%]" : "max-w-[70%]"
                        }`}
                      />
                    ))}
                  </div>
                ) : messages.length ? (
                  messages.map((message) => {
                    const isOutgoing = message.direction === "outgoing";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOutgoing ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-[1.6rem] px-4 py-3 text-sm leading-7 shadow-sm ${
                            isOutgoing
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border border-border/60 bg-card text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <div
                            className={`mt-2 text-[11px] ${
                              isOutgoing
                                ? "text-primary-foreground/75"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                            {isOutgoing ? (
                              <span className="ml-2">
                                {message.read ? "Seen" : "Sent"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    title="Start the conversation"
                    description="Send the first message to begin coordinating details, availability, or project questions."
                  />
                )}
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-border/60 bg-card/90 p-5"
              >
                <div className="rounded-[1.6rem] border border-border/70 bg-background/70 p-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                    placeholder={`Message ${
                      activeParticipant.role === "provider"
                        ? activeParticipant.name
                        : "your client"
                    }...`}
                    className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Messages are saved to the database and synced for both users.
                    </p>
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <SendHorizonal size={16} />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <EmptyState
              title="Choose a conversation"
              description="Select a chat from the left to read messages, or start a new conversation from a provider profile."
            />
          )}
        </section>
      </div>
    </div>
  );
}
