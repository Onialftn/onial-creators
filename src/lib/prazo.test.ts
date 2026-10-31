import { describe, expect, it } from "vitest";
import { extrasPorDia, janelaExtra, ordemDoExtra, quandoExtra } from "./prazo";

describe("vídeo extra: vale só no dia escolhido (24h)", () => {
  it("antes, no dia e depois", () => {
    expect(janelaExtra("2026-10-31", "2026-10-26")).toEqual({ fase: "antes", texto: "Vale só sábado, 31/10, das 00:00 às 23:59", detalhe: "começa em 5 dias" });
    expect(janelaExtra("2026-10-31", "2026-10-30").detalhe).toBe("começa amanhã");
    expect(janelaExtra("2026-10-31", "2026-10-31").fase).toBe("hoje");
    expect(janelaExtra("2026-10-31", "2026-11-01").fase).toBe("passou");
  });
});

describe("extrasPorDia", () => {
  const x = (prazo: string, titulo: string, valor_centavos = 100) => ({ prazo, titulo, valor_centavos });
  it("agrupa por dia: futuros do mais perto, depois passados do mais recente", () => {
    const g = extrasPorDia([x("2026-11-02", "A"), x("2026-10-29", "B"), x("2026-11-01", "C"), x("2026-10-30", "D")], "2026-10-31");
    expect(g.map((d) => d.dia)).toEqual(["2026-11-01", "2026-11-02", "2026-10-30", "2026-10-29"]);
  });
  it("ordena 1º, 2º, 3º vídeo dentro do dia", () => {
    const g = extrasPorDia([x("2026-11-01", "Vídeo 3° vídeo"), x("2026-11-01", "Vídeo 1º vídeo"), x("2026-11-01", "Vídeo 2° vídeo")], "2026-10-31");
    expect(g[0].extras.map((e) => ordemDoExtra(e))).toEqual([1, 2, 3]);
  });
  it("diz quando é", () => {
    expect(quandoExtra("2026-11-01", "2026-10-31")).toBe("Amanhã");
    expect(quandoExtra("2026-10-31", "2026-10-31")).toBe("Hoje");
    expect(quandoExtra("2026-11-03", "2026-10-31")).toBe("em 3 dias");
  });
});
