import React, { useState } from "react";
import { 
  User, 
  MapPin, 
  Clock, 
  Settings, 
  Camera, 
  ShieldCheck, 
  Save, 
  ArrowRight, 
  Phone, 
  Mail, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Plus,
  Trash2,
  Trash,
  ChevronDown,
  Globe,
  Star,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/contexts/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useLocation } from "react-router-dom";

export default function ProviderProfile() {
  const { user, setUserData } = useAuth();
  const location = useLocation();
  const [activeSegment, setActiveSegment] = useState(() => {
    if (location.pathname.includes("availability")) return "availability";
    return "profile";
  });
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: user?.bio || "Professional service expert with over 8 years of experience in specialized cleaning and sanitization. Focused on eco-friendly solutions and high-efficiency home maintenance.",
    phone: user?.phone || "",
    address: user?.address || "San Francisco, CA",
    profilePhoto: user?.profilePhoto || ""
  });

  React.useEffect(() => {
    if (location.pathname.includes("availability")) setActiveSegment("availability");
    else if (location.pathname.includes("profile")) setActiveSegment("profile");
  }, [location.pathname]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size too large. Max 2MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, profilePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put("/api/providers/me/profile", {
         bio: profileData.bio,
         phone: profileData.phone,
         address: profileData.address,
         profilePhoto: profileData.profilePhoto
      });
      
      const updatedUser = response.data?.data;
      if (updatedUser) {
        setUserData({ ...user, ...updatedUser });
      }

      toast.success("Profile Updated Successfully!", {
          description: "Your professional details and availability have been synchronized with the database."
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const SCHEDULE = [
    { day: "Monday", status: "active", hours: "09:00 AM - 06:00 PM" },
    { day: "Tuesday", status: "active", hours: "09:00 AM - 06:00 PM" },
    { day: "Wednesday", status: "active", hours: "09:00 AM - 06:00 PM" },
    { day: "Thursday", status: "active", hours: "09:00 AM - 06:00 PM" },
    { day: "Friday", status: "active", hours: "09:00 AM - 08:00 PM" },
    { day: "Saturday", status: "limited", hours: "10:00 AM - 02:00 PM" },
    { day: "Sunday", status: "inactive", hours: "Closed" }
  ];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto font-sans">
      {/* Hero Profile Card */}
      <div className="bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-3xl relative overflow-hidden group shadow-sm">
         <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
         <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
         
         <div className="relative flex flex-col md:flex-row items-center md:items-end gap-10">
            <div className="relative group/avatar cursor-pointer shrink-0">
               <div className="w-40 h-40 rounded-[2rem] bg-emerald-500/10 border-4 border-background flex items-center justify-center text-6xl font-black text-emerald-600 shadow-xl transition-transform duration-700 group-hover/avatar:rotate-6 group-hover/avatar:scale-105 relative z-10 overflow-hidden">
                   {profileData.profilePhoto || user?.profilePhoto ? (
                      <img 
                        src={resolveMediaUrl(profileData.profilePhoto || user?.profilePhoto)} 
                        className="w-full h-full object-cover" 
                      />
                   ) : (
                      user?.name?.charAt(0) || "P"
                   )}
                   <label className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                       <Camera size={24} className="mb-1" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Update Image</span>
                       <input 
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         onChange={handlePhotoChange} 
                       />
                   </label>
                </div>
               {user?.isVerified && (
                   <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-full p-1.5 shadow-xl z-20">
                       <div className="w-full h-full bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                           <ShieldCheck size={24} />
                       </div>
                   </div>
               )}
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left pb-2">
                <div>
                   <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                      <h1 className="text-4xl font-bold tracking-tight">{user?.name || "Professional"}</h1>
                      {user?.isVerified && (
                          <span className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-emerald-500/20 shadow-xs">
                              Verified
                          </span>
                      )}
                   </div>
                   <div className="flex flex-wrap justify-center md:justify-start gap-3">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/60 px-3 py-1.5 rounded-xl border border-border/40 shadow-xs">
                           <Briefcase size={14} className="text-emerald-500" />
                           Expert Level Pro
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-background/60 px-3 py-1.5 rounded-xl border border-border/40 shadow-xs">
                           <MapPin size={14} className="text-emerald-500" />
                           San Francisco, CA
                       </div>
                   </div>
                </div>

                <div className="flex gap-2.5 pt-2 justify-center md:justify-start">
                    <Button onClick={handleSave} disabled={isSaving} className="rounded-xl h-11 px-8 text-[11px] font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-md gap-2">
                        {isSaving ? <Clock className="animate-spin" size={16} /> : <Save size={16} />}
                        Sync Updates
                    </Button>
                    <Button variant="outline" className="rounded-xl h-11 px-8 text-[11px] font-bold uppercase tracking-widest border-border/60 hover:bg-muted/50 transition-all shadow-xs">
                        View Profile
                    </Button>
                </div>
            </div>
         </div>
      </div>

      {/* Nav Segments */}
      <div className="flex items-center justify-center gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/60 max-w-fit mx-auto shadow-xs backdrop-blur-xl">
          {["profile", "availability", "areas"].map((seg) => (
              <button
                key={seg}
                onClick={() => setActiveSegment(seg)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeSegment === seg 
                    ? "bg-background text-emerald-600 shadow-sm border border-border/40" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                }`}
              >
                  {seg}
              </button>
          ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {activeSegment === "profile" && (
              <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                      <section className="bg-card/40 border border-border/60 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all shadow-sm backdrop-blur-sm">
                          <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2">
                              <User size={22} className="text-emerald-500" />
                              Bio & Description
                          </h3>
                          <textarea 
                            className="w-full bg-muted/20 border border-border/60 rounded-2xl p-6 text-sm font-medium min-h-[160px] outline-none focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/5 transition-all text-foreground/80 leading-relaxed"
                            placeholder="Introduce yourself to potential clients..."
                            value={profileData.bio}
                            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                          />
                           <div className="flex items-center gap-2 mt-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic">
                               <Info size={12} className="text-emerald-500" />
                               Aim for 150+ characters for better visibility.
                           </div>
                      </section>

                      <section className="bg-card/40 border border-border/60 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all shadow-sm backdrop-blur-sm">
                          <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-2">
                              <Settings size={22} className="text-emerald-500" />
                              Connect Channels
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2">
                             {[
                               { label: "Phone", icon: Phone, id: "phone", val: profileData.phone, placeholder: "+91 XXXXX XXXXX" },
                               { label: "Email", icon: Mail, id: "email", val: user?.email, disabled: true },
                               { label: "Portfolio", icon: Globe, id: "portfolio", val: "www.expert.com/portfolio", placeholder: "URL" },
                               { label: "Tax ID", icon: Briefcase, id: "taxId", val: "GST-IN-88219", placeholder: "ID" }
                             ].map((item, i) => (
                               <div key={i} className="group/field relative">
                                   <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 mb-1.5 italic px-1">{item.label}</p>
                                   <div className="relative">
                                       <item.icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/field:text-emerald-500 transition-colors" size={16} />
                                       <input 
                                           className={`w-full bg-muted/40 border border-border/60 rounded-xl pl-12 pr-4 h-11 text-xs font-bold italic outline-none transition-all ${item.disabled ? "opacity-50 cursor-not-allowed" : "focus:border-emerald-500/40 focus:bg-background"}`}
                                           value={item.val || ""}
                                           disabled={item.disabled}
                                           placeholder={item.placeholder}
                                           onChange={(e) => !item.disabled && setProfileData(prev => ({ ...prev, [item.id]: e.target.value }))}
                                       />
                                   </div>
                               </div>
                             ))}
                          </div>
                      </section>
                  </div>

                  <div className="space-y-6">
                     <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                            <Star size={100} />
                        </div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-5 flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            Achievements
                        </h4>
                        <div className="space-y-4">
                            {[
                                { title: "Fast Responder", desc: "Response < 1 hr", level: "98%" },
                                { title: "Work Integrity", desc: "Dispute-free rate", level: "99%" },
                                { title: "Retention", desc: "Repeat hire", level: "45%" }
                            ].map((ac, i) => (
                                <div key={i} className="p-3 rounded-xl bg-background/40 border border-border/60 hover:bg-background transition-all">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight mb-1">
                                        <span className="text-foreground">{ac.title}</span>
                                        <span className="text-emerald-500">{ac.level}</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground italic font-medium opacity-70">{ac.desc}</p>
                                </div>
                            ))}
                        </div>
                     </section>
                     
                     <Button variant="outline" className="w-full rounded-2xl h-14 text-[9px] font-bold uppercase tracking-widest border-rose-500/20 text-rose-500 hover:bg-rose-500/5 transition-all shadow-xs gap-2">
                         <Trash size={16} />
                         Deactivate Account
                     </Button>
                  </div>
              </div>
          )}

          {activeSegment === "availability" && (
              <div className="max-w-4xl mx-auto">
                  <div className="bg-card/40 border border-border/60 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all shadow-sm backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                            <Clock size={24} className="text-emerald-500" />
                            Weekly Schedule
                        </h3>
                        <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 text-[9px] font-bold uppercase tracking-widest border-border/60 hover:bg-muted/50 gap-2">
                            Update All
                            <ChevronDown size={14} />
                        </Button>
                      </div>

                      <div className="space-y-2">
                         {SCHEDULE.map((item, i) => (
                             <div key={i} className="group relative bg-muted/20 hover:bg-background border border-border/40 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                 <div className="flex items-center gap-4 min-w-[140px]">
                                     <div className={`w-2 h-8 rounded-full ${
                                         item.status === 'active' ? 'bg-emerald-500' :
                                         item.status === 'limited' ? 'bg-amber-500' :
                                         'bg-muted-foreground/30'
                                     }`} />
                                     <p className="text-md font-bold uppercase tracking-tight italic">{item.day}</p>
                                 </div>
                                 
                                 <div className="flex-1 flex items-center gap-3 bg-background/40 px-5 py-2 rounded-xl border border-border/40 group-hover:border-emerald-500/20 transition-all">
                                     <Clock size={14} className="text-emerald-500" />
                                     <p className="text-xs font-bold italic text-foreground opacity-80 uppercase leading-none">{item.hours}</p>
                                 </div>

                                 <div className="flex items-center gap-2">
                                     <div className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest shadow-xs ${
                                         item.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                         item.status === 'limited' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                         'bg-muted text-muted-foreground border-border/40 opacity-40'
                                     }`}>
                                         {item.status}
                                     </div>
                                     <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 hover:bg-muted transition-all">
                                         <MoreVertical size={16} className="text-muted-foreground" />
                                     </Button>
                                 </div>
                             </div>
                         ))}
                      </div>
                  </div>
              </div>
          )}

          {activeSegment === "areas" && (
              <div className="max-w-4xl mx-auto">
                    <div className="space-y-6">
                        <section className="bg-card/40 border border-border/60 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all shadow-sm backdrop-blur-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-all duration-1000">
                                <MapPin size={200} />
                             </div>
                             <div className="relative">
                                <h3 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-3">
                                    <MapPin size={24} className="text-emerald-500" />
                                    Operational Radius
                                </h3>
                                <p className="text-muted-foreground max-w-md text-xs font-medium leading-relaxed mb-8">
                                    Define the neighborhoods and specific city zones where you provide expert services. This improves matching accuracy.
                                </p>

                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-8">
                                    {["Greenwich Village", "Upper East", "Chelsea", "SoHo"].map((zone, i) => (
                                        <div key={i} className="group/zone flex items-center justify-between bg-background shadow-xs border border-border/60 p-4 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover/zone:scale-110 transition-transform">
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-tight">{zone}</span>
                                            </div>
                                            <button className="text-muted-foreground/30 hover:text-rose-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button className="flex items-center justify-center gap-3 bg-muted/20 border-2 border-dashed border-border/60 p-4 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-muted-foreground opacity-60 hover:opacity-100 group/add">
                                        <Plus size={18} className="group-hover/add:scale-125 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest italic">Add Zone</span>
                                    </button>
                                </div>

                                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group/banner relative overflow-hidden">
                                     <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                          <div className="flex items-center gap-4">
                                              <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-xs transition-transform group-hover/banner:scale-110">
                                                  <Globe size={22} />
                                              </div>
                                              <div>
                                                  <h4 className="text-md font-bold tracking-tight uppercase leading-none mb-1">Max Travel Radius</h4>
                                                  <p className="text-[9px] text-muted-foreground font-bold italic opacity-70 uppercase tracking-widest leading-none">From base location</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                               <span className="text-3xl font-black text-emerald-600 italic tracking-tighter">25km</span>
                                               <Button variant="outline" size="sm" className="rounded-lg h-8 border-border/60 hover:bg-emerald-500/10 hover:text-emerald-600 transition-all text-[9px] font-black tracking-widest uppercase">Change</Button>
                                          </div>
                                     </div>
                                </div>
                             </div>
                        </section>
                    </div>
              </div>
          )}
      </div>
    </div>
  );
}
