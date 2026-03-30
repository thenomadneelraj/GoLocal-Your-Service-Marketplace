import { useEffect, useState } from "react";
import {
  Plus,
  Wrench,
  Search,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  assignProviderToService,
  createService,
  deleteService,
  fetchServices,
  toggleServiceStatus,
} from "@/lib/adminApi";
import { AdminTable } from "./AdminTable";
import { AdminPagination } from "./AdminPagination";

export default function AdminServiceCatalog() {
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    basePrice: "",
  });

  const loadServices = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchServices({
        page,
        limit: 10,
        isActive:
          filterActive === "all"
            ? undefined
            : filterActive === "active"
              ? "true"
              : "false",
      });
      const payload = res.data?.data || {};
      setServices(payload.items || []);
      setPagination(payload.pagination || { page, pages: 1 });
    } catch (err) {
      console.error(err);
      setError("Failed to load services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActive]);

  const handleCreateService = async (event) => {
    event.preventDefault();
    if (!form.name || !form.basePrice) return;

    try {
      setLoading(true);
      setError("");
      await createService({
        ...form,
        basePrice: Number(form.basePrice),
      });
      setForm({
        name: "",
        description: "",
        category: "",
        basePrice: "",
      });
      await loadServices(1);
    } catch (err) {
      console.error(err);
      setError("Failed to create service.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (serviceId) => {
    try {
      setLoading(true);
      setError("");
      await toggleServiceStatus(serviceId);
      await loadServices(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to toggle service status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    try {
      setLoading(true);
      setError("");
      await deleteService(serviceId);
      await loadServices(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to delete service.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProvider = async (serviceId) => {
    const providerId = window.prompt(
      "Enter Provider ID to assign to this service:"
    );
    if (!providerId) return;
    try {
      setLoading(true);
      setError("");
      await assignProviderToService(serviceId, providerId);
      await loadServices(pagination.page || 1);
    } catch (err) {
      console.error(err);
      setError("Failed to assign provider.");
    } finally {
      setLoading(false);
    }
  };

  const getFilterClassName = (value) =>
    `admin-pill ${filterActive === value ? "admin-pill-active" : ""}`;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="admin-page-kicker">Services</p>
          <h2 className="admin-page-title">Service Catalog</h2>
          <p className="admin-page-description">
            Manage services, pricing, and provider assignments across GoLocal.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <article className="admin-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="admin-chip">
              <Wrench size={14} className="text-primary" />
              <span className="admin-chip-label">Catalog overview</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterActive("all")}
                className={getFilterClassName("all")}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterActive("active")}
                className={getFilterClassName("active")}
              >
                <ToggleRight size={14} />
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterActive("inactive")}
                className={getFilterClassName("inactive")}
              >
                <ToggleLeft size={14} />
                Inactive
              </button>
              <button
                type="button"
                onClick={() => loadServices(pagination.page || 1)}
                className="admin-pill"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>

          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or category (client-side only)"
              className="admin-input pl-10"
            />
          </div>

          <AdminTable
            columns={[
              { key: "name", label: "Service" },
              { key: "category", label: "Category" },
              { key: "price", label: "Base Price" },
              { key: "status", label: "Status" },
              { key: "provider", label: "Provider" },
              { key: "actions", label: "Actions" },
            ]}
            data={services}
            loading={loading}
            error={error}
            renderRow={(service) => (
              <tr
                key={service._id}
                className="admin-table-row"
              >
                <td className="admin-cell admin-cell-strong">
                  <p className="font-medium">{service.name}</p>
                  {service.description ? (
                    <p className="admin-cell-muted mt-1 line-clamp-1">
                      {service.description}
                    </p>
                  ) : null}
                </td>
                <td className="admin-cell">{service.category || "-"}</td>
                <td className="admin-cell">
                  Rs {Number(service.basePrice || 0).toLocaleString("en-IN")}
                </td>
                <td className="admin-cell">
                  <span
                    className={`admin-badge ${
                      service.isActive
                        ? "admin-badge-success"
                        : "admin-badge-muted"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="admin-cell">
                  {service.assignedProvider
                    ? service.assignedProvider.displayName ||
                      service.assignedProvider._id
                    : "Unassigned"}
                </td>
                <td className="admin-cell">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      className="admin-pill-button"
                      onClick={() => handleToggleActive(service._id)}
                    >
                      {service.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="admin-pill-button"
                      onClick={() => handleAssignProvider(service._id)}
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      className="admin-pill-button admin-pill-button-danger"
                      onClick={() => handleDeleteService(service._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />

          <AdminPagination
            page={pagination.page || 1}
            pages={pagination.pages || 1}
            onPageChange={(page) => loadServices(page)}
          />
        </article>

        <article className="admin-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Create service
              </h3>
              <p className="admin-page-description">
                Quickly add a new service offering to the catalog.
              </p>
            </div>
            <span className="admin-icon-wrap">
              <Plus size={16} />
            </span>
          </div>

          <form onSubmit={handleCreateService} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="admin-label">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="admin-input"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="admin-input"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Base price</label>
              <input
                type="number"
                required
                min="0"
                value={form.basePrice}
                onChange={(e) =>
                  setForm({ ...form, basePrice: e.target.value })
                }
                className="admin-input"
              />
            </div>
            <div className="space-y-1">
              <label className="admin-label">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="admin-textarea min-h-[120px]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="admin-button-primary mt-1 w-full"
            >
              {loading ? "Saving..." : "Create service"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
