import { useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import api from "@/lib/api";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProviders = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/admin/providers", {
        params: { page, limit: 10 },
      });
      const payload = res.data?.data || {};
      setProviders(payload.providers || []);
      setPagination({
        page: payload.page || page,
        pages: payload.pages || 1,
      });
    } catch (err) {
      console.error("Error fetching providers:", err);
      setError("Failed to load providers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders(1);
  }, []);

  const updateApprovalStatus = async (id, approvalStatus) => {
    try {
      setLoading(true);
      setError("");
      await api.put(`/api/admin/providers/${id}`, {
        approvalStatus,
      });
      await fetchProviders(pagination.page || 1);
    } catch (err) {
      console.error("Error updating provider:", err);
      setError("Failed to update provider.");
    } finally {
      setLoading(false);
    }
  };

  const resolveApprovalStatus = (provider) =>
    String(provider.approvalStatus || "").toLowerCase() ||
    (provider.isApproved ? "approved" : "pending");

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Providers</p>
          <h2 className="admin-page-title">Manage Providers</h2>
          <p className="admin-page-description">
            Verify trusted providers and review their profiles.
          </p>
        </div>
        <div className="admin-chip">
          <BriefcaseBusiness size={14} className="text-primary" />
          <span className="admin-chip-label">Total: {providers.length}</span>
        </div>
      </header>

      <article className="admin-card space-y-3">
        <AdminTable
          columns={[
            { key: "name", label: "Provider" },
            { key: "service", label: "Service Type" },
            { key: "location", label: "Location" },
            { key: "approvalStatus", label: "Approval" },
            { key: "actions", label: "Actions" },
          ]}
          data={providers}
          loading={loading}
          error={error}
          renderRow={(provider) => (
            <tr
              key={provider._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-strong">
                <p className="font-medium">{provider.name || "-"}</p>
                <p className="admin-cell-muted">{provider.userId?.email || "-"}</p>
              </td>
              <td className="admin-cell">{provider.serviceType || "-"}</td>
              <td className="admin-cell admin-cell-muted">
                {provider.location || "-"}
              </td>
              <td className="admin-cell">
                {(() => {
                  const approvalStatus = resolveApprovalStatus(provider);
                  const badgeClass =
                    approvalStatus === "approved"
                      ? "admin-badge-success"
                      : approvalStatus === "rejected"
                        ? "admin-badge-warning"
                        : "admin-badge-muted";
                  const label =
                    approvalStatus === "approved"
                      ? "Approved"
                      : approvalStatus === "rejected"
                        ? "Rejected"
                        : "Pending";

                  return (
                    <span className={`admin-badge ${badgeClass}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {label}
                    </span>
                  );
                })()}
              </td>
              <td className="admin-cell">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateApprovalStatus(provider._id, "approved")
                    }
                    className="admin-pill-button admin-pill-button-success"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateApprovalStatus(provider._id, "pending")
                    }
                    className="admin-pill-button admin-pill-button-warning"
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateApprovalStatus(provider._id, "rejected")
                    }
                    className="admin-pill-button admin-pill-button-danger"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => fetchProviders(page)}
        />
      </article>
    </section>
  );
}

export default AdminProviders;
