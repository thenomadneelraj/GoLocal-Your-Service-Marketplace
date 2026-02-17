import { motion as Motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { Zap, Wrench, Sparkles, Hammer, Paintbrush, Truck } from "lucide-react";

const services = [
  {
    icon: Zap,
    name: "Electrical",
    providers: "120+ providers"
  },
  {
    icon: Wrench,
    name: "Plumbing", 
    providers: "95+ providers"
  },
  {
    icon: Sparkles,
    name: "Cleaning",
    providers: "150+ providers"
  },
  {
    icon: Hammer,
    name: "Repair & Maintenance",
    providers: "85+ providers"
  },
  {
    icon: Paintbrush,
    name: "Painting",
    providers: "70+ providers"
  },
  {
    icon: Truck,
    name: "Moving Services",
    providers: "60+ providers"
  }
];

export default function PopularServices() {
  return (
    <section id="services" className="py-12 bg-zinc-950">
      <Motion.div
        className="max-w-7xl mx-auto px-6 text-center"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Motion.h2
          variants={fadeUp}
          className="text-blue-500 text-3xl font-bold mb-6"
        >
          Popular Services
        </Motion.h2>

        <Motion.div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Motion.div
                key={index}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left transition-all duration-300 hover:border-blue-500"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-1">
                  {service.name}
                </h3>
                <p className="text-sm text-zinc-400">
                  {service.providers}
                </p>
              </Motion.div>
            );
          })}
        </Motion.div>

        <Motion.div variants={fadeUp} className="mt-8">
          <button className="text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-2">
            View all services →
          </button>
        </Motion.div>
      </Motion.div>
    </section>
  );
}
