import { marcarReposicao } from "@/app/acoes/reposicoes";
import type { FaltaParaRepor } from "@/lib/dados";
import { DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { TituloCard } from "./Blocos";

const diaBr = (d: string) => `${DIAS_CURTOS[diaDaSemana(d) - 1].toLowerCase()}, ${d.split("-").reverse().slice(0, 2).join("/")}`;
const somar = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Aba Dias de postagem: faltas do mês e a reposição com data marcada (pedido do gestor).
 * O criador escolhe um dia até 7 dias depois da falta (sem passar do fim do mês) e posta 1 vídeo a mais nele.
 */
export function ReporFaltas({ faltas, hoje, diasDePostagem }: { faltas: FaltaParaRepor[]; hoje: string; diasDePostagem: number[] }) {
  if (!faltas.length) return null;
  return (
    <section id="repor" className="card flex flex-col gap-3" style={{ scrollMarginTop: 80 }}>
      <TituloCard icone="reset">Repor faltas</TituloCard>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
        Perdeu um dia de postagem? Marque um dia, até 7 dias depois da falta (sem passar do fim do mês), e poste 1 vídeo a mais nele. Depois de marcado não dá para trocar: se não postar no dia marcado, a falta fica.
      </p>
      <div className="flex flex-col gap-2">
        {faltas.map((x) => {
          const min = [hoje, somar(x.falta, 1)].sort()[1];
          const dobra = x.dia ? diasDePostagem.includes(diaDaSemana(x.dia)) : false;
          return (
            <div key={x.falta} className="tile flex flex-wrap items-center gap-3" style={{ borderColor: x.situacao === "perdida" ? "var(--falta-line)" : x.situacao === "reposta" ? "var(--ok-line)" : "var(--ouro)" }}>
              <span className="flex flex-col" style={{ minWidth: 150 }}>
                <span style={{ color: "var(--strong)", fontWeight: 600, fontSize: 14 }}>Falta em {diaBr(x.falta)}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {x.situacao === "pode_marcar" && `Marque até ${diaBr(x.prazo)}`}
                  {x.situacao === "marcada" && `Repor em ${diaBr(x.dia!)}: ${dobra ? "poste 2 vídeos nesse dia (é dia de postagem)" : "poste 1 vídeo nesse dia"}`}
                  {x.situacao === "reposta" && `Reposta em ${diaBr(x.dia!)}`}
                  {x.situacao === "perdida" && (x.dia ? `Não postou em ${diaBr(x.dia)}: virou falta` : "O prazo acabou sem marcar: virou falta")}
                </span>
              </span>
              {x.situacao === "pode_marcar" && (
                <form action={marcarReposicao} className="flex flex-wrap items-center gap-2" style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="falta" value={x.falta} />
                  <label className="sr-only" htmlFor={`dia-${x.falta}`}>Dia para repor</label>
                  <input id={`dia-${x.falta}`} className="input" type="date" name="dia" required min={min} max={x.prazo} defaultValue={min} style={{ width: 170 }} />
                  <button className="btn-gold" type="submit">Marcar reposição</button>
                </form>
              )}
              {x.situacao === "marcada" && <span className="pill-warn" style={{ marginLeft: "auto" }}>Marcada</span>}
              {x.situacao === "reposta" && <span className="pill-ok" style={{ marginLeft: "auto" }}>Reposta</span>}
              {x.situacao === "perdida" && <span className="pill-warn" style={{ marginLeft: "auto", color: "var(--falta)", background: "var(--falta-bg)" }}>Falta</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
