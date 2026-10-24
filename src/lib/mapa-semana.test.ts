import { describe, expect, it } from "vitest";
import { mapasVigentes } from "./mapa-semana";

describe("mapa da semana", () => {
  const linhas = [
    { criador_id: "ana", semana: "2026-10-05", mapa: "1v1" },
    { criador_id: "ana", semana: "2026-10-19", mapa: "aim" },
    { criador_id: "bia", semana: "2026-10-12", mapa: "1v1" },
    { criador_id: "bia", semana: "2026-10-19", mapa: "" },
  ];
  it("vale a última escolha até a semana, para sempre até trocar", () => {
    expect(mapasVigentes(linhas, "2026-10-12").get("ana")).toBe("1v1");
    expect(mapasVigentes(linhas, "2026-11-30").get("ana")).toBe("aim");
  });
  it("tirar o mapa vale daquela semana em diante", () => {
    expect(mapasVigentes(linhas, "2026-10-12").get("bia")).toBe("1v1");
    expect(mapasVigentes(linhas, "2026-10-26").has("bia")).toBe(false);
  });
});
