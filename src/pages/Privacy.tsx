import { PageShell } from "@/components/site/PageShell";

export default function Privacy() {
  return (
    <PageShell
      title="Privacy policy"
      description="How AIVideo collects, uses, stores and shares your data."
      canonical="https://aivideo.ai/privacy"
      lede="Effective 11 June 2026."
    >
      <div className="copy">
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information.</strong> Your name, email address and the authentication
            data Google returns when you sign in.
          </li>
          <li>
            <strong>Content.</strong> Screenshots you upload, the descriptions and scripts you
            write, the audio we generate, and the finished MP4 files.
          </li>
          <li>
            <strong>Usage data.</strong> How you move through the application, plus browser and
            device information.
          </li>
        </ul>

        <h2>What we do with it</h2>
        <p>
          We use it to run the service: to render the videos you ask for, which means sending
          screenshot and script data to text and vision models and to the render workers, and to
          reply when you contact support.
        </p>

        <h2>Where it is stored</h2>
        <p>
          Screenshots and rendered videos are held in R2/B2 object storage. We apply
          industry-standard protections, though no transmission over the internet and no storage
          system is completely secure, and we will not claim otherwise.
        </p>

        <h2>Who else sees it</h2>
        <p>
          We do not sell personal data. We pass the minimum necessary to third-party providers
          that do specific jobs: script generation, copyright scanning, and speech synthesis
          through services such as ElevenLabs and edge-tts. Those providers are not permitted to
          train their base models on your private project data.
        </p>

        <h2>Deleting your data</h2>
        <p>
          Deleting a project removes its screenshots and rendered output from storage. To close
          your account and remove everything attached to it, write to{" "}
          <a href="mailto:hello@aivideo.ai">hello@aivideo.ai</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy go to <a href="mailto:hello@aivideo.ai">hello@aivideo.ai</a>.
        </p>
      </div>
    </PageShell>
  );
}
