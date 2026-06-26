import {
  Ruler,
  Zap,
  Wrench,
  MapPin,
  Package,
  Users,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import calhasImg from "@/assets/service-calhas.jpg";
import rufosImg from "@/assets/service-rufos.jpg";
import pingadeirasImg from "@/assets/service-pingadeiras.jpg";
import condutoresImg from "@/assets/service-condutores.jpg";
import coifasImg from "@/assets/service-coifas.jpg";
import caixasImg from "@/assets/service-caixas.jpg";
import type {
  Benefit,
  ContactInfo,
  Differential,
  GalleryItem,
  NavLink,
  Service,
} from "@/types/site";

export const NAV_LINKS: NavLink[] = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Projetos", href: "#galeria" },
  { label: "Galeria", href: "#galeria" },
  { label: "Contato", href: "#contato" },
];

export const BENEFITS: Benefit[] = [
  { icon: Ruler, title: "Sob medida", description: "Peças fabricadas conforme a necessidade do seu projeto." },
  { icon: Zap, title: "Atendimento rápido", description: "Resposta ágil e prazos que cabem na sua obra." },
  { icon: Wrench, title: "Instalação especializada", description: "Equipe qualificada e acabamento profissional." },
  { icon: MapPin, title: "Atendimento regional", description: "Atendemos toda a região com eficiência e dedicação." },
];

export const SERVICES: Service[] = [
  { slug: "calhas", title: "Calhas", description: "Proteção eficiente contra infiltrações e desvio de água da chuva.", image: calhasImg },
  { slug: "rufos", title: "Rufos", description: "Vedação e acabamento que garantem durabilidade e segurança.", image: rufosImg },
  { slug: "pingadeiras", title: "Pingadeiras", description: "Acabamento que evita manchas e infiltrações em paredes e fachadas.", image: pingadeirasImg },
  { slug: "condutores", title: "Condutores", description: "Escoamento de água com segurança e alto desempenho.", image: condutoresImg },
  { slug: "coifas", title: "Coifas", description: "Ventilação e proteção para churrasqueiras e sistemas de exaustão.", image: coifasImg },
  { slug: "caixas-termicas", title: "Caixas térmicas", description: "Soluções térmicas sob medida para diversos segmentos.", image: caixasImg },
];

export const GALLERY: GalleryItem[] = [
  { image: calhasImg, label: "Calhas", alt: "Instalação de calhas em telhado residencial" },
  { image: condutoresImg, label: "Calhas", alt: "Condutor vertical conectado a calha" },
  { image: rufosImg, label: "Rufos", alt: "Rufo metálico vedando junção do telhado" },
  { image: pingadeirasImg, label: "Rufos", alt: "Pingadeira instalada em janela de fachada moderna" },
];

export const DIFFERENTIALS: Differential[] = [
  { icon: Package, title: "Materiais de qualidade", description: "Utilizamos materiais duráveis e resistentes." },
  { icon: Users, title: "Mão de obra especializada", description: "Profissionais experientes no compromisso." },
  { icon: Sparkles, title: "Acabamento impecável", description: "Detalhes que valorizam sua construção." },
  { icon: HeartHandshake, title: "Confiança no atendimento", description: "Atendimento cuidadoso em cada etapa do serviço." },
];

export const CONTACT: ContactInfo = {
  whatsapp: "(18) 99732-6783",
  whatsappLink: "https://wa.me/5518997326783",
  phone: "(18) 99636-6042",
  email: "contato@minascalhas.com",
  address: "Rua José Alves de Lima, nº 10 — Florínea/SP — CEP 19870-015",
};

export const COMPANY = {
  name: "Minas Calhas",
  tagline: "Soluções em calhas, rufos e acabamentos com qualidade e confiança.",
  year: 2026,
};
