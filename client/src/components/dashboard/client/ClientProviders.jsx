import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Star, 
  Filter, 
  ShieldCheck, 
  ChevronRight,
  BriefcaseBusiness,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_PROVIDERS = [
  {
    id: "P-1",
    name: "Arjun Sharma",
    profession: "Expert Plumber",
    rating: 4.8,
    reviews: 124,
    price: "₹499/hr",
    location: "Andheri, Mumbai",
    verified: true,
    avatar: "AS"
  },
  {
    id: "P-2",
    name: "Priya Patel",
    profession: "Professional Cleaner",
    rating: 4.9,
    reviews: 89,
    price: "₹299/hr",
    location: "Bandra, Mumbai",
    verified: true,
    avatar: "PP"
  },
  {
    id: "P-3",
    name: "Rajesh Kumar",
    profession: "AC Specialist",
    rating: 4.7,
    reviews: 210,
    price: "₹599/hr",
    location: "Powai, Mumbai",
    verified: true,
    avatar: "RK"
  },
  {
    id: "P-4",
    name: "Suresh Mani",
    profession: "Electrician",
    rating: 4.6,
    reviews: 56,
    price: "₹399/hr",
    location: "Colaba, Mumbai",
    verified: false,
    avatar: "SM"
  }
];

export default function ClientProviders() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProviders = MOCK_PROVIDERS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Search Header */}
      <div className="bg-card/50 p-8 rounded-[2rem] border border-border/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Find Professionals</h1>
            <p className="text-muted-foreground mt-2">Browse and book top-rated service providers in your area.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name, service or profession..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
              />
            </div>
            <div className="relative w-full md:w-64 group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Location..."
                defaultValue="Mumbai, Maharashtra"
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-background border border-border/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
              />
            </div>
            <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl shrink-0 border-border/60">
              <Filter size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProviders.map((provider) => (
          <div key={provider.id} className="group bg-card/40 hover:bg-card/60 border border-border/60 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col">
            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
              <div className="absolute top-4 right-4 z-20">
                <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-rose-500 hover:border-rose-400 transition-all">
                  <Heart size={18} />
                </button>
              </div>
              <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-5xl font-bold">
                {provider.avatar}
              </div>
              <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                <span className="bg-background/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {provider.profession}
                </span>
                {provider.verified && (
                  <span className="bg-emerald-500/80 backdrop-blur-md text-white px-2 py-1 rounded-lg shadow-sm">
                    <ShieldCheck size={14} />
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{provider.name}</h3>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <span className="text-sm font-bold">{provider.rating}</span>
                </div>
              </div>

              <div className="flex items-center text-muted-foreground text-sm gap-2 mb-4">
                <MapPin size={14} />
                <span>{provider.location}</span>
                <span className="mx-1 opacity-20">•</span>
                <span>{provider.reviews} reviews</span>
              </div>

              <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-[10px] items-center uppercase tracking-widest text-muted-foreground font-bold mb-1">Price</p>
                  <p className="text-lg font-bold text-foreground">{provider.price}</p>
                </div>
                <Button size="sm" className="rounded-xl px-5 py-5 gap-2 group/btn font-semibold">
                  View Profile
                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Empty State */}
        {filteredProviders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card/30 rounded-[3rem] border border-dashed border-border/60">
            <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-6">
              <BriefcaseBusiness size={40} opacity={0.4} />
            </div>
            <h3 className="text-xl font-semibold">No professionals found</h3>
            <p className="text-muted-foreground mt-2 max-w-xs text-center">
              We couldn't find any service providers matching "{searchQuery}". Try a different keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
