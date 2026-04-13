import { FileText, MapPin, User } from "lucide-react";
import VerificationWorkspace from "@/components/shared/VerificationWorkspace";

export default function ClientVerification() {
  return (
    <VerificationWorkspace
      badgeLabel="Client Identity Verification"
      title="Verify your client identity"
      description="Submit your identity packet to help keep bookings, payments, and support conversations trusted across the platform."
      successTitle="Client identity verified"
      successDescription="Your client account is now verified. This status can help speed up trust-sensitive workflows like bookings, disputes, and payment reviews."
      secureMessage="Uploaded verification files are stored securely on the platform for admin review and can be replaced if you need to resubmit."
      requiredDocuments={[
        {
          kind: "idProof",
          label: "Government ID",
          description: "Aadhar, passport, PAN, or similar identity document.",
          icon: User,
        },
        {
          kind: "addressProof",
          label: "Address Proof",
          description: "Utility bill, rental agreement, or other address evidence.",
          icon: MapPin,
        },
        {
          kind: "selfie",
          label: "Live Selfie",
          description: "A clear front-facing image for identity matching.",
          icon: FileText,
        },
      ]}
    />
  );
}
