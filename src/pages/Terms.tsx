import { PageShell } from "@/components/site/PageShell";

export default function Terms() {
  return (
    <PageShell
      title="Terms of service"
      description="The rules and guidelines for using the AIVideo platform."
      canonical="https://aivideo.ai/terms"
      lede="Effective 11 June 2026."
    >
      <div className="copy">
        <h2>1. Accepting these terms</h2>
        <p>
          Using AIVideo means you agree to these terms. If you do not agree with them, do not use
          the service.
        </p>

        <h2>2. What the service is</h2>
        <p>
          AIVideo takes screenshots and descriptions you provide and produces a narrated,
          animated video. It uses AI-generated scripts, vision models for copyright scanning, and
          text-to-speech for narration.
        </p>

        <h2>3. Your responsibilities</h2>
        <ul>
          <li>You must be at least 13 years old.</li>
          <li>You are responsible for keeping your account secure.</li>
          <li>
            You must own or have permission to use everything you upload. Our copyright scan
            catches obvious problems, but you remain responsible for what you publish.
          </li>
          <li>Generating harmful or illegal content is prohibited.</li>
        </ul>

        <h2>4. Who owns what</h2>
        <p>
          You keep ownership of the screenshots you upload and of the videos the platform renders
          for you. We make no ownership claim over your output. We keep the rights to the
          underlying technology, the interface and the codebase.
        </p>

        <h2>5. Limits on our liability</h2>
        <p>
          The service is provided as is and as available. We do not warrant that AI-generated
          narration is accurate or that render servers are uninterrupted. We are not liable for
          direct, indirect or consequential damages arising from using the service.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may revise these terms. Continuing to use the platform after a revision means you
          accept it.
        </p>
      </div>
    </PageShell>
  );
}
