import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  BOOKING_STATUS,
  normalizeBookingStatus,
} from "@/lib/bookingStatus";

const PRIORITY_STYLES = {
  high: "bg-rose-500/10 text-rose-700 border-rose-300/40",
  medium: "bg-amber-500/10 text-amber-700 border-amber-300/40",
  low: "bg-emerald-500/10 text-emerald-700 border-emerald-300/40",
};

const formatDate = (value) => {
  if (!value) return "Schedule pending";
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

function TaskCard({ task, onOpen }) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/40 p-6 transition-all hover:bg-card/60 hover:shadow-xl hover:shadow-primary/5">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority} priority
        </span>
        <span className="rounded-lg bg-muted/50 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {task.category}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
        {task.title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{task.description}</p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays size={14} className="text-primary/70" />
          <span>{task.meta}</span>
        </div>
        <Button
          size="sm"
          className="h-9 rounded-xl px-4 text-xs font-semibold"
          onClick={() => onOpen(task)}
        >
          {task.actionLabel}
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
    </article>
  );
}

function EmptyColumn({ title }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border/70 bg-muted/10 px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        New items will appear here as your bookings and disputes change.
      </p>
    </div>
  );
}

export default function ClientTasks() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [disputes, setDisputes] = useState([]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const [bookingsResponse, disputesResponse] = await Promise.all([
        api.get("/api/bookings", {
          params: { limit: 100 },
        }),
        api.get("/api/disputes", {
          params: { view: "items" },
        }),
      ]);

      setBookings(bookingsResponse.data?.data?.items || []);
      setDisputes(disputesResponse.data?.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load your task center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const taskBuckets = useMemo(() => {
    const actionRequired = [];
    const inProgress = [];
    const completed = [];

    bookings.forEach((booking) => {
      const status = normalizeBookingStatus(booking.status);
      const serviceLabel = getServiceLabel(booking);
      const providerName = booking.providerId?.name || "provider";
      const scheduleLabel = `${formatDate(booking.bookingDate)}${
        booking.timeSlot ? ` at ${booking.timeSlot}` : ""
      }`;

      if (status === BOOKING_STATUS.PENDING_PAYMENT) {
        actionRequired.push({
          id: `booking:${booking._id}:payment`,
          title: `Complete payment for ${serviceLabel}`,
          description: `Finish the payment step so your request can be sent to ${providerName}.`,
          priority: "high",
          category: "Payment",
          meta: scheduleLabel,
          actionLabel: "Pay now",
          targetPath: `/bookings/${booking._id}/payment`,
        });
        return;
      }

      if (status === BOOKING_STATUS.COMPLETED && !booking.review) {
        actionRequired.push({
          id: `booking:${booking._id}:review`,
          title: `Review ${providerName}`,
          description: `Share feedback for ${serviceLabel} so the provider profile and your history stay complete.`,
          priority: "medium",
          category: "Review",
          meta: scheduleLabel,
          actionLabel: "Open bookings",
          targetPath: "/client/bookings",
        });
        return;
      }

      if (status === BOOKING_STATUS.PENDING) {
        inProgress.push({
          id: `booking:${booking._id}:pending`,
          title: `Waiting for provider response`,
          description: `${providerName} has not accepted ${serviceLabel} yet. Keep an eye on the request status.`,
          priority: "medium",
          category: "Approval",
          meta: scheduleLabel,
          actionLabel: "View request",
          targetPath: "/client/bookings",
        });
        return;
      }

      if (status === BOOKING_STATUS.ACCEPTED) {
        inProgress.push({
          id: `booking:${booking._id}:accepted`,
          title: `Prepare for upcoming service`,
          description: `${providerName} accepted ${serviceLabel}. Review the date, time, and address before the visit.`,
          priority: "low",
          category: "Upcoming",
          meta: scheduleLabel,
          actionLabel: "View booking",
          targetPath: "/client/bookings",
        });
        return;
      }

      if (status === BOOKING_STATUS.COMPLETED && booking.review) {
        completed.push({
          id: `booking:${booking._id}:done`,
          title: `Booking closed with review`,
          description: `${serviceLabel} with ${providerName} has been completed and reviewed.`,
          priority: "low",
          category: "Completed",
          meta: scheduleLabel,
          actionLabel: "History",
          targetPath: "/client/bookings",
        });
      }
    });

    disputes.forEach((dispute) => {
      const normalizedStatus = String(dispute.status || "").toLowerCase();
      const targetType = dispute.targetType === "platform" ? "platform" : "service";
      const titlePrefix =
        targetType === "platform" ? "Website issue" : dispute.targetUserName || "Dispute";

      const task = {
        id: `dispute:${dispute.id}`,
        title: `${titlePrefix}: ${dispute.subject || dispute.reason || "Dispute"}`,
        description: dispute.description || "A dispute has been filed and is now being tracked.",
        priority: normalizedStatus === "resolved" ? "low" : "medium",
        category: targetType === "platform" ? "Platform" : "Dispute",
        meta: dispute.createdLabel || "Recently updated",
        actionLabel: "Open disputes",
        targetPath: "/client/disputes",
      };

      if (["open", "under_review", "escalated"].includes(normalizedStatus)) {
        inProgress.push(task);
      } else {
        completed.push(task);
      }
    });

    const byPriority = { high: 0, medium: 1, low: 2 };
    const sorter = (left, right) => byPriority[left.priority] - byPriority[right.priority];

    return {
      actionRequired: actionRequired.sort(sorter),
      inProgress: inProgress.sort(sorter),
      completed: completed.sort(sorter),
    };
  }, [bookings, disputes]);

  const nextAction =
    taskBuckets.actionRequired[0] ||
    taskBuckets.inProgress[0] ||
    taskBuckets.completed[0] ||
    null;

  const openTask = (task) => {
    if (!task?.targetPath) {
      toast.info("No linked workflow was found for this task yet.");
      return;
    }
    navigate(task.targetPath);
  };

  if (loading) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-[2rem] border border-border/70 bg-card/80">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin text-primary" />
          Loading task center...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/50 p-8 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Client Task Center
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Workflow actions that actually matter
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This page now derives live actions from your bookings and disputes,
              so payment, review, approval, and support work all show up in one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/50 bg-background/70 p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Next action</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {nextAction?.title || "No urgent action right now"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-rose-500" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                Action Required
              </h2>
            </div>
            <span className="rounded-lg bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {taskBuckets.actionRequired.length}
            </span>
          </div>

          <div className="space-y-4">
            {taskBuckets.actionRequired.length ? (
              taskBuckets.actionRequired.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={openTask} />
              ))
            ) : (
              <EmptyColumn title="No urgent actions" />
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                In Progress
              </h2>
            </div>
            <span className="rounded-lg bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {taskBuckets.inProgress.length}
            </span>
          </div>

          <div className="space-y-4">
            {taskBuckets.inProgress.length ? (
              taskBuckets.inProgress.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={openTask} />
              ))
            ) : (
              <EmptyColumn title="Nothing in progress" />
            )}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/80">
                Completed
              </h2>
            </div>
            <span className="rounded-lg bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {taskBuckets.completed.length}
            </span>
          </div>

          <div className="space-y-4">
            {taskBuckets.completed.length ? (
              taskBuckets.completed.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={openTask} />
              ))
            ) : (
              <EmptyColumn title="No completed workflow items yet" />
            )}
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: CreditCard,
            title: "Pending payment bookings",
            value: taskBuckets.actionRequired.filter((task) => task.category === "Payment").length,
          },
          {
            icon: MessageSquareWarning,
            title: "Open disputes",
            value: taskBuckets.inProgress.filter((task) => task.category === "Dispute" || task.category === "Platform").length,
          },
          {
            icon: CheckCircle2,
            title: "Reviewed completions",
            value: taskBuckets.completed.filter((task) => task.category === "Completed").length,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <span className="text-2xl font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">{item.title}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
