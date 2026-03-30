import React, { useState } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Gavel, 
  MessageSquare, 
  MoreVertical, 
  ShieldAlert, 
  ArrowUpRight, 
  Filter, 
  Search, 
  Scale, 
  Info,
  Calendar,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_DISPUTES = [
  {
    id: "DSP-5521",
    client: "Alice Johnson",
    service: "Deep House Cleaning",
    type: "Quality of Service",
    status: "active",
    date: "2026-03-24",
    lastUpdate: "2 hours ago",
    description: "Client is claiming the balcony was not cleaned properly. Provided photo evidence is under review."
  },
  {
    id: "DSP-5520",
    client: "Bob Smith",
    service: "Kitchen Sanitization",
    type: "Billing Issue",
    status: "resolved",
    date: "2026-03-18",
    lastUpdate: "Yesterday",
    description: "Successful resolution. Client agreed to pay the additional material costs after invoice clarification."
  }
];

export default function ProviderDisputes() {
  const [activeTab, setActiveTab] = useState("all");

  const getStatusStyles = (status) => {
    switch (status) {
      case "active": return "bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-rose-500/5";
      case "resolved": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/5";
      case "mediation": return "bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/5";
      default: return "bg-muted text-muted-foreground border-border/60";
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-rose-500/10 via-rose-500/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">Resolution Center</h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm font-medium leading-relaxed">
            Manage conflicts, review client claims, and track the progress of active disputes with our mediation team.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl h-12 px-6 gap-2 font-bold border-rose-500/20 text-rose-600 hover:bg-rose-500/5">
              <AlertTriangle size={18} />
              Open Dispute
            </Button>
            <Button className="rounded-2xl h-12 px-6 gap-2 font-bold bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
              <Scale size={18} />
              Platform Policy
            </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/40 backdrop-blur-md shadow-sm overflow-x-auto no-scrollbar">
          {["all", "active", "resolved", "mediation"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                ? "bg-background text-emerald-600 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
             <div className="relative group/search flex-1 xl:w-80">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-emerald-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search cases..." 
                 className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border/60 bg-card/50 focus:bg-background focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
               />
             </div>
             <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/60 hover:bg-muted/50 transition-all">
               <Filter size={18} className="text-muted-foreground" />
             </Button>
          </div>
      </div>

      {/* Disputes List */}
      <div className="grid gap-4">
        {MOCK_DISPUTES.filter(d => activeTab === "all" || d.status === activeTab).map((dispute) => (
          <div key={dispute.id} className="group relative bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-500 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className={`absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none`}>
              <Scale size={130} />
            </div>

            <div className="flex flex-col xl:flex-row gap-8 relative items-center">
              {/* Left: Case Info */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center min-w-[240px]">
                 <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm group-hover:rotate-12 transition-transform duration-500 border-2 border-background ${
                     dispute.status === "active" ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                 }`}>
                     {dispute.client.charAt(0)}
                 </div>
                 <div>
                    <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-emerald-700 transition-colors">{dispute.client}</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5 opacity-60 italic leading-none">{dispute.id}</p>
                    <div className={`mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-xs ${getStatusStyles(dispute.status)}`}>
                        {dispute.status === "active" ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                        {dispute.status}
                    </div>
                 </div>
              </div>

              {/* Middle: Details */}
              <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Category</p>
                          <p className="text-xs font-bold text-foreground truncate">{dispute.type}</p>
                      </div>
                      <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Booking</p>
                          <p className="text-xs font-bold text-foreground truncate">{dispute.service}</p>
                      </div>
                      <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Opened</p>
                          <p className="text-xs font-bold text-foreground whitespace-nowrap">{dispute.date}</p>
                      </div>
                      <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic leading-none">Update</p>
                          <p className="text-xs font-bold text-emerald-600 whitespace-nowrap">{dispute.lastUpdate}</p>
                      </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-2xl border border-border/40 relative group/desc">
                      <p className="text-xs font-medium leading-relaxed text-muted-foreground italic group-hover/desc:text-foreground transition-colors line-clamp-1">
                        &quot;{dispute.description}&quot;
                      </p>
                      <button className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-2 hover:underline">Read claim</button>
                  </div>
              </div>

              {/* Right: Actions */}
              <div className="flex xl:flex-col items-center justify-between xl:justify-center gap-2 w-full xl:w-auto">
                 <Button className="rounded-xl h-10 px-4 text-[9px] font-black uppercase tracking-widest gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-md">
                     <MessageSquare size={14} />
                     Mediate
                 </Button>
                 <Button variant="outline" className="rounded-xl h-10 px-4 text-[9px] font-black uppercase tracking-widest gap-2 border-border/60 hover:bg-rose-500/5 text-rose-600">
                     <AlertCircle size={14} />
                     Escalate
                 </Button>
                 <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/60 hover:bg-muted/50 hidden md:flex shrink-0">
                    <MoreVertical size={16} />
                 </Button>
              </div>
            </div>
          </div>
        ))}

        {MOCK_DISPUTES.filter(d => activeTab === "all" || d.status === activeTab).length === 0 && (
           <div className="flex flex-col items-center justify-center py-20 bg-card/20 border-2 border-dashed border-border/60 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground opacity-60">No Active Disputes</h3>
              <p className="text-muted-foreground mt-3 max-w-xs text-center font-medium italic text-xs leading-relaxed opacity-60">
                Great job! You have no open disputes in this category. Continue providing excellent service!
              </p>
           </div>
        )}
      </div>

      <div className="pt-4">
          <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <Scale size={180} />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 relative">
               <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shrink-0 shadow-sm">
                  <ShieldAlert size={32} />
               </div>
               <div className="flex-1 space-y-3 text-center md:text-left">
                  <h3 className="text-xl font-black tracking-tight uppercase italic leading-none">Resolution Guarantee</h3>
                  <p className="text-xs text-muted-foreground italic leading-relaxed max-w-2xl font-medium">
                     At GoLocal, we believe in fair and transparent conflict resolution. All disputes are handled by professional mediators who review transaction history.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-1">
                     {["Fair Mediation", "24/7 Response", "Evidential Review"].map((item, i) => (
                         <div key={i} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-700/80 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 size={12} />
                            {item}
                         </div>
                     ))}
                  </div>
               </div>
               <Button variant="outline" className="rounded-xl h-10 px-6 text-[9px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-md">
                  Policies
               </Button>
            </div>
          </section>
      </div>
    </div>
  );
}
