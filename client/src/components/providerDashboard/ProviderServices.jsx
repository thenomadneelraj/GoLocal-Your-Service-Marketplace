import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

const EMPTY_FORM = {
  category: "",
  price: "",
  locationType: "offline",
  status: "active",
};

const FALLBACK_OPTIONS = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Painting",
  "Carpentry",
  "AC Repair",
  "Appliance Repair",
  "Moving",
];

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

const normalizeCategories = (categories = [], fallback = "") => {
  const unique = Array.from(
    new Set(
      (Array.isArray(categories) ? categories : [categories])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
  const withoutOther = unique.filter(
    (category) => category.toLowerCase() !== "other",
  );

  if (withoutOther.length) {
    return withoutOther;
  }

  const normalizedFallback = String(fallback || "").trim();
  return normalizedFallback && normalizedFallback.toLowerCase() !== "other"
    ? [normalizedFallback]
    : [];
};

const toServiceOption = (service = {}) => ({
  id: service.id || service._id || "",
  title: service.title || service.category || "Service",
  description:
    service.description ||
    `${service.category || service.title || "Service"} service offered by this provider.`,
  category: service.category || service.title || "Service",
  status: service.status || "active",
  price: Number(service.price || 0),
  duration: service.duration || "1 hour",
  locationType: service.locationType || "offline",
});

export default function ProviderServices() {
  const [services, setServices] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(FALLBACK_OPTIONS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesResponse, profileResponse] = await Promise.all([
        api.get("/api/services/me"),
        api.get("/api/providers/me/profile"),
      ]);

      const serviceItems = servicesResponse.data?.data?.items || [];
      const provider = profileResponse.data?.data || {};
      const categories = normalizeCategories(
        provider.workCategories,
        provider.serviceType,
      );
      const serviceCategories = serviceItems.map((service) => service.category);
      const mergedCategories = Array.from(
        new Set([...categories, ...serviceCategories].filter(Boolean)),
      );

      setServices(serviceItems.map(toServiceOption));
      setCategoryOptions(mergedCategories.length ? mergedCategories : FALLBACK_OPTIONS);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Could not load your service categories.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeServices = useMemo(
    () => services.filter((service) => service.status === "active"),
    [services],
  );

  const selectedCategoryService = useMemo(
    () =>
      services.find(
        (service) =>
          service.category.toLowerCase() === form.category.toLowerCase(),
      ) || null,
    [form.category, services],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
  };

  const handleCategoryChange = (category) => {
    const existingService = services.find(
      (service) => service.category.toLowerCase() === category.toLowerCase(),
    );

    if (existingService) {
      setEditingId(existingService.id);
      setForm({
        category: existingService.category,
        price: existingService.price ? String(existingService.price) : "",
        locationType: existingService.locationType || "offline",
        status: existingService.status || "active",
      });
      return;
    }

    setEditingId("");
    setForm({
      category,
      price: "",
      locationType: "offline",
      status: "active",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.category) {
      toast.error("Choose a service category first.");
      return;
    }

    const price = Number(form.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Add a valid hourly rate for this service.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.category,
        description: `${form.category} service offered by this provider.`,
        category: form.category,
        price,
        duration: "1 hour",
        locationType: form.locationType,
        status: form.status,
      };

      if (editingId) {
        await api.put(`/api/services/${editingId}`, payload);
        toast.success("Service rate updated successfully.");
      } else {
        await api.post("/api/services", payload);
        toast.success("Service added successfully.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save this service.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service.id);
    setForm({
      category: service.category,
      price: service.price ? String(service.price) : "",
      locationType: service.locationType || "offline",
      status: service.status || "active",
    });
  };

  const handleDelete = async (serviceId) => {
    try {
      await api.delete(`/api/services/${serviceId}`);
      toast.success("Service removed successfully.");
      if (editingId === serviceId) {
        resetForm();
      }
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not remove this service.",
      );
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/60 p-8 backdrop-blur-xl shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your registration-selected categories appear here. Set a different hourly rate for each service and publish them for client browsing.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Categories
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {categoryOptions.length}
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Active
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {activeServices.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm"
        >
          <h2 className="text-xl font-semibold text-foreground">
            {editingId ? "Edit service rate" : "Add service rate"}
          </h2>

          <div className="mt-5 grid gap-4">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Service category
              </span>
              <select
                value={form.category}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                required
              >
                <option value="">Choose a category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {form.category ? (
              <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                {selectedCategoryService ? (
                  <>
                    This category already exists. Update its rate or delivery mode here.
                  </>
                ) : (
                  <>Add a published rate for this category so it appears on your public provider profile.</>
                )}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Rate / hour
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="300"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Delivery
                </span>
                <select
                  value={form.locationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      locationType: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Visibility
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={saving || loading}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Service"
                  : "Add Service"}
            </Button>
            {(editingId || form.category) ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4 rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Published services
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These sync to provider cards, provider profiles, and client booking totals.
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-black uppercase tracking-widest text-primary">
              {activeServices.length} active
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No services published yet. Choose one of your registered categories and add a rate.
            </p>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {service.category}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/50 px-3 py-1">
                        {service.locationType}
                      </span>
                      <span className="rounded-full border border-border/50 px-3 py-1">
                        {service.duration}
                      </span>
                      <span className="rounded-full border border-border/50 px-3 py-1">
                        {service.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(service.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      per hour
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDelete(service.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
