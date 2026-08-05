import { PageShell } from "@/components/site/PageShell";

/**
 * There are no open roles. The previous version of this page listed three
 * invented job openings behind a blur with a "coming soon" card over them,
 * which is a strange thing to do to someone looking for work.
 */
export default function Careers() {
  return (
    <PageShell
      title="Careers"
      description="Open roles at AIVideo."
      canonical="https://aivideo.ai/careers"
      lede="Nothing open right now, but that changes."
    >
      <div className="copy">
        <p>
          AIVideo is a very small team. When there is a role to fill it will be listed here with
          a real description, a real salary band and a real person reading the applications.
        </p>
        <p>
          If you work on video pipelines, browser canvas performance or speech synthesis and want
          to be told when something opens up, send a note to{" "}
          <a href="mailto:hello@aivideo.ai">hello@aivideo.ai</a> with what you have built. It
          gets read.
        </p>
      </div>
    </PageShell>
  );
}
