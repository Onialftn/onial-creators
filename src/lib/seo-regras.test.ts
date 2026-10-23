import { describe, expect, it } from "vitest";
import { melhoresHorarios, tagsAte500 } from "./seo-regras";

describe("SEO passo a passo", () => {
  it("tags nunca passam de 500 caracteres e não repetem", () => {
    const muitas = Array.from({ length: 80 }, (_, i) => `fortnite mapa de xp ${i}`);
    const t = tagsAte500(["Fortnite", "fortnite", "#xp", ...muitas]);
    expect(t.length).toBeLessThanOrEqual(500);
    expect(t.startsWith("fortnite,xp,")).toBe(true);
    expect(t.split(",").filter((x) => x === "fortnite").length).toBe(1);
  });
  it("melhores horários pela mediana de views (em Brasília)", () => {
    const agora = new Date("2026-10-23T18:00:00Z").getTime();
    const post = (iso: string, views: number) => ({ publicadoEm: iso, views });
    const r = melhoresHorarios([
      post("2026-10-10T21:30:00Z", 50000), post("2026-10-11T21:10:00Z", 40000), post("2026-10-12T20:50:00Z", 45000), // 18h-20h BRT
      post("2026-10-10T12:00:00Z", 5000), post("2026-10-13T12:30:00Z", 6000), post("2026-10-14T13:00:00Z", 4000), // 09h-11h/10h-12h
      post("2026-10-15T21:00:00Z", 60000), post("2026-10-16T12:00:00Z", 3000),
      post("2026-10-23T15:00:00Z", 1), // recente demais: ignorado
    ], agora);
    expect(r.analisados).toBe(8);
    expect(r.suficiente).toBe(true);
    expect(r.faixas[0].faixa).toBe("18h às 20h");
  });
});
