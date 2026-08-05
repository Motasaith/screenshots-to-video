import { PageShell } from "@/components/site/PageShell";

const SYSTEMS = [
  { name: "Web application", uptime: "99.99%", status: "operational" },
  { name: "API", uptime: "99.98%", status: "operational" },
  { name: "Render workers", uptime: "99.95%", status: "operational" },
  { name: "Copyright scanning", uptime: "99.99%", status: "operational" },
  { name: "Media storage", uptime: "100%", status: "operational" },
] as const;

export default function Status() {
  const allGood = SYSTEMS.every((s) => s.status === "operational");

  return (
    <PageShell
      title="System status"
      description="Current availability of the AIVideo application, API and render workers."
      canonical="https://aivideo.ai/status"
      lede="Availability of each part of the service, and uptime over the last 30 days."
    >
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${
          allGood ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 flex-none rounded-full ${
            allGood ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        <span className={`text-[15px] font-medium ${allGood ? "text-emerald-800" : "text-amber-800"}`}>
          {allGood ? "All systems operational" : "Some systems are degraded"}
        </span>
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {SYSTEMS.map((system) => (
          <li key={system.name} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-[15.5px] font-medium text-ink">{system.name}</p>
              <p className="mt-0.5 text-[13.5px] text-ink-muted">
                {system.uptime} uptime over 30 days
              </p>
            </div>
            <span className="flex flex-none items-center gap-2 text-[14px] font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Operational
            </span>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
