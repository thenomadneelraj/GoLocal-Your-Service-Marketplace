import { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  Filter,
  Search,
} from "lucide-react";

const formatCurrency = (amount, currency = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-600",
      icon: <Clock className="w-4 h-4" />,
      label: "Pending"
    },
    accepted: {
      color: "bg-green-100 text-green-600",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Accepted"
    },
    completed: {
      color: "bg-blue-100 text-blue-600",
      icon: <CheckCircle className="w-4 h-4" />,
      label: "Completed"
    },
    cancelled: {
      color: "bg-red-100 text-red-600",
      icon: <XCircle className="w-4 h-4" />,
      label: "Cancelled"
    },
    rejected: {
      color: "bg-red-100 text-red-600",
      icon: <XCircle className="w-4 h-4" />,
      label: "Rejected"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

export default function ProviderBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await api.get("/bookings");
      setBookings(response.data || []);
    } catch (error) {
      toast.error("Failed to load bookings");
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, { status: newStatus });
      toast.success(`Booking status updated to ${newStatus}`);
      loadBookings();
      setSelectedBooking(null);
    } catch (error) {
      toast.error("Failed to update booking status");
      console.error("Error updating booking:", error);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.clientId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.serviceId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const BookingDetailsModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg p-6 border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Booking Details</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              ×
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Client Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{booking.clientId?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{booking.clientId?.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{booking.clientId?.phone || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Service Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="text-foreground">{booking.serviceId?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{formatCurrency(booking.price || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Schedule</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{booking.timeSlot || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{booking.address || "Not specified"}</span>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Notes</h3>
                  <p className="text-muted-foreground">{booking.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-foreground mb-2">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {booking.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate(booking._id, "accepted")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate(booking._id, "rejected")}
                        variant="destructive"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {booking.status === "accepted" && (
                    <Button
                      onClick={() => handleStatusUpdate(booking._id, "completed")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Open message modal or navigate to messages
                      window.location.href = `/provider/chat?client=${booking.clientId?._id}`;
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Client
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Manage your booking requests and schedule. Accept, reject, or complete bookings.
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by client, service, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full p-3 border border-border rounded-lg bg-background"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border border-border rounded-lg bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-muted rounded w-full mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{booking.serviceId?.name || "Unknown Service"}</h3>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">
                      Client: {booking.clientId?.name || "Unknown Client"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(booking.price || 0)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{booking.timeSlot || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{booking.address || "Not specified"}</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-4 p-3 bg-muted/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Booked on {formatDate(booking.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      View Details
                    </Button>
                    {booking.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate(booking._id, "accepted")}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(booking._id, "rejected")}
                          variant="destructive"
                          size="sm"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {booking.status === "accepted" && (
                      <Button
                        onClick={() => handleStatusUpdate(booking._id, "completed")}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No bookings found</h3>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            </div>
          )}
        </div>

        {/* Booking Details Modal */}
        <BookingDetailsModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)} 
        />
      </div>
    </DashboardLayout>
  );
}
