import { motion } from "framer-motion";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { getAllPosts } from "@/data/blog";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Blog() {
  const posts = getAllPosts();
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Blog", url: "https://aivideo.ai/blog" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="Blog"
        description="Insights on AI video generation, technical communication, and the art of the cinematic tutorial."
        canonical="https://aivideo.ai/blog"
        jsonLd={breadcrumbJsonLd}
      />
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-6xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <h1 className="font-extrabold text-5xl lg:text-6xl tracking-tight mb-4 text-[var(--space-text)]">
              The AIVideo <span className="text-teal-600">Blog</span>
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] max-w-2xl leading-relaxed">
              Insights on AI video generation, technical communication, and the art of the cinematic tutorial.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="glass-panel p-6 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-[var(--space-border)] bg-[var(--space-card)]/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="font-bold text-2xl mb-3 text-[var(--space-text)] group-hover:text-teal-600 transition-colors line-clamp-2 leading-tight">
                    {post.title}
                  </h2>
                  <p className="text-sm text-[var(--space-text-muted)] leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-4 text-xs text-[var(--space-text-subtle)] font-mono mb-4 border-t border-[var(--space-border)] pt-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                  <div className="text-sm font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400 group-hover:gap-3 transition-all">
                    Read More <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="container mx-auto px-4 mt-12"><AdSensePlaceholder size="leaderboard" /></div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
