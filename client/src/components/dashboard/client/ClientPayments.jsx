import React, { useState } from "react";
import { 
  Wallet2, 
  Download, 
  ExternalLink, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  FileText,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_TRANSACTIONS = [
  {
    id: "TX-9021",
    provider: "Arjun Sharma",
    service: "Plumbing Repair",
    date: "2024-03-22",
    amount: 1200,
    status: "paid",
    type: "debit"
  },
  {
    id: "TX-9022",
    provider: "Priya Patel",
    service: "Deep Cleaning",
    date: "2024-03-18",
    amount: 2500,
    status: "paid",
    type: "debit"
  },
  {
    id: "TX-9023",
    provider: "GoLocal Wallet",
    service: "Wallet Top-up",
    date: "2024-03-15",
    amount: 5000,
    status: "paid",
    type: "credit"
  },
  {
    id: "TX-9024",
    provider: "Suresh Mani",
    service: "Electrical Checkup",
    date: "2024-03-10",
    amount: 399,
    status: "pending",
    type: "debit"
  }
];

export default function ClientPayments() {
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="space-y-6 pb-10">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-primary p-8 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <Wallet2 size={20} />
                </div>
                <span className="font-semibold text-lg">Total Balance</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold uppercase tracking-widest leading-none">
                Default
              </div>
            </div>
            
            <div>
              <p className="text-4xl font-bold tracking-tight mb-2">₹5,432.00</p>
              <p className="text-white/70 text-sm">Updated 5 minutes ago • Last sync successful</p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-white/30 bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-semibold gap-2 border-none">
                Add Funds
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl h-12 border-white/30 bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-semibold gap-2 border-none">
                Manage Cards
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-card/50 border border-border/60 p-8 rounded-[2rem] flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-primary/10">
            <CreditCard size={120} />
          </div>
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Linked Account</p>
            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/40 mb-2">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">HDFC Bank • 4321</p>
                <p className="text-xs text-muted-foreground">Primary Method</p>
              </div>
            </div>
          </div>
          <Button variant="link" className="text-primary text-xs font-semibold p-0 h-auto justify-start self-start group underline-offset-4 decoration-primary/20">
            Link New Bank Account
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Transactions Section */}
      <section className="bg-card/40 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl transition-all">
        <div className="p-8 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Recent Transactions</h2>
            <p className="text-sm text-muted-foreground mt-1">Review your service payments and wallet history.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search tx ID or service..."
                className="h-10 pl-10 pr-4 rounded-xl bg-muted/30 border border-border/40 focus:ring-2 focus:ring-primary/20 outline-none text-sm w-full md:w-64"
              />
            </div>
            <Button variant="outline" className="h-10 rounded-xl px-4 text-xs font-semibold gap-2 border-border/40">
              <Filter size={14} />
              Filter
            </Button>
            <Button variant="outline" className="h-10 rounded-xl px-4 text-xs font-semibold gap-2 border-border/40">
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-muted/10 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <tr>
                <th className="px-8 py-5 font-bold">Details</th>
                <th className="px-8 py-5 font-bold">Transaction ID</th>
                <th className="px-8 py-5 font-bold">Date</th>
                <th className="px-8 py-5 font-bold text-right">Amount</th>
                <th className="px-8 py-5 font-bold text-center">Status</th>
                <th className="px-8 py-5 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-muted/10 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${
                        tx.type === "credit" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"
                      }`}>
                        {tx.type === "credit" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{tx.service}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.provider}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/30 font-semibold">{tx.id}</span>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-foreground">
                    {new Date(tx.date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className={`px-8 py-6 text-sm font-bold text-right ${tx.type === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                        tx.status === "paid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <button className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-primary transition-all">
                        <FileText size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 border-t border-border/40 bg-muted/5 flex items-center justify-between text-sm text-muted-foreground italic leading-relaxed">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-primary/60" />
            <span>Need a custom statement for tax purposes?</span>
          </div>
          <Button variant="link" className="text-primary text-xs font-bold p-0 underline-offset-4 decoration-primary/20">
            Request Statement →
          </Button>
        </div>
      </section>
    </div>
  );
}
