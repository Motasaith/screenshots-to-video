import { Link } from "react-router";
import { Film, Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Changelog", href: "/blog" },
    { name: "Roadmap", href: "/blog" },
  ],
  Resources: [
    { name: "Documentation", href: "/docs" },
    { name: "API Reference", href: "/api" },
    { name: "Tutorials", href: "/tutorials" },
    { name: "Blog", href: "/blog" },
  ],
  Company: [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Careers", href: "/careers" },
    { name: "Legal", href: "/legal" },
  ],
  Support: [
    { name: "Help Center", href: "/help" },
    { name: "Community", href: "/community" },
    { name: "Status", href: "/status" },
    { name: "Feedback", href: "/feedback" },
  ],
};

export default function FooterSection() {
  return (
    <footer className="border-t-2 border-border bg-muted/20 py-16">
      <div className="w-full px-6 lg:px-12">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              <span className="font-syne font-bold text-xl tracking-tight">
                AIVideo
              </span>
            </Link>
            <p className="font-dm text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
              Turn screenshots into professional tutorial videos with cinematic
              zoom animations. Built for technical content creators.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="#"
                className="w-9 h-9 border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-syne font-semibold text-sm mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="font-dm text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-dm text-xs text-muted-foreground">
            2024 AIVideo. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-dm text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-dm text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
