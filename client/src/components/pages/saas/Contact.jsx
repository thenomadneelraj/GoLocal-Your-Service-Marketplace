import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function Contact() {
  return (
    <GenericSaaSPage 
      heroTitle="Get in Touch with GoLocal"
      heroSubtitle="Have questions about our platform or want to learn how we can help your business grow? We're here to help."
      heroChecklist={[
        "24/7 Response",
        "Expert Support",
        "Custom Demos",
        "Global Coverage"
      ]}
      howItWorks={[
        { title: "Fill the form", description: "Provide a quick overview of your needs and questions." },
        { title: "We reach out", description: "Our team will get back to you within 24 hours to discuss." },
        { title: "Schedule a demo", description: "See GoLocal in action and learn how we can help you." },
        { title: "Start growing", description: "Join our platform and start transforming your business today." }
      ]}
      benefits={[
        { title: "Personalized Help", description: "Speak with real people who care about your success." },
        { title: "Technical Support", description: "Dedicated help for any technical issues or integrations." },
        { title: "Sales Inquiries", description: "Custom pricing and solutions for enterprise customers." },
        { title: "Media & Partnerships", description: "For all PR, media inquiries, and partnership requests." }
      ]}
      popularServices={[
        "Support", "Sales", "Partnerships", "Media", "Technical"
      ]}
      trustHighlight="Your feedback and questions keep us growing and improving GoLocal."
      ctaText="Email Us Directly"
      ctaLink="mailto:support@golocal.com"
    />
  );
}
