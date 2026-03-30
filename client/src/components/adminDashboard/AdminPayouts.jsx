import { useEffect, useState } from "react";
import { Wallet2, CheckCircle2 } from "lucide-react";
import { fetchPayouts, markPayoutPaid } from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadPayouts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchPayouts({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      const payload = res.data?.data || {};
      setPayouts(payload.items || []);
      setPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setError("Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleMarkPaid = async (payoutId) => {
    try {
      setLoading(true);
      setError("");
      await markPayoutPaid(payoutId);
      await loadPayouts(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to mark payout as paid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Finance</p>
          <h2 className="admin-page-title">Payouts</h2>
          <p className="admin-page-description">
            Track provider earnings, commission, and payout status.
          </p>
        </div>
      </header>

      <article className="admin-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="admin-chip">
            <Wallet2 size={14} className="text-primary" />
            <span className="admin-chip-label">Provider earnings</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select h-10 w-auto min-w-[140px] px-3 text-[11px]"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        <AdminTable
          columns={[
            { key: "provider", label: "Provider" },
            { key: "gross", label: "Gross" },
            { key: "commission", label: "Commission" },
            { key: "net", label: "Net" },
            { key: "status", label: "Status" },
            { key: "paidAt", label: "Paid At" },
            { key: "actions", label: "Actions" },
          ]}
          data={payouts}
          loading={loading}
          error={error}
          renderRow={(payout) => (
            <tr
              key={payout._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-strong">
                {payout.providerId?.name || payout.providerId?._id || "-"}
              </td>
              <td className="admin-cell admin-cell-strong">
                Rs {Number(payout.amount || 0).toLocaleString("en-IN")}
              </td>
              <td className="admin-cell admin-cell-muted">
                Rs {Number(payout.commission || 0).toLocaleString("en-IN")}
              </td>
              <td className="admin-cell font-semibold text-primary">
                Rs {Number(payout.netAmount || 0).toLocaleString("en-IN")}
              </td>
              <td className="admin-cell">
                <span
                  className={`admin-badge ${
                    payout.status?.toLowerCase() === "paid"
                      ? "admin-badge-success"
                      : "admin-badge-muted"
                  }`}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {payout.status}
                </span>
              </td>
              <td className="admin-cell admin-cell-muted">
                {payout.payoutDate
                  ? new Date(payout.payoutDate).toLocaleString()
                  : "-"}
              </td>
              <td className="admin-cell">
                {payout.status?.toLowerCase() === "pending" ? (
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(payout._id)}
                    className="admin-pill-button admin-pill-button-success"
                  >
                    <CheckCircle2 size={12} />
                    Mark paid
                  </button>
                ) : (
                  <span className="admin-cell-muted font-semibold uppercase tracking-[0.16em]">
                    Finalized
                  </span>
                )}
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => loadPayouts(page)}
        />
      </article>
    </section>
  );
}
