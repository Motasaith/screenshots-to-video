import { useParams, Link } from "react-router";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema, createArticleSchema } from "@/components/SEO";
import { getPostBySlug, getRelatedPosts, type BlogPost } from "@/data/blog";
import { ArrowLeft, Clock, Calendar, Tag, User, Share2, Twitter, Linkedin, Link2 } from "lucide-react";
import { useState } from "react";

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
      <span className="text-sm text-muted-foreground font-dm">Share:</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-card border hover:border-[var(--sketch-accent)] transition-colors"
          aria-label={`Share on ${link.name}`}
        >
          <link.icon className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
        </a>
      ))}
      <button
        onClick={copyLink}
        className="p-2 rounded-lg bg-card border hover:border-[var(--sketch-accent)] transition-colors relative"
        aria-label="Copy link"
      >
        <Link2 className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-foreground text-background px-2 py-1 rounded whitespace-nowrap">
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
    <div className="mt-16 pt-16 border-t border-border">
      <h2 className="font-syne font-bold text-2xl mb-8 text-[var(--sketch-fg)]">
        Related Articles
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="sketch-card-hover p-6 group bg-[var(--sketch-card-bg)]"
          >
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-[var(--sketch-accent)]/20 text-[var(--sketch-fg)] sketch-border-sm mb-3 inline-block">
              {post.category}
            </span>
            <h3 className="font-body font-bold text-lg mb-2 text-[var(--sketch-fg)] group-hover:text-[var(--sketch-accent)] transition-colors">
              {post.title}
            </h3>
            <p className="font-dm text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
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
      <div className="min-h-screen dot-grid">
        <Navbar />
        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6 text-center">
          <h1 className="font-body font-bold text-4xl mb-4 text-[var(--sketch-fg)]">Article Not Found</h1>
          <p className="font-dm text-muted-foreground mb-8">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[var(--sketch-accent)] hover:underline font-syne font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </main>
        <FooterSection />
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
          <ul key={`list-${key++}`} className="list-disc pl-6 space-y-2 mb-6 font-dm text-[var(--sketch-fg)]">
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
          <h1 key={key++} className="font-syne font-bold text-4xl lg:text-5xl tracking-tight mb-6 mt-12 text-[var(--sketch-fg)]">
            {trimmed.replace("# ", "")}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={key++} className="font-syne font-bold text-2xl lg:text-3xl tracking-tight mb-4 mt-10 text-[var(--sketch-fg)]">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={key++} className="font-syne font-bold text-xl lg:text-2xl tracking-tight mb-3 mt-8 text-[var(--sketch-fg)]">
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("```")) {
        flushList();
        // Skip code block markers for now
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"));
      } else if (trimmed.startsWith("| ") && trimmed.endsWith(" |")) {
        flushList();
        // Skip table rows for now (simplified)
      } else if (trimmed === "") {
        flushList();
      } else if (trimmed.startsWith("[> ")) {
        flushList();
        elements.push(
          <blockquote key={key++} className="border-l-4 border-[var(--sketch-accent)] pl-6 py-2 my-6 italic font-dm text-[var(--sketch-fg-muted)]">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      } else if (trimmed.startsWith("---")) {
        flushList();
        elements.push(<hr key={key++} className="my-8 border-border" />);
      } else {
        flushList();
        const html = trimmed
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code className='bg-muted px-1.5 py-0.5 rounded text-sm font-mono'>$1</code>");
        elements.push(
          <p key={key++} className="font-dm text-[var(--sketch-fg)] leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <div className="min-h-screen dot-grid">
      <SEO
        title={post.title}
        description={post.excerpt}
        canonical={postUrl}
        ogType="article"
        jsonLd={[breadcrumbJsonLd, articleJsonLd]}
      />

      <Navbar />

      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        {/* Back Link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-dm text-sm"
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
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-[var(--sketch-accent)]/20 text-[var(--sketch-fg)] sketch-border-sm mb-4">
              {post.category}
            </span>

            <h1 className="font-syne font-bold text-4xl lg:text-5xl tracking-tight mb-6 text-[var(--sketch-fg)]">
              {post.title}
            </h1>

            <p className="font-dm text-xl text-muted-foreground leading-relaxed mb-6">
              {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-dm">
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-dm"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>

          {/* Share Buttons */}
          <div className="mb-12 pb-8 border-b border-border">
            <ShareButtons title={post.title} url={postUrl} />
          </div>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            {renderContent(post.content)}
          </div>

          {/* CTA Box */}
          <div className="mt-16 p-8 sketch-card bg-[var(--sketch-card-bg)]">
            <h3 className="font-syne font-bold text-2xl mb-3 text-[var(--sketch-fg)]">
              Ready to Create AI Videos?
            </h3>
            <p className="font-dm text-muted-foreground mb-6">
              Join 500+ teams using AIVideo to create professional tutorial videos from screenshots in minutes.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--sketch-accent)] text-white font-syne font-bold rounded-lg hover:opacity-90 transition-opacity"
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
  );
}
