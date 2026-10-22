import { describe, expect, it } from "vitest";
import { postagensPorDia } from "./postagens";

const v = (plataforma: string, postado_em: string, id: string | null = Math.random().toString(36).slice(2), titulo = "vídeo") => ({ plataforma, postado_em, id_externo: id, titulo });

describe("dias de postagem automáticos", () => {
  it("mesmo vídeo nas 3 redes no mesmo dia conta 1", () => {
    expect(postagensPorDia([v("youtube", "2026-10-06"), v("tiktok", "2026-10-06"), v("instagram", "2026-10-06")]).get("2026-10-06")).toBe(1);
  });
  it("2 vídeos diferentes na mesma rede no mesmo dia contam 2", () => {
    expect(postagensPorDia([v("youtube", "2026-10-06"), v("youtube", "2026-10-06"), v("tiktok", "2026-10-06")]).get("2026-10-06")).toBe(2);
  });
  it("ignora views lançadas à mão, registro de outros e vídeos sem data real", () => {
    const m = postagensPorDia([v("tiktok", "2026-10-01", null), v("tiktok", "2026-10-01", "https://tiktok.com/x"), v("youtube", "2026-10-01", "__outros__abc"), v("youtube", "2026-10-01", "abc", "Vídeo do YouTube")]);
    expect(m.get("2026-10-01")).toBeUndefined();
  });
});
