import { CheckCircle2, HelpCircle, ShieldCheck, Users } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

const answers = [
  {
    icon: HelpCircle,
    question: "What is SASIFY Solutions?",
    answer:
      "SASIFY Solutions is an independent digital services marketplace for AI tools, SaaS subscriptions, productivity tools, coding tools, design tools, and support-backed activations.",
  },
  {
    icon: CheckCircle2,
    question: "How do users buy AI tools?",
    answer:
      "Customers choose a plan and either pay directly as guests or use a SASIFY wallet account for discounted checkout and dashboard tracking.",
  },
  {
    icon: ShieldCheck,
    question: "Are accounts private?",
    answer:
      "Where supported by a product, activation can be assisted on the customer email or account. Each product page explains the exact delivery method.",
  },
  {
    icon: Users,
    question: "Who is it for?",
    answer:
      "Students, creators, freelancers, developers, agencies, and businesses use SASIFY to access affordable digital tools with clear support.",
  },
];

export default function AnswerEngineSection({ content }: { content?: BuilderSection["content"] }) {
  const displayAnswers = content?.items.length ? content.items.map((row, index) => ({ ...answers[index % answers.length], question: row.title, answer: row.text })) : answers;
  return (
    <section className="relative py-14 sm:py-20 lg:py-24" aria-labelledby="sasify-overview">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <span className="inline-flex rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#155cff]">
              {content?.eyebrow || "SASIFY Overview"}
            </span>
            <h2 id="sasify-overview" className="text-balance mt-5 text-3xl font-black leading-tight text-[#050816] sm:text-4xl" style={{ fontFamily: "Space Grotesk" }}>
              {content?.title || "Clear answers for customers and search engines"}
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
              {content?.body || "The website explains exactly what SASIFY offers, how checkout works, and how customers receive help after purchase."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {displayAnswers.map((item) => (
              <article key={item.question} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#dfe6ff]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#075dff,#6d35ff)]">
                  <item.icon className="h-5 w-5 text-white" aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-black text-[#050816]">{item.question}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#596176]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
