import { useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  CalendarCheck2,
  ChevronRight,
  Landmark,
  MessageSquare,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";

const ACTIONS = [
  {
    icon: Wrench,
    title: "Manage Services",
    description: "Add, edit, or pause the works you offer clients.",
    path: "/provider/services",
    tone: "primary",
  },
  {
    icon: CalendarCheck2,
    title: "Booking Requests",
    description: "Review incoming requests and keep your schedule moving.",
    path: "/provider/booking-management",
  },
  {
    icon: MessageSquare,
    title: "Messages",
    description: "Reply to client conversations and booking follow-ups.",
    path: "/provider/chat",
  },
  {
    icon: ShieldAlert,
    title: "Disputes",
    description: "Track active reports and website issue conversations.",
    path: "/provider/disputes",
  },
  {
    icon: Landmark,
    title: "Earnings",
    description: "Review accepted transactions, fees, and invoice downloads.",
    path: "/provider/earnings",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Stay on top of approvals, payments, and client updates.",
    path: "/provider/notifications",
  },
  {
    icon: Briefcase,
    title: "Analytics",
    description: "Check your current performance summary and activity trends.",
    path: "/provider/analytics",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Update personal details, banking, UPI, and work categories.",
    path: "/provider/settings",
  },
];

function QuickActionCard({ icon: Icon, title, description, onClick, tone = "secondary" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-3xl border border-border bg-card p-6 text-left transition-all duration-200 ${
        tone === "primary"
          ? "hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10"
          : "hover:border-primary/20 hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted/70 text-muted-foreground"
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Open workspace</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ProviderQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((action) => (
        <QuickActionCard
          key={action.path}
          icon={action.icon}
          title={action.title}
          description={action.description}
          tone={action.tone}
          onClick={() => navigate(action.path)}
        />
      ))}
    </div>
  );
}
