import { Link } from "react-router";
import { PageShell } from "@/components/site/PageShell";
import { getAllPosts } from "@/data/blog";

export default function Blog() {
  const posts = getAllPosts();

  return (
    <PageShell
      title="Blog"
      description="Notes on making tutorial videos, technical writing, and how the render pipeline works."
      canonical="https://aivideo.ai/blog"
      lede="Notes on making tutorial videos, technical writing, and how the render pipeline works underneath."
      wide
    >
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.id}>
            <Link to={`/blog/${post.slug}`} className="group block">
              <span className="chip chip-brand">{post.category}</span>

              <h2 className="mt-3.5 text-[19px] font-semibold leading-snug tracking-[-0.02em] text-ink group-hover:text-brand">
                {post.title}
              </h2>

              <p className="mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-ink-body">
                {post.excerpt}
              </p>

              <p className="mt-4 text-[13.5px] text-ink-muted">
                {post.date} · {post.readTime}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
