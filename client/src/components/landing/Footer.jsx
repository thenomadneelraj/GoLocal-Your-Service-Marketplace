import { MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const footerLinks = {
  quickLinks: [
    { label: "Home", href: "#" },
    { label: "Services", href: "#" },
    { label: "About Us", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Careers", href: "#" },
  ],
  services: [
    { label: "Plumbing", href: "#" },
    { label: "Electrician", href: "#" },
    { label: "Cleaning", href: "#" },
    { label: "Painting", href: "#" },
    { label: "AC Repair", href: "#" },
  ],
  support: [
    { label: "Help Center", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 pt-12 pb-8 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">GoLocal</span>
          </div>

          <p className="text-card/70 text-zinc-400 text-sm mb-6">
            Connecting you with trusted local professionals for all your service
            needs.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-card/10 flex items-center justify-center hover:bg-card/20 transition"
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-3">
            {footerLinks.quickLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-zinc-400 text-sm text-card/70 hover:text-card transition"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-semibold mb-4">Popular Services</h3>
          <ul className="space-y-3">
            {footerLinks.services.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-zinc-400 text-sm text-card/70 hover:text-card transition"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-semibold mb-4">Support</h3>
          <ul className="space-y-3">
            {footerLinks.support.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-zinc-400 text-sm text-card/70 hover:text-card transition"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="text-zinc-400 border-t border-card/10 mt-12 pt-6 text-center text-sm text-card/60">
        © {new Date().getFullYear()} GoLocal. All rights reserved.
      </div>
    </footer>
  );
}
