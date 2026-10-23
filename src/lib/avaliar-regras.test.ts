import { describe, expect, it } from "vitest";
import { TAMANHO_PARTE, normalizarAvaliacao, notaGeral, partesDe, segundos } from "./avaliar-regras";

describe("Avaliar vídeo", () => {
  it("divide o vídeo em partes de 40 MiB", () => {
    expect(partesDe(1000)).toBe(1);
    expect(partesDe(TAMANHO_PARTE)).toBe(1);
    expect(partesDe(TAMANHO_PARTE + 1)).toBe(2);
    expect(TAMANHO_PARTE % (8 * 1024 * 1024)).toBe(0);
  });
  it("nota geral é a média ponderada (gancho pesa mais)", () => {
    const tudo = (n: number) => ({ nota: n, comentario: "" });
    expect(notaGeral({ gancho: tudo(10), video: tudo(10), som: tudo(10), edicao: tudo(10), chamada: tudo(10) })).toBe(100);
    expect(notaGeral({ gancho: tudo(0), video: tudo(10), som: tudo(10), edicao: tudo(10), chamada: tudo(10) })).toBe(70);
  });
  it("arruma a resposta da IA", () => {
    const a = normalizarAvaliacao({ criterios: { gancho: { nota: 14, comentario: " ok " } }, melhorias: [{ tempo: "0:05", dica: "Corte" }, { tempo: "agora", dica: "Legenda" }, { dica: "" }], pontos_fortes: ["a", "b", "c", "d"] });
    expect(a.criterios.gancho).toEqual({ nota: 10, comentario: "ok" });
    expect(a.criterios.som.nota).toBe(0);
    expect(a.melhorias).toEqual([{ tempo: "0:05", dica: "Corte" }, { tempo: "", dica: "Legenda" }]);
    expect(a.pontos_fortes).toHaveLength(3);
    expect(a.nota).toBe(30);
    expect(segundos("1:05")).toBe(65);
  });
});
