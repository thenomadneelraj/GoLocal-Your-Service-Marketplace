import React, { useState } from "react";
import { 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  History, 
  Banknote,
  MoreVertical,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TRANSACTIONS = [
  { id: "TX-1002", type: "payout", amount: "₹12,450", date: "2026-03-25", status: "completed", description: "Monthly Payout - IDBI Bank" },
  { id: "TX-1001", type: "earnings", amount: "+₹2,500", date: "2026-03-24", status: "completed", description: "Booking BK-8821 - Deep House Cleaning" },
  { id: "TX-1000", type: "earnings", amount: "+₹1,800", date: "2026-03-23", status: "completed", description: "Booking BK-8820 - Kitchen Deep Clean" },
  { id: "TX-0999", type: "earnings", amount: "+₹4,200", date: "2026-03-22", status: "pending", description: "Booking BK-8819 - Full Apartment Sanitization" }
];

export default function ProviderEarnings() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header & Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Wallet Balance */}
        <div className="lg:col-span-2 relative bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-xs">
                <Wallet size={12} />
                Wallet balance
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight text-foreground italic">₹42,850</h1>
                <p className="text-muted-foreground mt-2 text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest leading-none">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 font-black">+12%</span> vs last month
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[160px]">
              <Button size="lg" className="rounded-xl h-11 text-xs font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-md gap-2">
                <Banknote size={16} />
                Request Payout
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl h-11 text-xs font-black uppercase tracking-widest border-border/60 hover:bg-muted/50 gap-2 shadow-xs">
                <CreditCard size={16} />
                Linked Accounts
              </Button>
            </div>
          </div>
        </div>

        {/* Small Stats */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/20 shadow-xs">
                <Clock size={18} />
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">Pending Payout</p>
            <p className="text-2xl font-black leading-none italic">₹8,200</p>
          </div>
          <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xs">
                <History size={18} />
              </div>
              <Download size={16} className="text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">Last Payout</p>
            <p className="text-2xl font-black leading-none italic">₹24,500</p>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Transactions</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">Earnings and payout history.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            <div className="relative group flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search history..." 
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
              />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 shadow-xs">
              <Filter size={16} className="text-muted-foreground" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted/50 shadow-xs">
              <Download size={16} className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden bg-card/30 border border-border/60 rounded-[2rem] backdrop-blur-sm shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">Descriptor</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">Date</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">Amount</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">Status</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-emerald-500/5 transition-all duration-300">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                          tx.type === "earnings" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        }`}>
                          {tx.type === "earnings" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{tx.description}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-bold tracking-widest opacity-60">{tx.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center text-[10px] font-bold text-muted-foreground">{tx.date}</td>
                    <td className="px-8 py-4 text-center">
                      <p className={`text-sm font-black italic ${tx.type === "earnings" ? "text-emerald-600" : "text-orange-600"}`}>
                        {tx.amount}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                        tx.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}>
                        {tx.status === "completed" ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                        {tx.status}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-600">
                        <MoreVertical size={14} className="text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
