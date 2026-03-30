import React, { useState } from "react";
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Calendar, 
  MoreVertical,
  X,
  CreditCard,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_NOTIFICATIONS = [
  {
    id: "NOT-001",
    title: "Booking Confirmed",
    message: "Arjun Sharma has accepted your plumbing service request for March 28th.",
    type: "booking",
    time: "2 hours ago",
    read: false,
    icon: Calendar,
    accent: "text-primary bg-primary/10 border-primary/20 shadow-primary/5"
  },
  {
    id: "NOT-002",
    title: "Payment Successful",
    message: "₹2,500 has been successfully debited for the Deep Cleaning session with Priya Patel.",
    type: "payment",
    time: "5 hours ago",
    read: true,
    icon: CreditCard,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  },
  {
    id: "NOT-003",
    title: "New Message",
    message: "Rajesh Kumar (AC Specialist) sent you a message regarding the scheduled maintenance.",
    type: "message",
    time: "1 day ago",
    read: true,
    icon: MessageSquare,
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/20"
  },
  {
    id: "NOT-004",
    title: "Action Required",
    message: "Your KYC documents were rejected. Please upload a clearer photo of your ID proof.",
    type: "system",
    time: "2 days ago",
    read: false,
    icon: AlertCircle,
    accent: "text-rose-500 bg-rose-500/10 border-rose-500/20"
  }
];

export default function ClientNotifications() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2 max-w-md">Stay updated with real-time alerts for booking confirmations, provider messages, and system-wide updates.</p>
        </div>
        <div className="flex gap-2 relative">
          <Button variant="outline" className="rounded-xl h-10 px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-muted/40 transition-all">
            <CheckCircle2 size={16} />
            Mark All as Read
          </Button>
          <Button variant="outline" className="rounded-xl h-10 px-4 text-xs font-semibold gap-2 border-border/60 bg-muted/20">
            <Filter size={16} />
            Filters
          </Button>
        </div>
      </div>

      {/* Tabs / Category Pills */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/40 w-fit backdrop-blur-md">
        {["all", "booking", "payment", "message", "system"].map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === type 
                ? "bg-background text-primary shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {MOCK_NOTIFICATIONS.filter(n => activeFilter === "all" || n.type === activeFilter).map((notification) => (
          <div 
            key={notification.id}
            className={`group bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] p-6 transition-all relative overflow-hidden cursor-pointer ${
              !notification.read ? "border-l-4 border-l-primary" : ""
            }`}
          >
            <div className={`absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground transition-all">
                  <CheckCircle2 size={18} />
                </button>
                <button className="p-2 hover:bg-rose-500/10 hover:text-rose-600 rounded-lg text-muted-foreground transition-all">
                  <X size={18} />
                </button>
                <button className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-6 relative">
              <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-inner ${notification.accent}`}>
                <notification.icon size={24} />
              </div>

              <div className="flex-1 min-w-0 pr-24">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`font-bold text-lg group-hover:text-primary transition-colors ${!notification.read ? "text-foreground" : "text-foreground/80"}`}>
                    {notification.title}
                  </h3>
                  {!notification.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <p className="text-muted-foreground text-sm italic leading-relaxed line-clamp-2 max-w-3xl mb-3 tracking-tight">
                  {notification.message}
                </p>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                  <span className="bg-muted/50 px-2 py-0.5 rounded-md italic leading-relaxed">{notification.time}</span>
                  <span className="opacity-30">•</span>
                  <span className="italic leading-relaxed">{notification.type} alert</span>
                </div>
              </div>

              <div className="absolute top-1/2 -translate-y-1/2 -right-2 opacity-0 group-hover:opacity-10 opacity-30 pointer-events-none">
                <Briefcase size={80} strokeWidth={1} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
