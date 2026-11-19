import type { Metadata } from "next";
import { PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
