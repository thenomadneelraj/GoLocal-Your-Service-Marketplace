import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";

const BOOKING_DRAFT_KEY = (providerId) => `booking-draft:${providerId}`;
const DEFAULT_SLOTS = ["9:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

const getTodayValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientAccess = getAccountAccessState(user);

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [bookingDate, setBookingDate] = useState(getTodayValue());
  const [timeSlot, setTimeSlot] = useState(DEFAULT_SLOTS[1]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProvider = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/api/providers/${id}`);
        const payload = response.data?.data || {};
        const activeServices = Array.isArray(payload?.services) ? payload.services : [];
        const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY(id));
        const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null;
        const restoredIds = Array.isArray(parsedDraft?.serviceIds)
          ? parsedDraft.serviceIds.filter((serviceId) =>
              activeServices.some((service) => String(service._id) === String(serviceId))
            )
          : [];

        if (!mounted) return;

        setProvider({
          id: payload?._id || id,
          name: payload?.name || "Provider",
          availabilitySummary: payload?.availabilitySummary || {
            status: payload?.available ? "available" : "unavailable",
            reason: payload?.available
              ? "Provider is available for booking."
              : "Provider is currently unavailable.",
          },
        });
        setServices(activeServices);
        setSelectedServiceIds(
          restoredIds.length
            ? restoredIds
            : activeServices[0]?._id
              ? [String(activeServices[0]._id)]
              : []
        );
        setBookingDate(parsedDraft?.bookingDate || getTodayValue());
        setTimeSlot(parsedDraft?.timeSlot || DEFAULT_SLOTS[1]);
        setAddress(parsedDraft?.address || "");
      } catch (nextError) {
        if (!mounted) return;
        setError(
          nextError.response?.data?.message ||
            "Could not load provider booking details."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProvider();

    return () => {
      mounted = false;
    };
  }, [id]);

  const selectedServices = useMemo(
    () =>
      services.filter((service) =>
        selectedServiceIds.includes(String(service._id))
      ),
    [services, selectedServiceIds]
  );

  const baseAmount = useMemo(
    () =>
      selectedServices.reduce(
        (sum, service) => sum + Number(service.price || 0),
        0
      ),
    [selectedServices]
  );

  const requiresOfflineAddress = useMemo(
    () => selectedServices.some((service) => service.locationType !== "online"),
    [selectedServices]
  );

  const bookingLocked =
    provider?.availabilitySummary?.status === "unavailable" || !services.length;
  const bookingBlockedByAccount = !clientAccess.canCreateBookings;

  const toggleService = (serviceId) => {
    setSelectedServiceIds((current) =>
      current.includes(String(serviceId))
        ? current.filter((item) => item !== String(serviceId))
        : [...current, String(serviceId)]
    );
    setError("");
  };

  const handleContinue = () => {
    if (bookingBlockedByAccount) {
      const message = clientAccess.title || "Account approval pending.";
      setError(message);
      toast.error(message);
      return;
    }

    if (bookingLocked) {
      const message =
        provider?.availabilitySummary?.reason ||
        "This provider is currently unavailable for booking.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!selectedServiceIds.length) {
      setError("Select at least one work before continuing.");
      toast.error("Select at least one work before continuing.");
      return;
    }

    if (!bookingDate || !timeSlot || !address.trim()) {
      setError(
        "Choose a date, time slot, and add the service address or meeting instructions."
      );
      toast.error(
        "Choose a date, time slot, and add the service address or meeting instructions."
      );
      return;
    }

    const draft = {
      providerId: id,
      providerName: provider?.name || "Provider",
      serviceIds: selectedServices.map((service) => String(service._id)),
      serviceTitles: selectedServices.map((service) => service.title),
      bookingDate,
      timeSlot,
      address: address.trim(),
      totalAmount: baseAmount,
      requiresOfflineAddress,
    };

    sessionStorage.setItem(BOOKING_DRAFT_KEY(id), JSON.stringify(draft));
    navigate(`/booking/${id}/confirm`);
  };

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8">
        Loading booking details...
      </section>
    );
  }

  if (!provider) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error || "Provider details are unavailable right now."}
        </div>
        <div className="mt-6">
          <Button variant="outline" asChild>
            <Link to="/providers">Back to Providers</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Booking Flow
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Book {provider.name}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Select one or more works, choose your date and time, then continue to the payment step.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {bookingBlockedByAccount ? (
        <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <span className="font-semibold">{clientAccess.title || "Account approval pending."}</span>{" "}
          {clientAccess.description}
        </div>
      ) : null}

      {provider?.availabilitySummary?.reason ? (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {provider.availabilitySummary.reason}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">1. Select work</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Providers can publish multiple works. Pick one or more before booking.
            </p>
            <div className="mt-4 grid gap-3">
              {services.map((service) => {
                const active = selectedServiceIds.includes(String(service._id));
                return (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => toggleService(service._id)}
                    className={`rounded-[1.25rem] border p-4 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">{service.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {service.category} | {service.duration} | {service.locationType}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(service.price)}
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                          {active ? "Selected" : "Tap to add"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">2. Choose date and time</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Booking date</span>
                <input
                  type="date"
                  min={getTodayValue()}
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Time slot</span>
                <select
                  value={timeSlot}
                  onChange={(event) => setTimeSlot(event.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
                >
                  {DEFAULT_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">
              3. {requiresOfflineAddress ? "Service address" : "Meeting link / instructions"}
            </h2>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={4}
              placeholder={
                requiresOfflineAddress
                  ? "Enter the full service address"
                  : "Enter the online meeting link or instructions"
              }
              className="mt-4 w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <h2 className="text-lg font-semibold text-foreground">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Provider:</span> {provider.name}
            </p>
            <p>
              <span className="font-medium text-foreground">Works:</span>{" "}
              {selectedServices.length
                ? selectedServices.map((service) => service.title).join(", ")
                : "Select at least one"}
            </p>
            <p>
              <span className="font-medium text-foreground">Date:</span> {bookingDate || "-"}
            </p>
            <p>
              <span className="font-medium text-foreground">Time:</span> {timeSlot}
            </p>
            <p>
              <span className="font-medium text-foreground">Base total:</span> {formatCurrency(baseAmount)}
            </p>
            <p className="text-xs leading-6">
              Platform fees and payment options will be shown on the next step.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button variant="outline" asChild>
              <Link to={`/providers/${id}`}>Back to Provider</Link>
            </Button>
            <Button
              onClick={handleContinue}
              disabled={bookingLocked || bookingBlockedByAccount}
            >
              Review Booking
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
