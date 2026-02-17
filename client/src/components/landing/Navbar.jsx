import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false); // close mobile menu
  };

  const handleLogoClick = () => {
    setIsOpen(false);

    // If already on landing page, scroll to top
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border"
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* ✅ Logo (Home link) */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">GoLocal</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            How it Works
          </a>
          <a
            href="#services"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Services
          </a>
          <a
            href="#testimonials"
            className="text-muted-foreground hover:text-foreground transition"
          >
            Testimonials
          </a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/signin">Sign In</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <Motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-16 left-0 w-full bg-card border-b border-border shadow-lg z-40 md:hidden"
        >
          <div className="flex flex-col px-6 py-6 gap-4">
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-left text-muted-foreground hover:text-primary"
            >
              How it Works
            </button>

            <button
              onClick={() => scrollToSection("services")}
              className="text-left text-muted-foreground hover:text-primary"
            >
              Services
            </button>

            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-left text-muted-foreground hover:text-primary"
            >
              Testimonials
            </button>

            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <Link
                to="/signin"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-2 rounded bg-black text-white"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                onClick={() => setIsOpen(false)}
                className="w-full text-center py-2 rounded bg-blue-600 text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </Motion.div>
      )}
    </Motion.nav>
  );
}
