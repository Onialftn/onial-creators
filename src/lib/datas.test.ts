import { describe, expect, it } from "vitest";
import { proximaColeta, quandoFoi } from "./datas";

describe("aviso de atualização", () => {
  const agora = new Date("2026-10-21T17:00:00Z"); // 14:00 em Brasília
  it("mostra hoje, ontem ou a data", () => {
    expect(quandoFoi("2026-10-21T09:12:00Z", agora)).toBe("hoje às 06:12");
    expect(quandoFoi("2026-10-20T09:05:00Z", agora)).toBe("ontem às 06:05");
    expect(quandoFoi("2026-10-18T09:05:00Z", agora)).toBe("18/10 às 06:05");
  });
  it("próxima coleta: hoje antes das 6h, amanhã depois", () => {
    expect(proximaColeta(new Date("2026-10-21T07:00:00Z"))).toBe("hoje entre 6h e 7h"); // 04:00
    expect(proximaColeta(agora)).toBe("amanhã entre 6h e 7h");
  });
});
