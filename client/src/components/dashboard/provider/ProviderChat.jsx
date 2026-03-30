import React, { useState } from "react";
import { 
  Search, 
  MoreVertical, 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  User, 
  CheckCheck, 
  Check, 
  Clock, 
  LayoutGrid, 
  MessageSquare,
  ArrowLeft,
  Info,
  Calendar,
  X,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CLIENTS = [
  { id: 1, name: "Alice Johnson", lastMsg: "See you tomorrow at 10!", time: "2m", status: "online", unread: 2, avatar: "AJ" },
  { id: 2, name: "Bob Smith", lastMsg: "The kitchen is ready for cleaning.", time: "1h", status: "offline", unread: 0, avatar: "BS" },
  { id: 3, name: "Charlie Davis", lastMsg: "Can we reschedule for Friday?", time: "3h", status: "offline", unread: 0, avatar: "CD" },
  { id: 4, name: "Diana Prince", lastMsg: "Sent the document over.", time: "Yesterday", status: "online", unread: 0, avatar: "DP" },
  { id: 5, name: "Edward Norton", lastMsg: "When can you visit?", time: "2 days ago", status: "offline", unread: 0, avatar: "EN" }
];

const MESSAGES = [
  { id: 1, sender: "client", text: "Hello! I saw your profile and would like to book a deep house cleaning.", time: "10:05 AM", status: "read" },
  { id: 2, sender: "me", text: "Hi Alice! I'd be happy to help. What date were you thinking of?", time: "10:07 AM", status: "read" },
  { id: 3, sender: "client", text: "How about tomorrow at 10:00 AM? Is that too short notice?", time: "10:10 AM", status: "read" },
  { id: 4, sender: "me", text: "That works perfectly! I've marked it in my calendar.", time: "10:12 AM", status: "read" },
  { id: 5, sender: "client", text: "Great! See you tomorrow at 10!", time: "10:15 AM", status: "unread" }
];

export default function ProviderChat() {
  const [activeClient, setActiveClient] = useState(CLIENTS[0]);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-4 pb-6 font-sans">
      {/* Sidebar: Client List */}
      <div className={`${showSidebar ? "w-80" : "w-20"} hidden lg:flex flex-col bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl transition-all duration-500 shadow-sm relative group`}>
        <div className="p-6 border-b border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold text-xl tracking-tight transition-opacity ${showSidebar ? "opacity-100" : "opacity-0"}`}>Messaging</h2>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all">
                    <MessageSquare size={16} />
                </Button>
                <Button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-emerald-500/10 hover:text-emerald-600 hidden md:flex transition-all"
                >
                    <LayoutGrid size={16} />
                </Button>
            </div>
          </div>
          
          {showSidebar && (
            <div className="relative group/search animate-in fade-in slide-in-from-top-2 duration-500">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search clients..." 
                className="w-full h-10 bg-muted/40 border border-border/60 rounded-xl pl-10 pr-4 text-xs font-medium outline-none focus:border-emerald-500/40 focus:bg-background transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {CLIENTS.map((client) => {
             const isActive = activeClient.id === client.id;
             return (
               <button
                 key={client.id}
                 onClick={() => setActiveClient(client)}
                 className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group/item relative overflow-hidden ${
                   isActive 
                   ? "bg-emerald-500/10 border border-emerald-500/20" 
                   : "hover:bg-muted/50 border border-transparent"
                 }`}
               >
                 <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border-2 border-background shadow-sm transition-transform duration-500 group-hover/item:rotate-6 ${
                        isActive ? "bg-emerald-500 text-white" : "bg-muted/80 text-muted-foreground"
                    }`}>
                        {client.avatar}
                    </div>
                    {client.status === "online" && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-sm" />
                    )}
                 </div>
                 
                 {showSidebar && (
                    <div className="flex-1 text-left overflow-hidden animate-in fade-in slide-in-from-left-2 duration-500">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm font-bold tracking-tight truncate ${isActive ? "text-emerald-700" : "text-foreground"}`}>{client.name}</p>
                        <span className={`text-[9px] font-bold opacity-60 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>{client.time}</span>
                      </div>
                      <p className={`text-[10px] font-medium truncate italic ${isActive ? "text-emerald-600/80" : "text-muted-foreground opacity-70"}`}>{client.lastMsg}</p>
                    </div>
                 )}

                 {showSidebar && client.unread > 0 && (
                   <div className="w-4 h-4 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                     {client.unread}
                   </div>
                 )}
               </button>
             );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-sm relative group/chat">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Chat Header */}
        <div className="px-8 py-6 border-b border-border/60 flex items-center justify-between relative backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative group/avatar cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-lg text-emerald-600 shadow-sm transition-transform group-hover/avatar:scale-110">
                {activeClient.avatar}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-background rounded-full ${activeClient.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{activeClient.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeClient.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 italic leading-none">{activeClient.status === "online" ? "Active Now" : "Last seen 2h ago"}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all">
              <Phone size={18} className="text-muted-foreground" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all">
              <Video size={18} className="text-muted-foreground" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 transition-all">
              <MoreVertical size={18} className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
           <div className="flex justify-center mb-6">
               <div className="px-4 py-1 rounded-full bg-muted/40 border border-border/40 text-[9px] font-bold uppercase tracking-widest text-muted-foreground italic">
                   Today, March 27
               </div>
           </div>

           {MESSAGES.map((msg) => {
             const isMe = msg.sender === "me";
             return (
               <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                 <div className={`max-w-[75%] group/msg relative ${isMe ? "order-1" : "order-2"}`}>
                    <div className={`p-4 rounded-2xl shadow-sm relative ${
                      isMe 
                      ? "bg-emerald-500 text-white rounded-tr-sm" 
                      : "bg-muted/50 border border-border/60 text-foreground rounded-tl-sm backdrop-blur-sm"
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      
                      <div className={`flex items-center gap-1.5 mt-2 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${isMe ? "text-white/60" : "text-muted-foreground opacity-60"}`}>{msg.time}</span>
                        {isMe && (msg.status === "read" ? <CheckCheck size={10} className="text-white/80" /> : <Check size={10} className="text-white/40" />)}
                      </div>
                    </div>
                 </div>
               </div>
             );
           })}
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-border/60 bg-muted/5 backdrop-blur-md">
          <div className="bg-card/90 border border-border/60 rounded-2xl p-2 flex items-center gap-2 shadow-sm focus-within:border-emerald-500/40 transition-all group/input">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-emerald-500/10 transition-all shrink-0">
              <Paperclip size={20} className="text-muted-foreground group-hover/input:text-emerald-500" />
            </Button>
            
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 bg-transparent border-none outline-none h-10 text-sm font-medium px-2"
            />
            
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-emerald-500/10 transition-all shrink-0">
                  <Smile size={20} className="text-muted-foreground" />
                </Button>
                <Button className="rounded-xl h-10 w-10 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 shrink-0 transition-all active:scale-90 p-0 flex items-center justify-center">
                  <Send size={18} className="text-white ml-0.5" />
                </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  Alice is typing...
              </div>
          </div>
        </div>
      </div>

      {/* Right Drawer: Active Job/Details */}
      <div className="hidden xl:flex w-72 flex-col gap-4">
        {/* Client Profile Card */}
        <section className="bg-card/60 border border-border/60 rounded-[2rem] p-6 backdrop-blur-xl shadow-sm relative overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-background flex items-center justify-center text-2xl font-black text-emerald-600 shadow-sm transition-transform group-hover:scale-105">
                    {activeClient.avatar}
                </div>
                <div>
                    <h3 className="text-md font-bold tracking-tight">{activeClient.name}</h3>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic leading-none">Verified Client</p>
                </div>
                <div className="pt-4 border-t border-border/40 w-full">
                    <Button variant="outline" className="w-full rounded-xl h-9 text-[9px] font-bold uppercase tracking-widest border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 gap-2">
                        <Info size={12} />
                        About Client
                    </Button>
                </div>
            </div>
        </section>

        {/* Current Job Stats */}
        <section className="bg-card/40 border border-border/60 rounded-[2rem] p-6 backdrop-blur-sm shadow-sm space-y-5 flex-1 overflow-hidden">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 flex items-center gap-2 leading-none">
                <Calendar size={14} className="text-emerald-500" />
                Active Engagement
            </h4>
            
            <div className="space-y-5">
                <div className="group/item">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1 italic">Current Project</p>
                    <p className="text-sm font-bold text-foreground leading-snug group-hover/item:text-emerald-600 transition-colors line-clamp-2">Deep House Cleaning & Sanitization</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 italic">Date</p>
                        <p className="text-xs font-bold font-sans">March 28</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 italic">Price</p>
                        <p className="text-xs font-bold font-sans text-emerald-600">₹2,500</p>
                    </div>
                </div>
                <div className="pt-5 border-t border-border/40 space-y-3">
                    <h5 className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Attached Files (2)</h5>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 p-2.5 bg-muted/40 border border-border/40 rounded-xl hover:bg-emerald-500/5 transition-all group/file cursor-pointer">
                            <div className="p-1.5 bg-background rounded-lg text-emerald-600 border border-border/40">
                                <FileText size={12} />
                            </div>
                            <span className="text-[9px] font-bold truncate group-hover/file:text-emerald-600 uppercase">Layout.pdf</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
