import { useEffect, useState } from "react";
import { Star, Flag, Trash2 } from "lucide-react";
import { deleteReview, fetchReviews, flagReview } from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchReviews({ page, limit: 10 });
      const payload = res.data?.data || {};
      setReviews(payload.items || []);
      setPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(1);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      setLoading(true);
      setError("");
      await deleteReview(id);
      await loadReviews(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to delete review.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async (id) => {
    const reason = window.prompt(
      "Enter a reason for flagging this review (optional):"
    );
    try {
      setLoading(true);
      setError("");
      await flagReview(id, reason || "");
      await loadReviews(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to flag review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Quality</p>
          <h2 className="admin-page-title">Ratings &amp; Reviews</h2>
          <p className="admin-page-description">
            Monitor feedback and moderate inappropriate content.
          </p>
        </div>
      </header>

      <article className="admin-card space-y-3">
        <AdminTable
          columns={[
            { key: "service", label: "Service" },
            { key: "rating", label: "Rating" },
            { key: "reviewer", label: "Reviewer" },
            { key: "provider", label: "Provider" },
            { key: "comment", label: "Comment" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          data={reviews}
          loading={loading}
          error={error}
          renderRow={(review) => (
            <tr
              key={review._id}
              className="admin-table-row"
            >
              <td className="admin-cell admin-cell-strong">
                {review.bookingId || "-"}
              </td>
              <td className="admin-cell">
                <span className="admin-badge admin-badge-warning">
                  <Star size={12} />
                  {review.rating?.toFixed(1)}
                </span>
              </td>
              <td className="admin-cell admin-cell-strong">
                {review.clientId?.name || "-"}
              </td>
              <td className="admin-cell admin-cell-strong">
                {review.providerId?.name || "-"}
              </td>
              <td className="admin-cell max-w-xs">
                <p className="line-clamp-2">{review.comment || "-"}</p>
              </td>
              <td className="admin-cell">
                {review.isFlagged ? (
                  <span className="admin-badge admin-badge-danger">
                    <Flag size={12} />
                    Flagged
                  </span>
                ) : (
                  <span className="admin-badge admin-badge-muted">Clean</span>
                )}
              </td>
              <td className="admin-cell">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFlag(review._id)}
                    className="admin-pill-button admin-pill-button-warning"
                  >
                    <Flag size={12} />
                    Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(review._id)}
                    className="admin-pill-button admin-pill-button-danger"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          )}
        />

        <AdminPagination
          page={pagination.page || 1}
          pages={pagination.pages || 1}
          onPageChange={(page) => loadReviews(page)}
        />
      </article>
    </section>
  );
}
