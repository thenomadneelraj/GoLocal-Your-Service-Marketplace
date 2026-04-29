import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  Download,
  FileDown,
  FileText,
  Loader2,
  RefreshCcw,
  Search,
  Wallet2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";
import {
  disconnectSocket,
  initiateSocketConnection,
  subscribeToNotifications,
} from "@/lib/socket";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockClientTransactions } from "@/lib/mockWorkspaceData";

const LIMIT = 10;

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "N/A";
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
  refunded: "bg-slate-500/10 text-slate-600 border-slate-500/20",
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
  const [downloadFormat, setDownloadFormat] = useState("csv");

  const fetchTransactions = useCallback(async (nextPage = 1) => {
    try {
      setLoading(true);
      const response = await api.get("/api/transactions", {
        params: {
          page: nextPage,
          limit: LIMIT,
        },
      });

      const payload = response.data?.data || {};
      setTransactions(payload.items || []);
      setTotalPages(payload.pages || 1);
      setTotalCount(payload.total || 0);
      setPage(nextPage);
      setTotalSpent(payload.summary?.totalSpent || 0);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user?.id) return undefined;

    initiateSocketConnection(user.id, user.role);
    const unsubscribe = subscribeToNotifications((error, payload) => {
      if (error) return;
      if (payload?.notification?.type === "payment") {
        fetchTransactions(1);
      }
    });

    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [fetchTransactions, user?.id, user?.role]);

  const downloadBlob = (blobData, filename) => {
    const blob = new Blob([blobData]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const extension = downloadFormat === "xlsx" ? "xlsx" : downloadFormat;

    try {
      toast.loading("Generating export...");
      const response = await api.get("/api/transactions/export", {
        params: { format: downloadFormat },
        responseType: "blob",
      });
      downloadBlob(response.data, `golocal-transactions-${Date.now()}.${extension}`);
      toast.dismiss();
      toast.success("Transactions exported successfully.");
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error("Failed to export transactions.");
    }
  };

  const handleDownloadInvoice = async (transactionId) => {
    const extension = downloadFormat === "xlsx" ? "xlsx" : downloadFormat;

    try {
      toast.loading("Generating invoice...");
      const response = await api.get(`/api/transactions/${transactionId}/invoice`, {
        params: { format: downloadFormat },
        responseType: "blob",
      });
      downloadBlob(response.data, `invoice-${transactionId}.${extension}`);
      toast.dismiss();
      toast.success("Invoice downloaded successfully.");
    } catch (error) {
      console.error("Invoice download error:", error);
      toast.dismiss();
      toast.error("Failed to download invoice.");
    }
  };

  const layeredTransactions = useMemo(
    () =>
      mergeLayeredCollections(transactions, mockClientTransactions, {
        getId: (transaction) => transaction.id,
      }),
    [transactions]
  );
  const fallbackTotalSpent = layeredTransactions.reduce(
    (sum, transaction) =>
      transaction.dataOrigin === "mock" || transaction.status === "paid"
        ? sum + Number(transaction.totalPaidByClient || transaction.amount || 0)
        : sum,
    0
  );
  const resolvedTotalSpent = totalSpent || fallbackTotalSpent;
  const totalSpentOrigin = totalSpent > 0 ? "real" : "mock";

  const filteredTransactions = layeredTransactions.filter((transaction) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return [
      transaction.providerName,
      transaction.serviceTitle,
      transaction.providerServiceType,
      transaction.transactionId,
      transaction.invoiceNumber,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-white shadow-xl shadow-primary/20 md:col-span-2">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 opacity-50 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
                  <Wallet2 size={20} />
                </div>
                <span className="text-lg font-semibold">Total Spent</span>
                <DataOriginBadge
                  origin={totalSpentOrigin}
                  liveLabel="Live"
                  sampleLabel="Sample"
                  className="border-white/30 bg-white/10 text-white"
                />
              </div>
              <div className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest leading-none backdrop-blur-md">
                All Time
              </div>
            </div>

            <div>
              <p className="mb-2 text-4xl font-bold tracking-tight">
                {formatCurrency(resolvedTotalSpent)}
              </p>
              <p className="text-sm text-white/70">
                {layeredTransactions.length} transaction{layeredTransactions.length !== 1 ? "s" : ""} recorded
              </p>
            </div>

            <div className="flex gap-4">
              <select
                value={downloadFormat}
                onChange={(event) => setDownloadFormat(event.target.value)}
                className="rounded-2xl border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white"
              >
                <option value="csv" className="text-slate-900">
                  CSV
                </option>
                <option value="xlsx" className="text-slate-900">
                  XLSX
                </option>
                <option value="pdf" className="text-slate-900">
                  PDF
                </option>
              </select>
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-none bg-white/10 font-semibold text-white transition-all hover:bg-white hover:text-primary"
                onClick={handleExport}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 p-8 backdrop-blur-xl">
          <div className="absolute right-0 top-0 p-8 text-primary/10">
            <CreditCard size={120} />
          </div>
          <div className="relative">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Payment Method
            </p>
            <div className="mb-2 flex items-center gap-4 rounded-2xl border border-border/40 bg-muted/40 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">UPI / COD</p>
                <p className="text-xs text-muted-foreground">Supported payment methods</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <AlertCircle size={14} className="text-primary/60" />
            Payments are confirmed during booking checkout.
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/40 backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-6 border-b border-border/60 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Transaction History</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your service payments and past bookings.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={downloadFormat}
              onChange={(event) => setDownloadFormat(event.target.value)}
              className="h-10 rounded-xl border border-border/40 bg-muted/30 px-3 text-xs font-semibold"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="pdf">PDF</option>
            </select>
            <div className="group relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search provider or service..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-border/40 bg-muted/30 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 md:w-64"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-border/40 px-4 text-xs font-semibold"
              onClick={() => fetchTransactions(1)}
            >
              <RefreshCcw size={14} />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl border-border/40 px-4 text-xs font-semibold"
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
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={40} className="mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No transactions found.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Transactions are created when you confirm a booking payment.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/10 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <tr>
                  <th className="px-8 py-5 font-bold">Details</th>
                  <th className="px-8 py-5 font-bold">Transaction ID</th>
                  <th className="px-8 py-5 font-bold">Date</th>
                  <th className="px-8 py-5 font-bold text-right">Amount</th>
                  <th className="px-8 py-5 font-bold text-center">Status</th>
                  <th className="px-8 py-5 font-bold text-center">Method</th>
                  <th className="px-8 py-5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="group transition-colors hover:bg-muted/10"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          <ArrowUpRight size={18} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                              {transaction.serviceTitle || transaction.providerServiceType || "Service"}
                            </p>
                            <DataOriginBadge
                              origin={transaction.dataOrigin}
                              liveLabel="Live"
                              sampleLabel="Sample"
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {transaction.providerName || "Provider"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="rounded-md border border-border/30 bg-muted/30 px-2 py-1 font-mono text-xs font-semibold text-muted-foreground">
                        {String(transaction.transactionId || transaction.id)
                          .slice(-12)
                          .toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-medium text-foreground">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-8 py-6 text-right text-sm font-bold text-foreground">
                      {formatCurrency(transaction.totalPaidByClient || transaction.amount)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                            STATUS_COLORS[transaction.status] || STATUS_COLORS.pending
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center text-xs font-medium capitalize text-muted-foreground">
                      {transaction.paymentMethod || "N/A"}
                    </td>
                    <td className="px-8 py-6 text-center">
                      {transaction.dataOrigin === "mock" ? (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          Sample only
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-3 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleDownloadInvoice(transaction.id)}
                        >
                          <FileDown size={14} />
                          Invoice
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/40 p-6">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} | {totalCount} total transactions
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
        ) : null}
      </section>
    </div>
  );
}
