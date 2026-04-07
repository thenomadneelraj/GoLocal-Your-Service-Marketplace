import { useState } from "react";
import { Mail, Phone, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { submitContactMessage } from "@/lib/adminApi";

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  category: "support",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSending(true);
      const response = await submitContactMessage(form);
      toast.success(response.data?.message || "Message sent successfully.");
      setForm(INITIAL_FORM);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <GradientBackground>
        <Navbar />

        <section className="px-6 pb-20 pt-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr]">
            <div className="space-y-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Contact GoLocal
                </span>
                <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  Get in touch with the team behind the marketplace.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Questions about support, partnerships, technical issues, or enterprise rollouts now go directly into the live admin workspace inbox.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.24)]">
                  <Mail className="text-primary" size={22} />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">Support inbox</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Your message is stored in the platform database and routed to the admin support center for follow-up.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.24)]">
                  <ShieldCheck className="text-primary" size={22} />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">Human review</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Questions about account access, approvals, and platform settings are reviewed by the operations team.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.24)]">
                  <Phone className="text-primary" size={22} />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">Response workflow</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Use the subject and category fields to help the team route your message quickly.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.24)]">
                  <Send className="text-primary" size={22} />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">Real submission</h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    This is no longer a static page. Submissions create backend records visible at the admin support route.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[2.5rem] border border-border bg-card p-8 shadow-[0_34px_90px_-45px_rgba(15,23,42,0.26)]"
            >
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Contact form
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  Send a message
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Fill in the details below and the message will appear in the admin contact-message inbox.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Name
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Email
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Subject
                    </label>
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                      value={form.subject}
                      onChange={(event) => handleChange("subject", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Category
                    </label>
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                      value={form.category}
                      onChange={(event) => handleChange("category", event.target.value)}
                    >
                      <option value="support">Support</option>
                      <option value="sales">Sales</option>
                      <option value="technical">Technical</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Message
                  </label>
                  <textarea
                    className="mt-2 min-h-[180px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    value={form.message}
                    onChange={(event) => handleChange("message", event.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={15} />
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          </div>
        </section>

        <Footer />
      </GradientBackground>
    </main>
  );
}
