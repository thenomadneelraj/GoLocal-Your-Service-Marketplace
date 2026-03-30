import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function SolutionsBusinesses() {
  return (
    <GenericSaaSPage 
      heroTitle="Professional Service Solutions for Businesses"
      heroSubtitle="Manage large-scale service needs with reliable providers and streamlined operations."
      heroChecklist={[
        "Dedicated Support",
        "Bulk Booking Management",
        "Verified Workforce",
        "Custom Pricing Plans"
      ]}
      howItWorks={[
        { title: "Onboarding", description: "Seamless transition of your maintenance operations to GoLocal." },
        { title: "Team Management", description: "Assign roles and track provider performance effortlessly." },
        { title: "Bulk Scheduling", description: "Plan recurring maintenance across all your facilities at once." },
        { title: "Unified Invoicing", description: "One simple monthly bill for all your service needs." }
      ]}
      benefits={[
        { title: "Centralized dashboard", description: "One place to manage all your office maintenance and services." },
        { title: "Team management", description: "Efficiently assign and track tasks across your workforce." },
        { title: "Scheduled services", description: "Recurring bookings ensure your facilities are always maintained." },
        { title: "Invoice tracking", description: "Simple expense reporting for all your business services." }
      ]}
      popularServices={[
        "Office Maintenance", "Facility Management", "Cleaning Contracts", "Electrical & Repairs"
      ]}
      trustHighlight="Trusted by 100+ top-tier companies across the country"
      ctaText="Contact Sales"
      ctaLink="/contact"
    />
  );
}
