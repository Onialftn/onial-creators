import type { Metadata } from "next";
// fontes servidas pelo próprio site (sem depender do Google na hora do build)
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onial Creators",
  description: "Painel da equipe de conteúdo da Onial",
  icons: { icon: [{ url: "/favicon.ico?v=3", sizes: "48x48" }, { url: "/logo.png?v=3", type: "image/png" }], shortcut: "/favicon.ico?v=3", apple: "/apple-icon.png?v=3" },
};

// aplica as configurações deste aparelho (aba Configurações) antes da página aparecer (evita piscar)
const temaInicial = `try{var d=document.documentElement,s=localStorage,m=s.getItem('onialMode');if(m==='auto')m=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';if(m==='light')d.setAttribute('data-mode','light');var t=s.getItem('onialTema');if(t&&t!=='original')d.setAttribute('data-tema',t);if(s.getItem('onialTexto')==='grande')d.setAttribute('data-texto','grande');if(s.getItem('onialAnim')==='poucas')d.setAttribute('data-animacoes','poucas')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
