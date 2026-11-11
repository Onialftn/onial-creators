import { describe, expect, it } from "vitest";
import { outrosInstagram, refazerOutrosInstagram, totalGuardado, viewsGanhas } from "./ganho";

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

describe("Instagram: outros conteúdos refeitos no mês inteiro", () => {
  it("alvo subiu: a diferença vai para ontem", () => {
    expect(refazerOutrosInstagram(100_000, 80_000, [{ dia: "2026-11-01", views: 5_000 }])).toEqual({ ontem: 15_000, corrigir: [] });
  });
  it("reels passaram do total: nada em outros", () => {
    expect(refazerOutrosInstagram(100_000, 104_000, [])).toEqual({ ontem: 0, corrigir: [] });
  });
  it("Instagram corrigiu o total para baixo: as views a mais saem dos dias já gravados (caso real de 02/11/2026)", () => {
    // em 03/11 a conta veio 90 mil acima dos reels; hoje os reels já passam do total da conta
    const r = refazerOutrosInstagram(232_265, 236_795, [{ dia: "2026-11-02", views: 90_254 }, { dia: "2026-11-04", views: 67 }]);
    expect(r.ontem).toBe(0);
    expect(r.corrigir).toEqual([{ dia: "2026-11-04", views: 0 }, { dia: "2026-11-02", views: 0 }]);
  });
  it("corte parcial: tira do dia mais recente primeiro e o mês fecha no total da conta", () => {
    const anteriores = [{ dia: "2026-11-02", views: 8_000 }, { dia: "2026-11-05", views: 3_000 }];
    const r = refazerOutrosInstagram(100_000, 94_000, anteriores);
    expect(r).toEqual({ ontem: 0, corrigir: [{ dia: "2026-11-05", views: 0 }, { dia: "2026-11-02", views: 6_000 }] });
    expect(94_000 + 6_000).toBe(100_000);
  });
  it("nunca fica negativo", () => {
    const r = refazerOutrosInstagram(0, 50_000, [{ dia: "2026-11-02", views: 1_000 }]);
    expect(r.corrigir.every((c) => c.views >= 0)).toBe(true);
  });
});

describe("total guardado do vídeo nunca desce", () => {
  it("rede devolveu 0 num dia: guarda o total antigo e não conta nada", () => {
    const guardado = totalGuardado(335_000, 0);
    expect(guardado).toBe(335_000);
    expect(viewsGanhas(335_000, 0, "2026-08-20", "2026-11-08")).toBe(0);
  });
  it("no dia seguinte o total volta: conta só o que cresceu, não o total inteiro (caso real de 09/11/2026)", () => {
    const guardado = totalGuardado(335_000, 0);
    expect(viewsGanhas(guardado, 335_300, "2026-08-20", "2026-11-09")).toBe(300);
  });
  it("total subiu normalmente: guarda o novo", () => {
    expect(totalGuardado(10_000, 10_500)).toBe(10_500);
  });
  it("vídeo visto pela primeira vez: guarda o que veio", () => {
    expect(totalGuardado(null, 4_200)).toBe(4_200);
  });
});
