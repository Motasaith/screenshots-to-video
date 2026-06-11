export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  author: string;
  readTime: string;
  tags: string[];
  image?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "3",
    slug: "v2-studio-mode-vision-llm",
    title: "AIVideo v2.0: Introducing Studio Mode, Vision Copyright Scanner, and Proactive AI",
    excerpt: "Today we're launching the biggest update to AIVideo yet. Generate entire scenes from text prompts, chat with our new AI Guide, and ensure AdSense safety with our Vision LLM.",
    date: "June 11, 2026",
    category: "Product",
    author: "Abdul Rauf Azhar",
    readTime: "5 min read",
    tags: ["product update", "AI", "vision", "studio"],
    content: "## AIVideo v2.0 is Here\n\nToday we're launching the biggest update to AIVideo yet. Generate entire scenes from text prompts, chat with our new AI Guide, and ensure AdSense safety with our Vision LLM."
  },
  {
    id: "1",
    slug: "future-of-technical-documentation",
    title: "The Future of Technical Documentation: Why Static Screenshots Are Dead",
    excerpt: "Static screenshots and walls of text no longer cut it. Learn why AI-powered video tutorials are becoming the new standard for technical documentation.",
    date: "May 12, 2026",
    category: "Product",
    author: "Abdul Rauf Azhar",
    readTime: "8 min read",
    tags: ["documentation", "AI", "video", "tutorials"],
    content: "## The Future of Technical Documentation\n\nStatic screenshots and walls of text no longer cut it. Learn why AI-powered video tutorials are becoming the new standard for technical documentation."
  },
  {
    id: "2",
    slug: "mastering-cinematic-zooms",
    title: "Mastering Cinematic Zooms: The Secret to Engaging Tutorial Videos",
    excerpt: "Keep your viewers hooked by directing their attention with smooth, cinematic zooming techniques that make complex UI flows easy to follow.",
    date: "May 08, 2026",
    category: "Tutorials",
    author: "Abdul Rauf Azhar",
    readTime: "6 min read",
    tags: ["tutorial", "video editing", "UI/UX", "engagement"],
    content: "## Mastering Cinematic Zooms\n\nKeep your viewers hooked by directing their attention with smooth, cinematic zooming techniques that make complex UI flows easy to follow."
  }
];
export const getAllPosts = (): BlogPost[] => {
  return BLOG_POSTS.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return BLOG_POSTS.find(post => post.slug === slug);
};

export const getRelatedPosts = (currentPost: BlogPost, limit = 2): BlogPost[] => {
  return BLOG_POSTS
    .filter(post => post.id !== currentPost.id && post.category === currentPost.category)
    .slice(0, limit);
};
