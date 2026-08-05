import { Link } from "react-router";
import { PageShell } from "@/components/site/PageShell";

export default function Legal() {
  return (
    <PageShell
      title="Legal"
      description="Privacy policy, terms of service, and how AIVideo handles your data."
      canonical="https://aivideo.ai/legal"
      lede="What we do with your data, and the rules for using the platform."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/privacy" className="card card-pad card-lift block">
          <h2 className="text-[17px] font-semibold text-ink">Privacy policy</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
            What we collect, where your screenshots and rendered videos are stored, and which
            third parties see them.
          </p>
        </Link>

        <Link to="/terms" className="card card-pad card-lift block">
          <h2 className="text-[17px] font-semibold text-ink">Terms of service</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
            The rules for using the platform, who owns what you make, and the limits of what we
            promise.
          </p>
        </Link>
      </div>

      <div className="copy mt-12">
        <h2>Security</h2>
        <p>
          Uploaded media is stored in R2/B2 object storage. Script generation and copyright
          scanning send screenshot and text data to third-party model providers, which is
          necessary to produce the video you asked for. Those providers are not permitted to
          train base models on your private project data.
        </p>
        <p>
          For a data processing agreement or a compliance questionnaire, write to{" "}
          <a href="mailto:legal@aivideo.ai">legal@aivideo.ai</a>.
        </p>
      </div>
    </PageShell>
  );
}
