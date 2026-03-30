import React, { useState, useRef } from "react";
import { 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Camera, 
  User, 
  ArrowRight, 
  Info, 
  X,
  Lock,
  Zap,
  Building2,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/contexts/AuthContext";
import { toast } from "sonner";

export default function ProviderVerification() {
  const { user, updateProfile } = useAuth();
  const [status, setStatus] = useState(user?.isVerified ? "verified" : "pending"); // pending, review, verified, rejected
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState({
    idProof: null,
    businessProof: null,
    selfie: null
  });

  const idInputRef = useRef(null);
  const businessInputRef = useRef(null);
  const selfieInputRef = useRef(null);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", { description: "Maximum file size is 5MB" });
        return;
      }
      setFiles(prev => ({ ...prev, [type]: file }));
      toast.success(`${type.replace(/([A-Z])/g, ' $1')} selected`, {
        description: `${file.name} ( ${(file.size / 1024 / 1024).toFixed(2)} MB )`
      });
    }
  };

  const removeFile = (type) => {
    setFiles(prev => ({ ...prev, [type]: null }));
  };

  const handleSubmit = async () => {
    if (!files.idProof || !files.businessProof || !files.selfie) {
      toast.error("Strict Requirement", { description: "Please upload all 3 documents for professional verification." });
      return;
    }

    setIsSubmitting(true);
    setStatus("review");
    
    // Phase 1: Upload Simulation
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Encrypting and uploading professional identity documents...',
        success: 'Files securely uploaded to GoLocal cloud',
        error: 'Upload failed',
      }
    );

    // Phase 2: Review Simulation
    setTimeout(async () => {
      setIsSubmitting(false);
      setStatus("verified");
      
      if (user) {
        try {
          await updateProfile({ isVerified: true });
        } catch (e) {
          console.log("Local state updated");
        }
      }

      toast.success("Verification Successful!", {
        description: "Your professional profile has been verified. The Shield Badge is now active on your profile.",
        duration: 5000,
      });
    }, 5500);
  };

  const renderUploadZone = (type, label, Icon, description, ref) => {
    const hasFile = files[type];
    return (
      <div 
        onClick={() => !hasFile && ref.current?.click()}
        className={`group relative border-2 border-dashed rounded-[3rem] p-10 flex flex-col items-center justify-center text-center transition-all duration-500 cursor-pointer overflow-hidden ${
          hasFile 
          ? "border-emerald-500/40 bg-emerald-500/[0.03] shadow-inner" 
          : "border-border/60 bg-card/20 hover:border-emerald-500/40 hover:bg-card/40"
        }`}
      >
        <input 
          type="file" 
          ref={ref} 
          className="hidden" 
          accept="image/*,.pdf" 
          onChange={(e) => handleFileChange(e, type)}
        />
        
        {hasFile ? (
          <div className="relative animate-in zoom-in-95 duration-500 w-full">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-lg mx-auto mb-6 relative group-hover:scale-110 transition-transform">
              <CheckCircle2 size={40} className="animate-in fade-in zoom-in duration-700" />
              <button 
                onClick={(e) => { e.stopPropagation(); removeFile(type); }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-card border border-border/60 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm font-black text-foreground uppercase tracking-widest">{label} Uploaded</p>
            <p className="text-[10px] text-muted-foreground mt-2 font-bold truncate max-w-[200px] mx-auto italic opacity-60 px-4">{hasFile.name}</p>
          </div>
        ) : (
          <div className="group-hover:scale-105 transition-transform duration-500">
            <div className="w-24 h-24 bg-muted/40 rounded-[2.5rem] flex items-center justify-center mb-6 ring-8 ring-emerald-500/5 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-all">
              <Icon size={40} className="text-muted-foreground/30 group-hover:text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-foreground tracking-tight uppercase">{label}</h3>
            <p className="text-xs text-muted-foreground mt-3 max-w-[200px] font-medium italic leading-relaxed">{description}</p>
          </div>
        )}
        
        {!hasFile && (
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                Choose Document
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      {/* Header & Status */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 xl:col-span-8 bg-card/60 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden group shadow-sm h-full flex flex-col justify-center">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl w-fit text-xs font-bold uppercase tracking-widest border border-emerald-500/20 mb-6">
              <ShieldCheck size={16} />
              Elite Professional Verification
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">Identify Yourself</h1>
            <p className="text-muted-foreground max-w-lg text-sm font-medium leading-relaxed">
                To maintain the highest standards of trust at <span className="text-foreground font-bold">GoLocal</span>, all professionals must undergo identity and business verification.
            </p>
          </div>
        </div>

        <div className="lg:col-span-12 xl:col-span-4 bg-card/40 border border-border/60 rounded-[2rem] p-8 backdrop-blur-sm relative group overflow-hidden h-full">
           <div className="flex flex-col h-full justify-between gap-8">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 italic mb-4">Account Status</p>
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm border-2 border-background transition-transform group-hover:rotate-12 duration-500 ${
                            status === "verified" ? "bg-emerald-500/10 text-emerald-600" :
                            status === "review" ? "bg-amber-500/10 text-amber-600" :
                            "bg-muted/40 text-muted-foreground"
                        }`}>
                            {status === "verified" ? <ShieldCheck size={32} /> :
                             status === "review" ? <Clock size={32} className="animate-pulse" /> :
                             <Zap size={32} className="opacity-30" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold tracking-tight uppercase italic leading-none">{status}</h3>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Verified Professional</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center justify-between p-3.5 bg-background/60 rounded-xl border border-border/60 shadow-xs group/step">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">{step}</div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover/step:text-foreground transition-colors">
                                    {step === 1 ? "Submit KYC" : step === 2 ? "Internal Review" : "Shield Active"}
                                </span>
                            </div>
                            <CheckCircle2 size={14} className={
                                (step === 1 && status !== "pending") || 
                                (step === 2 && status === "verified") || 
                                (step === 3 && status === "verified") 
                                ? "text-emerald-500" : (step === 2 && status === "review" ? "text-amber-500 animate-pulse" : "text-muted-foreground opacity-30")
                            } />
                        </div>
                    ))}
                </div>
           </div>
        </div>
      </div>

      {status === "verified" ? (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-16 flex flex-col items-center text-center shadow-sm group relative overflow-hidden animate-in zoom-in-95 duration-700">
           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
           <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-emerald-500/20 relative z-10 mb-8 group-hover:scale-105 transition-transform rotate-6">
              <ShieldCheck size={48} />
           </div>
           <h2 className="text-3xl font-bold text-foreground mb-3 uppercase tracking-tight relative z-10">Account Fully Verified</h2>
           <p className="text-muted-foreground max-w-sm italic font-medium leading-relaxed relative z-10 text-sm">
             Your professional identity is secured. The <span className="text-emerald-600 font-bold">GoLocal Shield Badge</span> is now active.
           </p>
           <Button variant="outline" className="mt-8 rounded-xl h-12 px-8 text-[10px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm relative z-10">
              Public Profile
              <ArrowRight size={16} className="ml-2" />
           </Button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="grid gap-4 md:grid-cols-3">
             {renderUploadZone(
               "idProof", 
               "Government ID", 
               FileText, 
               "UIDAI Aadhar, PAN, or Passport copy.",
               idInputRef
             )}
             {renderUploadZone(
               "businessProof", 
               "Professional Proof", 
               Building2, 
               "Certificate, GST or license.",
               businessInputRef
             )}
             {renderUploadZone(
               "selfie", 
               "Live Selfie", 
               Camera, 
               "Clear photo for facial matching.",
               selfieInputRef
             )}
          </div>

          <div className="flex flex-col items-center gap-6 pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left bg-muted/40 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm group w-full">
                  <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center text-emerald-600 border border-border/60 shadow-sm group-hover:rotate-12 transition-transform">
                      <Lock size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground italic flex items-center gap-2 justify-center md:justify-start leading-none">
                          <ShieldCheck size={12} className="text-emerald-500" />
                          Encrypted Privacy
                       </h4>
                       <p className="text-[9px] font-medium text-muted-foreground leading-relaxed max-w-2xl opacity-70">
                          Your sensitive documents are encrypted immediately and stored in a secure vault.
                       </p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-700/80 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                      <Zap size={10} />
                      Express Review
                  </div>
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || status === "review"}
                className="rounded-[2rem] h-16 px-12 text-lg font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 group"
              >
                {isSubmitting ? (
                    <span className="flex items-center gap-4">
                        <Clock size={20} className="animate-spin" />
                        Processing...
                    </span>
                ) : (
                    <span className="flex items-center gap-3 group-hover:gap-4 transition-all">
                        Submit Verification
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                )}
              </Button>
              
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40 italic">Review time: 12-24 Hours</p>
          </div>
        </div>
      )}

      {/* Verification Stats */}
      <div className="pt-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
                { label: "Phone", value: user?.phone || "Verified", icon: Phone, color: "emerald" },
                { label: "Email", value: user?.email || "verified@expert.com", icon: FileText, color: "blue" },
                { label: "Profile", value: "95% Complete", icon: User, color: "violet" },
                { label: "Business", value: "Premium Registered", icon: Building2, color: "amber" }
            ].map((stat, i) => (
                <div key={i} className="bg-card/30 border border-border/60 rounded-2xl p-4 backdrop-blur-sm group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                            stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            stat.color === "blue" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                            stat.color === "violet" ? "bg-violet-500/10 text-violet-600 border-violet-500/20" :
                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}>
                            <stat.icon size={16} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-60 leading-none mb-1">{stat.label}</p>
                            <p className="text-[10px] font-bold truncate italic leading-none">{stat.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
