import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";

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
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-4">
            The AIVideo <span className="text-primary">Blog</span>
          </h1>
          <p className="font-dm text-xl text-muted-foreground max-w-2xl">
            Insights on AI video generation, technical communication, and the art of the cinematic tutorial.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <div 
              key={post.id} 
              className="neo-card p-6 bg-card hover:border-primary transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary rounded-sm">
                  {post.category}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h2 className="font-syne font-bold text-2xl mb-3 group-hover:text-primary transition-colors">
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
