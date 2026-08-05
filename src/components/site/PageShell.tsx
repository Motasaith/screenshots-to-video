import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/components/site/Reveal";

/**
 * Header, footer and page heading for everything that is not the homepage or
 * the app itself.
 *
 * Every content page was repeating this: its own Navbar, its own background
 * layer, its own hand-rolled heading block at a slightly different size. One
 * shell means one place to change the shape of a page.
 */
export function PageShell({
  title,
  description,
  heading,
  lede,
  canonical,
  wide = false,
  children,
}: {
  /** Browser tab and search result title. */
  title: string;
  description: string;
  /** On-page H1. Defaults to `title`. */
  heading?: string;
  lede?: string;
  canonical?: string;
  /** Full container instead of the reading-width column. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SEO title={title} description={description} canonical={canonical} />
      <Navbar />

      <main className="flex-1">
        <div className="border-b border-line bg-mat">
          <div className={wide ? "container-site" : "container-narrow"}>
            <div className="py-14 md:py-20">
              <h1 className="h2">{heading ?? title}</h1>
              {lede && <p className="lede mt-4 max-w-[46rem]">{lede}</p>}
            </div>
          </div>
        </div>

        <div className={wide ? "container-site" : "container-narrow"}>
          <Reveal className="py-14 md:py-20">{children}</Reveal>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
