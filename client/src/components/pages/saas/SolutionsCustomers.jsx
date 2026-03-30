import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function SolutionsCustomers() {
  return (
    <GenericSaaSPage 
      heroTitle="Find Trusted Local Services Near You"
      heroSubtitle="Book verified professionals for home services like plumbing, electrical, cleaning, repairs, and more — all in one place."
      heroChecklist={[
        "Verified Providers",
        "Transparent Pricing",
        "Easy Booking",
        "Real Reviews"
      ]}
      howItWorks={[
        { title: "Search your service", description: "Filter through dozens of local service categories from verified experts." },
        { title: "Compare providers", description: "View ratings, reviews, and detailed experience before making a choice." },
        { title: "Book instantly", description: "Choose a time that works for you and secure your slot with a click." },
        { title: "Get the job done", description: "Relax while our trusted professionals handle the rest with care." }
      ]}
      benefits={[
        { title: "100% Verified Professionals", description: "Every provider goes through a rigorous identity and skill verification." },
        { title: "Secure Payments", description: "Your money is held in escrow until you're satisfied with the results." },
        { title: "Fast Booking", description: "No more endless calls. Get a pro at your doorstep in minutes." },
        { title: "24/7 Support", description: "Our team is here to help with any questions or issues, anytime." }
      ]}
      popularServices={[
        "Plumbing", "Electrical", "Cleaning", "AC Repair", "Carpentry"
      ]}
      trustHighlight="Trusted by 5,000+ happy customers in your neighborhood"
      ctaText="Find a Service Now"
      ctaLink="/providers"
    />
  );
}
