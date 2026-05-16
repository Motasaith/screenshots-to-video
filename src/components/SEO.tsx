import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

export function SEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = "https://aivideo.ai/og-image.jpg",
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title.includes("AIVideo")
    ? title
    : `${title} | AIVideo`;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

/* Pre-built JSON-LD schemas */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AIVideo",
  url: "https://aivideo.ai",
  logo: "https://aivideo.ai/logo.png",
  sameAs: [
    "https://twitter.com/aivideo_ai",
    "https://github.com/aivideo",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@aivideo.ai",
    contactType: "customer support",
  },
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AIVideo",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
  },
};

export function createBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createArticleSchema(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: "AIVideo",
      url: "https://aivideo.ai",
    },
    publisher: {
      "@type": "Organization",
      name: "AIVideo",
      logo: {
        "@type": "ImageObject",
        url: "https://aivideo.ai/logo.png",
      },
    },
  };
}
