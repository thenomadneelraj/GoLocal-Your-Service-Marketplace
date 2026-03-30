import React, { useState } from "react";
import { 
  Calendar, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  XCircle, 
  RefreshCcw,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "upcoming", label: "Upcoming", icon: Clock },
  { id: "active", label: "Active", icon: RefreshCcw },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
];

const MOCK_BOOKINGS = [
  {
    id: "BK-1024",
    providerName: "Arjun Sharma",
    serviceType: "Professional Plumbing",
    date: "2024-03-28",
    time: "10:00 AM",
    status: "upcoming",
    price: 1200,
    avatar: "AS"
  },
  {
    id: "BK-1025",
    providerName: "Priya Patel",
    serviceType: "Deep Home Cleaning",
    date: "2024-03-27",
    time: "02:30 PM",
    status: "active",
    price: 2500,
    avatar: "PP"
  },
  {
    id: "BK-0998",
    providerName: "Rajesh Kumar",
    serviceType: "AC Maintenance",
    date: "2024-03-20",
    time: "09:00 AM",
    status: "completed",
    price: 1800,
    avatar: "RK"
  }
];

const STATUS_MAP = {
  upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  active: { label: "In Progress", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  completed: { label: "Completed", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
  cancelled: { label: "Cancelled", color: "bg-rose-500/10 text-rose-600 border-rose-200" },
};

export default function ClientBookings() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookings = MOCK_BOOKINGS.filter(b => 
    (activeTab === "all" || b.status === activeTab) &&
    (b.providerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
     b.serviceType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Manage your service appointments, track active sessions, and review your booking history.
          </p>
        </div>
        <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20 relative">
          <Calendar size={18} />
          Book New Service
        </Button>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/40 backdrop-blur-md">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-background text-primary shadow-sm border border-border/40" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full xl:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by provider or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border/60 bg-card/50 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Bookings List */}
      <div className="grid gap-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <div 
              key={booking.id}
              className="bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] p-6 transition-all group relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20 shadow-inner">
                    {booking.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{booking.providerName}</h3>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_MAP[booking.status].color}`}>
                        {STATUS_MAP[booking.status].label}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">{booking.serviceType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-8 flex-1 lg:max-w-xl">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Schedule</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-primary" />
                      <span className="font-medium">{new Date(booking.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground ml-1">at {booking.time}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Cost</p>
                    <p className="text-lg font-bold text-primary">₹{booking.price.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Booking ID</p>
                    <p className="text-sm font-mono text-muted-foreground">#{booking.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 border-border/60 hover:bg-muted/50">
                    <ExternalLink size={14} />
                    View Details
                  </Button>
                  {booking.status === "upcoming" && (
                    <div className="flex gap-2">
                      <Button variant="ghost" className="rounded-xl px-4 py-2 text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-600 transition-colors">
                        Cancel
                      </Button>
                      <Button variant="ghost" className="rounded-xl px-4 py-2 text-xs font-semibold hover:bg-primary/10 hover:text-primary">
                        Reschedule
                      </Button>
                    </div>
                  )}
                  <button className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
              <Calendar size={40} opacity={0.4} />
            </div>
            <h3 className="text-xl font-semibold">No bookings found</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-center">
              {searchQuery 
                ? "No service records match your current search query." 
                : `You don't have any ${activeTab} bookings at the moment.`}
            </p>
            {!searchQuery && (
              <Button variant="link" className="mt-4 text-primary font-semibold underline-offset-4 decoration-primary/30">
                Explore available services →
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
