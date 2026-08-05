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
  /**
   * Optional YouTube video ID for a hero embed under the article header.
   * You can also embed videos inline anywhere in `content` with a line:
   *   @youtube[VIDEO_ID]
   * Use "PLACEHOLDER" until you have the real ID: it renders a tidy
   * "video coming soon" box instead of a broken player.
   */
  youtubeId?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "4",
    slug: "elevenlabs-api-key-guide",
    title: "Use Your Own ElevenLabs Voices: How to Get a Free API Key (and Add It in the Editor)",
    excerpt:
      "Premium ElevenLabs voices are bring-your-own-key. Here's how to grab an ElevenLabs API key, free or paid, and paste it into the editor to unlock ultra-realistic narration.",
    date: "July 28, 2026",
    category: "Tutorials",
    author: "Abdul Rauf Azhar",
    readTime: "5 min read",
    tags: ["elevenlabs", "voiceover", "api key", "tutorial", "narration"],
    youtubeId: "PLACEHOLDER",
    content: `## Why bring your own key?

Our built-in voices (Microsoft Edge and the local Kokoro model) are free and sound great. But if you want the ultra-realistic, studio-grade narration from **ElevenLabs**, those voices run on *your own* ElevenLabs account rather than a shared key.

That's good for you: you control your own usage and credits, you get ElevenLabs' generous free tier directly, and your key is encrypted and only ever used to generate your narration. We never show it back to you or use it for anyone else.

Here's the whole setup, start to finish.

@youtube[PLACEHOLDER]

## Step 1: Create a free ElevenLabs account

Go to **elevenlabs.io** and sign up. The free plan requires no credit card and includes a monthly pool of characters, enough to narrate quite a few short tutorials while you try things out.

## Step 2: Copy your API key

Once you're signed in:

- Click your **profile icon** in the bottom-left, then open **Profile + API key** (sometimes shown as "API Keys").
- Click **Create API Key** (or reveal the existing one).
- Copy the key. It starts with \`sk_\`. Treat it like a password.

That's the only thing you need from ElevenLabs.

## Step 3: Paste it into the editor

Back in the editor, open the **ElevenLabs** tab in the right sidebar (the crown icon). In the **Bring your own ElevenLabs key** box:

- Paste your \`sk_…\` key.
- Click **Save**.

We validate the key against ElevenLabs immediately, so if it's wrong you'll know right away. Once it's accepted, your remaining character credits appear right there, the premium voices unlock, and every render for your project uses your key automatically.

To swap or remove it later, use the **Remove** button in that same panel.

## Free vs. paid: which do you need?

- **Free tier**: a monthly character allowance, ideal for testing and short videos. Voices are the same quality; you're just limited on total characters per month.
- **Paid tiers**: more characters, commercial usage rights, and higher concurrency for longer or higher-volume projects.

For most people, start free. If you hit your monthly character limit, ElevenLabs will show it in the credits readout in the editor, and you can upgrade on their site, with no change needed on our end.

## Troubleshooting

- **"That key was rejected"**: you likely copied a partial key. Re-copy the full \`sk_…\` string.
- **Premium voice sounds like a free voice**: you do not have a key saved (or credits ran out). Premium voices fall back to free Edge TTS so a render never fails; add or top up your key to restore them.
- **Credits show 0 remaining**: your monthly ElevenLabs allowance is used up; it resets on your ElevenLabs billing date, or upgrade for more.

## That's it

Once your key is saved, nothing else changes about how you work. Pick an ElevenLabs voice, hit preview, and render. Your narration just got a whole lot more human.`,
  },
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
