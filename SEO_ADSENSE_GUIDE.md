# AIVideo SEO & Google AdSense Compliance Guide

## ✅ SEO Changes Implemented

### 1. Static Files Created
- **`public/robots.txt`** — Allows all crawlers, blocks private pages (`/dashboard`, `/login`, `/admin`, etc.), points to sitemap
- **`public/sitemap.xml`** — Contains all public URLs with priorities and change frequencies

### 2. Global Meta Tags (`index.html`)
- Google Search Console verification meta tag (replace `YOUR_SEARCH_CONSOLE_VERIFICATION_CODE`)
- Canonical URL link
- Favicon & Apple touch icon links
- Theme color for mobile browsers

### 3. Per-Page SEO with `react-helmet-async`
- **`src/components/SEO.tsx`** — Reusable SEO component with:
  - Dynamic title & description
  - Open Graph tags (Facebook, LinkedIn)
  - Twitter Card tags
  - Canonical URLs
  - JSON-LD structured data support
  - `noindex` option for legal pages
- **`src/main.tsx`** — Wrapped app with `HelmetProvider`

### 4. Structured Data (JSON-LD) Added
- **Organization Schema** — Company info, logo, social links
- **SoftwareApplication Schema** — App info, rating, pricing
- **BreadcrumbList Schema** — Navigation breadcrumbs on every page
- **Article Schema** — For blog posts (ready to use)

### 5. Pages Updated with SEO
| Page | Title | Description | Breadcrumbs | noindex |
|------|-------|-------------|-------------|---------|
| LandingPage | AIVideo — Turn Screenshots... | Main product description | ❌ | ❌ |
| About | About AIVideo | Mission & platform info | ✅ | ❌ |
| Blog | Blog | Insights on AI video... | ✅ | ❌ |
| Contact | Contact Us | Get in touch... | ✅ | ❌ |
| Pricing | Pricing | Simple, transparent pricing | ✅ | ❌ |
| Docs | Documentation | Learn how to create... | ✅ | ❌ |
| Privacy | Privacy Policy | Data collection info | ✅ | ✅ |
| Terms | Terms of Service | Usage rules | ✅ | ✅ |

---

## 🎯 Google AdSense Requirements Checklist

### 1. Content Requirements ✅
- [x] **Original content** — Your app has unique AI video generation content
- [x] **Sufficient content** — Multiple pages (Blog, About, Docs, etc.)
- [x] **No prohibited content** — Check: no adult, gambling, drugs, hacking, etc.
- [x] **Privacy Policy page** — ✅ Exists at `/privacy`
- [x] **Terms of Service page** — ✅ Exists at `/terms`
- [x] **Contact page** — ✅ Exists at `/contact`
- [x] **About page** — ✅ Exists at `/about`

### 2. Technical Requirements
- [x] **Valid HTML** — React + Vite produces valid HTML
- [x] **Mobile-friendly** — Responsive design with Tailwind CSS ✅
- [x] **Fast loading** — Vite optimized builds ✅
- [x] **SSL/HTTPS** — Required for AdSense (Vercel provides this) ✅
- [ ] **AdSense code placed** — Add after approval (see below)

### 3. Policy Compliance
- [x] **No deceptive navigation** — Clear, honest UI
- [x] **No accidental clicks** — Buttons are clearly labeled
- [x] **No copyrighted material** — You own your content
- [x] **No incentivized clicks** — Don't ask users to click ads
- [x] **Traffic source disclosure** — Organic/social traffic is fine

### 4. Recommended Before Applying
- [ ] **At least 20-30 pages of content** — Blog posts, docs, tutorials
- [ ] **3-6 months of site age** — Google prefers established sites
- [ ] **Consistent traffic** — Some organic visitors
- [ ] **No placeholder content** — All pages have real, useful content
- [ ] **Navigation is clear** — Users can find all pages easily

---

## 🚀 Next Steps to Apply for AdSense

### Step 1: Verify with Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add your property: `https://aivideo.ai`
3. Choose **HTML tag** verification method
4. Copy the `content` value from the meta tag
5. Replace `YOUR_SEARCH_CONSOLE_VERIFICATION_CODE` in `index.html`
6. Deploy and click "Verify" in Search Console

### Step 2: Submit Sitemap
1. In Search Console, go to **Sitemaps**
2. Enter: `sitemap.xml`
3. Click **Submit**

### Step 3: Apply for AdSense
1. Go to [adsense.google.com](https://adsense.google.com)
2. Sign up with your Google account
3. Enter your site URL: `https://aivideo.ai`
4. Add the AdSense verification code to your `<head>` (temporarily)
5. Wait for review (usually 1-2 weeks, sometimes longer)

### Step 4: After Approval — Add Ad Units
Once approved, add AdSense code to your app:

```tsx
// In index.html, inside <head>:
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID" crossorigin="anonymous"></script>
```

For React components, create an Ad component:

```tsx
// src/components/AdSense.tsx
import { useEffect } from "react";

export function AdSense({ slot, style }: { slot: string; style?: React.CSSProperties }) {
  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={style || { display: "block" }}
      data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
```

Place ads in:
- Blog sidebar
- Between blog post sections
- Footer area (not sticky)
- Docs page sidebar

**Never place ads:**
- Over interactive elements
- In popups/modals
- In a way that causes accidental clicks
- On error pages (404, 500)
- On login/dashboard pages

---

## 📊 Additional SEO Recommendations

### 1. Blog Content Strategy
- Publish 2-4 blog posts per month
- Target long-tail keywords: "AI tutorial video maker", "automatic screenshot to video", "text to speech video generator"
- Each post should be 1000+ words with images
- Use internal links between posts

### 2. Backlink Building
- Submit to SaaS directories: Product Hunt, Indie Hackers, BetaList
- Guest post on tech blogs
- Create shareable content (free tools, infographics)
- Engage on Reddit, Hacker News, Twitter

### 3. Performance Optimization
- Use Vercel's Edge Network for global CDN
- Optimize images (WebP format, lazy loading)
- Enable compression (Vercel does this automatically)
- Core Web Vitals targets:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

### 4. Social Signals
- Create Twitter/X account (@aivideo_ai)
- Share blog posts and product updates
- Engage with the developer community
- Add social sharing buttons to blog posts

---

## 🔧 Files Modified/Created

| File | Action |
|------|--------|
| `public/robots.txt` | Created |
| `public/sitemap.xml` | Created |
| `index.html` | Updated — Search Console, canonical, favicon |
| `src/components/SEO.tsx` | Created — Reusable SEO component |
| `src/main.tsx` | Updated — HelmetProvider wrapper |
| `src/pages/LandingPage.tsx` | Updated — SEO + JSON-LD |
| `src/pages/About.tsx` | Updated — SEO + breadcrumbs |
| `src/pages/Blog.tsx` | Updated — SEO + breadcrumbs |
| `src/pages/Contact.tsx` | Updated — SEO + breadcrumbs |
| `src/pages/Pricing.tsx` | Updated — SEO + breadcrumbs |
| `src/pages/Docs.tsx` | Updated — SEO + breadcrumbs |
| `src/pages/Privacy.tsx` | Updated — SEO + breadcrumbs + noindex |
| `src/pages/Terms.tsx` | Updated — SEO + breadcrumbs + noindex |

---

## ⚠️ Important Notes

1. **Replace placeholders**:
   - `YOUR_SEARCH_CONSOLE_VERIFICATION_CODE` in `index.html`
   - `G-XXXXXXXXXX` in `index.html` with your real GA4 ID
   - `phc_YOUR_PROJECT_API_KEY` with real PostHog key (or remove)

2. **Update sitemap dates** whenever you publish new blog posts or make significant changes

3. **Test your site** with:
   - [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
   - [PageSpeed Insights](https://pagespeed.web.dev/)
   - [Rich Results Test](https://search.google.com/test/rich-results)

4. **AdSense approval tips**:
   - Wait until you have 20+ pages of real content
   - Ensure no broken links
   - Make sure navigation works perfectly
   - Don't apply with a brand-new domain (wait 1-2 months)
   - Organic traffic helps approval chances

---

*Last updated: May 16, 2026*
