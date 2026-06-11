import { motion } from "framer-motion";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { getAllPosts } from "@/data/blog";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";

export default function Blog() {
  const posts = getAllPosts();
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
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="sketch-card-hover p-6 cursor-pointer group bg-[var(--sketch-card-bg)] flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-[var(--sketch-accent)]/20 text-[var(--sketch-fg)] sketch-border-sm">
                  {post.category}
                </span>
              </div>
              <h2 className="font-body font-bold text-2xl mb-3 text-[var(--sketch-fg)] group-hover:text-[var(--sketch-accent)] transition-colors">
                {post.title}
              </h2>
              <p className="font-dm text-muted-foreground leading-relaxed mb-6 flex-grow">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-dm mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
              </div>
              <div className="font-syne font-bold text-sm flex items-center gap-2 group-hover:gap-3 transition-all text-[var(--sketch-accent)]">
                Read More <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
          
          <div className="container mx-auto px-4 mt-12"><AdSensePlaceholder size="leaderboard" /></div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
