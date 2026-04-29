import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const EMPTY_PROFILE = {
  rating: 0,
  totalReviews: 0,
  completedJobs: 0,
  approvalStatus: "pending",
};

const formatDate = (value) => {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getServiceLabel = (booking = {}) => {
  if (Array.isArray(booking.selectedServices) && booking.selectedServices.length) {
    return booking.selectedServices.map((service) => service.title).filter(Boolean).join(", ");
  }

  return booking.serviceId?.title || booking.serviceId?.name || "Service";
};

const getInitials = (value = "") =>
  String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "CL";

function Panel({ className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-[0_24px_60px_-42px_rgba(4,24,15,0.55)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

export default function ProviderReputation() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [reviews, setReviews] = useState([]);

  const loadReputation = async () => {
    try {
      setLoading(true);
      const [profileResponse, bookingsResponse] = await Promise.all([
        api.get("/api/providers/me/profile"),
        api.get("/api/bookings", {
          params: {
            status: "completed",
            limit: 100,
          },
        }),
      ]);

      const providerProfile = profileResponse.data?.data || EMPTY_PROFILE;
      const bookingItems = bookingsResponse.data?.data?.items || [];
      const reviewItems = bookingItems
        .filter((booking) => booking.review?.rating)
        .map((booking) => ({
          id: booking.review?.id || `${booking._id}:review`,
          bookingId: booking._id,
          client: booking.clientId?.name || "Client",
          rating: Number(booking.review?.rating || 0),
          date: booking.review?.updatedAt || booking.review?.createdAt || booking.createdAt,
          comment: booking.review?.comment || "No written feedback provided.",
          service: getServiceLabel(booking),
          initials: getInitials(booking.clientId?.name || "Client"),
        }))
        .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));

      setProfile(providerProfile);
      setReviews(reviewItems);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load reputation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReputation();
  }, []);

  const filteredReviews = useMemo(() => {
    const normalized = String(search || "").trim().toLowerCase();
    if (!normalized) return reviews;

    return reviews.filter((review) =>
      [review.client, review.service, review.comment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [reviews, search]);

  const ratingsData = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((star, index) => ({
        star,
        count: reviews.filter((review) => review.rating === star).length,
        color:
          index === 0
            ? "rgb(16, 185, 129)"
            : index === 1
              ? "rgb(52, 211, 153)"
              : index === 2
                ? "rgb(245, 158, 11)"
                : index === 3
                  ? "rgb(249, 115, 22)"
                  : "rgb(239, 68, 68)",
      })),
    [reviews]
  );

  const positiveReviewRate = reviews.length
    ? Math.round(
        (reviews.filter((review) => Number(review.rating || 0) >= 4).length /
          reviews.length) *
          100
      )
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-border/70 bg-card/80">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin text-emerald-500" />
          Loading provider reputation...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel className="relative p-8 lg:col-span-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/12 via-emerald-500/5 to-transparent" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <ShieldCheck size={14} />
                Reputation Overview
              </div>

              <div className="flex items-center gap-4">
                <h1 className="text-6xl font-semibold leading-none tracking-tighter text-foreground">
                  {Number(profile.rating || 0).toFixed(1)}
                </h1>
                <div>
                  <div className="flex gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        size={18}
                        fill={value <= Math.round(Number(profile.rating || 0)) ? "#f59e0b" : "none"}
                        className={
                          value <= Math.round(Number(profile.rating || 0))
                            ? "text-amber-500"
                            : "text-amber-500/25"
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Professional rating
                  </p>
                </div>
              </div>

              <p className="max-w-lg text-sm leading-7 text-muted-foreground">
                This score now comes from real completed-booking reviews, not mock
                placeholders. Keep your completed work quality high to improve visibility and trust.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Reviews",
                  value: Number(profile.totalReviews || 0).toLocaleString("en-IN"),
                },
                {
                  label: "Completed Jobs",
                  value: Number(profile.completedJobs || 0).toLocaleString("en-IN"),
                },
                {
                  label: "Positive Rate",
                  value: `${positiveReviewRate}%`,
                },
                {
                  label: "Approval",
                  value: String(profile.approvalStatus || "pending").toUpperCase(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/60 bg-background/80 p-5 text-center shadow-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="p-8 lg:col-span-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Rating distribution
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review count by star score.
              </p>
            </div>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={ratingsData}>
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="4 4"
                  stroke="hsl(var(--border))"
                  opacity={0.45}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="star"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={38}
                  tickFormatter={(value) => `${value} star`}
                />
                <Tooltip formatter={(value) => `${value} reviews`} />
                <Bar dataKey="count" radius={[10, 10, 10, 10]} barSize={20}>
                  {ratingsData.map((entry) => (
                    <Cell key={entry.star} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="p-7">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Client feedback
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reviews written on completed bookings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full xl:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search feedback..."
                className="h-10 w-full rounded-xl border border-border/60 bg-background pl-10 pr-4 text-sm outline-none"
              />
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-border/60 px-4 text-xs font-semibold"
              onClick={loadReputation}
            >
              <RefreshCcw size={14} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredReviews.length ? (
            filteredReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[2rem] border border-border/60 bg-muted/15 p-6 transition-colors hover:border-emerald-500/30 hover:bg-card/70"
              >
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex min-w-[120px] flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-lg font-semibold text-emerald-600">
                      {review.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{review.client}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Verified client
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 shadow-sm">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            size={14}
                            fill={value <= review.rating ? "#f59e0b" : "none"}
                            className={
                              value <= review.rating ? "text-amber-500" : "text-amber-500/20"
                            }
                          />
                        ))}
                        <span className="ml-1 text-xs font-semibold text-foreground">
                          {review.rating}.0
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-lg border border-border/60 bg-muted/35 px-2 py-1">
                          {review.service}
                        </span>
                        <span>{formatDate(review.date)}</span>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-muted-foreground">
                      "{review.comment}"
                    </p>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 size={14} />
                      Reviewed on a completed booking
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
              No review feedback matched your search.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
