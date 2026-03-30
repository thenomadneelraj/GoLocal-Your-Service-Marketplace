import { motion as Motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Star, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { GradientBackground } from "@/components/ui/GradientBackground";

const Section = ({ children, className = "" }) => (
  <Motion.section
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className={`py-20 px-6 ${className}`}
  >
    {children}
  </Motion.section>
);

export default function GenericSaaSPage({ 
  heroTitle, 
  heroSubtitle, 
  heroChecklist = [], 
  ctaText = "Get Started", 
  ctaLink = "/signup",
  howItWorks = [],
  popularServices = [],
  benefits = [],
  trustHighlight = null
}) {
  return (
    <main className="min-h-screen bg-background">
      <GradientBackground>
        <Navbar />
        
        {/* HERO SECTION */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <Motion.div 
              initial={{ opacity: 0, x: -30 }} 
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {heroTitle}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                {heroSubtitle}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {heroChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold group" asChild>
                  <Link to={ctaLink}>
                    {ctaText}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold">
                  Learn More
                </Button>
              </div>
            </Motion.div>

            <Motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="relative hidden lg:block"
            >
              <div className="w-full aspect-square rounded-[3rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden flex items-center justify-center">
                 <div className="absolute inset-0 backdrop-blur-[2px]" />
                 <Zap className="w-48 h-48 text-primary/40 animate-pulse" />
                 
                 {/* Decorative elements */}
                 <div className="absolute top-10 right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
                 <div className="absolute bottom-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
              </div>
            </Motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        {howItWorks.length > 0 && (
          <Section className="bg-muted/30">
            <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
              <p className="text-muted-foreground text-lg">Four simple steps to get started</p>
            </div>
            
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
              {howItWorks.map((step, i) => (
                <div key={i} className="relative group p-8 rounded-3xl bg-card border border-border shadow-sm hover:shadow-xl transition-all h-full">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* BENEFITS & WHY US */}
        {benefits.length > 0 && (
          <Section>
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold">Why Choose Us</h2>
                <div className="grid gap-6">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                         <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold mb-1">{benefit.title}</h4>
                        <p className="text-muted-foreground text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                 {popularServices.map((service, i) => (
                   <div key={i} className={`p-6 rounded-3xl border border-border flex flex-col items-center justify-center text-center gap-3 bg-card hover:bg-muted/50 transition-colors ${i % 2 === 1 ? 'mt-8' : ''}`}>
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                         <Star className="w-6 h-6 text-primary" />
                      </div>
                      <span className="font-bold text-foreground">{service}</span>
                   </div>
                 ))}
              </div>
            </div>
          </Section>
        )}

        {/* TRUST SECTION */}
        {trustHighlight && (
          <Section className="bg-primary/5 border-y border-primary/10 py-12">
            <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-4">
               <div className="flex -space-x-4 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted overflow-hidden flex items-center justify-center">
                       <User size={20} className="text-muted-foreground" />
                    </div>
                  ))}
               </div>
               <p className="text-xl font-bold text-foreground">
                  {trustHighlight}
               </p>
            </div>
          </Section>
        )}

        {/* FINAL CTA */}
        <Section className="pb-32">
          <div className="max-w-5xl mx-auto p-12 md:p-20 rounded-[3rem] bg-foreground text-background text-center space-y-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight relative z-10">
               Ready to experience the difference?
            </h2>
            <p className="text-background/60 text-lg max-w-2xl mx-auto relative z-10">
               Join GoLocal today and discover a world of trusted services at your fingertips.
            </p>
            <div className="relative z-10">
               <Button size="lg" variant="default" className="h-16 px-10 rounded-2xl bg-background text-foreground hover:bg-background/90 text-lg font-bold" asChild>
                  <Link to={ctaLink}>{ctaText}</Link>
               </Button>
            </div>
          </div>
        </Section>

        <Footer />
      </GradientBackground>
    </main>
  );
}

// Subcomponent for better icon support in users
const User = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
