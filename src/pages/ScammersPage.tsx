import { useState } from "react";
import { Link } from "react-router";
import { Search, ShieldAlert, Upload } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { trpc } from "@/providers/trpc";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ScammersPage() {
  const [search, setSearch] = useState("");
  const { data: reports, isLoading } = trpc.scammers.publicList.useQuery({
    search: search.trim() || undefined,
    limit: 100,
    offset: 0,
  });

  return (
    <Layout pageKey="scammers">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#050816,#061652_48%,#155cff)] p-6 text-white shadow-[0_18px_60px_rgba(12,37,104,0.22)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 ring-1 ring-white/15">
                <ShieldAlert className="h-4 w-4" />
                Community safety
              </span>
              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl" style={{ fontFamily: "Space Grotesk" }}>
                Scammer Numbers & Proof
              </h1>
              <p
                className="mt-4 max-w-2xl text-sm font-semibold leading-6 sm:text-base"
                style={{ color: "#d9e7ff" }}
              >
                Browse admin-approved scammer reports submitted by Sasify users. Every public report must include proof screenshots and pass review first.
              </p>
            </div>
            <Link
              to="/dashboard/scammer-reports"
              className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#155cff] shadow-[0_14px_34px_rgba(0,0,0,0.18)]"
            >
              <Upload className="h-4 w-4" />
              Submit Report
            </Link>
          </div>
        </section>

        <div className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-[#dfe6ff] bg-white px-4 py-3 shadow-sm focus-within:border-[#155cff] focus-within:shadow-[0_0_0_3px_rgba(21,92,255,0.12)]">
          <Search className="h-5 w-5 text-[#155cff]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, name, or platform..."
            className="h-11 flex-1 bg-transparent text-sm font-semibold text-[#050816] placeholder-[#8992aa] outline-none"
          />
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {isLoading && [...Array(4)].map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-[#dfe6ff]" />
          ))}

          {!isLoading && reports?.map((report: any) => (
            <article key={report.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d11f4a]">Reported Number</p>
                    <h2 className="safe-wrap mt-1 text-2xl font-black text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>
                      {report.phoneNumber}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full bg-[#eafff0] px-3 py-1 text-xs font-black text-[#0b8f34]">
                    Approved
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#e7ecff]">
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-[#7c8498]">Name</p>
                    <p className="safe-wrap mt-1 text-sm font-semibold text-[#050816]">{report.scammerName || "Unknown"}</p>
                  </div>
                  <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#e7ecff]">
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-[#7c8498]">Platform</p>
                    <p className="safe-wrap mt-1 text-sm font-semibold text-[#050816]">{report.platform || "Not provided"}</p>
                  </div>
                  <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#e7ecff]">
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-[#7c8498]">Amount</p>
                    <p className="safe-wrap mt-1 text-sm font-semibold text-[#050816]">{report.amountLost || "Not provided"}</p>
                  </div>
                </div>

                <p className="safe-wrap mt-4 text-sm leading-6 text-[#596176]">{report.description}</p>
                <p className="mt-4 text-xs font-semibold text-[#7c8498]">
                  Submitted by {report.reporterName || "Sasify user"} · Approved {formatDate(report.approvedAt || report.createdAt)}
                </p>
              </div>

              {report.proofScreenshots?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 border-t border-[#e7ecff] bg-[#f7f9ff] p-3 sm:grid-cols-3">
                  {report.proofScreenshots.slice(0, 5).map((proof: string, index: number) => (
                    <a key={`${report.id}-${index}`} href={proof} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-white ring-1 ring-[#dfe6ff]">
                      <img src={proof} alt={`Proof screenshot ${index + 1}`} loading="lazy" decoding="async" className="h-32 w-full object-cover transition-transform hover:scale-105" />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        {!isLoading && (!reports || reports.length === 0) && (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#dfe6ff]">
            <p className="text-sm font-semibold text-[#596176]">No approved scammer reports found.</p>
            <Link to="/dashboard/scammer-reports" className="tap-target mt-4 inline-flex items-center justify-center rounded-full bg-[#155cff] px-5 py-3 text-sm font-black text-white">
              Submit first report
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}

