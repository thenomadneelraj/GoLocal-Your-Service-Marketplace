import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarClock, CheckCircle2, Clock3, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminBookings,
  fetchAdminBookingsSummary,
  downloadAdminExport,
} from "@/lib/cachedAdminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminSelectField,
  AdminStatCard,
  AdminStatusBadge,
  downloadBlobFile,
} from "./AdminWorkspaceCommon";
import DataOriginBadge from "@/components/shared/DataOriginBadge";
import { mergeLayeredCollections } from "@/lib/dataLayering";
import { mockAdminBookings } from "@/lib/mockWorkspaceData";
import { useBookingUpdates } from "@/components/contexts/WebSocketContext";

export default function AdminBookings() {
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [downloadFormat, setDownloadFormat] = useState("csv");

  // Handle real-time booking updates via WebSocket
  const handleBookingUpdate = useCallback((payload) => {
    console.log("[AdminBookings] Received booking update:", payload);
    
    // Refresh the bookings list when updates occur
    loadBookings();
    
    if (payload.message) {
      toast.success(payload.message);
    }
  }, [filters]);

  useBookingUpdates(handleBookingUpdate);

  const loadBookings = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const [summaryResponse, bookingsResponse] = await Promise.all([
        fetchAdminBookingsSummary(),
        fetchAdminBookings(nextFilters),
      ]);
      setSummary(summaryResponse.data?.data || null);
      setItems(bookingsResponse.data?.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    loadBookings(nextFilters);
  };

  const layeredItems = useMemo(
    () =>
      mergeLayeredCollections(items, mockAdminBookings, {
        getId: (booking) => booking.id,
      }),
    [items]
  );
  const mockSummary = {
    totalBookings: mockAdminBookings.length,
    pendingRequests: mockAdminBookings.filter((booking) => booking.status === "pending").length,
    acceptedJobs: mockAdminBookings.filter((booking) => booking.status === "accepted").length,
    cancelledJobs: mockAdminBookings.filter((booking) => booking.status === "cancelled").length,
  };
  const hasLiveSummary =
    (summary?.totalBookings || 0) > 0 ||
    (summary?.pendingRequests || 0) > 0 ||
    (summary?.acceptedJobs || 0) > 0 ||
    (summary?.cancelledJobs || 0) > 0;
  const resolvedSummary = hasLiveSummary ? summary : mockSummary;

  const handleExport = async () => {
    try {
      const response = await downloadAdminExport({
        packageType: "bookings",
        format: downloadFormat,
      });
      const fileName = downloadBlobFile(response, `bookings.${downloadFormat}`);
      toast.success(`${fileName} downloaded successfully.`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download export.");
    }
  };

  if (loading && !summary) {
    return <AdminLoadingState label="Loading booking queue..." />;
  }

  return (
    <AdminPageShell
      title="Bookings"
      description="Review live booking requests from the database across clients, providers, and payments."
      actions={
        <>
          <AdminSelectField value={downloadFormat} onChange={setDownloadFormat}>
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
            <option value="pdf">PDF</option>
          </AdminSelectField>
          <button type="button" onClick={handleExport} className="admin-button-secondary">
            Export {String(downloadFormat).toUpperCase()}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={CalendarClock} title="Total bookings" value={resolvedSummary?.totalBookings ?? 0} />
        <AdminStatCard icon={Clock3} title="Pending requests" value={resolvedSummary?.pendingRequests ?? 0} tone="text-amber-600" />
        <AdminStatCard icon={CheckCircle2} title="Accepted jobs" value={resolvedSummary?.acceptedJobs ?? 0} tone="text-emerald-600" />
        <AdminStatCard icon={XCircle} title="Cancelled jobs" value={resolvedSummary?.cancelledJobs ?? 0} tone="text-slate-500" />
      </div>

      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <AdminSearchField
            value={filters.search}
            onChange={(value) => handleFilterChange("search", value)}
            placeholder="Search by client, provider, or service..."
          />
          <AdminSelectField
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </AdminSelectField>
        </div>
      </AdminPanel>

      <AdminPanel title="Booking queue" description="Every booking request stored in the platform database.">
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead className="admin-table-head">
              <tr>
                <th className="admin-table-head-cell">Service</th>
                <th className="admin-table-head-cell">Client</th>
                <th className="admin-table-head-cell">Provider</th>
                <th className="admin-table-head-cell">Schedule</th>
                <th className="admin-table-head-cell">Status</th>
                <th className="admin-table-head-cell">Payment</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {layeredItems.map((booking) => (
                <tr key={booking.id} className="admin-table-row">
                  <td className="admin-cell">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="admin-cell-strong">{booking.service}</p>
                      <DataOriginBadge origin={booking.dataOrigin} liveLabel="Live" sampleLabel="Sample" />
                    </div>
                    <p className="admin-cell-muted">{booking.category}</p>
                  </td>
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{booking.client}</p>
                    <p className="admin-cell-muted">{booking.clientEmail}</p>
                  </td>
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{booking.provider}</p>
                    <p className="admin-cell-muted">{booking.providerEmail}</p>
                  </td>
                  <td className="admin-cell">{booking.schedule}</td>
                  <td className="admin-cell">
                    <AdminStatusBadge value={booking.status} />
                  </td>
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{booking.amountLabel}</p>
                    <p className="admin-cell-muted">{booking.paymentStatus}</p>
                  </td>
                </tr>
              ))}
              {!layeredItems.length ? (
                <tr>
                  <td className="admin-empty-state" colSpan={6}>
                    No bookings found for the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
