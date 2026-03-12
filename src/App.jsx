import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  testimonio_base: 3.01,
  diligencia_base: 3.01,
  diligencia_inscripcion: 6.01,
  iva: 21,
  irpf: 15,
};

// ═══════════════════════════════════════════════════════════
// ARANCELARIOS ADICIONALES — CATÁLOGO
// ═══════════════════════════════════════════════════════════

const DOCS_ADICIONALES = [
  { id: "apod_tramit", n: "Apoderamiento para tramitación", coste: 30.05 },
  { id: "req_art106", n: "Requerimiento comunicación art.106.1.b LHL", coste: 36.06 },
];

const TESTIMONIOS = [
  { id: "cert_catastral", n: "Certificación catastral", folios: 3 },
  { id: "cert_energetica", n: "Certificación energética", folios: 3 },
  { id: "cons_titular_real", n: "Consulta de titular real", folios: 1 },
  { id: "cons_ibi", n: "Consulta relativa al pago del IBI", folios: 1 },
  { id: "ficha_liq_trib", n: "Ficha notarial liquidación tributaria", folios: 1 },
  { id: "nota_simple", n: "Nota simple", folios: 2 },
  { id: "otros_test", n: "Otros testimonios", folios: 1 },
  { id: "otros_test_cotejo", n: "Otros testimonios de cotejo", folios: 0 },
  { id: "solic_info_reg", n: "Solicitud información registral", folios: 1 },
  { id: "test_cotejo_pe", n: "Testimonio cotejo protocolo electrónico", folios: 0 },
  { id: "test_recibo_ibi", n: "Testimonio del recibo del IBI", folios: 1 },
  { id: "test_facult_repr", n: "Testimonio facultades representativas", folios: 0 },
  { id: "test_hash", n: "Testimonio HASH", folios: 0 },
  { id: "verif_csv", n: "Verificación CSV documento electrónico", folios: 2 },
  { id: "test_medio_pago", n: "Testimonio de medio de pago", folios: 0, especial: true },
];

const DILIGENCIAS = [
  { id: "dil_envio_rc", n: "Diligencia de envío de copia al Registro Civil", coste: 3.01 },
  { id: "dil_pres_telem", n: "Diligencia de presentación telemática art. 249", coste: 3.01 },
  { id: "dil_recep_asiento", n: "Diligencia de recepción de asiento presentación", coste: 3.01 },
  { id: "dil_recep_catastro", n: "Diligencia de recepción de Catastro", coste: 3.01 },
  { id: "dil_recep_pres_telem", n: "Diligencia de recepción de la presentación telemática", coste: 3.01 },
  { id: "dil_recep_ayto", n: "Diligencia de recepción del justif. del Ayuntamiento", coste: 3.01 },
  { id: "dil_recep_registro", n: "Diligencia de recepción del justif. del Registro", coste: 3.01 },
  { id: "dil_deposito_pe", n: "Diligencia depósito protocolo electrónico", coste: 3.01 },
  { id: "dil_incorp_pe", n: "Diligencia incorporación prot. electrónico", coste: 3.01 },
  { id: "dil_incorp_dep_cotejo", n: "Diligencia incorporación, depósito y cotejo P.E.", coste: 3.01 },
  { id: "dil_envio_catastro", n: "Diligencia por envío de copia al Catastro", coste: 3.01 },
  { id: "dil_envio_ayto", n: "Diligencia por envío de copia Ayuntamiento", coste: 3.01 },
  { id: "dil_inscripcion", n: "Diligencia relativa a la inscripción", coste: 6.01 },
  { id: "dil_otras", n: "Otras diligencias", coste: 3.01 },
];

function calcTestimonio(t, folios) {
  if (t.especial) return folios * TARIFAS.copia_autorizada_folio;
  return TARIFAS.testimonio_base + folios * TARIFAS.copia_simple_folio;
}

// ═══════════════════════════════════════════════════════════
// GASTOS Y SUPLIDOS — CATÁLOGO
// ═══════════════════════════════════════════════════════════

const GASTOS_EXTERNOS = [
  { id: "g_afeccion_fiscal", n: "Afección fiscal", coste: 3 },
  { id: "g_cancelacion_fiscal", n: "Cancelación fiscal", coste: 3 },
  { id: "g_cert_const_energ", n: "Cert. constancia cert. energética", coste: 6 },
  { id: "g_cert_pres_telem", n: "Cert. pres telemática documento", coste: 12 },
  { id: "g_cert_militar", n: "Certificado militar", coste: 50 },
  { id: "g_cert_seguro_vida", n: "Certificado r seguro vida", coste: 20 },
  { id: "g_cert_ult_volunt", n: "Certificado ultimas voluntades", coste: 20 },
  { id: "g_const_idufir", n: "Constancia código idufir", coste: 9 },
  { id: "g_const_coord_catas", n: "Constancia estado coord. catas.", coste: 24 },
  { id: "g_const_ref_catastral", n: "Constancia referencia catastral", coste: 24 },
  { id: "g_consulta_rm", n: "Consulta al registro mercantil", coste: 20 },
  { id: "g_consulta_deudas", n: "Consulta de deudas", coste: 15 },
  { id: "g_consulta_nif", n: "Consulta NIF revocado", coste: 4 },
  { id: "g_consulta_valor_ref", n: "Consulta valor referencia", coste: 15 },
  { id: "g_elab_estatutos", n: "Elaboración de estatutos", coste: 60 },
  { id: "g_elab_instancias", n: "Elaboración de instancias", coste: 60 },
  { id: "g_gestion_impuestos", n: "Gestión de impuestos", coste: 20 },
  { id: "g_gestion_plusvalias", n: "Gestión de plusvalías", coste: 20 },
  { id: "g_incr_anejo", n: "Incr. anejo solarium", coste: 3 },
  { id: "g_nota_marg_energ", n: "Nota marginal cert. energética", coste: 9 },
  { id: "g_obt_cert_seguros", n: "Obtención cert. registro seguros", coste: 20 },
  { id: "g_obt_cert_catastral", n: "Obtención certificado catastral", coste: 20 },
  { id: "g_obt_cert_rauv", n: "Obtención certificados del rauv", coste: 20 },
  { id: "g_otros_gastos", n: "Otros gastos", coste: 40, editable: true },
  { id: "g_peticion_nota", n: "Petición de nota", coste: 15 },
  { id: "g_pres_fax", n: "Presentación por fax", coste: 15 },
  { id: "g_pres_telematica", n: "Presentación telemática", coste: 15 },
  { id: "g_solicitud_cif", n: "Solicitud de CIF", coste: 30 },
  { id: "g_solicitud_denom", n: "Solicitud denominación RMC", coste: 30 },
  { id: "g_tramit_copia_plusv", n: "Tramitación copia plusvalía", coste: 0, editable: true },
  { id: "g_tramit_sti", n: "Tramitación STI", coste: 0, editable: true },
  { id: "g_varios", n: "Varios", coste: 20, editable: true },
];

const SUPLIDOS_CAT = [
  { id: "s_na_octava", n: "Nª Octava", coste: 1.80 },
  { id: "s_correos", n: "Correos", coste: 10 },
  { id: "s_otros_suplidos", n: "Otros suplidos", coste: 10, editable: true },
  { id: "s_pago_signo", n: "Pago por uso plataforma SIGNO (ANCERT)", coste: 0, editable: true },
  { id: "s_taxi", n: "Taxi", coste: 10 },
];

const TIPOS_INTERVINIENTE = [
  "Poderdante", "Apoderado", "Concedente/Consentidor", "Albacea/Contador",
  "Hijos", "Letrado", "Testigos", "Causante", "Invitado", "Menor",
  "Socio", "Requerido", "Sociedad Creada",
];

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
    case "cuantia": return "Con cuantía (Nº 2)";
    case "fijo": return "Tarifa fija (Nº 1)";
    case "arancel_fijo": return "Arancel fijo";
    case "sin_cuantia": return "Sin cuantía (Nº 1)";
    case "gratuito": return "Gratuito";
    default: return tipo;
  }
}

// ═══════════════════════════════════════════════════════════
// INITIAL STATE BUILDERS
// ═══════════════════════════════════════════════════════════

const DEFAULT_ARANC = ["test_cotejo_pe", "test_hash", "dil_deposito_pe", "dil_incorp_pe"];
const DEFAULT_ARANC_FOLIOS = { test_cotejo_pe: 4 };
const DEFAULT_GASTOS = ["g_consulta_deudas", "g_obt_cert_catastral", "g_otros_gastos", "g_peticion_nota", "g_pres_telematica", "g_solicitud_cif"];
const DEFAULT_SUPLIDOS = ["s_pago_signo", "s_na_octava"];

function buildInitialAranc(withDefaults = false) {
  const state = {};
  DOCS_ADICIONALES.forEach(d => { state[d.id] = { checked: false }; });
  TESTIMONIOS.forEach(t => { state[t.id] = { checked: false, folios: t.folios }; });
  DILIGENCIAS.forEach(d => { state[d.id] = { checked: false }; });
  if (withDefaults) {
    DEFAULT_ARANC.forEach(id => { if (state[id]) { state[id].checked = true; if (DEFAULT_ARANC_FOLIOS[id] !== undefined) state[id].folios = DEFAULT_ARANC_FOLIOS[id]; } });
  }
  return state;
}

function buildInitialGastosSuplidos(withDefaults = false) {
  const gastos = {};
  GASTOS_EXTERNOS.forEach(g => { gastos[g.id] = { checked: false, coste: g.coste }; });
  const suplidos = {};
  SUPLIDOS_CAT.forEach(s => { suplidos[s.id] = { checked: false, coste: s.coste }; });
  if (withDefaults) {
    DEFAULT_GASTOS.forEach(id => { if (gastos[id]) gastos[id].checked = true; });
    DEFAULT_SUPLIDOS.forEach(id => { if (suplidos[id]) suplidos[id].checked = true; });
  }
  return { gastos, suplidos };
}

// ═══════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════

const PRESETS = {
  compraventa: {
    label: "Compraventa",
    match: (id) => id?.startsWith("0501"),
    aranc: ["cert_catastral","cert_energetica","cons_titular_real","cons_ibi","ficha_liq_trib","nota_simple","test_medio_pago","test_recibo_ibi","verif_csv","dil_pres_telem","dil_recep_asiento","dil_recep_catastro","dil_recep_ayto","dil_recep_registro","dil_deposito_pe","dil_incorp_pe","dil_envio_catastro","dil_envio_ayto","dil_inscripcion"],
    gastos: ["g_cert_const_energ","g_cert_pres_telem","g_const_idufir","g_const_coord_catas","g_const_ref_catastral","g_consulta_valor_ref","g_gestion_impuestos","g_gestion_plusvalias","g_nota_marg_energ","g_obt_cert_catastral","g_peticion_nota","g_pres_telematica"],
    suplidos: ["s_na_octava","s_correos"],
  },
  hipoteca: {
    label: "Hipoteca",
    match: (id) => id?.startsWith("12"),
    aranc: ["cert_catastral","cons_titular_real","nota_simple","test_medio_pago","verif_csv","dil_pres_telem","dil_recep_asiento","dil_recep_registro","dil_deposito_pe","dil_incorp_pe","dil_inscripcion"],
    gastos: ["g_cert_pres_telem","g_const_idufir","g_const_ref_catastral","g_consulta_valor_ref","g_peticion_nota","g_pres_telematica"],
    suplidos: ["s_na_octava","s_correos"],
  },
  testamento: {
    label: "Testamento",
    match: (id) => id?.startsWith("02"),
    aranc: ["dil_deposito_pe","dil_incorp_pe"],
    gastos: [], suplidos: [],
  },
  sociedad: {
    label: "Sociedad",
    match: (id) => id?.startsWith("19"),
    aranc: ["dil_pres_telem","dil_recep_asiento","dil_recep_registro","dil_deposito_pe","dil_incorp_pe"],
    gastos: ["g_cert_pres_telem","g_consulta_rm","g_elab_estatutos","g_solicitud_cif","g_solicitud_denom","g_pres_telematica"],
    suplidos: ["s_na_octava"],
  },
};

function detectPreset(actId) {
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (preset.match(actId)) return key;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

* { box-sizing: border-box; margin: 0; }
body { margin: 0; background: #f5f5f4; }

.app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #f5f5f4;
  color: #1c1917;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── HEADER BAR ── */
.header-bar {
  background: #1e293b;
  border-bottom: 2px solid #92702a;
  padding: 16px 24px;
  color: #f1f5f9;
}
.header-inner { max-width: 1280px; margin: 0 auto; }
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.header-fields {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.header-field { flex: 1; min-width: 180px; }
.header-field.wide { flex: 2.5; min-width: 280px; }

/* ── INPUTS ── */
.sel {
  width: 100%;
  padding: 9px 14px;
  padding-right: 32px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%2394a3b8'%3E%3Cpath d='M5 7L0 2h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.15s;
}
.sel:focus { border-color: rgba(251,191,36,0.6); }
.sel:disabled { opacity: 0.35; cursor: not-allowed; }

.sel-light {
  background: #fff;
  border: 1px solid #d6d3d1;
  color: #1c1917;
  border-radius: 8px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23a8a29e'%3E%3Cpath d='M5 7L0 2h10z'/%3E%3C/svg%3E");
}
.sel-light:focus { border-color: #92702a; box-shadow: 0 0 0 2px rgba(146,112,42,0.12); }

.inp {
  width: 100%;
  padding: 9px 14px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.inp:focus { border-color: rgba(251,191,36,0.6); }
.inp::placeholder { color: rgba(255,255,255,0.3); }

.inp-light {
  background: #fff;
  border: 1px solid #d6d3d1;
  color: #1c1917;
}
.inp-light:focus { border-color: #92702a; box-shadow: 0 0 0 2px rgba(146,112,42,0.12); }
.inp-light::placeholder { color: #a8a29e; }

.inp-mono { font-family: 'JetBrains Mono', monospace; }

.inp-sm {
  padding: 6px 8px;
  font-size: 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  color: #57534e;
  background: #fff;
  border: 1px solid #e7e5e4;
  width: 100%;
  outline: none;
}
.inp-sm:focus { border-color: #92702a; }

.lbl {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}
.lbl-dark { color: #78716c; }

/* ── CARDS ── */
.card {
  background: #fff;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── LAYOUT ── */
.layout {
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.col-left {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.col-right {
  width: 360px;
  flex-shrink: 0;
  position: sticky;
  top: 18px;
}

/* ── FACTURA PANEL ── */
.factura {
  background: #fff;
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.factura-header {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 12px 18px;
  border-bottom: 1px solid #e7d9a0;
}
.factura-body { padding: 14px 18px; }
.factura-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 12.5px;
  color: #78716c;
}
.factura-row.highlight { color: #1c1917; font-weight: 600; }
.factura-row .val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  text-align: right;
  min-width: 80px;
}
.factura-divider {
  height: 1px;
  background: #e7e5e4;
  margin: 6px 0;
}
.factura-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 4px;
  border-top: 2px solid #92702a;
  margin-top: 8px;
}
.factura-total .lbl-total {
  font-size: 15px;
  font-weight: 800;
  color: #78560e;
  letter-spacing: -0.01em;
}
.factura-total .val-total {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 800;
  color: #78560e;
  letter-spacing: -0.02em;
}

/* ── BUTTONS ── */
.btn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  border: none;
}
.btn-ghost {
  background: rgba(255,255,255,0.15);
  color: #e2e8f0;
  border: 1px solid rgba(255,255,255,0.2);
}
.btn-ghost:hover { background: rgba(255,255,255,0.25); color: #f1f5f9; }

.btn-accent {
  background: rgba(251,191,36,0.25);
  color: #fbbf24;
  border: 1px solid rgba(251,191,36,0.4);
}
.btn-accent:hover { background: rgba(251,191,36,0.35); }

.btn-block {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-copy {
  background: #f5f5f4;
  color: #78716c;
  border: 1px solid #e7e5e4;
}
.btn-copy:hover { background: #e7e5e4; color: #1c1917; }
.btn-copy.copied {
  background: #d1fae5;
  color: #065f46;
  border-color: #a7f3d0;
}
.btn-limpiar {
  background: transparent;
  color: #a8a29e;
  border: 1px solid #e7e5e4;
}
.btn-limpiar:hover { color: #57534e; border-color: #d6d3d1; }

/* ── COLLAPSIBLE ── */
.collapse-btn {
  width: 100%;
  padding: 13px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1c1917;
  font-family: inherit;
}
.collapse-title {
  font-size: 11px;
  font-weight: 600;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.collapse-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 100px;
  font-weight: 600;
}

/* ── CHECK ROWS ── */
.ck-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  transition: opacity 0.1s;
}
.ck-row input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: #92702a;
}

/* ── BADGE ── */
.badge-tipo {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* ── SEARCH ── */
.search-drop {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #d6d3d1;
  border-radius: 10px;
  max-height: 320px;
  overflow-y: auto;
  margin-top: 4px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.12);
}
.search-item {
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f5f5f4;
  color: #1c1917;
  cursor: pointer;
  text-align: left;
  font-size: 12.5px;
  font-family: inherit;
}
.search-item:hover { background: #fafaf9; }
.search-item:last-child { border-bottom: none; }

.mono { font-family: 'JetBrains Mono', monospace; }
.sep { height: 1px; background: #e7e5e4; margin: 8px 0; }

/* ── INTERVINIENTES TABLE ── */
.interv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.interv-table th {
  text-align: left;
  font-size: 9px;
  font-weight: 600;
  color: #a8a29e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 4px 6px;
  white-space: nowrap;
}
.interv-table td {
  padding: 3px 4px;
  vertical-align: middle;
}
.interv-table tr:not(:last-child) td {
  border-bottom: 1px solid #f5f5f4;
}
.interv-inp {
  width: 100%;
  padding: 5px 7px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid #e7e5e4;
  border-radius: 5px;
  background: #fff;
  color: #1c1917;
  outline: none;
}
.interv-inp:focus { border-color: #92702a; }
.interv-sel {
  width: 100%;
  padding: 5px 7px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid #e7e5e4;
  border-radius: 5px;
  background: #fff;
  color: #1c1917;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' fill='%23a8a29e'%3E%3Cpath d='M4 6L0 1.5h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 20px;
}
.interv-sel:focus { border-color: #92702a; }
.btn-remove {
  background: none;
  border: none;
  color: #d6d3d1;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}
.btn-remove:hover { color: #ef4444; background: rgba(239,68,68,0.06); }
.btn-add-interv {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  background: #f5f5f4;
  border: 1px dashed #d6d3d1;
  border-radius: 6px;
  color: #78716c;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  margin-top: 8px;
}
.btn-add-interv:hover { background: #e7e5e4; color: #1c1917; border-color: #a8a29e; }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .layout { flex-direction: column; }
  .col-right { width: 100%; position: static; }
  .header-fields { flex-direction: column; }
  .header-field, .header-field.wide { min-width: 0; flex: 1 1 100%; }
}
`;

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
    base_minutable: "",
    folios_matriz: "4", copias_aut: "1", folios_aut: "4",
    copias_sim: "1", folios_sim: "4",
    copias_elec_aut: "0", folios_elec_aut: "0",
    copias_elec_sim: "0", folios_elec_sim: "0",
    descuento: "0",
  });
  const [baseManual, setBaseManual] = useState(false);
  const [matrizElectronica, setMatrizElectronica] = useState(false);
  const [valorRefCatastral, setValorRefCatastral] = useState("");
  const [ley11_2023, setLey11_2023] = useState(false);
  const [aranc, setAranc] = useState(buildInitialAranc);
  const [arancOpen, setArancOpen] = useState(false);
  const [gsState, setGsState] = useState(() => buildInitialGastosSuplidos());
  const [gsOpen, setGsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [intervinientes, setIntervinientes] = useState([]);
  const [intervOpen, setIntervOpen] = useState(false);
  const [nProtocolo, setNProtocolo] = useState("");
  const [estado, setEstado] = useState("Prevista");
  const [customAranc, setCustomAranc] = useState([]);
  const [customGastos, setCustomGastos] = useState([]);
  const [customSuplidos, setCustomSuplidos] = useState([]);
  const [addingTo, setAddingTo] = useState(null);
  const [newItem, setNewItem] = useState({ nombre: "", coste: "" });

  const addCustomItem = useCallback((section) => {
    if (!newItem.nombre.trim()) return;
    const item = { id: Date.now(), nombre: newItem.nombre.trim(), coste: parseFloat(newItem.coste) || 0 };
    if (section === "aranc") setCustomAranc(p => [...p, item]);
    else if (section === "gastos") setCustomGastos(p => [...p, item]);
    else if (section === "suplidos") setCustomSuplidos(p => [...p, item]);
    setAddingTo(null);
    setNewItem({ nombre: "", coste: "" });
  }, [newItem]);
  const removeCustomItem = useCallback((section, id) => {
    if (section === "aranc") setCustomAranc(p => p.filter(i => i.id !== id));
    else if (section === "gastos") setCustomGastos(p => p.filter(i => i.id !== id));
    else if (section === "suplidos") setCustomSuplidos(p => p.filter(i => i.id !== id));
  }, []);

  const addInterviniente = useCallback(() => {
    setIntervinientes(p => [...p, { id: Date.now(), tipo: "Poderdante", dni: "", nombre: "", apellidos: "", nr: false }]);
    setIntervOpen(true);
  }, []);
  const removeInterviniente = useCallback((id) => setIntervinientes(p => p.filter(i => i.id !== id)), []);
  const updateInterviniente = useCallback((id, field, value) => setIntervinientes(p => p.map(i => i.id === id ? { ...i, [field]: value } : i)), []);

  const setInput = useCallback((k, v) => {
    setInputs(p => {
      const next = { ...p, [k]: v };
      // Auto-sync base_minutable from cuantía unless manually edited
      if (k === "cuantia" && !baseManual) next.base_minutable = v;
      return next;
    });
    if (k === "base_minutable") setBaseManual(true);
  }, [baseManual]);
  const resyncBase = useCallback(() => { setBaseManual(false); setInputs(p => ({ ...p, base_minutable: p.cuantia })); }, []);
  const toggleAranc = useCallback((id) => setAranc(p => ({ ...p, [id]: { ...p[id], checked: !p[id].checked } })), []);
  const setArancFolios = useCallback((id, folios) => setAranc(p => ({ ...p, [id]: { ...p[id], folios: parseInt(folios) || 0 } })), []);
  const toggleGasto = useCallback((id) => setGsState(p => ({ ...p, gastos: { ...p.gastos, [id]: { ...p.gastos[id], checked: !p.gastos[id].checked } } })), []);
  const setGastoCoste = useCallback((id, coste) => setGsState(p => ({ ...p, gastos: { ...p.gastos, [id]: { ...p.gastos[id], coste: parseFloat(coste) || 0 } } })), []);
  const toggleSuplido = useCallback((id) => setGsState(p => ({ ...p, suplidos: { ...p.suplidos, [id]: { ...p.suplidos[id], checked: !p.suplidos[id].checked } } })), []);
  const setSuplidoCoste = useCallback((id, coste) => setGsState(p => ({ ...p, suplidos: { ...p.suplidos, [id]: { ...p.suplidos[id], coste: parseFloat(coste) || 0 } } })), []);

  const currentCat = CATEGORIAS_NOTING.find(c => c.id === catId);
  const currentAct = currentCat?.acts.find(a => a.id === actId);
  const hasVariants = currentAct?.v?.length > 0;
  const currentVariant = hasVariants && varIdx >= 0 ? currentAct.v[varIdx] : null;
  const activeSvc = currentVariant || (currentAct && !hasVariants ? currentAct : null);
  const tipoCalculo = activeSvc ? getTipoCalculo(activeSvc) : null;

  const prevActiveSvcRef = useRef(null);
  useEffect(() => {
    if (activeSvc && activeSvc !== prevActiveSvcRef.current) {
      setAranc(buildInitialAranc(true));
      setGsState(buildInitialGastosSuplidos(true));
      setArancOpen(true);
      setGsOpen(true);
    }
    prevActiveSvcRef.current = activeSvc;
  }, [activeSvc]);

  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return null;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const results = [];
    for (const cat of CATEGORIAS_NOTING) {
      for (const act of cat.acts) {
        const nameNorm = act.n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nameNorm.includes(q)) results.push({ catId: cat.id, catName: cat.name, actId: act.id, name: act.n });
        if (act.v) {
          for (let i = 0; i < act.v.length; i++) {
            const vn = act.v[i].n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (vn.includes(q) && !nameNorm.includes(q)) results.push({ catId: cat.id, catName: cat.name, actId: act.id, varIdx: i, name: act.v[i].n });
          }
        }
      }
    }
    return results.slice(0, 25);
  }, [search]);

  const arancTotals = useMemo(() => {
    let suma = 0, count = 0;
    DOCS_ADICIONALES.forEach(d => { if (aranc[d.id]?.checked) { suma += d.coste; count++; } });
    TESTIMONIOS.forEach(t => { if (aranc[t.id]?.checked) { suma += calcTestimonio(t, aranc[t.id].folios || 0); count++; } });
    DILIGENCIAS.forEach(d => { if (aranc[d.id]?.checked) { suma += d.coste; count++; } });
    customAranc.forEach(c => { suma += c.coste; count++; });
    return { suma, count };
  }, [aranc, customAranc]);

  const gsTotals = useMemo(() => {
    let gastos = 0, gc = 0;
    GASTOS_EXTERNOS.forEach(g => { if (gsState.gastos[g.id]?.checked) { gastos += gsState.gastos[g.id].coste; gc++; } });
    customGastos.forEach(c => { gastos += c.coste; gc++; });
    let suplidos = 0, sc = 0;
    SUPLIDOS_CAT.forEach(s => { if (gsState.suplidos[s.id]?.checked) { suplidos += gsState.suplidos[s.id].coste; sc++; } });
    customSuplidos.forEach(c => { suplidos += c.coste; sc++; });
    return { gastos, suplidos, gastosCount: gc, suplidosCount: sc, total: gastos + suplidos, count: gc + sc };
  }, [gsState, customGastos, customSuplidos]);

  const calc = useMemo(() => {
    if (!activeSvc) return null;
    const tipo = getTipoCalculo(activeSvc);
    const baseMin = parseFloat(inputs.base_minutable?.replace(/\./g, "").replace(",", ".")) || 0;
    const folMat = parseInt(inputs.folios_matriz) || 0;
    const copAut = parseInt(inputs.copias_aut) || 0;
    const folAut = parseInt(inputs.folios_aut) || 0;
    const copSim = parseInt(inputs.copias_sim) || 0;
    const folSim = parseInt(inputs.folios_sim) || 0;
    const copElecAut = parseInt(inputs.copias_elec_aut) || 0;
    const folElecAut = parseInt(inputs.folios_elec_aut) || 0;
    const copElecSim = parseInt(inputs.copias_elec_sim) || 0;
    const folElecSim = parseInt(inputs.folios_elec_sim) || 0;
    const descPct = Math.min(100, Math.max(0, parseFloat(inputs.descuento) || 0));
    const r = { honorarios: 0, honorarios_brutos_ref: 0, reduccion_pct: 0, reduccion_total_pct: 0, honorarios_netos: 0, copias_aut: 0, copias_sim: 0, copias_elec_aut: 0, copias_elec_sim: 0, folios_matriz: 0, arancelarios_adicionales: 0, derechos: 0, descuento_pct: descPct, descuento_importe: 0, gastos: 0, suplidos: 0, base_iva: 0, iva: 0, derechos_exentos: 0, base_irpf: 0, irpf: 0, total: 0, liquido: 0, aplicaIva: activeSvc.iv };
    switch (tipo) {
      case "cuantia":
        r.honorarios = calcEscala(baseMin);
        r.reduccion_pct = activeSvc.r * 100;
        r.reduccion_total_pct = (1 - (1 - activeSvc.r) * 0.95) * 100;
        r.honorarios_netos = r.honorarios * (1 - activeSvc.r) * 0.95;
        break;
      case "arancel_fijo": r.honorarios = activeSvc.f; r.honorarios_netos = activeSvc.f; break;
      case "fijo": r.honorarios = activeSvc.f; r.honorarios_netos = activeSvc.f; break;
      case "sin_cuantia": r.honorarios = TARIFAS.doc_sin_cuantia; r.honorarios_netos = TARIFAS.doc_sin_cuantia; break;
      case "gratuito": r.honorarios = 0; r.honorarios_netos = 0; break;
    }
    r.copias_aut = calcCopiaAut(folAut, copAut);
    r.copias_sim = calcCopiaSim(folSim, copSim);
    r.copias_elec_aut = calcCopiaAut(folElecAut, copElecAut);
    r.copias_elec_sim = calcCopiaSim(folElecSim, copElecSim);
    if (matrizElectronica && folMat > 4) {
      r.folios_matriz = (folMat - 4) * 2 * TARIFAS.copia_autorizada_folio;
    } else {
      r.folios_matriz = calcFoliosMatriz(folMat);
    }
    r.arancelarios_adicionales = arancTotals.suma;
    // Honorario bruto referencia (sin reducción) for display
    r.honorarios_brutos_ref = r.honorarios + r.copias_aut + r.copias_sim + r.copias_elec_aut + r.copias_elec_sim + r.folios_matriz + r.arancelarios_adicionales;
    r.derechos = r.honorarios_netos + r.copias_aut + r.copias_sim + r.copias_elec_aut + r.copias_elec_sim + r.folios_matriz + r.arancelarios_adicionales;
    // Descuento applied to derechos
    r.descuento_importe = r.derechos * descPct / 100;
    const derechosConDescuento = r.derechos - r.descuento_importe;
    r.gastos = gsTotals.gastos;
    r.suplidos = gsTotals.suplidos;
    // Derechos exentos de IVA: when iv=false, derechos don't enter IVA base
    if (!r.aplicaIva) {
      r.derechos_exentos = derechosConDescuento;
      r.base_iva = r.gastos;
    } else {
      r.base_iva = derechosConDescuento + r.gastos;
    }
    r.iva = r.base_iva * TARIFAS.iva / 100;
    r.base_irpf = r.honorarios_netos;
    r.irpf = r.base_irpf * TARIFAS.irpf / 100;
    r.total = derechosConDescuento + r.gastos + r.suplidos + r.iva;
    r.liquido = r.total - r.irpf;
    return r;
  }, [activeSvc, inputs, arancTotals, gsTotals, matrizElectronica]);

  const stats = useMemo(() => {
    let total = 0;
    CATEGORIAS_NOTING.forEach(c => c.acts.forEach(a => { if (a.v) total += a.v.length; else total++; }));
    return { total, cats: CATEGORIAS_NOTING.length, codes: CATEGORIAS_NOTING.reduce((s, c) => s + c.acts.length, 0) };
  }, []);

  const handleSearchSelect = (item) => { setCatId(item.catId); setActId(item.actId); setVarIdx(item.varIdx ?? -1); setSearch(""); };
  const displayName = currentVariant?.n || currentAct?.n || "";
  const presetKey = detectPreset(actId);

  const handleCargarPreset = useCallback(() => {
    if (!presetKey) return;
    const p = PRESETS[presetKey];
    const na = buildInitialAranc(true); p.aranc.forEach(id => { if (na[id]) na[id].checked = true; }); setAranc(na);
    const ng = buildInitialGastosSuplidos(true); p.gastos.forEach(id => { if (ng.gastos[id]) ng.gastos[id].checked = true; }); p.suplidos.forEach(id => { if (ng.suplidos[id]) ng.suplidos[id].checked = true; }); setGsState(ng);
    setArancOpen(true); setGsOpen(true);
  }, [presetKey]);

  const handleLimpiarTodo = useCallback(() => {
    setCatId(""); setActId(""); setVarIdx(-1); setSearch("");
    setInputs({ cuantia: "", base_minutable: "", folios_matriz: "4", copias_aut: "1", folios_aut: "4", copias_sim: "1", folios_sim: "4", copias_elec_aut: "0", folios_elec_aut: "0", copias_elec_sim: "0", folios_elec_sim: "0", descuento: "0" });
    setBaseManual(false); setMatrizElectronica(false); setValorRefCatastral(""); setLey11_2023(false);
    setAranc(buildInitialAranc()); setArancOpen(false);
    setGsState(buildInitialGastosSuplidos()); setGsOpen(false);
    setIntervinientes([]); setIntervOpen(false);
    setNProtocolo(""); setEstado("Prevista");
    setCustomAranc([]); setCustomGastos([]); setCustomSuplidos([]);
    setAddingTo(null); setNewItem({ nombre: "", coste: "" });
  }, []);

  const handleCopiarDesglose = useCallback(async () => {
    if (!calc || !activeSvc) return;
    const L = [];
    L.push(`DESGLOSE - ${displayName}`);
    if (nProtocolo) L.push(`N\u00ba Protocolo: ${nProtocolo}`);
    L.push(`Estado: ${estado}`);
    L.push("");
    if (tipoCalculo === "cuantia" && calc.reduccion_total_pct > 0) L.push(`Sin reducci\u00f3n (ref.):        ${fmt(calc.honorarios_brutos_ref)} \u20ac`);
    if (tipoCalculo === "cuantia") {
      L.push(`Honorarios brutos (N\u00ba 2):  ${fmt(calc.honorarios)} \u20ac`);
      if (calc.reduccion_total_pct > 0) L.push(`Reducci\u00f3n (-${calc.reduccion_total_pct.toFixed(2)}%): ${fmt(-(calc.honorarios - calc.honorarios_netos))} \u20ac`);
    } else if (tipoCalculo === "fijo") L.push(`Tarifa fija (N\u00ba 1):         ${fmt(calc.honorarios)} \u20ac`);
    else if (tipoCalculo === "arancel_fijo") L.push(`Arancel fijo legal:          ${fmt(calc.honorarios)} \u20ac`);
    else if (tipoCalculo === "sin_cuantia") L.push(`Doc. sin cuant\u00eda (N\u00ba 1):    ${fmt(calc.honorarios)} \u20ac`);
    else L.push("Gratuito: 0,00 \u20ac");
    L.push(`Honorarios netos:            ${fmt(calc.honorarios_netos)} \u20ac`);
    if (calc.copias_aut > 0) L.push(`Copias autorizadas:          ${fmt(calc.copias_aut)} \u20ac`);
    if (calc.copias_sim > 0) L.push(`Copias simples:              ${fmt(calc.copias_sim)} \u20ac`);
    if (calc.copias_elec_aut > 0) L.push(`Copias elec. autorizadas:    ${fmt(calc.copias_elec_aut)} \u20ac`);
    if (calc.copias_elec_sim > 0) L.push(`Copias elec. simples:        ${fmt(calc.copias_elec_sim)} \u20ac`);
    if (calc.folios_matriz > 0) L.push(`Folios de matriz${matrizElectronica ? " (elec.)" : ""}:${matrizElectronica ? "    " : "            "}${fmt(calc.folios_matriz)} \u20ac`);
    if (calc.arancelarios_adicionales > 0) L.push(`Arancelarios adicionales:    ${fmt(calc.arancelarios_adicionales)} \u20ac`);
    customAranc.forEach(c => L.push(`  ${c.nombre}: ${fmt(c.coste)} \u20ac`));
    L.push("---");
    L.push(`DERECHOS:                    ${fmt(calc.derechos)} \u20ac`);
    if (calc.descuento_importe > 0) L.push(`Descuento (${calc.descuento_pct}%):            -${fmt(calc.descuento_importe)} \u20ac`);
    if (calc.gastos > 0) {
      L.push(`Gastos:                      ${fmt(calc.gastos)} \u20ac`);
      customGastos.forEach(c => L.push(`  ${c.nombre}: ${fmt(c.coste)} \u20ac`));
    }
    if (calc.suplidos > 0) {
      L.push(`Suplidos:                    ${fmt(calc.suplidos)} \u20ac`);
      customSuplidos.forEach(c => L.push(`  ${c.nombre}: ${fmt(c.coste)} \u20ac`));
    }
    L.push("---");
    if (calc.derechos_exentos > 0) L.push(`Der. exentos IVA:            ${fmt(calc.derechos_exentos)} \u20ac`);
    L.push(`Base IVA:                    ${fmt(calc.base_iva)} \u20ac`);
    L.push(`IVA (${TARIFAS.iva}%):                   ${fmt(calc.iva)} \u20ac`);
    L.push("===");
    L.push(`TOTAL:                       ${fmt(calc.total)} \u20ac`);
    L.push("");
    L.push(`Retenci\u00f3n IRPF (${TARIFAS.irpf}%):       -${fmt(calc.irpf)} \u20ac`);
    L.push(`L\u00edquido a percibir:          ${fmt(calc.liquido)} \u20ac`);
    if (intervinientes.length > 0) {
      L.push("");
      L.push("INTERVINIENTES:");
      intervinientes.forEach(iv => L.push(`  ${iv.tipo}: ${iv.nombre} ${iv.apellidos}${iv.dni ? ` (${iv.dni})` : ""}${iv.nr ? " [NR]" : ""}`));
    }
    try { await navigator.clipboard.writeText(L.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }, [calc, activeSvc, displayName, tipoCalculo, matrizElectronica, nProtocolo, estado, customAranc, customGastos, customSuplidos, intervinientes]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* ═══ HEADER BAR — Notinn-style ═══ */}
      <div className="header-bar">
        <div className="header-inner">
          <div className="header-top">
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fbbf24", letterSpacing: "-0.02em" }}>Motor Arancelario</div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 1 }}>RD 1426/1989 · {stats.total} servicios · {stats.codes} códigos</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost" onClick={handleLimpiarTodo} style={{ fontSize: 11 }}>Limpiar</button>
              {presetKey && <button className="btn btn-accent" onClick={handleCargarPreset} style={{ fontSize: 11 }}>Preset · {PRESETS[presetKey].label}</button>}
            </div>
          </div>

          {/* Campos en fila — estilo Notinn */}
          <div className="header-fields">
            <div className="header-field">
              <span className="lbl">Categoría</span>
              <select className="sel" value={catId} onChange={e => { setCatId(e.target.value); setActId(""); setVarIdx(-1); }}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS_NOTING.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.acts.length})</option>)}
              </select>
            </div>
            <div className="header-field wide">
              <span className="lbl">Concepto notarial {currentCat ? `(${currentCat.acts.length})` : ""}</span>
              <select className="sel" value={actId} onChange={e => { setActId(e.target.value); setVarIdx(-1); }} disabled={!currentCat}>
                <option value="">Seleccionar...</option>
                {currentCat?.acts.map(a => <option key={a.id} value={a.id}>[{a.id}] {a.n}{a.v ? ` (${a.v.length} var.)` : ""}</option>)}
              </select>
            </div>
            {hasVariants && (
              <div className="header-field">
                <span className="lbl">Variante ({currentAct.v.length})</span>
                <select className="sel" value={varIdx} onChange={e => setVarIdx(parseInt(e.target.value))}>
                  <option value={-1}>Seleccionar...</option>
                  {currentAct.v.map((v, i) => <option key={i} value={i}>{v.l}</option>)}
                </select>
              </div>
            )}
            {tipoCalculo === "cuantia" && (
              <>
                <div className="header-field">
                  <span className="lbl">Cuantía ({"\u20ac"})</span>
                  <input className="inp inp-mono" value={inputs.cuantia} onChange={e => setInput("cuantia", e.target.value)} placeholder="200.000" style={{ fontWeight: 600 }} />
                </div>
                <div className="header-field">
                  <span className="lbl" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    Base minutable ({"\u20ac"})
                    {baseManual && <button onClick={resyncBase} style={{ background: "rgba(251,191,36,0.3)", border: "none", borderRadius: 4, color: "#fbbf24", fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700 }} title="Re-sincronizar con cuantía">{"\u21BB"}</button>}
                  </span>
                  <input className="inp inp-mono" value={inputs.base_minutable} onChange={e => setInput("base_minutable", e.target.value)} placeholder="200.000" style={{ fontWeight: 600, borderColor: baseManual ? "rgba(251,191,36,0.5)" : undefined }} />
                </div>
              </>
            )}
          </div>

          {/* Buscador */}
          <div style={{ position: "relative", marginTop: 10 }}>
            <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar servicio..." style={{ fontSize: 12.5 }} />
            {searchResults && searchResults.length > 0 && (
              <div className="search-drop">
                {searchResults.map((sr, i) => (
                  <button key={i} className="search-item" onClick={() => handleSearchSelect(sr)}>
                    <span style={{ color: "#a8a29e", fontSize: 10 }}>{sr.catName} → </span>{sr.name}
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 && search.length >= 2 && (
              <div className="search-drop" style={{ padding: 16, textAlign: "center", color: "#a8a29e", fontSize: 12 }}>Sin resultados para "{search}"</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 2-COLUMN LAYOUT ═══ */}
      <div className="layout">

        {/* ═══ COLUMNA IZQUIERDA ═══ */}
        <div className="col-left">

          {/* Ficha + badge tipo Notinn */}
          {activeSvc && (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Ficha de la operación</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", lineHeight: 1.3 }}>{displayName}</div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 600,
                      background: estado === "Autorizada" ? "rgba(5,150,105,0.1)" : estado === "Sin Factura" ? "rgba(168,162,158,0.15)" : "rgba(59,130,246,0.1)",
                      color: estado === "Autorizada" ? "#059669" : estado === "Sin Factura" ? "#78716c" : "#3b82f6",
                    }}>{estado}</span>
                  </div>
                </div>
                <span className="badge-tipo" style={{ background: "rgba(146,112,42,0.1)", color: "#92702a", border: "1px solid rgba(146,112,42,0.2)" }}>
                  {getTipoLabel(tipoCalculo)}
                </span>
              </div>

              {/* Protocolo + Estado */}
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>N\u00ba Protocolo</label>
                  <input className="inp inp-sm" value={nProtocolo} onChange={e => setNProtocolo(e.target.value)} placeholder="Ej: 69958" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Estado</label>
                  <select className="sel sel-light" style={{ padding: "6px 8px", fontSize: 11, width: "100%" }} value={estado} onChange={e => setEstado(e.target.value)}>
                    <option value="Prevista">Prevista</option>
                    <option value="Autorizada">Autorizada</option>
                    <option value="Sin Factura">Sin Factura</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "5px 16px", fontSize: 11.5, color: "#78716c" }}>
                <span>SIGNO: <b style={{ color: "#44403c" }}>{currentAct?.id}</b></span>
                {tipoCalculo === "cuantia" && activeSvc.r > 0 && <span>Reducción: <b style={{ color: "#92702a" }}>{(activeSvc.r * 100).toFixed(2)}%</b></span>}
                {tipoCalculo === "cuantia" && activeSvc.r > 0 && <span>Red. total: <b style={{ color: "#92702a" }}>{((1 - (1 - activeSvc.r) * 0.95) * 100).toFixed(2)}%</b></span>}
                <span>IVA: <b style={{ color: "#44403c" }}>{activeSvc.iv ? "Sí" : "No"}</b></span>
                <span>M. pago: <b style={{ color: activeSvc.mp === "Si" ? "#92702a" : "#44403c" }}>{activeSvc.mp === "Si" ? "Obligatorio" : activeSvc.mp === "Op" ? "Opcional" : "No"}</b></span>
                {activeSvc.cl && <span>Clave reg.: <b style={{ color: "#44403c" }}>{activeSvc.cl}</b></span>}
                {activeSvc.f > 0 && tipoCalculo !== "cuantia" && <span>Tarifa fija: <b style={{ color: "#92702a" }}>{fmt(activeSvc.f)} {"\u20ac"}</b></span>}
              </div>
            </div>
          )}

          {/* Badge de tipo de operación */}
          {activeSvc && (
            <div style={{
              background: "rgba(201,165,90,0.15)",
              border: "1px solid rgba(201,165,90,0.3)",
              borderRadius: 8,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#c9a55a",
              textTransform: "uppercase",
              textAlign: "center",
              margin: "12px 0",
            }}>
              {currentVariant?.l || currentVariant?.n || currentAct?.n || ""}
            </div>
          )}

          {/* Intervinientes */}
          {activeSvc && (
            <div className="card" style={{ overflow: "hidden" }}>
              <button className="collapse-btn" onClick={() => setIntervOpen(!intervOpen)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#a8a29e", transition: "transform 0.15s", transform: intervOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
                  <span className="collapse-title">Intervinientes</span>
                  {intervinientes.length > 0 && <span className="collapse-badge" style={{ background: "rgba(146,112,42,0.1)", color: "#92702a" }}>{intervinientes.length}</span>}
                </div>
                {intervinientes.length > 0 && <span style={{ fontSize: 11, color: "#78716c" }}>{intervinientes.length} persona{intervinientes.length !== 1 ? "s" : ""}</span>}
              </button>
              {intervOpen && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e7e5e4" }}>
                  {intervinientes.length > 0 && (
                    <div style={{ overflowX: "auto", marginTop: 10 }}>
                      <table className="interv-table">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>DNI/NIF</th>
                            <th>Nombre</th>
                            <th>Apellidos</th>
                            <th style={{ textAlign: "center" }}>NR</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {intervinientes.map(iv => (
                            <tr key={iv.id}>
                              <td style={{ minWidth: 130 }}>
                                <select className="interv-sel" value={iv.tipo} onChange={e => updateInterviniente(iv.id, "tipo", e.target.value)}>
                                  {TIPOS_INTERVINIENTE.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td style={{ minWidth: 90 }}>
                                <input className="interv-inp" value={iv.dni} onChange={e => updateInterviniente(iv.id, "dni", e.target.value)} placeholder="12345678A" />
                              </td>
                              <td style={{ minWidth: 100 }}>
                                <input className="interv-inp" value={iv.nombre} onChange={e => updateInterviniente(iv.id, "nombre", e.target.value)} placeholder="Nombre" />
                              </td>
                              <td style={{ minWidth: 130 }}>
                                <input className="interv-inp" value={iv.apellidos} onChange={e => updateInterviniente(iv.id, "apellidos", e.target.value)} placeholder="Apellidos" />
                              </td>
                              <td style={{ width: 30, textAlign: "center" }}>
                                <input type="checkbox" checked={iv.nr} onChange={() => updateInterviniente(iv.id, "nr", !iv.nr)} style={{ accentColor: "#92702a", width: 13, height: 13, cursor: "pointer" }} />
                              </td>
                              <td style={{ width: 28 }}>
                                <button className="btn-remove" onClick={() => removeInterviniente(iv.id)} title="Eliminar">&times;</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button className="btn-add-interv" onClick={addInterviniente}>+ Añadir interviniente</button>
                </div>
              )}
            </div>
          )}

          {/* Datos — folios y copias */}
          {activeSvc && (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Datos de la operación</div>

              {tipoCalculo === "arancel_fijo" && (
                <div style={{ padding: "8px 12px", background: "rgba(146,112,42,0.06)", border: "1px solid rgba(146,112,42,0.15)", borderRadius: 8, fontSize: 12, color: "#92702a", marginBottom: 12 }}>Arancel fijo: <b>{fmt(activeSvc.f)} {"\u20ac"}</b></div>
              )}
              {tipoCalculo === "gratuito" && (
                <div style={{ padding: "8px 12px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.12)", borderRadius: 8, fontSize: 12, color: "#059669", marginBottom: 12 }}>Gratuito (exento de arancel)</div>
              )}
              {tipoCalculo === "fijo" && (
                <div style={{ padding: "8px 12px", background: "rgba(146,112,42,0.06)", border: "1px solid rgba(146,112,42,0.15)", borderRadius: 8, fontSize: 12, color: "#92702a", marginBottom: 12 }}>Tarifa fija (Nº 1): <b>{fmt(activeSvc.f)} {"\u20ac"}</b></div>
              )}
              {tipoCalculo === "sin_cuantia" && (
                <div style={{ padding: "8px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 8, fontSize: 12, color: "#6366f1", marginBottom: 12 }}>Sin cuantía: <b>{fmt(TARIFAS.doc_sin_cuantia)} {"\u20ac"}</b></div>
              )}

              {/* Copias físicas */}
              <div style={{ fontSize: 9, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Copias físicas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {[["folios_matriz","Folios matriz"],["copias_aut","Copias aut."],["folios_aut","Fol./copia aut."],["copias_sim","Copias sim."],["folios_sim","Fol./copia sim."]].map(([k,l]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</label>
                    <input type="number" min="0" className="inp inp-sm" value={inputs[k]} onChange={e => setInput(k, e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Copias electrónicas */}
              <div style={{ fontSize: 9, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 12, marginBottom: 4 }}>Copias electrónicas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {[["copias_elec_aut","Copias elec. aut."],["folios_elec_aut","Fol./copia elec. aut."],["copias_elec_sim","Copias elec. sim."],["folios_elec_sim","Fol./copia elec. sim."]].map(([k,l]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</label>
                    <input type="number" min="0" className="inp inp-sm" value={inputs[k]} onChange={e => setInput(k, e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Matriz electrónica toggle */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={matrizElectronica} onChange={() => setMatrizElectronica(!matrizElectronica)} style={{ accentColor: "#92702a", width: 14, height: 14, cursor: "pointer" }} />
                <span style={{ fontSize: 11.5, color: "#1c1917", fontWeight: 500 }}>Matriz electrónica</span>
                {matrizElectronica && <span style={{ fontSize: 10, color: "#d97706", fontWeight: 500, background: "rgba(217,119,6,0.08)", padding: "2px 8px", borderRadius: 4 }}>Verificar tarifa con Aroa</span>}
              </div>

              <div className="sep" style={{ margin: "12px 0" }} />

              {/* Descuento + Valor ref catastral + Ley 11/2023 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descuento (%)</label>
                  <input type="number" min="0" max="100" step="0.5" className="inp inp-sm" value={inputs.descuento} onChange={e => setInput("descuento", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: "#a8a29e", display: "block", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor ref. catastral</label>
                  <select className="sel sel-light" style={{ padding: "6px 8px", fontSize: 11 }} value={valorRefCatastral} onChange={e => setValorRefCatastral(e.target.value)}>
                    <option value="">No consta</option>
                    <option value="superior">Consta superior</option>
                    <option value="inferior">Consta inferior</option>
                  </select>
                </div>
              </div>
              {valorRefCatastral === "superior" && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 6, fontSize: 11, color: "#a16207" }}>
                  El valor de referencia catastral es superior a la cuantía declarada
                </div>
              )}

              {/* Ley 11/2023 */}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={ley11_2023} onChange={() => setLey11_2023(!ley11_2023)} style={{ accentColor: "#92702a", width: 14, height: 14, cursor: "pointer" }} />
                <span style={{ fontSize: 11.5, color: "#1c1917", fontWeight: 500 }}>Ley 11/2023</span>
                {ley11_2023 && <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500, background: "rgba(124,58,237,0.08)", padding: "2px 8px", borderRadius: 4 }}>Placeholder — sin impacto en cálculo</span>}
              </div>
            </div>
          )}

          {/* Arancelarios */}
          {activeSvc && (
            <div className="card" style={{ overflow: "hidden" }}>
              <button className="collapse-btn" onClick={() => setArancOpen(!arancOpen)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#a8a29e", transition: "transform 0.15s", transform: arancOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
                  <span className="collapse-title">Arancelarios adicionales</span>
                  {arancTotals.count > 0 && <span className="collapse-badge" style={{ background: "rgba(146,112,42,0.1)", color: "#92702a" }}>{arancTotals.count}</span>}
                </div>
                {arancTotals.count > 0 && <span className="mono" style={{ fontSize: 12, color: "#92702a", fontWeight: 600 }}>{fmt(arancTotals.suma)} {"\u20ac"}</span>}
              </button>
              {arancOpen && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e7e5e4" }}>
                  <CkSection title="Nº 1 — Documentos adicionales">
                    {DOCS_ADICIONALES.map(d => <CkRow key={d.id} checked={aranc[d.id]?.checked} onChange={() => toggleAranc(d.id)} label={d.n} coste={d.coste}
                      detail={aranc[d.id]?.checked ? `Tarifa fija: ${fmt(d.coste)}\u20ac` : null}
                      onRemove={aranc[d.id]?.checked ? () => toggleAranc(d.id) : null} />)}
                  </CkSection>
                  <CkSection title="Nº 5 — Testimonios">
                    {TESTIMONIOS.map(t => {
                      const f = aranc[t.id]?.folios ?? t.folios;
                      const total = calcTestimonio(t, f);
                      let formula = null;
                      if (aranc[t.id]?.checked) {
                        if (t.especial) {
                          formula = f > 0 ? `${f} fol. \u00d7 ${fmt(TARIFAS.copia_autorizada_folio)}\u20ac = ${fmt(total)}\u20ac` : `0,00\u20ac`;
                        } else {
                          formula = f > 0 ? `${fmt(TARIFAS.testimonio_base)}\u20ac + ${f} fol. \u00d7 ${fmt(TARIFAS.copia_simple_folio)}\u20ac = ${fmt(total)}\u20ac` : `${fmt(TARIFAS.testimonio_base)}\u20ac = ${fmt(total)}\u20ac`;
                        }
                      }
                      return <CkRow key={t.id} checked={aranc[t.id]?.checked} onChange={() => toggleAranc(t.id)} label={t.n} coste={total}
                        detail={formula}
                        onRemove={aranc[t.id]?.checked ? () => toggleAranc(t.id) : null}
                        extra={aranc[t.id]?.checked && <FolInput value={f} onChange={e => setArancFolios(t.id, e.target.value)} />} />;
                    })}
                  </CkSection>
                  <CkSection title="Nº 6 — Diligencias">
                    {DILIGENCIAS.map(d => <CkRow key={d.id} checked={aranc[d.id]?.checked} onChange={() => toggleAranc(d.id)} label={d.n} coste={d.coste}
                      detail={aranc[d.id]?.checked ? `Tarifa fija: ${fmt(d.coste)}\u20ac` : null}
                      onRemove={aranc[d.id]?.checked ? () => toggleAranc(d.id) : null} />)}
                  </CkSection>
                  <CkSection title="Nº 7 — Matriz">
                    <p style={{ fontSize: 11, color: "#78716c", padding: "4px 0" }}>Folios: <b style={{ color: "#44403c" }}>{inputs.folios_matriz}</b> — primeros 4 gratis, luego 6,01 {"\u20ac"}/folio</p>
                  </CkSection>
                  {/* Custom arancelarios */}
                  {customAranc.length > 0 && (
                    <CkSection title="Personalizados">
                      {customAranc.map(c => (
                        <div key={c.id} className="ck-row" style={{ opacity: 1 }}>
                          <span style={{ flex: 1, fontSize: 11.5, color: "#1c1917", fontWeight: 500 }}>{c.nombre}</span>
                          <span className="mono" style={{ fontSize: 11, color: "#92702a", minWidth: 55, textAlign: "right", flexShrink: 0 }}>{fmt(c.coste)} {"\u20ac"}</span>
                          <button className="btn-remove" onClick={() => removeCustomItem("aranc", c.id)} title="Eliminar">&times;</button>
                        </div>
                      ))}
                    </CkSection>
                  )}
                  {/* Add concept form */}
                  {addingTo === "aranc" ? (
                    <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                      <input className="inp inp-sm" style={{ flex: 1 }} value={newItem.nombre} onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del concepto" autoFocus />
                      <input type="number" className="inp inp-sm" style={{ width: 70 }} value={newItem.coste} onChange={e => setNewItem(p => ({ ...p, coste: e.target.value }))} placeholder="0,00" />
                      <button className="btn-remove" style={{ color: "#059669", fontSize: 16 }} onClick={() => addCustomItem("aranc")} title="Confirmar">{"\u2713"}</button>
                      <button className="btn-remove" onClick={() => { setAddingTo(null); setNewItem({ nombre: "", coste: "" }); }} title="Cancelar">&times;</button>
                    </div>
                  ) : (
                    <button className="btn-add-interv" style={{ marginTop: 8 }} onClick={() => { setAddingTo("aranc"); setNewItem({ nombre: "", coste: "" }); }}>+ A\u00f1adir concepto</button>
                  )}
                  {arancTotals.count > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e7e5e4", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#78716c" }}>{arancTotals.count} concepto{arancTotals.count !== 1 ? "s" : ""}</span>
                      <span className="mono" style={{ color: "#92702a", fontWeight: 600 }}>{fmt(arancTotals.suma)} {"\u20ac"}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gastos y Suplidos */}
          {activeSvc && (
            <div className="card" style={{ overflow: "hidden" }}>
              <button className="collapse-btn" onClick={() => setGsOpen(!gsOpen)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#a8a29e", transition: "transform 0.15s", transform: gsOpen ? "rotate(90deg)" : "rotate(0)", display: "inline-block" }}>▶</span>
                  <span className="collapse-title">Gastos y suplidos</span>
                  {gsTotals.count > 0 && <span className="collapse-badge" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>{gsTotals.count}</span>}
                </div>
                {gsTotals.count > 0 && <span className="mono" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{fmt(gsTotals.total)} {"\u20ac"}</span>}
              </button>
              {gsOpen && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e7e5e4" }}>
                  <CkSection title="Gastos externos" subtitle="llevan IVA">
                    {GASTOS_EXTERNOS.map(g => {
                      const ch = gsState.gastos[g.id]?.checked;
                      const c = gsState.gastos[g.id]?.coste ?? g.coste;
                      return <CkRow key={g.id} checked={ch} onChange={() => toggleGasto(g.id)} label={g.n} coste={c} accent="indigo"
                        onRemove={ch ? () => toggleGasto(g.id) : null}
                        extra={g.editable && ch && <CostInput value={c} onChange={e => setGastoCoste(g.id, e.target.value)} />} />;
                    })}
                    {customGastos.map(c => (
                      <div key={c.id} className="ck-row" style={{ opacity: 1 }}>
                        <span style={{ flex: 1, fontSize: 11.5, color: "#1c1917", fontWeight: 500 }}>{c.nombre}</span>
                        <span className="mono" style={{ fontSize: 11, color: "#6366f1", minWidth: 55, textAlign: "right", flexShrink: 0 }}>{fmt(c.coste)} {"\u20ac"}</span>
                        <button className="btn-remove" onClick={() => removeCustomItem("gastos", c.id)} title="Eliminar">&times;</button>
                      </div>
                    ))}
                    {addingTo === "gastos" ? (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                        <input className="inp inp-sm" style={{ flex: 1 }} value={newItem.nombre} onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del gasto" autoFocus />
                        <input type="number" className="inp inp-sm" style={{ width: 70 }} value={newItem.coste} onChange={e => setNewItem(p => ({ ...p, coste: e.target.value }))} placeholder="0,00" />
                        <button className="btn-remove" style={{ color: "#059669", fontSize: 16 }} onClick={() => addCustomItem("gastos")} title="Confirmar">{"\u2713"}</button>
                        <button className="btn-remove" onClick={() => { setAddingTo(null); setNewItem({ nombre: "", coste: "" }); }} title="Cancelar">&times;</button>
                      </div>
                    ) : (
                      <button className="btn-add-interv" style={{ marginTop: 6 }} onClick={() => { setAddingTo("gastos"); setNewItem({ nombre: "", coste: "" }); }}>+ A\u00f1adir gasto</button>
                    )}
                  </CkSection>
                  <CkSection title="Suplidos" subtitle="sin IVA, sin IRPF">
                    {SUPLIDOS_CAT.map(s => {
                      const ch = gsState.suplidos[s.id]?.checked;
                      const c = gsState.suplidos[s.id]?.coste ?? s.coste;
                      return <CkRow key={s.id} checked={ch} onChange={() => toggleSuplido(s.id)} label={s.n} coste={c} accent="indigo"
                        onRemove={ch ? () => toggleSuplido(s.id) : null}
                        extra={s.editable && ch && <CostInput value={c} onChange={e => setSuplidoCoste(s.id, e.target.value)} />} />;
                    })}
                    {customSuplidos.map(c => (
                      <div key={c.id} className="ck-row" style={{ opacity: 1 }}>
                        <span style={{ flex: 1, fontSize: 11.5, color: "#1c1917", fontWeight: 500 }}>{c.nombre}</span>
                        <span className="mono" style={{ fontSize: 11, color: "#57534e", minWidth: 55, textAlign: "right", flexShrink: 0 }}>{fmt(c.coste)} {"\u20ac"}</span>
                        <button className="btn-remove" onClick={() => removeCustomItem("suplidos", c.id)} title="Eliminar">&times;</button>
                      </div>
                    ))}
                    {addingTo === "suplidos" ? (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                        <input className="inp inp-sm" style={{ flex: 1 }} value={newItem.nombre} onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del suplido" autoFocus />
                        <input type="number" className="inp inp-sm" style={{ width: 70 }} value={newItem.coste} onChange={e => setNewItem(p => ({ ...p, coste: e.target.value }))} placeholder="0,00" />
                        <button className="btn-remove" style={{ color: "#059669", fontSize: 16 }} onClick={() => addCustomItem("suplidos")} title="Confirmar">{"\u2713"}</button>
                        <button className="btn-remove" onClick={() => { setAddingTo(null); setNewItem({ nombre: "", coste: "" }); }} title="Cancelar">&times;</button>
                      </div>
                    ) : (
                      <button className="btn-add-interv" style={{ marginTop: 6 }} onClick={() => { setAddingTo("suplidos"); setNewItem({ nombre: "", coste: "" }); }}>+ A\u00f1adir suplido</button>
                    )}
                  </CkSection>
                  {gsTotals.count > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e7e5e4", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12 }}>
                      <span style={{ color: "#78716c" }}>{gsTotals.count} concepto{gsTotals.count !== 1 ? "s" : ""}</span>
                      <div className="mono" style={{ display: "flex", gap: 14, fontWeight: 600 }}>
                        {gsTotals.gastosCount > 0 && <span style={{ color: "#6366f1" }}>G: {fmt(gsTotals.gastos)} {"\u20ac"}</span>}
                        {gsTotals.suplidosCount > 0 && <span style={{ color: "#57534e" }}>S: {fmt(gsTotals.suplidos)} {"\u20ac"}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty */}
          {!activeSvc && (
            <div className="card" style={{ padding: "50px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.1 }}>{"\u2696\uFE0F"}</div>
              <p style={{ color: "#78716c", fontSize: 13, fontWeight: 500 }}>Selecciona categoría → concepto → variante</p>
              <p style={{ color: "#a8a29e", fontSize: 11, marginTop: 4 }}>{stats.total} servicios · {stats.cats} categorías</p>
            </div>
          )}
        </div>

        {/* ═══ COLUMNA DERECHA — PANEL FACTURACIÓN (Sticky) ═══ */}
        <div className="col-right">
          <div className="factura">
            <div className="factura-header">
              <div style={{ fontSize: 11, fontWeight: 700, color: "#78560e", textTransform: "uppercase", letterSpacing: "0.1em" }}>Facturación</div>
              {displayName && <div style={{ fontSize: 11, color: "#92702a", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>}
            </div>
            <div className="factura-body">
              {calc ? (
                <>
                  {/* Honorario bruto referencia (sin reducción) */}
                  {tipoCalculo === "cuantia" && calc.reduccion_total_pct > 0 && (
                    <div style={{ fontSize: 10, color: "#a8a29e", marginBottom: 4, fontStyle: "italic" }}>Sin reducción: {fmt(calc.honorarios_brutos_ref)} {"\u20ac"}</div>
                  )}

                  {tipoCalculo === "cuantia" && (
                    <>
                      <FRow label="Honorarios brutos" value={calc.honorarios} />
                      {calc.reduccion_total_pct > 0 && <FRow label={`Reducción (\u2212${calc.reduccion_total_pct.toFixed(1)}%)`} value={-(calc.honorarios - calc.honorarios_netos)} color="#92702a" />}
                    </>
                  )}
                  {tipoCalculo === "fijo" && <FRow label="Tarifa fija" value={calc.honorarios} />}
                  {tipoCalculo === "arancel_fijo" && <FRow label="Arancel fijo" value={calc.honorarios} />}
                  {tipoCalculo === "sin_cuantia" && <FRow label="Doc. sin cuantía" value={calc.honorarios} />}
                  {tipoCalculo === "gratuito" && <FRow label="Gratuito" value={0} />}

                  <FRow label="Honorarios netos" value={calc.honorarios_netos} highlight />

                  {calc.copias_aut > 0 && <FRow label="Copias autorizadas" value={calc.copias_aut} />}
                  {calc.copias_sim > 0 && <FRow label="Copias simples" value={calc.copias_sim} />}
                  {calc.copias_elec_aut > 0 && <FRow label="Copias elec. aut." value={calc.copias_elec_aut} />}
                  {calc.copias_elec_sim > 0 && <FRow label="Copias elec. sim." value={calc.copias_elec_sim} />}
                  {calc.folios_matriz > 0 && <FRow label={matrizElectronica ? "Folios matriz (elec.)" : "Folios matriz"} value={calc.folios_matriz} />}
                  {calc.arancelarios_adicionales > 0 && <FRow label="Arancelarios adic." value={calc.arancelarios_adicionales} />}

                  <div className="factura-divider" />
                  <FRow label="Derechos" value={calc.derechos} highlight color="#92702a" />
                  {calc.descuento_importe > 0 && <FRow label={`Descuento (${calc.descuento_pct}%)`} value={-calc.descuento_importe} color="#92702a" />}

                  {calc.gastos > 0 && <FRow label="Gastos" value={calc.gastos} />}
                  {calc.suplidos > 0 && <FRow label="Suplidos" value={calc.suplidos} />}

                  <div className="factura-divider" />
                  {calc.derechos_exentos > 0 && <FRow label="Der. exentos IVA" value={calc.derechos_exentos} color="#a8a29e" />}
                  <FRow label={`IVA (${TARIFAS.iva}%)`} value={calc.iva} />

                  <div className="factura-total">
                    <span className="lbl-total">Total</span>
                    <span className="val-total">{fmt(calc.total)} {"\u20ac"}</span>
                  </div>

                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #e7e5e4" }}>
                    <FRow label={`Retención IRPF (${TARIFAS.irpf}%)`} value={-calc.irpf} color="#92702a" />
                    <div className="factura-row highlight" style={{ fontSize: 13, marginTop: 2 }}>
                      <span>Líquido a percibir</span>
                      <span className="val" style={{ fontWeight: 700 }}>{fmt(calc.liquido)} {"\u20ac"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                    <button className={`btn-block btn-copy${copied ? " copied" : ""}`} onClick={handleCopiarDesglose}>
                      {copied ? "\u2713 Copiado" : "Copiar desglose"}
                    </button>
                    <button className="btn-block btn-limpiar" onClick={handleLimpiarTodo}>Limpiar todo</button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "24px 0", textAlign: "center", color: "#a8a29e", fontSize: 12 }}>
                  Selecciona un concepto para calcular
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function FRow({ label, value, highlight, color }) {
  return (
    <div className={`factura-row${highlight ? " highlight" : ""}`} style={color ? { color } : undefined}>
      <span>{label}</span>
      <span className="val" style={color ? { color } : undefined}>{fmt(value)} {"\u20ac"}</span>
    </div>
  );
}

function CkSection({ title, subtitle, children }) {
  return (
    <div style={{ paddingTop: 10, marginTop: 8, borderTop: "1px solid #e7e5e4" }}>
      <p style={{ fontSize: 10, color: "#a8a29e", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}{subtitle && <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, color: "#a8a29e" }}>({subtitle})</span>}
      </p>
      {children}
    </div>
  );
}

function CkRow({ checked, onChange, label, coste, accent = "amber", extra, detail, onRemove }) {
  const ac = accent === "amber" ? "#92702a" : "#6366f1";
  return (
    <div>
      <div className="ck-row" style={{ opacity: checked ? 1 : 0.5 }}>
        <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: ac }} />
        <span style={{ flex: 1, fontSize: 11.5, color: checked ? "#1c1917" : "#78716c", fontWeight: checked ? 500 : 400 }}>{label}</span>
        {extra}
        {!extra && <span className="mono" style={{ fontSize: 11, color: checked ? ac : "#a8a29e", minWidth: 55, textAlign: "right", flexShrink: 0 }}>{fmt(coste)} {"\u20ac"}</span>}
        {onRemove && <button className="btn-remove" onClick={onRemove} title="Desmarcar" style={{ marginLeft: 2 }}>&times;</button>}
      </div>
      {detail && <div style={{ fontSize: 10, color: "#6b7280", marginLeft: 22, marginTop: -2, marginBottom: 2 }}>{detail}</div>}
    </div>
  );
}

function FolInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <span style={{ fontSize: 9, color: "#a8a29e" }}>fol.</span>
      <input type="number" min="0" value={value} onChange={onChange} className="inp inp-sm" style={{ width: 38, padding: "2px 4px", textAlign: "center", borderRadius: 5, fontSize: 11 }} />
    </div>
  );
}

function CostInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      <input type="number" min="0" step="0.01" value={value} onChange={onChange} className="inp inp-sm" style={{ width: 65, padding: "2px 5px", textAlign: "right", borderRadius: 5, fontSize: 11 }} />
      <span style={{ fontSize: 10, color: "#a8a29e" }}>{"\u20ac"}</span>
    </div>
  );
}
