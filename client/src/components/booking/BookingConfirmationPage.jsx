import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createBooking } from "@/lib/bookingApi";
import { toast } from "sonner";

const BOOKING_DRAFT_KEY = (providerId) => `booking-draft:${providerId}`;

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDisplayDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY(id));

      if (!savedDraft) {
        setError("Your booking draft is missing. Please select a service and time again.");
        return;
      }

      const parsedDraft = JSON.parse(savedDraft);
      setDraft(parsedDraft);
      setError("");
    } catch (err) {
      console.error("Failed to read booking draft:", err);
      setError("Your booking draft could not be loaded. Please start the booking flow again.");
    }
  }, [id]);

  const isDraftComplete = useMemo(
    () =>
      Boolean(
        draft?.providerId &&
          draft?.serviceId &&
          draft?.serviceTitle &&
          draft?.bookingDate &&
          draft?.timeSlot &&
          draft?.address &&
          draft?.totalAmount
      ),
    [draft]
  );

  const handleConfirm = async () => {
    if (!draft || !isDraftComplete) {
      const message =
        "Your booking details are incomplete. Please return to the booking page and complete all fields.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      await createBooking({
        providerId: draft.providerId,
        serviceId: draft.serviceId,
        bookingDate: draft.bookingDate,
        timeSlot: draft.timeSlot,
        address: draft.address,
        notes:
          draft.locationType === "online"
            ? "Online booking confirmed by client."
            : "Offline booking confirmed by client.",
        totalAmount: draft.totalAmount,
        paymentMethod: draft.paymentMethod,
      });

      sessionStorage.removeItem(BOOKING_DRAFT_KEY(id));
      setSuccess(true);
      toast.success("Booking confirmed successfully.");
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message ||
        "Could not complete booking. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!draft && !success) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
        <h1 className="mb-2 text-3xl font-semibold text-foreground">Booking Confirmation</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Review your booking details before the appointment is submitted.
        </p>

        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error || "Your booking draft is missing."}
        </div>

        <Button variant="outline" asChild>
          <Link to={`/booking/${id}`}>Back to Booking</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
      <h1 className="mb-2 text-3xl font-semibold text-foreground">Booking Confirmation</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Review your booking details before the appointment is submitted.
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Provider:</span> {draft?.providerName || "Provider"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Service:</span> {draft?.serviceTitle || "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Date:</span> {formatDisplayDate(draft?.bookingDate)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Time Slot:</span> {draft?.timeSlot || "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Delivery Mode:</span> {draft?.locationType || "offline"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Address / Instructions:</span> {draft?.address || "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Payment Method:</span> {(draft?.paymentMethod || "-").toUpperCase()}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <p className="mb-3 text-base font-semibold text-foreground">Price Summary</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Service Price:</span> {formatCurrency(draft?.totalAmount)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Duration:</span> {draft?.duration || "As listed by provider"}
          </p>
          <p className="mt-4 text-lg font-semibold text-foreground">
            Total: {formatCurrency(draft?.totalAmount)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Booking confirmed successfully. Your appointment and payout records were created with the selected live service data.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to={`/booking/${id}`}>Back to Booking</Link>
        </Button>
        <Button onClick={handleConfirm} disabled={loading || success || !isDraftComplete}>
          {loading ? "Processing..." : "Confirm & Book"}
        </Button>
        {success ? (
          <Button variant="outline" asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
