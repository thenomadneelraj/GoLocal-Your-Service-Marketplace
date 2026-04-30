import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Clock,
  Loader2,
  RefreshCcw,
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
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockProviderPayouts } from "@/lib/mockWorkspaceData";

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_COLORS = {
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export default function ProviderEarnings() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [lastPaidAmount, setLastPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [downloadFormat, setDownloadFormat] = useState("csv");
  const LIMIT = 10;

  const fetchPayouts = useCallback(
    async (pg = 1) => {
      try {
        setLoading(true);
        const res = await api.get(
          `/api/providers/stats/payouts?page=${pg}&limit=${LIMIT}`
        );
        const data = res.data?.data || {};
        setPayouts(data.items || []);
        setTotalEarnings(data.totalEarnings || 0);
        setPendingAmount(data.pendingAmount || 0);
        setLastPaidAmount(data.lastPaidAmount || 0);
        setTotalPages(data.pages || 1);
        setTotalCount(data.total || 0);
        setPage(pg);
      } catch (err) {
        console.error("Failed to fetch earnings:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPayouts(1);
  }, [fetchPayouts]);

  // Real-time: listen for payment-related notifications
  useEffect(() => {
    if (!user?.id) return;
    initiateSocketConnection(user.id, user.role);

    const unsub = subscribeToNotifications((err, payload) => {
      if (err) return;
      if (payload?.notification?.type === "payment") {
        fetchPayouts(1);
      }
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [user?.id, fetchPayouts]);

  const handleRequestPayout = () => {
    toast.info("Provider earnings are released automatically once COD bookings are completed.");
  };

  const handleExport = async () => {
    try {
      const response = await api.get(
        `/api/providers/stats/payouts/export?format=${downloadFormat}`,
        { responseType: "blob" }
      );
      const contentType =
        downloadFormat === "pdf"
          ? "application/pdf"
          : downloadFormat === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv;charset=utf-8;";
      const extension = downloadFormat === "xlsx" ? "xlsx" : downloadFormat;
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `provider-earnings-${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Earnings export downloaded successfully.");
    } catch (error) {
      toast.error("Could not download the earnings export.");
    }
  };

  const layeredPayouts = useMemo(
    () =>
      mergeLayeredCollections(payouts, mockProviderPayouts, {
        getId: (payout) => payout.id,
      }),
    [payouts]
  );
  const displayPayouts = payouts.length ? payouts : layeredPayouts;
  const fallbackTotalEarnings = displayPayouts
    .filter((payout) => ["paid", "pending"].includes(payout.status))
    .reduce((sum, payout) => sum + Number(payout.netAmount || 0), 0);
  const fallbackPendingAmount = displayPayouts
    .filter((payout) => payout.status === "pending")
    .reduce((sum, payout) => sum + Number(payout.netAmount || 0), 0);
  const resolvedTotalEarnings =
    payouts.length || totalEarnings > 0 ? totalEarnings : fallbackTotalEarnings;
  const resolvedPendingAmount =
    payouts.length || pendingAmount > 0 ? pendingAmount : fallbackPendingAmount;
  const resolvedLastPaidAmount =
    payouts.length || lastPaidAmount > 0
      ? lastPaidAmount
      : displayPayouts.find((payout) => payout.status === "paid")?.netAmount || 0;
  const filteredPayouts = displayPayouts.filter((p) => {
    const matchesTab = activeTab === "all" || p.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      p.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Wallet Balance */}
        <div className="lg:col-span-2 relative bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 h-full">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-xl w-fit text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-xs">
                <Wallet size={12} />
                Total Earnings
              </div>
              <div>
                {loading ? (
                  <div className="h-14 w-48 animate-pulse bg-muted/40 rounded-2xl" />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-5xl font-black tracking-tight text-foreground italic">
                        {formatCurrency(resolvedTotalEarnings)}
                      </h1>
                      <DataOriginBadge
                        origin={payouts.length ? "real" : "mock"}
                        liveLabel="Live"
                        sampleLabel="Sample"
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest leading-none">
                      <TrendingUp size={14} className="text-emerald-500" />
                      {displayPayouts.length} payout record{displayPayouts.length !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </div>

          <div className="flex flex-col gap-2 min-w-[160px]">
              <select
                value={downloadFormat}
                onChange={(event) => setDownloadFormat(event.target.value)}
                className="h-11 rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="pdf">PDF</option>
              </select>
              <Button
                size="lg"
                className="rounded-xl h-11 text-xs font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-md gap-2"
                onClick={handleRequestPayout}
              >
                <Banknote size={16} />
                Request Payout
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl h-11 text-xs font-black uppercase tracking-widest border-border/60 hover:bg-muted/50 gap-2 shadow-xs"
                onClick={handleExport}
              >
                <Download size={16} />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/20 shadow-xs">
                <Clock size={18} />
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">
              Pending Amount
            </p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse bg-muted/40 rounded-xl" />
            ) : (
              <p className="text-2xl font-black leading-none italic">
                {formatCurrency(resolvedPendingAmount)}
              </p>
            )}
          </div>
          <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 group hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm shadow-xs h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20 shadow-xs">
                <History size={18} />
              </div>
              <Download size={16} className="text-muted-foreground" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">
              Last Paid
            </p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse bg-muted/40 rounded-xl" />
            ) : (
              <p className="text-2xl font-black leading-none italic">
                {formatCurrency(resolvedLastPaidAmount)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction table */}
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-xs">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Earnings History
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium italic opacity-70">
                Completed and pending payouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/40">
              {["all", "paid", "pending"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? "bg-background text-emerald-600 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative group flex-1 xl:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-card/50 focus:bg-background outline-none transition-all text-xs shadow-xs"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/60"
              onClick={() => fetchPayouts(1)}
            >
              <RefreshCcw size={16} className="text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/60"
              onClick={handleExport}
            >
              <Download size={16} className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden bg-card/30 border border-border/60 rounded-[2rem] backdrop-blur-sm shadow-xs">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <IndianRupee size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">No earnings yet</p>
              <p className="text-[10px] mt-1 italic opacity-70">
                Payouts are generated when bookings are marked complete.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
                      Descriptor
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">
                      Date
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">
                      Gross
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">
                      Commission
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">
                      Net
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-center">
                      Status
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-80 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredPayouts.map((p) => (
                    <tr
                      key={p.id}
                      className="group hover:bg-emerald-500/5 transition-all duration-300"
                    >
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                              p.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                            }`}
                          >
                            {p.status === "paid" ? (
                              <ArrowDownLeft size={16} />
                            ) : (
                              <Clock size={16} />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-foreground group-hover:text-emerald-700 transition-colors uppercase tracking-tight line-clamp-1">
                                {p.serviceTitle || "Service Booking"}
                              </p>
                              <DataOriginBadge origin={p.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5 font-bold tracking-widest opacity-60">
                              #{String(p.id).slice(-8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center text-[10px] font-bold text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <p className="text-sm font-black italic text-emerald-600">
                          {formatCurrency(p.amount)}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <p className="text-xs font-bold text-rose-600">
                          -{formatCurrency(p.commission)}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <p className="text-sm font-black italic text-foreground">
                          {formatCurrency(p.netAmount)}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                            STATUS_COLORS[p.status] || STATUS_COLORS.pending
                          }`}
                        >
                          {p.status === "paid" ? (
                            <CheckCircle2 size={8} />
                          ) : (
                            <Clock size={8} />
                          )}
                          {p.status}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {p.dataOrigin === "mock" ? (
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Sample only
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg h-8 px-3 hover:bg-emerald-500/10 hover:text-emerald-600"
                            onClick={async () => {
                              try {
                                const response = await api.get(
                                  `/api/providers/stats/payouts/${p.id}/invoice?format=${downloadFormat}`,
                                  { responseType: "blob" }
                                );
                                const extension =
                                  downloadFormat === "xlsx" ? "xlsx" : downloadFormat;
                                const blob = new Blob([response.data]);
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute(
                                  "download",
                                  `provider-invoice-${p.id}.${extension}`
                                );
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                toast.success("Invoice downloaded successfully.");
                              } catch (error) {
                                toast.error("Could not download the invoice.");
                              }
                            }}
                          >
                            <Download size={14} className="mr-2" />
                            Invoice
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fetchPayouts(page - 1)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => fetchPayouts(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
