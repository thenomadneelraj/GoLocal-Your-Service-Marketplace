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

  const toggleVerification = async (id, currentStatus) => {
    try {
      setLoading(true);
      setError("");
      await api.put(`/api/admin/providers/${id}`, {
        isApproved: !currentStatus,
      });
      await fetchProviders(pagination.page || 1);
    } catch (err) {
      console.error("Error updating provider:", err);
      setError("Failed to update provider.");
    } finally {
      setLoading(false);
    }
  };

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
            { key: "isApproved", label: "Approved" },
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
                <span
                  className={`admin-badge ${
                    provider.isApproved
                      ? "admin-badge-success"
                      : "admin-badge-muted"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {provider.isApproved ? "Approved" : "Unapproved"}
                </span>
              </td>
              <td className="admin-cell">
                <button
                  type="button"
                  onClick={() =>
                    toggleVerification(provider._id, provider.isApproved)
                  }
                  className="admin-pill-button"
                >
                  {provider.isApproved ? "Unapprove" : "Approve"}
                </button>
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
