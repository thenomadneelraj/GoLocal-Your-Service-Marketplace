import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet2,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  FileText,
  Loader2,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  initiateSocketConnection,
  subscribeToNotifications,
  disconnectSocket,
} from "@/lib/socket";
import { useAuth } from "@/components/contexts/AuthContext";

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const STATUS_COLORS = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  failed: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function ClientPayments() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 10;

  const fetchTransactions = useCallback(
    async (pg = 1) => {
      try {
        setLoading(true);
        const [txRes, dashRes] = await Promise.all([
          api.get(`/api/clients/stats/transactions?page=${pg}&limit=${LIMIT}`),
          api.get("/api/clients/stats/dashboard"),
        ]);

        const txData = txRes.data?.data || {};
        setTransactions(txData.items || []);
        setTotalPages(txData.pages || 1);
        setTotalCount(txData.total || 0);
        setPage(pg);

        const dashData = dashRes.data?.data?.summary || {};
        setTotalSpent(dashData.totalSpent || 0);
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Real-time: listen for new notifications that include payment events
  useEffect(() => {
    if (!user?.id) return;
    initiateSocketConnection(user.id);

    const unsub = subscribeToNotifications((err, payload) => {
      if (err) return;
      if (payload?.notification?.type === "payment") {
        fetchTransactions(1);
      }
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [user?.id, fetchTransactions]);

  const handleExport = () => {
    toast.info("Export functionality coming soon.");
  };

  const filtered = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.providerName?.toLowerCase().includes(q) ||
      tx.serviceType?.toLowerCase().includes(q) ||
      String(tx.id)?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance / Total Spent */}
        <div className="md:col-span-2 bg-primary p-8 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <Wallet2 size={20} />
                </div>
                <span className="font-semibold text-lg">Total Spent</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold uppercase tracking-widest leading-none">
                All Time
              </div>
            </div>

            <div>
              <p className="text-4xl font-bold tracking-tight mb-2">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-white/70 text-sm">
                {totalCount} transaction{totalCount !== 1 ? "s" : ""} recorded
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl h-12 border-white/30 bg-white/10 hover:bg-white text-white hover:text-primary transition-all font-semibold border-none"
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Linked Method placeholder */}
        <div className="bg-card/50 border border-border/60 p-8 rounded-[2rem] flex flex-col justify-between backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-primary/10">
            <CreditCard size={120} />
          </div>
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Payment Method
            </p>
            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/40 mb-2">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">UPI / COD</p>
                <p className="text-xs text-muted-foreground">
                  Supported Payment Methods
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <AlertCircle size={14} className="text-primary/60" />
            Payments are handled on booking.
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <section className="bg-card/40 border border-border/60 rounded-[2rem] overflow-hidden backdrop-blur-xl">
        <div className="p-8 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Transaction History
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review your service payments and past bookings.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search provider or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 pr-4 rounded-xl bg-muted/30 border border-border/40 focus:ring-2 focus:ring-primary/20 outline-none text-sm w-full md:w-64"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4 text-xs font-semibold gap-2 border-border/40"
              onClick={() => fetchTransactions(1)}
            >
              <RefreshCcw size={14} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4 text-xs font-semibold gap-2 border-border/40"
              onClick={handleExport}
            >
              <Download size={14} />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={40} className="text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No transactions found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions are created when you book a service.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-muted/10 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <tr>
                  <th className="px-8 py-5 font-bold">Details</th>
                  <th className="px-8 py-5 font-bold">Transaction ID</th>
                  <th className="px-8 py-5 font-bold">Date</th>
                  <th className="px-8 py-5 font-bold text-right">Amount</th>
                  <th className="px-8 py-5 font-bold text-center">Status</th>
                  <th className="px-8 py-5 font-bold text-center">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-muted/10 group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border bg-primary/10 text-primary border-primary/20">
                          <ArrowUpRight size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {tx.serviceType || "Service"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tx.providerName || "Provider"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/30 font-semibold">
                        {String(tx.id).slice(-10).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-foreground">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-right text-foreground">
                      -{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                            STATUS_COLORS[tx.status] ||
                            STATUS_COLORS.pending
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center text-xs text-muted-foreground font-medium capitalize">
                      {tx.paymentMethod || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {totalCount} total transactions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => fetchTransactions(page - 1)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => fetchTransactions(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
