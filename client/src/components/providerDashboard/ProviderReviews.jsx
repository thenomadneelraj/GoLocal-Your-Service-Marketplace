import { useEffect, useMemo, useState } from "react";
import { MessageSquareMore, Star, UserRound } from "lucide-react";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

const formatDate = (value) => {
  if (!value) return "Recently";
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
    .join("") || "C";

const renderStars = (rating) =>
  Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={index}
      size={15}
      className={
        index < Number(rating || 0)
          ? "fill-amber-400 text-amber-400"
          : "text-slate-300 dark:text-slate-600"
      }
    />
  ));

export default function ProviderReviews() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/api/providers/me/profile");
        if (!active) return;
        setProfile(response.data?.data || null);
      } catch (err) {
        if (!active) return;
        setError(
          err.response?.data?.message || "Could not load your client feedback."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, []);

  const reviews = useMemo(
    () => (Array.isArray(profile?.reviews) ? profile.reviews : []),
    [profile]
  );

  const summary = useMemo(() => {
    const averageRating = Number(profile?.rating || 0);
    const totalReviews = Number(profile?.reviewCount || profile?.totalReviews || reviews.length || 0);
    const commentsCount = reviews.filter((review) => String(review.comment || "").trim()).length;

    return {
      averageRating: averageRating.toFixed(1),
      totalReviews,
      commentsCount,
    };
  }, [profile, reviews]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-[2rem] border border-border/70 bg-card/80" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[1.75rem] border border-border/70 bg-card/80"
            />
          ))}
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[1.75rem] border border-border/70 bg-card/80"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-8 shadow-[0_24px_60px_-28px_rgba(4,24,15,0.45)]">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
        <div className="relative space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
            Reputation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Client Reviews
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            See the latest ratings and written feedback from completed bookings.
            Each review includes the real client name and profile image.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Average Rating",
            value: summary.averageRating,
            suffix: "/5",
            icon: Star,
          },
          {
            label: "Total Reviews",
            value: summary.totalReviews,
            suffix: "",
            icon: MessageSquareMore,
          },
          {
            label: "Written Feedback",
            value: summary.commentsCount,
            suffix: "",
            icon: UserRound,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <section
              key={item.label}
              className="rounded-[1.75rem] border border-border/70 bg-card/92 p-5 shadow-[0_24px_70px_-46px_rgba(4,24,15,0.56)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    {item.value}
                    <span className="ml-1 text-base font-medium text-muted-foreground">
                      {item.suffix}
                    </span>
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

      {reviews.length ? (
        <div className="grid gap-4">
          {reviews.map((review) => {
            const photo = resolveMediaUrl(review.clientProfileImage);
            return (
              <section
                key={review.id}
                className="rounded-[1.75rem] border border-border/70 bg-card/92 p-6 shadow-[0_24px_70px_-46px_rgba(4,24,15,0.56)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                    {photo ? (
                      <img
                        src={photo}
                        alt={review.clientName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(review.clientName)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
                          {review.clientName}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {review.serviceTitle || "Service booking"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-1">
                      {renderStars(review.rating)}
                      <span className="ml-2 text-sm font-medium text-foreground">
                        {Number(review.rating || 0).toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {review.comment ||
                        "This client shared a star rating without extra written feedback."}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-border/70 bg-card/90 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">
            No reviews yet
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Once a client completes a booking and leaves feedback, their name,
            profile image, rating, and comment will appear here.
          </p>
        </section>
      )}
    </div>
  );
}
