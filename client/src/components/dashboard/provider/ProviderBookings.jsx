import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  MapPin, 
  User, 
  Search, 
  Filter,
  Plus,
  MessageSquare,
  Phone,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { id: "all", label: "All Bookings", count: 12 },
  { id: "pending", label: "Pending Requests", count: 3 },
  { id: "active", label: "Active Jobs", count: 5 },
  { id: "completed", label: "Completed", count: 4 },
];

const MOCK_BOOKINGS = [
  {
    id: "BK-8821",
    client: "Alice Johnson",
    service: "Deep House Cleaning",
    date: "2026-03-28",
    time: "10:00 AM",
    status: "pending",
    price: "₹2,500",
    location: "Greenwich Village, NY"
  },
  {
    id: "BK-8822",
    client: "Bob Smith",
    service: "Kitchen Deep Clean",
    date: "2026-03-27",
    time: "02:30 PM",
    status: "active",
    price: "₹1,800",
    location: "Upper East Side, NY"
  },
  {
    id: "BK-8823",
    client: "Charlie Davis",
    service: "Full Apartment Sanitization",
    date: "2026-03-26",
    time: "09:00 AM",
    status: "completed",
    price: "₹4,200",
    location: "Brooklyn Heights, NY"
  }
];

export default function ProviderBookings() {
  const [activeTab, setActiveTab] = useState("all");

  const getStatusStyles = (status) => {
    switch (status) {
      case "pending": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "active": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "completed": return "bg-primary/10 text-primary border-primary/20";
      case "cancelled": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Manage service requests and track active jobs.
          </p>
        </div>
        <Button className="rounded-xl h-11 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md">
          <Plus size={18} />
          Manual Booking
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? "bg-background text-emerald-600 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                activeTab === tab.id ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto">
          <div className="relative w-full xl:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search bookings..." 
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/60 hover:bg-muted/50 transition-all shadow-xs">
            <Filter size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="grid gap-4">
        {MOCK_BOOKINGS.filter(b => activeTab === "all" || b.status === activeTab).map((booking) => (
          <div key={booking.id} className="group relative bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
              {/* Left: Client Info */}
              <div className="flex items-center gap-4 min-w-[220px]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 font-bold text-lg shadow-xs">
                  {booking.client.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-md leading-none">{booking.client}</h3>
                    <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest leading-none ${getStatusStyles(booking.status)}`}>
                        {booking.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[10px] font-bold italic opacity-60">#{booking.id}</p>
                </div>
              </div>

              {/* Middle: Service Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 lg:max-w-xl">
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">Service</p>
                  <p className="text-xs font-bold text-foreground truncate">{booking.service}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">Schedule</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground italic">
                    <Calendar size={12} className="text-emerald-500" />
                    <span>{booking.date}</span>
                    <span className="text-muted-foreground font-medium opacity-70">at {booking.time}</span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold mb-1 opacity-60">Value</p>
                  <p className="text-lg font-black text-emerald-600 leading-none italic">{booking.price}</p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {booking.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-500 hover:bg-rose-500/5 transition-all">
                      Decline
                    </Button>
                    <Button className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-sm">
                      Accept
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-border/60 hover:bg-muted/50 transition-all shadow-xs">
                      Details
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 hover:bg-muted/50 transition-all">
                        <MoreVertical size={16} className="text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {MOCK_BOOKINGS.filter(b => activeTab === "all" || b.status === activeTab).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-card/20 border-2 border-dashed border-border/60 rounded-[2rem] text-center">
            <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-emerald-500/5">
              <Calendar size={28} className="text-muted-foreground/40" />
            </div>
            <h3 className="text-md font-bold text-foreground opacity-60 uppercase tracking-tight">No bookings found</h3>
            <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px] font-medium italic opacity-60 leading-relaxed">
              Adjust your filters or search terms.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
