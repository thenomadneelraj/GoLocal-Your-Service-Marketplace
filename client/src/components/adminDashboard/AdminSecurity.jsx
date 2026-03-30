import { useEffect, useState } from "react";
import { ShieldCheck, Clock3, Activity } from "lucide-react";
import { fetchActivityLogs, fetchLoginHistory } from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminSecurity() {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginPagination, setLoginPagination] = useState({ page: 1, pages: 1 });
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    pages: 1,
  });
  const [loadingLogins, setLoadingLogins] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [errorLogins, setErrorLogins] = useState("");
  const [errorActivity, setErrorActivity] = useState("");

  const loadLoginHistory = async (page = 1) => {
    try {
      setLoadingLogins(true);
      setErrorLogins("");
      const res = await fetchLoginHistory({ page, limit: 10 });
      const payload = res.data?.data || {};
      setLoginHistory(payload.items || []);
      setLoginPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setErrorLogins("Failed to load login history.");
    } finally {
      setLoadingLogins(false);
    }
  };

  const loadActivityLogs = async (page = 1) => {
    try {
      setLoadingActivity(true);
      setErrorActivity("");
      const res = await fetchActivityLogs({ page, limit: 10 });
      const payload = res.data?.data || {};
      setActivityLogs(payload.items || []);
      setActivityPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setErrorActivity("Failed to load activity logs.");
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadLoginHistory(1);
    loadActivityLogs(1);
  }, []);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Security</p>
          <h2 className="admin-page-title">Security &amp; Audit</h2>
          <p className="admin-page-description">
            Review login activity and admin actions across the platform.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="admin-card space-y-3">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="admin-chip">
              <Clock3 size={14} className="text-primary" />
              <span className="admin-chip-label">Login history</span>
            </div>
          </div>

          <AdminTable
            columns={[
              { key: "account", label: "Account" },
              { key: "role", label: "Role" },
              { key: "ip", label: "IP" },
              { key: "userAgent", label: "User Agent" },
              { key: "createdAt", label: "Time" },
            ]}
            data={loginHistory}
            loading={loadingLogins}
            error={errorLogins}
            renderRow={(log) => (
              <tr
                key={log._id}
                className="admin-table-row"
              >
                <td className="admin-cell admin-cell-strong">
                  {log.account || "-"}
                </td>
                <td className="admin-cell admin-cell-muted">{log.role || "-"}</td>
                <td className="admin-cell">{log.ipAddress || "-"}</td>
                <td className="admin-cell max-w-xs">
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {log.userAgent || "Unknown client"}
                  </p>
                </td>
                <td className="admin-cell admin-cell-muted">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            )}
          />

          <AdminPagination
            page={loginPagination.page || 1}
            pages={loginPagination.pages || 1}
            onPageChange={(page) => loadLoginHistory(page)}
          />
        </article>

        <article className="admin-card space-y-3">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="admin-chip">
              <ShieldCheck size={14} className="text-primary" />
              <span className="admin-chip-label">Admin activity logs</span>
            </div>
          </div>

          <AdminTable
            columns={[
              { key: "actor", label: "Actor" },
              { key: "action", label: "Action" },
              { key: "target", label: "Target" },
              { key: "metadata", label: "Metadata" },
              { key: "createdAt", label: "Time" },
            ]}
            data={activityLogs}
            loading={loadingActivity}
            error={errorActivity}
            renderRow={(log) => (
              <tr
                key={log._id}
                className="admin-table-row"
              >
                <td className="admin-cell admin-cell-strong">
                  {log.actorRole || log.actorModel || "-"}
                </td>
                <td className="admin-cell">
                  <span className="admin-badge admin-badge-info">
                    <Activity size={12} />
                    {log.action}
                  </span>
                </td>
                <td className="admin-cell admin-cell-muted">
                  {log.targetType || "-"} {log.targetId ? `#${log.targetId}` : ""}
                </td>
                <td className="admin-cell max-w-xs">
                  <pre className="line-clamp-2 whitespace-pre-wrap break-words text-[10px] text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </pre>
                </td>
                <td className="admin-cell admin-cell-muted">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                </td>
              </tr>
            )}
          />

          <AdminPagination
            page={activityPagination.page || 1}
            pages={activityPagination.pages || 1}
            onPageChange={(page) => loadActivityLogs(page)}
          />
        </article>
      </div>
    </section>
  );
}
