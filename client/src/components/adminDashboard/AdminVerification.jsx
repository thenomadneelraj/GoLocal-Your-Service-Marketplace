import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  ShieldX,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminVerificationRequest,
  fetchAdminVerificationRequests,
  updateAdminVerificationRequest,
} from "@/lib/adminApi";
import VerificationDocumentsGallery from "@/components/shared/VerificationDocumentsGallery";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  formatAdminDateTime,
} from "./AdminWorkspaceCommon";

function RejectModal({ user, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }

    setSubmitting(true);
    await onConfirm(user.id, reason.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Reject Verification Documents
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter a mandatory rejection reason for <strong>{user.name}</strong>. This
          message will be visible in the user&apos;s Verification Status section.
        </p>
        <textarea
          className="admin-input mb-4 w-full resize-none"
          rows={4}
          placeholder="Explain why the documents were rejected."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="admin-button-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="admin-button-danger"
          >
            {submitting ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerification() {
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [detailsById, setDetailsById] = useState({});
  const [actionId, setActionId] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);

  const loadRequests = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const response = await fetchAdminVerificationRequests(nextFilters);
      const nextPayload = response.data?.data || null;
      setPayload(nextPayload);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load verification requests."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRequestDetail = async (userId, { force = false } = {}) => {
    if (!userId) return;
    if (!force && detailsById[userId]) {
      setSelectedId(userId);
      return;
    }

    try {
      setDetailLoading(true);
      const response = await fetchAdminVerificationRequest(userId);
      const detail = response.data?.data || null;
      setDetailsById((current) => ({
        ...current,
        [userId]: detail,
      }));
      setSelectedId(userId);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load the selected verification request."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const items = payload?.items || [];
    if (!items.length) {
      setSelectedId("");
      return;
    }

    if (selectedId && items.some((item) => item.id === selectedId)) {
      return;
    }

    loadRequestDetail(items[0].id);
  }, [payload, selectedId]);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadRequests(nextFilters);
  };

  const handleVerify = async (userId) => {
    try {
      setActionId(`${userId}:verified`);
      const response = await updateAdminVerificationRequest(userId, {
        verificationStatus: "verified",
        rejectionReason: "",
      });
      toast.success(
        response.data?.message || "User documents are successfully verified."
      );
      await Promise.all([loadRequests(filters), loadRequestDetail(userId, { force: true })]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify documents.");
    } finally {
      setActionId("");
    }
  };

  const handleRejectConfirm = async (userId, rejectionReason) => {
    try {
      setActionId(`${userId}:rejected`);
      const response = await updateAdminVerificationRequest(userId, {
        verificationStatus: "rejected",
        rejectionReason,
      });
      toast.success(
        response.data?.message || "Verification rejected successfully."
      );
      setRejectTarget(null);
      await Promise.all([loadRequests(filters), loadRequestDetail(userId, { force: true })]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject documents.");
    } finally {
      setActionId("");
    }
  };

  const items = payload?.items || [];
  const summary = payload?.summary || {};
  const selectedUser = detailsById[selectedId] || items.find((item) => item.id === selectedId);

  const submissionLabel = useMemo(
    () => `${items.length} submission${items.length === 1 ? "" : "s"} shown`,
    [items.length]
  );

  if (loading && !payload) {
    return <AdminLoadingState label="Loading verification requests..." />;
  }

  return (
    <>
      {rejectTarget ? (
        <RejectModal
          user={rejectTarget}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      ) : null}

      <AdminPageShell
        title="Account Verification"
        description="Review the exact verification files submitted by users, then verify the packet or reject it with a mandatory reason."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            icon={FileText}
            title="Total submissions"
            value={summary.totalRequests ?? 0}
          />
          <AdminStatCard
            icon={FileText}
            title="Under review"
            value={summary.underReview ?? 0}
            tone="text-amber-600"
          />
          <AdminStatCard
            icon={CheckCircle2}
            title="Verified"
            value={summary.verified ?? 0}
            tone="text-emerald-600"
          />
          <AdminStatCard
            icon={ShieldX}
            title="Rejected"
            value={summary.rejected ?? 0}
            tone="text-rose-600"
          />
        </div>

        <AdminPanel>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto]">
            <div>
              <label className="admin-label">Search</label>
              <div className="mt-2">
                <AdminSearchField
                  value={filters.search}
                  onChange={(value) => handleFilterChange("search", value)}
                  placeholder="name or email"
                />
              </div>
            </div>
            <div>
              <label className="admin-label">Role</label>
              <div className="mt-2">
                <AdminSelectField
                  value={filters.role}
                  onChange={(value) => handleFilterChange("role", value)}
                >
                  <option value="all">All roles</option>
                  <option value="client">Client</option>
                  <option value="provider">Provider</option>
                </AdminSelectField>
              </div>
            </div>
            <div className="flex items-end text-xs text-muted-foreground">
              {submissionLabel}
            </div>
          </div>
        </AdminPanel>

        {!items.length ? (
          <AdminPanel>
            <p className="admin-empty-state">
              No verification submissions found. Users with uploaded documents will appear here.
            </p>
          </AdminPanel>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
            <div className="space-y-4">
              {items.map((user) => {
                const isSelected = selectedId === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => loadRequestDetail(user.id)}
                    className={`admin-card w-full text-left transition-all ${
                      isSelected ? "border-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="admin-icon-wrap text-slate-500">
                        <UserRound size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">
                            {user.name}
                          </h3>
                          <span className="admin-badge admin-badge-muted">{user.role}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {user.serviceType ? <span>Service: {user.serviceType}</span> : null}
                          <span>{user.verificationDocumentsCount || 0} document(s)</span>
                          {user.verificationSubmittedAt ? (
                            <span>
                              Submitted: {formatAdminDateTime(user.verificationSubmittedAt)}
                            </span>
                          ) : null}
                        </div>
                        {user.verificationRejectionReason ? (
                          <p className="mt-2 text-xs text-rose-600">
                            Rejection note: {user.verificationRejectionReason}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AdminStatusBadge value={user.verificationStatus || "not_submitted"} />
                      <AdminStatusBadge
                        value={
                          user.approvalStatus === "approved"
                            ? user.status
                            : user.approvalStatus
                        }
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <AdminPanel>
              {detailLoading && !selectedUser ? (
                <AdminLoadingState label="Loading selected verification request..." />
              ) : selectedUser ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                          {selectedUser.name}
                        </h2>
                        <span className="admin-badge admin-badge-muted">
                          {selectedUser.role}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {selectedUser.serviceType ? (
                          <span>Service: {selectedUser.serviceType}</span>
                        ) : null}
                        {selectedUser.verificationSubmittedAt ? (
                          <span>
                            Submitted: {formatAdminDateTime(selectedUser.verificationSubmittedAt)}
                          </span>
                        ) : null}
                        {selectedUser.verificationReviewedAt ? (
                          <span>
                            Reviewed: {formatAdminDateTime(selectedUser.verificationReviewedAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => handleVerify(selectedUser.id)}
                        disabled={
                          actionId === `${selectedUser.id}:verified` ||
                          detailLoading ||
                          selectedUser.verificationStatus === "verified"
                        }
                        className="admin-button-success"
                      >
                        {actionId === `${selectedUser.id}:verified`
                          ? "Verifying..."
                          : "Verify Docs"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(selectedUser)}
                        disabled={actionId === `${selectedUser.id}:rejected` || detailLoading}
                        className="admin-button-danger"
                      >
                        {actionId === `${selectedUser.id}:rejected`
                          ? "Rejecting..."
                          : "Reject Docs"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AdminStatusBadge
                      value={selectedUser.verificationStatus || "not_submitted"}
                    />
                    <AdminStatusBadge
                      value={
                        selectedUser.approvalStatus === "approved"
                          ? selectedUser.status
                          : selectedUser.approvalStatus
                      }
                    />
                  </div>

                  {selectedUser.verificationRejectionReason ? (
                    <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                      <span className="font-semibold">Saved rejection reason:</span>{" "}
                      {selectedUser.verificationRejectionReason}
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Submitted Documents
                    </p>
                    <VerificationDocumentsGallery
                      documents={selectedUser.verificationDocuments || []}
                      emptyMessage="No uploaded files were found for this verification request."
                    />
                  </div>
                </div>
              ) : (
                <p className="admin-empty-state">
                  Select a user to review their verification packet.
                </p>
              )}
            </AdminPanel>
          </div>
        )}
      </AdminPageShell>
    </>
  );
}
