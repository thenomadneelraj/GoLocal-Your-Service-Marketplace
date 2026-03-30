import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Star, 
  Clock, 
  Tag, 
  Layers, 
  Zap, 
  Trash2, 
  Edit3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  IndianRupee,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_SERVICES = [
  {
    id: "SRV-101",
    title: "Deep House Cleaning",
    category: "Cleaning",
    price: "₹1,500/hr",
    rating: 4.9,
    reviews: 124,
    status: "active",
    icon: LayoutGrid
  },
  {
    id: "SRV-102",
    title: "Eco-Friendly Kitchen Sanitization",
    category: "Cleaning",
    price: "₹2,200",
    rating: 4.8,
    reviews: 86,
    status: "active",
    icon: Sparkles
  },
  {
    id: "SRV-103",
    title: "Full Bathroom Deep Cleaning",
    category: "Cleaning",
    price: "₹1,200",
    rating: 4.7,
    reviews: 42,
    status: "inactive",
    icon: ShieldCheck
  }
];

function Sparkles(props) {
  return <Zap {...props} />;
}

export default function ProviderServices() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
            Manage your professional service catalog.
          </p>
        </div>
        <Button className="rounded-xl h-11 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-md">
          <Plus size={18} />
          Add Service
        </Button>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/40 backdrop-blur-md shadow-xs overflow-x-auto no-scrollbar">
          {["all", "active", "inactive"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                ? "bg-background text-emerald-600 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto">
          <div className="relative group flex-1 xl:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search services..." 
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/60 hover:bg-muted/50 transition-all shadow-xs">
            <Filter size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_SERVICES.filter(s => activeTab === "all" || s.status === activeTab).map((service) => (
          <div key={service.id} className="group bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/70 transition-all duration-300 relative overflow-hidden backdrop-blur-sm shadow-xs h-full flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <service.icon size={100} />
            </div>
            
            <div className="relative flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
                  <service.icon size={24} />
                </div>
                <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-xs ${
                  service.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/60"
                }`}>
                  {service.status === "active" ? <CheckCircle2 className="inline-block mr-1.5 mb-0.5" size={10} /> : <XCircle className="inline-block mr-1.5 mb-0.5" size={10} />}
                  {service.status}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/60 mb-1.5 leading-none">{service.category}</p>
                <h3 className="text-lg font-bold text-foreground mb-4 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-1">{service.title}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-background/80 border border-border/60 px-2.5 py-1 rounded-lg shadow-xs">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black leading-none">{service.rating}</span>
                    <span className="text-[9px] text-muted-foreground font-bold leading-none">({service.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-background/80 border border-border/60 px-2.5 py-1 rounded-lg shadow-xs italic text-muted-foreground">
                    <Clock size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-bold leading-none">Est. 2h</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none">Pricing</p>
                  <p className="text-lg font-black text-emerald-600 leading-none italic">{service.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="rounded-lg h-9 w-9 border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all">
                    <Edit3 size={14} />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-lg h-9 w-9 border-border/60 hover:bg-rose-500/10 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 duration-300">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        <div className="group bg-card/20 border-2 border-dashed border-border/60 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center hover:border-emerald-500/40 hover:bg-card/40 transition-all duration-500 cursor-pointer min-h-[280px]">
          <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-emerald-500/5 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-all">
            <Plus size={28} className="text-muted-foreground/30 group-hover:text-emerald-600" />
          </div>
          <h3 className="text-md font-bold text-foreground opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-tight">Add New</h3>
          <p className="text-[10px] text-muted-foreground mt-2 max-w-[180px] font-medium italic opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">Expand your professional portfolio with more offerings.</p>
        </div>
      </div>
    </div>

  );
}
