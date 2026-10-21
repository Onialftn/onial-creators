const P: Record<string, React.ReactNode> = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  wallet: <><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 7l12-3v3M17 14h2" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z" />,
  script: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>,
  wave: <path d="M2 12h2M6 8v8M10 4v16M14 7v10M18 10v4M22 12h0" />,
  video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></>,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.5.5 4 2.5 4 5.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  zz: <path d="M4 7h6l-6 8h6M14 4h6l-6 8h6" />,
  crown: <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  reset: <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />,
  stats: <path d="M4 20V14M9 20V9M14 20V12M19 20V5" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  play: <path d="M7 4l13 8-13 8z" />,
};

export function Icone({ nome, tamanho = 20, className }: { nome: keyof typeof P | string; tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={{ flex: "none" }}>
      {P[nome]}
    </svg>
  );
}

const LOGOS = {
  tiktok: { bg: "#000", borda: true, svg: <path d="M14 3v11a4 4 0 1 1-4-4M14 3c0 3 2 5 5 5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" /> },
  youtube: { bg: "#FF0000", borda: false, svg: <path d="M8 5l12 7-12 7z" fill="#fff" /> },
  instagram: { bg: "linear-gradient(45deg,#FFB020,#FF3B6B,#9B3DFF)", borda: false, svg: <><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth={2} /><circle cx="12" cy="12" r="3.5" fill="none" stroke="#fff" strokeWidth={2} /></> },
} as const;
export const NOME_PLATAFORMA = { tiktok: "TikTok", youtube: "YouTube", instagram: "Instagram" } as const;
export const COR_PLATAFORMA = { tiktok: "#25F4EE", youtube: "#FF4D4D", instagram: "#E05BD8" } as const;

export function LogoPlataforma({ p, tamanho = 28 }: { p: keyof typeof LOGOS; tamanho?: number }) {
  const l = LOGOS[p];
  return (
    <span style={{ width: tamanho, height: tamanho, borderRadius: 6, background: l.bg, border: l.borda ? "1px solid var(--line2)" : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }} title={NOME_PLATAFORMA[p]}>
      <svg width={tamanho * 0.57} height={tamanho * 0.57} viewBox="0 0 24 24" aria-hidden="true">{l.svg}</svg>
    </span>
  );
}
