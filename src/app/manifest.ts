import type { MetadataRoute } from "next";

/** Permite instalar o site como app (tela inicial do celular). No iPhone, só app instalado recebe avisos. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onial Creators",
    short_name: "Onial",
    description: "Painel da equipe de criadores da Onial",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
