import { Building2, Camera, FileText } from "lucide-react";
import VerificationWorkspace from "@/components/shared/VerificationWorkspace";

export default function ProviderVerification() {
  return (
    <VerificationWorkspace
      badgeLabel="Professional Verification"
      title="Verify your provider credentials"
      description="Submit your professional verification packet so admin can review your identity and work legitimacy before activating trust-sensitive provider workflows."
      successTitle="Provider verification approved"
      successDescription="Your provider identity is verified. You still need admin approval status to be fully operational on the marketplace, but your verification badge is now active."
      secureMessage="This workspace stores your uploaded verification files on the platform so admin can review the exact documents you submitted."
      requiredDocuments={[
        {
          kind: "idProof",
          label: "Government ID",
          description: "Passport, Aadhar, PAN, or another government identity document.",
          icon: FileText,
        },
        {
          kind: "businessProof",
          label: "Professional Proof",
          description: "Certificate, GST record, trade license, or business proof.",
          icon: Building2,
        },
        {
          kind: "selfie",
          label: "Live Selfie",
          description: "A current selfie for manual identity matching.",
          icon: Camera,
        },
      ]}
    />
  );
}
