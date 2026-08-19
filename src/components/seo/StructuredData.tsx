import { useEffect } from "react";
import { SITE_URL } from "./Seo";

const faqItems = [
  {
    question: "What is SASIFY Solutions?",
    answer:
      "SASIFY Solutions is an independent digital services marketplace where customers can buy AI tools, SaaS subscriptions, coding tools, productivity tools, design tools, and support-backed digital services.",
  },
  {
    question: "What services does SASIFY Solutions provide?",
    answer:
      "SASIFY Solutions provides digital tool subscriptions, AI account activation support, guest direct checkout, optional wallet checkout, order delivery, and private support tickets.",
  },
  {
    question: "How can users buy AI tools?",
    answer:
      "Users choose a tool or plan, then either submit a guest direct payment order or use a SASIFY wallet account for discounted checkout and dashboard support.",
  },
  {
    question: "Are accounts private on user email?",
    answer:
      "Where a product supports private activation, SASIFY can assist customers using their own email or account. Product pages explain the exact delivery method for each plan.",
  },
  {
    question: "Is account sharing allowed?",
    answer:
      "Sharing is not encouraged unless a plan explicitly supports multiple users. Customers should follow the rules shown on each product or service page.",
  },
  {
    question: "Who is SASIFY Solutions for?",
    answer:
      "SASIFY Solutions is for students, creators, freelancers, developers, agencies, and businesses that need affordable access to digital productivity and AI tools.",
  },
  {
    question: "How does support work?",
    answer:
      "Customers open support tickets from their dashboard. Each ticket stays attached to the customer account and order history for clear follow-up.",
  },
];

export default function StructuredData() {
  useEffect(() => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: "SASIFY Solutions",
          alternateName: "Sasify Digital Solutions",
          url: SITE_URL,
          logo: `${SITE_URL}/brand/sasify-logo.jpg`,
          sameAs: [
            "https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/",
          ],
          areaServed: ["Pakistan", "Worldwide"],
          description:
            "Independent digital services marketplace for AI tools, SaaS subscriptions, coding tools, productivity tools, design tools, and support-backed digital services.",
        },
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "SASIFY Solutions",
          publisher: { "@id": `${SITE_URL}/#organization` },
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/tools?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Service",
          "@id": `${SITE_URL}/#service`,
          name: "AI Tools and Digital Subscription Marketplace",
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: ["Pakistan", "Worldwide"],
          serviceType: "Digital tools marketplace",
          description:
            "Marketplace for buying AI tools, SaaS subscriptions, coding tools, productivity tools, design tools, and activation support with guest direct payment or optional wallet checkout.",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        },
        {
          "@type": "FAQPage",
          "@id": `${SITE_URL}/#faq`,
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    };

    let script = document.getElementById("sasify-structured-data") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "sasify-structured-data";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(graph);
  }, []);

  return null;
}
