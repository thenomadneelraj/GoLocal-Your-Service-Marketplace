import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { confirmBookingPayment, fetchBookingById } from "@/lib/bookingApi";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/contexts/AuthContext";
import { getAccountAccessState } from "@/lib/accountAccess";

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const sanitizeBankName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export default function BookingPaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientAccess = getAccountAccessState(user);

  const [booking, setBooking] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [commissionPercentage, setCommissionPercentage] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [bookingResponse, profileResponse] = await Promise.all([
          fetchBookingById(bookingId),
          api.get("/api/auth/profile"),
        ]);
        if (!mounted) return;
        setBooking(bookingResponse.data?.data?.booking || null);
        setUserProfile(profileResponse.data?.data?.user || profileResponse.data?.user || null);
        const platformStatusResponse = await api.get("/api/auth/platform-status");
        setCommissionPercentage(
          Number(platformStatusResponse.data?.data?.commissionPercentage || 5)
        );
      } catch (nextError) {
        if (!mounted) return;
        setError(
          nextError.response?.data?.message ||
            "Could not load the payment step for this booking."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const baseAmount = Number(booking?.price || 0);
  const clientPlatformFee = Math.round((baseAmount * commissionPercentage) * 100) / 100;
  const totalPaid = baseAmount + clientPlatformFee;
  const providerDeduction = Math.round((baseAmount * commissionPercentage) * 100) / 100;
  const providerNet = Math.max(0, baseAmount - providerDeduction);
  const generatedUpiId = useMemo(() => {
    const phone = String(userProfile?.phone || "").replace(/\D/g, "");
    const bankName = sanitizeBankName(userProfile?.bankName || "");
    return phone && bankName ? `${phone}@${bankName}` : "";
  }, [userProfile?.phone, userProfile?.bankName]);

  const servicesLabel = useMemo(() => {
    const services = Array.isArray(booking?.selectedServices)
      ? booking.selectedServices
      : [];
    return services.length
      ? services.map((service) => service.title).join(", ")
      : booking?.serviceId?.title || "Service";
  }, [booking]);

  const handlePay = async () => {
    if (!clientAccess.canCreateBookings) {
      const message = clientAccess.title || "Account approval pending.";
      setError(message);
      toast.error(message);
      return;
    }

    if (paymentMethod === "upi" && !generatedUpiId) {
      toast.error("Add your bank name and phone number in personal information before paying with UPI.");
      navigate("/settings");
      return;
    }

    try {
      setSubmitting(true);
      await confirmBookingPayment(bookingId, { paymentMethod });
      toast.success(
        paymentMethod === "upi"
          ? "Payment confirmed and booking sent to the provider."
          : "Cash on delivery selected and booking sent to the provider."
      );
      navigate("/client/payments");
    } catch (nextError) {
      const message =
        nextError.response?.data?.message ||
        "Could not confirm this payment.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8">
        Loading payment details...
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error || "Booking details could not be loaded."}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/92 p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.58)]">
      <h1 className="mb-2 text-3xl font-semibold text-foreground">Payment</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Complete the transaction before the booking request reaches the provider.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">Booking</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Provider:</span> {booking.providerId?.name || "Provider"}</p>
              <p><span className="font-medium text-foreground">Works:</span> {servicesLabel}</p>
              <p><span className="font-medium text-foreground">Schedule:</span> {new Date(booking.bookingDate).toLocaleDateString("en-IN")} at {booking.timeSlot}</p>
              <p><span className="font-medium text-foreground">Address:</span> {booking.address}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
            <h2 className="text-lg font-semibold text-foreground">Choose payment method</h2>
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
              <p><span className="font-medium text-foreground">Bank Name:</span> {userProfile?.bankName || "Not added yet"}</p>
              <p className="mt-1"><span className="font-medium text-foreground">Generated UPI ID:</span> {generatedUpiId || "Add phone and bank name in personal information"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-5">
          <h2 className="text-lg font-semibold text-foreground">Transaction summary</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Base amount:</span> {formatCurrency(baseAmount)}</p>
            <p><span className="font-medium text-foreground">Platform fee ({commissionPercentage}%):</span> {formatCurrency(clientPlatformFee)}</p>
            <p className="border-t border-border/60 pt-3 text-base font-semibold text-foreground">
              Total to pay: {formatCurrency(totalPaid)}
            </p>
            <p><span className="font-medium text-foreground">Provider deduction ({commissionPercentage}%):</span> {formatCurrency(providerDeduction)}</p>
            <p><span className="font-medium text-foreground">Provider receives:</span> {formatCurrency(providerNet)}</p>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {!clientAccess.canCreateBookings ? (
            <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <span className="font-semibold">{clientAccess.title || "Account approval pending."}</span>{" "}
              {clientAccess.description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <Button variant="outline" asChild>
              <Link to="/client/payments">Cancel</Link>
            </Button>
            <Button onClick={handlePay} disabled={submitting || !clientAccess.canCreateBookings}>
              {submitting ? "Processing..." : paymentMethod === "upi" ? `Pay ${formatCurrency(totalPaid)}` : "Confirm COD Booking"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
