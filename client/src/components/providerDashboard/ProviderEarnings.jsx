import { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Search,
  CreditCard,
  BanknoteIcon,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ProviderEarnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingAmount: 0,
    completedJobs: 0,
    averageJobValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadEarnings();
  }, [timeRange]);

  const loadEarnings = async () => {
    try {
      const response = await api.get(`/transactions?timeRange=${timeRange}`);
      setEarnings(response.data || []);
      
      // Calculate summary
      const transactions = response.data || [];
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const thisMonthEarnings = transactions
        .filter(t => {
          const date = new Date(t.createdAt);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const lastMonthEarnings = transactions
        .filter(t => {
          const date = new Date(t.createdAt);
          return date.getMonth() === (thisMonth - 1) && date.getFullYear() === thisYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingAmount = transactions
        .filter(t => t.status === "pending")
        .reduce((sum, t) => sum + t.amount, 0);

      const completedJobs = transactions
        .filter(t => t.status === "paid")
        .length;

      const totalEarnings = transactions
        .filter(t => t.status === "paid")
        .reduce((sum, t) => sum + t.amount, 0);

      const averageJobValue = completedJobs > 0 ? totalEarnings / completedJobs : 0;

      setSummary({
        totalEarnings,
        thisMonth: thisMonthEarnings,
        lastMonth: lastMonthEarnings,
        pendingAmount,
        completedJobs,
        averageJobValue,
      });
    } catch (error) {
      toast.error("Failed to load earnings");
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEarnings = earnings.filter(earning => {
    const matchesSearch = 
      earning.bookingId?.serviceId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      earning.clientId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      earning.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleWithdraw = async () => {
    try {
      // This would integrate with a payment system
      toast.info("Withdrawal feature coming soon!");
    } catch (error) {
      toast.error("Failed to process withdrawal");
    }
  };

  const downloadStatement = async () => {
    try {
      // Generate CSV or PDF statement
      const csvContent = [
        ["Date", "Transaction ID", "Client", "Service", "Amount", "Status", "Payment Method"],
        ...filteredEarnings.map(earning => [
          formatDate(earning.createdAt),
          earning.transactionId,
          earning.clientId?.name || "N/A",
          earning.bookingId?.serviceId?.name || "N/A",
          earning.amount,
          earning.status,
          earning.paymentMethod
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `earnings-statement-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Statement downloaded successfully");
    } catch (error) {
      toast.error("Failed to download statement");
      console.error("Error downloading statement:", error);
    }
  };

  const PaymentMethodIcon = ({ method }) => {
    const icons = {
      card: <CreditCard className="w-4 h-4" />,
      cash: <BanknoteIcon className="w-4 h-4" />,
      bank: <Wallet className="w-4 h-4" />,
    };
    return icons[method] || <Wallet className="w-4 h-4" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Earnings</h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Track your income, view transaction history, and manage withdrawals.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={downloadStatement}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Statement
            </Button>
            <Button
              onClick={handleWithdraw}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Withdraw
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Earnings</h3>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalEarnings)}</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.thisMonth)}</p>
            {summary.lastMonth > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {summary.thisMonth > summary.lastMonth ? (
                  <span className="text-green-600">↑ {((summary.thisMonth - summary.lastMonth) / summary.lastMonth * 100).toFixed(1)}% from last month</span>
                ) : (
                  <span className="text-red-600">↓ {((summary.lastMonth - summary.thisMonth) / summary.lastMonth * 100).toFixed(1)}% from last month</span>
                )}
              </p>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Amount</h3>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.pendingAmount)}</p>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Completed Jobs</h3>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{summary.completedJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(summary.averageJobValue)} per job
            </p>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={timeRange === "all" ? "default" : "outline"}
                onClick={() => setTimeRange("all")}
                size="sm"
              >
                All Time
              </Button>
              <Button
                variant={timeRange === "30d" ? "default" : "outline"}
                onClick={() => setTimeRange("30d")}
                size="sm"
              >
                Last 30 Days
              </Button>
              <Button
                variant={timeRange === "90d" ? "default" : "outline"}
                onClick={() => setTimeRange("90d")}
                size="sm"
              >
                Last 90 Days
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by client, service, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full p-3 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading transactions...</p>
            </div>
          ) : filteredEarnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Transaction ID</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Client</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Service</th>
                    <th className="text-right p-4 text-sm font-semibold text-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredEarnings.map((earning) => (
                    <tr key={earning._id} className="hover:bg-muted/10">
                      <td className="p-4 text-sm">{formatDate(earning.createdAt)}</td>
                      <td className="p-4 text-sm font-mono">{earning.transactionId}</td>
                      <td className="p-4 text-sm">{earning.clientId?.name || "N/A"}</td>
                      <td className="p-4 text-sm">{earning.bookingId?.serviceId?.name || "N/A"}</td>
                      <td className="p-4 text-sm text-right font-semibold">{formatCurrency(earning.amount)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          earning.status === "paid" 
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}>
                          {earning.status === "paid" ? "Completed" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <PaymentMethodIcon method={earning.paymentMethod} />
                          <span className="text-sm">{earning.paymentMethod}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-muted-foreground">
                <Wallet className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
                <p className="text-sm">Try adjusting your search or time range filter</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg p-6 border border-green-500/20">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-foreground">Monthly Growth</h3>
                <p className="text-2xl font-bold text-green-600">
                  {summary.lastMonth > 0 ? (
                    <span>+{((summary.thisMonth - summary.lastMonth) / summary.lastMonth * 100).toFixed(1)}%</span>
                  ) : (
                    <span>0%</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg p-6 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-foreground">Available Balance</h3>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalEarnings - summary.pendingAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
