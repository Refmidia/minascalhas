import { useEffect, useState } from "react";

import { centralizarAssinaturaDataUrl } from "@/lib/ponto-assinatura";

type Props = {
  src: string;
  alt: string;
};

/** Recorta o traço e mostra a assinatura no centro da caixa branca. */
export function AssinaturaPreviewImg({ src, alt }: Props) {
  const [out, setOut] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setOut(src);
    void centralizarAssinaturaDataUrl(src).then((v) => {
      if (!cancelled) setOut(v);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return <img src={out} alt={alt} />;
}
