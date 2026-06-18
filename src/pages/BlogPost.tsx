import { useParams, Link } from "react-router";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema, createArticleSchema } from "@/components/SEO";
import { getPostBySlug, getRelatedPosts, type BlogPost } from "@/data/blog";
import { ArrowLeft, Clock, Calendar, Tag, User, Share2, Twitter, Linkedin, Link2 } from "lucide-react";
import { useState } from "react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const shareLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--space-text-muted)] font-mono">Share:</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-[var(--space-card)] border border-[var(--space-border)] hover:border-teal-500 hover:text-teal-500 transition-colors"
          aria-label={`Share on ${link.name}`}
        >
          <link.icon className="w-4 h-4 text-[var(--space-text-muted)]" />
        </a>
      ))}
      <button
        onClick={copyLink}
        className="p-2 rounded-lg bg-[var(--space-card)] border border-[var(--space-border)] hover:border-teal-500 hover:text-teal-500 transition-colors relative"
        aria-label="Copy link"
      >
        <Link2 className="w-4 h-4 text-[var(--space-text-muted)]" />
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded whitespace-nowrap">
            Copied!
          </span>
        )}
      </button>
    </div>
  );
}

function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-16 pt-16 border-t border-[var(--space-border)]">
      <h2 className="font-bold text-2xl mb-8 text-[var(--space-text)]">
        Related Articles
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="glass-panel p-6 group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-[var(--space-border)] bg-[var(--space-card)]/85"
          >
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded mb-3 inline-block">
              {post.category}
            </span>
            <h3 className="font-bold text-lg mb-2 text-[var(--space-text)] group-hover:text-teal-650 transition-colors line-clamp-2 leading-tight">
              {post.title}
            </h3>
            <p className="text-sm text-[var(--space-text-muted)] line-clamp-2 leading-relaxed">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans flex items-center justify-center">
        <SpaceBackground />
        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          <h1 className="font-extrabold text-4xl mb-4 text-[var(--space-text)]">Article Not Found</h1>
          <p className="text-[var(--space-text-muted)] mb-8">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Blog", url: "https://aivideo.ai/blog" },
    { name: post.title, url: `https://aivideo.ai/blog/${post.slug}` },
  ]);

  const articleJsonLd = createArticleSchema(
    post.title,
    post.excerpt,
    `https://aivideo.ai/blog/${post.slug}`,
    new Date(post.date).toISOString()
  );

  const postUrl = `https://aivideo.ai/blog/${post.slug}`;
  const relatedPosts = getRelatedPosts(post);

  // Convert markdown-like content to HTML
  const renderContent = (content: string) => {
    const lines = content.trim().split("\n");
    const elements: React.ReactElement[] = [];
    let listItems: string[] = [];
    let key = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key++}`} className="list-disc pl-6 space-y-2 mb-6 text-[var(--space-text-muted)]">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h1 key={key++} className="font-extrabold text-3xl lg:text-4xl tracking-tight mb-6 mt-12 text-[var(--space-text)]">
            {trimmed.replace("# ", "")}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={key++} className="font-bold text-2xl lg:text-3xl tracking-tight mb-4 mt-10 text-[var(--space-text)] border-b border-[var(--space-border)] pb-2">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={key++} className="font-bold text-xl lg:text-2xl tracking-tight mb-3 mt-8 text-[var(--space-text)]">
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("```")) {
        flushList();
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"));
      } else if (trimmed.startsWith("| ") && trimmed.endsWith(" |")) {
        flushList();
      } else if (trimmed === "") {
        flushList();
      } else if (trimmed.startsWith("[> ")) {
        flushList();
        elements.push(
          <blockquote key={key++} className="border-l-4 border-teal-500 bg-teal-500/5 pl-6 py-4 my-6 italic text-[var(--space-text-muted)] rounded-r-xl">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      } else if (trimmed.startsWith("---")) {
        flushList();
        elements.push(<hr key={key++} className="my-8 border-[var(--space-border)]" />);
      } else {
        flushList();
        const html = trimmed
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code className='bg-[var(--space-card)] border border-[var(--space-border)] px-1.5 py-0.5 rounded text-sm font-mono text-teal-600 dark:text-teal-400'>$1</code>");
        elements.push(
          <p key={key++} className="text-[var(--space-text-muted)] leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title={post.title}
        description={post.excerpt}
        canonical={postUrl}
        ogType="article"
        jsonLd={[breadcrumbJsonLd, articleJsonLd]}
      />
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />

        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors mb-8 font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Article Header */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8">
              <span className="inline-block text-[9px] font-mono font-semibold uppercase tracking-wider px-3 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded mb-4">
                {post.category}
              </span>

              <h1 className="font-extrabold text-4xl lg:text-5xl tracking-tight mb-6 text-[var(--space-text)] leading-tight">
                {post.title}
              </h1>

              <p className="text-xl text-[var(--space-text-muted)] leading-relaxed mb-6">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--space-text-subtle)] font-mono border-y border-[var(--space-border)] py-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--space-card)] border border-[var(--space-border)] text-[var(--space-text-muted)] text-xs font-mono"
                >
                  <Tag className="w-3 h-3 text-teal-500" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Share Buttons */}
            <div className="mb-12 pb-8 border-b border-[var(--space-border)]">
              <ShareButtons title={post.title} url={postUrl} />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none mb-16">
              {renderContent(post.content)}
            </div>

            {/* CTA Box */}
            <div className="mt-16 p-8 glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
              <h3 className="font-bold text-2xl mb-3 text-[var(--space-text)]">
                Ready to Create AI Videos?
              </h3>
              <p className="text-[var(--space-text-muted)] text-sm mb-6 leading-relaxed">
                Join 500+ teams using AIVideo to create professional tutorial videos from screenshots in minutes.
              </p>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 glass-btn glass-btn-primary py-3 px-6 rounded-xl font-semibold text-xs"
              >
                Start Creating Free
                <Share2 className="w-4 h-4" />
              </Link>
            </div>

            {/* Related Posts */}
            <RelatedPosts posts={relatedPosts} />
          </motion.article>
        </main>

        <FooterSection />
      </div>
    </div>
  );
}
