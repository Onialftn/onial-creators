"use client";
import { useState } from "react";

/** Capa do vídeo. No YouTube tenta a capa vertical do Shorts e, se não existir, a capa normal. */
export function CapaVideo({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState(src);
  const [falhou, setFalhou] = useState(false);
  const proxima = () => (url.includes("oardefault") ? setUrl(url.replace("oardefault", "hqdefault")) : setFalhou(true));
  if (falhou) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={proxima}
      // quando a capa não existe, o YouTube devolve uma imagem cinza de 120×90 em vez de erro
      onLoad={(e) => e.currentTarget.naturalWidth <= 120 && proxima()}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }}
    />
  );
}
