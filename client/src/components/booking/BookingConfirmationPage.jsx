import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { createBookingDraft } from "@/lib/bookingApi";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";

const BOOKING_DRAFT_KEY = (providerId) => `booking-draft:${providerId}`;

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

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

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientAccess = getAccountAccessState(user);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY(id));
      if (!savedDraft) {
        setError("Your booking draft is missing. Please select the works again.");
        return;
      }
      setDraft(JSON.parse(savedDraft));
      setError("");
    } catch (nextError) {
      console.error("Failed to read booking draft:", nextError);
      setError("Your booking draft could not be loaded. Please start again.");
    }
  }, [id]);

  const isDraftComplete = useMemo(
    () =>
      Boolean(
        draft?.providerId &&
          draft?.serviceIds?.length &&
          draft?.bookingDate &&
          draft?.timeSlot &&
          draft?.address &&
          draft?.totalAmount
      ),
    [draft]
  );

  const handleContinueToPayment = async () => {
    if (!clientAccess.canCreateBookings) {
      const message =
        clientAccess.description ||
        "Your account is awaiting admin approval before booking providers.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!draft || !isDraftComplete) {
      setError("Your booking details are incomplete.");
      toast.error("Your booking details are incomplete.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await createBookingDraft({
        providerId: draft.providerId,
        serviceIds: draft.serviceIds,
        bookingDate: draft.bookingDate,
        timeSlot: draft.timeSlot,
        address: draft.address,
        notes: draft.requiresOfflineAddress
          ? "Offline booking requested by client."
          : "Online booking requested by client.",
      });
      const bookingId = response.data?.data?.booking?._id;
      if (!bookingId) {
        throw new Error("Booking draft was created without an id.");
      }
      navigate(`/bookings/${bookingId}/payment`);
    } catch (nextError) {
      const message =
        nextError.response?.data?.message ||
        nextError.message ||
        "Could not prepare the booking payment step.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
        <h1 className="mb-2 text-3xl font-semibold text-foreground">Booking Review</h1>
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
      <h1 className="mb-2 text-3xl font-semibold text-foreground">Review Booking</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Confirm the selected works and continue to payment.
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Provider:</span> {draft.providerName || "Provider"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Works:</span>{" "}
            {Array.isArray(draft.serviceTitles) ? draft.serviceTitles.join(", ") : "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Date:</span> {formatDisplayDate(draft.bookingDate)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Time Slot:</span> {draft.timeSlot || "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Address / Instructions:</span> {draft.address || "-"}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <p className="mb-3 text-base font-semibold text-foreground">Price Summary</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Base Total:</span> {formatCurrency(draft.totalAmount)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform fees will be added on the payment page according to the admin commission setting.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      {!clientAccess.canCreateBookings ? (
        <p className="mb-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <span className="font-semibold">{clientAccess.title || "Account approval pending."}</span>{" "}
          {clientAccess.description}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link to={`/booking/${id}`}>Back to Booking</Link>
        </Button>
        <Button
          onClick={handleContinueToPayment}
          disabled={loading || !isDraftComplete || !clientAccess.canCreateBookings}
        >
          {loading ? "Preparing..." : "Continue to Payment"}
        </Button>
      </div>
    </section>
  );
}
