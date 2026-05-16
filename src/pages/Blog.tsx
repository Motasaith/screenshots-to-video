import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";

const POSTS = [
  {
    id: 1,
    title: "The Future of Technical Documentation",
    excerpt: "Why static screenshots are no longer enough for modern software guides.",
    date: "May 1, 2026",
    category: "Product",
  },
  {
    id: 2,
    title: "Mastering Cinematic Zooms",
    excerpt: "How to guide your user's eye to the most important part of your UI.",
    date: "April 22, 2026",
    category: "Tutorial",
  },
  {
    id: 3,
    title: "AI-Driven Narration: The Edge-TTS Story",
    excerpt: "Exploring the technology behind our ultra-realistic AI voices.",
    date: "April 10, 2026",
    category: "Engineering",
  },
];

export default function Blog() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Blog", url: "https://aivideo.ai/blog" },
  ]);

  return (
    <div className="min-h-screen dot-grid">
      <SEO
        title="Blog"
        description="Insights on AI video generation, technical communication, and the art of the cinematic tutorial."
        canonical="https://aivideo.ai/blog"
        jsonLd={breadcrumbJsonLd}
      />
      <Navbar />
      <main className="max-w-6xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="font-body font-bold text-6xl tracking-tight mb-4 text-[var(--sketch-fg)]">
            The AIVideo <span className="text-[var(--sketch-accent)]">Blog</span>
          </h1>
          <p className="font-body text-xl text-[var(--sketch-fg-muted)] max-w-2xl">
            Insights on AI video generation, technical communication, and the art of the cinematic tutorial.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <div 
              key={post.id} 
              className="sketch-card-hover p-6 cursor-pointer group bg-[var(--sketch-card-bg)]"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-[var(--sketch-accent)]/20 text-[var(--sketch-fg)] sketch-border-sm">
                  {post.category}
                </span>
                <span className="text-xs text-[var(--sketch-fg-muted)]">{post.date}</span>
              </div>
              <h2 className="font-body font-bold text-2xl mb-3 text-[var(--sketch-fg)] group-hover:text-[var(--sketch-accent)] transition-colors">
                {post.title}
              </h2>
              <p className="font-dm text-muted-foreground leading-relaxed mb-6">
                {post.excerpt}
              </p>
              <div className="font-syne font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                Read More <span className="text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
