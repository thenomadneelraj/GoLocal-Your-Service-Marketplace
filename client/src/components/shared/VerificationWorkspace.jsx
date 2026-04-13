import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";
import VerificationDocumentsGallery from "@/components/shared/VerificationDocumentsGallery";
import {
  disconnectSocket,
  initiateSocketConnection,
  subscribeToUserStatusUpdates,
} from "@/lib/socket";

const STATUS_META = {
  not_submitted: {
    label: "Not submitted",
    accent: "bg-muted/30 border-border/40 text-muted-foreground",
    description: "Upload all required verification documents to start the review.",
  },
  under_review: {
    label: "Under review",
    accent: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    description: "Your documents were submitted and are waiting for admin review.",
  },
  verified: {
    label: "Verified",
    accent: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    description: "Your verification has been approved and the trust badge is active.",
  },
  rejected: {
    label: "Rejected",
    accent: "bg-rose-500/10 border-rose-500/20 text-rose-700",
    description: "Admin rejected the previous submission. Re-upload your documents to try again.",
  },
};

const formatFileSize = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function UploadTile({
  documentConfig,
  file,
  onRemove,
  onPick,
  inputRef,
}) {
  const Icon = documentConfig.icon || FileText;

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed p-8 text-center transition-all ${
        file
          ? "border-emerald-500/35 bg-emerald-500/5"
          : "border-border/60 bg-card/30 hover:border-primary/30 hover:bg-card/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(event) => onPick(event, documentConfig)}
      />

      {file ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={34} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{documentConfig.label}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{file.name}</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-700">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(documentConfig.kind);
            }}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-background/90 text-rose-600 shadow-sm transition hover:bg-rose-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-border/50 bg-background/80 text-primary shadow-sm transition-transform group-hover:scale-105">
            <Icon size={34} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{documentConfig.label}</p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {documentConfig.description}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-semibold text-primary">
            <Upload size={14} />
            Choose file
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificationWorkspace({
  title,
  description,
  badgeLabel,
  requiredDocuments,
  successTitle,
  successDescription,
  secureMessage,
}) {
  const { user, refreshProfile } = useAuth();
  const fileRefs = useRef({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({});
  const [payload, setPayload] = useState(null);

  const loadVerification = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/auth/verification");
      setPayload(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load verification status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerification();
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    initiateSocketConnection(user.id, user.role);
    const unsubscribe = subscribeToUserStatusUpdates((error, event) => {
      if (error) return;
      if (String(event?.userId || "") !== String(user.id)) return;
      loadVerification();
      refreshProfile({ silent: true });
    });

    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [refreshProfile, user?.id, user?.role]);

  const status = payload?.verificationStatus || (user?.isVerified ? "verified" : "not_submitted");
  const statusMeta = STATUS_META[status] || STATUS_META.not_submitted;
  const storedDocuments = payload?.documents || [];

  const uploadedKinds = useMemo(
    () => new Set(Object.keys(files).filter((key) => files[key])),
    [files]
  );

  const requiredCount = requiredDocuments.length;
  const selectedCount = uploadedKinds.size;

  const pickFile = (event, documentConfig) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum supported size is 5MB per document.",
      });
      return;
    }

    setFiles((current) => ({
      ...current,
      [documentConfig.kind]: file,
    }));
    toast.success(`${documentConfig.label} selected`, {
      description: `${file.name} (${formatFileSize(file.size)})`,
    });
  };

  const removeFile = (kind) => {
    setFiles((current) => {
      const next = { ...current };
      delete next[kind];
      return next;
    });
  };

  const submitVerification = async () => {
    const missing = requiredDocuments.filter((documentConfig) => !files[documentConfig.kind]);

    if (missing.length) {
      toast.error("Missing required documents", {
        description: `Add ${missing.map((item) => item.label).join(", ")} before submitting.`,
      });
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      requiredDocuments.forEach((documentConfig) => {
        formData.append(documentConfig.kind, files[documentConfig.kind]);
      });

      await api.post("/api/auth/verification", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFiles({});
      await refreshProfile({ silent: true });
      await loadVerification();
      toast.success("Verification submitted successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not submit verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-border/70 bg-card/80">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin text-primary" />
          Loading verification workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/60 p-8 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck size={14} />
              {badgeLabel}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className={`rounded-[1.5rem] border px-6 py-4 ${statusMeta.accent}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
              Verification status
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {statusMeta.label}
            </p>
            <p className="mt-2 text-xs leading-6">{statusMeta.description}</p>
          </div>
        </div>
      </section>

      {status === "verified" ? (
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-500 text-white shadow-xl shadow-emerald-500/20">
            <ShieldCheck size={46} />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
            {successTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            {successDescription}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Submitted
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatDateTime(payload?.submittedAt)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Reviewed
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {formatDateTime(payload?.reviewedAt)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Documents
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {storedDocuments.length}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {status === "rejected" ? (
        <section className="rounded-[2rem] border border-rose-500/20 bg-rose-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <AlertCircle size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Verification needs resubmission</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {payload?.rejectionReason || "Admin rejected the previous document set. Upload clearer or corrected files and submit again."}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-[2rem] border border-border/60 bg-card/40 p-8 backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Required documents
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Submit all required files to send your verification packet for review.
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                {selectedCount}/{requiredCount} selected
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {requiredDocuments.map((documentConfig) => {
                if (!fileRefs.current[documentConfig.kind]) {
                  fileRefs.current[documentConfig.kind] = { current: null };
                }

                return (
                  <UploadTile
                    key={documentConfig.kind}
                    documentConfig={documentConfig}
                    file={files[documentConfig.kind]}
                    onRemove={removeFile}
                    onPick={pickFile}
                    inputRef={fileRefs.current[documentConfig.kind]}
                  />
                );
              })}
            </div>

            <div className="mt-8">
              <Button
                onClick={submitVerification}
                disabled={submitting || status === "under_review" || status === "verified"}
                className="h-14 rounded-[1.5rem] px-8 text-sm font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Submitting documents...
                  </>
                ) : status === "under_review" ? (
                  <>
                    <Clock size={18} className="mr-2" />
                    Waiting for admin review
                  </>
                ) : (
                  <>
                    <Upload size={18} className="mr-2" />
                    Submit verification
                  </>
                )}
              </Button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border/60 bg-card/40 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Submitted documents
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the exact files currently stored in your verification packet.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <VerificationDocumentsGallery documents={storedDocuments} />
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-[2rem] border border-border/60 bg-card/40 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Review timeline
            </h2>
            <div className="mt-8 space-y-6">
              {[
                {
                  label: "Upload documents",
                  active: status !== "not_submitted",
                  icon: Upload,
                },
                {
                  label: "Admin review",
                  active: ["under_review", "verified"].includes(status),
                  icon: Clock,
                },
                {
                  label: "Verification approved",
                  active: status === "verified",
                  icon: CheckCircle2,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        item.active
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-primary/10 bg-primary/5 p-8">
            <div className="flex items-center gap-3 text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Info size={18} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Submission notes
              </h2>
            </div>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
              <li>Upload clear, readable document files with visible edges.</li>
              <li>Accepted formats are image files and PDF documents up to 5MB each.</li>
              <li>Admin can approve or reject the packet from the Account Verification workspace.</li>
              <li>{secureMessage}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
