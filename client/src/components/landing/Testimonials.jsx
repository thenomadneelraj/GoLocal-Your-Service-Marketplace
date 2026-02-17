import { motion as Motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../../lib/motion";
import { Star } from "lucide-react";
import GlassCard from "../shared/GlassCard";

const testimonials = [
  {
    rating: 5,
    text:
      "GoLocal made it incredibly easy to find a reliable electrician near me. The service was quick and professional.",
    author: "Amit Sharma",
    location: "CA",
    initials: "AS",
  },
  {
    rating: 5,
    text:
      "I appreciate how easy it is to book services through GoLocal. The verification system gives me confidence in who I'm hiring.",
    author: "Sarah Johnson",
    location: "IL",
    initials: "SJ",
  },
  {
    rating: 5,
    text:
      "I've tried many platforms, and GoLocal stands out for its intuitive interface and reliable professionals. Highly recommended!",
    author: "Michael Lee",
    location: "TX",
    initials: "ML",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 scroll-mt-24">
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
          What Our Customers Say
        </Motion.h2>

        <Motion.p
          variants={fadeUp}
          className="text-muted-foreground max-w-2xl mx-auto mb-12"
        >
          See what our customers have to say about their experience with GoLocal.
        </Motion.p>

        <Motion.div className="mt-12 grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Motion.div key={index} variants={fadeUp}>
              <GlassCard className="p-6 relative h-full flex flex-col">
                {/* Quotation mark */}
                <div className="absolute -top-4 left-6 text-5xl text-primary/20">
                  “
                </div>

                {/* Star rating */}
                <div className="flex justify-center mb-4 mt-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>

                {/* Review text */}
                <p className="text-muted-foreground mb-6 leading-relaxed flex-grow">
                  {testimonial.text}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {testimonial.initials}
                  </div>

                  <div className="text-left">
                    <p className="font-semibold text-foreground">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </Motion.div>
          ))}
        </Motion.div>
      </Motion.div>
    </section>
  );
}
