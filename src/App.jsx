import { useState, useMemo, useCallback } from "react";
import { CATEGORIAS_NOTING } from "./notingData";

// ═══════════════════════════════════════════════════════════
// TARIFF SCALES & BASE RATES (RD 1426/1989)
// ═══════════════════════════════════════════════════════════

const ESCALA = [
  { desde: 0, hasta: 6010.12, fijo: 90.15, permil: 0, acum: 0 },
  { desde: 6010.13, hasta: 30050.61, fijo: 0, permil: 4.5, acum: 90.15 },
  { desde: 30050.62, hasta: 60101.21, fijo: 0, permil: 1.5, acum: 198.33 },
  { desde: 60101.22, hasta: 150253.03, fijo: 0, permil: 1.0, acum: 243.41 },
  { desde: 150253.04, hasta: 601012.10, fijo: 0, permil: 0.5, acum: 333.56 },
  { desde: 601012.11, hasta: 6010121.04, fijo: 0, permil: 0.3, acum: 558.94 },
];

const TARIFAS = {
  doc_sin_cuantia: 30.05,
  copia_autorizada_folio: 3.005061,
  copia_autorizada_folio_12: 1.50253,
  copia_simple_folio: 0.601012,
  folio_matriz_desde_5: 6.010121,
  folio_timbrado: 0.15,
  protocolo_electronico: 9.03,
  iva: 21,
  irpf: 15,
};

// ═══════════════════════════════════════════════════════════
// CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════

function calcEscala(cuantia) {
  if (cuantia <= 0) return 0;
  if (cuantia <= 6010.12) return 90.15;
  for (const t of ESCALA) {
    if (cuantia >= t.desde && cuantia <= t.hasta) {
      if (t.fijo) return t.fijo;
      return t.acum + (cuantia - t.desde + 0.01) * (t.permil / 1000);
    }
  }
  const last = ESCALA[ESCALA.length - 1];
  return last.acum + (cuantia - last.desde + 0.01) * (last.permil / 1000);
}

function calcCopiaAut(folios, copias = 1) {
  if (folios <= 0 || copias <= 0) return 0;
  if (folios <= 11) return copias * folios * TARIFAS.copia_autorizada_folio;
  return copias * (11 * TARIFAS.copia_autorizada_folio + (folios - 11) * TARIFAS.copia_autorizada_folio_12);
}

function calcCopiaSim(folios, copias = 1) {
  return copias * folios * TARIFAS.copia_simple_folio;
}

function calcFoliosMatriz(folios) {
  if (folios <= 4) return 0;
  return (folios - 4) * TARIFAS.folio_matriz_desde_5;
}

function fmt(n) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTipoCalculo(svc) {
  if (svc.q) {
    if (svc.r >= 1 && svc.f > 0) return "arancel_fijo";
    if (svc.r >= 1 && svc.f === 0) return "gratuito";
    return "cuantia";
  } else {
    if (svc.f > 0) return "fijo";
    return "sin_cuantia";
  }
}

function getTipoLabel(tipo) {
  switch (tipo) {
    case "cuantia": return "Con cuantia (N\u00ba 2)";
    case "fijo": return "Tarifa fija (N\u00ba 1)";
    case "arancel_fijo": return "Arancel fijo";
    case "sin_cuantia": return "Sin cuantia (N\u00ba 1)";
    case "gratuito": return "Gratuito";
    default: return tipo;
  }
}

function getTipoBadge(tipo) {
  switch (tipo) {
    case "cuantia": return { bg: "#e0ecff", color: "#2563eb", text: "N\u00ba2" };
    case "fijo": return { bg: "#dcfce7", color: "#16a34a", text: "N\u00ba1" };
    case "arancel_fijo": return { bg: "#fef3c7", color: "#b45309", text: "FIJO" };
    case "sin_cuantia": return { bg: "#dcfce7", color: "#16a34a", text: "N\u00ba1" };
    case "gratuito": return { bg: "#f3f4f6", color: "#6b7280", text: "0\u20ac" };
    default: return { bg: "#f3f4f6", color: "#6b7280", text: "?" };
  }
}

// ═══════════════════════════════════════════════════════════
// COLORS & STYLES
// ═══════════════════════════════════════════════════════════

const C = {
  bg: "#f5f3ef",
  white: "#ffffff",
  navy: "#1e293b",
  navyLight: "#334155",
  gold: "#b8860b",
  goldLight: "#d4a853",
  goldBg: "#faf6eb",
  border: "#e2ddd5",
  borderLight: "#ece8e1",
  text: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  accent: "#2563eb",
  green: "#16a34a",
  orange: "#ea580c",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)",
  shadowLg: "0 10px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
};

const S = {
  select: {
    width: "100%", padding: "14px 16px", background: C.white,
    border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.text,
    fontSize: 15, outline: "none", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  input: {
    width: "100%", padding: "14px 16px", background: C.white,
    border: `1.5px solid ${C.border}`, borderRadius: 14, color: C.text,
    fontSize: 16, fontFamily: "'Inter', system-ui, sans-serif", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  label: { fontSize: 13, color: C.textMuted, display: "block", marginBottom: 6, fontWeight: 500 },
  smallInput: {
    width: "100%", padding: "10px 12px", background: C.white,
    border: `1.5px solid ${C.borderLight}`, borderRadius: 10, color: C.text,
    fontSize: 14, fontFamily: "'Inter', system-ui", outline: "none",
    transition: "border-color 0.2s",
  },
  card: {
    background: C.white, borderRadius: 20, border: `1px solid ${C.borderLight}`,
    boxShadow: C.shadowMd, overflow: "hidden",
  },
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [catId, setCatId] = useState("");
  const [actId, setActId] = useState("");
  const [varIdx, setVarIdx] = useState(-1);
  const [search, setSearch] = useState("");
  const [inputs, setInputs] = useState({
    cuantia: "",
    folios_matriz: "8", copias_aut: "1", folios_aut: "6",
    copias_sim: "1", folios_sim: "6",
    incluir_protocolo: true, incluir_timbrado: true,
  });

  const setInput = useCallback((k, v) => setInputs(p => ({ ...p, [k]: v })), []);

  const currentCat = CATEGORIAS_NOTING.find(c => c.id === catId);
  const currentAct = currentCat?.acts.find(a => a.id === actId);
  const hasVariants = currentAct?.v?.length > 0;
  const currentVariant = hasVariants && varIdx >= 0 ? currentAct.v[varIdx] : null;

  const activeSvc = currentVariant || (currentAct && !hasVariants ? currentAct : null);
  const tipoCalculo = activeSvc ? getTipoCalculo(activeSvc) : null;

  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return null;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const results = [];
    for (const cat of CATEGORIAS_NOTING) {
      for (const act of cat.acts) {
        const nameNorm = act.n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameNorm.includes(q)) {
          results.push({ catId: cat.id, catName: cat.name, actId: act.id, name: act.n, hasV: !!act.v });
        }
        if (act.v) {
          for (let i = 0; i < act.v.length; i++) {
            const vn = act.v[i].n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (vn.includes(q) && !nameNorm.includes(q)) {
              results.push({ catId: cat.id, catName: cat.name, actId: act.id, varIdx: i, name: act.v[i].n, hasV: true });
            }
          }
        }
      }
    }
    return results.slice(0, 30);
  }, [search]);

  const calc = useMemo(() => {
    if (!activeSvc) return null;
    const tipo = getTipoCalculo(activeSvc);
    const cuantia = parseFloat(inputs.cuantia?.replace(/\./g, "").replace(",", ".")) || 0;
    const folMat = parseInt(inputs.folios_matriz) || 0;
    const copAut = parseInt(inputs.copias_aut) || 0;
    const folAut = parseInt(inputs.folios_aut) || 0;
    const copSim = parseInt(inputs.copias_sim) || 0;
    const folSim = parseInt(inputs.folios_sim) || 0;

    const r = {
      honorarios: 0, reduccion_pct: 0, honorarios_netos: 0,
      copias_aut: 0, copias_sim: 0, folios_matriz: 0,
      protocolo: 0, timbrado: 0, subtotal: 0, iva: 0, irpf: 0, total: 0,
      aplicaIva: activeSvc.iv,
    };

    switch (tipo) {
      case "cuantia":
        r.honorarios = calcEscala(cuantia);
        r.reduccion_pct = activeSvc.r * 100;
        r.honorarios_netos = r.honorarios * (1 - activeSvc.r);
        break;
      case "arancel_fijo":
        r.honorarios = activeSvc.f;
        r.honorarios_netos = activeSvc.f;
        break;
      case "fijo":
        r.honorarios = activeSvc.f;
        r.honorarios_netos = activeSvc.f;
        break;
      case "sin_cuantia":
        r.honorarios = TARIFAS.doc_sin_cuantia;
        r.honorarios_netos = TARIFAS.doc_sin_cuantia;
        break;
      case "gratuito":
        r.honorarios = 0;
        r.honorarios_netos = 0;
        break;
    }

    r.copias_aut = calcCopiaAut(folAut, copAut);
    r.copias_sim = calcCopiaSim(folSim, copSim);
    r.folios_matriz = calcFoliosMatriz(folMat);
    if (inputs.incluir_protocolo) r.protocolo = TARIFAS.protocolo_electronico;
    if (inputs.incluir_timbrado) r.timbrado = folMat * TARIFAS.folio_timbrado;

    r.subtotal = r.honorarios_netos + r.copias_aut + r.copias_sim + r.folios_matriz + r.protocolo + r.timbrado;
    r.iva = r.aplicaIva ? r.subtotal * TARIFAS.iva / 100 : 0;
    r.irpf = r.subtotal * TARIFAS.irpf / 100;
    r.total = r.subtotal + r.iva - r.irpf;
    return r;
  }, [activeSvc, inputs]);

  const stats = useMemo(() => {
    let total = 0;
    CATEGORIAS_NOTING.forEach(c => c.acts.forEach(a => {
      if (a.v) total += a.v.length; else total++;
    }));
    return { total, cats: CATEGORIAS_NOTING.length, codes: CATEGORIAS_NOTING.reduce((s, c) => s + c.acts.length, 0) };
  }, []);

  const handleSearchSelect = (item) => {
    setCatId(item.catId);
    setActId(item.actId);
    setVarIdx(item.varIdx ?? -1);
    setSearch("");
  };

  const displayName = currentVariant?.n || currentAct?.n || "";

  return (
    <div style={{
      fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
      background: C.bg, color: C.text, minHeight: "100vh",
      boxSizing: "border-box",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)",
        padding: "32px 28px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circle */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 200, height: 200,
          borderRadius: "50%", background: "rgba(184,134,11,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -40, width: 140, height: 140,
          borderRadius: "50%", background: "rgba(184,134,11,0.05)",
        }} />

        <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{
                fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.03em",
                color: "#ffffff",
              }}>
                Motor Arancelario
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "4px 0 0", fontWeight: 400 }}>
                RD 1426/1989 &middot; {stats.total} servicios &middot; {stats.codes} codigos SIGNO
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <StatPill label="Servicios" value={stats.total} color={C.goldLight} />
              <StatPill label="Categorias" value={stats.cats} color="#93c5fd" />
            </div>
          </div>

          {/* SEARCH */}
          <div style={{ position: "relative", marginTop: 20 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar servicio... (ej: compraventa, hipoteca, testamento)"
                style={{
                  width: "100%", padding: "14px 16px 14px 44px",
                  background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
                  border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 16,
                  color: "#ffffff", fontSize: 15, outline: "none",
                  transition: "border-color 0.2s, background 0.2s",
                }} />
            </div>
            {searchResults && searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 100,
                background: C.white, borderRadius: 16,
                maxHeight: 380, overflowY: "auto", boxShadow: C.shadowLg,
                border: `1px solid ${C.borderLight}`,
              }}>
                {searchResults.map((sr, i) => (
                  <button key={i} onClick={() => handleSearchSelect(sr)}
                    style={{
                      width: "100%", padding: "14px 18px", background: "transparent",
                      border: "none", borderBottom: `1px solid ${C.borderLight}`, color: C.text,
                      cursor: "pointer", textAlign: "left", fontSize: 14, fontFamily: "inherit",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.target.style.background = C.goldBg}
                    onMouseLeave={e => e.target.style.background = "transparent"}>
                    <span style={{ color: C.textLight, fontSize: 12 }}>{sr.catName} &rarr; </span>
                    <span style={{ fontWeight: 500 }}>{sr.name}</span>
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 && search.length >= 2 && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
                background: C.white, borderRadius: 16, border: `1px solid ${C.borderLight}`,
                padding: 20, textAlign: "center", color: C.textMuted, fontSize: 14,
                boxShadow: C.shadowLg,
              }}>
                Sin resultados para &ldquo;{search}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 28px 48px" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* LEFT: Selectors */}
          <div style={{ flex: "1 1 360px", minWidth: 300 }}>
            <div style={{ ...S.card, padding: "24px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: C.navy }}>
                Seleccionar concepto
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={S.label}>1. Categoria</label>
                  <select value={catId} onChange={e => { setCatId(e.target.value); setActId(""); setVarIdx(-1); }} style={S.select}>
                    <option value="">Seleccionar categoria...</option>
                    {CATEGORIAS_NOTING.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.acts.length})</option>
                    ))}
                  </select>
                </div>

                {currentCat && (
                  <div>
                    <label style={S.label}>2. Concepto notarial <span style={{ color: C.textLight }}>({currentCat.acts.length} actos)</span></label>
                    <select value={actId} onChange={e => { setActId(e.target.value); setVarIdx(-1); }} style={S.select}>
                      <option value="">Seleccionar concepto...</option>
                      {currentCat.acts.map(a => (
                        <option key={a.id} value={a.id}>
                          [{a.id}] {a.n}{a.v ? ` (${a.v.length} variantes)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {hasVariants && (
                  <div>
                    <label style={S.label}>3. Variante <span style={{ color: C.textLight }}>({currentAct.v.length} opciones)</span></label>
                    <select value={varIdx} onChange={e => setVarIdx(parseInt(e.target.value))} style={S.select}>
                      <option value={-1}>Seleccionar variante...</option>
                      {currentAct.v.map((v, i) => (
                        <option key={i} value={i}>{v.l}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Service info card */}
            {activeSvc && (
              <div style={{ ...S.card, padding: "20px 24px", marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, flex: 1, paddingRight: 12, color: C.navy }}>
                    {displayName}
                  </div>
                  <span style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", fontWeight: 600,
                    background: getTipoBadge(tipoCalculo).bg,
                    color: getTipoBadge(tipoCalculo).color,
                  }}>
                    {getTipoBadge(tipoCalculo).text}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: 13, color: C.textMuted }}>
                  <span>Codigo SIGNO: <b style={{ color: C.text }}>{currentAct?.id}</b></span>
                  <span>Tipo: <b style={{ color: C.text }}>{getTipoLabel(tipoCalculo)}</b></span>
                  {activeSvc.r > 0 && activeSvc.r < 1 && (
                    <span>Reduccion: <b style={{ color: C.orange }}>{(activeSvc.r * 100).toFixed(2)}%</b></span>
                  )}
                  {activeSvc.f > 0 && (
                    <span>Tarifa fija: <b style={{ color: C.gold }}>{fmt(activeSvc.f)} \u20ac</b></span>
                  )}
                  <span>IVA: <b style={{ color: C.text }}>{activeSvc.iv ? "Si" : "No"}</b></span>
                  {activeSvc.cl && <span>Clave registral: <b style={{ color: C.text }}>{activeSvc.cl}</b></span>}
                  {activeSvc.mp && activeSvc.mp !== "No" && (
                    <span>Medio pago: <b style={{ color: activeSvc.mp === "Si" ? C.orange : C.text }}>{activeSvc.mp === "Si" ? "Obligatorio" : activeSvc.mp === "Op" ? "Opcional" : activeSvc.mp}</b></span>
                  )}
                  {activeSvc.rl && <span>RDL 8/20: <b style={{ color: C.accent }}>Si</b></span>}
                  {activeSvc.lf && <span>Lim. folios: <b style={{ color: C.orange }}>Si</b></span>}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Calculator */}
          <div style={{ flex: "1 1 420px", minWidth: 320 }}>
            {!activeSvc ? (
              <div style={{ ...S.card, padding: "48px 32px", textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20, background: C.goldBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: 28,
                }}>
                  <svg width="28" height="28" fill="none" stroke={C.gold} strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
                  </svg>
                </div>
                <p style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
                  Selecciona un concepto
                </p>
                <p style={{ color: C.textLight, fontSize: 14, margin: 0 }}>
                  Categoria &rarr; Concepto &rarr; Variante
                </p>
                <div style={{
                  display: "flex", justifyContent: "center", gap: 20,
                  marginTop: 24, fontSize: 13, color: C.textMuted,
                }}>
                  <span><b style={{ color: C.gold }}>{stats.total}</b> servicios</span>
                  <span><b style={{ color: C.accent }}>{stats.cats}</b> categorias</span>
                  <span><b style={{ color: C.green }}>{stats.codes}</b> codigos</span>
                </div>
              </div>
            ) : (
              <div style={S.card}>
                {/* Calculator header */}
                <div style={{
                  padding: "18px 24px",
                  background: `linear-gradient(135deg, ${C.goldBg} 0%, #fff 100%)`,
                  borderBottom: `1px solid ${C.borderLight}`,
                }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: C.gold }}>
                    Calculadora
                  </h2>
                </div>

                <div style={{ padding: "24px" }}>
                  {tipoCalculo === "cuantia" && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={S.label}>Cuantia de la operacion (\u20ac)</label>
                      <input value={inputs.cuantia} onChange={e => setInput("cuantia", e.target.value)}
                        placeholder="Ej: 250.000" style={{ ...S.input, fontSize: 18, fontWeight: 600 }} />
                    </div>
                  )}

                  {tipoCalculo === "arancel_fijo" && (
                    <div style={{
                      padding: "14px 18px", background: C.goldBg,
                      border: `1.5px solid #e8d5a0`, borderRadius: 14,
                      fontSize: 14, color: C.gold, marginBottom: 20, fontWeight: 500,
                    }}>
                      Arancel fijo legal: {fmt(activeSvc.f)} \u20ac. No se calcula por escala.
                    </div>
                  )}

                  {tipoCalculo === "gratuito" && (
                    <div style={{
                      padding: "14px 18px", background: "#f0fdf4",
                      border: "1.5px solid #bbf7d0", borderRadius: 14,
                      fontSize: 14, color: C.green, marginBottom: 20, fontWeight: 500,
                    }}>
                      Este concepto es gratuito (exento de arancel).
                    </div>
                  )}

                  {/* Copies & folios */}
                  <div style={{ paddingTop: 20, borderTop: `1.5px solid ${C.borderLight}` }}>
                    <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, fontWeight: 600 }}>Copias y folios</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        ["folios_matriz", "Folios matriz"],
                        ["copias_aut", "Copias autorizadas"],
                        ["folios_aut", "Folios/copia aut."],
                        ["copias_sim", "Copias simples"],
                        ["folios_sim", "Folios/copia sim."],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <label style={{ fontSize: 12, color: C.textLight, display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>
                          <input type="number" min="0" value={inputs[k]} onChange={e => setInput(k, e.target.value)} style={S.smallInput} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 13 }}>
                      <label style={{ color: C.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        <input type="checkbox" checked={inputs.incluir_protocolo}
                          onChange={e => setInput("incluir_protocolo", e.target.checked)}
                          style={{ accentColor: C.gold, width: 16, height: 16 }} />
                        Protocolo electronico
                      </label>
                      <label style={{ color: C.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        <input type="checkbox" checked={inputs.incluir_timbrado}
                          onChange={e => setInput("incluir_timbrado", e.target.checked)}
                          style={{ accentColor: C.gold, width: 16, height: 16 }} />
                        Papel timbrado
                      </label>
                    </div>
                  </div>

                  {/* RESULTS */}
                  {calc && (
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1.5px solid ${C.borderLight}` }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                        {tipoCalculo === "cuantia" && (
                          <>
                            <Row label="Honorarios brutos (N\u00ba 2)" value={calc.honorarios} />
                            {calc.reduccion_pct > 0 && (
                              <Row label={`Reduccion (\u2212${calc.reduccion_pct.toFixed(2)}%)`} value={-(calc.honorarios - calc.honorarios_netos)} color={C.orange} />
                            )}
                          </>
                        )}
                        {tipoCalculo === "fijo" && <Row label="Tarifa fija (N\u00ba 1)" value={calc.honorarios} />}
                        {tipoCalculo === "arancel_fijo" && <Row label="Arancel fijo legal" value={calc.honorarios} />}
                        {tipoCalculo === "sin_cuantia" && <Row label="Doc. sin cuantia (N\u00ba 1)" value={calc.honorarios} />}
                        {tipoCalculo === "gratuito" && <Row label="Gratuito" value={0} />}

                        <Row label="Honorarios netos" value={calc.honorarios_netos} bold />

                        {calc.copias_aut > 0 && <Row label="Copias autorizadas (N\u00ba 4)" value={calc.copias_aut} />}
                        {calc.copias_sim > 0 && <Row label="Copias simples (N\u00ba 4)" value={calc.copias_sim} />}
                        {calc.folios_matriz > 0 && <Row label="Folios de matriz (N\u00ba 7)" value={calc.folios_matriz} />}
                        {calc.protocolo > 0 && <Row label="Protocolo electronico" value={calc.protocolo} />}
                        {calc.timbrado > 0 && <Row label="Papel timbrado" value={calc.timbrado} />}

                        <div style={{ borderTop: `1.5px solid ${C.borderLight}`, marginTop: 10, paddingTop: 10 }}>
                          <Row label="Subtotal" value={calc.subtotal} bold />
                          {calc.aplicaIva ? (
                            <Row label={`IVA (${TARIFAS.iva}%)`} value={calc.iva} />
                          ) : (
                            <Row label="IVA" value={0} color={C.textLight} />
                          )}
                          <Row label={`IRPF (\u2212${TARIFAS.irpf}%)`} value={-calc.irpf} color={C.orange} />
                        </div>

                        {/* TOTAL */}
                        <div style={{
                          marginTop: 12, padding: "18px 20px",
                          background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                          borderRadius: 16,
                        }}>
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontSize: 22, fontWeight: 800,
                          }}>
                            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>TOTAL</span>
                            <span style={{ color: C.goldLight }}>{fmt(calc.total)} \u20ac</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.08)", borderRadius: 14,
      padding: "8px 16px", textAlign: "center", backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 500, display: "block" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "4px 0",
      fontWeight: bold ? 700 : 400,
      color: color || (bold ? C.navy : C.textMuted),
    }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500 }}>{fmt(value)} \u20ac</span>
    </div>
  );
}
