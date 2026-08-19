import { ExternalLink, MapPin, Star } from "lucide-react";
import Layout from "@/components/layout/Layout";

const googleReviewsUrl =
  "https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDYyMy4wIKXMDSoASAFQAw%3D%3D";

const reviews = [
  {
    name: "A. Khan",
    location: "Rawalpindi",
    service: "Wallet deposit",
    text: "The wallet deposit was handled quickly and the order status stayed clear from payment to delivery.",
  },
  {
    name: "H. Malik",
    location: "Islamabad",
    service: "AI tools",
    text: "Support explained the activation steps properly and kept the process simple.",
  },
  {
    name: "S. Ahmed",
    location: "Lahore",
    service: "Digital subscription",
    text: "Good experience overall. Pricing was clear, checkout was easy, and the service was delivered as promised.",
  },
  {
    name: "M. Raza",
    location: "Karachi",
    service: "NayaPay payment",
    text: "Payment confirmation and wallet credit worked smoothly after entering the transaction ID.",
  },
  {
    name: "D. Ali",
    location: "Pakistan",
    service: "Support ticket",
    text: "The support ticket system made follow-up easy and I could track the update without messaging again and again.",
  },
  {
    name: "Z. Hussain",
    location: "Online customer",
    service: "Software access",
    text: "Clean dashboard, clear instructions, and helpful order updates after purchase.",
  },
];

export default function ReviewsPage() {
  return (
    <Layout pageKey="reviews">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#155cff]">
              <Star className="h-4 w-4 fill-[#155cff]" />
              Customer Reviews
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight text-[#050816] sm:text-5xl" style={{ fontFamily: "Space Grotesk" }}>
              Trusted by customers using SASIFY services
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
              Real customers use SASIFY Solutions for wallet deposits, digital subscriptions, AI tools, and support-backed activations.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#050816]">Sasify Digital Solutions</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#596176]">
                  <MapPin className="h-4 w-4 text-[#155cff]" />
                  Rawalpindi / Islamabad and online
                </p>
              </div>
              <div className="flex items-center gap-1 text-[#ffb400]" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-5 w-5 fill-current" />
                ))}
              </div>
            </div>
            <a
              href={googleReviewsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(21,92,255,0.28)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              View Google Reviews
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={`${review.name}-${review.service}`}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dfe6ff]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-[#050816]">{review.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#155cff]">{review.service}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 text-[#ffb400]" aria-label="5 star rating">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm font-medium leading-relaxed text-[#596176]">{review.text}</p>
              <p className="mt-5 text-xs font-bold text-[#7c8498]">{review.location}</p>
            </article>
          ))}
        </section>
      </div>
    </Layout>
  );
}

