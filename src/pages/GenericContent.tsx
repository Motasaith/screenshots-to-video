import { Link } from "react-router";
import { PageShell } from "@/components/site/PageShell";

/**
 * Stand-in for routes that are linked from the footer but not written yet.
 * It says so plainly rather than pretending to be a finished page.
 */
export default function GenericContent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageShell title={title} description={description} lede={description}>
      <div className="card card-pad">
        <h2 className="text-[17px] font-semibold text-ink">Not written yet</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-body">
          This page is on the list. Until it lands, the{" "}
          <Link to="/docs" className="text-brand hover:underline">
            documentation
          </Link>{" "}
          covers most of the same ground, and the{" "}
          <Link to="/help" className="text-brand hover:underline">
            help centre
          </Link>{" "}
          covers the rest.
        </p>
        <Link to="/docs" className="btn btn-secondary mt-6">
          Read the docs
        </Link>
      </div>
    </PageShell>
  );
}
