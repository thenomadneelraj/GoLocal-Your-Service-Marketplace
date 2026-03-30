import React, { useState } from "react";
import { 
  Bell, 
  Calendar, 
  IndianRupee, 
  MessageSquare, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Filter, 
  Settings,
  MoreVertical,
  X,
  Mail,
  Zap,
  Star,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTIFICATIONS = [
  {
    id: 1,
    type: "booking",
    title: "New Service Request",
    description: "Alice Johnson has requested a 'Deep House Cleaning' for tomorrow at 10:00 AM.",
    time: "2 minutes ago",
    status: "unread",
    icon: Calendar,
    color: "emerald"
  },
  {
    id: 2,
    type: "payment",
    title: "Payment Received",
    description: "Your payout of ₹12,450 has been successfully processed and sent to your bank.",
    time: "4 hours ago",
    status: "unread",
    icon: IndianRupee,
    color: "blue"
  },
  {
    id: 3,
    type: "review",
    title: "New 5-Star Review!",
    description: "Bob Smith left a 5-star review: 'Excellent service and very professional.'",
    time: "1 day ago",
    status: "read",
    icon: Star,
    color: "amber"
  },
  {
    id: 4,
    type: "system",
    title: "Profile Verified",
    description: "Congratulations! Your identity documents have been approved. You are now a Verified Pro.",
    time: "2 days ago",
    status: "read",
    icon: ShieldCheck,
    color: "violet"
  }
];

export default function ProviderNotifications() {
  const [filter, setFilter] = useState("all");

  const getColorStyles = (color) => {
    switch (color) {
      case "emerald": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5";
      case "blue": return "bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-blue-500/5";
      case "amber": return "bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5";
      case "violet": return "bg-violet-500/10 text-violet-600 border-violet-500/20 shadow-violet-500/5";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Stay updated with bookings and system alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-border/60 hover:bg-muted/50 transition-all shadow-xs">
                <Settings size={18} className="text-muted-foreground" />
            </Button>
            <Button className="rounded-xl h-11 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md">
              <CheckCircle2 size={18} />
              Mark all read
            </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs overflow-x-auto no-scrollbar">
          {["all", "booking", "payment", "review", "system"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === type 
                ? "bg-background text-emerald-600 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic whitespace-nowrap leading-none">4 Alerts</p>
            <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 border-border/60 hover:bg-rose-500/10 hover:text-rose-600 transition-all shadow-xs">
                <Trash2 size={14} />
            </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="grid gap-3">
        {NOTIFICATIONS.filter(n => filter === "all" || n.type === filter).map((n) => (
          <div key={n.id} className={`group relative bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-300 backdrop-blur-sm shadow-xs overflow-hidden ${
              n.status === "unread" ? "border-emerald-500/30 ring-1 ring-emerald-500/10 bg-emerald-500/[0.02]" : ""
          }`}>
            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none`}>
              <n.icon size={100} />
            </div>

            <div className="flex flex-col md:flex-row gap-6 relative items-center">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs shrink-0 transition-transform ${getColorStyles(n.color)}`}>
                <n.icon size={22} />
              </div>

              <div className="flex-1 space-y-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                    <h3 className="text-md font-bold text-foreground group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{n.title}</h3>
                    <div className="flex items-center gap-3 justify-center md:justify-end">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic whitespace-nowrap">{n.time}</span>
                        <div className="h-1 w-1 bg-muted-foreground opacity-30 rounded-full" />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${n.status === "unread" ? "text-emerald-600" : "text-muted-foreground opacity-60"} whitespace-nowrap`}>{n.status}</span>
                    </div>
                </div>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground line-clamp-2 max-w-2xl mx-auto md:mx-0 opacity-80">
                  {n.description}
                </p>
                <div className="pt-3 flex items-center gap-2 justify-center md:justify-start">
                   <Button variant="ghost" className="rounded-xl h-8 px-4 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/10">
                        View Details
                   </Button>
                   <Button variant="ghost" className="rounded-xl h-8 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600">
                        Dismiss
                   </Button>
                </div>
              </div>

              <div className="absolute top-0 right-0 md:relative md:top-auto md:right-auto px-4">
                  <Button variant="ghost" size="icon" className="rounded-lg opacity-0 group-hover:opacity-40 transition-all h-9 w-9">
                      <MoreVertical size={16} />
                  </Button>
              </div>
            </div>
            
            {n.status === "unread" && (
                <div className="absolute top-6 right-6 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
            )}
          </div>
        ))}

        {NOTIFICATIONS.filter(n => filter === "all" || n.type === filter).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-card/20 border-2 border-dashed border-border/60 rounded-[2rem] text-center">
              <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-emerald-500/5">
                <Bell size={28} className="text-muted-foreground/30" />
              </div>
              <h3 className="text-md font-bold text-foreground opacity-60 uppercase tracking-tight">Clear</h3>
              <p className="text-[10px] text-muted-foreground mt-2 max-w-[180px] font-medium italic opacity-60 leading-relaxed">
                No alerts in this category.
              </p>
          </div>
        )}
      </div>

      <div className="pt-4">
          <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group">
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 transition-all duration-700" />
              <div className="relative">
                  <div className="flex items-center gap-2 mb-3 text-emerald-600 font-black uppercase tracking-widest text-[9px] bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                      <Zap size={12} />
                      Sync
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-1 italic">Automated Reports</h3>
                  <p className="text-[10px] text-muted-foreground italic font-medium leading-relaxed max-w-lg opacity-70">
                      Weekly performance insights synced to your platforms.
                  </p>
              </div>
              <Button size="lg" className="rounded-xl h-11 px-6 text-[10px] font-black uppercase tracking-widest bg-card border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-md relative overflow-hidden group/btn">
                  Configure
                  <ArrowUpRight size={14} className="ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </Button>
          </section>
      </div>
    </div>

  );
}
