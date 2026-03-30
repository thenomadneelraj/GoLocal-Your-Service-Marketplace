import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function Legal() {
  return (
    <GenericSaaSPage 
      heroTitle="Legal & Privacy Center"
      heroSubtitle="Your trust is our most valuable asset. We're committed to transparency and the security of your data and transactions."
      heroChecklist={[
        "GDPR Compliant",
        "PCI Secure",
        "Clear Terms",
        "Robust Privacy"
      ]}
      howItWorks={[
        { title: "Review Terms", description: "Understand the terms of service that govern our platform." },
        { title: "Privacy Policy", description: "Learn how we protect your personal and business data." },
        { title: "Escrow Logic", description: "Detailed look at our payment security and transaction rules." },
        { title: "Compliance", description: "Our commitment to legal and regulatory standards." }
      ]}
      benefits={[
        { title: "Data Protection", description: "We use enterprise-grade encryption for all your information." },
        { title: "Transaction Trust", description: "Our escrow system is designed for your security." },
        { title: "Identity Verification", description: "Rigorous checks for all users to prevent fraud." },
        { title: "Global Compliance", description: "Adhering to legal standards across the globe." }
      ]}
      popularServices={[
        "Terms", "Privacy", "Security", "Escrow", "Compliance"
      ]}
      trustHighlight="We're building the most trusted local service marketplace in the world."
      ctaText="Full Legal Docs"
      ctaLink="/legal"
    />
  );
}
