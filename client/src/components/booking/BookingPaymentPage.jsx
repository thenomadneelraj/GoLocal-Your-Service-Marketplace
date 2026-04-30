import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  confirmCheckoutBooking,
  confirmBookingPayment,
  createCheckoutDraft,
  createBookingTransaction,
  fetchBookingById,
} from "@/lib/bookingApi";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";

const PLATFORM_FEE_PERCENT = 5;
const BOOKING_DRAFT_KEY = (providerId) => `booking-draft:${providerId}`;
const DEFAULT_SLOTS = ["9:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const sanitizeBankName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getTodayValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function BookingPaymentPage() {
  const { bookingId, providerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientAccess = getAccountAccessState(user);
  const draftProviderId = providerId || "";
  const isDraftCheckout = Boolean(draftProviderId && !bookingId);

  const [booking, setBooking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookingDate, setBookingDate] = useState(getTodayValue());
  const [timeSlot, setTimeSlot] = useState(DEFAULT_SLOTS[1]);
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCheckout = async () => {
      try {
        setLoading(true);
        setError("");

        const profilePromise = api.get("/auth/profile");
        const settingsPromise = api.get("/auth/platform-status").catch(() => null);

        if (isDraftCheckout) {
          const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY(draftProviderId));
          if (!savedDraft) {
            throw new Error("Your selected services are missing. Please choose them again.");
          }

          const parsedDraft = JSON.parse(savedDraft);
          const [providerResponse, profileResponse] = await Promise.all([
            api.get(`/api/providers/${draftProviderId}`),
            profilePromise,
            settingsPromise,
          ]);
          if (!mounted) return;

          const payload = providerResponse.data?.data || providerResponse.data || {};
          const activeServices = Array.isArray(payload.services) ? payload.services : [];
          const chosenServices = activeServices.filter((service) =>
            (parsedDraft.serviceIds || []).includes(String(service._id)),
          );

          if (!chosenServices.length) {
            throw new Error("One or more selected services are no longer available.");
          }

          setProvider({
            id: payload._id || draftProviderId,
            name: payload.name || "Provider",
            availabilitySummary: payload.availabilitySummary || {
              status: payload.available ? "available" : "unavailable",
              reason: payload.available
                ? "Provider is available for booking."
                : "Provider is currently unavailable.",
            },
          });
          setSelectedServices(chosenServices);
          setBookingDate(parsedDraft.bookingDate || getTodayValue());
          setTimeSlot(parsedDraft.timeSlot || DEFAULT_SLOTS[1]);
          setAddress(parsedDraft.address || "");
          setUserProfile(
            profileResponse.data?.data?.user ||
              profileResponse.data?.user ||
              null,
          );
          return;
        }

        const [bookingResponse, profileResponse] = await Promise.all([
          fetchBookingById(bookingId),
          profilePromise,
          settingsPromise,
        ]);
        if (!mounted) return;
        const bookingPayload = bookingResponse.data?.data?.booking || null;
        setBooking(bookingPayload);
        setSelectedServices(
          Array.isArray(bookingPayload?.selectedServices)
            ? bookingPayload.selectedServices
            : [],
        );
        setBookingDate(
          bookingPayload?.bookingDate
            ? new Date(bookingPayload.bookingDate).toISOString().slice(0, 10)
            : getTodayValue(),
        );
        setTimeSlot(bookingPayload?.timeSlot || DEFAULT_SLOTS[1]);
        setAddress(bookingPayload?.address || "");
        setUserProfile(
          profileResponse.data?.data?.user ||
            profileResponse.data?.user ||
            null,
        );
      } catch (nextError) {
        if (!mounted) return;
        setError(
          nextError.response?.data?.message ||
            nextError.message ||
            "Could not load this checkout flow.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCheckout();

    return () => {
      mounted = false;
    };
  }, [bookingId, draftProviderId, isDraftCheckout]);

  const subtotal = useMemo(
    () =>
      selectedServices.reduce(
        (sum, service) => sum + Number(service.price || 0),
        0,
      ),
    [selectedServices],
  );
  const platformFee = useMemo(
    () => Number((subtotal * (PLATFORM_FEE_PERCENT / 100)).toFixed(2)),
    [subtotal],
  );
  const totalAmount = useMemo(
    () => Number((subtotal + platformFee).toFixed(2)),
    [platformFee, subtotal],
  );
  const generatedUpiId = useMemo(() => {
    const phone = String(userProfile?.phone || "").replace(/\D/g, "");
    const bankName = sanitizeBankName(userProfile?.bankName || "");
    return phone && bankName ? `${phone}@${bankName}` : "";
  }, [userProfile?.bankName, userProfile?.phone]);

  const serviceTitle = useMemo(
    () =>
      selectedServices.length
        ? selectedServices.map((service) => service.title).join(", ")
        : "Service",
    [selectedServices],
  );

  const handleCheckout = async () => {
    if (!clientAccess.canCreateBookings) {
      const message =
        clientAccess.description ||
        "Your account is awaiting admin approval before booking providers.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!selectedServices.length) {
      setError("Select at least one service before checkout.");
      toast.error("Select at least one service before checkout.");
      return;
    }

    if (!bookingDate || !timeSlot || !address.trim()) {
      setError("Choose a booking date, time slot, and address before checkout.");
      toast.error("Choose a booking date, time slot, and address before checkout.");
      return;
    }

    if (paymentMethod === "upi" && !generatedUpiId) {
      toast.error(
        "Add your bank name and phone number in personal information before paying with UPI.",
      );
      navigate("/settings");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      let activeBookingId = bookingId;

      if (!activeBookingId) {
        const draftResponse = await createCheckoutDraft({
          providerId: provider?.id || draftProviderId,
          serviceIds: selectedServices.map(
            (service) => String(service.serviceId || service._id),
          ),
          bookingDate,
          timeSlot,
          address: address.trim(),
          notes: `Checkout prepared for ${serviceTitle}.`,
        });
        activeBookingId = draftResponse.data?.data?.booking?._id;

        if (!activeBookingId) {
          throw new Error("Booking draft was created without an id.");
        }
      }

      await createBookingTransaction({
        bookingId: activeBookingId,
        paymentMethod,
      });

      if (bookingId) {
        await confirmBookingPayment(activeBookingId, { paymentMethod });
      } else {
        await confirmCheckoutBooking({
          bookingId: activeBookingId,
          paymentMethod,
        });
      }

      if (draftProviderId) {
        sessionStorage.removeItem(BOOKING_DRAFT_KEY(draftProviderId));
      }

      toast.success(
        paymentMethod === "upi"
          ? "Checkout complete. Booking sent to the provider."
          : "COD booking confirmed and sent to the provider.",
      );
      navigate("/client/bookings");
    } catch (nextError) {
      const message =
        nextError.response?.data?.message ||
        nextError.message ||
        "Could not complete checkout.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8">
        Loading checkout...
      </section>
    );
  }

  if (error && !selectedServices.length && !booking) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" asChild>
            <Link to={draftProviderId ? `/providers/${draftProviderId}` : "/providers"}>
              Back
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Checkout
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">
          Review and Checkout
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Confirm your selected services, review the order summary, and finish payment before the provider receives the request.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">Selected Services</h2>
            <div className="mt-4 space-y-3">
              {selectedServices.map((service) => (
                <div
                  key={String(service.serviceId || service._id || service.title)}
                  className="flex items-center justify-between rounded-[1rem] border border-border/60 bg-card px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{service.title}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(service.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">Booking Details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                <span className="mb-2 block font-medium text-foreground">Date</span>
                <input
                  type="date"
                  value={bookingDate}
                  min={getTodayValue()}
                  onChange={(event) => setBookingDate(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-border/70 bg-card px-4 outline-none transition focus:border-primary/50"
                />
              </label>
              <label className="text-sm text-muted-foreground">
                <span className="mb-2 block font-medium text-foreground">Time Slot</span>
                <select
                  value={timeSlot}
                  onChange={(event) => setTimeSlot(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-border/70 bg-card px-4 outline-none transition focus:border-primary/50"
                >
                  {DEFAULT_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-muted-foreground md:col-span-2">
                <span className="mb-2 block font-medium text-foreground">Service Address / Instructions</span>
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={4}
                  className="w-full rounded-[1.5rem] border border-border/70 bg-card px-4 py-3 outline-none transition focus:border-primary/50"
                  placeholder="Add the address or access instructions for the provider."
                />
              </label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">Payment Method</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                { id: "upi", label: "UPI" },
                { id: "cod", label: "Cash on Delivery" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={`rounded-[1.25rem] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    paymentMethod === option.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Bank Name:</span>{" "}
                {userProfile?.bankName || "Not added yet"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Generated UPI ID:</span>{" "}
                {generatedUpiId || "Add phone and bank name in personal information"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
            <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Provider:</span>{" "}
                {booking?.providerId?.name || provider?.name || "Provider"}
              </p>
              <p>
                <span className="font-medium text-foreground">Date:</span>{" "}
                {formatDisplayDate(bookingDate)}
              </p>
              <p>
                <span className="font-medium text-foreground">Time Slot:</span>{" "}
                {timeSlot}
              </p>
            </div>

            <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              {selectedServices.map((service) => (
                <div
                  key={`summary-${String(service.serviceId || service._id || service.title)}`}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{service.title}</span>
                  <span>{formatCurrency(service.price)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-4">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                <span>{formatCurrency(platformFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3 text-base font-semibold text-foreground">
                <span>Total Amount</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {!clientAccess.canCreateBookings ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">
                {clientAccess.title || "Account approval pending."}
              </span>{" "}
              {clientAccess.description}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button variant="outline" asChild>
              <Link to={draftProviderId ? `/providers/${draftProviderId}` : "/client/bookings"}>
                Back
              </Link>
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={submitting || !clientAccess.canCreateBookings}
            >
              {submitting ? "Processing Checkout..." : "Checkout"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
