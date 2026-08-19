import Layout from "@/components/layout/Layout";

const content: Record<string, { sections: { title: string; paragraphs: string[] }[] }> = {
  "Terms & Conditions": {
    sections: [
      {
        title: "1. Independent Marketplace",
        paragraphs: [
          "SASIFY Solutions is an independent digital services marketplace. We are not affiliated with, endorsed by, or officially connected to any third-party brand unless explicitly stated.",
          "Brand names, logos, and trademarks displayed on our platform are used solely to identify the services requested by our customers.",
        ],
      },
      {
        title: "2. Digital Product Delivery",
        paragraphs: [
          "All products sold through SASIFY Solutions are digital services, subscriptions, or access credentials.",
          "Delivery is made electronically through your account dashboard or via email after successful payment verification.",
          "Delivery times vary by product and are specified on each product page.",
        ],
      },
      {
        title: "3. Payments and Wallet System",
        paragraphs: [
          "Customers may purchase through guest direct checkout or through their SASIFY wallet.",
          "Guest direct checkout requires payment to the listed receiving account and submission of a valid transaction reference and payment screenshot.",
          "A 5% discount is automatically applied to all wallet purchases.",
          "Wallet deposits are verified before being credited to your account.",
        ],
      },
      {
        title: "4. Refund Policy",
        paragraphs: [
          "Due to the digital nature of our products, refunds are only provided in cases of failed delivery or technical issues.",
          "Refund requests must be submitted within 7 days of purchase through our support ticket system.",
          "Each refund request is reviewed individually by our admin team.",
        ],
      },
      {
        title: "5. User Responsibilities",
        paragraphs: [
          "Users are responsible for maintaining the security of their account credentials.",
          "Users must not share, resell, or distribute purchased digital products without authorization.",
          "Users must comply with the terms of service of the third-party tools they purchase.",
        ],
      },
    ],
  },
  "Privacy Policy": {
    sections: [
      {
        title: "1. Information We Collect",
        paragraphs: [
          "We collect account information (name, email) when you register.",
          "We collect order, guest checkout contact details, and payment information for transaction processing.",
          "We collect wallet transaction data for accounting purposes.",
        ],
      },
      {
        title: "2. How We Use Your Data",
        paragraphs: [
          "Your data is used to process orders, verify direct payments, manage your wallet, and provide customer support.",
          "We do not sell or share your personal information with third parties.",
          "Payment screenshots are stored securely and only accessed by admin for verification.",
        ],
      },
      {
        title: "3. Security",
        paragraphs: [
          "We implement industry-standard security measures to protect your data.",
          "Sensitive information is encrypted at rest and in transit.",
          "Access to user data is restricted to authorized personnel only.",
        ],
      },
      {
        title: "4. Cookies",
        paragraphs: [
          "We use cookies to maintain your session and improve user experience.",
          "You can disable cookies in your browser, but this may affect functionality.",
        ],
      },
      {
        title: "5. Data Retention",
        paragraphs: [
          "We retain your data as long as your account is active.",
          "You can request account deletion by contacting our support team.",
        ],
      },
    ],
  },
  "Refund Policy": {
    sections: [
      {
        title: "1. Digital Product Nature",
        paragraphs: [
          "All products sold on SASIFY Solutions are digital in nature (subscriptions, accounts, credentials, access keys).",
          "Due to the intangible nature of digital products, standard refund policies differ from physical goods.",
        ],
      },
      {
        title: "2. Eligible Refund Cases",
        paragraphs: [
          "Failed delivery: If the product was not delivered within the stated timeframe due to our error.",
          "Non-working product: If the delivered credentials or access does not work and we cannot provide a replacement.",
          "Duplicate payment: If you were accidentally charged multiple times for the same order.",
        ],
      },
      {
        title: "3. Non-Refundable Cases",
        paragraphs: [
          "Change of mind after successful delivery.",
          "Violation of third-party terms of service by the buyer.",
          "Issues caused by the buyer's device, network, or configuration.",
        ],
      },
      {
        title: "4. Refund Process",
        paragraphs: [
          "Submit a refund request through the support ticket system within 7 days of purchase.",
          "Our team will review your request within 24-48 hours.",
          "Approved refunds are credited back to your SASIFY wallet or handled through the original/direct payment method when appropriate.",
        ],
      },
    ],
  },
  "Disclaimer": {
    sections: [
      {
        title: "Independent Marketplace Disclaimer",
        paragraphs: [
          "SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers.",
          "SASIFY Solutions is not affiliated with, endorsed by, or officially connected to any third-party brand unless explicitly stated on the respective product page.",
          "We do not claim official partnership, authorized reseller status, endorsement, or affiliation with any third-party brand unless manually added by admin with proof.",
        ],
      },
      {
        title: "Service Availability",
        paragraphs: [
          "We strive to maintain accurate product information, but availability and pricing are subject to change without notice.",
          "Third-party service features and terms are controlled by the respective service providers.",
        ],
      },
      {
        title: "Limitation of Liability",
        paragraphs: [
          "SASIFY Solutions acts as an intermediary marketplace and is not responsible for the quality, performance, or reliability of third-party services.",
          "Users are responsible for complying with the terms of service of purchased digital products.",
        ],
      },
    ],
  },
};

interface LegalPageProps {
  title: string;
}

export default function LegalPage({ title }: LegalPageProps) {
  const pageContent = content[title] || content["Disclaimer"];

  return (
    <Layout pageKey="legal">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
          {title}
        </h1>

        {/* Disclaimer highlight box */}
        <div className="mt-6 rounded-2xl bg-[linear-gradient(135deg,#eef5ff,#f4efff)] p-5 shadow-[0_12px_34px_rgba(21,92,255,0.1)] ring-1 ring-[#dfe6ff]">
          <p className="text-sm font-medium leading-relaxed text-[#33405c]">
            SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers. SASIFY Solutions is not affiliated with, endorsed by, or officially connected to any third-party brand unless explicitly stated.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {pageContent.sections.map((section, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-6 shadow-[0_14px_38px_rgba(12,37,104,0.08)] ring-1 ring-[#dfe6ff]"
            >
              <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
                {section.title}
              </h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-sm leading-relaxed text-[#52607a]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

