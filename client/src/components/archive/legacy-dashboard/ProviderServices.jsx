import { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  DollarSign,
  Calendar,
  MapPin,
  Star,
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

export default function ProviderServices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Plumbing",
    price: "",
    images: [],
    availability: true,
  });

  const categories = [
    "Plumbing",
    "Electrical", 
    "Cleaning",
    "Painting",
    "Carpentry",
    "AC Repair",
    "Appliance Repair",
    "Moving",
    "Other"
  ];

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await api.get(`/services?_t=${Date.now()}`);
      setServices(response.data || []);
    } catch (error) {
      toast.error("Failed to load services");
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingService) {
        await api.put(`/services/${editingService._id}`, {
          ...formData,
          price: parseFloat(formData.price)
        });
        toast.success("Service updated successfully");
      } else {
        await api.post("/services", {
          ...formData,
          price: parseFloat(formData.price)
        });
        toast.success("Service created successfully");
      }
      
      setShowCreateModal(false);
      setEditingService(null);
      setFormData({
        name: "",
        description: "",
        category: "Plumbing",
        price: "",
        images: [],
        availability: true,
      });
      loadServices();
    } catch (error) {
      toast.error("Failed to save service");
      console.error("Error saving service:", error);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price.toString(),
      images: service.images || [],
      availability: service.availability,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (serviceId) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      await api.delete(`/services/${serviceId}`);
      toast.success("Service deleted successfully");
      loadServices();
    } catch (error) {
      toast.error("Failed to delete service");
      console.error("Error deleting service:", error);
    }
  };

  const toggleAvailability = async (serviceId, currentAvailability) => {
    try {
      await api.put(`/services/${serviceId}`, {
        availability: !currentAvailability
      });
      toast.success(`Service ${!currentAvailability ? 'activated' : 'deactivated'}`);
      loadServices();
    } catch (error) {
      toast.error("Failed to update service availability");
      console.error("Error updating availability:", error);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Services</h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Manage your service offerings and pricing. Add new services or edit existing ones.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-2 border border-border rounded-lg bg-background"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg p-6 border border-border animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-muted rounded w-full mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))
          ) : filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <div key={service._id} className="bg-card rounded-lg p-6 border border-border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      service.availability 
                        ? "bg-green-100 text-green-600" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {service.availability ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                      className="p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAvailability(service._id, service.availability)}
                      className="p-2"
                    >
                      {service.availability ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(service._id)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{service.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-foreground">{formatCurrency(service.price)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{service.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4" />
                    <span>4.8</span>
                  </div>
                </div>

                {service.images && service.images.length > 0 && (
                  <div className="mt-4">
                    <div className="flex gap-2 overflow-x-auto">
                      {service.images.slice(0, 3).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${service.name} ${index + 1}`}
                          className="w-16 h-16 rounded-lg object-cover border border-border"
                        />
                      ))}
                      {service.images.length > 3 && (
                        <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-sm text-muted-foreground">
                          +{service.images.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No services found</h3>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg p-6 border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {editingService ? "Edit Service" : "Add New Service"}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingService(null);
                    setFormData({
                      name: "",
                      description: "",
                      category: "Plumbing",
                      price: "",
                      images: [],
                      availability: true,
                    });
                  }}
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Service Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Plumbing Services"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service in detail..."
                    rows={4}
                    className="w-full p-3 border border-border rounded-lg bg-background resize-none"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2 border border-border rounded-lg bg-background"
                      required
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-foreground mb-2">
                      Price (₹)
                    </label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="availability"
                    checked={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.checked })}
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="availability" className="text-sm font-medium text-foreground">
                    Service is available for booking
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingService(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingService ? "Update Service" : "Add Service"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
