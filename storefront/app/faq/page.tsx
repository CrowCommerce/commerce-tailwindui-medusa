import type { Metadata } from "next";
import { FaqSection } from "components/faq/faq-section";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about shipping, returns, products, and payments.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  return <FaqSection />;
}
