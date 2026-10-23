import { describe, expect, it } from "vitest";
import { maisFrequentes, notaPalavraChave, notaTitulo, palavras } from "./seo-nota";

describe("SEO", () => {
  it("palavras sem acento e sem palavras vazias", () => {
    expect(palavras("O MELHOR mapa de XP do Fortnite 🔥 #shorts")).toEqual(["melhor", "mapa"]);
  });
  it("mais frequentes", () => {
    expect(maisFrequentes(["xp", "mapa", "xp", "farm", "xp", "mapa"], 2)).toEqual([{ item: "xp", qtd: 3 }, { item: "mapa", qtd: 2 }]);
  });
  it("nota da palavra-chave: muita procura e pouca concorrência é melhor", () => {
    const boa = notaPalavraChave(20000, 2000);
    const ruim = notaPalavraChave(50, 5_000_000);
    expect(boa.nota).toBeGreaterThan(ruim.nota);
    expect(boa.procura).toBe("alta");
    expect(ruim.concorrencia).toBe("alta");
  });
  it("nota do título", () => {
    const bom = notaTitulo("Farm de XP mais rápido do Fortnite: 15 níveis 🔥", "farm de xp", ["farm", "niveis"]);
    expect(bom.nota).toBe(100);
    const ruim = notaTitulo("OLHA ISSO 😱😱😱", "farm de xp", ["farm"]);
    expect(ruim.nota).toBeLessThan(30);
    expect(notaTitulo("", "x").nota).toBe(0);
  });
});
