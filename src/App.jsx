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

/**
 * Given a service config from Noting, determine calculation type:
 * 1. q=true, r<1 → Scale (Nº2) with reduction r
 * 2. q=true, r=1, f>0 → Fixed fee (arancel fijo = f)
 * 3. q=true, r=1, f=0 → Gratuito (0€)
 * 4. q=false, f>0 → Fixed fee Nº1 (= f)
 * 5. q=false, f=0 → Doc sin cuantía (30.05€)
 */
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
    case "cuantia": return "Con cuantía (Nº 2)";
    case "fijo": return `Tarifa fija (Nº 1)`;
    case "arancel_fijo": return "Arancel fijo";
    case "sin_cuantia": return "Sin cuantía (Nº 1)";
    case "gratuito": return "Gratuito";
    default: return tipo;
  }
}

function getTipoBadge(tipo) {
  switch (tipo) {
    case "cuantia": return { bg: "#3b599830", color: "#60a5fa", text: "Nº2" };
    case "fijo": return { bg: "#4ade8020", color: "#4ade80", text: "Nº1" };
    case "arancel_fijo": return { bg: "#c9a55a20", color: "#c9a55a", text: "FIJO" };
    case "sin_cuantia": return { bg: "#4ade8020", color: "#4ade80", text: "Nº1" };
    case "gratuito": return { bg: "#6b728020", color: "#9ca3af", text: "0€" };
    default: return { bg: "#1e2433", color: "#9ca3af", text: "?" };
  }
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const S = {
  select: {
    width: "100%", padding: "10px 12px", background: "#0c0e13",
    border: "1px solid #2a2f3e", borderRadius: 8, color: "#e8e6e3",
    fontSize: 14, outline: "none", cursor: "pointer",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  },
  input: {
    width: "100%", padding: "10px 12px", background: "#0c0e13",
    border: "1px solid #2a2f3e", borderRadius: 8, color: "#e8e6e3",
    fontSize: 15, fontFamily: "'IBM Plex Mono', monospace", outline: "none",
  },
  label: { fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 },
  smallInput: {
    width: "100%", padding: "6px 8px", background: "#0c0e13",
    border: "1px solid #1e2433", borderRadius: 4, color: "#9ca3af",
    fontSize: 13, fontFamily: "'IBM Plex Mono'", outline: "none",
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

  // Resolve current selections
  const currentCat = CATEGORIAS_NOTING.find(c => c.id === catId);
  const currentAct = currentCat?.acts.find(a => a.id === actId);
  const hasVariants = currentAct?.v?.length > 0;
  const currentVariant = hasVariants && varIdx >= 0 ? currentAct.v[varIdx] : null;

  // The active service config (either the act itself or the selected variant)
  const activeSvc = currentVariant || (currentAct && !hasVariants ? currentAct : null);
  const tipoCalculo = activeSvc ? getTipoCalculo(activeSvc) : null;

  // Search
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

  // Calculation
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
        r.reduccion_pct = activeSvc.r * 100; // Noting stores as 0.25 → 25%
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

  // Stats
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
    <div style={{ fontFamily: "'IBM Plex Sans', 'SF Pro', system-ui, sans-serif", background: "#0c0e13", color: "#e8e6e3", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #141720 0%, #1a1f2e 100%)", borderBottom: "1px solid #2a2f3e", padding: "20px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                <span style={{ color: "#c9a55a" }}>⚖️</span> Motor Arancelario Notarial
              </h1>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>RD 1426/1989 · Catálogo Noting · {stats.total} servicios · {stats.codes} códigos SIGNO</p>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
              <div style={{ background: "#1e2433", borderRadius: 8, padding: "6px 12px", border: "1px solid #2a2f3e", textAlign: "center" }}>
                <span style={{ color: "#6b7280", fontSize: 10 }}>Servicios</span>
                <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#c9a55a" }}>{stats.total}</span>
              </div>
              <div style={{ background: "#1e2433", borderRadius: 8, padding: "6px 12px", border: "1px solid #2a2f3e", textAlign: "center" }}>
                <span style={{ color: "#6b7280", fontSize: 10 }}>Categorías</span>
                <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: "#4ade80" }}>{stats.cats}</span>
              </div>
            </div>
          </div>

          {/* SEARCH */}
          <div style={{ position: "relative", marginTop: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar servicio... (ej: compraventa, hipoteca, testamento)"
              style={{ ...S.input, fontSize: 14, padding: "10px 14px" }} />
            {searchResults && searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 8,
                maxHeight: 350, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 32px rgba(0,0,0,.5)"
              }}>
                {searchResults.map((sr, i) => (
                  <button key={i} onClick={() => handleSearchSelect(sr)}
                    style={{
                      width: "100%", padding: "10px 14px", background: "transparent",
                      border: "none", borderBottom: "1px solid #2a2f3e20", color: "#e8e6e3",
                      cursor: "pointer", textAlign: "left", fontSize: 13,
                    }}
                    onMouseEnter={e => e.target.style.background = "#2a2f3e40"}
                    onMouseLeave={e => e.target.style.background = "transparent"}>
                    <span style={{ color: "#6b7280", fontSize: 11 }}>{sr.catName} → </span>
                    {sr.name}
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 && search.length >= 2 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 8,
                padding: "16px", marginTop: 4, textAlign: "center", color: "#6b7280", fontSize: 13,
              }}>
                Sin resultados para "{search}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

          {/* LEFT: Dropdowns */}
          <div style={{ flex: "1 1 360px", minWidth: 300 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Dropdown 1: Categoría */}
              <div>
                <label style={S.label}>1. Categoría</label>
                <select value={catId} onChange={e => { setCatId(e.target.value); setActId(""); setVarIdx(-1); }} style={S.select}>
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORIAS_NOTING.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.acts.length})</option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Acto base */}
              {currentCat && (
                <div>
                  <label style={S.label}>2. Concepto notarial <span style={{ color: "#4b5563" }}>({currentCat.acts.length} actos)</span></label>
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

              {/* Dropdown 3: Variante (solo si hay) */}
              {hasVariants && (
                <div>
                  <label style={S.label}>3. Variante <span style={{ color: "#4b5563" }}>({currentAct.v.length} opciones)</span></label>
                  <select value={varIdx} onChange={e => setVarIdx(parseInt(e.target.value))} style={S.select}>
                    <option value={-1}>Seleccionar variante...</option>
                    {currentAct.v.map((v, i) => (
                      <option key={i} value={i}>{v.l}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service info card */}
              {activeSvc && (
                <div style={{ background: "#14161d", borderRadius: 10, border: "1px solid #1e2433", padding: "14px 16px", fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, flex: 1, paddingRight: 8 }}>
                      {displayName}
                    </div>
                    <span style={{
                      fontSize: 10, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap",
                      background: getTipoBadge(tipoCalculo).bg,
                      color: getTipoBadge(tipoCalculo).color,
                    }}>
                      {getTipoBadge(tipoCalculo).text}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", color: "#6b7280" }}>
                    <span>Código SIGNO: <b style={{ color: "#9ca3af" }}>{currentAct?.id}</b></span>
                    <span>Tipo: <b style={{ color: "#9ca3af" }}>{getTipoLabel(tipoCalculo)}</b></span>
                    {activeSvc.r > 0 && activeSvc.r < 1 && (
                      <span>Reducción: <b style={{ color: "#f59e0b" }}>{(activeSvc.r * 100).toFixed(2)}%</b></span>
                    )}
                    {activeSvc.f > 0 && (
                      <span>Tarifa fija: <b style={{ color: "#c9a55a" }}>{fmt(activeSvc.f)} €</b></span>
                    )}
                    <span>IVA: <b style={{ color: "#9ca3af" }}>{activeSvc.iv ? "Sí" : "No"}</b></span>
                    {activeSvc.cl && <span>Clave registral: <b style={{ color: "#9ca3af" }}>{activeSvc.cl}</b></span>}
                    {activeSvc.mp && activeSvc.mp !== "No" && (
                      <span>Medio pago: <b style={{ color: activeSvc.mp === "Si" ? "#f59e0b" : "#9ca3af" }}>{activeSvc.mp === "Si" ? "Obligatorio" : activeSvc.mp === "Op" ? "Opcional" : activeSvc.mp}</b></span>
                    )}
                    {activeSvc.rl && <span>RDL 8/20: <b style={{ color: "#60a5fa" }}>Sí</b></span>}
                    {activeSvc.lf && <span>Lím. folios: <b style={{ color: "#f59e0b" }}>Sí</b></span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Calculator */}
          <div style={{ flex: "1 1 400px", minWidth: 320 }}>
            {!activeSvc ? (
              <div style={{ background: "#14161d", borderRadius: 12, padding: 32, textAlign: "center", border: "1px solid #1e2433" }}>
                <p style={{ color: "#6b7280", fontSize: 14 }}>Selecciona categoría → concepto → variante</p>
                <p style={{ color: "#4b5563", fontSize: 12, marginTop: 8 }}>
                  {stats.total} servicios · {stats.cats} categorías · {stats.codes} códigos SIGNO
                </p>
              </div>
            ) : (
              <div style={{ background: "#14161d", borderRadius: 12, border: "1px solid #1e2433", overflow: "hidden" }}>
                {/* Calculator header */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e2433", background: "#141720" }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#c9a55a" }}>Calculadora</h2>
                </div>

                <div style={{ padding: "16px 18px" }}>
                  {/* Cuantía input (only for scale-based) */}
                  {tipoCalculo === "cuantia" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={S.label}>Cuantía de la operación (€)</label>
                      <input value={inputs.cuantia} onChange={e => setInput("cuantia", e.target.value)}
                        placeholder="Ej: 250.000" style={S.input} />
                    </div>
                  )}

                  {tipoCalculo === "arancel_fijo" && (
                    <div style={{ padding: "10px 14px", background: "#c9a55a10", border: "1px solid #c9a55a30", borderRadius: 8, fontSize: 12, color: "#c9a55a", marginBottom: 14 }}>
                      Arancel fijo legal: {fmt(activeSvc.f)} €. No se calcula por escala.
                    </div>
                  )}

                  {tipoCalculo === "gratuito" && (
                    <div style={{ padding: "10px 14px", background: "#4ade8010", border: "1px solid #4ade8030", borderRadius: 8, fontSize: 12, color: "#4ade80", marginBottom: 14 }}>
                      Este concepto es gratuito (exento de arancel).
                    </div>
                  )}

                  {/* Copies & folios */}
                  <div style={{ paddingTop: 12, borderTop: "1px solid #1e2433" }}>
                    <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>Copias y folios</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        ["folios_matriz", "Folios matriz"],
                        ["copias_aut", "Copias autorizadas"],
                        ["folios_aut", "Folios/copia aut."],
                        ["copias_sim", "Copias simples"],
                        ["folios_sim", "Folios/copia sim."],
                      ].map(([k, label]) => (
                        <div key={k}>
                          <label style={{ fontSize: 10, color: "#4b5563", display: "block", marginBottom: 2 }}>{label}</label>
                          <input type="number" min="0" value={inputs[k]} onChange={e => setInput(k, e.target.value)} style={S.smallInput} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12 }}>
                      <label style={{ color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="checkbox" checked={inputs.incluir_protocolo} onChange={e => setInput("incluir_protocolo", e.target.checked)} /> Protocolo electrónico
                      </label>
                      <label style={{ color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="checkbox" checked={inputs.incluir_timbrado} onChange={e => setInput("incluir_timbrado", e.target.checked)} /> Papel timbrado
                      </label>
                    </div>
                  </div>

                  {/* RESULTS */}
                  {calc && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e2433" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                        {tipoCalculo === "cuantia" && (
                          <>
                            <Row label="Honorarios brutos (Nº 2)" value={calc.honorarios} />
                            {calc.reduccion_pct > 0 && (
                              <Row label={`Reducción (−${calc.reduccion_pct.toFixed(2)}%)`} value={-(calc.honorarios - calc.honorarios_netos)} color="#f59e0b" />
                            )}
                          </>
                        )}
                        {tipoCalculo === "fijo" && <Row label={`Tarifa fija (Nº 1)`} value={calc.honorarios} />}
                        {tipoCalculo === "arancel_fijo" && <Row label="Arancel fijo legal" value={calc.honorarios} />}
                        {tipoCalculo === "sin_cuantia" && <Row label="Doc. sin cuantía (Nº 1)" value={calc.honorarios} />}
                        {tipoCalculo === "gratuito" && <Row label="Gratuito" value={0} />}

                        <Row label="Honorarios netos" value={calc.honorarios_netos} bold />

                        {calc.copias_aut > 0 && <Row label="Copias autorizadas (Nº 4)" value={calc.copias_aut} />}
                        {calc.copias_sim > 0 && <Row label="Copias simples (Nº 4)" value={calc.copias_sim} />}
                        {calc.folios_matriz > 0 && <Row label="Folios de matriz (Nº 7)" value={calc.folios_matriz} />}
                        {calc.protocolo > 0 && <Row label="Protocolo electrónico" value={calc.protocolo} />}
                        {calc.timbrado > 0 && <Row label="Papel timbrado" value={calc.timbrado} />}

                        <div style={{ borderTop: "1px solid #2a2f3e", marginTop: 6, paddingTop: 6 }}>
                          <Row label="Subtotal" value={calc.subtotal} bold />
                          {calc.aplicaIva ? (
                            <Row label={`IVA (${TARIFAS.iva}%)`} value={calc.iva} />
                          ) : (
                            <Row label="IVA" value={0} color="#6b7280" />
                          )}
                          <Row label={`IRPF (−${TARIFAS.irpf}%)`} value={-calc.irpf} color="#f59e0b" />
                        </div>

                        <div style={{ borderTop: "2px solid #c9a55a40", marginTop: 6, paddingTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, color: "#c9a55a" }}>
                            <span>TOTAL</span>
                            <span>{fmt(calc.total)} €</span>
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

function Row({ label, value, bold, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: bold ? 600 : 400, color: color || (bold ? "#e8e6e3" : "#9ca3af") }}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <span>{fmt(value)} €</span>
    </div>
  );
}
