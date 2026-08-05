import { PageShell } from "@/components/site/PageShell";

export default function Contact() {
  return (
    <PageShell
      title="Contact"
      description="Reach the AIVideo team about support, billing, or enterprise plans."
      canonical="https://aivideo.ai/contact"
      lede="Questions about a render, a plan, or something the product should do and does not."
    >
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-12">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Other ways to reach us</h2>
          <dl className="mt-5 space-y-5 text-[15px]">
            <div>
              <dt className="font-medium text-ink">Email</dt>
              <dd className="mt-1 text-ink-body">hello@aivideo.ai</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Twitter</dt>
              <dd className="mt-1 text-ink-body">@aivideo_ai</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Billing and legal</dt>
              <dd className="mt-1 text-ink-body">legal@aivideo.ai</dd>
            </div>
          </dl>
          <p className="mt-8 text-[14.5px] leading-relaxed text-ink-muted">
            For a bug or a feature idea, the{" "}
            <a href="/feedback" className="text-brand hover:underline">
              feedback form
            </a>{" "}
            gets there faster.
          </p>
        </div>

        <form
          className="card card-pad"
          onSubmit={(e) => {
            // Not wired to a backend yet. Prevented so the page does not
            // navigate away and lose what someone typed.
            e.preventDefault();
          }}
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[14px] font-medium text-ink">
                Your name
              </label>
              <input id="name" name="name" className="field" placeholder="Jane Cooper" />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[14px] font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="field"
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-1.5 block text-[14px] font-medium text-ink">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="field"
                placeholder="What can we help with?"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Send message
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
