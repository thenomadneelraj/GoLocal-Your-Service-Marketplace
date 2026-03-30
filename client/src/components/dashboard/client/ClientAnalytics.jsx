import React, { useState } from "react";
import { 
  BarChart3, 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  Download,
  Activity,
  PieChart as PieChartIcon,
  CircleDollarSign,
  Briefcase
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Button } from "@/components/ui/button";

const MOCK_LINE_DATA = [
  { name: "Jan", spent: 3200, bookings: 4 },
  { name: "Feb", spent: 4500, bookings: 6 },
  { name: "Mar", spent: 2800, bookings: 3 },
  { name: "Apr", spent: 5100, bookings: 8 },
  { name: "May", spent: 4200, bookings: 5 },
  { name: "Jun", spent: 6300, bookings: 9 },
];

const MOCK_PIE_DATA = [
  { name: "Plumbing", value: 35, color: "hsl(var(--primary))" },
  { name: "Cleaning", value: 45, color: "rgb(56, 189, 248)" },
  { name: "Electrical", value: 20, color: "rgb(129, 140, 248)" },
];

export default function ClientAnalytics() {
  const [range, setRange] = useState("6m");

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden transition-all">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Spending Analytics</h1>
          <p className="text-muted-foreground mt-2 max-w-md">Visualize your platform usage, category-wise spending, and savings trends over time.</p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-full border border-border/70 bg-muted/60 p-1">
            {["1m", "3m", "6m", "1y"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Button variant="outline" className="h-10 rounded-full px-5 text-xs font-bold gap-2 border-border/60">
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: "Total Spent", value: "₹26,100", trend: "+12.5%", icon: CircleDollarSign, accent: "text-primary bg-primary/10 border-primary/20" },
          { label: "Active Bookings", value: "14", trend: "+2", icon: Briefcase, accent: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
          { label: "Avg. Task Value", value: "₹1,864", trend: "-5.2%", icon: TrendingUp, accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Savings Generated", value: "₹2,450", trend: "+8.3%", icon: Activity, accent: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
        ].map((metric) => (
          <div key={metric.label} className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:shadow-xl hover:shadow-primary/5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${metric.accent}`}>
                <metric.icon size={22} />
              </span>
              <span className={`text-xs font-bold ${metric.trend.startsWith("+") ? "text-emerald-500" : "text-rose-500"} bg-muted/50 px-2 py-1 rounded-lg`}>
                {metric.trend}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">{metric.label}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Spending Area Chart */}
        <div className="lg:col-span-2 bg-card/40 border border-border/60 rounded-[3rem] p-8 backdrop-blur-md">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Spending & Usage Trend</h2>
              <p className="text-sm text-muted-foreground mt-1 tracking-tight">Comparison of monthly expenditures relative to booking volume.</p>
            </div>
          </div>
          
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_LINE_DATA}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "24px", 
                    border: "1px solid hsl(var(--border))", 
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    background: "hsl(var(--card))",
                    backdropFilter: "blur(12px)"
                  }} 
                />
                <Area type="monotone" dataKey="spent" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorSpent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown Pie Chart */}
        <div className="bg-card/40 border border-border/60 rounded-[3rem] p-8 backdrop-blur-md flex flex-col items-center">
          <div className="mb-10 w-full">
            <h2 className="text-xl font-semibold tracking-tight">Category Breakdown</h2>
            <p className="text-sm text-muted-foreground mt-1">Distribution of your service requests.</p>
          </div>

          <div className="h-[240px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={MOCK_PIE_DATA} 
                  innerRadius={70} 
                  outerRadius={90} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
                >
                  {MOCK_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-background border border-border/40 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-muted-foreground font-bold">TOP</p>
                <p className="font-bold text-sm text-foreground">Cleaning</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4 w-full">
            {MOCK_PIE_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors italic leading-relaxed">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
