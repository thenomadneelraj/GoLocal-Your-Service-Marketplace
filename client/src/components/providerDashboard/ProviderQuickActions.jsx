import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Calendar,
  MessageSquare,
  Star,
  Plus,
  ChevronRight,
  Wrench,
  Users,
  Briefcase,
  FileText,
} from "lucide-react";

const QuickActionCard = ({ icon: Icon, title, description, onClick, color = "primary" }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-card rounded-lg p-6 border border-border hover:shadow-md transition-all duration-200 group ${color === "secondary" ? "hover:bg-accent" : "hover:bg-primary/10"}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${color === "primary" ? "bg-primary/10" : color === "secondary" ? "bg-accent/10" : "bg-muted/10"} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">Quick action</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
};

export default function ProviderQuickActions() {
  const navigate = useNavigate();

  const handleManageServices = () => {
    navigate("/provider-services");
  };

  const handleViewCalendar = () => {
    navigate("/provider-calendar");
  };

  const handleViewMessages = () => {
    navigate("/provider-messages");
  };

  const handleViewReviews = () => {
    navigate("/provider-reviews");
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Manage Services */}
      <QuickActionCard
        icon={<Wrench className="w-6 h-6" />}
        title="Manage Services"
        description="Add, edit, or remove the services you offer"
        onClick={handleManageServices}
        color="primary"
      />

      {/* View Calendar */}
      <QuickActionCard
        icon={<Calendar className="w-6 h-6" />}
        title="View Calendar"
        description="See your upcoming appointments and manage your schedule"
        onClick={handleViewCalendar}
        color="secondary"
      />

      {/* Messages */}
      <QuickActionCard
        icon={<MessageSquare className="w-6 h-6" />}
        title="Messages"
        description="Read and respond to client inquiries and booking requests"
        onClick={handleViewMessages}
        color="secondary"
      />

      {/* Reviews */}
      <QuickActionCard
        icon={<Star className="w-6 h-6" />}
        title="Reviews"
        description="Manage your client reviews and ratings"
        onClick={handleViewReviews}
        color="secondary"
      />

      {/* Analytics */}
      <QuickActionCard
        icon={<FileText className="w-6 h-6" />}
        title="Analytics"
        description="View detailed performance metrics and insights"
        onClick={() => navigate("/provider-analytics")}
        color="secondary"
      />

      {/* Earnings */}
      <QuickActionCard
        icon={<Briefcase className="w-6 h-6" />}
        title="Earnings"
        description="Track your income and view payment history"
        onClick={() => navigate("/provider-earnings")}
        color="secondary"
      />

      {/* Clients */}
      <QuickActionCard
        icon={<Users className="w-6 h-6" />}
        title="Clients"
        description="View your client list and manage relationships"
        onClick={() => navigate("/provider-clients")}
        color="secondary"
      />

      {/* Settings */}
      <QuickActionCard
        icon={<Settings className="w-6 h-6" />}
        title="Settings"
        description="Configure your profile, services, and account preferences"
        onClick={() => navigate("/provider-settings")}
        color="secondary"
      />
    </div>
  );
}
