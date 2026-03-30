import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Star, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  LayoutGrid,
  BarChart3
} from "lucide-react";

const DATA = [
  { name: "Jan", revenue: 42000, bookings: 45 },
  { name: "Feb", revenue: 38000, bookings: 40 },
  { name: "Mar", revenue: 55000, bookings: 58 },
  { name: "Apr", revenue: 48000, bookings: 52 },
  { name: "May", revenue: 62000, bookings: 65 },
  { name: "Jun", revenue: 75000, bookings: 78 }
];

const CATEGORY_DATA = [
  { name: "Plumbing", value: 40, color: "#10b981" },
  { name: "Electrical", value: 30, color: "#3b82f6" },
  { name: "Cleaning", value: 20, color: "#f59e0b" },
  { name: "Carpentry", value: 10, color: "#ef4444" }
];

export default function ProviderAnalytics() {
  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: "₹4,28,500", trend: "+12.5%", icon: TrendingUp, color: "emerald" },
          { label: "Bookings", value: "1,248", trend: "+8.2%", icon: Calendar, color: "blue" },
          { label: "Clients", value: "856", trend: "-2.4%", icon: Users, color: "violet" },
          { label: "Rating", value: "4.85/5", trend: "+0.1%", icon: Star, color: "amber" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                stat.color === "blue" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                stat.color === "violet" ? "bg-violet-500/10 text-violet-600 border-violet-500/20" :
                "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}>
                <stat.icon size={20} />
              </div>
              <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest leading-none ${
                stat.trend.startsWith("+") ? "text-emerald-500" : "text-rose-500"
              }`}>
                {stat.trend.startsWith("+") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">{stat.label}</p>
            <p className="text-2xl font-bold tracking-tight leading-none italic">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-8 bg-card/40 border border-border/60 rounded-[2rem] p-8 backdrop-blur-sm relative overflow-hidden group shadow-xs">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-110">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Revenue Trends</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">Monthly performance analysis.</p>
              </div>
            </div>
            <select className="bg-muted text-foreground px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border border-border/60 outline-none h-10 shadow-xs">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: "#9ca3af", fontWeight: 700 }}
                  tickFormatter={(val) => `₹${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    border: "1px solid #e5e7eb", 
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    backgroundColor: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(4px)",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="url(#revenueFill)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-4 bg-card/40 border border-border/60 rounded-[2rem] p-8 backdrop-blur-sm relative group overflow-hidden shadow-xs">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs transition-transform group-hover:scale-110">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Distribution</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">Jobs by category.</p>
            </div>
          </div>

          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={6}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1500}
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xl font-bold text-foreground">1.2k</p>
              <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest mt-1 opacity-60">Jobs</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {CATEGORY_DATA.map((item, i) => (
              <div key={i} className="flex items-center justify-between group/item p-2 hover:bg-muted/30 rounded-lg transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{item.name}</span>
                </div>
                <span className="text-[9px] font-black text-foreground group-hover/item:text-emerald-500 transition-colors uppercase tracking-widest leading-none">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

  );
}
