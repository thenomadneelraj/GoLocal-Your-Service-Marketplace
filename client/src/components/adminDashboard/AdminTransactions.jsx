import { useEffect, useState } from "react";
import { Coins, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminTransactions,
  fetchAdminTransactionsSummary,
} from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminCurrency,
} from "./AdminWorkspaceCommon";

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
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

  if (loading && !summary) {
    return <AdminLoadingState label="Loading transaction center..." />;
  }

  return (
    <AdminPageShell
      title="Transaction Center"
      description="Track payment settlements, platform revenue, and cases that are still waiting on finance review."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={Coins} title="Gross volume" value={formatAdminCurrency(summary?.grossVolume ?? 0, currency)} />
        <AdminStatCard icon={Landmark} title="Platform fees" value={formatAdminCurrency(summary?.platformFees ?? 0, currency)} tone="text-blue-600" />
        <AdminStatCard icon={Wallet} title="Pending holds" value={formatAdminCurrency(summary?.pendingHolds ?? 0, currency)} tone="text-amber-600" />
        <AdminStatCard icon={ShieldCheck} title="Chargebacks" value={`${summary?.chargebackRate ?? 0}%`} tone="text-emerald-600" />
      </div>

      <AdminPanel>
        <AdminSearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            loadTransactions(value);
          }}
          placeholder="Search transactions, providers, or references..."
        />
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
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {items.map((transaction) => (
                <tr key={transaction.id} className="admin-table-row">
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{transaction.reference}</p>
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
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="admin-empty-state" colSpan={5}>
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
          {alerts.map((alert) => (
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
