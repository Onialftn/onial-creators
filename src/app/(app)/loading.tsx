/** Aparece na hora em que se clica no menu, enquanto a página busca os dados. */
export default function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div style={{ height: 34, width: 260, borderRadius: 6, background: "var(--panel)", border: "1px solid var(--line)" }} className="animate-pulse" />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="card animate-pulse" style={{ height: 110 }} />)}
      </div>
      <div className="card animate-pulse" style={{ height: 220 }} />
    </div>
  );
}
