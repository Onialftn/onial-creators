/** Mostra um texto com **negrito**, listas com "- " e parágrafos (linhas em branco). */
function Linha({ t }: { t: string }) {
  return <>{t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i} style={{ color: "var(--strong)" }}>{p.slice(2, -2)}</b> : p))}</>;
}

export function TextoSimples({ texto }: { texto: string }) {
  const blocos = texto.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.split("\n").filter((l) => l.trim()));
  return (
    <div className="flex flex-col gap-3" style={{ lineHeight: 1.55 }}>
      {blocos.filter((b) => b.length).map((b, i) => {
        const itens = b.filter((l) => /^\s*[-•*]\s+/.test(l));
        const cabeca = b.filter((l) => !/^\s*[-•*]\s+/.test(l));
        return (
          <div key={i} className="flex flex-col gap-1">
            {cabeca.map((l, j) => <p key={j} style={{ margin: 0 }}><Linha t={l.trim()} /></p>)}
            {itens.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="flex flex-col gap-1">
                {itens.map((l, j) => <li key={j}><Linha t={l.replace(/^\s*[-•*]\s+/, "")} /></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
