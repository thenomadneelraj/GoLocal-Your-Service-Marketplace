import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  MapPin,
  MessageSquareMore,
  Phone,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

const normalizeStatus = (value = "") => String(value || "").toLowerCase();

const STATUS_STYLES = {
  pending: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  confirmed: "bg-primary/12 text-primary",
  completed: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  cancelled: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
};

const formatDate = (value) => {
  if (!value) return "Date not set";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (value = "") =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P";

const getReviewTarget = (group) => {
  const completedBookings = [...(group?.bookings || [])]
    .filter((booking) => normalizeStatus(booking.status) === "completed")
    .sort((left, right) => {
      const leftDate = new Date(
        left.bookingDate || left.updatedAt || left.createdAt || 0,
      ).getTime();
      const rightDate = new Date(
        right.bookingDate || right.updatedAt || right.createdAt || 0,
      ).getTime();
      return rightDate - leftDate;
    });

  if (!completedBookings.length) {
    return null;
  }

  return (
    completedBookings.find((booking) => !booking.review) || completedBookings[0]
  );
};

const getLatestReviewedBooking = (group) =>
  [...(group?.bookings || [])]
    .filter((booking) => booking.review)
    .sort((left, right) => {
      const leftDate = new Date(
        left.review?.updatedAt ||
          left.review?.createdAt ||
          left.bookingDate ||
          left.updatedAt ||
          0,
      ).getTime();
      const rightDate = new Date(
        right.review?.updatedAt ||
          right.review?.createdAt ||
          right.bookingDate ||
          right.updatedAt ||
          0,
      ).getTime();
      return rightDate - leftDate;
    })[0] || null;

const getStarClassName = (active) =>
  active
    ? "fill-amber-400 text-amber-400"
    : "text-slate-300 dark:text-slate-600";

const buildProviderGroups = (items = []) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const groups = new Map();

  items.forEach((booking) => {
    const provider = booking.providerId || {};
    const providerId = provider._id || provider.id;

    if (!providerId) return;

    if (!groups.has(String(providerId))) {
      groups.set(String(providerId), {
        providerId: String(providerId),
        providerName: provider.name || "Provider",
        providerPhoto: provider.profileImage || provider.profilePhoto || "",
        providerPhone: provider.phone || "",
        providerLocation: provider.location || "",
        providerServiceType: provider.serviceType || "Service",
        providerRate: Number(provider.hourlyRate || 0),
        bookings: [],
      });
    }

    groups.get(String(providerId)).bookings.push(booking);
  });

  return [...groups.values()]
    .map((group) => {
      const bookings = [...group.bookings].sort(
        (left, right) =>
          new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
      );

      const upcomingBookings = [...group.bookings]
        .filter((booking) => {
          const status = normalizeStatus(booking.status);
          if (!["pending", "confirmed"].includes(status)) return false;
          if (!booking.bookingDate) return false;
          const date = new Date(booking.bookingDate);
          date.setHours(0, 0, 0, 0);
          return date >= now;
        })
        .sort((left, right) => {
          const leftDate = new Date(left.bookingDate || 0).getTime();
          const rightDate = new Date(right.bookingDate || 0).getTime();
          if (leftDate !== rightDate) return leftDate - rightDate;
          return String(left.timeSlot || "").localeCompare(
            String(right.timeSlot || ""),
          );
        });

      const latestBooking = bookings[0];
      const currentBooking = upcomingBookings[0] || null;

      return {
        ...group,
        latestBooking,
        currentBooking,
        totalBookings: group.bookings.length,
        isCurrent: Boolean(currentBooking),
        sortDate:
          currentBooking?.bookingDate ||
          latestBooking?.createdAt ||
          latestBooking?.bookingDate,
      };
    })
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) {
        return left.isCurrent ? -1 : 1;
      }

      if (left.isCurrent && right.isCurrent) {
        return new Date(left.sortDate || 0) - new Date(right.sortDate || 0);
      }

      return new Date(right.sortDate || 0) - new Date(left.sortDate || 0);
    });
};

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        STATUS_STYLES[normalized] || "bg-muted text-muted-foreground"
      }`}
    >
      {normalized || "unknown"}
    </span>
  );
}

export default function ClientProviders() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openReviewBookingId, setOpenReviewBookingId] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [submittingReviewId, setSubmittingReviewId] = useState("");

  useEffect(() => {
    let active = true;

    const loadProviders = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/api/bookings", {
          params: { limit: 100 },
        });
        const items = response.data?.data?.items || [];

        if (!active) return;
        setGroups(buildProviderGroups(items));
      } catch (err) {
        if (!active) return;
        setError(
          err.response?.data?.message ||
            "Could not load your provider booking history.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProviders();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      providers: groups.length,
      activeProviders: groups.filter((group) => group.isCurrent).length,
      totalBookings: groups.reduce(
        (total, group) => total + group.totalBookings,
        0,
      ),
    };
  }, [groups]);

  const handleReviewToggle = (booking) => {
    if (!booking?._id) return;

    const bookingId = String(booking._id);
    setOpenReviewBookingId((current) =>
      current === bookingId ? "" : bookingId,
    );
    setReviewDrafts((current) => ({
      ...current,
      [bookingId]: current[bookingId] || {
        rating: Number(booking.review?.rating || 0),
        comment: booking.review?.comment || "",
      },
    }));
  };

  const handleReviewDraftChange = (bookingId, patch) => {
    setReviewDrafts((current) => ({
      ...current,
      [bookingId]: {
        rating: 0,
        comment: "",
        ...(current[bookingId] || {}),
        ...patch,
      },
    }));
  };

  const handleSubmitReview = async (group, booking) => {
    if (!booking?._id) return;

    const bookingId = String(booking._id);
    const draft = reviewDrafts[bookingId] || {
      rating: Number(booking.review?.rating || 0),
      comment: booking.review?.comment || "",
    };

    if (!draft.rating) {
      toast.error("Choose a star rating before submitting your feedback.");
      return;
    }

    try {
      setSubmittingReviewId(bookingId);
      const response = await api.post(`/bookings/${bookingId}/review`, {
        rating: draft.rating,
        comment: draft.comment,
      });

      const savedReview = response.data?.data || null;
      const message =
        response.data?.message || "Your feedback was shared with the provider.";

      setGroups((current) =>
        current.map((entry) => {
          if (entry.providerId !== group.providerId) {
            return entry;
          }

          return {
            ...entry,
            bookings: entry.bookings.map((item) =>
              String(item._id) === bookingId
                ? { ...item, review: savedReview }
                : item,
            ),
          };
        }),
      );

      setReviewDrafts((current) => ({
        ...current,
        [bookingId]: {
          rating: Number(savedReview?.rating || draft.rating || 0),
          comment: savedReview?.comment || draft.comment || "",
        },
      }));
      setOpenReviewBookingId("");
      toast.success(message);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not save your review right now.",
      );
    } finally {
      setSubmittingReviewId("");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-8 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
            Providers
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Booked Providers
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Track your provider booking history in one place. Current or
            upcoming providers stay on top, followed by your newest booked
            providers.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Providers",
            value: summary.providers,
            icon: Users,
          },
          {
            label: "Current Bookings",
            value: summary.activeProviders,
            icon: CalendarDays,
          },
          {
            label: "Total Bookings",
            value: summary.totalBookings,
            icon: BriefcaseBusiness,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <section
              key={item.label}
              className="rounded-[1.75rem] border border-border/70 bg-card/92 p-5 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.56)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    {item.value}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={18} />
                </span>
              </div>
            </section>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-[1.75rem] border border-border/70 bg-card/80"
            />
          ))}
        </div>
      ) : groups.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => {
            const activeBooking = group.currentBooking || group.latestBooking;
            const photo = resolveMediaUrl(group.providerPhoto);
            const reviewTarget = getReviewTarget(group);
            const latestReviewedBooking = getLatestReviewedBooking(group);
            const reviewBookingId = reviewTarget?._id
              ? String(reviewTarget._id)
              : "";
            const reviewDraft = reviewDrafts[reviewBookingId] || {
              rating: Number(reviewTarget?.review?.rating || 0),
              comment: reviewTarget?.review?.comment || "",
            };
            const reviewLabel = reviewTarget?.review
              ? "Edit review"
              : "Leave review";
            const reviewSummary = latestReviewedBooking?.review || null;

            return (
              <section
                key={group.providerId}
                className="rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.56)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    {photo ? (
                      <img
                        src={photo}
                        alt={group.providerName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(group.providerName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
                          {group.providerName}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.providerServiceType}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.isCurrent ? (
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            Current Provider
                          </span>
                        ) : null}
                        <StatusBadge status={activeBooking?.status} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-primary" />
                        <span className="truncate">
                          {group.providerLocation || "Location not set"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-primary" />
                        <span>
                          {group.providerPhone || "Phone not available"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-primary" />
                        <span>
                          {group.currentBooking ? "Upcoming" : "Last booked"}:{" "}
                          {formatDate(
                            group.currentBooking?.bookingDate ||
                              group.latestBooking?.bookingDate,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 size={15} className="text-primary" />
                        <span>
                          {group.currentBooking?.timeSlot ||
                            group.latestBooking?.timeSlot ||
                            "Flexible"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Latest Booking
                      </p>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {activeBooking?.serviceId?.title ||
                          activeBooking?.serviceId?.name ||
                          "Service"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {group.totalBookings} total booking
                        {group.totalBookings === 1 ? "" : "s"} with this
                        provider.
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to={`/providers/${group.providerId}`}
                        className="inline-flex items-center rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        View Provider
                      </Link>
                      <Link
                        to={`/client/chat?contact=${group.latestBooking?.providerId?.userId || ""}`}
                        className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        Message
                      </Link>
                      {reviewTarget ? (
                        <button
                          type="button"
                          onClick={() => handleReviewToggle(reviewTarget)}
                          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
                        >
                          <MessageSquareMore size={16} />
                          {reviewLabel}
                        </button>
                      ) : null}
                    </div>

                    {reviewSummary ? (
                      <div className="mt-5 rounded-[1.25rem] border border-emerald-500/15 bg-emerald-500/8 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                            Your Feedback
                          </p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                size={14}
                                className={getStarClassName(
                                  index < Number(reviewSummary.rating || 0),
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {reviewSummary.comment ||
                            "You rated this provider without a written comment."}
                        </p>
                      </div>
                    ) : null}

                    {reviewTarget && openReviewBookingId === reviewBookingId ? (
                      <div className="mt-5 rounded-[1.4rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_50px_-44px_rgba(15,23,42,0.6)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Share feedback for{" "}
                              {reviewTarget?.serviceId?.title ||
                                reviewTarget?.serviceId?.name ||
                                group.providerServiceType}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Completed on{" "}
                              {formatDate(reviewTarget?.bookingDate)}
                              {reviewTarget?.timeSlot
                                ? ` at ${reviewTarget.timeSlot}`
                                : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenReviewBookingId("")}
                            className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                          >
                            Close
                          </button>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, index) => {
                            const nextRating = index + 1;
                            return (
                              <button
                                key={nextRating}
                                type="button"
                                onClick={() =>
                                  handleReviewDraftChange(reviewBookingId, {
                                    rating: nextRating,
                                  })
                                }
                                className="rounded-full p-1 transition hover:scale-105"
                                aria-label={`Rate ${nextRating} star${nextRating === 1 ? "" : "s"}`}
                              >
                                <Star
                                  size={22}
                                  className={getStarClassName(
                                    nextRating <=
                                      Number(reviewDraft.rating || 0),
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Feedback
                        </label>
                        <textarea
                          rows={4}
                          value={reviewDraft.comment}
                          onChange={(event) =>
                            handleReviewDraftChange(reviewBookingId, {
                              comment: event.target.value,
                            })
                          }
                          placeholder="Tell this provider what went well and what could be better."
                          className="mt-2 w-full rounded-[1.2rem] border border-border/70 bg-background/90 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleSubmitReview(group, reviewTarget)
                            }
                            disabled={submittingReviewId === reviewBookingId}
                            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {submittingReviewId === reviewBookingId
                              ? "Saving feedback..."
                              : reviewTarget?.review
                                ? "Update review"
                                : "Submit review"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenReviewBookingId("")}
                            className="inline-flex items-center rounded-full border border-border/70 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-border/70 bg-card/90 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">
            No booked providers yet
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Once you book a provider, their history will appear here with the
            newest and active bookings shown first.
          </p>
        </section>
      )}
    </div>
  );
}
