import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function SolutionsProviders() {
  return (
    <GenericSaaSPage 
      heroTitle="Grow Your Service Business with GoLocal"
      heroSubtitle="Join thousands of professionals and get more customers, manage bookings, and increase your earnings."
      heroChecklist={[
        "Get More Leads",
        "Manage Bookings Easily",
        "Secure Payments",
        "Build Your Reputation"
      ]}
      howItWorks={[
        { title: "Create your profile", description: "Set up your digital storefront and showcase your skills." },
        { title: "List your services", description: "Configure your offerings, pricing, and availability." },
        { title: "Receive bookings", description: "Get direct requests from customers in your area." },
        { title: "Get paid", description: "Get instant payments upon job completion." }
      ]}
      benefits={[
        { title: "More visibility", description: "Reach a massive audience of local customers searching for your skills." },
        { title: "Flexible schedule", description: "Control your working hours and take on as much work as you want." },
        { title: "Instant payments", description: "No more waiting for weeks or chasing down clients for your hard-earned money." },
        { title: "Ratings & reviews system", description: "Build a reputation that attracts even more high-quality clients." }
      ]}
      popularServices={[
        "Plumber", "Electrician", "Cleaner", "AC Expert", "Carpenter"
      ]}
      trustHighlight="Earn up to 3x more with consistent bookings through GoLocal"
      ctaText="Become a Provider"
      ctaLink="/signup"
    />
  );
}
