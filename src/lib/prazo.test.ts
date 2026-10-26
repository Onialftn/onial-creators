import { describe, expect, it } from "vitest";
import { janelaExtra } from "./prazo";

describe("vídeo extra: vale só no dia escolhido (24h)", () => {
  it("antes, no dia e depois", () => {
    expect(janelaExtra("2026-10-31", "2026-10-26")).toEqual({ fase: "antes", texto: "Vale só sábado, 31/10, das 00:00 às 23:59", detalhe: "começa em 5 dias" });
    expect(janelaExtra("2026-10-31", "2026-10-30").detalhe).toBe("começa amanhã");
    expect(janelaExtra("2026-10-31", "2026-10-31").fase).toBe("hoje");
    expect(janelaExtra("2026-10-31", "2026-11-01").fase).toBe("passou");
  });
});
