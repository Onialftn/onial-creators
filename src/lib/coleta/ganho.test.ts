import { describe, expect, it } from "vitest";
import { outrosInstagram, viewsGanhas } from "./ganho";

describe("views ganhas no dia", () => {
  it("vídeo acompanhado: diferença entre os totais", () => {
    expect(viewsGanhas(10_000, 13_500, "2026-10-01", "2026-10-20")).toBe(3_500);
  });
  it("rede recontou para baixo: não fica negativo", () => {
    expect(viewsGanhas(10_000, 9_800, "2026-10-01", "2026-10-20")).toBe(0);
  });
  it("vídeo novo, postado no dia: conta tudo", () => {
    expect(viewsGanhas(null, 42_000, "2026-10-20", "2026-10-20")).toBe(42_000);
  });
  it("vídeo antigo visto pela primeira vez: só marca o ponto de partida", () => {
    expect(viewsGanhas(null, 900_000, "2026-08-10", "2026-10-20")).toBe(0);
  });
});

describe("Instagram: outros conteúdos no mês acumulado", () => {
  it("o que a conta tem a mais que os reels vai para outros", () => {
    expect(outrosInstagram(100_000, 80_000, 5_000)).toBe(15_000);
  });
  it("reels medidos num horário diferente passaram do total: não grava nada (e não conta a mais)", () => {
    expect(outrosInstagram(100_000, 104_000, 0)).toBe(0);
  });
  it("dia com reels a mais seguido de dia com reels a menos: o mês fecha no total da conta", () => {
    // dia 1: conta 50 mil, reels 60 mil (horários diferentes) → outros 0
    const d1 = outrosInstagram(50_000, 60_000, 0);
    // dia 2: conta acumulada 100 mil, reels acumulados 90 mil → outros 10 mil (o jeito antigo somaria 40 mil)
    const d2 = outrosInstagram(100_000, 90_000, d1);
    expect(d1).toBe(0);
    expect(d2).toBe(10_000);
    expect(90_000 + d1 + d2).toBe(100_000);
  });
});
