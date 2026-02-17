import { useEffect, useRef } from "react";

import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import PopularServices from "@/components/landing/PopularServices";
import WhyChooseUs from "@/components/landing/WhyChooseUs";
import Testimonials from "@/components/landing/Testimonials";
import { CTASection } from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import BackToTop from "@/components/shared/BackToTop";
import TimelineSection from "@/components/shared/timeline/TimelineSection";
import { GradientBackground } from "@/components/ui/GradientBackground";

const Index = () => {
  const timelineRef = useRef(null);
  const lineRef = useRef(null);

useEffect(() => {
  const wrapper = timelineRef.current;
  const line = lineRef.current;

  if (!wrapper || !line) return;

  const sections = wrapper.querySelectorAll("[data-color]");

  const hexToRgb = (hex) => {
    const n = parseInt(hex.replace("#", ""), 16);
    return {
      r: n >> 16,
      g: (n >> 8) & 255,
      b: n & 255,
    };
  };

  const mix = (a, b, p) => ({
    r: Math.round(a.r + (b.r - a.r) * p),
    g: Math.round(a.g + (b.g - a.g) * p),
    b: Math.round(a.b + (b.b - a.b) * p),
  });

  let ticking = false;

  const updateColor = () => {
    const mid = window.innerHeight / 2;

    sections.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();

      if (rect.top <= mid && rect.bottom >= mid) {
        const next = sections[i + 1];

        if (next) {
          const progress = (mid - rect.top) / rect.height;

          const c1 = hexToRgb(sec.dataset.color);
          const c2 = hexToRgb(next.dataset.color);
          const c = mix(c1, c2, Math.max(0, Math.min(1, progress)));

          line.style.background = `rgb(${c.r}, ${c.g}, ${c.b})`;
        } else {
          // Last section fallback
          line.style.background = sec.dataset.color;
        }
      }
    });
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateColor();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll);
  updateColor();

  return () => window.removeEventListener("scroll", onScroll);
}, []);


  return (
    <main className="min-h-screen bg-background">
      <GradientBackground>
        <Navbar />
        <HeroSection />

        {/* Timeline Wrapper */}
        <div ref={timelineRef} className="relative max-w-6xl mx-auto px-6">
          {/* Vertical Timeline Line */}
          <div
            ref={lineRef}
            className="
    hidden md:block
    absolute
    left-[calc(50%-640px+2.5rem)]
    top-0
    bottom-0
    w-[3px]
    rounded-full
    bg-blue-500
    transition-colors duration-300
    pointer-events-none
  "
          />

          <TimelineSection
            id="how-it-works"
            color="#3b82f6"
            label="How it works"
          >
            <HowItWorks />
          </TimelineSection>

          <TimelineSection
            id="services"
            color="#22c55e"
            label="Popular services"
          >
            <PopularServices />
          </TimelineSection>

          <TimelineSection
            id="why-choose-us"
            color="#a855f7"
            label="Why choose GoLocal"
          >
            <WhyChooseUs />
          </TimelineSection>

          <TimelineSection
            id="testimonials"
            color="#f97316"
            label="Trusted by customers"
          >
            <Testimonials />
          </TimelineSection>

          <TimelineSection id="cta" color="#3b82f6" label="Get Started">
            <CTASection />
          </TimelineSection>
        </div>

        <Footer />
        <BackToTop />
      </GradientBackground>
    </main>
  );
};

export default Index;
