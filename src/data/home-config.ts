/** Configuração da landing — espelho de `Alex/app/components/site/home-config.php`. */

export const HOME_SITE = {
  mediaBaseUrl: (
    typeof process !== "undefined"
      ? process.env.VITE_MEDIA_BASE_URL ?? process.env.MEDIA_BASE_URL
      : import.meta.env.VITE_MEDIA_BASE_URL
  )?.replace(/\/$/, "") ?? "https://minascalhas.com",
  whatsapp: "5518997326783",
  whatsappSec: "5518996366042",
  whatsappMsg: "Olá, gostaria de solicitar um orçamento para serviços da Minas Calhas.",
  email: "contato@minascalhas.com",
  instagram: "https://www.instagram.com/minas_callha/",
  telefone1: "(18) 99732-6783",
  telefone2: "(18) 99636-6042",
  endereco: "Rua Benedito Cardoso Coelho, Florínea/SP — CEP 19870-210",
  regiaoAtendimento: "Florínea, Venda Nova do Imigrante, Álvares Machado e região.",
  mapsEmbed:
    "https://www.google.com/maps?q=Rua+Benedito+Cardoso+Coelho,+Flor%C3%ADnea,+SP,+19870-210&hl=pt&z=16&output=embed",
  chat: {
    nome: "Atendimento",
    cargo: "Minas Calhas",
    foto: "/images/perfil/poliane.jpeg",
  },
  img: {
    logoHeader: "/images/logo/logo-home.png",
    logoFooter: "/images/logo/logo-branco.png",
    heroSlides: [
      { src: "/images/galeria/image7.png", alt: "Instalação de calha em telhado com telhas" },
      { src: "/images/galeria/image6.png", alt: "Instalação de calha residencial com céu azul" },
      { src: "/images/galeria/image8.png", alt: "Acabamento em rufo sob medida" },
      { src: "/images/galeria/image5.png", alt: "Sistema de calhas e condutores instalados" },
      { src: "/images/galeria/image3.png", alt: "Acabamento profissional em calhas" },
      { src: "/images/galeria/image2.png", alt: "Fabricação personalizada Minas Calhas" },
    ],
    galeria: [
      { src: "/images/galeria/image6.png", legenda: "Instalação de calha residencial" },
      { src: "/images/galeria/image8.png", legenda: "Acabamento em rufo sob medida" },
      { src: "/images/galeria/image2.png", legenda: "Fabricação personalizada" },
      { src: "/images/galeria/image7.png", legenda: "Instalação de calha em telhado" },
    ],
    servicos: [
      { slug: "calhas", titulo: "Calhas", texto: "Proteção eficiente contra infiltrações e desvio de água da chuva.", img: "/images/galeria/calhas.jpg" },
      { slug: "rufos", titulo: "Rufos", texto: "Vedação e acabamento que garantem durabilidade e segurança.", img: "/images/galeria/rufos.jpg" },
      { slug: "pingadeiras", titulo: "Pingadeiras", texto: "Acabamento que evita manchas e protege paredes e fachadas.", img: "/images/galeria/pingadeiras.jpg" },
      { slug: "condutores", titulo: "Condutores", texto: "Escoamento de água com segurança e alto desempenho.", img: "/images/galeria/condutores.jpg" },
      { slug: "coifas", titulo: "Coifas", texto: "Ventilação e proteção para churrasqueiras e sistemas de exaustão.", img: "/images/galeria/coifas.jpg" },
      { slug: "caixas", titulo: "Caixas térmicas", texto: "Soluções térmicas sob medida para diversos segmentos.", img: "/images/galeria/caixas.jpg" },
    ],
  },
} as const;

export type HomeServico = {
  slug: string;
  titulo: string;
  texto: string;
  img: string;
};

export type HomeSlide = { src: string; alt: string };
export type HomeGaleriaItem = { src: string; legenda: string };

export type HomeLandingData = {
  servicos: HomeServico[];
  heroSlides: HomeSlide[];
  galeria: HomeGaleriaItem[];
};

/** Resolve caminho relativo do PHP ou URL absoluta (com fallback remoto). */
export function siteAsset(path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  let rel = p.replace(/^\.\//, "").replace(/^app\/public\//, "");
  if (!rel.startsWith("/")) rel = `/${rel}`;
  return rel;
}

export function waUrl(number: string, msg?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  if (!msg?.trim()) return base;
  return `${base}?text=${encodeURIComponent(msg)}`;
}

export type LandingNavItem = { label: string; href: string; external?: boolean };

export const LANDING_NAV: LandingNavItem[] = [
  { label: "Início", href: "#inicio" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Dúvidas & Cuidados", href: "#tecnico" },
  { label: "Galeria", href: "/galeria" },
  { label: "Contato", href: "#contato" },
];

export const LANDING_HERO = {
  desc: "Proteja telhados e fachadas com acabamentos resistentes e instalação profissional do início ao fim. Valorize seu projeto.",
  image: "/images/galeria/image6.png",
  imageAlt: "Instalação de calha residencial em fachada moderna",
};

export const LANDING_HERO_CALLOUTS = [
  {
    key: "desempenadeira",
    label: "Desempenadeira",
    text: "Acabamento superior que valoriza o visual",
    labelX: 6,
    labelY: 14,
    dotX: 38,
    dotY: 28,
    align: "left" as const,
  },
  {
    key: "protecao",
    label: "Proteção",
    text: "Evita infiltrações e manchas",
    labelX: 72,
    labelY: 12,
    dotX: 58,
    dotY: 34,
    align: "right" as const,
  },
  {
    key: "acabamento",
    label: "Acabamento",
    text: "Valoriza a fachada e o imóvel",
    labelX: 5,
    labelY: 68,
    dotX: 32,
    dotY: 52,
    align: "left" as const,
  },
  {
    key: "reducao",
    label: "Redução",
    text: "Menos respingos e barulho",
    labelX: 74,
    labelY: 72,
    dotX: 62,
    dotY: 58,
    align: "right" as const,
  },
];

export const LANDING_NEEDS = [
  {
    icon: "bi-droplet-fill",
    title: "Paredes com umidade?",
    text: "Pingadeiras evitam manchas e preservam o acabamento.",
    img: "/images/galeria/pingadeiras.jpg",
  },
  {
    icon: "bi-cloud-rain",
    title: "Água caindo na calçada?",
    text: "Calhas e rufos direcionam a água para o lugar certo.",
    img: "/images/galeria/calhas.jpg",
  },
  {
    icon: "bi-house-fill",
    title: "Infiltração no telhado?",
    text: "Rufos e calhas protegem vedações e pregagens secas.",
    img: "/images/galeria/rufos.jpg",
  },
  {
    icon: "bi-tools",
    title: "Obra nova ou reforma?",
    text: "Soluções sob medida do projeto ao fim da obra.",
    img: "/images/galeria/image2.png",
  },
];

export const LANDING_SERVICES = [
  {
    slug: "calhas",
    icon: "bi-water",
    titulo: "Calha",
    texto: "Coleta e direciona a água com eficiência.",
    img: "/images/galeria/calhas.jpg",
  },
  {
    slug: "rufos",
    icon: "bi-layers",
    titulo: "Rufos",
    texto: "Vedação e acabamento em telhados.",
    img: "/images/galeria/rufos.jpg",
  },
  {
    slug: "pingadeiras",
    icon: "bi-shield-check",
    titulo: "Pingadeiras",
    texto: "Proteção para muros e paredes.",
    img: "/images/galeria/pingadeiras.jpg",
  },
  {
    slug: "coifas",
    icon: "bi-wind",
    titulo: "Coifas e chaminés",
    texto: "Saída de ar com proteção e acabamento.",
    img: "/images/galeria/coifas.jpg",
  },
  {
    slug: "condutores",
    icon: "bi-building",
    titulo: "Calhas e condutos",
    texto: "Solução ideal para indústrias e grandes estruturas.",
    img: "/images/galeria/condutores.jpg",
  },
];

const SERVICE_ICON_BY_SLUG = Object.fromEntries(LANDING_SERVICES.map((s) => [s.slug, s.icon])) as Record<
  string,
  string
>;

/** Ícone Bootstrap exibido no card da home conforme o slug do produto. */
export function serviceIconForSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  const aliased = key === "condutos" || key === "condutor" ? "condutores" : key;
  return SERVICE_ICON_BY_SLUG[aliased] ?? SERVICE_ICON_BY_SLUG[key] ?? "bi-grid";
}

export function landingServicesFallback() {
  return LANDING_SERVICES.map(({ slug, titulo, texto, img }) => ({ slug, titulo, texto, img }));
}

export const LANDING_TECH = {
  kicker: "POR QUE FAZER DO JEITO CERTO?",
  title: "Não é só colocar uma calha. É calcular o caminho da água.",
  intro:
    "Cada telhado tem a sua inclinação. Por isso, planejamos e instalamos com precisão para evitar problemas e:",
  items: [
    { title: "Infiltrações e goteiras", text: "causam danos na estrutura e acabamento." },
    { title: "Trincas e mofo nas paredes", text: "resultam da água acumulada e mal direcionada." },
    { title: "Manchas e desgaste na fachada", text: "ocorrem com respingos e escorrimentos." },
    { title: "Assentamentos e rachaduras", text: "são causados pela infiltração no baldrame." },
  ],
};

export const LANDING_HERO_PERKS = [
  { icon: "bi-rulers", title: "Sob medida", text: "Projetos personalizados para cada tipo de obra" },
  { icon: "bi-person-gear", title: "Instalação limpa", text: "Equipe técnica, materiais certos e segurança" },
  { icon: "bi-lightning-charge", title: "Requisição rápida", text: "Agilidade no atendimento e prazos cumpridos" },
];

export const LANDING_SERVICE_LINKS = [
  { label: "Calhas", href: "#solucoes" },
  { label: "Rufos", href: "#solucoes" },
  { label: "Pingadeiras", href: "#solucoes" },
  { label: "Coifas e chaminés", href: "#solucoes" },
  { label: "Condutores", href: "#solucoes" },
  { label: "Galeria de projetos", href: "/galeria" },
];

/** Origem pública do site (WhatsApp/OG exigem URL absoluta https). */
export function getPublicSiteOrigin(): string {
  if (typeof process !== "undefined") {
    const fromEnv = process.env.VITE_SITE_URL?.trim() || process.env.SITE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");

    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (prod) {
      return prod.startsWith("http") ? prod.replace(/\/$/, "") : `https://${prod}`;
    }

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  const viteSite = import.meta.env.VITE_SITE_URL?.trim();
  if (viteSite) return viteSite.replace(/\/$/, "");

  return "https://textminascalhas.vercel.app";
}

/** Título, favicon e compartilhamento (aba do navegador / WhatsApp). */
export const SITE_META = {
  name: "Minas Calhas",
  description:
    "Calhas, rufos, pingadeiras e condutores com fabricação sob medida e instalação profissional em Florínea e região.",
  logoPreto: "/images/logo/logo-preto.png",
  /** Logo completo — melhor preview no WhatsApp que o ícone preto. */
  ogImagePath: "/images/logo/logo-home.png",
  get ogImageUrl() {
    return `${getPublicSiteOrigin()}${this.ogImagePath}`;
  },
};
