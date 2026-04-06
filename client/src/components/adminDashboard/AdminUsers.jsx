import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import api from "@/lib/api";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/admin/users", {
        params: { page, limit: 10 },
      });
      const payload = res.data?.data || {};
      setUsers(payload.users || []);
      setPagination({
        page: payload.page || page,
        pages: payload.pages || 1,
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      setError("");
      await api.put(`/api/admin/users/${id}`, {
        status: currentStatus === "active" ? "suspended" : "active",
      });
      await fetchUsers(pagination.page || 1);
    } catch (err) {
      console.error("Error updating user:", err);
      setError("Failed to update user status.");
    } finally {
      setLoading(false);
    }
  };

  const resolveUserStatus = (user) =>
    String(user.status || "").toLowerCase() ||
    (user.isActive ? "active" : "suspended");

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Users</p>
          <h2 className="admin-page-title">Manage Users</h2>
          <p className="admin-page-description">
            View all accounts and enable or disable access.
          </p>
        </div>
        <div className="admin-chip">
          <Users size={14} className="text-primary" />
          <span className="admin-chip-label">Total: {users.length}</span>
        </div>
      </header>

      <article className="admin-card space-y-3">
        <AdminTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          data={users}
          loading={loading}
          error={error}
          renderRow={(user) => (
            <tr
              key={user._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-strong">
                <p className="font-medium">{user.name || "-"}</p>
              </td>
              <td className="admin-cell">{user.email}</td>
              <td className="admin-cell admin-cell-muted font-semibold">
                {user.role || "CLIENT"}
              </td>
              <td className="admin-cell">
                {(() => {
                  const status = resolveUserStatus(user);
                  const badgeClass =
                    status === "active"
                      ? "admin-badge-success"
                      : status === "rejected"
                        ? "admin-badge-warning"
                        : "admin-badge-muted";
                  const label =
                    status === "rejected"
                      ? "Rejected"
                      : status === "active"
                        ? "Active"
                        : "Suspended";

                  return (
                <span
                      className={`admin-badge ${badgeClass}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {label}
                </span>
                  );
                })()}
              </td>
              <td className="admin-cell">
                <button
                  type="button"
                  onClick={() => toggleUserStatus(user._id, resolveUserStatus(user))}
                  className={`admin-pill-button ${
                    resolveUserStatus(user) === "active"
                      ? "admin-pill-button-warning"
                      : "admin-pill-button-success"
                  }`}
                >
                  {resolveUserStatus(user) === "active" ? "Suspend" : "Activate"}
                </button>
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => fetchUsers(page)}
        />
      </article>
    </section>
  );
}

export default AdminUsers;
