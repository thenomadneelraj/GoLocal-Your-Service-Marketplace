import { Download, ExternalLink, FileText } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";

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

const isPdfDocument = (document = {}) =>
  String(document?.mimeType || "").toLowerCase().includes("pdf") ||
  /\.pdf($|\?)/i.test(String(document?.fileUrl || ""));

const isImageDocument = (document = {}) =>
  String(document?.mimeType || "").toLowerCase().startsWith("image/");

export default function VerificationDocumentsGallery({
  documents = [],
  emptyMessage = "No verification documents submitted yet.",
}) {
  if (!documents.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 px-5 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {documents.map((document) => {
        const fileUrl = resolveMediaUrl(document.fileUrl);
        const isPdf = isPdfDocument(document);
        const isImage = isImageDocument(document);
        const documentKey =
          document.kind +
          ":" +
          String(document.originalName || document.name || document.fileUrl || "");

        return (
          <div
            key={documentKey}
            className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-muted/20"
          >
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {document.label || document.kind || "Document"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.originalName || document.name || "Uploaded file"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {fileUrl ? (
                    <>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                      <a
                        href={fileUrl}
                        download
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-3 py-1.5 font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
                      >
                        <Download size={12} />
                        Download
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-[1.25rem] border border-border/60 bg-background/70">
                {fileUrl && isImage ? (
                  <img
                    src={fileUrl}
                    alt={document.label || "Verification document"}
                    className="h-72 w-full object-cover"
                  />
                ) : fileUrl && isPdf ? (
                  <iframe
                    title={document.label || "Verification document"}
                    src={fileUrl}
                    className="h-72 w-full bg-white"
                  />
                ) : (
                  <div className="flex h-72 flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText size={28} />
                    <p className="text-sm font-medium">Preview unavailable</p>
                  </div>
                )}
              </div>

              <div className="rounded-[1.25rem] border border-border/60 bg-background/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  File details
                </p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Type:</span>{" "}
                    {document.mimeType || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Size:</span>{" "}
                    {formatFileSize(document.size)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Uploaded:</span>{" "}
                    {formatDateTime(document.uploadedAt)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Kind:</span>{" "}
                    {document.kind || "document"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
