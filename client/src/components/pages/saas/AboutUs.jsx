import GenericSaaSPage from "../../shared/GenericSaaSPage";

export default function AboutUs() {
  return (
    <GenericSaaSPage 
      heroTitle="Reimagining Local Services for Everyone"
      heroSubtitle="Our mission is to bridge the gap between skilled professionals and customers, fostering a community of trust and excellence."
      heroChecklist={[
        "Mission-Driven Team",
        "Community First",
        "Transparency & Trust",
        "Innovation in Service"
      ]}
      howItWorks={[
        { title: "Empower Pros", description: "Providing tools for solo professionals to thrive." },
        { title: "Simplify Booking", description: "Making service discovery as easy as ordering food." },
        { title: "Ensure Quality", description: "Constant monitoring and support for all users." },
        { title: "Grow Together", description: "Building a platform that benefits all stakeholders." }
      ]}
      benefits={[
        { title: "Innovation", description: "Always building new ways to improve the service economy." },
        { title: "Integrity", description: "Honesty and fairness are at the core of our operations." },
        { title: "Impact", description: "Transforming lives by enabling professional growth." },
        { title: "Reliability", description: "A platform you can count on for every single job." }
      ]}
      popularServices={[
        "Innovation", "Reliability", "Trust", "Growth", "Community"
      ]}
      trustHighlight="Building the future of local service marketplaces since 2024"
      ctaText="Join the Movement"
      ctaLink="/signup"
    />
  );
}
