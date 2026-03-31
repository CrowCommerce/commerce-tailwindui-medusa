import type { Metadata } from "next";
import { FaqSection } from "components/faq/faq-section";
import {
  buildFaqPageJsonLd,
  JsonLdScript,
  type FaqEntry,
} from "lib/structured-data";

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "How long does standard shipping take?",
    answer:
      "Standard shipping takes 3–5 business days within the continental US. Expedited (1–2 business day) and overnight options are available at checkout.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes — we ship to 42 countries. International orders typically arrive in 7–14 business days. Duties and import taxes are the customer's responsibility and may apply at delivery.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We offer free returns within 30 days of delivery — no questions asked. Items must be unused and in their original packaging. Start a return from your account dashboard or contact our support team.",
  },
  {
    question: "How long does a refund take to process?",
    answer:
      "Refunds are issued within 2 business days of us receiving your return. Depending on your bank, the funds will appear in your account within 3–10 business days after that.",
  },
  {
    question: "Are your product photos accurate?",
    answer:
      "We use only natural light and unedited images so what you see matches what you get. Colors may vary slightly across different screen calibrations.",
  },
  {
    question: "Do you restock sold-out items?",
    answer:
      "Most products are restocked on a regular cycle. Use the 'Notify me' button on any sold-out product page and we'll email you the moment it's back in stock.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover), Apple Pay, Google Pay, and Shop Pay. All transactions are processed securely via Stripe.",
  },
  {
    question: "Is my payment information stored?",
    answer:
      "We never store raw card numbers. When you save a card for future purchases, it is tokenized by Stripe and stored on their PCI-compliant servers — your details never touch ours.",
  },
];

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about shipping, returns, products, and payments.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  const faqJsonLd = buildFaqPageJsonLd(FAQ_ENTRIES);

  return (
    <>
      <JsonLdScript data={faqJsonLd} />
      <FaqSection />
    </>
  );
}
