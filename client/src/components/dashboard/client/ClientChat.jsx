import React, { useState } from "react";
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  CheckCheck, 
  Clock, 
  Circle,
  MessageSquare,
  ShieldCheck,
  Zap,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_CHATS = [
  {
    id: "CH-1",
    name: "Arjun Sharma",
    lastMsg: "I'll be there by 10 AM sharp today.",
    time: "2m",
    online: true,
    unread: 1,
    avatar: "AS"
  },
  {
    id: "CH-2",
    name: "Priya Patel",
    lastMsg: "Thank you for the booking! Your home will sparkle.",
    time: "1h",
    online: false,
    unread: 0,
    avatar: "PP"
  },
  {
    id: "CH-3",
    name: "Rajesh Kumar",
    lastMsg: "I've sent the revised estimate for AC parts.",
    time: "Yesterday",
    online: true,
    unread: 0,
    avatar: "RK"
  },
  {
    id: "CH-4",
    name: "GoLocal Support",
    lastMsg: "How can we help you today?",
    time: "2d",
    online: true,
    unread: 0,
    avatar: "GS",
    isSupport: true
  }
];

const MOCK_MESSAGES = [
  { id: 1, sender: "them", text: "Hello! I'm confirmed for the plumbing task today.", time: "09:12 AM" },
  { id: 2, sender: "me", text: "Great, looking forward to it. Do you need any tools from my end?", time: "09:15 AM" },
  { id: 3, sender: "them", text: "No need, I'll bring everything required. I'll be there by 10 AM sharp today.", time: "09:45 AM" },
];

export default function ClientChat() {
  const [activeChat, setActiveChat] = useState("CH-1");
  const [msgInput, setMsgInput] = useState("");

  return (
    <div className="h-[calc(100vh-160px)] flex bg-card/40 border border-border/60 rounded-[3rem] overflow-hidden backdrop-blur-xl">
      {/* Sidebar / Chat list */}
      <aside className="w-96 border-r border-border/60 flex flex-col bg-muted/10">
        <div className="p-8 border-b border-border/60">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Messages</h2>
            <button className="p-2 hover:bg-muted/50 rounded-xl text-primary transition-all shadow-sm">
              <Zap size={18} />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {MOCK_CHATS.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-[2rem] transition-all group relative ${
                activeChat === chat.id 
                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                  : "hover:bg-muted/40 text-foreground"
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border-2 ${
                  activeChat === chat.id ? "bg-white/20 border-white/30" : "bg-primary/10 border-primary/10 text-primary"
                }`}>
                  {chat.avatar}
                </div>
                {chat.online && (
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card/40 z-20 ${
                    activeChat === chat.id ? "bg-white" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  }`} />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-10">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-bold text-sm truncate ${activeChat === chat.id ? "text-white" : "text-foreground"}`}>
                    {chat.name}
                  </h3>
                  <span className={`text-[10px] uppercase font-bold tracking-widest leading-none ${activeChat === chat.id ? "text-white/70" : "text-muted-foreground"}`}>
                    {chat.time}
                  </span>
                </div>
                <p className={`text-xs truncate italic leading-relaxed ${activeChat === chat.id ? "text-white/80" : "text-muted-foreground"}`}>
                  {chat.lastMsg}
                </p>
              </div>

              {chat.unread > 0 && activeChat !== chat.id && (
                <span className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-card/20 relative group overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-border/60 flex items-center justify-between bg-card/60 backdrop-blur-md relative z-10 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm relative overflow-hidden group/chat">
              <div className="absolute inset-0 bg-primary/20 text-primary opacity-0 group-hover/chat:opacity-100 transition-opacity" />
              AS
            </div>
            <div>
              <h3 className="font-bold text-lg">Arjun Sharma</h3>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-extrabold text-emerald-500 italic leading-relaxed">
                <Circle size={8} fill="currentColor" />
                Active Now
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 border-border/60 hover:text-primary transition-all">
              <Phone size={18} />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 border-border/60 hover:text-primary transition-all">
              <Video size={18} />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 border-border/60 hover:text-primary transition-all">
              <MoreVertical size={18} />
            </Button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar relative overflow-hidden">
          <div className="flex flex-col items-center mb-12">
            <div className="px-5 py-2 rounded-full bg-muted/40 text-[10px] uppercase tracking-widest font-extrabold text-muted-foreground border border-border/40 backdrop-blur-md">
              Today, March 27
            </div>
          </div>

          {MOCK_MESSAGES.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-end gap-3 ${msg.sender === "me" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                msg.sender === "me" ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/60 border-border/40 text-muted-foreground"
              }`}>
                {msg.sender === "me" ? "ME" : "AS"}
              </div>
              <div className={`max-w-md group relative ${msg.sender === "me" ? "items-end text-right" : "items-start"}`}>
                <div className={`p-5 rounded-[1.8rem] text-sm leading-relaxed shadow-sm transition-all hover:shadow-md ${
                  msg.sender === "me" 
                    ? "bg-primary text-white rounded-br-none" 
                    : "bg-muted/80 backdrop-blur-md text-foreground rounded-bl-none border border-border/40"
                }`}>
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 mt-2 px-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{msg.time}</span>
                  {msg.sender === "me" && <CheckCheck size={14} className="text-primary/70" />}
                </div>
              </div>
            </div>
          ))}
          
          <div className="absolute right-10 bottom-10 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
            <MessageSquare size={160} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-8 bg-card/80 backdrop-blur-lg border-t border-border/60 relative z-10 transition-all">
          <div className="flex items-center gap-3 bg-muted/40 border border-border/60 p-2 pl-6 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-background/80 transition-all group overflow-hidden">
            <button className="text-muted-foreground hover:text-primary transition-all">
              <Smile size={20} />
            </button>
            <button className="text-muted-foreground hover:text-primary transition-all">
              <Paperclip size={20} />
            </button>
            <input 
              type="text" 
              placeholder="Type your message here..."
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/60 h-12 italic leading-relaxed"
              onKeyPress={(e) => e.key === "Enter" && msgInput && setMsgInput("")}
            />
            <Button size="icon" className="h-12 w-12 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all shrink-0">
              <Send size={18} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
