import { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import { useMaintenance } from "@/components/contexts/MaintenanceContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { getGreetingByTime } from "@/lib/greeting";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/clientDashboard/ClientDashboardNew";
import {
  ShieldCheck,
  LifeBuoy,
  MessageSquare,
  BookOpen,
  Mail,
  Phone,
  HelpCircle,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";

// Placeholder for common utility functions
const getGreetingByTime = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const SupportStatsCard = ({ icon: Icon, title, value, description }) => (
  <div className="bg-card rounded-lg p-6 border border-border">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-3xl font-bold text-primary">{value}</p>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </div>
    </div>
  </div>
);

const FAQItem = ({ question, answer }) => (
  <div className="bg-card rounded-lg p-6 border border-border">
    <h3 className="text-lg font-semibold text-foreground mb-4">{question}</h3>
    <p className="text-muted-foreground leading-relaxed">{answer}</p>
  </div>
);

export default function ClientSupport() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");

  // Mock data - in real app, this would come from API
  const [supportStats, setSupportStats] = useState({
    openTickets: 0,
    avgResponseTime: "2.5h",
    helpArticles: 48,
  });
  const [conversations, setConversations] = useState([
    {
      id: "1",
      subject: "Payment issue with booking BK-2024-0101",
      lastMessage: "I was charged twice for the same service.",
      date: "2024-10-15",
      status: "Open"
    },
    {
      id: "2", 
      subject: "Question about service cancellation policy",
      lastMessage: "Can I cancel a booking after it's been accepted?",
      date: "2024-10-10",
      status: "Resolved"
    }
  ]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // In real app, this would be an API call
      // const response = await api.post("/api/client/support/tickets", {
      //   subject,
      //   message,
      //   bookingRef
      // });
      
      // Simulate successful ticket creation
      setTimeout(() => {
        const newTicket = {
          id: Date.now().toString(),
          subject,
          message,
          date: new Date().toISOString(),
          status: "Open"
        };
        
        setConversations([...conversations, newTicket]);
        setSubject("");
        setBookingRef("");
        setMessage("");
        setSupportStats(prev => ({
          ...prev,
          openTickets: prev.openTickets + 1
        }));
        
        toast.success("Support ticket created successfully");
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      toast.error("Failed to create support ticket");
      setLoading(false);
    }
  };

  const faqData = [
    {
      question: "How do I book a service?",
      answer: "Browse our service providers and select the one you need. Click on their profile and choose 'Book Now'. You can specify the date, time, and any special requirements."
    },
    {
      question: "How do I cancel a booking?",
      answer: "Go to your 'Bookings' page and find the booking you want to cancel. Click on the booking and select 'Cancel Booking'. You can also contact the provider directly through messages."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept all major credit cards, debit cards, and digital wallets like PayPal. You can also pay cash directly to the provider for in-person services."
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to your 'Profile' page to update your personal information, including your name, contact details, and service preferences."
    },
    {
      question: "Is my payment information secure?",
      answer: "Yes, all payment transactions are encrypted and processed through secure payment gateways. We never store your payment details on our servers."
    },
    {
      question: "How do I become a service provider?",
      answer: "Click on 'Become a Provider' in the main menu and fill out the application form. Our team will review your application within 24-48 hours."
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreetingByTime()}, {user?.name}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Get help and support from our team. We're here to assist you 24/7.
            </p>
          </div>
        </div>

        {/* Support Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <SupportStatsCard
            icon={LifeBuoy}
            title="Open Tickets"
            value={supportStats.openTickets}
            description="Currently active support requests"
          />
          <SupportStatsCard
            icon={MessageSquare}
            title="Avg Response Time"
            value={supportStats.avgResponseTime}
            description="Average time to first response"
          />
          <SupportStatsCard
            icon={HelpCircle}
            title="Help Articles"
            value={supportStats.helpArticles}
            description="Available help resources"
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Create Support Ticket */}
          <div className="lg:col-span-2">
            <Panel>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6">Create Support Ticket</h2>
                <p className="text-muted-foreground mb-6">
                  Can't find what you're looking for? Submit a ticket and our support team will get back to you.
                </p>
                
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bookingRef" className="block text-sm font-medium text-foreground mb-2">
                      Booking Reference (Optional)
                    </label>
                    <Input
                      id="bookingRef"
                      value={bookingRef}
                      onChange={(e) => setBookingRef(e.target.value)}
                      placeholder="BK-2024-0101"
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      className="w-full resize-none"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Creating Ticket..." : "Create Ticket"}
                  </Button>
                </form>
              </div>
            </Panel>
          </div>

          {/* Your Conversations */}
          <div className="lg:col-span-1">
            <Panel>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-foreground">Your Conversations</h2>
                  <Button
                    variant="outline"
                    onClick={() => setShowFAQ(false)}
                    className="text-sm"
                  >
                    Show FAQ
                  </Button>
                </div>
                
                {conversations.length > 0 ? (
                  <div className="space-y-4">
                    {conversations.map((conv) => (
                      <div key={conv.id} className="bg-card rounded-lg p-4 border border-border hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{conv.subject}</h3>
                            <p className="text-sm text-muted-foreground">{conv.lastMessage}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(conv.date).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              conv.status === "Open" ? "bg-yellow-100 text-yellow-600" :
                              conv.status === "Resolved" ? "bg-green-100 text-green-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {conv.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground">Your support conversations will appear here once you interact with providers or create support tickets.</p>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* FAQ Section */}
          {showFAQ && (
            <div className="lg:col-span-3">
              <Panel>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                    <Button
                      variant="outline"
                      onClick={() => setShowFAQ(false)}
                      className="text-sm"
                    >
                      Show Conversations
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {faqData.map((item, index) => (
                      <FAQItem
                        key={index}
                        question={item.question}
                        answer={item.answer}
                      />
                    ))}
                  </div>
                </div>
              </Panel>
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-card rounded-lg p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Email Support</h3>
            <div className="space-y-3">
              <p className="text-muted-foreground">support@servicely.com</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "mailto:support@servicely.com"}
              >
                Send Email
              </Button>
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Phone Support</h3>
            <div className="space-y-3">
              <p className="text-muted-foreground">1-800-SERVICE</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "tel:1800800800"}
              >
                Call Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
