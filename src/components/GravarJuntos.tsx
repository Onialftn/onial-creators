"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { aceitarAjuda, cancelarPedido, confirmarGravacao, desistirAjuda, pedirAjuda, responderSugestao, sugerirHorario } from "@/app/(app)/gravar/acoes";
import { DIAS_CURTOS, DIAS_NOMES, diaDaSemana, intervalo, mesAnterior, nomeMes, primeiroDia, somarDias, ultimoDia } from "@/lib/datas";
import { DURACOES, HORARIOS, MAX_AJUDANTES, ajudasConfirmadas, faixaHorario, situacao, type Ajuda, type Pedido, type Situacao, type Sugestao } from "@/lib/gravar";
import { MAPAS } from "@/lib/ia/mapas";
import { BONUS_AJUDA_CENTAVOS, formatarReais } from "@/lib/pagamento";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";

type Pessoa = { id: string; nome: string; foto_url: string | null };
const caixa = { padding: 14, borderRadius: 8, background: "var(--bg)", border: "1px solid var(--line)" } as const;
const proximoMes = (mes: string) => somarDias(ultimoDia(mes), 1).slice(0, 7);
const ROTULO: Record<Situacao, { texto: string; cls: string }> = {
  aberto: { texto: "Precisa de ajuda", cls: "pill-tint" },
  lotado: { texto: "Equipe completa", cls: "pill-ok" },
  confirmar: { texto: "Falta confirmar", cls: "pill-warn" },
  passou: { texto: "Ninguém ajudou", cls: "pill-warn" },
  feito: { texto: "Gravação confirmada", cls: "pill-ok" },
  cancelado: { texto: "Cancelado", cls: "pill-warn" },
};

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} style={{ minHeight: 38, padding: "0 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: `1px solid ${ativo ? "#E8B014" : "var(--line)"}`, background: ativo ? "#E8B014" : "var(--panel)", color: ativo ? "#0A0A0A" : "var(--fg)" }}>
      {children}
    </button>
  );
}

/** Formulário de pedir ajuda num dia. */
function NovoPedido({ dia, aoTerminar }: { dia: string; aoTerminar: (msg: string) => void }) {
  const [hora, setHora] = useState("19:00");
  const [duracao, setDuracao] = useState(45);
  const [vagas, setVagas] = useState(1);
  const [mapa, setMapa] = useState<string>(MAPAS[0].id);
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();
  function enviar() {
    setErro("");
    iniciar(async () => {
      const r = await pedirAjuda({ dia, hora, duracao, vagas, mapa, descricao });
      if (r.erro) setErro(r.erro); else aoTerminar(r.ok ?? "");
    });
  }
  return (
    <div className="flex flex-col gap-3" style={{ ...caixa, borderColor: "#E8B014" }}>
      <b style={{ color: "var(--strong)" }}>Pedir ajuda para gravar</b>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <label className="flex flex-col gap-1"><span className="label">HORÁRIO</span>
          <select className="input" value={hora} onChange={(e) => setHora(e.target.value)}>{HORARIOS.map((h) => <option key={h}>{h}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1"><span className="label">MAPA</span>
          <select className="input" value={mapa} onChange={(e) => setMapa(e.target.value)}>{MAPAS.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nome}</option>)}</select>
        </label>
      </div>
      <div className="flex flex-col gap-1"><span className="label">DURAÇÃO DA SESSÃO</span>
        <div className="flex flex-wrap gap-2">{DURACOES.map((d) => <Chip key={d} ativo={duracao === d} onClick={() => setDuracao(d)}>{d < 60 ? `${d} min` : d === 60 ? "1 hora" : `${d / 60 === 2 ? "2 horas" : "1h30"}`}</Chip>)}</div>
      </div>
      <div className="flex flex-col gap-1"><span className="label">QUANTAS PESSOAS VOCÊ PRECISA</span>
        <div className="flex flex-wrap gap-2">{Array.from({ length: MAX_AJUDANTES }, (_, i) => i + 1).map((n) => <Chip key={n} ativo={vagas === n} onClick={() => setVagas(n)}>{n}</Chip>)}</div>
      </div>
      <label className="flex flex-col gap-1"><span className="label">O QUE VAI GRAVAR</span>
        <textarea className="input" rows={3} maxLength={500} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: preciso de 2 pessoas para um 1v1 de armas personalizadas, com troca de build" style={{ resize: "vertical", paddingTop: 10 }} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-gold" type="button" disabled={enviando} onClick={enviar}>{enviando ? "Enviando..." : "Pedir ajuda"}</button>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>A equipe recebe uma notificação. Cada pessoa que ajudar ganha {formatarReais(BONUS_AJUDA_CENTAVOS)}.</span>
      </div>
      {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)" }}>{erro}</p>}
    </div>
  );
}

/** Formulário de sugerir outro dia e horário. */
function SugerirHorario({ p, hoje, aoTerminar }: { p: Pedido; hoje: string; aoTerminar: (r: { ok?: string; erro?: string }) => void }) {
  const [dia, setDia] = useState(p.dia);
  const [hora, setHora] = useState(p.hora.slice(0, 5));
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-2" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
      <span className="label">SUGERIR OUTRO HORÁRIO</span>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}>
        <input className="input" type="date" min={hoje} value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia" />
        <select className="input" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Horário">{HORARIOS.map((h) => <option key={h}>{h}</option>)}</select>
      </div>
      <input className="input" maxLength={200} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Recado (opcional): ex.: nesse horário eu consigo" />
      <div className="flex flex-wrap gap-2">
        <button className="btn-gold" type="button" disabled={enviando} onClick={() => { setErro(""); iniciar(async () => { const r = await sugerirHorario(p.id, { dia, hora, mensagem }); if (r.erro) setErro(r.erro); else aoTerminar(r); }); }}>{enviando ? "Enviando..." : "Enviar sugestão"}</button>
        <button className="btn-line" type="button" onClick={() => aoTerminar({})}>Voltar</button>
      </div>
      {erro && <p role="alert" style={{ margin: 0, color: "var(--warn)", fontSize: 14 }}>{erro}</p>}
    </div>
  );
}

function CartaoPedido({ p, ajudas, sugestoes, pessoas, eu, hoje, aviso }: { p: Pedido; ajudas: Ajuda[]; sugestoes: Sugestao[]; pessoas: Map<string, Pessoa>; eu: { id: string; gestor: boolean }; hoje: string; aviso: (r: { ok?: string; erro?: string }) => void }) {
  const [sugerindo, setSugerindo] = useState(false);
  const dele = sugestoes.filter((s) => s.pedido_id === p.id);
  const doPedido = ajudas.filter((a) => a.pedido_id === p.id);
  const sit = situacao(p, doPedido.length);
  const dono = pessoas.get(p.criador_id);
  const meu = p.criador_id === eu.id;
  const ajudo = doPedido.some((a) => a.ajudante_id === eu.id);
  const manda = meu || eu.gestor;
  const mapa = MAPAS.find((m) => m.id === p.mapa);
  const [presentes, setPresentes] = useState<string[]>(doPedido.map((a) => a.ajudante_id));
  const [ocupado, iniciar] = useTransition();
  const fazer = (f: () => Promise<{ ok?: string; erro?: string }>) => iniciar(async () => aviso(await f()));

  return (
    <div className="flex flex-col gap-3" style={{ ...caixa, opacity: sit === "cancelado" ? 0.55 : 1, borderColor: meu ? "var(--accent-text)" : "var(--line)" }}>
      <div className="flex items-start gap-3">
        <Avatar foto={dono?.foto_url ?? null} nome={dono?.nome ?? "?"} tamanho={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b style={{ color: "var(--strong)" }}>{meu ? "Você" : dono?.nome ?? "Alguém"}</b>
            <span className={ROTULO[sit].cls}>{ROTULO[sit].texto}</span>
          </div>
          <div className="num" style={{ fontSize: 20, color: "var(--strong)", marginTop: 2 }}>{faixaHorario(p.hora, p.duracao_min)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{mapa ? `${mapa.emoji} ${mapa.nome}` : p.mapa} · {p.duracao_min} min</div>
        </div>
      </div>
      {p.descricao && <p style={{ margin: 0, lineHeight: 1.45, color: "var(--fg)" }}>{p.descricao}</p>}

      <div className="flex flex-wrap items-center gap-2" style={{ fontSize: 13 }}>
        <span style={{ color: "var(--muted)" }}>Ajudantes: {doPedido.length} de {p.vagas}</span>
        {doPedido.map((a) => {
          const pe = pessoas.get(a.ajudante_id);
          return <span key={a.ajudante_id} className="flex items-center gap-1.5" style={{ padding: "3px 8px 3px 3px", borderRadius: 20, border: "1px solid var(--line)", textDecoration: p.status === "feito" && !a.presente ? "line-through" : undefined }}><Avatar foto={pe?.foto_url ?? null} nome={pe?.nome ?? "?"} tamanho={22} />{a.ajudante_id === eu.id ? "Você" : pe?.nome.split(" ")[0]}</span>;
        })}
        {Array.from({ length: Math.max(0, p.vagas - doPedido.length) }, (_, i) => sit === "aberto" && <span key={i} style={{ width: 28, height: 28, borderRadius: 14, border: "1px dashed var(--line)" }} />)}
      </div>

      {sit === "confirmar" && manda && (
        <div className="flex flex-col gap-2" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          <span style={{ fontSize: 13, color: "var(--fg)" }}>A gravação aconteceu? Marque quem ajudou de verdade: cada um ganha {formatarReais(BONUS_AJUDA_CENTAVOS)}.</span>
          {doPedido.map((a) => (
            <label key={a.ajudante_id} className="flex items-center gap-2" style={{ minHeight: 36 }}>
              <input type="checkbox" checked={presentes.includes(a.ajudante_id)} onChange={(e) => setPresentes((l) => (e.target.checked ? [...l, a.ajudante_id] : l.filter((x) => x !== a.ajudante_id)))} style={{ width: 18, height: 18, accentColor: "#E8B014" }} />
              {pessoas.get(a.ajudante_id)?.nome ?? "?"}
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button className="btn-gold" type="button" disabled={ocupado} onClick={() => fazer(() => confirmarGravacao(p.id, presentes))}><Icone nome="check" tamanho={16} />Confirmar gravação</button>
            <button className="btn-line" type="button" disabled={ocupado} onClick={() => fazer(() => cancelarPedido(p.id))}>Não aconteceu</button>
          </div>
        </div>
      )}
      {sit === "confirmar" && !manda && ajudo && <span style={{ fontSize: 13, color: "var(--muted)" }}>Esperando {dono?.nome.split(" ")[0] ?? "quem pediu"} confirmar para o bônus entrar.</span>}
      {sit === "feito" && ajudo && <span style={{ fontSize: 13, color: doPedido.find((a) => a.ajudante_id === eu.id)?.presente ? "var(--ok)" : "var(--warn)" }}>{doPedido.find((a) => a.ajudante_id === eu.id)?.presente ? `+${formatarReais(BONUS_AJUDA_CENTAVOS)} no seu total do mês` : "Você não foi marcado como presente nessa gravação."}</span>}

      {dele.length > 0 && sit !== "cancelado" && sit !== "feito" && (
        <div className="flex flex-col gap-2" style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          <span className="label">HORÁRIOS SUGERIDOS</span>
          {dele.map((s) => {
            const quem = pessoas.get(s.criador_id);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2" style={{ fontSize: 14 }}>
                <Avatar foto={quem?.foto_url ?? null} nome={quem?.nome ?? "?"} tamanho={24} />
                <span className="flex-1" style={{ minWidth: 180 }}>
                  <b style={{ color: "var(--strong)" }}>{s.criador_id === eu.id ? "Você" : quem?.nome.split(" ")[0]}</b> sugeriu <b style={{ color: "var(--strong)" }}>{s.dia.slice(8)}/{s.dia.slice(5, 7)} às {s.hora.slice(0, 5)}</b>
                  {s.mensagem && <span style={{ color: "var(--muted)" }}> · “{s.mensagem}”</span>}
                </span>
                {manda && (sit === "aberto" || sit === "lotado") ? (
                  <span className="flex gap-2">
                    <button className="btn-gold" type="button" disabled={ocupado} style={{ minHeight: 34, fontSize: 13 }} onClick={() => fazer(() => responderSugestao(s.id, true))}>Aceitar</button>
                    <button className="btn-line" type="button" disabled={ocupado} style={{ minHeight: 34, fontSize: 13 }} onClick={() => fazer(() => responderSugestao(s.id, false))}>Recusar</button>
                  </span>
                ) : s.criador_id === eu.id ? <span style={{ color: "var(--muted)", fontSize: 13 }}>Esperando resposta</span> : null}
              </div>
            );
          })}
        </div>
      )}

      {sugerindo && <SugerirHorario p={p} hoje={hoje} aoTerminar={(r) => { setSugerindo(false); if (r.ok || r.erro) aviso(r); }} />}

      {(sit === "aberto" || sit === "lotado") && !sugerindo && (
        <div className="flex flex-wrap gap-2">
          {!meu && !ajudo && sit === "aberto" && <button className="btn-gold" type="button" disabled={ocupado} onClick={() => fazer(() => aceitarAjuda(p.id))}><Icone nome="users" tamanho={16} />Vou ajudar (+{formatarReais(BONUS_AJUDA_CENTAVOS)})</button>}
          {ajudo && <button className="btn-line" type="button" disabled={ocupado} onClick={() => fazer(() => desistirAjuda(p.id))}>Não vou poder</button>}
          {!meu && <button className="btn-line" type="button" disabled={ocupado} onClick={() => setSugerindo(true)}><Icone nome="cal" tamanho={16} />Sugerir outro horário</button>}
          {manda && <button className="btn-line" type="button" disabled={ocupado} onClick={() => fazer(() => cancelarPedido(p.id))}>Cancelar pedido</button>}
        </div>
      )}
    </div>
  );
}

export function GravarJuntos({ mes, hoje, diaInicial, eu, pedidos, ajudas, sugestoes, pessoas: lista }: { mes: string; hoje: string; diaInicial: string | null; eu: { id: string; gestor: boolean }; pedidos: Pedido[]; ajudas: Ajuda[]; sugestoes: Sugestao[]; pessoas: Pessoa[] }) {
  const inicial = diaInicial && diaInicial.startsWith(mes) ? diaInicial : hoje.startsWith(mes) ? hoje : primeiroDia(mes);
  const [dia, setDia] = useState(inicial);
  const [criando, setCriando] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({});
  useEffect(() => { setDia(inicial); setCriando(false); }, [inicial]);
  const pessoas = useMemo(() => new Map(lista.map((p) => [p.id, p])), [lista]);
  const ativos = pedidos.filter((p) => p.status !== "cancelado");
  const doDia = pedidos.filter((p) => p.dia === dia).sort((a, b) => a.hora.localeCompare(b.hora));
  const minhas = ajudasConfirmadas(pedidos, ajudas, eu.id, mes);
  const meusAbertos = ativos.filter((p) => p.criador_id === eu.id && situacao(p, ajudas.filter((a) => a.pedido_id === p.id).length) === "confirmar").length;

  // calendário de segunda a domingo
  const dias = intervalo(primeiroDia(mes), ultimoDia(mes));
  const vazios = diaDaSemana(dias[0]) === 0 ? 6 : diaDaSemana(dias[0]) - 1;
  const nomeDia = (d: string) => { const s = diaDaSemana(d); return `${DIAS_NOMES[s === 0 ? 6 : s - 1]}, ${d.slice(8)}/${d.slice(5, 7)}`; };

  return (
    <>
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Você ajudou em {nomeMes(mes).split(" ")[0].toLowerCase()}</div>
          <div className="num" style={{ fontSize: 30, color: "var(--ok)", marginTop: 4 }}>+{formatarReais(minhas * BONUS_AJUDA_CENTAVOS)}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{minhas} {minhas === 1 ? "gravação confirmada" : "gravações confirmadas"} · entra no seu total do mês</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Pedidos da equipe no mês</div>
          <div className="num" style={{ fontSize: 30, color: "var(--strong)", marginTop: 4 }}>{ativos.length}</div>
          <div style={{ color: meusAbertos ? "var(--warn)" : "var(--muted)", fontSize: 13 }}>{meusAbertos ? `Você tem ${meusAbertos} ${meusAbertos === 1 ? "gravação" : "gravações"} para confirmar` : "Toque num dia para ver ou pedir ajuda"}</div>
        </div>
      </section>

      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))" }}>
        <section className="card flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/gravar?mes=${mesAnterior(mes)}`} className="btn-line" aria-label="Mês anterior" style={{ minHeight: 38, padding: "0 12px" }}>‹</Link>
            <h2 className="num" style={{ margin: 0, fontSize: 22, color: "var(--strong)" }}>{nomeMes(mes)}</h2>
            <Link href={`/gravar?mes=${proximoMes(mes)}`} className="btn-line" aria-label="Próximo mês" style={{ minHeight: 38, padding: "0 12px" }}>›</Link>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
            {DIAS_CURTOS.map((d) => <div key={d} className="label text-center" style={{ fontSize: 11 }}>{d}</div>)}
            {Array.from({ length: vazios }, (_, i) => <div key={`v${i}`} />)}
            {dias.map((d) => {
              const doD = ativos.filter((p) => p.dia === d);
              const precisa = doD.some((p) => situacao(p, ajudas.filter((a) => a.pedido_id === p.id).length) === "aberto");
              const sel = d === dia;
              const passado = d < hoje;
              return (
                <button key={d} type="button" onClick={() => { setDia(d); setCriando(false); setMsg({}); }} aria-pressed={sel} aria-label={`${nomeDia(d)}${doD.length ? `, ${doD.length} ${doD.length === 1 ? "pedido" : "pedidos"}` : ""}`}
                  className="flex flex-col items-center justify-start gap-1"
                  style={{ minHeight: 58, padding: "6px 2px", borderRadius: 8, border: `1px solid ${sel ? "#E8B014" : d === hoje ? "var(--accent-text)" : "var(--line)"}`, background: sel ? "var(--tint)" : "var(--bg)", opacity: passado && !doD.length ? 0.45 : 1 }}>
                  <span className="num" style={{ fontSize: 16, color: d === hoje ? "var(--accent-text)" : "var(--strong)" }}>{Number(d.slice(8))}</span>
                  {doD.length > 0 && (
                    <span className="flex flex-wrap justify-center gap-0.5">
                      {doD.slice(0, 3).map((p) => <span key={p.id} style={{ width: 7, height: 7, borderRadius: 4, background: p.status === "feito" ? "var(--ok)" : precisa ? "#E8B014" : "var(--muted)" }} />)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3" style={{ fontSize: 12, color: "var(--muted)" }}>
            <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 4, background: "#E8B014" }} />Precisa de ajuda</span>
            <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--muted)" }} />Equipe completa</span>
            <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--ok)" }} />Gravação feita</span>
          </div>
        </section>

        <section className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="num" style={{ margin: 0, fontSize: 20, color: "var(--strong)" }}>{nomeDia(dia)}</h2>
            {dia >= hoje && !criando && <button className="btn-gold" type="button" onClick={() => { setCriando(true); setMsg({}); }} style={{ minHeight: 38 }}><Icone nome="plus" tamanho={16} />Pedir ajuda neste dia</button>}
          </div>
          {msg.ok && <p style={{ margin: 0, color: "var(--ok)" }}>{msg.ok}</p>}
          {msg.erro && <p role="alert" style={{ margin: 0, color: "var(--warn)" }}>{msg.erro}</p>}
          {criando && <NovoPedido dia={dia} aoTerminar={(m) => { setCriando(false); setMsg({ ok: m }); }} />}
          {doDia.length === 0 && !criando && <p style={{ margin: 0, color: "var(--muted)" }}>{dia < hoje ? "Nenhuma gravação nesse dia." : "Ninguém pediu ajuda nesse dia ainda."}</p>}
          {doDia.map((p) => <CartaoPedido key={p.id} p={p} ajudas={ajudas} sugestoes={sugestoes} pessoas={pessoas} eu={eu} hoje={hoje} aviso={setMsg} />)}
        </section>
      </div>
    </>
  );
}
