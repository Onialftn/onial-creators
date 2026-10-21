import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade · Onial Creators" };

const CONTATO = "onial.contato@gmail.com";

export default function Privacidade() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--bg)" }}>
      <article className="card mx-auto flex flex-col gap-4" style={{ maxWidth: 760, padding: "32px 28px", lineHeight: 1.6 }}>
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Logo Onial" width={44} height={44} className="rounded-lg" />
          <span className="display" style={{ fontSize: 20, letterSpacing: 1 }}>ONIAL CREATORS</span>
        </Link>
        <h1 className="display" style={{ fontSize: 30, margin: 0 }}>Política de Privacidade</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>Atualizada em 21 de outubro de 2026</p>

        <p>O Onial Creators é o painel interno da equipe de criadores de conteúdo da Onial. Ele é usado só pelos membros da equipe, que recebem um login do gestor. Esta página explica quais dados o site usa e por quê.</p>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Dados que usamos</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Nome e e-mail do login de cada membro.</li>
          <li>Quando o criador conecta uma rede (YouTube, TikTok ou Instagram): nome e foto do canal ou perfil, a lista dos vídeos publicados (título, link e data) e o número de visualizações de cada vídeo.</li>
          <li>Dias de postagem, metas de views e pagamentos registrados pelo gestor.</li>
        </ul>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Para que usamos</h2>
        <p style={{ margin: 0 }}>Só para calcular e mostrar ao próprio criador quanto ele ganhou no mês, se está em dia com as postagens e com a meta de views, e para o ranking da equipe (que mostra apenas o número de views). O site só lê dados: nunca publica, edita ou apaga nada nas suas contas.</p>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Dados do Google e do YouTube</h2>
        <p style={{ margin: 0 }}>Ao conectar o YouTube, o site pede permissão de leitura do canal e das estatísticas do YouTube Analytics. O uso e a transferência de informações recebidas das APIs do Google seguem a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado. Ao usar essa integração você também concorda com os <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>Termos de Serviço do YouTube</a> e com a <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>Política de Privacidade do Google</a>.</p>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Com quem compartilhamos</h2>
        <p style={{ margin: 0 }}>Com ninguém. Não vendemos, não usamos para anúncios e não repassamos dados a terceiros. Os dados ficam guardados no Supabase e o site roda na Vercel, que são os serviços de hospedagem. As chaves de acesso das redes ficam guardadas só no servidor e nunca aparecem no navegador. Cada criador vê só os próprios valores em dinheiro; o gestor da equipe vê os de todos.</p>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Como desconectar ou apagar seus dados</h2>
        <p style={{ margin: 0 }}>Você pode tirar o acesso do site a qualquer momento: no Google, em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>myaccount.google.com/permissions</a>; no TikTok e no Instagram, nas configurações de apps conectados. Para apagar seus dados do site, mande um e-mail para <a href={`mailto:${CONTATO}`} style={{ color: "var(--accent-text)" }}>{CONTATO}</a> e apagamos em até 30 dias.</p>

        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Contato</h2>
        <p style={{ margin: 0 }}>Dúvidas sobre esta política: <a href={`mailto:${CONTATO}`} style={{ color: "var(--accent-text)" }}>{CONTATO}</a>.</p>
      </article>
    </main>
  );
}
