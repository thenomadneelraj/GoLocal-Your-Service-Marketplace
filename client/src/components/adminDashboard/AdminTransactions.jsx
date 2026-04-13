import { useEffect, useMemo, useState } from "react";
import { Coins, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  fetchAdminTransactions,
  fetchAdminTransactionsSummary,
  downloadAdminExport,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminCurrency,
  downloadBlobFile,
} from "./AdminWorkspaceCommon";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import {
  mockAdminFinanceAlerts,
  mockAdminTransactions,
} from "@/lib/mockWorkspaceData";

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [downloadFormat, setDownloadFormat] = useState("csv");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async (nextSearch = search) => {
    try {
      setLoading(true);
      const [summaryResponse, transactionsResponse] = await Promise.all([
        fetchAdminTransactionsSummary(),
        fetchAdminTransactions({ search: nextSearch }),
      ]);
      setSummary(summaryResponse.data?.data || null);
      setItems(transactionsResponse.data?.data?.items || []);
      setAlerts(transactionsResponse.data?.data?.financeAlerts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const currency = summary?.currency || "USD";
  const layeredItems = useMemo(
    () =>
      mergeLayeredCollections(items, mockAdminTransactions, {
        getId: (transaction) => transaction.id,
      }),
    [items]
  );
  const layeredAlerts = alerts.length ? alerts : mockAdminFinanceAlerts;
  const hasLiveSummary =
    (summary?.grossVolume || 0) > 0 ||
    (summary?.platformFees || 0) > 0 ||
    (summary?.pendingHolds || 0) > 0;
  const mockSummary = {
    grossVolume: 5050,
    platformFees: 505,
    pendingHolds: 1850,
    chargebackRate: 0,
  };
  const resolvedSummary = hasLiveSummary ? summary : mockSummary;

  const handleExport = async () => {
    try {
      const response = await downloadAdminExport({
        packageType: "transactions",
        format: downloadFormat,
      });
      const fileName = downloadBlobFile(response, `transactions.${downloadFormat}`);
      toast.success(`${fileName} downloaded successfully.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download export.");
    }
  };

  if (loading && !summary) {
    return <AdminLoadingState label="Loading transaction center..." />;
  }

  return (
    <AdminPageShell
      title="Transaction Center"
      description="Track payment settlements, platform revenue, and cases that are still waiting on finance review."
      actions={
        <button type="button" onClick={handleExport} className="admin-button-secondary">
          Export {String(downloadFormat).toUpperCase()}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={Coins} title="Gross volume" value={formatAdminCurrency(resolvedSummary?.grossVolume ?? 0, currency)} />
        <AdminStatCard icon={Landmark} title="Platform fees" value={formatAdminCurrency(resolvedSummary?.platformFees ?? 0, currency)} tone="text-blue-600" />
        <AdminStatCard icon={Wallet} title="Pending holds" value={formatAdminCurrency(resolvedSummary?.pendingHolds ?? 0, currency)} tone="text-amber-600" />
        <AdminStatCard icon={ShieldCheck} title="Chargebacks" value={`${resolvedSummary?.chargebackRate ?? 0}%`} tone="text-emerald-600" />
      </div>

      <AdminPanel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <AdminSearchField
              value={search}
              onChange={(value) => {
                setSearch(value);
                loadTransactions(value);
              }}
              placeholder="Search transactions, providers, or references..."
            />
          </div>
          <select
            value={downloadFormat}
            onChange={(event) => setDownloadFormat(event.target.value)}
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </AdminPanel>

      <AdminPanel title="Latest transaction activity">
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead className="admin-table-head">
              <tr>
                <th className="admin-table-head-cell">Transaction</th>
                <th className="admin-table-head-cell">Provider</th>
                <th className="admin-table-head-cell">Amount</th>
                <th className="admin-table-head-cell">Platform fee</th>
                <th className="admin-table-head-cell">Status</th>
                <th className="admin-table-head-cell">Invoice</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {layeredItems.map((transaction) => (
                <tr key={transaction.id} className="admin-table-row">
                  <td className="admin-cell">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="admin-cell-strong">{transaction.reference}</p>
                      <DataOriginBadge origin={transaction.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                    </div>
                    <p className="admin-cell-muted">{transaction.createdLabel}</p>
                  </td>
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{transaction.provider}</p>
                    <p className="admin-cell-muted">{transaction.service}</p>
                  </td>
                  <td className="admin-cell">{transaction.amountLabel}</td>
                  <td className="admin-cell">{transaction.platformFeeLabel}</td>
                  <td className="admin-cell">
                    <AdminStatusBadge value={transaction.statusLabel} />
                  </td>
                  <td className="admin-cell">
                    <button
                      type="button"
                      className="text-sm font-semibold text-primary"
                      onClick={async () => {
                        if (transaction.dataOrigin === "mock") {
                          toast.info("Sample invoices are not downloadable.");
                          return;
                        }
                        try {
                          const response = await api.get(
                            `/api/admin/transactions/${transaction.id}/invoice`,
                            {
                              params: { format: downloadFormat },
                              responseType: "blob",
                            }
                          );
                          const extension =
                            downloadFormat === "xlsx"
                              ? "xlsx"
                              : downloadFormat;
                          const blob = new Blob([response.data]);
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute(
                            "download",
                            `${transaction.reference}.${extension}`
                          );
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          toast.success("Invoice downloaded successfully.");
                        } catch (error) {
                          toast.error("Failed to download invoice.");
                        }
                      }}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {!layeredItems.length ? (
                <tr>
                  <td className="admin-empty-state" colSpan={6}>
                    No transactions matched the current search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel title="Finance alerts" description="Backend-generated notes to help the admin team prioritize finance follow-up.">
        <div className="space-y-3">
          {layeredAlerts.map((alert) => (
            <div key={alert.id} className="admin-card-soft flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
              </div>
              <AdminStatusBadge value={alert.severity} />
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
