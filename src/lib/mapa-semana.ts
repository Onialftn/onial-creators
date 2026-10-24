/** Mapa da semana: o gestor escolhe uma vez e vale para todas as semanas seguintes até ele trocar. */
export interface LinhaMapa { criador_id: string; semana: string; mapa: string }

/** Mapa que vale para cada criador na semana (a escolha mais recente feita até essa semana; "" = sem mapa). */
export function mapasVigentes(linhas: LinhaMapa[], semana: string): Map<string, string> {
  const ultimo = new Map<string, LinhaMapa>();
  for (const l of linhas) {
    if (l.semana > semana) continue;
    const atual = ultimo.get(l.criador_id);
    if (!atual || l.semana > atual.semana) ultimo.set(l.criador_id, l);
  }
  return new Map([...ultimo].filter(([, l]) => l.mapa).map(([id, l]) => [id, l.mapa]));
}
