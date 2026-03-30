import React, { useState } from "react";
import { 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  FileText,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_DISPUTES = [
  {
    id: "DSP-102",
    title: "Incomplete Cleaning Service",
    provider: "Priya Patel",
    date: "2024-03-24",
    status: "active",
    priority: "high",
    category: "Quality",
    description: "The kitchen area was not cleaned as per the deep cleaning checklist provided during booking."
  },
  {
    id: "DSP-098",
    title: "Double Charge for AC Parts",
    provider: "Rajesh Kumar",
    date: "2024-03-15",
    status: "resolved",
    priority: "medium",
    category: "Billing",
    description: "The invoice included charges for the copper pipe twice. The provider agreed to refund the excess amount."
  }
];

const STATUS_MAP = {
  active: { label: "Under Investigation", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "bg-muted/40 text-muted-foreground border-border/40" },
};

export default function ClientDisputes() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card/40 border border-border/60 rounded-[3rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Disputes Center</h1>
          <p className="text-muted-foreground mt-2 max-w-md italic leading-relaxed">Report issues with services, track resolution progress, and access priority support for conflict management.</p>
        </div>
        <Button size="lg" variant="destructive" className="rounded-2xl gap-2 shadow-xl shadow-rose-500/10 relative hover:scale-105 active:scale-95 transition-all">
          <AlertCircle size={18} />
          Report New Issue
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-3 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-muted/40 rounded-[1.8rem] border border-border/40 w-fit backdrop-blur-md">
            {["all", "active", "resolved"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all ${
                  activeTab === tab 
                    ? "bg-background text-primary shadow-sm border border-border/40" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {MOCK_DISPUTES.filter(d => activeTab === "all" || d.status === activeTab).map((dispute) => (
              <div key={dispute.id} className="bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2.5rem] p-8 transition-all relative group overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_MAP[dispute.status].color}`}>
                        {STATUS_MAP[dispute.status].label}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md italic">REF: {dispute.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{dispute.title}</h2>
                    <p className="text-sm text-muted-foreground max-w-2xl italic leading-relaxed line-clamp-2">{dispute.description}</p>
                    
                    <div className="flex flex-wrap gap-6 pt-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                        <Calendar size={14} className="text-primary/60" />
                        Opened on {new Date(dispute.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic leading-relaxed">
                        <ShieldCheck size={14} className="text-primary/60" />
                        Provider: {dispute.provider}
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-48 flex flex-col gap-2 shrink-0 justify-center">
                    <Button variant="outline" className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border-border/40 hover:bg-muted/40 transition-all">
                      <ExternalLink size={14} />
                      View Full Details
                    </Button>
                    <Button variant="ghost" className="rounded-xl h-10 px-4 text-xs font-bold gap-2 hover:bg-primary/10 hover:text-primary transition-all group/btn">
                      <MessageSquare size={14} />
                      Open Support Chat
                      <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-all" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <section className="bg-card/40 border border-border/60 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center gap-3 text-primary mb-2">
              <ShieldCheck size={24} />
              <h3 className="text-lg font-bold">Standard Resolution</h3>
            </div>
            <p className="text-sm text-muted-foreground italic leading-relaxed">Most disputes are resolved within 24-48 business hours.</p>
            <div className="space-y-4 pt-2">
              {[
                { label: "Investigation Started", icon: Search },
                { label: "Provider Response", icon: MessageSquare },
                { label: "Admin Resolution", icon: ShieldCheck },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 text-sm font-medium group transition-all">
                  <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary border border-border/40 transition-all">
                    <step.icon size={14} />
                  </div>
                  <span className="group-hover:translate-x-1 transition-all">{step.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[2.5rem] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle size={20} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Escalation Policy</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic leading-relaxed">If your dispute remains unresolved after 72 hours, it will automatically be escalated to our Senior Resolution Team (SRT).</p>
            <Button variant="link" className="text-rose-600 text-[10px] font-extrabold uppercase tracking-[0.2em] p-0 h-auto self-start underline-offset-4 pointer-events-none">
              Learn More about Disputes →
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
