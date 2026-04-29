import { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { getGreetingByTime } from "@/lib/greeting";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/clientDashboard/ClientDashboardNew";
import {
  CreditCard,
  Download,
  Search,
  Filter,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  AlertTriangle,
} from "lucide-react";

// Placeholder for common utility functions
const getGreetingByTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

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

const TransactionCard = ({ transaction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "text-green-600";
      case "processing":
        return "text-yellow-600";
      case "refunded":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-5 h-5" />;
      case "processing":
        return <Clock className="w-5 h-5" />;
      case "refunded":
        return <XCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      paid: "bg-green-100 text-green-600",
      processing: "bg-yellow-100 text-yellow-600", 
      refunded: "bg-red-100 text-red-600",
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

export default function ClientTransactions() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    pendingPayments: 0,
    refundedAmount: 0,
  });

  // Mock data - in real app, this would come from API
  const mockTransactions = [
    {
      id: "txn_001",
      invoiceNumber: "INV-2024-001",
      date: "2024-10-15",
      time: "10:30 AM",
      providerName: "Rajesh Kumar",
      service: "Plumbing Service",
      status: "paid",
      totalAmount: 1500,
      serviceAmount: 1200,
      fee: 50,
      description: "Kitchen pipe repair and installation"
    },
    {
      id: "txn_002",
      invoiceNumber: "INV-2024-002",
      date: "2024-10-10",
      time: "2:00 PM",
      providerName: "Priya Sharma",
      service: "Electrical Work",
      status: "processing",
      totalAmount: 800,
      serviceAmount: 800,
      fee: 0,
      description: "Fixing electrical wiring in living room"
    },
    {
      id: "txn_003",
      invoiceNumber: "INV-2024-003",
      date: "2024-10-05",
      time: "11:45 AM",
      providerName: "Amit Patel",
      service: "Cleaning Service",
      status: "refunded",
      totalAmount: 500,
      serviceAmount: 600,
      fee: 0,
      refundAmount: 500,
      refundDate: "2024-10-12",
      refundTime: "3:30 PM",
      description: "Cancelled due to scheduling conflict - full refund processed"
    },
    {
      id: "txn_004",
      invoiceNumber: "INV-2024-004",
      date: "2024-09-28",
      time: "4:15 PM",
      providerName: "Suresh Singh",
      service: "AC Repair",
      status: "paid",
      totalAmount: 2000,
      serviceAmount: 1800,
      fee: 200,
      description: "AC installation and maintenance for the year"
    },
  ];

  useEffect(() => {
    // Calculate summary from mock data
    const totalSpent = mockTransactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
    const pendingPayments = mockTransactions.filter(txn => txn.status === "processing").length;
    const refundedAmount = mockTransactions.reduce((sum, txn) => 
      txn.status === "refunded" ? sum + txn.refundAmount : sum, 0
    );

    setSummary({
      totalSpent,
      pendingPayments,
      refundedAmount,
    });

    // Filter transactions based on search and status
    const filteredTransactions = mockTransactions.filter(transaction => {
      const matchesSearch = transaction.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    setTransactions(filteredTransactions);
  }, [searchTerm, statusFilter, mockTransactions]);

  const handleDownloadInvoice = (transaction) => {
    // In real app, this would download from API
    toast.success(`Downloading invoice ${transaction.invoiceNumber}`);
    console.log(`Download invoice:`, transaction);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreetingByTime()}, {user?.name}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              View your transaction history, download invoices, and track payments.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Total Spent</h3>
                <p className="text-3xl font-bold text-primary">{formatCurrency(summary.totalSpent)}</p>
                <p className="text-sm text-muted-foreground mt-2">Lifetime service expenses</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Pending Payments</h3>
                <p className="text-3xl font-bold text-yellow-600">{summary.pendingPayments}</p>
                <p className="text-sm text-muted-foreground mt-2">Awaiting processing</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Refunded Amount</h3>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.refundedAmount)}</p>
                <p className="text-sm text-muted-foreground mt-2">Total refunds issued</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by provider, service, or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-4 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
            <p className="text-sm text-muted-foreground">
              {transactions.length} transactions found
            </p>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${getStatusColor(transaction.status)}`}>
                          {getStatusIcon(transaction.status)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{transaction.providerName}</h3>
                          <p className="text-sm text-muted-foreground">{transaction.service}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                          {getStatusBadge(transaction.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Invoice:</span>
                      <span className="ml-2">{transaction.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>
                      <span className="ml-2">{formatDate(transaction.date)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>
                      <span className="ml-2">{transaction.time}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div>
                      <span className="font-medium">Amount:</span>
                      <span className="ml-2 font-bold text-foreground">{formatCurrency(transaction.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Fee:</span>
                      <span className="ml-2">{formatCurrency(transaction.fee || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-muted-foreground">{transaction.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {getStatusBadge(transaction.status)}
                    </div>
                    
                    {transaction.status === "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(transaction)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground">Your transaction history will appear here once you complete bookings and payments.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
