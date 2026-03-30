import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function Pricing() {
  return (
    <GenericSaaSPage 
      heroTitle="Simple, Transparent Pricing"
      heroSubtitle="Choose the plan that's right for you. Whether you're a customer, a solo pro, or a growing business, we've got you covered."
      heroChecklist={[
        "No Hidden Fees",
        "Free Registration",
        "Flexible Subscriptions",
        "Commission Model"
      ]}
      howItWorks={[
        { title: "Choose a Plan", description: "Select the subscription or fee structure that fits your needs." },
        { title: "Add Your Payment", description: "Securely link your payment method for easy transactions." },
        { title: "Manage Your Costs", description: "Keep track of all your spending and earnings in one dashboard." },
        { title: "Get the Job Done", description: "Focus on your tasks while we handle the payments and support." }
      ]}
      benefits={[
        { title: "Transparent Pricing", description: "Know exactly what you'll be paying for every single job." },
        { title: "Escrow Security", description: "Your payments are only released when the work is done and verified." },
        { title: "Multiple Tiers", description: "Different tiers for customers, providers, and businesses." },
        { title: "24/7 Support", description: "Help is always available, regardless of your plan." }
      ]}
      popularServices={[
        "Basic Plan", "Solo Pro", "Professional", "Business Plan"
      ]}
      trustHighlight="Pricing (Subscription / Commission model)"
      ctaText="Pick a Plan"
      ctaLink="/signup"
    />
  );
}
