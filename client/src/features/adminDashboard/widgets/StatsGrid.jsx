import { memo, useMemo } from "react";
import { Ban, CheckCircle2, ShieldX, UserRound } from "lucide-react";
import { AdminStatCard } from "@/components/adminDashboard/AdminWorkspaceCommon";

function StatsGrid({ users = [] }) {
  const summary = useMemo(
    () => ({
      totalUsers: users.length,
      pendingApproval: users.filter((user) => user.approvalStatus === "pending")
        .length,
      approved: users.filter((user) => user.approvalStatus === "approved")
        .length,
      rejected: users.filter((user) => user.approvalStatus === "rejected")
        .length,
      suspended: users.filter((user) => user.status === "suspended").length,
    }),
    [users],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
      <AdminStatCard icon={UserRound} title="Total users" value={summary.totalUsers} />
      <AdminStatCard icon={Ban} title="Pending approval" value={summary.pendingApproval} tone="text-amber-600" />
      <AdminStatCard icon={CheckCircle2} title="Approved" value={summary.approved} tone="text-emerald-600" />
      <AdminStatCard icon={ShieldX} title="Rejected" value={summary.rejected} tone="text-rose-600" />
      <AdminStatCard icon={Ban} title="Suspended" value={summary.suspended} tone="text-slate-500" />
    </div>
  );
}

export default memo(StatsGrid);
