import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronRight,
  Filter,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";
import { subscribeToProviderUpdates } from "@/lib/socket";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockClientProviders } from "@/lib/mockWorkspaceData";

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const getInitials = (value = "") =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P";

const normalizeProviderCard = (item = {}) => ({
  id: item._id || item.id,
  name: item.name || "Unknown Provider",
  serviceType: item.serviceType || "General Service",
  rating: Number(item.rating || 0),
  reviewCount: Number(item.reviewCount ?? item.totalReviews ?? 0),
  location: item.location || "Location not set",
  hourlyRate: Number(item.hourlyRate || 0),
  image: item.profileImage || item.profilePhoto || item.image || "",
  available: item.available ?? item.availability ?? false,
  verified: item.verified ?? item.isApproved ?? false,
  isMock: Boolean(item.isMock),
});

const normalizeProviderDetails = (item = {}) => {
  const services = Array.isArray(item.services) ? item.services : [];
  const isAvailable = item.available ?? item.availability ?? false;
  const availabilitySummary = item.availabilitySummary || {
    status: isAvailable ? "available" : "unavailable",
    reason: isAvailable
      ? "Provider is available for booking."
      : "Provider is currently unavailable.",
    canBook: Boolean(isAvailable),
  };

  return {
    id: item._id || item.id,
    name: item.name || "Unknown Provider",
    serviceType: item.serviceType || "General Service",
    rating: Number(item.rating || 0),
    reviewCount: Number(item.reviewCount ?? item.totalReviews ?? 0),
    location: item.location || "Location not set",
    hourlyRate: Number(item.hourlyRate || 0),
    image: item.profileImage || item.profilePhoto || item.image || "",
    phone: item.phone || "",
    email: item.email || item.userId?.email || "",
    bio: item.bio || "This provider has not added a bio yet.",
    completedJobs: Number(item.completedJobs || 0),
    experience: Number(item.yearsExperience ?? item.experience ?? 0),
    verified: item.verified ?? item.isApproved ?? false,
    isMock: Boolean(item.isMock),
    services: services.length
      ? services.map((service) =>
          typeof service === "string" ? service : service.title || "Service"
        )
      : [item.serviceType || "General Service"],
    availabilitySummary,
  };
};

const getAvailabilityLabel = (provider) =>
  provider.available ? "Available now" : "Unavailable";

export default function ClientProviders() {
  const { user } = useAuth();
  const clientAccess = getAccountAccessState(user);
  const canBook = clientAccess.canCreateBookings;
  const [providers, setProviders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/providers", {
        params: {
          search: searchQuery.trim() || undefined,
          location: locationQuery.trim() || undefined,
          limit: 40,
        },
      });

      const items =
        response.data?.providers ||
        response.data?.data?.providers ||
        response.data?.data ||
        [];

      setProviders(Array.isArray(items) ? items.map(normalizeProviderCard) : []);
    } catch (err) {
      setProviders([]);
      setError(
        err.response?.data?.message ||
          "Could not load providers right now."
      );
    } finally {
      setLoading(false);
    }
  }, [locationQuery, searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProviders();
    }, 250);

    const unsubscribe = subscribeToProviderUpdates(() => {
      fetchProviders();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [fetchProviders]);

  const handleViewProfile = async (providerId) => {
    const mockProvider = mockClientProviders.find(
      (provider) => String(provider.id) === String(providerId)
    );

    if (mockProvider) {
      setSelectedProviderId(providerId);
      setSelectedProvider({
        ...normalizeProviderDetails(mockProvider),
        dataOrigin: "mock",
      });
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    try {
      setSelectedProviderId(providerId);
      setSelectedProvider(null);
      setDetailError("");
      setDetailLoading(true);

      const response = await api.get(`/api/providers/${providerId}`);
      const payload = response.data?.data || response.data;
      setSelectedProvider({
        ...normalizeProviderDetails(payload),
        dataOrigin: "real",
      });
    } catch (err) {
      setDetailError(
        err.response?.data?.message ||
          "Could not load this provider profile."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setSelectedProviderId("");
    setSelectedProvider(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const hasFilters = Boolean(searchQuery.trim() || locationQuery.trim());
  const layeredProviders = useMemo(
    () =>
      mergeLayeredCollections(
        providers,
        mockClientProviders.map(normalizeProviderCard),
        {
          getId: (provider) => provider.id,
        }
      ),
    [providers]
  );

  const providerCountLabel = useMemo(
    () =>
      `${layeredProviders.length} provider${layeredProviders.length === 1 ? "" : "s"} found`,
    [layeredProviders.length]
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Find Professionals
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse real registered service providers in your area and open a profile before booking.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {providerCountLabel}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by name, service or profession..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
              />
            </div>
            <div className="relative w-full md:w-64 group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Filter by location..."
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (hasFilters) {
                  setSearchQuery("");
                  setLocationQuery("");
                  return;
                }

                fetchProviders();
              }}
              className="h-14 w-14 rounded-2xl shrink-0 border border-border/60 bg-background flex items-center justify-center text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              aria-label={hasFilters ? "Clear provider filters" : "Refresh providers"}
            >
              <Filter size={20} />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[380px] animate-pulse rounded-[2rem] border border-border/60 bg-card/50"
            />
          ))}
        </div>
      ) : layeredProviders.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {layeredProviders.map((provider) => {
            const imageUrl = resolveMediaUrl(provider.image);

            return (
              <div
                key={provider.id}
                className="group bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent z-10" />
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={provider.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-primary text-5xl font-bold">
                      {getInitials(provider.name)}
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2">
                    <span className="bg-background/85 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {provider.serviceType}
                    </span>
                    <DataOriginBadge origin={provider.dataOrigin} liveLabel="Live" sampleLabel="Sample" className="bg-background/85" />
                    <span className={`backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                      provider.isMock
                        ? "bg-amber-500/85 text-white"
                        : "bg-emerald-500/85 text-white"
                    }`}>
                      {provider.isMock ? "Mock Provider" : "Verified Provider"}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {provider.name}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-500 shrink-0">
                      <Star size={14} fill="currentColor" />
                      <span className="text-sm font-bold">
                        {provider.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center text-muted-foreground text-sm gap-2 mb-3">
                    <MapPin size={14} />
                    <span className="truncate">{provider.location}</span>
                  </div>

                  <div className="mb-4 inline-flex w-fit rounded-full bg-muted/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {getAvailabilityLabel(provider)}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {provider.reviewCount} review
                    {provider.reviewCount === 1 ? "" : "s"}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                        Services From
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(provider.hourlyRate)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl px-5 py-5 gap-2 group/btn font-semibold"
                      onClick={() => handleViewProfile(provider.id)}
                    >
                      View Profile
                      <ChevronRight
                        size={14}
                        className="group-hover/btn:translate-x-1 transition-transform"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
            <BriefcaseBusiness size={40} opacity={0.4} />
          </div>
          <h3 className="text-xl font-semibold">No professionals found</h3>
          <p className="text-muted-foreground mt-2 max-w-xs text-center">
            Try a different name, service keyword, or location filter.
          </p>
        </div>
      )}

      {selectedProviderId ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm px-4 py-6">
          <div className="mx-auto flex h-full max-w-4xl items-center justify-center">
            <div className="w-full max-h-full overflow-y-auto rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-[0_36px_100px_-48px_rgba(15,23,42,0.8)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                    Provider Profile
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {selectedProvider?.name || "Loading profile"}
                    </h2>
                    {selectedProvider?.dataOrigin ? (
                      <DataOriginBadge origin={selectedProvider.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Review provider details and book directly from this profile card.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseProfile}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              {detailLoading ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
                  <div className="h-80 animate-pulse rounded-[1.75rem] border border-border/60 bg-card/50" />
                  <div className="space-y-4">
                    <div className="h-32 animate-pulse rounded-[1.5rem] border border-border/60 bg-card/50" />
                    <div className="h-32 animate-pulse rounded-[1.5rem] border border-border/60 bg-card/50" />
                    <div className="h-24 animate-pulse rounded-[1.5rem] border border-border/60 bg-card/50" />
                  </div>
                </div>
              ) : detailError ? (
                <div className="mt-6 rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
                  {detailError}
                </div>
              ) : selectedProvider ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
                  <div className="rounded-[1.75rem] border border-border/60 bg-muted/20 p-5">
                    <div className="aspect-[4/4.4] overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                      {resolveMediaUrl(selectedProvider.image) ? (
                        <img
                          src={resolveMediaUrl(selectedProvider.image)}
                          alt={selectedProvider.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-6xl font-black text-primary">
                          {getInitials(selectedProvider.name)}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="mt-0.5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">Location</p>
                          <p>{selectedProvider.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone size={16} className="mt-0.5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">Phone</p>
                          <p>{selectedProvider.phone || "Not shared"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail size={16} className="mt-0.5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">Email</p>
                          <p>{selectedProvider.email || "Not shared"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                              {selectedProvider.name}
                            </h3>
                            {selectedProvider.verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                                <ShieldCheck size={13} />
                                {selectedProvider.isMock ? "Mock Provider" : "Verified Provider"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm font-medium text-muted-foreground">
                            {selectedProvider.serviceType}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-right text-primary">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                            Services from
                          </p>
                          <p className="mt-1 text-xl font-black">
                            {formatCurrency(selectedProvider.hourlyRate)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Rating
                          </p>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {selectedProvider.rating.toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedProvider.reviewCount} review
                            {selectedProvider.reviewCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Experience
                          </p>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {selectedProvider.experience}
                          </p>
                          <p className="text-sm text-muted-foreground">years</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Completed
                          </p>
                          <p className="mt-2 text-lg font-bold text-foreground">
                            {selectedProvider.completedJobs}
                          </p>
                          <p className="text-sm text-muted-foreground">jobs</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        About
                      </p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {selectedProvider.bio}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        Services
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedProvider.services.map((service) => (
                          <span
                            key={service}
                            className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-semibold text-foreground"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
                        selectedProvider.availabilitySummary.status === "available"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : selectedProvider.availabilitySummary.status === "busy"
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {selectedProvider.availabilitySummary.reason}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canBook ? (
                        selectedProvider.availabilitySummary.status !== "unavailable" ? (
                          <Button asChild className="rounded-xl">
                            <Link to={`/booking/${selectedProvider.id}`}>
                              Book Now
                            </Link>
                          </Button>
                        ) : (
                          <Button className="rounded-xl" disabled>
                            Book Now
                          </Button>
                        )
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <Button className="rounded-xl" disabled>
                            Book Now
                          </Button>
                          <p className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangle size={12} />
                            {clientAccess.title || "Booking unavailable"} - booking unavailable.
                          </p>
                        </div>
                      )}
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link to={`/providers/${selectedProvider.id}`}>
                          Open Full Profile
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={handleCloseProfile}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
