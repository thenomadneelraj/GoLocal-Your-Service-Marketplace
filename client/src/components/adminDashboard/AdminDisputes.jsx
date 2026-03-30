import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { fetchDisputes, updateDisputeStatus } from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadDisputes = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchDisputes({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      const payload = res.data?.data || {};
      setDisputes(payload.items || []);
      setPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setError("Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleUpdateStatus = async (id, status) => {
    try {
      setLoading(true);
      setError("");
      await updateDisputeStatus(id, { status });
      await loadDisputes(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to update dispute status.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClassName = (status) => {
    if (status?.toLowerCase() === "open") return "admin-badge-warning";
    if (status?.toLowerCase() === "resolved") return "admin-badge-success";
    return "admin-badge-danger";
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Trust &amp; Safety</p>
          <h2 className="admin-page-title">Disputes</h2>
          <p className="admin-page-description">
            Review disputes between customers and providers.
          </p>
        </div>
      </header>

      <article className="admin-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="admin-chip">
            <AlertTriangle size={14} className="text-primary" />
            <span className="admin-chip-label">
              Open {statusFilter || "All"} disputes
            </span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select h-10 w-auto min-w-[140px] px-3 text-[11px]"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <AdminTable
          columns={[
            { key: "booking", label: "Booking" },
            { key: "user", label: "User" },
            { key: "provider", label: "Provider" },
            { key: "reason", label: "Reason" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Created" },
            { key: "actions", label: "Actions" },
          ]}
          data={disputes}
          loading={loading}
          error={error}
          renderRow={(dispute) => (
            <tr
              key={dispute._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-muted">
                {dispute.bookingId || "-"}
              </td>
              <td className="admin-cell admin-cell-strong">
                {dispute.clientId?.name || "-"}
              </td>
              <td className="admin-cell admin-cell-strong">
                {dispute.providerId?.name || "-"}
              </td>
              <td className="admin-cell max-w-xs">
                <p className="line-clamp-2">{dispute.reason}</p>
              </td>
              <td className="admin-cell">
                <span
                  className={`admin-badge ${getStatusClassName(dispute.status)}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {dispute.status}
                </span>
              </td>
              <td className="admin-cell admin-cell-muted">
                {dispute.createdAt
                  ? new Date(dispute.createdAt).toLocaleString()
                  : "-"}
              </td>
              <td className="admin-cell">
                {dispute.status?.toLowerCase() === "open" ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(dispute._id, "RESOLVED")}
                      className="admin-pill-button admin-pill-button-success"
                    >
                      <CheckCircle2 size={12} />
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(dispute._id, "REJECTED")}
                      className="admin-pill-button admin-pill-button-danger"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="admin-cell-muted font-medium">
                    {dispute.status?.toLowerCase() === "resolved"
                      ? "Resolved by admin"
                      : "Rejected"}
                  </span>
                )}
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => loadDisputes(page)}
        />
      </article>
    </section>
  );
}
