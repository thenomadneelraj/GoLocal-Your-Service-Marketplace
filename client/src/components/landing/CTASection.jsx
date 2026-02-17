import { motion as Motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const CTASection = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmail("");
  };

  return (
    <section className="py-28 relative">
      <div className="max-w-5xl mx-auto px-4">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="
            relative overflow-hidden
            rounded-3xl
            bg-gradient-to-br from-primary/20 to-primary/5
            border border-border
            p-10 md:p-14
            text-center
          "
        >
          {/* glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary/20 blur-3xl rounded-full" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
            Join thousands of satisfied customers who have simplified their lives
            with GoLocal. Get started today and experience the difference.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-background border border-input"
                />
              </div>
              <Button size="lg" className="rounded-xl px-6">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground mt-4">
            No spam. Unsubscribe anytime. Terms apply.
          </p>
        </Motion.div>
      </div>
    </section>
  );
};
