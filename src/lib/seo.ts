import { getPublicSiteOrigin, HOME_SITE, LANDING_HERO, SITE_META } from "@/data/home-config";

export type SeoPageMeta = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  ogType?: string;
};

export function absoluteUrl(path: string): string {
  const origin = getPublicSiteOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

export function resolveSeoImage(image?: string): string {
  if (!image?.trim()) return SITE_META.ogImageUrl;
  if (/^https?:\/\//i.test(image)) return image;
  return absoluteUrl(image);
}

export function canonicalLink(path: string) {
  return { rel: "canonical" as const, href: absoluteUrl(path) };
}

/** Meta tags + canonical para páginas públicas. */
export function buildPageHead(page: SeoPageMeta) {
  const path = page.path ?? "/";
  const url = absoluteUrl(path);
  const image = resolveSeoImage(page.image);
  const imageAlt = page.imageAlt ?? `${SITE_META.name} — ${page.title}`;

  const meta: Array<Record<string, string>> = [
    { title: page.title },
    { name: "description", content: page.description },
    { property: "og:title", content: page.title },
    { property: "og:description", content: page.description },
    { property: "og:type", content: page.ogType ?? "website" },
    { property: "og:site_name", content: SITE_META.name },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:locale", content: "pt_BR" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: page.title },
    { name: "twitter:description", content: page.description },
    { name: "twitter:image", content: image },
    {
      name: "robots",
      content: page.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    },
  ];

  return {
    meta,
    links: [canonicalLink(path)],
  };
}

export function websiteJsonLd() {
  const origin = getPublicSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_META.name,
    url: origin,
    description: SITE_META.description,
    inLanguage: "pt-BR",
  };
}

export function localBusinessJsonLd() {
  const origin = getPublicSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${origin}/#empresa`,
    name: SITE_META.name,
    description: SITE_META.description,
    url: origin,
    image: resolveSeoImage(LANDING_HERO.image),
    telephone: ["+5518997326783", "+5518996366042"],
    email: HOME_SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rua José Alves de Lima, 10",
      addressLocality: "Florínea",
      addressRegion: "SP",
      postalCode: "19870-015",
      addressCountry: "BR",
    },
    areaServed: HOME_SITE.regiaoAtendimento,
    sameAs: [HOME_SITE.instagram],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
