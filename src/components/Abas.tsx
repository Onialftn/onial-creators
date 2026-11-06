"use client";
import { Children, useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";

export type Aba = { id: string; rotulo: string; icone?: string };

/**
 * Abinhas no topo de uma página comprida: mostra um painel por vez para não ter que descer a página.
 * Cada filho é o painel de uma aba, na mesma ordem de `abas`.
 * A aba escolhida fica no endereço (#id), e links para um trecho de dentro de uma aba (ex.: #historico, #pagamentos)
 * abrem a aba certa sozinhos.
 */
export function Abas({ abas, children }: { abas: Aba[]; children: React.ReactNode }) {
  const paineis = Children.toArray(children);
  const [ativa, setAtiva] = useState<string | undefined>(abas[0]?.id);
  const raiz = useRef<HTMLDivElement>(null);

  // no celular as abas rolam para o lado: deixa a aba escolhida inteira à vista (só rola a fila de abas, não a página)
  function mostrarAba(id: string) {
    const fila = raiz.current?.querySelector<HTMLElement>("[role=tablist]");
    const botao = document.getElementById(`aba-${id}`);
    if (!fila || !botao) return;
    const esq = botao.offsetLeft - fila.offsetLeft;
    if (esq < fila.scrollLeft) fila.scrollLeft = esq;
    else if (esq + botao.offsetWidth > fila.scrollLeft + fila.clientWidth) fila.scrollLeft = esq + botao.offsetWidth - fila.clientWidth;
  }

  useEffect(() => {
    const seguirEndereco = () => {
      const alvo = decodeURIComponent(location.hash.slice(1));
      if (!alvo) return;
      if (abas.some((a) => a.id === alvo)) {
        setAtiva(alvo);
        return mostrarAba(alvo);
      }
      // trecho de dentro de uma aba: abre a aba dele e rola até ele
      const el = document.getElementById(alvo);
      const painel = el?.closest<HTMLElement>("[data-aba]");
      if (!el || !painel || !raiz.current?.contains(painel)) return;
      setAtiva(painel.dataset.aba);
      if (painel.dataset.aba) mostrarAba(painel.dataset.aba);
      requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    };
    seguirEndereco();
    window.addEventListener("hashchange", seguirEndereco);
    return () => window.removeEventListener("hashchange", seguirEndereco);
  }, [abas]);

  function escolher(id: string) {
    setAtiva(id);
    history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
    mostrarAba(id);
  }

  // setas do teclado trocam de aba (padrão de acessibilidade para abas)
  function teclado(e: React.KeyboardEvent, i: number) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const prox = abas[(i + passo + abas.length) % abas.length];
    escolher(prox.id);
    document.getElementById(`aba-${prox.id}`)?.focus();
  }

  return (
    <div ref={raiz} className="flex flex-col" style={{ gap: 18 }}>
      <div role="tablist" aria-label="Partes desta página" className="abas">
        {abas.map((a, i) => (
          <button key={a.id} id={`aba-${a.id}`} type="button" role="tab" aria-selected={ativa === a.id} aria-controls={`painel-${a.id}`} tabIndex={ativa === a.id ? 0 : -1} className={`aba ${ativa === a.id ? "aba-on" : ""}`} onClick={() => escolher(a.id)} onKeyDown={(e) => teclado(e, i)}>
            {a.icone && <Icone nome={a.icone} tamanho={16} />}
            {a.rotulo}
          </button>
        ))}
      </div>
      {abas.map((a, i) => (
        <div key={a.id} id={`painel-${a.id}`} role="tabpanel" aria-labelledby={`aba-${a.id}`} data-aba={a.id} hidden={ativa !== a.id} className="flex flex-col" style={{ gap: 24 }}>
          {paineis[i]}
        </div>
      ))}
    </div>
  );
}

/** Junta vários quadros num painel só de uma aba (o <>...</> se desfaz ao passar da página para as abas). */
export function Grupo({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col" style={{ gap: 24 }}>{children}</div>;
}
