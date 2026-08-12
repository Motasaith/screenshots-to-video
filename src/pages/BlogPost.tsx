import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Check, Link2, Linkedin, Twitter } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema, createArticleSchema } from "@/components/SEO";
import { getPostBySlug, getRelatedPosts, type BlogPost as Post } from "@/data/blog";

function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const links = [
    {
      name: "Twitter",
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "LinkedIn",
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {links.map(({ name, Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${name}`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        aria-label="Copy link"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        {copied ? <Check className="h-4 w-4 text-brand" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * 16:9 YouTube embed. A missing or "PLACEHOLDER" id renders a framed note
 * instead of a broken player, so a post can ship before its video is cut.
 */
function YouTube({ id: rawId }: { id: string }) {
  const id = rawId.trim();

  if (!id || id.toUpperCase() === "PLACEHOLDER") {
    return (
      <div className="my-8 rounded-xl border border-dashed border-line-strong bg-mat px-6 py-12 text-center">
        <p className="text-[15px] font-medium text-ink">Walkthrough video coming soon</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          Replace the placeholder id in src/data/blog.ts to embed it here.
        </p>
      </div>
    );
  }

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-line" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${encodeURIComponent(id)}`}
        title="Video"
        // Lazy, so an embed halfway down an article does not cost a player
        // download and an iframe's worth of script on first paint.
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

/** Bold, italic and inline code, applied to a single line of body text. */
function inlineMarkup(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

/**
 * The small subset of markdown the posts actually use. Not a full parser, and
 * not trying to be one; posts are written in-repo by us, so the input is
 * trusted.
 */
function renderContent(content: string) {
  const out: React.ReactElement[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const line of content.trim().split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList();
      out.push(<h3 key={key++}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith("## ")) {
      flushList();
      out.push(<h2 key={key++}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith("# ")) {
      flushList();
      out.push(<h2 key={key++}>{trimmed.slice(2)}</h2>);
    } else if (trimmed.startsWith("@youtube[") && trimmed.endsWith("]")) {
      flushList();
      out.push(<YouTube key={key++} id={trimmed.slice("@youtube[".length, -1)} />);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(inlineMarkup(trimmed.slice(2)));
    } else if (trimmed.startsWith("> ")) {
      flushList();
      out.push(
        <blockquote
          key={key++}
          className="border-l-2 border-brand pl-5 italic text-ink-body"
          dangerouslySetInnerHTML={{ __html: inlineMarkup(trimmed.slice(2)) }}
        />
      );
    } else if (trimmed.startsWith("---")) {
      flushList();
      out.push(<hr key={key++} className="border-line" />);
    } else if (trimmed === "" || trimmed.startsWith("```") || trimmed.startsWith("|")) {
      flushList();
    } else {
      flushList();
      out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inlineMarkup(trimmed) }} />);
    }
  }

  flushList();
  return out;
}

function RelatedPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-12">
      <h2 className="h3">Related</h2>
      <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
            <span className="chip chip-brand">{post.category}</span>
            <h3 className="mt-3 text-[16px] font-semibold leading-snug text-ink group-hover:text-brand">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-ink-body">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col">
        <SEO title="Article not found" description="That article does not exist." noindex />
        <Navbar />
        <main className="container-narrow grid flex-1 place-items-center py-24 text-center">
          <div>
            <h1 className="h2">Article not found</h1>
            <p className="lede mt-4">It may have moved, or the link may be out of date.</p>
            <Link to="/blog" className="btn btn-secondary mt-7">
              <ArrowLeft className="h-4 w-4" />
              All articles
            </Link>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  const postUrl = `https://aivideo.ai/blog/${post.slug}`;

  return (
    <div className="flex min-h-screen flex-col">
      <SEO
        title={post.title}
        description={post.excerpt}
        canonical={postUrl}
        ogType="article"
        jsonLd={[
          createBreadcrumbSchema([
            { name: "Home", url: "https://aivideo.ai/" },
            { name: "Blog", url: "https://aivideo.ai/blog" },
            { name: post.title, url: postUrl },
          ]),
          createArticleSchema(
            post.title,
            post.excerpt,
            postUrl,
            new Date(post.date).toISOString()
          ),
        ]}
      />
      <Navbar />

      <main className="flex-1">
        <div className="border-b border-line bg-mat">
          <div className="container-narrow py-14 md:py-16">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All articles
            </Link>

            <span className="chip chip-brand mt-6">{post.category}</span>

            <h1 className="h2 mt-4">{post.title}</h1>
            <p className="lede mt-4">{post.excerpt}</p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
              <p className="text-[14px] text-ink-muted">
                {post.author} · {post.date} · {post.readTime}
              </p>
              <ShareButtons title={post.title} url={postUrl} />
            </div>
          </div>
        </div>

        <article className="container-narrow py-14 md:py-16">
          {post.youtubeId && !post.content.includes("@youtube[") && (
            <YouTube id={post.youtubeId} />
          )}

          <div className="copy">{renderContent(post.content)}</div>

          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>

          <div className="card card-pad mt-14">
            <h2 className="text-[17px] font-semibold text-ink">Try it on your own screenshots</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
              Free videos every month, no card needed.
            </p>
            <Link to="/signup" className="btn btn-primary mt-5">
              Start free
            </Link>
          </div>

          <RelatedPosts posts={getRelatedPosts(post)} />
        </article>
      </main>

      <FooterSection />
    </div>
  );
}
