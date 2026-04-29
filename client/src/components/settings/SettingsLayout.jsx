import { useEffect, useMemo, useState } from "react";
import {
  User as UserIcon,
  Lock,
  AlertTriangle,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  Wrench,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../ui/button";
import { resolveMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { queueFlashToast } from "@/lib/flashToast";
import { fetchPlatformSettings, updatePlatformSettings } from "@/lib/adminApi";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";

const SERVICE_TYPES = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "Painting",
  "Carpentry",
  "AC Repair",
  "Appliance Repair",
  "Moving",
  "Other",
];
const INPUT =
  "w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/80 focus:border-primary/45 focus:ring-2 focus:ring-primary/15";
const BASE_TABS = [
  { id: "profile", label: "Profile Information", icon: UserIcon },
  { id: "security", label: "Password & Security", icon: Lock },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const splitName = (value = "") => {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const joinName = (firstName = "", lastName = "") =>
  [firstName, lastName]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

const toProviderForm = (data = {}) => ({
  serviceType: data.serviceType || "Other",
  location: data.location || "",
  address: data.address || "",
  hourlyRate:
    data.hourlyRate === 0 || data.hourlyRate ? String(data.hourlyRate) : "",
  experience:
    data.experience === 0 || data.experience ? String(data.experience) : "",
  availability: data.availability ?? data.available ?? true,
  bio: data.bio || "",
  workCategoriesText: Array.isArray(data.workCategories)
    ? data.workCategories.join(", ")
    : "",
});

const toPlatformForm = (data = {}) => ({
  platformName: data.platformName || "GoLocal",
  commissionPercentage: data.commissionPercentage ?? data.commissionRate ?? 10,
  maintenanceMode: Boolean(data.maintenanceMode),
});

const buildGeneratedUpiId = (phone = "", bankName = "") => {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  const normalizedBank = String(bankName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!normalizedPhone || !normalizedBank) {
    return "";
  }

  return `${normalizedPhone}@${normalizedBank}`;
};

export default function SettingsLayout({ role }) {
  const normalizedRole = String(role || "").toUpperCase();
  const isProvider = normalizedRole === "PROVIDER";
  const isAdmin = normalizedRole === "ADMIN";
  const { user, logout, setUserData } = useAuth();
  const { refreshStatus } = useMaintenance();
  const tabs = isAdmin
    ? [
        BASE_TABS[0],
        { id: "platform", label: "Platform Control", icon: Wrench },
        BASE_TABS[1],
        BASE_TABS[2],
      ]
    : BASE_TABS;

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(isProvider);
  const [platformLoading, setPlatformLoading] = useState(isAdmin);
  const [platformSaving, setPlatformSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    profilePhoto: "",
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
  });
  const [providerForm, setProviderForm] = useState(toProviderForm());
  const [platformForm, setPlatformForm] = useState(toPlatformForm());
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!user) return;
    const name = splitName(user.name);
    setProfileForm((prev) => ({
      ...prev,
      firstName: name.firstName,
      lastName: name.lastName,
      phone: user.phone || "",
      address: user.address || "",
      profilePhoto: user.profilePhoto || "",
      bankName: user.bankName || "",
      accountNumber: user.accountNumber || "",
      accountHolderName: user.accountHolderName || user.name || "",
    }));
  }, [user]);

  useEffect(() => {
    if (!isProvider) {
      setDetailsLoading(false);
      return;
    }
    let ignore = false;
    const load = async () => {
      try {
        setDetailsLoading(true);
        const response = await api.get("/api/providers/me/profile");
        const data = response.data?.data;
        if (!data || ignore) return;
        const name = splitName(data.name || user?.name || "");
        setProfileForm((prev) => ({
          ...prev,
          firstName: name.firstName,
          lastName: name.lastName,
          phone: data.phone || prev.phone || "",
          address: data.address || prev.address || "",
          profilePhoto:
            data.profileImage || data.profilePhoto || prev.profilePhoto || "",
          bankName: data.bankName || prev.bankName || "",
          accountNumber: data.accountNumber || prev.accountNumber || "",
          accountHolderName:
            data.accountHolderName || data.name || prev.accountHolderName || "",
        }));
        setProviderForm(toProviderForm(data));
      } catch (err) {
        if (!ignore) {
          setMessage({
            type: "error",
            text:
              err.response?.data?.message || "Could not load provider details.",
          });
        }
      } finally {
        if (!ignore) setDetailsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [isProvider, user]);

  useEffect(() => {
    if (!isAdmin) {
      setPlatformLoading(false);
      return;
    }

    let ignore = false;

    const loadPlatformSettings = async () => {
      try {
        setPlatformLoading(true);
        const response = await fetchPlatformSettings();
        if (ignore) return;
        setPlatformForm(toPlatformForm(response.data?.data || {}));
      } catch (err) {
        if (!ignore) {
          setMessage({
            type: "error",
            text:
              err.response?.data?.message ||
              "Could not load platform settings.",
          });
        }
      } finally {
        if (!ignore) setPlatformLoading(false);
      }
    };

    loadPlatformSettings();

    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const previewPhoto = useMemo(
    () => resolveMediaUrl(profileForm.profilePhoto),
    [profileForm.profilePhoto],
  );
  const generatedUpiId = useMemo(
    () => buildGeneratedUpiId(profileForm.phone, profileForm.bankName),
    [profileForm.phone, profileForm.bankName],
  );

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 1.5MB" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm((prev) => ({ ...prev, profilePhoto: reader.result }));
      setMessage({ type: "", text: "" });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const fullName = joinName(profileForm.firstName, profileForm.lastName);
    if (!fullName) {
      setMessage({
        type: "error",
        text: "Please enter at least a first name.",
      });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      if (isProvider) {
        const response = await api.put("/api/providers/me/profile", {
          name: fullName,
          phone: profileForm.phone.trim(),
          profilePhoto: profileForm.profilePhoto,
          bankName: profileForm.bankName.trim(),
          accountNumber: profileForm.accountNumber.trim(),
          accountHolderName: profileForm.accountHolderName.trim() || fullName,
          serviceType: providerForm.serviceType,
          location: providerForm.location.trim(),
          address: providerForm.address.trim(),
          hourlyRate: Number(providerForm.hourlyRate || 0),
          experience: Number(providerForm.experience || 0),
          availability: providerForm.availability,
          bio: providerForm.bio.trim(),
          workCategories: providerForm.workCategoriesText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        });
        const data = response.data?.data || {};
        setProviderForm(toProviderForm(data));
        setUserData({
          ...user,
          name: data.name || fullName,
          phone: data.phone || profileForm.phone,
          profilePhoto:
            data.profileImage || data.profilePhoto || profileForm.profilePhoto,
          bankName: data.bankName || profileForm.bankName,
          accountNumber: data.accountNumber || profileForm.accountNumber,
          accountHolderName:
            data.accountHolderName || profileForm.accountHolderName || fullName,
          upiId: data.upiId || generatedUpiId,
        });
        setMessage({
          type: "success",
          text: "Provider profile updated successfully!",
        });
      } else {
        const response = await api.put("/auth/profile", {
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
          profilePhoto: profileForm.profilePhoto,
          bankName: profileForm.bankName.trim(),
          accountNumber: profileForm.accountNumber.trim(),
          accountHolderName: profileForm.accountHolderName.trim() || fullName,
        });
        const nextUser = response.data?.data?.user ?? response.data?.user;
        if (nextUser) setUserData(nextUser);
        setMessage({ type: "success", text: "Profile updated successfully!" });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/auth/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    if (deleteConfirm !== "DELETE") {
      const nextMessage = "Please type DELETE to confirm.";
      setMessage({ type: "error", text: nextMessage });
      toast.error(nextMessage);
      return;
    }
    setLoading(true);
    try {
      await api.delete("/auth/account");
      queueFlashToast({
        type: "success",
        message: "Your account has been deleted successfully.",
      });
      logout();
    } catch (err) {
      const nextMessage = err.response?.data?.message || err.message;
      setMessage({ type: "error", text: nextMessage });
      toast.error(nextMessage);
      setLoading(false);
    }
  };

  const handlePlatformSubmit = async (event) => {
    event.preventDefault();
    const nextPlatformName = platformForm.platformName.trim();
    const nextCommission = Number(platformForm.commissionPercentage);

    if (!nextPlatformName) {
      setMessage({
        type: "error",
        text: "Platform name is required.",
      });
      return;
    }

    if (
      !Number.isFinite(nextCommission) ||
      nextCommission < 0 ||
      nextCommission > 100
    ) {
      setMessage({
        type: "error",
        text: "Commission percentage must be between 0 and 100.",
      });
      return;
    }

    setPlatformSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await updatePlatformSettings({
        platformName: nextPlatformName,
        commissionPercentage: nextCommission,
        maintenanceMode: platformForm.maintenanceMode,
      });

      const nextSettings = toPlatformForm(response.data?.data || {});
      setPlatformForm(nextSettings);
      await refreshStatus();

      setMessage({
        type: "success",
        text: nextSettings.maintenanceMode
          ? "Maintenance mode is active. Client and provider access is now paused."
          : "Platform settings updated successfully.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message || "Failed to update platform settings.",
      });
    } finally {
      setPlatformSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 font-sans pb-10">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-card/40 border border-border/60 rounded-[2rem] p-4 backdrop-blur-sm shadow-xs space-y-2 sticky top-24">
          <div className="px-4 py-3 mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">
              Settings
            </h2>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage({ type: "", text: "" });
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative group overflow-hidden ${
                  isActive
                    ? "text-primary bg-primary/10 border border-primary/20 shadow-xs italic"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-active-tab-indicator"
                    className="absolute inset-0 bg-primary/5 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-primary/20 text-primary shadow-xs" : "bg-muted/40 text-muted-foreground group-hover:scale-110"}`}
                >
                  <Icon size={16} />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {message.text ? (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`mb-6 p-5 rounded-[1.5rem] flex items-center gap-4 border shadow-sm ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${message.type === "success" ? "bg-emerald-500/20" : "bg-rose-500/20"}`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <XCircle size={20} />
                )}
              </div>
              <p className="text-xs font-black uppercase tracking-tight italic">
                {message.text}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="bg-card/40 backdrop-blur-xl border border-border/60 shadow-sm rounded-[2rem] overflow-hidden"
        >
          {activeTab === "profile" && (
            <div className="p-8 md:p-10">
              <div className="mb-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-xs">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight italic">
                    {isProvider ? "Provider Bio" : "Account Profile"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
                    Manage your public information
                  </p>
                </div>
              </div>

              {detailsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[11px] font-black uppercase tracking-widest italic">
                    Syncing details...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-10">
                  <div className="flex flex-col gap-6 rounded-[1.5rem] border border-border/40 bg-muted/20 p-6 sm:flex-row sm:items-center">
                    <div className="relative inline-block shrink-0">
                      <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-primary/20 bg-muted/40 flex items-center justify-center shadow-lg">
                        {previewPhoto ? (
                          <img
                            src={previewPhoto}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon
                            size={40}
                            className="text-muted-foreground opacity-40"
                          />
                        )}
                      </div>
                      <label className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                        <span className="text-lg font-bold leading-none pb-0.5">
                          +
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                    </div>
                    <div className="flex-1 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-foreground italic">
                        Branding Image
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-medium leading-relaxed opacity-80 max-w-sm">
                        High-quality square images work best. This visual is
                        seen by clients in search results and booking
                        confirmations.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.firstName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            firstName: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            lastName: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        Business Mobile
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className={`${INPUT} cursor-not-allowed opacity-50 font-medium italic`}
                      />
                    </div>
                  </div>

                  {!isProvider && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        Physical Address
                      </label>
                      <input
                        type="text"
                        placeholder="Service location..."
                        value={profileForm.address}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            address: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </div>
                  )}

                  {isProvider && (
                    <div className="grid grid-cols-1 gap-8 rounded-[2rem] border border-border/40 bg-muted/10 p-8 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Professional Category
                        </label>
                        <select
                          value={providerForm.serviceType}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              serviceType: event.target.value,
                            }))
                          }
                          className={INPUT}
                        >
                          {SERVICE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Live Status
                        </label>
                        <select
                          value={
                            providerForm.availability
                              ? "available"
                              : "unavailable"
                          }
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              availability: event.target.value === "available",
                            }))
                          }
                          className={INPUT}
                        >
                          <option value="available">Accepting Requests</option>
                          <option value="unavailable">
                            Paused (Hidden from Search)
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          City / Hub
                        </label>
                        <input
                          type="text"
                          placeholder="City, State"
                          value={providerForm.location}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              location: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Service Radius / Address
                        </label>
                        <input
                          type="text"
                          placeholder="Street or hub address..."
                          value={providerForm.address}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              address: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Base Hourly Rate (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="999"
                          value={providerForm.hourlyRate}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              hourlyRate: event.target.value,
                            }))
                          }
                          className={`${INPUT} font-black italic`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Field Experience (Years)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="5"
                          value={providerForm.experience}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              experience: event.target.value,
                            }))
                          }
                          className={`${INPUT} font-black italic`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Value Proposition (Bio)
                        </label>
                        <textarea
                          value={providerForm.bio}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              bio: event.target.value,
                            }))
                          }
                          placeholder="Explain why clients should choose your expertise..."
                          className={`${INPUT} min-h-[140px] resize-y font-medium leading-relaxed italic`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Work Categories
                        </label>
                        <input
                          type="text"
                          placeholder="Plumbing, Electrical, AC Repair"
                          value={providerForm.workCategoriesText}
                          onChange={(event) =>
                            setProviderForm((prev) => ({
                              ...prev,
                              workCategoriesText: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                          These categories power your public profile tags. Use
                          commas to add multiple works.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-[2rem] border border-border/40 bg-muted/10 p-8 space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-foreground italic">
                        Payment Details
                      </h4>
                      <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                        Add your bank name and account details. Your UPI ID is
                        generated automatically as `phone@bankname`.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.bankName}
                          onChange={(event) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              bankName: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Generated UPI ID
                        </label>
                        <input
                          type="text"
                          value={generatedUpiId || "Add phone and bank name"}
                          readOnly
                          className={`${INPUT} cursor-not-allowed opacity-70`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={profileForm.accountNumber}
                          onChange={(event) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              accountNumber: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                          Name on Account
                        </label>
                        <input
                          type="text"
                          value={profileForm.accountHolderName}
                          onChange={(event) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              accountHolderName: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-border/20">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto h-12 rounded-2xl px-10 text-[11px] font-black uppercase tracking-widest italic shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Save size={14} className="mr-2" />
                          Synchronize Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "platform" && isAdmin && (
            <div className="p-8 md:p-10">
              <div className="mb-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-xs">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight italic">
                    Platform Control
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
                    Control live access, branding, and commission
                  </p>
                </div>
              </div>

              {platformLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-[11px] font-black uppercase tracking-widest italic">
                    Loading platform controls...
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePlatformSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                        Platform Name
                      </label>
                      <input
                        type="text"
                        value={platformForm.platformName}
                        onChange={(event) =>
                          setPlatformForm((prev) => ({
                            ...prev,
                            platformName: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1 flex items-center gap-2">
                        <Percent size={12} />
                        Commission Percentage
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={platformForm.commissionPercentage}
                        onChange={(event) =>
                          setPlatformForm((prev) => ({
                            ...prev,
                            commissionPercentage: event.target.value,
                          }))
                        }
                        className={`${INPUT} font-black italic`}
                      />
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                          Maintenance Access Lock
                        </p>
                        <h4 className="mt-3 text-xl font-black italic text-foreground">
                          Hold the website during maintenance
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          When enabled, clients and providers cannot browse
                          public pages, open dashboards, create bookings, use
                          chat, or access their workspace until maintenance mode
                          is turned off.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPlatformForm((prev) => ({
                            ...prev,
                            maintenanceMode: !prev.maintenanceMode,
                          }))
                        }
                        className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-[11px] font-black uppercase tracking-[0.18em] shadow-lg transition-all hover:scale-[1.02] ${
                          platformForm.maintenanceMode
                            ? "bg-amber-400 text-slate-950 shadow-amber-400/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/10"
                        }`}
                      >
                        {platformForm.maintenanceMode
                          ? "Maintenance On"
                          : "Maintenance Off"}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.5rem] border border-border/40 bg-card/50 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Blocked While On
                        </p>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          Public browsing, sign-up, client dashboards, provider
                          dashboards, bookings, messaging, and notifications.
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-border/40 bg-card/50 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Still Allowed
                        </p>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          Admin sign-in and admin control panels stay available
                          so you can manage the platform.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/20">
                    <Button
                      type="submit"
                      disabled={platformSaving}
                      className="w-full sm:w-auto h-12 rounded-2xl px-10 text-[11px] font-black uppercase tracking-widest italic shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {platformSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={14} className="mr-2" />
                          Update Platform
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "security" && (
            <div className="p-8 md:p-10">
              <div className="mb-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-500/20 shadow-xs">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight italic">
                    Vault Access
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
                    Update your security credentials
                  </p>
                </div>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-8 max-w-xl"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </div>
                <div className="pt-6 border-t border-border/20">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto h-12 rounded-2xl px-10 text-[11px] font-black uppercase tracking-widest italic shadow-xl shadow-primary/20"
                  >
                    {loading ? "Updating..." : "Authorize Update"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="p-8 md:p-10">
              <div className="mb-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-500/20 shadow-xs">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-rose-600 italic">
                    Termination Zone
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-60">
                    Permanent account deletion
                  </p>
                </div>
              </div>

              <div className="space-y-8 max-w-xl">
                <div className="p-6 rounded-[1.5rem] bg-rose-500/5 border border-rose-500/20">
                  <p className="text-xs font-bold leading-relaxed text-rose-800 dark:text-rose-400">
                    Deleting your workspace is irreversible. All career history,
                    client connections, and financial records associated with{" "}
                    <span className="underline italic text-rose-600">
                      {user?.email}
                    </span>{" "}
                    will be purged.
                  </p>
                </div>

                <form onSubmit={handleDeleteAccount} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 ml-1">
                      Identity Verification
                    </label>
                    <p className="text-[10px] text-muted-foreground italic mb-2">
                      Type{" "}
                      <span className="font-black text-rose-600">DELETE</span>{" "}
                      to authorize permanent removal:
                    </p>
                    <input
                      type="text"
                      required
                      value={deleteConfirm}
                      onChange={(event) => setDeleteConfirm(event.target.value)}
                      placeholder="Type DELETE..."
                      className={`${INPUT} border-rose-500/30 focus:border-rose-500 focus:ring-rose-500/30 font-black italic text-rose-600 uppercase tracking-widest`}
                    />
                  </div>
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={loading || deleteConfirm !== "DELETE"}
                      className="w-full sm:w-auto h-12 rounded-2xl px-10 text-[11px] font-black uppercase tracking-widest italic bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Terminate Account
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
