import { motion as Motion } from "framer-motion";
import { Shield, DollarSign, Star, Lock, HeartHandshake } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Verified Professionals",
    description:
      "Every service provider is background-checked and verified for your safety.",
  },
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description:
      "Upfront pricing with no hidden costs. Pay only for what you book.",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    description:
      "All transactions are protected with industry-standard security.",
  },
  {
    icon: HeartHandshake,
    title: "Trusted by Thousands",
    description:
      "Join thousands of happy customers who rely on GoLocal every day.",
  },
  {
    icon: Star,
    title: "Top Rated Services",
    description:
      "Highly rated professionals delivering consistent quality work.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

export default function WhyChooseUs() {
  return (
    <section className="py-12 bg-background dark:bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* HEADER */}
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            Why Choose GoLocal?
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Connecting you with trusted professionals through secure,
            transparent, and reliable services.
          </p>
        </Motion.div>

        {/* FEATURES */}
        <Motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Motion.div
                key={feature.title}
                variants={itemVariants}
                className="flex items-start gap-4 p-6 bg-card border border-border rounded-xl"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Motion.div>
            );
          })}
        </Motion.div>

        {/* STATS */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { value: "10K+", label: "Happy Users" },
            { value: "2K+", label: "Providers" },
            { value: "4.8★", label: "Average Rating" },
            { value: "50K+", label: "Jobs Completed" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-6 text-center"
            >
              <p className="text-3xl font-bold text-primary mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </Motion.div>
      </div>
    </section>
  );
}
