import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  FileText,
  ShieldCheck,
  Zap,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_TASKS = [
  {
    id: "TSK-201",
    title: "Complete KYC Verification",
    description: "Upload your ID and address proof to unlock all platform features and book high-value services.",
    priority: "high",
    deadline: "2024-04-05",
    category: "Account",
    status: "pending"
  },
  {
    id: "TSK-202",
    title: "Review Plumbing Service",
    description: "Please share your feedback for Arjun Sharma's plumbing repair service completed on March 25th.",
    priority: "medium",
    deadline: "2024-03-31",
    category: "Review",
    status: "in-progress"
  },
  {
    id: "TSK-203",
    title: "Approve Cleaning Quote",
    description: "Priya Patel sent a revised quote for the deep cleaning session scheduled next Monday.",
    priority: "high",
    deadline: "2024-03-29",
    category: "Booking",
    status: "pending"
  },
  {
    id: "TSK-198",
    title: "Email Verification",
    description: "Your account is secure, but verify your email to receive real-time booking updates.",
    priority: "low",
    deadline: "2024-04-10",
    category: "System",
    status: "completed"
  }
];

const PRIORITY_MAP = {
  high: "bg-rose-500/10 text-rose-600 border-rose-200",
  medium: "bg-amber-500/10 text-amber-600 border-amber-200",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function ClientTasks() {
  const [filter, setFilter] = useState("all");

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Pending Tasks</h1>
          <p className="text-muted-foreground mt-2 max-w-md">Keep track of actions required from your end to complete bookings and maintain your account.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-border/40 p-4 rounded-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Next Action</p>
            <p className="text-xs text-muted-foreground">Complete KYC Verification</p>
          </div>
        </div>
      </div>

      {/* Kanban/List View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Column */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <h2 className="font-bold text-sm uppercase tracking-widest text-foreground/80">Action Required</h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">
              {MOCK_TASKS.filter(t => t.status === "pending").length}
            </span>
          </div>
          
          <div className="space-y-4">
            {MOCK_TASKS.filter(t => t.status === "pending").map((task) => (
              <div key={task.id} className="bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:shadow-xl hover:shadow-primary/5 hover:bg-card/60 transition-all group group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical size={18} className="text-muted-foreground" />
                </div>
                <div className="flex gap-2 items-center mb-4">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-[0.15em] border ${PRIORITY_MAP[task.priority]}`}>
                    {task.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md italic">{task.category}</span>
                </div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 italic leading-relaxed mb-6">{task.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Calendar size={14} className="text-primary/60" />
                    Due by {new Date(task.deadline).toLocaleDateString()}
                  </div>
                  <Button size="sm" className="rounded-xl h-9 px-4 gap-2 text-xs font-semibold group/btn">
                    Complete
                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* In Progress Column */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
              <h2 className="font-bold text-sm uppercase tracking-widest text-foreground/80">Processing</h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">
              {MOCK_TASKS.filter(t => t.status === "in-progress").length}
            </span>
          </div>

          <div className="space-y-4">
            {MOCK_TASKS.filter(t => t.status === "in-progress").map((task) => (
              <div key={task.id} className="bg-card/40 border border-border/60 border-t-primary/30 rounded-[2rem] p-6 opacity-80 hover:opacity-100 transition-all">
                <div className="flex gap-2 items-center mb-4">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-[0.15em] border ${PRIORITY_MAP[task.priority]}`}>
                    {task.priority} Priority
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{task.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 italic leading-relaxed">{task.description}</p>
                <div className="bg-primary/5 h-2 w-full rounded-full overflow-hidden border border-primary/10">
                  <div className="bg-primary h-full w-[65%] rounded-full shadow-[0_0_10px_rgba(var(--primary),0.4)]" />
                </div>
                <p className="text-[10px] text-right mt-2 font-bold text-primary italic leading-relaxed uppercase tracking-widest">65% Reviewed</p>
              </div>
            ))}
          </div>
        </section>

        {/* Completed Column */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <h2 className="font-bold text-sm uppercase tracking-widest text-foreground/80">Completed</h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">
              {MOCK_TASKS.filter(t => t.status === "completed").length}
            </span>
          </div>

          <div className="space-y-4">
            {MOCK_TASKS.filter(t => t.status === "completed").map((task) => (
              <div key={task.id} className="bg-muted/10 border border-border/40 rounded-[2rem] p-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all relative">
                <div className="absolute top-4 right-4 text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-bold text-lg mb-2 line-through decoration-muted-foreground/40">{task.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed line-clamp-2">{task.description}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 italic leading-relaxed">
                  <ShieldCheck size={14} />
                  Safe and Verified
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
