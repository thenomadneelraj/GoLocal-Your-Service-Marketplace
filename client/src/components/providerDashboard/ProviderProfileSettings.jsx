import { useState, useEffect } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/providerDashboard/ProviderDashboard";
import {
  User,
  Camera,
  MapPin,
  Phone,
  Mail,
  Settings,
  Save,
  Upload,
  Star,
  Clock,
  Briefcase,
  ShieldCheck,
  Edit,
  X,
} from "lucide-react";

const ProfileSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Form state
  const [personalInfo, setPersonalInfo] = useState({
    firstName: user?.name || "",
    lastName: "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: user?.bio || "",
  });

  const [professionalInfo, setProfessionalInfo] = useState({
    serviceType: user?.serviceType || "",
    experience: user?.experience || 0,
    hourlyRate: user?.hourlyRate || 0,
    availability: user?.availability || false,
    services: user?.services || [],
  });

  const [profilePhoto, setProfilePhoto] = useState(user?.profileImage || "");

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In real app, this would be an API call
      // await api.put("/api/provider/profile", {
      //   personalInfo
      // });
      
      // Simulate successful update
      setTimeout(() => {
        setPersonalInfo(prev => ({ ...prev, firstName: personalInfo.firstName }));
        toast.success("Personal information updated successfully");
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      toast.error("Failed to update personal information");
      setLoading(false);
    }
  };

  const handleSaveProfessionalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In real app, this would be an API call
      // await api.put("/api/provider/profile", {
      //   professionalInfo
      // });
      
      // Simulate successful update
      setTimeout(() => {
        setProfessionalInfo(prev => ({ ...prev, experience: professionalInfo.experience }));
        toast.success("Professional information updated successfully");
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      toast.error("Failed to update professional information");
      setLoading(false);
    }
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In real app, you'd upload to cloud storage
    const formData = new FormData();
    formData.append("profilePhoto", file);
    
    setLoading(true);
    
    try {
      // Simulate upload
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target.result;
          setProfilePhoto(result);
          toast.success("Profile photo updated successfully");
          setLoading(false);
        };
        reader.readAsDataURL(file);
      }, 100);
      
    } catch (error) {
      toast.error("Failed to upload profile photo");
      setLoading(false);
    }
  };

  const handleAddService = () => {
    const newService = prompt("Enter service name:");
    if (newService && newService.trim()) {
      setProfessionalInfo(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }));
      toast.success(`Service "${newService}" added successfully`);
    }
  };

  const handleRemoveService = (serviceToRemove) => {
    setProfessionalInfo(prev => ({
      ...prev,
      services: prev.services.filter(service => service !== serviceToRemove)
    }));
    toast.success("Service removed successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Profile Settings
            </h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Manage your profile information, professional details, and account settings.
            </p>
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-2 font-medium rounded-l-lg ${
              activeTab === "personal"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab("professional")}
            className={`px-4 py-2 font-medium rounded-l-lg ${
              activeTab === "professional"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Professional Details
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 font-medium rounded-l-lg ${
              activeTab === "account"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Account Settings
          </button>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Personal Information */}
          {activeTab === "personal" && (
            <Panel>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Personal Information</h2>
                
                <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        value={personalInfo.firstName}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                        className="w-full"
                        disabled
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                        Address
                      </label>
                      <textarea
                        id="address"
                        value={personalInfo.address}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St, City, State 12345"
                        rows={3}
                        className="w-full resize-none"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        value={personalInfo.bio}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself and your services..."
                        rows={4}
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </form>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[120px]"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* Professional Details */}
          {activeTab === "professional" && (
            <Panel>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Professional Details</h2>
                
                <form onSubmit={handleSaveProfessionalInfo} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="serviceType" className="block text-sm font-medium text-foreground mb-2">
                        Primary Service
                      </label>
                      <select
                        id="serviceType"
                        value={professionalInfo.serviceType}
                        onChange={(e) => setProfessionalInfo(prev => ({ ...prev, serviceType: e.target.value }))}
                        className="w-full p-2 border border-border rounded-lg bg-background"
                      >
                        <option value="">Select a service</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Painting">Painting</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="AC Repair">AC Repair</option>
                        <option value="Appliance Repair">Appliance Repair</option>
                        <option value="Moving">Moving</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="experience" className="block text-sm font-medium text-foreground mb-2">
                        Years of Experience
                      </label>
                      <Input
                        id="experience"
                        type="number"
                        value={professionalInfo.experience}
                        onChange={(e) => setProfessionalInfo(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                        min="0"
                        max="50"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="hourlyRate" className="block text-sm font-medium text-foreground mb-2">
                        Hourly Rate (₹)
                      </label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={professionalInfo.hourlyRate}
                        onChange={(e) => setProfessionalInfo(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        min="0"
                        step="100"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="availability" className="block text-sm font-medium text-foreground mb-2">
                        Availability
                      </label>
                      <select
                        id="availability"
                        value={professionalInfo.availability.toString()}
                        onChange={(e) => setProfessionalInfo(prev => ({ ...prev, availability: e.target.value === "true" }))}
                        className="w-full p-2 border border-border rounded-lg bg-background"
                      >
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="services" className="block text-sm font-medium text-foreground mb-2">
                      Services Offered
                      </label>
                      <div className="border border-border rounded-lg p-4 bg-muted/20">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {professionalInfo.services.map((service, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              {service}
                              <button
                                type="button"
                                onClick={() => handleRemoveService(service)}
                                className="text-red-500 hover:text-red-600 ml-auto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <span className="flex-1">{service}</span>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => {
                              const newService = prompt("Enter service name:");
                              if (newService && newService.trim()) {
                                handleAddService(newService);
                              }
                            }}
                            variant="outline"
                            className="text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add Service
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[120px]"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* Profile Photo */}
          {activeTab === "account" && (
            <Panel>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Profile Photo</h2>
                
                <div className="space-y-4">
                  {/* Current Photo */}
                  <div className="mb-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-32 h-32">
                        {profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Profile"
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                        ) : (
                          <div className="w-full h-32 rounded-lg border border-border bg-muted/20 flex items-center justify-center">
                            <User className="w-16 h-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Current profile photo
                      </p>
                  </div>
                  
                  {/* Upload New Photo */}
                  <div>
                    <label htmlFor="profilePhotoUpload" className="block text-sm font-medium text-foreground mb-2">
                      Upload New Photo
                    </label>
                    <input
                      id="profilePhotoUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoChange}
                      className="w-full p-2 border border-border rounded-lg bg-background"
                    />
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleProfilePhotoChange}
                      disabled={!profilePhoto}
                      className="min-w-[120px]"
                    >
                      Upload Photo
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* Account Settings */}
          {activeTab === "account" && (
            <Panel>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">Receive booking confirmations and updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only" />
                      <div className="w-12 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <Mail className="w-3 h-3 text-primary" />
                        </div>
                      </div>
                      <span className="ml-3 text-sm font-medium">Email notifications enabled</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" className="text-sm">
                      Enable 2FA
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">Privacy Settings</h3>
                      <p className="text-sm text-muted-foreground">Control your profile visibility and data sharing</p>
                    </div>
                    <Button variant="outline" className="text-sm">
                      Manage Privacy
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">Delete Account</h3>
                      <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive" className="text-sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
