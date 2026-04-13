import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyForm = {
  title: "",
  description: "",
  category: "",
  price: "",
  duration: "1 hour",
  locationType: "offline",
  status: "active",
};

const formatCurrency = (amount) =>
  `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

export default function ProviderServices() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/services/me");
      setServices(response.data?.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        price: Number(form.price || 0),
      };
      if (editingId) {
        await api.put(`/api/services/${editingId}`, payload);
        toast.success("Service updated successfully.");
      } else {
        await api.post("/api/services", payload);
        toast.success("Service created successfully.");
      }
      resetForm();
      await loadServices();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save service.");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = useMemo(
    () => services.filter((service) => service.status === "active").length,
    [services]
  );

  return (
    <div className="space-y-6 pb-10 font-sans">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/60 p-8 backdrop-blur-xl shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Manager</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add multiple works for clients to choose from during booking.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total works</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{services.length}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Active</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{activeCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">
            {editingId ? "Edit work" : "Add new work"}
          </h2>
          <div className="mt-5 grid gap-4">
            <input
              type="text"
              placeholder="Work title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              required
            />
            <textarea
              placeholder="Describe what the client gets from this work."
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Category"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                required
              />
              <input
                type="number"
                min="1"
                placeholder="Price"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Duration"
                value={form.duration}
                onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                required
              />
              <select
                value={form.locationType}
                onChange={(event) => setForm((current) => ({ ...current, locationType: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
              </select>
            </div>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Work" : "Add Work"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4 rounded-[2rem] border border-border/60 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">Published works</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading works...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No works published yet. Add your first work from the form.
            </p>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{service.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/50 px-3 py-1">{service.category}</span>
                      <span className="rounded-full border border-border/50 px-3 py-1">{service.duration}</span>
                      <span className="rounded-full border border-border/50 px-3 py-1">{service.locationType}</span>
                      <span className="rounded-full border border-border/50 px-3 py-1">{service.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(service.price)}</p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(service.id);
                          setForm({
                            title: service.title || "",
                            description: service.description || "",
                            category: service.category || "",
                            price: String(service.price || ""),
                            duration: service.duration || "1 hour",
                            locationType: service.locationType || "offline",
                            status: service.status || "active",
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api.delete(`/api/services/${service.id}`);
                            toast.success("Service deleted successfully.");
                            await loadServices();
                          } catch (error) {
                            toast.error(error.response?.data?.message || "Could not delete service.");
                          }
                        }}
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
