import { Link } from "react-router";
import { Github, Twitter, Linkedin } from "lucide-react";
import { Logo } from "@/components/site/Logo";

const columns = {
  Product: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Changelog", href: "/changelog" },
    { name: "Blog", href: "/blog" },
  ],
  Resources: [
    { name: "Documentation", href: "/docs" },
    { name: "API reference", href: "/api" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "Help center", href: "/help" },
  ],
  Company: [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Careers", href: "/careers" },
    { name: "Community", href: "/community" },
  ],
  Legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Status", href: "/status" },
    { name: "Feedback", href: "/feedback" },
  ],
};

const social = [
  { href: "https://twitter.com", label: "Twitter", Icon: Twitter },
  { href: "https://github.com", label: "GitHub", Icon: Github },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: Linkedin },
];

export default function FooterSection() {
  return (
    <footer className="mat border-t border-line">
      <div className="container-site py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-6 md:gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="text-[16px] font-semibold tracking-[-0.02em] text-ink">AIVideo</span>
            </Link>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-body">
              Turn a folder of screenshots into a narrated tutorial video. No screen recorder,
              no editing timeline, no retakes.
            </p>
            <div className="mt-6 flex gap-2">
              {social.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(columns).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[14px] text-ink-body transition-colors hover:text-ink"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-muted">
            © {new Date().getFullYear()} AIVideo. All rights reserved.
          </p>
          <div className="flex gap-5 text-[13px] text-ink-muted">
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link to="/status" className="hover:text-ink">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
