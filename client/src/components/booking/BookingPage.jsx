import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

const BOOKING_DRAFT_KEY = (providerId) => `booking-draft:${providerId}`;
const DEFAULT_SLOTS = ["9:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

const getTodayValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const buildFallbackService = (payload = {}) => ({
  _id: "default-service",
  title:
    payload?.serviceType && payload?.serviceType !== "Other"
      ? `${payload.serviceType} Service`
      : "General Service",
  category: payload?.serviceType || "Other",
  duration: "1 hour",
  locationType: "offline",
  price: Number(payload?.hourlyRate || 0),
});

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState(getTodayValue());
  const [timeSlot, setTimeSlot] = useState(DEFAULT_SLOTS[1]);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProvider = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/api/providers/${id}`);
        const payload = response.data?.data || response.data;
        const providerServices = Array.isArray(payload?.services) ? payload.services : [];
        const normalizedServices = providerServices.length
          ? providerServices
          : [buildFallbackService(payload)];
        const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY(id));
        const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null;
        const initialServiceId =
          parsedDraft?.serviceId &&
          normalizedServices.some((service) => service._id === parsedDraft.serviceId)
            ? parsedDraft.serviceId
            : normalizedServices[0]?._id || "";

        if (!isMounted) {
          return;
        }

        setProvider({
          id: payload?._id || payload?.id || id,
          name: payload?.name || "Provider",
          serviceType: payload?.serviceType || "Service",
          location: payload?.location || "",
          available: payload?.available ?? payload?.availability ?? false,
          availabilitySummary: payload?.availabilitySummary || {
            status: payload?.available ?? payload?.availability ? "available" : "unavailable",
            reason: payload?.available ?? payload?.availability
              ? "Provider is available for booking."
              : "Provider is currently unavailable.",
            canBook: Boolean(payload?.available ?? payload?.availability),
          },
        });
        setServices(normalizedServices);
        setSelectedServiceId(initialServiceId);
        setBookingDate(parsedDraft?.bookingDate || getTodayValue());
        setTimeSlot(parsedDraft?.timeSlot || DEFAULT_SLOTS[1]);
        setAddress(parsedDraft?.address || "");
        setPaymentMethod(parsedDraft?.paymentMethod || "card");
      } catch (err) {
        console.error("Failed to load provider booking data:", err);
        if (isMounted) {
          setError("Could not load provider booking details. Please return to the provider profile and try again.");
          setProvider(null);
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProvider();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const addressLabel =
    selectedService?.locationType === "online"
      ? "Meeting link or contact address"
      : "Service address";

  const addressPlaceholder =
    selectedService?.locationType === "online"
      ? "Enter the video meeting link or online service instructions"
      : "Enter the full service address";
  const bookingLocked = provider?.availabilitySummary?.status === "unavailable";

  const handleContinue = () => {
    setError("");

    if (bookingLocked) {
      const message =
        provider?.availabilitySummary?.reason ||
        "This provider is currently unavailable for booking.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!selectedService) {
      const message = "Please select a service before continuing.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!bookingDate || !address.trim()) {
      const message =
        "Please choose a booking date and enter the service address or meeting instructions.";
      setError(message);
      toast.error(message);
      return;
    }

    const draft = {
      providerId: id,
      providerName: provider?.name || "Provider",
      serviceId: selectedService._id,
      serviceTitle: selectedService.title,
      bookingDate,
      timeSlot,
      address: address.trim(),
      paymentMethod,
      totalAmount: Number(selectedService.price || 0),
      duration: selectedService.duration || "",
      locationType: selectedService.locationType || "offline",
    };

    sessionStorage.setItem(BOOKING_DRAFT_KEY(id), JSON.stringify(draft));
    toast.success("Booking details saved. Review and confirm your appointment.");
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
          Select a real provider service, choose your preferred time, and save the booking draft before the final confirmation step.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {provider?.availabilitySummary?.reason ? (
        <div className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
          provider.availabilitySummary.status === "available"
            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : provider.availabilitySummary.status === "busy"
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : "border border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-slate-300"
        }`}>
          {provider.availabilitySummary.reason}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">1. Choose a service</h2>
            {services.length ? (
              <div className="mt-4 grid gap-3">
                {services.map((service) => {
                  const active = service._id === selectedServiceId;

                  return (
                    <button
                      key={service._id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(service._id);
                        setError("");
                      }}
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
                            {service.category} | {service.duration}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                This provider does not have bookable services yet.
              </p>
            )}
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
                  onChange={(event) => {
                    setBookingDate(event.target.value);
                    setError("");
                  }}
                  className="w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Time slot</span>
                <select
                  value={timeSlot}
                  onChange={(event) => {
                    setTimeSlot(event.target.value);
                    setError("");
                  }}
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
            <h2 className="text-lg font-semibold text-foreground">3. {addressLabel}</h2>
            <textarea
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setError("");
              }}
              rows={4}
              placeholder={addressPlaceholder}
              className="mt-4 w-full rounded-xl border border-border/70 bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">4. Payment method</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {["card", "upi"].map((method) => {
                const active = paymentMethod === method;

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      setError("");
                    }}
                    className={`rounded-[1.25rem] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 bg-card text-foreground hover:border-primary/30"
                    }`}
                  >
                    {method.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <h2 className="text-lg font-semibold text-foreground">Booking summary</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Provider:</span> {provider.name}
            </p>
            <p>
              <span className="font-medium text-foreground">Service:</span> {selectedService?.title || "Select a service"}
            </p>
            <p>
              <span className="font-medium text-foreground">Date:</span> {bookingDate || "-"}
            </p>
            <p>
              <span className="font-medium text-foreground">Time:</span> {timeSlot}
            </p>
            <p>
              <span className="font-medium text-foreground">Payment:</span> {paymentMethod.toUpperCase()}
            </p>
            <p>
              <span className="font-medium text-foreground">Location:</span> {selectedService?.locationType || "offline"}
            </p>
            <p>
              <span className="font-medium text-foreground">Total:</span> {formatCurrency(selectedService?.price)}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button variant="outline" asChild>
              <Link to={`/providers/${id}`}>Back to Provider</Link>
            </Button>
            <Button onClick={handleContinue} disabled={bookingLocked || !services.length}>
              Continue to Confirmation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
