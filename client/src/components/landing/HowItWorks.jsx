import { motion as Motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { Search, Calendar, CheckCircle } from "lucide-react";
import GlassCard from "../shared/GlassCard";

const steps = [
  {
    icon: Search,
    title: "Search a Service",
    description:
      "Find the service you need from our wide range of verified local professionals.",
  },
  {
    icon: Calendar,
    title: "Book Instantly",
    description:
      "Choose a convenient time and book instantly with transparent pricing.",
  },
  {
    icon: CheckCircle,
    title: "Get It Done",
    description:
      "Sit back and relax while our trusted experts complete the job.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 scroll-mt-24">
      <Motion.div
        className="container mx-auto px-4 text-center"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Motion.h2
          variants={fadeUp}
          className="text-3xl font-bold mb-4 text-primary"
        >
          How It Works
        </Motion.h2>

        <Motion.div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Motion.div key={index} variants={fadeUp}>
                <GlassCard className="p-8 text-center">
                  <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 mx-auto">
                      <Icon className="w-8 h-8" />
                    </div>

                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="font-semibold text-xl mb-3 text-foreground">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </GlassCard>
              </Motion.div>
            );
          })}
        </Motion.div>
      </Motion.div>
    </section>
  );
}
