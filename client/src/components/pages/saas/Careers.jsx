import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function Careers() {
  return (
    <GenericSaaSPage 
      heroTitle="Join Our Mission to Empower Local Professionals"
      heroSubtitle="We're building the infrastructure for the future of local services. Come help us transform how people work and get things done."
      heroChecklist={[
        "Remote-First Culture",
        "Competitive Equity",
        "Learning Budget",
        "Home Office Stipend"
      ]}
      howItWorks={[
        { title: "Apply", description: "Send us your resume and a brief note about why you're interested in GoLocal." },
        { title: "Interview", description: "Meet with our team to discuss your experience, skills, and values." },
        { title: "Evaluate", description: "Collab on a small project or technical assessment to see how we work together." },
        { title: "Offer", description: "Welcome to the team! We'll set you up with everything you need to succeed." }
      ]}
      benefits={[
        { title: "Work from Anywhere", description: "We're a distributed team that values autonomy and trust." },
        { title: "Stock Options", description: "Everyone is an owner at GoLocal. Grow with the company." },
        { title: "Health & Wellness", description: "Comprehensive health plans and wellness stipends for you and your family." },
        { title: "Career Growth", description: "Opportunity to take on leadership roles as we scale rapidly." }
      ]}
      popularServices={[
        "Engineering", "Product Design", "Marketing", "Customer Success", "Sales"
      ]}
      trustHighlight="We're always looking for talented individuals to join our growing global team."
      ctaText="View Openings"
      ctaLink="/careers"
    />
  );
}
