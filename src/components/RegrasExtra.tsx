/** Regras do vídeo extra (uma por linha), escritas pelo gestor. */
export function Regras({ texto }: { texto: string }) {
  const linhas = texto.split(/\n+/).map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
  if (!linhas.length) return null;
  return (
    <div className="flex flex-col gap-1.5" style={{ padding: "10px 12px", borderRadius: 6, background: "var(--panel)", border: "1px solid var(--line2)" }}>
      <span className="label" style={{ color: "var(--accent-text)" }}>REGRAS</span>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5, color: "var(--fg)" }}>
        {linhas.map((l, i) => <li key={i}>{l}</li>)}
      </ol>
    </div>
  );
}
