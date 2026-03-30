import React from "react";
import { 
  Star, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  ThumbsUp, 
  ArrowUpRight, 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Button } from "@/components/ui/button";

const RATINGS_DATA = [
  { star: 5, count: 184, color: "#10b981" },
  { star: 4, count: 42, color: "#34d399" },
  { star: 3, count: 12, color: "#f59e0b" },
  { star: 2, count: 4, color: "#f97316" },
  { star: 1, count: 1, color: "#ef4444" }
];

const REVIEWS = [
  {
    id: "REV-101",
    client: "Alice Johnson",
    rating: 5,
    date: "2026-03-22",
    comment: "Excellent service! The team was professional and the quality of work was outstanding. Highly recommend for deep cleaning.",
    service: "Deep House Cleaning",
    initials: "AJ"
  },
  {
    id: "REV-102",
    client: "Bob Smith",
    rating: 5,
    date: "2026-03-18",
    comment: "Very punctual and efficient. The kitchen looks brand new after the sanitization service. Will book again!",
    service: "Kitchen Sanitization",
    initials: "BS"
  },
  {
    id: "REV-103",
    client: "Charlie Davis",
    rating: 4,
    date: "2026-03-12",
    comment: "Good work, but arrived 15 minutes late. Overall satisfied with the result.",
    service: "Full Apartment Sanitization",
    initials: "CD"
  }
];

export default function ProviderReputation() {
  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Reputation Hero */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 xl:col-span-8 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 h-full relative">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 mx-auto md:mx-0 shadow-xs">
                <ShieldCheck size={14} />
                Elite
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  <h1 className="text-6xl font-black tracking-tighter text-foreground leading-none italic">4.85</h1>
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex gap-1 text-amber-500">
                      {[1,2,3,4,5].map(s => <Star key={s} size={18} fill={s <= 4 ? "#f59e0b" : "none"} className={s === 5 ? "text-amber-500/30" : "text-amber-500"} />)}
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Professional Rating</p>
                  </div>
                </div>
                <p className="text-muted-foreground max-w-lg italic font-medium leading-relaxed text-xs opacity-70">
                  You have served over <span className="text-foreground font-black">240+ clients</span> with an exceptional satisfaction rate.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-fit">
              <div className="bg-background/80 border border-border/60 p-5 rounded-2xl text-center shadow-xs">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 whitespace-nowrap opacity-60">Reviews</p>
                <p className="text-2xl font-black text-emerald-600 leading-none italic">243</p>
              </div>
              <div className="bg-background/80 border border-border/60 p-5 rounded-2xl text-center shadow-xs">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 whitespace-nowrap opacity-60">Success Rate</p>
                <p className="text-2xl font-black text-emerald-600 leading-none italic">99.2%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 xl:col-span-4 bg-card/40 border border-border/60 rounded-[2rem] p-8 backdrop-blur-sm relative group overflow-hidden h-full shadow-xs">
           <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-110">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Ratings</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">Star distribution.</p>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={RATINGS_DATA}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="star" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 800 }}
                  width={30}
                  tickFormatter={(val) => `${val}★`}
                />
                <Tooltip 
                  cursor={{ fill: "#10b981", opacity: 0.05 }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontSize: "10px", fontWeight: "bold" }}
                />
                <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={20} animationBegin={300} animationDuration={1500}>
                  {RATINGS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-110">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Feedback</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">Client reviews.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
             <div className="relative group/search flex-1 xl:w-72">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within/search:text-emerald-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search feedback..." 
                 className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
               />
             </div>
             <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 transition-all shadow-xs">
               <Filter size={16} className="text-muted-foreground" />
             </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {REVIEWS.map((review) => (
            <div key={review.id} className="group bg-card/40 border border-border/60 rounded-[2rem] p-6 hover:border-emerald-500/40 hover:bg-card/60 transition-all duration-300 relative overflow-hidden backdrop-blur-sm shadow-xs h-full flex flex-col">
               <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center gap-3 text-center min-w-[120px] xl:min-w-[130px]">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-600 shadow-xs group-hover:scale-105 transition-transform duration-500">
                      {review.initials}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-[11px] uppercase tracking-tight">{review.client}</h4>
                      <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60 italic leading-none">Verified</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-background shadow-xs border border-border/60 px-2 py-1 rounded-lg">
                        {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= review.rating ? "#f59e0b" : "none"} className={s <= review.rating ? "text-amber-500" : "text-amber-500/20"} />)}
                        <span className="text-[10px] font-black ml-1">{review.rating}.0</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                          <span className="bg-muted px-2 py-0.5 rounded-lg border border-border/60">{review.service}</span>
                          <span className="hidden md:inline text-xs opacity-30 px-1">•</span>
                          <span className="hidden md:inline italic">{review.date}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-500/10 hover:text-emerald-600">
                          <MoreVertical size={16} className="text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs font-medium leading-relaxed text-foreground/70 italic group-hover:text-foreground transition-colors max-w-2xl opacity-90">
                      &quot;{review.comment}&quot;
                    </p>

                    <div className="flex items-center gap-6 pt-3 border-t border-border/20">
                      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-600/80 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10 italic">
                        <CheckCircle2 size={10} />
                        Verified
                      </div>
                      <button className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground hover:text-emerald-600 transition-colors flex items-center gap-1.5 group/like">
                         <ThumbsUp size={10} className="fill-none group-hover/like:fill-emerald-500/20 transition-all" />
                         Helpful (12)
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          ))}
          
          <Button variant="ghost" className="w-full rounded-2xl h-11 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/5 transition-all mt-2">
             View All 243 Reviews
          </Button>
        </div>
      </div>
    </div>
  );
}
