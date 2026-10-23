import { describe, expect, it } from "vitest";
import { marcoMeta, videosBombando } from "./avisos";

describe("avisos", () => {
  it("marco da meta", () => {
    expect(marcoMeta(100, null)).toBeNull();
    expect(marcoMeta(399_999, 800_000)).toBeNull();
    expect(marcoMeta(400_000, 800_000)).toBe(50);
    expect(marcoMeta(610_000, 800_000)).toBe(75);
    expect(marcoMeta(730_000, 800_000)).toBe(90);
    expect(marcoMeta(800_000, 800_000)).toBe(100);
  });
  it("vídeo bombando = 2× a média e pelo menos 1.000 views", () => {
    const v = (id: string, views: number) => ({ id, titulo: id, plataforma: "youtube", views });
    const r = videosBombando([v("a", 500), v("b", 600), v("c", 700), v("d", 9000)]);
    expect(r.map((x) => x.id)).toEqual(["d"]);
    expect(videosBombando([v("a", 100), v("b", 120), v("c", 900)])).toEqual([]); // abaixo de 1.000
    expect(videosBombando([v("a", 100), v("b", 5000)])).toEqual([]); // poucos vídeos
  });
});
