import { motion as Motion } from "framer-motion";
import { Search, ArrowRight, Shield, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-professionals-Clyn7C6C.png";
export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">

        {/* LEFT CONTENT */}
        <Motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/60 backdrop-blur rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">
              Trusted by 10,000+ users
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Find Trusted Local Services{" "}
            <span className="text-primary">Near You</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            Book verified professionals for plumbing, electrical, cleaning,
            repairs, and more — all in one place.
          </p>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="What service do you need?"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background"
              />
            </div>
            <Button size="lg" className="rounded-xl" asChild>
              <Link to="/signup">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Secondary CTA */}
          <Button variant="outline" size="lg" className="rounded-xl mb-10" asChild>
            <Link to="/providers">Browse a Service Provider</Link>
          </Button>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-6">
            <TrustItem icon={<Shield />} text="Verified Pros" />
            <TrustItem icon={<Star className="fill-yellow-500" />} text="4.8 Avg Rating" />
            <TrustItem icon={<Users />} text="2K+ Providers" />
          </div>
        </Motion.div>

        {/* RIGHT IMAGE */}
        <Motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="absolute -inset-6 bg-primary/10 rounded-3xl blur-2xl" />
          <img
            src={heroImage}
            alt="Local service professionals"
            className="relative rounded-2xl shadow-lg w-full object-cover aspect-[4/3]"
          />

          {/* Floating Card */}
          <div className="absolute -bottom-6 -left-6 bg-background rounded-xl shadow-lg p-4 border">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="text-lg font-bold">100%</p>
                <p className="text-sm text-muted-foreground">
                  Verified Professionals
                </p>
              </div>
            </div>
          </div>
        </Motion.div>
      </div>
    </section>
  );
}

const TrustItem = ({ icon, text }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span className="text-primary">{icon}</span>
    {text}
  </div>
);
