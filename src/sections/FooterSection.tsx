import { Link } from "react-router";
import { Film, Github, Twitter, Linkedin } from "lucide-react";
import { motion } from "framer-motion";

const footerLinks = {
  Product: [
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Changelog", href: "/changelog" },
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
    <footer className="border-t border-[var(--space-border)] backdrop-blur-md py-12 relative overflow-hidden" style={{ backgroundColor: 'var(--space-card)' }}>
      {/* Decorative subtle top neon line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />
      
      <div className="w-full px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8">
          
          {/* Logo & Pitch */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 group">
              <Film className="w-5 h-5 text-teal-600 group-hover:text-teal-500 transition-colors" />
              <span className="font-sans font-bold text-lg tracking-tight text-[var(--space-text)]">
                AIVideo
              </span>
            </Link>
            <p className="font-sans text-xs text-[var(--space-text-muted)] mt-4 max-w-xs leading-relaxed">
              Convert screenshots into studio-grade tutorial videos with automated camera zooms and scripting. Built for technical content creators.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-3 mt-6">
              <a
                href="#"
                className="w-9 h-9 border border-[var(--space-border)] rounded-xl bg-[var(--space-card)] flex items-center justify-center hover:border-teal-500/50 hover:bg-[var(--space-card-hover)] text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 border border-[var(--space-border)] rounded-xl bg-[var(--space-card)] flex items-center justify-center hover:border-teal-500/50 hover:bg-[var(--space-card-hover)] text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors"
                aria-label="Github"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 border border-[var(--space-border)] rounded-xl bg-[var(--space-card)] flex items-center justify-center hover:border-teal-500/50 hover:bg-[var(--space-card-hover)] text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors"
                aria-label="Linkedin"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-sans font-semibold text-xs mb-4 text-[var(--space-text)] uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="font-sans text-xs text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal Footer Bottom */}
        <div className="border-t border-[var(--space-border)] mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
          <p className="font-sans text-[10px] text-[var(--space-text-subtle)]">
            © 2026 Abdul Rauf Azhar. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/privacy"
              className="font-sans text-[10px] text-[var(--space-text-subtle)] hover:text-[var(--space-text-muted)] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="font-sans text-[10px] text-[var(--space-text-subtle)] hover:text-[var(--space-text-muted)] transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      {/* Giant STV Brand Graphic Background Watermark */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none select-none z-0 overflow-hidden leading-none translate-y-[15%] h-[16vw] [perspective:1000px]">
        <span className="font-mono text-[7px] tracking-[0.5em] uppercase text-[var(--space-text-subtle)] opacity-25 block mb-1">
          SCREENSHOT TO VIDEO
        </span>
        <motion.h3 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.12
              }
            }
          }}
          className="font-sans font-black text-[16vw] leading-none tracking-[-0.02em] uppercase select-none inline-flex items-center justify-center [transform-style:preserve-3d]"
        >
          <motion.span 
            variants={{
              hidden: { opacity: 0, x: -100, rotateY: -45, filter: "blur(10px)" },
              visible: { 
                opacity: 1, 
                x: 0, 
                rotateY: 0, 
                filter: "blur(0px)",
                transition: { type: "spring", stiffness: 60, damping: 15 }
              }
            }}
            className="watermark-text-outer"
          >
            S
          </motion.span>
          <motion.span 
            variants={{
              hidden: { opacity: 0, y: 80, z: -80, rotateX: 60, filter: "blur(12px)" },
              visible: { 
                opacity: 1, 
                y: 0, 
                z: 0, 
                rotateX: 0, 
                filter: "blur(0px)",
                transition: { type: "spring", stiffness: 70, damping: 12 }
              }
            }}
            className="watermark-text-inner mx-[0.01em]"
          >
            T
          </motion.span>
          <motion.span 
            variants={{
              hidden: { opacity: 0, x: 100, rotateY: 45, filter: "blur(10px)" },
              visible: { 
                opacity: 1, 
                x: 0, 
                rotateY: 0, 
                filter: "blur(0px)",
                transition: { type: "spring", stiffness: 60, damping: 15 }
              }
            }}
            className="watermark-text-outer"
          >
            V
          </motion.span>
        </motion.h3>
      </div>
    </footer>
  );
}
