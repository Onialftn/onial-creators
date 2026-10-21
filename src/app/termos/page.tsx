import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de uso · Onial Creators" };

const CONTATO = "onial.contato@gmail.com";
const h2 = { fontSize: 22, margin: 0 } as const;

export default function Termos() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--bg)" }}>
      <article className="card mx-auto flex flex-col gap-4" style={{ maxWidth: 760, padding: "32px 28px", lineHeight: 1.6 }}>
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Logo Onial" width={44} height={44} className="rounded-lg" />
          <span className="display" style={{ fontSize: 20, letterSpacing: 1 }}>ONIAL CREATORS</span>
        </Link>
        <h1 className="display" style={{ fontSize: 30, margin: 0 }}>Termos de uso</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>Atualizados em 21 de outubro de 2026</p>

        <p style={{ margin: 0 }}>O Onial Creators é o painel interno da equipe de criadores de conteúdo da Onial. Ao usar o site você concorda com estes termos.</p>

        <h2 className="display" style={h2}>Quem pode usar</h2>
        <p style={{ margin: 0 }}>Só membros da equipe Onial, com o login criado pelo gestor. O login é pessoal: não compartilhe sua senha.</p>

        <h2 className="display" style={h2}>O que o site faz</h2>
        <p style={{ margin: 0 }}>Mostra a cada criador as views dos próprios vídeos no TikTok, no YouTube e no Instagram, os dias de postagem, as metas e os pagamentos, e oferece ferramentas para criar vídeos. Ao conectar uma rede, você autoriza o site a ler o seu perfil, a lista dos seus vídeos e as views deles. O site nunca publica, edita ou apaga nada nas suas contas.</p>

        <h2 className="display" style={h2}>Valores</h2>
        <p style={{ margin: 0 }}>Os valores mostrados são calculados a partir das views informadas pelas redes e podem mudar até o fechamento do mês pelo gestor. O valor que vale é o registrado em Pagamentos depois do fechamento.</p>

        <h2 className="display" style={h2}>Desconectar e sair</h2>
        <p style={{ margin: 0 }}>Você pode desconectar uma rede a qualquer momento nas configurações dela. Para apagar sua conta e seus dados, escreva para <a href={`mailto:${CONTATO}`} style={{ color: "var(--accent-text)" }}>{CONTATO}</a>. Veja também a <Link href="/privacidade" style={{ color: "var(--accent-text)" }}>Política de Privacidade</Link>.</p>

        <h2 className="display" style={h2}>Contato</h2>
        <p style={{ margin: 0 }}><a href={`mailto:${CONTATO}`} style={{ color: "var(--accent-text)" }}>{CONTATO}</a></p>
      </article>
    </main>
  );
}
