import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, BriefcaseBusiness, UserCheck, ShieldCheck, Sparkles, Server, CheckCircle2,
  AlertTriangle, CreditCard, Activity, ArrowUpRight, ArrowDownRight, MoreVertical, Search, Download
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import CountUp from "react-countup";
import api from "@/lib/api";
import { useAuth } from "@/components/contexts/AuthContext";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import DashboardCard from "../ui/DashboardCard";
import ChartWrapper from "../ui/ChartWrapper";

const CATEGORY_COLORS = ["#38bdf8", "#4ade80", "#fbbf24", "#f97316", "#a855f7"];

const mockPlatformTrend = [
  { month: "Jan", revenue: 4000, bookings: 2400 },
  { month: "Feb", revenue: 3000, bookings: 1398 },
  { month: "Mar", revenue: 2000, bookings: 9800 },
  { month: "Apr", revenue: 2780, bookings: 3908 },
  { month: "May", revenue: 1890, bookings: 4800 },
  { month: "Jun", revenue: 2390, bookings: 3800 },
];

const mockUsers = [
  { name: "Priya Sharma", type: "Client", status: "Verified", joined: "May 20, 2024" },
  { name: "Rajesh Kumar", type: "Provider", status: "Verified", joined: "May 19, 2024" },
  { name: "Amit Verma", type: "Client", status: "Pending", joined: "May 18, 2024" },
  { name: "Neha Singh", type: "Provider", status: "Banned", joined: "May 15, 2024" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState({
    totalUsers: 12547,
    totalProviders: 2563,
    totalClients: 9704,
    monthlyRevenue: 845000,
  });
  
  const [loading, setLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [usersList, setUsersList] = useState(mockUsers);

  const displayName = useMemo(() => {
    const full = user?.name || "";
    return full || "Admin";
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const handleUserAction = (action) => {
    if (!actionDialog) return;
    
    if (actionDialog.type === 'verify') {
      toast.success(`${actionDialog.user} has been verified.`);
      setUsersList(prev => prev.map(u => u.name === actionDialog.user ? {...u, status: "Verified"} : u));
    } else if (actionDialog.type === 'ban') {
       toast.error(`${actionDialog.user} has been banned.`);
       setUsersList(prev => prev.map(u => u.name === actionDialog.user ? {...u, status: "Banned"} : u));
    }
    setActionDialog(null);
  };

  const recentActivity = [
    { text: "New provider registered", time: "2 min ago", type: "provider" },
    { text: "Payment received + ₹1,500", time: "15 min ago", type: "payment" },
    { text: "New booking: Home Cleaning", time: "1 hour ago", type: "booking" },
    { text: "Dispute resolved #BKN1234", time: "2 hours ago", type: "dispute" },
  ];

  return (
    <motion.div
      initial="hidden" animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
      className="space-y-6 pb-12 max-w-7xl mx-auto"
    >
      {/* Header matching original style but adapted for tabs */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1">
            {greeting}, <span className="text-primary">{displayName}</span> <span className="text-2xl">👋</span>
          </h1>
          <p className="text-muted-foreground">Here's what's happening on your platform today.</p>
        </div>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Tabs.List className="flex overflow-x-auto pb-2 gap-2 border-b border-border mb-6 no-scrollbar">
          {["Overview", "User Management", "Analytics & Reports"].map(tab => (
            <Tabs.Trigger 
              key={tab} 
              value={tab.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}
              className="px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all focus:outline-none whitespace-nowrap"
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <Tabs.Content value="overview" forceMount asChild>
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                 
                 {/* KPI Cards */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DashboardCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} trend={+3.4} trendLabel="vs today" colorClass="text-indigo-500" />
                    <DashboardCard title="Providers" value={stats.totalProviders.toLocaleString()} icon={BriefcaseBusiness} trend={+12} trendLabel="vs today" colorClass="text-emerald-500" />
                    <DashboardCard title="Clients" value={stats.totalClients.toLocaleString()} icon={UserCheck} trend={+5} trendLabel="vs today" colorClass="text-sky-500" />
                    <DashboardCard title="Revenue" value={`₹${(stats.monthlyRevenue/100000).toFixed(2)}L`} icon={CreditCard} trend={+12} trendLabel="vs today" colorClass="text-amber-500" />
                 </div>

                 <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                       <ChartWrapper title="Platform Overview" height={300}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockPlatformTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border opacity-50" />
                              <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dy={10} />
                              <YAxis stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dx={-10} yAxisId="left" />
                              <YAxis stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dx={10} yAxisId="right" orientation="right" />
                              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                              <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#38bdf8" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{ r: 6 }} name="Bookings" />
                              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{ r: 6 }} name="Revenue" />
                            </LineChart>
                          </ResponsiveContainer>
                       </ChartWrapper>

                       <div className="grid md:grid-cols-2 gap-6">
                         <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                           <h3 className="font-bold text-sm mb-4">System Status</h3>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                                <span className="flex items-center gap-2 text-sm font-medium"><Server size={16} className="text-muted-foreground"/> Server Health</span>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Operational</span>
                              </div>
                              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                                <span className="flex items-center gap-2 text-sm font-medium"><CreditCard size={16} className="text-muted-foreground"/> Payment Gateway</span>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Online</span>
                              </div>
                              <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
                                <span className="flex items-center gap-2 text-sm font-medium"><Activity size={16} className="text-muted-foreground"/> App Status</span>
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={12}/> All Systems</span>
                              </div>
                           </div>
                         </div>
                         <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-sm mb-4">Open Resolutions</h3>
                            <div className="flex justify-between gap-4 mt-8">
                               <div className="flex-1text-center flex flex-col items-center">
                                 <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 flex items-center justify-center text-rose-500 font-bold mb-2">8</div>
                                 <span className="text-xs text-muted-foreground font-medium uppercase text-center w-full block">Providers</span>
                               </div>
                               <div className="flex-1text-center flex flex-col items-center">
                                 <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 flex items-center justify-center text-amber-500 font-bold mb-2">3</div>
                                 <span className="text-xs text-muted-foreground font-medium uppercase text-center w-full block">Reviews</span>
                               </div>
                               <div className="flex-1text-center flex flex-col items-center">
                                 <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold mb-2">5</div>
                                 <span className="text-xs text-muted-foreground font-medium uppercase text-center w-full block">Disputes</span>
                               </div>
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-sm">Recent Activity</h3>
                            <button className="text-[10px] text-primary hover:underline">View All</button>
                          </div>
                          <div className="space-y-4">
                             {recentActivity.map((act, i) => (
                               <div key={i} className="flex gap-3 justify-between items-center group cursor-pointer">
                                 <div className="flex gap-3 items-center">
                                    <div className={`w-2 h-2 rounded-full ${act.type === 'provider' ? 'bg-sky-500' : act.type === 'payment' ? 'bg-emerald-500' : act.type === 'booking' ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
                                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition">{act.text}</p>
                                 </div>
                                 <span className="text-[10px] text-muted-foreground">{act.time}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <ChartWrapper title="Bookings by Category" height={220}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{name: 'Cleaning', value: 35}, {name:'Plumbing', value:30}, {name:'Salon', value:20}, {name:'Repairs', value:10}, {name:'Others', value:5}]} 
                                   cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                                {CATEGORY_COLORS.map((color, i) => (
                                  <Cell key={`cell-${i}`} fill={color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                       </ChartWrapper>
                    </div>
                 </div>
              </motion.div>
            </Tabs.Content>
          )}

          {activeTab === "user-management" && (
            <Tabs.Content value="user-management" forceMount asChild>
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DashboardCard title="Total Users" value="12,547" trend={82} trendLabel="vs last month" colorClass="text-indigo-500" />
                    <DashboardCard title="Active Users" value="11,234" colorClass="text-emerald-500" />
                    <DashboardCard title="Verified Users" value="10,890" colorClass="text-sky-500" />
                    <DashboardCard title="Banned Users" value="423" colorClass="text-rose-500" />
                 </div>

                 <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                       <div className="p-5 flex justify-between items-center border-b border-border">
                         <div className="flex gap-4 items-center">
                           <h3 className="font-bold text-lg">All Users</h3>
                           <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">(12,547)</span>
                         </div>
                         <button onClick={() => toast.info('Add user modal initiated')} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                           + Add User
                         </button>
                       </div>
                       
                       <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase border-b border-border">
                              <tr>
                                <th className="px-6 py-3 font-medium">User</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Joined</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                               {usersList.map((u, i) => (
                                 <tr key={i} className="hover:bg-muted/30 transition-colors">
                                   <td className="px-6 py-4 font-bold text-foreground text-xs">{u.name}</td>
                                   <td className="px-6 py-4 text-xs font-medium">
                                      <span className={u.type === 'Provider' ? 'text-indigo-500' : 'text-sky-500'}>{u.type}</span>
                                   </td>
                                   <td className="px-6 py-4">
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.status==='Verified'?'bg-emerald-500/10 text-emerald-500':u.status==='Pending'?'bg-amber-500/10 text-amber-500':'bg-rose-500/10 text-rose-500'}`}>{u.status}</span>
                                   </td>
                                   <td className="px-6 py-4 text-xs text-muted-foreground">{u.joined}</td>
                                   <td className="px-6 py-4 text-right flex justify-end gap-2">
                                      {u.status === 'Pending' && <button onClick={() => setActionDialog({user: u.name, type: 'verify'})} className="px-2 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded text-[10px] font-bold">Verify</button>}
                                      {u.status !== 'Banned' && <button onClick={() => setActionDialog({user: u.name, type: 'ban'})} className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded text-[10px] font-bold">Ban</button>}
                                      {u.status === 'Banned' && <button onClick={() => setActionDialog({user: u.name, type: 'verify'})} className="px-2 py-1 bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 rounded text-[10px] font-bold">Unban</button>}
                                   </td>
                                 </tr>
                               ))}
                            </tbody>
                          </table>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                         <h3 className="font-bold text-sm mb-4">Quick Actions</h3>
                         <div className="space-y-2">
                           <button onClick={() => toast.success('Verification started')} className="w-full text-left px-4 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-sm">Bulk Verify Users</button>
                           <button onClick={() => toast.success('Export initiated')} className="w-full text-left px-4 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-sm">Export User List</button>
                           <button onClick={() => toast.success('Notification sent')} className="w-full text-left px-4 py-2.5 bg-muted text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-muted/80 transition">Send Notification</button>
                           <button onClick={() => toast.success('Roles view opened')} className="w-full text-left px-4 py-2.5 bg-muted text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-muted/80 transition">Manage Roles</button>
                         </div>
                       </div>

                       <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
                          <h3 className="font-bold text-sm mb-2">User Growth</h3>
                          <p className="text-xs text-muted-foreground mb-4">This Month <span className="text-emerald-500 font-bold ml-1">+345</span> <span className="text-[10px]">vs last 30 days</span></p>
                          <div className="h-24">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={[{v:100},{v:120},{v:110},{v:140},{v:130},{v:160}]}>
                                 <defs><linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                                 <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                                 <Area type="monotone" dataKey="v" stroke="#38bdf8" fillOpacity={1} fill="url(#colorGrowth)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
            </Tabs.Content>
          )}

          {activeTab === "analytics-reports" && (
            <Tabs.Content value="analytics-reports" forceMount asChild>
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Total Revenue</p>
                    <p className="text-2xl font-bold">₹8.45 Lakhs</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Total Bookings</p>
                    <p className="text-2xl font-bold flex items-center gap-2">2,450 <span className="text-emerald-500 text-xs">+6.2%</span></p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Active Users</p>
                    <p className="text-2xl font-bold flex items-center gap-2">12,547 <span className="text-emerald-500 text-xs">+15.3%</span></p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Avg. Rating</p>
                    <p className="text-2xl font-bold flex items-center gap-2">4.8 <span className="text-emerald-500 text-xs">+0.2</span></p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                   <ChartWrapper title="Bookings Overview" height={280}>
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={mockPlatformTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={24}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border opacity-50" />
                         <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dy={10} />
                         <YAxis stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dx={-10} />
                         <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                         <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                       </BarChart>
                     </ResponsiveContainer>
                   </ChartWrapper>
                   
                   <ChartWrapper title="Revenue Analytics" height={280}>
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={mockPlatformTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border opacity-50" />
                          <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="currentColor" className="text-muted-foreground text-xs" tickLine={false} axisLine={false} dx={-10} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                          <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                       </AreaChart>
                     </ResponsiveContainer>
                   </ChartWrapper>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                   <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-sm mb-4">Top Services</h3>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex gap-2 items-center"><div className="w-5 h-5 bg-sky-500/10 text-sky-500 rounded flex items-center justify-center font-bold text-[10px]">1</div> Home Cleaning</span>
                            <span className="font-bold">745 bookings</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex gap-2 items-center"><div className="w-5 h-5 bg-sky-500/10 text-sky-500 rounded flex items-center justify-center font-bold text-[10px]">2</div> Plumbing</span>
                            <span className="font-bold">612 bookings</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex gap-2 items-center"><div className="w-5 h-5 bg-sky-500/10 text-sky-500 rounded flex items-center justify-center font-bold text-[10px]">3</div> Salon & Spa</span>
                            <span className="font-bold">488 bookings</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="flex gap-2 items-center"><div className="w-5 h-5 bg-sky-500/10 text-sky-500 rounded flex items-center justify-center font-bold text-[10px]">4</div> Electrical</span>
                            <span className="font-bold">375 bookings</span>
                         </div>
                      </div>
                   </div>

                   <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-sm mb-4">Reports Overview</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                         <div className="border border-border p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-primary/50 transition" onClick={() => toast.success('Report downloaded')}>
                           <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center"><Download size={18} /></div>
                              <div>
                                <p className="font-bold text-sm">Monthly Report</p>
                                <p className="text-[10px] text-muted-foreground">Ready to download</p>
                              </div>
                           </div>
                           <div className="h-8 w-16 opacity-50 group-hover:opacity-100 transition"><ResponsiveContainer><LineChart data={[{v:0},{v:1},{v:2},{v:3}]}><Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>
                         </div>
                         
                         <div className="border border-border p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-primary/50 transition" onClick={() => toast.success('Report downloaded')}>
                           <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded flex items-center justify-center"><Download size={18} /></div>
                              <div>
                                <p className="font-bold text-sm">Revenue Report</p>
                                <p className="text-[10px] text-muted-foreground">Last 30 days</p>
                              </div>
                           </div>
                           <div className="h-8 w-16 opacity-50 group-hover:opacity-100 transition"><ResponsiveContainer><LineChart data={[{v:2},{v:1},{v:5},{v:3}]}><Line type="monotone" dataKey="v" stroke="#10b981" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>
                         </div>

                         <div className="border border-border p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-primary/50 transition">
                           <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded flex items-center justify-center"><Users size={18} /></div>
                              <div>
                                <p className="font-bold text-sm">User Bookings</p>
                                <p className="text-[10px] text-muted-foreground">This month</p>
                              </div>
                           </div>
                           <div className="h-8 w-16 opacity-50 group-hover:opacity-100 transition"><ResponsiveContainer><LineChart data={[{v:1},{v:4},{v:2},{v:8}]}><Line type="monotone" dataKey="v" stroke="#f59e0b" dot={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>
                         </div>

                         <div className="border border-border border-dashed p-4 rounded-xl flex items-center justify-center group cursor-pointer hover:border-primary transition hover:bg-muted/20" onClick={() => toast.info('Custom report generator opened')}>
                           <div className="flex flex-col items-center gap-1 text-primary">
                             <div className="w-8 h-8 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center"><Sparkles size={14}/></div>
                             <span className="text-xs font-bold text-foreground">Create Custom Report</span>
                           </div>
                         </div>
                      </div>
                   </div>
                </div>

              </motion.div>
            </Tabs.Content>
          )}

        </AnimatePresence>
      </Tabs.Root>

      {/* Action Dialog */}
      <AlertDialog.Root open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in" />
          <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg animate-in zoom-in-95">
            <div className="flex flex-col gap-2">
              <AlertDialog.Title className="text-lg font-semibold flex items-center gap-2">
                {actionDialog?.type === 'verify' ? <span className="text-emerald-500 flex items-center gap-2"><CheckCircle2/> Verify User</span> : <span className="text-rose-500 flex items-center gap-2"><AlertTriangle/> Ban User</span>}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted-foreground mt-2">
                {actionDialog?.type === 'verify' 
                  ? `Are you sure you want to verify the account of ${actionDialog?.user}? This will grant them full access.`
                  : `Are you sure you want to ban ${actionDialog?.user}? They will no longer be able to access the platform.`}
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <AlertDialog.Cancel asChild>
                <button className="px-4 py-2 border border-input bg-background hover:bg-muted rounded-md text-sm font-medium transition-colors">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  onClick={() => handleUserAction(actionDialog?.type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${actionDialog?.type === 'verify' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                >
                  {actionDialog?.type === 'verify' ? 'Verify' : 'Ban User'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

    </motion.div>
  );
}
