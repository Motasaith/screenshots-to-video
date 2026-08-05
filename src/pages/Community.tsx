import { MessageSquare, Github } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";

const places = [
  {
    Icon: MessageSquare,
    title: "Discord",
    body: "Real-time chat, feature requests, and people showing off what they made. The fastest way to get an answer from someone who has hit the same thing.",
    cta: "Join the server",
    href: "https://discord.gg",
  },
  {
    Icon: Github,
    title: "GitHub Discussions",
    body: "Bug reports, API questions, and anything that benefits from being written down and searchable later.",
    cta: "Open discussions",
    href: "https://github.com/Motasaith",
  },
];

export default function Community() {
  return (
    <PageShell
      title="Community"
      description="Where AIVideo users ask questions and share what they have built."
      canonical="https://aivideo.ai/community"
      lede="Two places, depending on whether you want an answer now or an answer that stays findable."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {places.map(({ Icon, title, body, cta, href }) => (
          <div key={title} className="card card-pad flex flex-col">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-brand-tint">
              <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={1.8} />
            </span>
            <h2 className="mt-4 text-[17px] font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{body}</p>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary mt-6 self-start"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
