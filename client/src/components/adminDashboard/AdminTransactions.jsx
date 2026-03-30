import { useEffect, useState } from "react";
import { CalendarRange, Filter, CreditCard } from "lucide-react";
import { fetchTransactions } from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: "",
    from: "",
    to: "",
  });

  const loadTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchTransactions({
        page,
        limit: 10,
        ...filters,
      });
      const payload = res.data?.data || {};
      setTransactions(payload.items || []);
      setPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    loadTransactions(1);
  };

  const handleResetFilters = () => {
    setFilters({ status: "", from: "", to: "" });
    loadTransactions(1);
  };

  const getStatusClassName = (status) => {
    if (status === "SUCCESS") return "admin-badge-success";
    if (status === "REFUNDED") return "admin-badge-warning";
    if (status === "FAILED") return "admin-badge-danger";
    return "admin-badge-muted";
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Finance</p>
          <h2 className="admin-page-title">Transactions</h2>
          <p className="admin-page-description">
            View booking payments and filter by date or status.
          </p>
        </div>
      </header>

      <article className="admin-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="admin-chip">
            <CreditCard size={14} className="text-primary" />
            <span className="admin-chip-label">Payments</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="admin-filter-cluster">
              <CalendarRange size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, from: e.target.value }))
                }
                className="w-[132px] bg-transparent text-[11px] text-foreground outline-none"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, to: e.target.value }))
                }
                className="w-[132px] bg-transparent text-[11px] text-foreground outline-none"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="admin-select h-10 w-auto min-w-[142px] px-3 text-[11px]"
            >
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="admin-button-primary rounded-[1rem] px-3 py-2 text-[11px]"
            >
              <Filter size={12} />
              Apply
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="admin-button-ghost"
            >
              Reset
            </button>
          </div>
        </div>

        <AdminTable
          columns={[
            { key: "id", label: "ID" },
            { key: "user", label: "Customer" },
            { key: "provider", label: "Provider" },
            { key: "service", label: "Service" },
            { key: "amount", label: "Amount" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Date" },
          ]}
          data={transactions}
          loading={loading}
          error={error}
          renderRow={(tx) => (
            <tr
              key={tx._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-muted">{tx._id.slice(-8)}</td>
              <td className="admin-cell admin-cell-strong">
                {tx.clientId?.name || "-"}
              </td>
              <td className="admin-cell admin-cell-strong">
                {tx.bookingId?.providerId?.name || "-"}
              </td>
              <td className="admin-cell">{tx.bookingId?.serviceId?.name || "-"}</td>
              <td className="admin-cell admin-cell-strong">
                Rs {Number(tx.amount || 0).toLocaleString("en-IN")}
              </td>
              <td className="admin-cell">
                <span className={`admin-badge ${getStatusClassName(tx.status)}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {tx.status}
                </span>
              </td>
              <td className="admin-cell admin-cell-muted">
                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-"}
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => loadTransactions(page)}
        />
      </article>
    </section>
  );
}
