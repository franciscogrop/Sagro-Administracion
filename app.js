const STORAGE_KEY = "sagro-admin-v3";
const REMOTE_SYNC_URL = "https://script.google.com/macros/s/AKfycbwZ5rCJ1MUhyn3QsPG_zNeaf4qRxUVm3SrLgpIzerCCyGmF_63DZvYeXbdnqrESzB8g/exec";
const REMOTE_SYNC_URL_KEY = "sagro-admin-sync-url";
const REMOTE_UPDATED_AT_KEY = "sagro-admin-remote-updated-at";
const REMOTE_SIGNATURE_KEY = "sagro-admin-remote-signature";
const REMOTE_PENDING_KEY = "sagro-admin-remote-pending";
const DEVICE_ID_KEY = "sagro-admin-device-id";
const REMOTE_QUEUE_KEY = "sagro-admin-sync-queue-v1";
const REMOTE_LAST_PULL_KEY = "sagro-admin-last-pull-at";
const SYNC_ENGINE_EXPECTED_VERSION = "granular-canonical-v5-multidevice-20260818";
const PWA_CACHE_VERSION = "sagro-admin-pwa-20260831-checkfix";
const SAFE_COSMETIC_SYNC_RECORDS = new Set([
  "check:2dda86a6-77ed-40ba-b6e1-69009720cbc4",
]);
const APP_MIN_TODAY = "2026-07-15";
const today = new Date().toISOString().slice(0, 10);
const statuses = ["pendiente", "pagado", "pago parcial", "cobrado", "endosado", "anulado"];
const methods = ["Efectivo", "Transferencia", "debito directo", "VEP", "cuenta corriente", "Canje", "Cheque", "E-cheq", "Tarjeta", "Prestamo bancario", "Mixto"];
const bankedMethods = ["Transferencia", "debito directo", "VEP", "Mixto"];
const bankTaxableMethods = ["Transferencia", "debito directo", "VEP"];
const defaultIssuedCheckBank = "Banco Nacion";
const largeAmountWarning = 100000000;
const undoLimit = 20;
const validActivities = ["Agricultura", "Ganaderia", "Impuestos", "Financiero", "Estructura", "Gerenciamiento", "Socios", "INVERSIONES"];

const baseAccounts = [
  ["001", "Retiros Socios", "Socios"],
  ["002", "Aportes Socios", "Socios"],
  ["003", "Honorarios Administracion", "Gerenciamiento"],
  ["004", "Asesor Contable", "Gerenciamiento"],
  ["005", "Personal Adm", "Gerenciamiento"],
  ["006", "Gastos Oficina", "Gerenciamiento"],
  ["007", "Crea y Asesor", "Gerenciamiento"],
  ["008", "Vehiculos Administracion", "Gerenciamiento"],
  ["009", "Presentacion Balances y otros", "Gerenciamiento"],
  ["010", "Gastos Bancarios", "Gerenciamiento"],
  ["011", "Sueldos Ganaderia", "Ganaderia"],
  ["012", "Cargas Sociales Ganaderia", "Ganaderia"],
  ["013", "Gastos del personal Ganaderia", "Ganaderia"],
  ["014", "Conservacion de Mejoras", "Estructura"],
  ["015", "Mejoras Casco", "Estructura"],
  ["016", "Luz y Telefono", "Estructura"],
  ["017", "Vehiculos Combustible", "Estructura"],
  ["018", "Vehiculos Reparaciones", "Estructura"],
  ["019", "Vehiculos Seguros y Patentes", "Estructura"],
  ["020", "Ganancias", "Impuestos"],
  ["021", "IVA", "Impuestos"],
  ["022", "impuestos debito y credito", "Impuestos"],
  ["023", "IVA Venta Cereales", "Impuestos"],
  ["024", "Imp. Inmobiliario", "Impuestos"],
  ["025", "Imp Municipal", "Impuestos"],
  ["026", "Intereses Pagados", "Financiero"],
  ["027", "Intereses Cobrados", "Financiero"],
  ["028", "Pago de Capital", "Financiero"],
  ["029", "Diferencias t.c.", "Financiero"],
  ["030", "Sanidad", "Ganaderia"],
  ["031", "Honor. Veterinario", "Ganaderia"],
  ["032", "Mejoras ganaderia", "Ganaderia"],
  ["033", "Fletes Ganaderia", "Ganaderia"],
  ["034", "Gastos de Comercializacion Ganaderia", "Ganaderia"],
  ["035", "Reservas Forrajeras", "Ganaderia"],
  ["036", "Hacienda Compra", "Ganaderia"],
  ["037", "Hacienda Venta", "Ganaderia"],
  ["038", "Suplementacion", "Ganaderia"],
  ["039", "Insumos", "Ganaderia"],
  ["040", "Combustible", "Ganaderia"],
  ["041", "Repuestos", "Ganaderia"],
  ["042", "Reparacion", "Ganaderia"],
  ["043", "Ventas Granos", "Agricultura"],
  ["044", "Fletes Agricolas", "Agricultura"],
  ["045", "Labores Contratadas", "Agricultura"],
  ["046", "Cosecha Contratada", "Agricultura"],
  ["047", "Agroquimicos", "Agricultura"],
  ["048", "Fertilizantes", "Agricultura"],
  ["049", "Semillas", "Agricultura"],
  ["050", "Gastos de Comercializacion Agricolas", "Agricultura"],
  ["051", "Arrendamiento", "Agricultura"],
  ["052", "Seguros Agricolas", "Agricultura"],
  ["053", "Sueldos Agricultura", "Agricultura"],
  ["054", "Cargas Sociales Agricultura", "Agricultura"],
  ["055", "Gastos del personal Agricultura", "Agricultura"],
  ["056", "Inversiones Bs de Uso", "INVERSIONES"],
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const uid = () => crypto.randomUUID();
const clone = (value) => JSON.parse(JSON.stringify(value));
const localToday = () => {
  const date = new Date();
  const browserToday = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return browserToday > APP_MIN_TODAY ? browserToday : APP_MIN_TODAY;
};

const cleanState = () => ({
  grainQuantityUnit: "kg",
  stockReconciliationVersion: 1,
  companySettings: {
    emitterCuit: "",
  },
  accounts: baseAccounts.map(([code, name, activity]) => ({ id: uid(), code, name, activity })),
  entities: [],
  invoices: [],
  orders: [],
  checks: [],
  settlements: [],
  stockMovements: [],
  ledger: [],
  fiscalData: [],
  changeLog: [],
  syncLog: [],
});

const syncCollections = ["entities", "invoices", "orders", "checks", "settlements", "stockMovements", "ledger"];
const syncStatuses = ["synced", "pending", "error", "conflict"];
let activeSyncTouches = null;
let syncTouchRecordingSuspended = false;

function nowIso() {
  return new Date().toISOString();
}

function syncMeta(item = {}, fallbackStatus = "pending", options = {}) {
  const status = syncStatuses.includes(item.syncStatus) ? item.syncStatus : fallbackStatus;
  return {
    syncStatus: status,
    updatedAt: item.updatedAt || (options.keepMissingUpdatedAtEmpty ? "" : nowIso()),
    lastSyncAt: item.lastSyncAt || "",
    remoteId: item.remoteId || "",
    lastSyncError: item.lastSyncError || "",
    sourceId: item.sourceId || "",
    originId: item.originId || item.sourceId || "",
    syncVersion: Number(item.syncVersion || 0),
  };
}

function withSyncMeta(item, fallbackStatus = "pending", options = {}) {
  return { ...item, ...syncMeta(item, fallbackStatus, options) };
}

const SYNC_META_FIELDS = ["syncStatus", "updatedAt", "lastSyncAt", "remoteId", "lastSyncError", "sourceId", "originId", "syncVersion"];

function markSyncPending(item) {
  return {
    ...item,
    syncStatus: "pending",
    updatedAt: nowIso(),
    lastSyncError: "",
    syncVersion: Number(item.syncVersion || 0) + 1,
  };
}

function beginUserSyncChange() {
  activeSyncTouches = new Map();
}

function syncTouchKey(recordType, recordId, action = "upsertRecord") {
  return `${action}:${recordType}:${recordId}`;
}

function canRecordSyncTouch() {
  return activeSyncTouches && !syncTouchRecordingSuspended;
}

function rememberTouchedSyncRecord(recordType, recordId, action = "upsertRecord") {
  if (!canRecordSyncTouch() || !recordType || !recordId) return;
  activeSyncTouches.set(syncTouchKey(recordType, recordId, action), { recordType, recordId, action });
}

function flushTouchedSyncRecordsToQueue() {
  const touched = [...(activeSyncTouches || new Map()).values()];
  activeSyncTouches = null;
  touched.forEach((item) => enqueueSyncRecord(item.recordType, item.recordId, item.action || "upsertRecord"));
  return touched.length;
}

function withSuspendedSyncTouchRecording(fn) {
  const previous = syncTouchRecordingSuspended;
  syncTouchRecordingSuspended = true;
  try {
    return fn();
  } finally {
    syncTouchRecordingSuspended = previous;
  }
}

function shouldAutoQueueRecord(item) {
  return Boolean(
    item?.id
    && ["pending", "error", "conflict"].includes(item.syncStatus || "")
    && item.updatedAt
  );
}

function markForSyncCollection(collection, item, { force = false } = {}) {
  const shouldMark = force || canRecordSyncTouch();
  const next = shouldMark ? markSyncPending(item) : item;
  if (shouldMark && syncCollections.includes(collection)) {
    rememberTouchedSyncRecord(syncRecordTypeForCollection(collection), next.id);
  }
  return next;
}

function markExistingRecordForSync(collection, id, { force = false } = {}) {
  if (!syncCollections.includes(collection) || !id) return;
  state[collection] = (state[collection] || []).map((item) => (
    item.id === id ? markForSyncCollection(collection, item, { force }) : item
  ));
}

function markCollectionPending(collection) {
  state[collection] = (state[collection] || []).map((item) => markSyncPending(item));
}

function markCollectionAsLocalBaseline(collection) {
  state[collection] = (state[collection] || []).map((item) => ({
    ...item,
    syncStatus: "synced",
    lastSyncError: "",
  }));
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${uid()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function syncRecordTypeForCollection(collection) {
  return ({
    entities: "entity",
    invoices: "invoice",
    orders: "order",
    checks: "check",
    settlements: "settlement",
    stockMovements: "stockMovement",
    ledger: "ledger",
  })[collection] || collection;
}

function syncCollectionForRecordType(recordType) {
  return ({
    entity: "entities",
    invoice: "invoices",
    order: "orders",
    check: "checks",
    settlement: "settlements",
    stockMovement: "stockMovements",
    ledger: "ledger",
  })[recordType] || recordType;
}

function syncQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMOTE_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSyncQueue(queue) {
  localStorage.setItem(REMOTE_QUEUE_KEY, JSON.stringify(queue));
  localStorage.setItem(REMOTE_PENDING_KEY, queue.length ? "1" : "");
  if (!queue.length) localStorage.removeItem(REMOTE_PENDING_KEY);
}

function queueKey(entry) {
  return `${entry.action || "upsertRecord"}:${entry.recordType}:${entry.recordId}`;
}

function enqueueSyncRecord(recordType, recordId, action = "upsertRecord") {
  if (!recordType || !recordId) return;
  const current = syncQueue();
  const key = queueKey({ action, recordType, recordId });
  const existing = current.find((item) => queueKey(item) === key);
  if (existing) {
    existing.enqueuedAt = nowIso();
    return setSyncQueue(current);
  }
  current.push({
    id: uid(),
    action,
    recordType,
    recordId,
    deviceId: getDeviceId(),
    enqueuedAt: nowIso(),
    attempts: 0,
    lastError: "",
  });
  setSyncQueue(current);
}

function enqueuePendingLocalRecords() {
  syncCollections.forEach((collection) => {
    const recordType = syncRecordTypeForCollection(collection);
    (state[collection] || []).forEach((item) => {
      if (!item?.id) return;
      if (collection === "ledger" && item.generated) return;
      if (shouldAutoQueueRecord(item)) {
        enqueueSyncRecord(recordType, item.id);
      }
    });
  });
}

function findLocalSyncRecord(recordType, recordId) {
  const collection = syncCollectionForRecordType(recordType);
  return (state[collection] || []).find((item) => String(item.id || "") === String(recordId || ""));
}

function updateLocalSyncRecord(recordType, recordId, updater) {
  const collection = syncCollectionForRecordType(recordType);
  state[collection] = (state[collection] || []).map((item) => {
    if (String(item.id || "") !== String(recordId || "")) return item;
    return updater(item);
  });
}

function remotePayloadRecords(payload = {}) {
  const records = [];
  const registryRows = Array.isArray(payload.registry) ? payload.registry : [];
  registryRows.forEach((row) => {
    if (row.disabledEconomicEffect === true || String(row.disabledEconomicEffect || "").toLowerCase() === "true") return;
    let record = null;
    try {
      record = typeof row.payloadJson === "string" ? JSON.parse(row.payloadJson || "{}") : row.payloadJson;
    } catch {
      record = null;
    }
    if (!record || typeof record !== "object") return;
    if (!record.id && !row.recordId) return;
    records.push({
      recordType: row.recordType,
      recordId: record.id || row.recordId,
      syncVersion: Number(row.syncVersion || record.syncVersion || 0),
      partialPayload: !remoteRecordHasBusinessPayload(row.recordType, record),
      record: {
        ...record,
        id: record.id || row.recordId,
        syncStatus: "synced",
        lastSyncAt: row.lastSyncAt || record.lastSyncAt || nowIso(),
        syncVersion: Number(row.syncVersion || record.syncVersion || 0),
        remoteId: row.recordId || record.remoteId || "",
      },
      registryRow: row,
    });
  });
  return records;
}

function remoteRecordHasBusinessPayload(recordType, record = {}) {
  if (!record || typeof record !== "object") return false;
  if (recordType === "entity") return Boolean(record.name);
  if (recordType === "order") return Boolean(record.type && record.counterparty && (record.amountArs || record.amount || record.total));
  if (recordType === "invoice") return Boolean(record.provider && (record.number || record.receipt) && (record.amountArs || record.balanceArs || record.usdAmount || record.balanceUsd));
  if (recordType === "settlement") return Boolean(record.buyer && record.product && (record.receivableTotal || record.quantity));
  if (recordType === "check") return Boolean(record.number && record.amount);
  if (recordType === "ledger") return Boolean((record.amount || record.amount === 0) && (record.concept || record.orderId || record.checkId || record.sourceId || record.originId));
  if (recordType === "stockMovement") return Boolean(record.date && record.kind && record.product && (record.quantity || record.weightKg));
  return Boolean(record.id && Object.keys(record).length > 4);
}

function mergeRemoteRecord(remote) {
  if (remote.recordType === "ledger") {
    return "skipped";
  }
  const local = findLocalSyncRecord(remote.recordType, remote.recordId);
  const collection = syncCollectionForRecordType(remote.recordType);
  const remoteVersion = Number(remote.syncVersion || remote.record?.syncVersion || 0);
  if (remote.partialPayload) {
    if (!local) return "skipped";
    const localVersion = Number(local.syncVersion || 0);
    const localHasPendingChange = ["pending", "error"].includes(local.syncStatus || "");
    if (localHasPendingChange && remoteVersion > localVersion) {
      updateLocalSyncRecord(remote.recordType, remote.recordId, (item) => ({
        ...item,
        syncStatus: "conflict",
        lastSyncError: `Identidad remota v${remoteVersion} sin payload completo mientras habia cambios locales v${localVersion}.`,
      }));
      addSyncLog("pull-record", { record: remote.recordId, origin: "google-sheets", destination: "app", result: "conflict", error: "Registry parcial con version remota mas nueva" });
      return "conflict";
    }
    if (!localHasPendingChange && remoteVersion >= localVersion) {
      updateLocalSyncRecord(remote.recordType, remote.recordId, (item) => ({
        ...item,
        syncStatus: "synced",
        lastSyncAt: remote.record.lastSyncAt || item.lastSyncAt || nowIso(),
        remoteId: remote.recordId,
        lastSyncError: "",
        syncVersion: Math.max(localVersion, remoteVersion),
      }));
      return "registry-partial";
    }
    return "skipped";
  }
  if (!local) {
    state[collection] = [...(state[collection] || []), withSyncMeta(remote.record, "synced")];
    addSyncLog("pull-record", { record: remote.recordId, origin: "google-sheets", destination: "app", result: "inserted" });
    return "inserted";
  }
  const localVersion = Number(local.syncVersion || 0);
  const localHasPendingChange = ["pending", "error"].includes(local.syncStatus || "");
  if (localHasPendingChange && remoteVersion > localVersion) {
    updateLocalSyncRecord(remote.recordType, remote.recordId, (item) => ({
      ...item,
      syncStatus: "conflict",
      lastSyncError: `Cambio remoto v${remoteVersion} mientras este dispositivo tenia cambios locales v${localVersion}.`,
    }));
    addSyncLog("pull-record", { record: remote.recordId, origin: "google-sheets", destination: "app", result: "conflict", error: "Version remota mas nueva con cambio local pendiente" });
    return "conflict";
  }
  if (remoteVersion > localVersion) {
    updateLocalSyncRecord(remote.recordType, remote.recordId, () => withSyncMeta(remote.record, "synced"));
    addSyncLog("pull-record", { record: remote.recordId, origin: "google-sheets", destination: "app", result: "updated" });
    return "updated";
  }
  if (remoteVersion === localVersion && local.syncStatus !== "pending") {
    updateLocalSyncRecord(remote.recordType, remote.recordId, (item) => ({
      ...item,
      syncStatus: "synced",
      lastSyncAt: remote.record.lastSyncAt || item.lastSyncAt || nowIso(),
      remoteId: remote.recordId,
      lastSyncError: "",
    }));
    return "synced";
  }
  return "skipped";
}

function addSyncLog(action, detail = {}) {
  const entry = {
    id: uid(),
    at: nowIso(),
    action,
    record: detail.record || "",
    origin: detail.origin || "app",
    destination: detail.destination || "local",
    result: detail.result || "ok",
    error: detail.error || "",
  };
  state.syncLog = [...(state.syncLog || []), entry].slice(-300);
  return entry;
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let modalMode = "";
let editingId = "";
let selectedActivity = "";
let selectedStockFilter = null;
let selectedKpi = "";
let selectedIndicatorActivity = "";
let selectedIndicatorFiscalYear = "";
let selectedIndicatorMetric = "";
let selectedCashflowMonth = "";
let selectedCashflowGroup = "";
let selectedCashflowDirection = "";
let selectedCashflowExpandedGroup = "";
let selectedCashflowStatus = "";
let selectedCashflowDetailFilters = {};
let selectedPendingStatus = "";
let selectedPendingDirection = "";
let selectedPendingFilters = {};
let selectedCheckStatus = "todos";
let selectedCheckNumber = "";
let selectedInvoiceProvider = "";
let selectedOrderType = "";
let selectedOrderEntity = "";
let selectedOrderStatus = "";
let selectedOrderFrom = "";
let selectedOrderTo = "";
let selectedLedgerEntity = "";
let selectedLedgerStatus = "";
let selectedLedgerColumns = {};
let selectedSettlementFrom = "";
let selectedSettlementTo = "";
let selectedSettlementBuyer = "";
let selectedSettlementProduct = "";
let selectedStockDate = "";
let selectedStockView = "grano";
let selectedView = "dashboard";
let selectedToolPanel = "";
let latestSyncAudit = null;
let latestQueueCleanupDryRun = null;
let latestEntityRegistryDryRun = null;
let syncQueueAuditInFlight = false;
let orderDueDateAuto = true;
let undoStack = [];

const titles = {
  dashboard: ["Tablero", "Caja, vencimientos, stock y compromisos en un solo lugar."],
  pending: ["Pendientes", "Compromisos vencidos o proximos para revisar cada dia."],
  control: ["Control", "Alertas de consistencia para confiar en los datos."],
  indicators: ["Indicadores", "Comparacion de ingresos, costos y resultado por actividad."],
  ledger: ["Libro diario", "Registro integrado de hechos, cobros, pagos, cheques e impuestos."],
  invoices: ["Facturas financiadas", "Deudas en pesos o dolares, vencimientos y diferencias de cambio."],
  orders: ["Ordenes", "Ordenes de cobro y pago con sus medios de cancelacion."],
  cashflow: ["Flujo fondos", "Historial mensual y proyeccion de facturas, ordenes y cheques."],
  checks: ["Cheques", "Cartera, emitidos, depositados y endosados."],
  settlements: ["Liquidaciones", "Ventas/compras agropecuarias con impacto en stock."],
  stock: ["Stock", "Existencias por producto, campana y acopio."],
  accounts: ["Plan", "Actividades e imputaciones para cargar siempre igual."],
  workflow: ["Guia de carga", "Circuito recomendado para cargar informacion sin saltear pasos."],
  tools: ["Herramientas", "Plan de negocio, guia de carga y respaldo manual."],
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return cleanState();
    const normalized = normalize(parsed);
    if (shouldPersistBusinessLoadMigration(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateForBusinessLoadMigrationPersist(parsed, normalized)));
    }
    return normalized;
  } catch {
    return cleanState();
  }
}

function shouldPersistBusinessLoadMigration(parsed = {}) {
  return parsed.grainQuantityUnit !== "kg" || parsed.stockReconciliationVersion !== 1;
}

function stateForBusinessLoadMigrationPersist(rawState = {}, normalizedState = {}) {
  const persisted = clone(normalizedState);
  syncCollections.forEach((collection) => {
    const rawById = new Map((rawState[collection] || []).map((item) => [item.id, item]));
    persisted[collection] = (persisted[collection] || []).map((item) => {
      const raw = rawById.get(item.id);
      const next = { ...item };
      SYNC_META_FIELDS.forEach((field) => {
        if (raw && Object.prototype.hasOwnProperty.call(raw, field)) next[field] = raw[field];
        else delete next[field];
      });
      return next;
    });
  });
  return persisted;
}

function fiscalYearForDate(value) {
  const [year, month] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month) return "";
  const startYear = month >= 5 ? year : year - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

function fiscalYearStart(fiscalYear = "") {
  const startYear = Number(String(fiscalYear).slice(0, 4));
  return startYear ? `${startYear}-05-01` : "";
}

function fiscalYearEnd(fiscalYear = "") {
  const startYear = Number(String(fiscalYear).slice(0, 4));
  return startYear ? `${startYear + 1}-04-30` : "";
}

function itemFiscalYear(item, fields = ["date", "dueDate"]) {
  const date = fields.map((field) => item?.[field]).find(Boolean);
  return item?.fiscalYear || fiscalYearForDate(date);
}

function withFiscalYear(item, dateFields = ["date", "dueDate"]) {
  const date = dateFields.map((field) => item?.[field]).find(Boolean);
  return { ...item, fiscalYear: item.fiscalYear || fiscalYearForDate(date) || "" };
}

function orderNumberPrefix(type) {
  return type === "cobro" ? "OC" : "OP";
}

function fiscalYearStartForNumber(item) {
  const fiscalYear = item?.fiscalYear || fiscalYearForDate(item?.date || item?.dueDate);
  return String(fiscalYear || "").slice(0, 4) || String(item?.date || localToday()).slice(0, 4);
}

function orderNumberSortDate(item) {
  return item.date || item.dueDate || "";
}

function assignMissingOrderNumbers(orders) {
  const counters = {};
  const used = new Set(orders.map((item) => item.orderNumber).filter(Boolean));
  const assigned = new Map();
  const sorted = [...orders].sort((a, b) => orderNumberSortDate(a).localeCompare(orderNumberSortDate(b)) || String(a.id || "").localeCompare(String(b.id || "")));
  sorted.forEach((order) => {
    const key = `${orderNumberPrefix(order.type)}-${fiscalYearStartForNumber(order)}`;
    const match = String(order.orderNumber || "").match(/^(OP|OC)-(\d{4})-(\d{4})$/);
    if (match) counters[`${match[1]}-${match[2]}`] = Math.max(counters[`${match[1]}-${match[2]}`] || 0, Number(match[3]));
    else counters[key] ||= 0;
  });
  sorted.forEach((order) => {
    if (order.orderNumber) return;
    const prefix = orderNumberPrefix(order.type);
    const year = fiscalYearStartForNumber(order);
    const key = `${prefix}-${year}`;
    let next;
    do {
      counters[key] = (counters[key] || 0) + 1;
      next = `${prefix}-${year}-${String(counters[key]).padStart(4, "0")}`;
    } while (used.has(next));
    used.add(next);
    assigned.set(order.id, next);
  });
  return orders.map((order) => {
    if (order.orderNumber) return order;
    return { ...order, orderNumber: assigned.get(order.id) || nextOrderNumber(order.type, order.date || order.dueDate, order.id) };
  });
}

function nextOrderNumber(type, date = localToday(), currentId = "") {
  const prefix = orderNumberPrefix(type);
  const year = fiscalYearStartForNumber({ type, date });
  const max = state.orders
    .filter((order) => order.id !== currentId)
    .map((order) => String(order.orderNumber || ""))
    .map((value) => value.match(new RegExp(`^${prefix}-${year}-(\\d{4})$`)))
    .filter(Boolean)
    .reduce((highest, match) => Math.max(highest, Number(match[1])), 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

function normalize(next) {
  const migrated = migrateGrainQuantitiesToKg(next);
  const sourceBeforeCleanup = restoreKnownCooparMaizSettlements(migrated.stockReconciliationVersion === 1 ? migrated : reconcileLegacyStockDuplicates(migrated));
  const source = removeKnownCooparDuplicateEntries(sourceBeforeCleanup);
  const fresh = cleanState();
  const accounts = mergeBaseAccounts(source.accounts?.length ? source.accounts : fresh.accounts);
  const sanitizeActivity = (item) => ({ ...item, activity: normalizeActivity(item.activity, accountActivityFromList(accounts, item.accountId)) });
  const sanitizeInvoice = (item) => withFiscalYear(normalizeInvoiceRecord({ ...sanitizeActivity(item), provider: normalizeEntityName(item.provider) }), ["date", "dueDate"]);
  const sanitizeOrder = (item) => withFiscalYear({ ...sanitizeActivity(item), counterparty: normalizeEntityName(item.counterparty) }, ["date", "dueDate"]);
  const sanitizeLedger = (item) => withFiscalYear({ ...sanitizeActivity(item), counterparty: normalizeEntityName(item.counterparty) }, ["date"]);
  const sanitizeFiscalData = (item) => ({
    id: item.id || uid(),
    fiscalYear: item.fiscalYear || "",
    agriculturalHa: Number(item.agriculturalHa || 0),
    cattleHa: Number(item.cattleHa || 0),
    equity: Number(item.equity || 0),
    totalLiabilities: Number(item.totalLiabilities || 0),
    currentAssetsExtra: Number(item.currentAssetsExtra || 0),
    currentLiabilitiesExtra: Number(item.currentLiabilitiesExtra || 0),
    notes: item.notes || "",
  });
  const rawNormalized = {
    ...fresh,
    ...source,
    grainQuantityUnit: "kg",
    stockReconciliationVersion: 1,
    companySettings: {
      ...fresh.companySettings,
      ...(source.companySettings || {}),
      emitterCuit: String(source.companySettings?.emitterCuit || "").trim(),
    },
    accounts,
    entities: normalizeEntities(source),
    invoices: (source.invoices || []).map(sanitizeInvoice),
    orders: assignMissingOrderNumbers((source.orders || []).map(sanitizeOrder)),
    checks: deduplicateChecks((source.checks || []).map(normalizeCheck).map(sanitizeOrder)),
    settlements: (source.settlements || []).map(normalizeSettlement).map((item) => withFiscalYear(item, ["date"])),
    stockMovements: (source.stockMovements || []).map(normalizeStockMovement).map((item) => withFiscalYear(item, ["date"])),
    fiscalData: (source.fiscalData || []).map(sanitizeFiscalData).filter((item) => item.fiscalYear),
    changeLog: (source.changeLog || []).map((item) => ({ id: item.id || uid(), at: item.at || "", label: item.label || "cambio", records: Number(item.records || 0) })).slice(-200),
    ledger: (source.ledger || [])
      .filter((item) => item.kind !== "Mensual fijo")
      .map((item) => item.kind === "Impuesto al cheque" || item.kind === "Imp. al cheque" ? { ...item, kind: "Imp. al cheque", type: "pago", concept: "Imp. al cheque", counterparty: "ARCA", status: "pagado", notes: "" } : item)
      .map(sanitizeLedger),
    fixedCashflows: [],
    syncLog: (source.syncLog || []).map((item) => ({
      id: item.id || uid(),
      at: item.at || "",
      action: item.action || "",
      record: item.record || "",
      origin: item.origin || "",
      destination: item.destination || "",
      result: item.result || "",
      error: item.error || "",
    })).slice(-300),
  };
  syncCollections.forEach((collection) => {
    rawNormalized[collection] = (rawNormalized[collection] || []).map((item) => withSyncMeta(item, "synced", { keepMissingUpdatedAtEmpty: true }));
  });
  const validCheckIds = new Set(rawNormalized.checks.map((item) => item.id).filter(Boolean));
  rawNormalized.ledger = rawNormalized.ledger.filter((item) => {
    if (item.checkId && !validCheckIds.has(item.checkId)) return false;
    const orderId = String(item.orderId || "");
    if (orderId.startsWith("check:")) {
      const checkId = orderId.split(":")[1];
      if (checkId && !validCheckIds.has(checkId)) return false;
    }
    return true;
  });
  return attachEntityIds(canonicalizeStateEntities(rawNormalized));
}

function companyEmitterCuit() {
  return String(state.companySettings?.emitterCuit || "").trim();
}

function removeKnownCooparDuplicateEntries(source) {
  const ordersToRemove = new Set([
    "2eafa292-996c-4126-95a9-7fb7b2b17121",
    "cce667db-2759-4426-a147-a072b5cf05b0",
    "38c04cc5-091a-4675-a487-2421f98e85d8",
    "818593db-b7ce-4d13-b01a-ff303639f18b",
    "f8c464cd-2601-4902-98a2-a70158f82328",
  ]);
  const ledgerBelongsToRemovedOrder = (item) => {
    const orderId = String(item.orderId || "");
    return [...ordersToRemove].some((id) => orderId === id || orderId.startsWith(`order:${id}:`) || orderId.startsWith(`${id}:`));
  };
  const orders = (source.orders || []).filter((item) => !ordersToRemove.has(item.id)).map((item) => {
    if (item.id !== "732f5d7c-1688-4a42-96a0-64dde6b81881") return item;
    return {
      ...item,
      sourceId: "settlement:8e60774e-cb8d-466f-b8e4-44af675f6ba6",
      sourceLabel: "Liquidacion Maiz",
      concept: "Cobro venta Maiz sin IVA",
    };
  });
  return {
    ...source,
    orders,
    ledger: (source.ledger || []).filter((item) => !ledgerBelongsToRemovedOrder(item)),
  };
}

function restoreKnownCooparMaizSettlements(source) {
  if (source.cooparMaizRestoreVersion === 1) return source;
  const settlements = [...(source.settlements || [])];
  let stockMovements = [...(source.stockMovements || [])];
  const ensureSettlement = (settlement) => {
    if (!settlements.some((item) => item.id === settlement.id)) settlements.push(settlement);
  };
  const ensureStock = (movement) => {
    stockMovements = stockMovements.filter((item) => {
      if (item.sourceId) return true;
      return !(item.date === movement.date
        && normalizeName(item.reason) === normalizeName(movement.reason)
        && normalizeName(item.product) === normalizeName(movement.product)
        && normalizeName(item.campaign) === normalizeName(movement.campaign)
        && normalizeEntityName(item.counterparty) === normalizeEntityName(movement.counterparty)
        && Math.abs(Number(item.quantity || 0) - Number(movement.quantity || 0)) < 0.01);
    });
    if (!stockMovements.some((item) => item.sourceId === movement.sourceId)) stockMovements.push(movement);
  };
  ensureSettlement({
    id: "3ce0161c-aa5e-48d5-a763-698b3f356e2a",
    date: "2026-05-16",
    operation: "venta",
    buyer: "Coopar",
    product: "Maiz",
    campaign: "2025/26",
    stockPlace: "Coopar",
    noCartaPorte: true,
    canje: false,
    quantity: 40000,
    priceGross: 254551.78,
    priceNet: 254551.78,
    receivableTotalOverride: 10182071,
    status: "cobrado",
    notes: "40 tn de maíz vendidos",
  });
  ensureSettlement({
    id: "8e60774e-cb8d-466f-b8e4-44af675f6ba6",
    date: "2026-05-31",
    operation: "venta",
    buyer: "Coopar",
    product: "Maiz",
    campaign: "2025/26",
    stockPlace: "Coopar",
    noCartaPorte: false,
    canje: false,
    quantity: 25013,
    priceGross: 236337.5,
    priceNet: 238700,
    receivableTotalOverride: 5850621.34,
    status: "cobrado",
    notes: "Importado pendiente Excel fila 25.",
  });
  ensureStock({
    id: "stock-coopar-maiz-40000-2026-05-16",
    sourceId: "3ce0161c-aa5e-48d5-a763-698b3f356e2a",
    date: "2026-05-16",
    kind: "grano",
    activity: "Agricultura",
    product: "Maiz",
    campaign: "2025/26",
    counterparty: "Coopar",
    reason: "venta",
    quantity: -40000,
    notes: "40 tn de maíz vendidos",
  });
  ensureStock({
    id: "stock-coopar-maiz-25013-2026-05-31",
    sourceId: "8e60774e-cb8d-466f-b8e4-44af675f6ba6",
    date: "2026-05-31",
    kind: "grano",
    activity: "Agricultura",
    product: "Maiz",
    campaign: "2025/26",
    counterparty: "Coopar",
    reason: "venta",
    quantity: -25013,
    notes: "Importado pendiente Excel fila 25.",
  });
  return { ...source, settlements, stockMovements, cooparMaizRestoreVersion: 1 };
}

function deduplicateChecks(checks) {
  const rank = { pendiente: 0, emitido: 0, endosado: 1, depositado: 2, pagado: 3, cobrado: 3 };
  const byKey = new Map();
  checks.forEach((check) => {
    const key = [
      check.orderId || "",
      check.direction || "",
      normalizeName(check.number),
      check.dueDate || "",
      normalizeEntityName(check.counterparty),
      Math.round(Number(check.amount || 0) * 100),
    ].join("|");
    const previous = byKey.get(key);
    const currentRank = rank[check.status] ?? 0;
    const previousRank = rank[previous?.status] ?? 0;
    if (!previous || currentRank > previousRank || (currentRank === previousRank && String(check.statusDate || "") > String(previous.statusDate || ""))) {
      byKey.set(key, { ...previous, ...check, id: previous?.id || check.id, orderNumber: check.orderNumber || previous?.orderNumber || "" });
    }
  });
  return [...byKey.values()];
}

function canonicalizeStateEntities(source) {
  return {
    ...source,
    invoices: source.invoices.map((item) => ({ ...item, provider: normalizeEntityName(item.provider) })),
    orders: source.orders.map((item) => ({ ...item, counterparty: normalizeEntityName(item.counterparty) })),
    checks: source.checks.map((item) => ({ ...item, counterparty: normalizeEntityName(item.counterparty), endorsedTo: normalizeEntityName(item.endorsedTo) })),
    settlements: source.settlements.map((item) => ({ ...item, buyer: normalizeEntityName(item.buyer), stockPlace: normalizeEntityName(item.stockPlace) })),
    stockMovements: source.stockMovements.map((item) => ({ ...item, counterparty: normalizeEntityName(item.counterparty) })),
    ledger: source.ledger.map((item) => ({ ...item, counterparty: normalizeEntityName(item.counterparty) })),
  };
}

function stableEntityId(name) {
  const key = entityKey(name);
  return key ? `ENT-${key.toUpperCase().slice(0, 28)}` : "";
}

function normalizeEntityRecord(item) {
  const name = normalizeEntityName(item?.name || item?.counterparty || item?.provider || item?.buyer || "");
  if (!name) return null;
  return {
    id: stableEntityId(name),
    name,
    aliases: Array.isArray(item?.aliases) ? item.aliases.map(normalizeEntityName).filter(Boolean) : [],
    cuit: item?.cuit || "",
    phone: item?.phone || item?.telefono || "",
    contact: item?.contact || item?.contacto || "",
    notes: item?.notes || "",
    syncStatus: item?.syncStatus,
    updatedAt: item?.updatedAt,
    lastSyncAt: item?.lastSyncAt,
    remoteId: item?.remoteId,
    lastSyncError: item?.lastSyncError,
    sourceId: item?.sourceId,
    originId: item?.originId,
    syncVersion: item?.syncVersion,
  };
}

function normalizeEntities(source) {
  const byKey = new Map();
  (source.entities || []).map(normalizeEntityRecord).filter(Boolean).forEach((entity) => {
    const key = entityKey(entity.name);
    const previous = byKey.get(key);
    byKey.set(key, previous ? {
      ...previous,
      ...entity,
      aliases: [...new Set([...(previous.aliases || []), ...(entity.aliases || [])])],
      cuit: previous.cuit || entity.cuit || "",
      phone: previous.phone || entity.phone || "",
      contact: previous.contact || entity.contact || "",
      notes: previous.notes || entity.notes || "",
      syncStatus: entity.syncStatus || previous.syncStatus,
      updatedAt: entity.updatedAt || previous.updatedAt,
      lastSyncAt: entity.lastSyncAt || previous.lastSyncAt,
      remoteId: entity.remoteId || previous.remoteId,
      lastSyncError: entity.lastSyncError || previous.lastSyncError,
      sourceId: entity.sourceId || previous.sourceId,
      originId: entity.originId || previous.originId,
      syncVersion: entity.syncVersion ?? previous.syncVersion,
    } : entity);
  });
  entityNamesFromState(source).forEach((name) => {
    const normalizedName = normalizeEntityName(name);
    if (!normalizedName) return;
    const key = entityKey(normalizedName);
    if (!byKey.has(key)) byKey.set(key, { id: stableEntityId(normalizedName), name: normalizedName, aliases: [], cuit: "", phone: "", contact: "", notes: "" });
  });
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function entityNamesFromState(source = state) {
  return [
    ...(source.invoices || []).map((item) => item.provider),
    ...(source.orders || []).map((item) => item.counterparty),
    ...(source.checks || []).map((item) => item.counterparty),
    ...(source.settlements || []).map((item) => item.buyer),
    ...(source.settlements || []).map((item) => item.stockPlace),
    ...(source.stockMovements || []).map((item) => item.counterparty),
    ...(source.ledger || []).map((item) => item.counterparty),
  ].filter(Boolean);
}

function entityIdForName(name, source = state) {
  const normalizedName = normalizeEntityName(name);
  if (!normalizedName) return "";
  const key = entityKey(normalizedName);
  return (source.entities || []).find((item) => entityKey(item.name) === key || (item.aliases || []).some((alias) => entityKey(alias) === key))?.id || stableEntityId(normalizedName);
}

function attachEntityIds(source) {
  const withId = (name) => entityIdForName(name, source);
  const normalizedEntities = normalizeEntities(source);
  const entitySource = { ...source, entities: normalizedEntities };
  const canonicalId = (name) => entityIdForName(name, entitySource);
  return {
    ...source,
    entities: normalizedEntities,
    invoices: source.invoices.map((item) => ({ ...item, entityId: canonicalId(item.provider) })),
    orders: source.orders.map((item) => ({ ...item, entityId: canonicalId(item.counterparty) })),
    checks: source.checks.map((item) => ({ ...item, entityId: canonicalId(item.counterparty) })),
    settlements: source.settlements.map((item) => ({ ...item, buyerEntityId: canonicalId(item.buyer), stockPlaceEntityId: canonicalId(item.stockPlace) })),
    stockMovements: source.stockMovements.map((item) => ({ ...item, entityId: canonicalId(item.counterparty) })),
    ledger: source.ledger.map((item) => ({ ...item, entityId: canonicalId(item.counterparty), generated: item.generated ?? Boolean(item.orderId || item.checkId || item.invoiceId) })),
  };
}

function accountActivityFromList(accounts, accountId) {
  return accounts.find((item) => item.id === accountId)?.activity || "Gerenciamiento";
}

function reconcileLegacyStockDuplicates(source) {
  const movements = (source.stockMovements || []).map((item) => ({ ...item }));
  const linked = movements.filter((item) => item.sourceId && (source.settlements || []).some((settlement) => settlement.id === item.sourceId));
  const removed = new Set();
  linked.forEach((generated) => {
    const candidates = movements
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => !removed.has(index) && !item.sourceId && stockMovementsRepresentSameOperation(item, generated))
      .sort((a, b) => stockMovementDateDistance(a.item, generated) - stockMovementDateDistance(b.item, generated));
    if (candidates.length && stockMovementDateDistance(candidates[0].item, generated) <= 45) removed.add(candidates[0].index);
  });
  return {
    ...source,
    stockReconciliationVersion: 1,
    stockMovements: movements.filter((item, index) => !removed.has(index)),
  };
}

function stockMovementsRepresentSameOperation(a, b) {
  return normalizeName(a.reason).toLowerCase() === normalizeName(b.reason).toLowerCase()
    && normalizeName(a.product).toLowerCase() === normalizeName(b.product).toLowerCase()
    && normalizeName(a.campaign).toLowerCase() === normalizeName(b.campaign).toLowerCase()
    && normalizeName(a.counterparty).toLowerCase() === normalizeName(b.counterparty).toLowerCase()
    && Math.abs(Number(a.quantity || 0) - Number(b.quantity || 0)) < 0.01;
}

function stockMovementDateDistance(a, b) {
  const left = new Date(`${a.date || "1900-01-01"}T00:00:00`);
  const right = new Date(`${b.date || "1900-01-01"}T00:00:00`);
  return Math.abs(left - right) / 86400000;
}

function migrateGrainQuantitiesToKg(next) {
  if (next.grainQuantityUnit === "kg") return next;
  return {
    ...next,
    grainQuantityUnit: "kg",
    settlements: (next.settlements || []).map((item) => stockKindFor(item.product, "grano") === "grano"
      ? { ...item, quantity: Number(item.quantity || 0) * 1000 }
      : item),
    stockMovements: (next.stockMovements || []).map((item) => stockKindFor(item.product, item.kind || "grano") === "grano"
      ? { ...item, quantity: Number(item.quantity || 0) * 1000 }
      : item),
  };
}

function mergeBaseAccounts(accounts) {
  const merged = accounts.map((item) => {
    const name = normalizeName(item.name).toLowerCase();
    if (name === "retiros socios") {
      return { ...item, code: "001", activity: "Socios" };
    }
    if (name === "aportes socios") {
      return { ...item, code: "002", activity: "Socios" };
    }
    if (name === "sueldos") {
      return { ...item, name: "Sueldos Ganaderia", activity: "Ganaderia" };
    }
    if (name === "cargas sociales") {
      return { ...item, name: "Cargas Sociales Ganaderia", activity: "Ganaderia" };
    }
    if (name === "gastos del personal") {
      return { ...item, name: "Gastos del personal Ganaderia", activity: "Ganaderia" };
    }
    return { ...item, activity: normalizeActivity(item.activity, inferBaseAccountActivity(item.name)) };
  });
  baseAccounts.forEach(([code, name, activity]) => {
    const exists = merged.some((item) => normalizeName(item.name).toLowerCase() === normalizeName(name).toLowerCase() && item.activity === activity);
    if (!exists) merged.push({ id: uid(), code, name, activity });
  });
  return merged;
}

function normalizeActivity(value, fallback = "Gerenciamiento") {
  const cleaned = normalizeName(value);
  const lower = cleaned.toLocaleLowerCase("es-AR");
  if (lower === "ganaderia" || lower === "ganaderia") return "Ganaderia";
  if (lower === "personal") return "Ganaderia";
  if (lower === "inversiones" || lower === "inversion") return "INVERSIONES";
  return validActivities.find((activity) => activity.toLocaleLowerCase("es-AR") === lower) || fallback;
}

function inferBaseAccountActivity(name) {
  const match = baseAccounts.find(([, accountName]) => normalizeName(accountName).toLocaleLowerCase("es-AR") === normalizeName(name).toLocaleLowerCase("es-AR"));
  return match?.[2] || "Gerenciamiento";
}

function normalizeSettlement(item) {
  const quantity = Number(item.quantity || 0);
  const kind = stockKindFor(item.product, "grano");
  const pricingQuantity = kind === "grano" ? quantity / 1000 : quantity;
  const noCartaPorte = Boolean(item.noCartaPorte);
  const canje = Boolean(item.canje);
  const isGrainSale = kind === "grano" && (item.operation || "venta") === "venta";
  const hasFiscalSettlement = isGrainSale && !noCartaPorte;
  const priceGross = Number(item.priceGross || item.grossPrice || (pricingQuantity ? Number(item.gross || item.grossAmount || 0) / pricingQuantity : 0));
  const priceNet = Number(item.priceNet || item.netPrice || (pricingQuantity ? Number(item.subtotal || item.net || 0) / pricingQuantity : 0));
  const grossSubtotal = roundMoney(item.grossSubtotal || (pricingQuantity * priceGross));
  const subtotal = roundMoney(item.subtotal || (pricingQuantity * priceNet) || item.net || 0);
  const retentionGanancias = roundMoney(hasFiscalSettlement && !canje ? subtotal * 0.02 : 0);
  const ivaTotal = roundMoney(hasFiscalSettlement ? subtotal * 0.105 : 0);
  const retentionIva = roundMoney(hasFiscalSettlement && !canje ? subtotal * 0.07 : 0);
  const ivaCobrar = roundMoney(Math.max(0, ivaTotal - retentionIva));
  const calculatedReceivableTotal = roundMoney(subtotal + ivaTotal - retentionGanancias - retentionIva);
  const receivableTotalOverride = roundMoney(item.receivableTotalOverride || 0);
  const receivableTotal = receivableTotalOverride || calculatedReceivableTotal;
  const cashReceivable = canje ? receivableTotal : Math.max(0, receivableTotal - ivaCobrar);
  return {
    ...item,
    product: normalizeName(item.product),
    buyer: normalizeEntityName(item.buyer),
    campaign: normalizeName(item.campaign),
    stockPlace: normalizeEntityName(item.stockPlace),
    noCartaPorte,
    canje,
    quantity,
    priceGross,
    priceNet,
    gross: grossSubtotal,
    net: receivableTotal,
    grossSubtotal,
    subtotal,
    retentionGanancias,
    ivaTotal,
    retentionIva,
    ivaCobrar,
    cashReceivable,
    calculatedReceivableTotal,
    receivableTotalOverride,
    receivableTotal,
    commercialCost: Math.max(0, grossSubtotal - subtotal),
    commercialCostPct: priceGross ? Math.max(0, ((priceGross - priceNet) / priceGross) * 100) : 0,
  };
}

function normalizeCheck(item) {
  const legacyPending = item.status === "emitido" || item.status === "recibido";
  const direction = item.direction || (item.status === "recibido" ? "recibido" : "emitido");
  return { ...item, direction, status: legacyPending ? "pendiente" : (item.status || "pendiente") };
}

function invoiceCurrency(invoice) {
  return String(invoice?.currency || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
}

function normalizeInvoiceRecord(item) {
  const currencyCode = invoiceCurrency(item);
  if (currencyCode === "ARS") {
    const amountArs = Number(item.amountArs || item.invoiceAmount || item.usdAmount || 0);
    const balanceArs = Number(item.balanceArs ?? item.balanceAmount ?? amountArs);
    return {
      ...item,
      currency: "ARS",
      amountArs,
      balanceArs,
      usdAmount: 0,
      balanceUsd: 0,
      tcInvoice: 1,
    };
  }
  const usdAmount = Number(item.usdAmount || item.invoiceAmount || item.amount || 0);
  const balanceUsd = Number(item.balanceUsd ?? item.balanceAmount ?? usdAmount);
  return {
    ...item,
    currency: "USD",
    usdAmount,
    balanceUsd,
    amountArs: 0,
    balanceArs: 0,
    tcInvoice: Number(item.tcInvoice || 0),
  };
}

function invoiceBalance(invoice) {
  return invoiceCurrency(invoice) === "ARS" ? Number(invoice.balanceArs || 0) : Number(invoice.balanceUsd || 0);
}

function invoiceOriginalAmount(invoice) {
  return invoiceCurrency(invoice) === "ARS" ? Number(invoice.amountArs || 0) : Number(invoice.usdAmount || 0);
}

function invoiceArsAmount(invoice) {
  return invoiceCurrency(invoice) === "ARS"
    ? Number(invoice.balanceArs || 0)
    : Number(invoice.balanceUsd || 0) * Number(invoice.tcInvoice || 0);
}

function invoiceBalanceLabel(invoice) {
  return `${invoiceCurrency(invoice)} ${number(invoiceBalance(invoice))}`;
}

function isFinalCheckStatus(status) {
  return ["pagado", "cobrado", "depositado", "endosado"].includes(status);
}

function updateCheckStatus(check, status) {
  const previousStatus = check.status;
  check.status = status;
  if (isFinalCheckStatus(status) && status !== previousStatus) check.statusDate = localToday();
  if (status === "pendiente") check.statusDate = "";
}

function save() {
  state = normalize(state);
  rebuildGeneratedLedgerFromSources();
  state = normalize(state);
  const touched = flushTouchedSyncRecordsToQueue();
  addSyncLog("save-local", { origin: "app", destination: "local", result: touched ? "pending" : "ok", record: touched ? `${touched} tocados` : "" });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (syncQueue().length) {
    localStorage.setItem(REMOTE_PENDING_KEY, "1");
    setSyncStatus("Cambios locales pendientes", "error");
  } else {
    localStorage.removeItem(REMOTE_PENDING_KEY);
    setSyncStatus("Guardado local");
  }
  queueRemoteSync();
}

function saveLocalOnly(message = "Guardado local, falta sincronizar") {
  state = normalize(state);
  rebuildGeneratedLedgerFromSources();
  state = normalize(state);
  addSyncLog("save-local", { origin: "app", destination: "local", result: "local-only" });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.removeItem(REMOTE_PENDING_KEY);
  setSyncStatus(message, "error");
}

function rebuildGeneratedLedgerFromSources() {
  const manualRows = (state.ledger || []).filter((item) => item.disabledEconomicEffect || (!item.generated && !item.orderId && !item.checkId && !item.invoiceId));
  state.ledger = manualRows;
  const orders = [...(state.orders || [])];
  withSuspendedSyncTouchRecording(() => {
    orders.forEach((order) => applyOrder(order));
    [...(state.checks || [])].forEach((check) => applyCheck(check));
  });
}

function remoteSyncUrl() {
  return (localStorage.getItem(REMOTE_SYNC_URL_KEY) || REMOTE_SYNC_URL || "").trim();
}

let remoteSyncTimer = null;

function setSyncStatus(text, mode = "") {
  const status = $("#syncStatus");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("saving", mode === "saving");
  status.classList.toggle("error", mode === "error");
}

function hasLocalSyncPending() {
  const counts = analyzeSyncState(state, null).localStatusCounts || {};
  return Boolean(
    syncQueue().length
    || Number(counts.pending || 0)
    || Number(counts.error || 0)
    || Number(counts.conflict || 0)
  );
}

function setStartupTechnicalAdjustmentStatus(adjusted) {
  if (!adjusted) return;
  if (hasLocalSyncPending()) {
    setSyncStatus("Cambios locales pendientes", "error");
    return;
  }
  setSyncStatus("Sincronizado");
}

function queueRemoteSync() {
  const url = remoteSyncUrl();
  if (!url) {
    setSyncStatus("Guardado local");
    return;
  }
  if (!syncQueue().length) {
    collectPendingRecordsForRetry();
  }
  if (!syncQueue().length) {
    setSyncStatus("Sincronizado");
    return;
  }
  if (syncQueue().length > 25) {
    setSyncStatus("Sync pendiente manual", "error");
    addSyncLog("auto-sync-skipped", { origin: "app", destination: "google-sheets", result: "blocked", error: "Cola masiva: requiere revision manual." });
    persistLocalState();
    return;
  }
  setSyncStatus("Guardando en cola...", "saving");
  clearTimeout(remoteSyncTimer);
  remoteSyncTimer = setTimeout(() => processSyncQueue({ reason: "auto" }), 1200);
}

function pushRemoteSnapshot(url = remoteSyncUrl()) {
  addSyncLog("legacy-full-push-blocked", { origin: "app", destination: "google-sheets", result: "blocked", error: "Envio completo deshabilitado. Usar envio granular desde panel de sincronizacion." });
  setSyncStatus("Envio automatico deshabilitado", "error");
  return;
  if (!url || !window.fetch) return;
  const updatedAt = new Date().toISOString();
  const signature = stateSignature(state);
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "write",
      app: "sagro-admin",
      updatedAt,
      state,
    }),
  })
    .then(() => {
      setTimeout(() => confirmRemoteWrite(url, signature, updatedAt), 1200);
    })
    .catch((error) => {
      setSyncStatus("No sincronizado", "error");
      console.warn("No se pudo sincronizar con la planilla", error);
    });
}

function collectPendingRecordsForRetry() {
  syncCollections.forEach((collection) => {
    const recordType = syncRecordTypeForCollection(collection);
    (state[collection] || []).forEach((item) => {
      if (collection === "ledger" && item.generated) return;
      if (shouldAutoQueueRecord(item)) enqueueSyncRecord(recordType, item.id);
    });
  });
}

function postRemoteAction(action, payload = {}, url = remoteSyncUrl(), options = {}) {
  if (!url || !window.fetch) return Promise.reject(new Error("No hay URL remota configurada."));
  const startedAt = performance.now();
  const debug = typeof options.debug === "function" ? options.debug : null;
  const requestId = `${action}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  if (debug) debug("request-start", `id=${requestId}; action=${action}; url=${url}`);
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || 15000);
  let timeout = setTimeout(() => controller.abort(), timeoutMs);
  const clearRequestTimeout = () => {
    if (!timeout) return;
    clearTimeout(timeout);
    timeout = null;
  };
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    signal: controller.signal,
    body: JSON.stringify({
      action,
      app: "sagro-admin",
      deviceId: getDeviceId(),
      ...payload,
    }),
  }).then((response) => {
    clearRequestTimeout();
    if (debug) debug("http-status", `id=${requestId}; ${response.status} ${response.statusText || ""}; elapsed=${Math.round(performance.now() - startedAt)}ms`);
    return response.text().then((text) => {
      if (debug) debug("response-text", `id=${requestId}; ${truncateSyncDebug(text)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      try {
        return JSON.parse(text);
      } catch (error) {
        error.message = `JSON invalido: ${error.message}`;
        throw error;
      }
    });
  }).catch((error) => {
    clearRequestTimeout();
    if (debug) debug("request-error", `id=${requestId}; name=${error?.name || ""}; message=${error?.message || String(error)}; elapsed=${Math.round(performance.now() - startedAt)}ms`);
    throw error;
  }).finally(clearRequestTimeout);
}

function checkRemoteSyncVersion(url = remoteSyncUrl()) {
  return postRemoteAction("version", {}, url).then((payload) => {
    if (!payload?.ok) throw new Error(payload?.error || "No se pudo verificar la version remota.");
    if (payload.syncEngineVersion !== SYNC_ENGINE_EXPECTED_VERSION) {
      throw new Error(`Apps Script desactualizado: ${payload.syncEngineVersion || "sin version"}. Esperado ${SYNC_ENGINE_EXPECTED_VERSION}.`);
    }
    return payload;
  });
}

function pullRemoteChanges({ silent = false } = {}) {
  const url = remoteSyncUrl();
  if (!url) return Promise.resolve({ ok: false, pulled: 0, reason: "no-url" });
  if (!silent) setSyncStatus("Leyendo cambios remotos...", "saving");
  return readRemoteSnapshot(url).then((payload) => {
    const remoteRecords = remotePayloadRecords(payload);
    const results = remoteRecords.map(mergeRemoteRecord);
    const changed = results.filter((item) => ["inserted", "updated", "conflict"].includes(item)).length;
    if (changed) {
      state = normalize(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      render();
    }
    localStorage.setItem(REMOTE_LAST_PULL_KEY, nowIso());
    addSyncLog("pull-remote", { origin: "google-sheets", destination: "app", result: "ok", record: `${changed} cambios` });
    persistLocalState();
    return { ok: true, pulled: changed, results };
  }).catch((error) => {
    addSyncLog("pull-remote", { origin: "google-sheets", destination: "app", result: "error", error: error.message });
    persistLocalState();
    if (!silent) setSyncStatus("No se pudo leer Sheets", "error");
    throw error;
  });
}

function markQueueItemError(queue, item, error) {
  item.attempts = Number(item.attempts || 0) + 1;
  item.lastError = error.message || String(error);
  item.nextRetryAt = new Date(Date.now() + Math.min(300000, 3000 * item.attempts)).toISOString();
  updateLocalSyncRecord(item.recordType, item.recordId, (record) => ({
    ...record,
    syncStatus: "error",
    lastSyncError: item.lastError,
  }));
  queue.push(item);
}

function markQueueItemConflict(queue, item, message) {
  item.lastError = message || "Conflicto de version";
  updateLocalSyncRecord(item.recordType, item.recordId, (record) => ({
    ...record,
    syncStatus: "conflict",
    lastSyncError: item.lastError,
  }));
  queue.push(item);
}

function applyRemoteSyncSuccess(item, response) {
  updateLocalSyncRecord(item.recordType, item.recordId, (record) => ({
    ...record,
    syncStatus: "synced",
    lastSyncAt: nowIso(),
    remoteId: response.recordId || item.recordId,
    lastSyncError: "",
    syncVersion: Number(response.syncVersion || record.syncVersion || 0),
  }));
}

function remoteVerificationStatus(payload, item) {
  const result = payload?.result || payload || {};
  const rows = Array.isArray(result.rows) ? result.rows : [];
  const row = rows.find((entry) => (
    String(entry.recordType || syncRecordTypeForCollection(entry.collection) || "") === String(item.recordType || "")
    && String(entry.recordId || entry.app?.id || "") === String(item.recordId || "")
  ));
  return row?.status || "";
}

function verifyRemoteSyncRecord(item, record, url) {
  return postRemoteAction("auditQueueDifferences", {
    records: [{ recordType: item.recordType, recordId: item.recordId, record }],
  }, url, { timeoutMs: 60000 }).then((payload) => {
    if (!payload?.ok) throw new Error(payload?.error || "No se pudo verificar el registro sincronizado");
    const status = remoteVerificationStatus(payload, item);
    if (!status) throw new Error("La verificacion no devolvio estado para el registro.");
    return status;
  });
}

function processSyncQueue({ reason = "manual", pullFirst = true } = {}) {
  const url = remoteSyncUrl();
  let queue = syncQueue();
  if (!url) {
    setSyncStatus("Guardado local");
    return Promise.resolve({ ok: false, reason: "no-url" });
  }
  collectPendingRecordsForRetry();
  queue = syncQueue();
  if (!queue.length) {
    setSyncStatus("Sincronizado");
    return pullFirst ? pullRemoteChanges({ silent: true }).catch(() => null) : Promise.resolve({ ok: true, sent: 0 });
  }
  if (queue.length > 25) {
    setSyncStatus("Sync pendiente manual", "error");
    addSyncLog("push-queue", { origin: "app", destination: "google-sheets", result: "blocked", error: "Cola masiva: requiere revision manual." });
    persistLocalState();
    return Promise.resolve({ ok: false, reason: "queue-too-large", queueLength: queue.length });
  }
  setSyncStatus("Sincronizando...", "saving");
  const run = () => queue.reduce((promise, item) => promise.then((summary) => {
    const record = findLocalSyncRecord(item.recordType, item.recordId);
    if (!record || record.disabledEconomicEffect) {
      summary.skipped += 1;
      return summary;
    }
    return postRemoteAction(item.action || "upsertRecord", {
      confirm: true,
      recordType: item.recordType,
      recordId: item.recordId,
      record,
      syncVersion: Number(record.syncVersion || 0),
      note: `sync ${reason} desde ${getDeviceId()}`,
    }, url).then((response) => {
      if (response.result === "CONFLICT") {
        markQueueItemConflict(summary.retryQueue, item, response.error || "Conflicto de version");
        summary.conflicts += 1;
        return summary;
      }
      if (!response?.ok) throw new Error(response?.error || response?.result || "Error remoto");
      return verifyRemoteSyncRecord(item, { ...record, syncVersion: Number(response.syncVersion || record.syncVersion || 0) }, url)
        .then((status) => {
          if (status === "MATCH") {
            applyRemoteSyncSuccess(item, response);
            summary.sent += 1;
            return summary;
          }
          if (["CONFLICT", "MATERIAL_CONFLICT"].includes(status)) {
            markQueueItemConflict(summary.retryQueue, item, `Verificacion remota: ${status}`);
            summary.conflicts += 1;
            return summary;
          }
          throw new Error(`Verificacion remota inesperada: ${status}`);
        });
    }).catch((error) => {
      markQueueItemError(summary.retryQueue, item, error);
      summary.errors += 1;
      return summary;
    });
  }), Promise.resolve({ sent: 0, skipped: 0, conflicts: 0, errors: 0, retryQueue: [] }));
  return checkRemoteSyncVersion(url)
    .then(() => {
      if (!pullFirst) return null;
      return pullRemoteChanges({ silent: true }).catch((error) => {
        addSyncLog("pull-before-push", {
          origin: "google-sheets",
          destination: "app",
          result: "warning",
          error: `No se pudo leer antes de enviar; se continua con upsert granular: ${error.message}`,
        });
        return null;
      });
    })
    .then(run)
    .then((summary) => {
      setSyncQueue(summary.retryQueue);
      state = normalize(state);
      persistLocalState();
      addSyncLog("push-queue", { origin: "app", destination: "google-sheets", result: summary.errors || summary.conflicts ? "partial" : "ok", record: `${summary.sent} enviados` });
      if (summary.errors) setSyncStatus("Sincronizacion con errores", "error");
      else if (summary.conflicts) setSyncStatus("Conflictos para revisar", "error");
      else setSyncStatus("Sincronizado confirmado");
      renderSyncPanel();
      return summary;
    })
    .catch((error) => {
      addSyncLog("push-queue", { origin: "app", destination: "google-sheets", result: "error", error: error.message });
      persistLocalState();
      setSyncStatus("No se pudo sincronizar", "error");
      throw error;
    });
}

function confirmRemoteWrite(url, signature, updatedAt) {
  readRemoteSnapshot(url)
    .then((payload) => {
      const remoteState = payload?.state || payload;
      const remoteSignature = stateSignature(remoteState || {});
      if (remoteSignature === signature) {
        localStorage.setItem(REMOTE_UPDATED_AT_KEY, payload?.updatedAt || updatedAt);
        localStorage.setItem(REMOTE_SIGNATURE_KEY, signature);
        localStorage.removeItem(REMOTE_PENDING_KEY);
        setSyncStatus("Sincronizado confirmado");
        return;
      }
      localStorage.setItem(REMOTE_PENDING_KEY, "1");
      setSyncStatus("Guardado local, falta confirmar", "error");
    })
    .catch((error) => {
      localStorage.setItem(REMOTE_PENDING_KEY, "1");
      setSyncStatus("Guardado local, falta confirmar", "error");
      console.warn("No se pudo confirmar la sincronizacion", error);
    });
}

function stateHasData(source = state) {
  return ["entities", "invoices", "orders", "checks", "settlements", "stockMovements", "ledger"]
    .some((key) => Array.isArray(source[key]) && source[key].length);
}

function stateRecordCount(source = state) {
  return ["entities", "invoices", "orders", "checks", "settlements", "stockMovements", "ledger"]
    .reduce((sum, key) => sum + (Array.isArray(source[key]) ? source[key].length : 0), 0);
}

function stateSignature(source = state) {
  const compact = ["entities", "invoices", "orders", "checks", "settlements", "stockMovements", "ledger"].map((key) => [
    key,
    (source[key] || []).map((item) => [
      item.id || "",
      item.date || "",
      item.dueDate || "",
      item.status || "",
      item.amount || item.amountArs || item.balanceUsd || item.balanceArs || item.quantity || "",
      item.receipt || item.number || "",
      item.orderNumber || "",
      item.counterparty || item.provider || item.buyer || item.name || "",
      item.cuit || "",
      item.phone || "",
      item.contact || "",
    ]),
  ]);
  return JSON.stringify(compact);
}

function recordDisplayName(collection, item = {}) {
  if (collection === "orders") return `${item.orderNumber || item.id} - ${item.counterparty || ""}`;
  if (collection === "invoices") return `${item.number || item.id} - ${item.provider || ""}`;
  if (collection === "checks") return `${item.number || item.id} - ${item.counterparty || ""}`;
  if (collection === "settlements") return `${item.product || "Liquidacion"} - ${item.buyer || ""} - ${item.date || ""}`;
  if (collection === "stockMovements") return `${item.product || item.kind || "Stock"} - ${item.counterparty || ""} - ${item.date || ""}`;
  if (collection === "ledger") return `${item.orderNumber || item.receipt || item.id} - ${item.counterparty || ""}`;
  if (collection === "entities") return item.name || item.id || "";
  return item.id || "";
}

function recordPrimaryKey(collection, item = {}) {
  if (item.remoteId) return `remote:${item.remoteId}`;
  if (item.id) return `id:${item.id}`;
  if (collection === "ledger") return `ledger-origin:${item.sourceType || item.originType || ""}:${item.sourceId || item.originId || item.orderId || item.checkId || item.id || ""}:${item.kind || ""}:${item.amount || ""}`;
  return "";
}

function entityCuitByName(source, name) {
  const key = entityKey(name);
  const entity = (source.entities || []).find((item) => entityKey(item.name) === key || (item.aliases || []).some((alias) => entityKey(alias) === key));
  return entity?.cuit || "";
}

function recordSecondaryKey(source, collection, item = {}) {
  if (collection === "settlements") return importKey([
    entityCuitByName(source, item.buyer),
    item.buyer,
    item.receipt || item.number || item.coe || item.lpg || item.sourceId,
    item.operation,
    item.product,
    item.date,
    item.quantity,
    settlementCollectionAmount(item),
  ]);
  if (collection === "invoices") return importKey([
    entityCuitByName(source, item.provider),
    item.provider,
    item.type || item.invoiceType,
    item.pointOfSale || "",
    item.number,
    item.date,
    invoiceArsAmount(item),
  ]);
  if (collection === "orders") return importKey([
    item.id,
    item.sourceId,
    Array.isArray(item.sourceIds) ? item.sourceIds.join("|") : item.sourceIds,
    item.orderNumber,
    item.type,
    item.counterparty,
    item.receipt,
  ]);
  if (collection === "checks") return importKey([
    item.id,
    item.bank,
    item.number,
    item.amount,
    item.direction,
    item.cuit,
  ]);
  if (collection === "ledger") return importKey([
    item.sourceType || item.originType,
    item.sourceId || item.originId || item.orderId || item.checkId,
    item.kind,
    item.type,
    item.amount,
  ]);
  if (collection === "entities") return importKey([item.id, item.cuit, item.name]);
  return importKey([item.id, item.sourceId, item.originId, item.date, item.counterparty || item.provider || item.buyer, item.amount || item.amountArs || item.quantity]);
}

function comparableRecord(collection, item = {}) {
  const base = {
    id: item.id || "",
    date: item.date || "",
    dueDate: item.dueDate || "",
    status: item.status || "",
    amount: Number(item.amount || item.amountArs || item.balanceArs || item.quantity || 0),
    receipt: item.receipt || item.number || "",
    counterparty: normalizeEntityName(item.counterparty || item.provider || item.buyer || item.name || ""),
    sourceId: item.sourceId || "",
    originId: item.originId || "",
  };
  if (collection === "orders") return { ...base, orderNumber: item.orderNumber || "", type: item.type || "", method: item.method || "", accountId: item.accountId || "", activity: item.activity || "" };
  if (collection === "invoices") return { ...base, currency: invoiceCurrency(item), balance: invoiceBalance(item), accountId: item.accountId || "", activity: item.activity || "" };
  if (collection === "checks") return { ...base, direction: item.direction || "", bank: item.bank || "", cuit: item.cuit || "" };
  if (collection === "settlements") return { ...base, operation: item.operation || "", product: item.product || "", campaign: item.campaign || "", total: settlementCollectionAmount(item) };
  if (collection === "ledger") return { ...base, kind: item.kind || "", type: item.type || "", accountId: item.accountId || "", checkId: item.checkId || "", orderId: item.orderId || "" };
  return base;
}

function recordDiff(collection, appItem, sheetItem) {
  const app = comparableRecord(collection, appItem);
  const sheet = comparableRecord(collection, sheetItem);
  return Object.keys({ ...app, ...sheet })
    .filter((key) => JSON.stringify(app[key] ?? "") !== JSON.stringify(sheet[key] ?? ""))
    .map((key) => ({ field: key, app: app[key] ?? "", sheet: sheet[key] ?? "" }));
}

function collectSyncRecords(source) {
  return syncCollections.flatMap((collection) => (source[collection] || []).map((item) => ({
    collection,
    item,
    primaryKey: recordPrimaryKey(collection, item),
    secondaryKey: recordSecondaryKey(source, collection, item),
  })));
}

function analyzeSyncState(appSource = state, sheetSource = null) {
  const appData = normalize(appSource);
  const sheetData = sheetSource ? normalize(sheetSource) : cleanState();
  const appRecords = collectSyncRecords(appData);
  const sheetRecords = sheetSource ? collectSyncRecords(sheetData) : [];
  const sheetByPrimary = new Map(sheetRecords.map((record) => [record.primaryKey, record]));
  const appByPrimary = new Map(appRecords.map((record) => [record.primaryKey, record]));
  const sheetBySecondary = new Map();
  sheetRecords.forEach((record) => {
    if (!record.secondaryKey) return;
    sheetBySecondary.set(record.secondaryKey, [...(sheetBySecondary.get(record.secondaryKey) || []), record]);
  });
  const appSecondaryCounts = new Map();
  appRecords.forEach((record) => {
    if (!record.secondaryKey) return;
    appSecondaryCounts.set(record.secondaryKey, (appSecondaryCounts.get(record.secondaryKey) || 0) + 1);
  });
  const usedSheetKeys = new Set();
  const rows = [];
  appRecords.forEach((record) => {
    const exact = sheetByPrimary.get(record.primaryKey);
    if (exact) {
      usedSheetKeys.add(exact.primaryKey);
      const diffs = recordDiff(record.collection, record.item, exact.item);
      rows.push({ status: diffs.length ? "CONFLICT" : "MATCH", collection: record.collection, app: record.item, sheet: exact.item, diffs, key: record.primaryKey });
      return;
    }
    const possible = (sheetBySecondary.get(record.secondaryKey) || []).filter((candidate) => candidate.collection === record.collection);
    if (possible.length) {
      possible.forEach((candidate) => usedSheetKeys.add(candidate.primaryKey));
      rows.push({ status: "POSSIBLE_DUPLICATE", collection: record.collection, app: record.item, sheet: possible[0].item, diffs: recordDiff(record.collection, record.item, possible[0].item), key: record.secondaryKey });
      return;
    }
    const duplicateInApp = record.secondaryKey && appSecondaryCounts.get(record.secondaryKey) > 1;
    rows.push({ status: duplicateInApp ? "POSSIBLE_DUPLICATE" : "ONLY_APP", collection: record.collection, app: record.item, sheet: null, diffs: [], key: record.primaryKey || record.secondaryKey });
  });
  sheetRecords.forEach((record) => {
    if (usedSheetKeys.has(record.primaryKey)) return;
    if (appByPrimary.has(record.primaryKey)) return;
    rows.push({ status: "ONLY_SHEET", collection: record.collection, app: null, sheet: record.item, diffs: [], key: record.primaryKey || record.secondaryKey });
  });
  const counts = {
    MATCH: 0,
    ONLY_APP: 0,
    ONLY_SHEET: 0,
    CONFLICT: 0,
    POSSIBLE_DUPLICATE: 0,
  };
  rows.forEach((row) => { counts[row.status] = (counts[row.status] || 0) + 1; });
  const sourceStatuses = syncCollections.flatMap((collection) => (appData[collection] || []).map((item) => item.syncStatus || "pending"));
  return {
    rows,
    counts,
    localStatusCounts: {
      synced: sourceStatuses.filter((s) => s === "synced").length,
      pending: sourceStatuses.filter((s) => s === "pending").length,
      error: sourceStatuses.filter((s) => s === "error").length,
      conflict: sourceStatuses.filter((s) => s === "conflict").length,
    },
    sheetAvailable: Boolean(sheetSource),
  };
}

function syncFromRemoteIfStale(force = false) {
  addSyncLog("legacy-auto-sync-blocked", { origin: "google-sheets", destination: "app", result: "blocked", error: "La sincronizacion automatica fue deshabilitada. Usar Analizar diferencias." });
  setSyncStatus("Sync automatica deshabilitada", "error");
  renderSyncPanel();
  return;
  const url = remoteSyncUrl();
  if (!url) return;
  setSyncStatus("Actualizando...", "saving");
  readRemoteSnapshot(url).then((payload) => {
    const remoteState = payload?.state || payload;
    if (!remoteState || !stateHasData(remoteState)) return;
    const remoteUpdatedAt = payload?.updatedAt || "";
    const lastRemoteUpdatedAt = localStorage.getItem(REMOTE_UPDATED_AT_KEY) || "";
    const remoteSignature = stateSignature(remoteState);
    const localSignature = stateSignature(state);
    const hasPendingLocalSave = localStorage.getItem(REMOTE_PENDING_KEY) === "1";
    if (hasPendingLocalSave && stateHasData() && !force) {
      setSyncStatus("Guardado local, falta confirmar", "error");
      return;
    }
    const shouldReplace = force
      || !stateHasData()
      || (remoteUpdatedAt && (!lastRemoteUpdatedAt || remoteUpdatedAt > lastRemoteUpdatedAt))
      || (remoteSignature !== localSignature);
    if (!shouldReplace) {
      if (remoteUpdatedAt) localStorage.setItem(REMOTE_UPDATED_AT_KEY, remoteUpdatedAt);
      localStorage.setItem(REMOTE_SIGNATURE_KEY, remoteSignature);
      setSyncStatus("Sincronizado");
      return;
    }
    state = normalize(remoteState);
    const ledgerBeforeRebuild = stateSignature({ ledger: state.ledger });
    rebuildGeneratedLedgerFromSources();
    state = normalize(state);
    const ledgerChanged = ledgerBeforeRebuild !== stateSignature({ ledger: state.ledger });
    const reconciled = reconcileExistingCheckOrders();
    if (remoteUpdatedAt) localStorage.setItem(REMOTE_UPDATED_AT_KEY, remoteUpdatedAt);
    localStorage.setItem(REMOTE_SIGNATURE_KEY, remoteSignature);
    localStorage.removeItem(REMOTE_PENDING_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSyncStatus("Sincronizado");
    render();
    if (reconciled || ledgerChanged) save();
  }).catch((error) => {
    setSyncStatus("No sincronizado", "error");
    console.warn("No se pudo leer la planilla", error);
  });
}

function readRemoteSnapshot(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `sagroAdminSync${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tiempo agotado al leer la planilla"));
    }, 12000);
    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };
    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("No se pudo cargar el respaldo remoto"));
    };
    script.src = `${url}${separator}action=read&callback=${callbackName}&_=${Date.now()}`;
    document.head.appendChild(script);
  });
}

function rememberUndo(label = "cambio") {
  undoStack.push({ label, snapshot: JSON.stringify(state) });
  if (undoStack.length > undoLimit) undoStack = undoStack.slice(-undoLimit);
  state.changeLog = [...(state.changeLog || []), { id: uid(), at: new Date().toISOString(), label, records: stateRecordCount(state) }].slice(-200);
  updateUndoButton();
}

function undoLastChange() {
  const previous = undoStack.pop();
  if (!previous) return;
  state = normalize(JSON.parse(previous.snapshot));
  save();
  closeModal();
  render();
  updateUndoButton();
}

function updateUndoButton() {
  const button = $("#undoAction");
  if (!button) return;
  const last = undoStack[undoStack.length - 1];
  button.disabled = !last;
  button.title = last ? `Deshacer ${last.label}` : "No hay cambios para deshacer";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00c2\u00b7/g, " - ")
    .replace(/\u00c3\u00a1/g, "a")
    .replace(/\u00c3\u00a9/g, "e")
    .replace(/\u00c3\u00ad/g, "i")
    .replace(/\u00c3\u00b3/g, "o")
    .replace(/\u00c3\u00ba/g, "u")
    .replace(/\u00c3\u00b1/g, "n")
    .replace(/\u00c3\u0081/g, "A")
    .replace(/\u00c3\u0089/g, "E")
    .replace(/\u00c3\u008d/g, "I")
    .replace(/\u00c3\u0093/g, "O")
    .replace(/\u00c3\u009a/g, "U")
    .replace(/\u00c3\u0091/g, "N")
    .replace(/\u00c2/g, "");
}

function esc(value) {
  return cleanText(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function currency(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function compactCurrency(value) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}$ ${number(abs / 1000000)} M`;
  if (abs >= 1000) return `${sign}$ ${number(abs / 1000)} mil`;
  return currency(amount);
}

function number(value) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function parseAmount(value) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  const sign = raw.startsWith("-") ? -1 : 1;
  const text = raw.replace(/-/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const normalizeWithDecimal = (decimalIndex) => {
    const whole = text.slice(0, decimalIndex).replace(/[,.]/g, "");
    const decimals = text.slice(decimalIndex + 1).replace(/[,.]/g, "");
    return Number(`${whole || "0"}.${decimals}`) * sign || 0;
  };
  if (comma >= 0 && dot >= 0) return normalizeWithDecimal(Math.max(comma, dot));
  const separator = comma >= 0 ? "," : dot >= 0 ? "." : "";
  if (!separator) return Number(text) * sign || 0;
  const parts = text.split(separator);
  const repeated = parts.length > 2;
  if (repeated) return Number(parts.join("")) * sign || 0;
  return normalizeWithDecimal(text.lastIndexOf(separator));
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part ? part[0].toLocaleUpperCase("es-AR") + part.slice(1).toLocaleLowerCase("es-AR") : "")
    .join(" ");
}

function entityKey(value) {
  return normalizeName(value)
    .toLocaleLowerCase("es-AR")
    .replace(/[^a-z0-9]+/g, "");
}

function syncStableKey(parts) {
  return parts.map((part) => String(part || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.,-]+/g, "")
    .trim()).join("|");
}

function entityStableKeyForSync(entity = {}) {
  return syncStableKey([entity.cuit || entity.taxId || "", entity.name || ""]);
}

function normalizeEntityName(value) {
  const name = normalizeName(value).replace(/[.,;:\-]+$/g, "").trim();
  return name;
}

function uniqueEntities(values) {
  const entities = new Map();
  values.map(normalizeEntityName).filter(Boolean).forEach((value) => {
    entities.set(entityKey(value), value);
  });
  return [...entities.values()].sort((a, b) => a.localeCompare(b));
}

function stockKindFor(product, fallback = "grano") {
  const name = normalizeName(product).toLowerCase();
  const cattle = ["novillo", "novillos", "vaca", "vacas", "vaquillona", "vaquillonas", "ternero", "terneros", "ternera", "terneras", "toro", "toros", "hacienda"];
  return cattle.includes(name) ? "hacienda" : fallback;
}

function settlementAccountName(settlement) {
  const kind = stockKindFor(settlement.product, "grano");
  if (kind === "hacienda") return settlement.operation === "compra" ? "Hacienda Compra" : "Hacienda Venta";
  return "Ventas Granos";
}

function settlementActivity(settlement) {
  return stockKindFor(settlement.product, "grano") === "hacienda" ? "Ganaderia" : "Agricultura";
}

function normalizeStockMovement(item) {
  const product = normalizeName(item.product);
  const kind = stockKindFor(product, item.kind || "grano");
  return {
    ...item,
    kind,
    activity: kind === "hacienda" ? "Ganaderia" : normalizeActivity(item.activity, "Agricultura"),
    product,
    campaign: normalizeName(item.campaign),
    counterparty: normalizeEntityName(item.counterparty),
    weightKg: kind === "hacienda" ? Number(item.weightKg || 0) : 0,
    pricePerKg: kind === "hacienda" ? Number(item.pricePerKg || 0) : 0,
  };
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year.slice(-2)}` : value;
}

function addMonthsToDate(value, months = 1) {
  const [year, month, day] = String(value || today).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value || today;
  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function addDaysToDate(value, days = 0) {
  const [year, month, day] = String(value || today).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value || today;
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyHtml(message = "") {
  return message ? `<div class="empty"><strong>${esc(message)}</strong></div>` : $("#emptyState").innerHTML;
}

function account(id) {
  return state.accounts.find((item) => item.id === id) || {};
}

function accountByName(name) {
  return state.accounts.find((item) => item.name.toLowerCase() === name.toLowerCase());
}

function accountName(id) {
  return account(id).name || "Sin imputacion";
}

function accountActivity(id) {
  return normalizeActivity(account(id).activity || "", "");
}

function accountOptions(selected = "") {
  return state.accounts
    .slice()
    .sort((a, b) => `${a.activity}-${a.code}`.localeCompare(`${b.activity}-${b.code}`))
    .map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${esc(normalizeActivity(item.activity))} - ${esc(item.name)}</option>`)
    .join("");
}

function activityOptions(selected = "", fallback = "Agricultura") {
  const cleanSelected = selected ? normalizeActivity(selected, selected) : fallback;
  return validActivities
    .map((item) => `<option value="${esc(item)}" ${item === cleanSelected ? "selected" : ""}>${esc(item)}</option>`)
    .join("");
}

function methodOptions(selected = "") {
  return [`<option value="">Sin definir</option>`].concat(methods.map((item) => `<option ${item === selected ? "selected" : ""}>${esc(item)}</option>`)).join("");
}

function statusOptions(selected = "pendiente") {
  return statuses.map((item) => `<option ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function filterByDate(items, field = "date") {
  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  return items.filter((item) => {
    if (from && item[field] < from) return false;
    if (to && item[field] > to) return false;
    if (!matchesGlobalActivity(item)) return false;
    return true;
  });
}

function filterByDateOnly(items, field = "date") {
  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  return items.filter((item) => {
    if (from && item[field] < from) return false;
    if (to && item[field] > to) return false;
    return true;
  });
}

function globalActivityFilter() {
  return $("#filterActivity")?.value || "";
}

function itemActivity(item) {
  return normalizeActivity(item?.activity || accountActivity(item?.accountId) || "", "");
}

function matchesGlobalActivity(item, activity = globalActivityFilter()) {
  if (!activity) return true;
  return itemActivity(item) === activity;
}

function signed(type, amount) {
  return ["cobro", "venta", "ingreso"].includes(type) ? Number(amount || 0) : -Number(amount || 0);
}

function render() {
  updateUndoButton();
  fillFilters();
  renderDatalists();
  renderDashboard();
  renderPending();
  renderControl();
  renderIndicators();
  renderLedger();
  renderInvoices();
  renderOrders();
  renderCashflow();
  renderChecks();
  renderSettlements();
  renderStock();
  renderAccounts();
  renderEntityMaster();
  renderChangeLog();
  renderTools();
  requestAnimationFrame(updateFixedScrollbars);
}

function fillFilters() {
  const selected = $("#filterActivity").value;
  $("#filterActivity").innerHTML = `<option value="" ${selected ? "" : "selected"}>Todas</option>${activityOptions(selected, "")}`;
  const fiscalField = $("#indicatorFiscalYearFilter");
  if (fiscalField) {
    const options = fiscalYearOptions();
    if (selectedIndicatorFiscalYear && !options.includes(selectedIndicatorFiscalYear)) selectedIndicatorFiscalYear = "";
    fiscalField.innerHTML = `<option value="">Todos</option>${options.map((year) => `<option value="${esc(year)}" ${year === selectedIndicatorFiscalYear ? "selected" : ""}>${esc(year)}</option>`).join("")}`;
    fiscalField.value = selectedIndicatorFiscalYear;
  }
}

function fiscalYearOptions() {
  const years = [
    ...state.ledger.map((item) => itemFiscalYear(item, ["date"])),
    ...state.orders.map((item) => itemFiscalYear(item, ["date", "dueDate"])),
    ...state.invoices.map((item) => itemFiscalYear(item, ["date", "dueDate"])),
    ...state.checks.map((item) => itemFiscalYear(item, ["dueDate"])),
    ...state.settlements.map((item) => itemFiscalYear(item, ["date"])),
    ...state.stockMovements.map((item) => itemFiscalYear(item, ["date"])),
  ].filter(Boolean);
  return [...new Set(years)].sort().reverse();
}

function renderDatalists() {
  const context = modalMode || selectedView;
  const entities = entityValuesForContext(context);
  const concepts = [...state.orders.map((item) => item.concept), ...state.invoices.map((item) => item.concept)].filter(Boolean);
  $("#entityList").innerHTML = uniqueEntities(entities).map((item) => `<option value="${esc(item)}"></option>`).join("");
  selectedLedgerColumns.counterparty = setEntitySelectOptions($('[data-ledger-filter="counterparty"]'), entityValuesForContext("ledger"), selectedLedgerColumns.counterparty || "", "Todas");
  selectedOrderEntity = setEntitySelectOptions($("#orderEntityFilter"), entityValuesForContext("orders"), selectedOrderEntity, "Todas");
  selectedSettlementBuyer = setEntitySelectOptions($("#settlementBuyerFilter"), entityValuesForContext("settlements"), selectedSettlementBuyer, "Todos");
  $("#conceptList").innerHTML = [...new Set(concepts)].sort().map((item) => `<option value="${esc(item)}"></option>`).join("");
  $("#stockProductList").innerHTML = stockKnownValues("product").map((item) => `<option value="${esc(item)}"></option>`).join("");
  $("#stockCampaignList").innerHTML = stockKnownValues("campaign").map((item) => `<option value="${esc(item)}"></option>`).join("");
  $("#stockPlaceList").innerHTML = stockKnownValues("counterparty").map((item) => `<option value="${esc(item)}"></option>`).join("");
}

function setEntitySelectOptions(select, values, selected = "", emptyLabel = "Todas") {
  if (!select) return "";
  const options = uniqueEntities(values);
  const selectedEntity = normalizeEntityName(selected);
  const hasSelected = selectedEntity && options.some((item) => entityKey(item) === entityKey(selectedEntity));
  const nextValue = hasSelected ? selectedEntity : "";
  const optionMap = new Map(options.map((item) => [entityKey(item), normalizeEntityName(item)]));
  const safeOptions = [...optionMap.values()].sort((a, b) => a.localeCompare(b));
  select.innerHTML = `<option value="">${esc(emptyLabel)}</option>${safeOptions.map((item) => `<option value="${esc(item)}" ${entityKey(item) === entityKey(nextValue) ? "selected" : ""}>${esc(item)}</option>`).join("")}`;
  select.value = nextValue;
  return nextValue;
}

function entityValuesForContext(context) {
  const all = [
    ...state.invoices.map((item) => item.provider),
    ...state.orders.map((item) => item.counterparty),
    ...state.checks.map((item) => item.counterparty),
    ...state.settlements.map((item) => item.buyer),
    ...state.settlements.map((item) => item.stockPlace),
    ...state.stockMovements.map((item) => item.counterparty),
    ...state.ledger.map((item) => item.counterparty),
  ];
  const byContext = {
    invoice: state.invoices.map((item) => item.provider),
    invoices: state.invoices.map((item) => item.provider),
    order: state.orders.map((item) => item.counterparty),
    orders: state.orders.map((item) => item.counterparty),
    check: state.checks.map((item) => item.counterparty),
    checks: state.checks.map((item) => item.counterparty),
    settlement: [...state.settlements.map((item) => item.buyer), ...state.settlements.map((item) => item.stockPlace)],
    settlements: [...state.settlements.map((item) => item.buyer), ...state.settlements.map((item) => item.stockPlace)],
    stock: state.stockMovements.map((item) => item.counterparty),
    ledger: state.ledger.map((item) => item.counterparty),
    cashflow: cashflowItems().map((item) => item.counterparty),
  };
  return (byContext[context] || all).map(normalizeEntityName).filter(Boolean);
}

function stockKnownValues(field) {
  const values = state.stockMovements.map((item) => item[field]).filter(Boolean);
  return field === "counterparty" ? uniqueEntities(values) : [...new Set(values.map(normalizeName))].sort((a, b) => a.localeCompare(b));
}

function renderDashboard() {
  const dashboardOrders = state.orders.filter((item) => matchesGlobalActivity(item));
  const dashboardInvoices = openCashflowInvoices().filter((item) => matchesGlobalActivity(item));
  const dashboardChecks = state.checks.filter((item) => matchesGlobalActivity(item));
  const currentDate = localToday();
  if ($("#kpiGrid")) $("#kpiGrid").innerHTML = "";
  renderDashboardWindows(dashboardOrders, dashboardInvoices, dashboardChecks);
  const due = [
    ...dashboardInvoices.map((item) => ({ date: item.dueDate, title: `${item.provider}  -  Factura ${item.number}`, amount: invoiceBalanceLabel(item) })),
    ...dashboardOrders.filter((item) => item.status === "pendiente").map((item) => ({ date: item.dueDate || item.date, title: `${item.type}  -  ${item.counterparty}`, amount: currency(item.amountArs) })),
    ...dashboardChecks.filter((item) => item.status === "pendiente").map((item) => ({ date: item.dueDate, title: `Cheque ${item.direction}  -  ${item.counterparty}`, amount: currency(item.direction === "recibido" ? item.amount : -Math.abs(Number(item.amount || 0))) })),
  ].filter((item) => item.date >= currentDate).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  $("#dueList").innerHTML = due.map((item) => `<div class="due-item"><div><strong>${esc(item.title)}</strong><span class="item-meta">${formatDate(item.date)}</span></div><strong>${esc(item.amount)}</strong></div>`).join("") || emptyHtml();
  renderKpiDetail();
  renderActivitySummary();
  renderActivityDetail();
}

function kpi(label, value, meta, key) {
  return `<button class="kpi ${selectedKpi === key ? "active-kpi" : ""}" data-kpi="${key}"><span>${label}</span><strong>${value}</strong><small class="muted">${meta}</small></button>`;
}

function renderDashboardWindows(orders, invoices, checks) {
  const horizons = [10, 20, 30];
  const panel = (kind, title) => `
    <article class="dashboard-window-panel ${kind}">
      <h2>${esc(title)}</h2>
      <div class="dashboard-window-cards">
        ${horizons.map((days) => {
          const key = `window:${kind}:${days}`;
          const items = dashboardWindowItems(kind, days, orders, invoices, checks);
          const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
          return `
            <button class="dashboard-window-card ${selectedKpi === key ? "active-kpi" : ""}" data-kpi="${key}">
              <span>${days} dias</span>
              <strong>${currency(total)}</strong>
              <small>${items.length} pendiente${items.length === 1 ? "" : "s"} incl. vencidos</small>
            </button>
          `;
        }).join("")}
      </div>
    </article>
  `;
  $("#dashboardWindowGrid").innerHTML = [
    panel("receivable", "A cobrar"),
    panel("payable", "A pagar"),
  ].join("");
}

function dashboardWindowItems(kind, days) {
  const limit = addDaysToDate(localToday(), days);
  return cashflowItems()
    .filter((item) => matchesGlobalActivity(item))
    .filter((item) => item.status === "pendiente")
    .filter((item) => item.date && item.date <= limit)
    .filter((item) => kind === "receivable" ? item.amount > 0 : item.amount < 0)
    .map((item) => ({
      id: item.id,
      editMode: item.editMode,
      date: item.date,
      title: item.title,
      meta: `${formatDate(item.date)}  -  ${item.category || ""}  -  ${item.activity || ""}`,
      amount: currency(Math.abs(Number(item.amount || 0))),
      value: Math.abs(Number(item.amount || 0)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function pendingCriticalItems() {
  const currentDate = localToday();
  const limit = addDaysToDate(currentDate, 30);
  const unique = new Map();
  cashflowItems()
    .filter((item) => matchesGlobalActivity(item))
    .filter((item) => item.status === "pendiente" || item.status === "pago parcial")
    .filter((item) => item.date && item.date <= limit)
    .forEach((item) => {
      const key = item.flowOriginKey || `${item.editMode}:${item.id}:${item.date}:${item.amount}`;
      if (!unique.has(key)) unique.set(key, item);
    });
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || String(a.title || "").localeCompare(String(b.title || "")));
}

function renderPending() {
  const baseItems = pendingCriticalItems();
  const currentDate = localToday();
  const windows = [
    ["overdue", "Vencidos", (item) => item.date < currentDate],
    ["today", "Hoy", (item) => item.date === currentDate],
    ["10", "10 dias", (item) => item.date <= addDaysToDate(currentDate, 10)],
    ["30", "30 dias", (item) => item.date <= addDaysToDate(currentDate, 30)],
  ];
  $("#pendingSummary").innerHTML = windows.map(([key, label, predicate]) => {
    const items = baseItems.filter(predicate);
    const income = items.filter((item) => item.amount > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = items.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
    return `
      <article class="pending-card ${key === "overdue" ? "urgent" : ""}">
        <span>${esc(label)}</span>
        <strong>${items.length}</strong>
        <small><b class="positive-text">${currency(income)}</b> a cobrar</small>
        <small><b class="negative-text">${currency(expense)}</b> a pagar</small>
      </article>
    `;
  }).join("");

  const filtered = baseItems
    .filter((item) => !selectedPendingStatus || item.status === selectedPendingStatus)
    .filter((item) => !selectedPendingDirection || (selectedPendingDirection === "income" ? item.amount > 0 : item.amount < 0))
    .filter(matchesPendingFilters);
  const income = filtered.filter((item) => item.amount > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = filtered.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  $("#pendingTable").innerHTML = filtered.length ? `
    <div class="cashflow-detail-row cashflow-detail-head pending-detail-head">
      <span>Fecha</span>
      <span>Detalle</span>
      <span>Estado</span>
      <span>Ingresos</span>
      <span>Egresos</span>
    </div>
    ${filtered.map((item) => `
      <div class="cashflow-detail-row clickable" ${item.editMode ? `data-edit="${item.editMode}" data-id="${item.id}"` : ""}>
        <strong class="cashflow-date">${formatDate(item.date)}</strong>
        <div><strong>${esc(item.title || "")}</strong><span class="item-meta">${esc(item.category || "")}  -  ${esc(item.activity || "")} ${item.badge || ""}</span></div>
        <span>${pendingStatusControl(item)}</span>
        <strong class="num positive-text">${item.amount > 0 ? currency(item.amount) : ""}</strong>
        <strong class="num negative-text">${item.amount < 0 ? currency(Math.abs(item.amount)) : ""}</strong>
      </div>
    `).join("")}
    <div class="cashflow-detail-row cashflow-detail-total">
      <span></span>
      <strong>Total visible</strong>
      <strong class="${income - expense < 0 ? "negative-text" : "positive-text"}">Neto ${currency(income - expense)}</strong>
      <strong class="num positive-text">${currency(income)}</strong>
      <strong class="num negative-text">${currency(expense)}</strong>
    </div>
  ` : emptyHtml();
}

function renderControl() {
  const issues = consistencyIssues();
  const counts = issues.reduce((acc, issue) => {
    acc[issue.level] = (acc[issue.level] || 0) + 1;
    return acc;
  }, {});
  $("#controlSummary").innerHTML = ["alto", "medio", "info"].map((level) => `
    <article class="control-card ${level}">
      <span>${level === "alto" ? "Alta prioridad" : level === "medio" ? "Revisar" : "Informativo"}</span>
      <strong>${counts[level] || 0}</strong>
    </article>
  `).join("");
  $("#controlIssues").innerHTML = issues.length ? issues.map((issue) => `
    <div class="control-issue ${issue.level} ${issue.editMode ? "clickable" : ""}" ${issue.editMode ? `data-edit="${issue.editMode}" data-id="${issue.id}"` : ""}>
      <div>
        <strong>${esc(issue.title)}</strong>
        <span class="item-meta">${esc(issue.detail || "")}</span>
      </div>
      <span class="pill">${esc(issue.level)}</span>
    </div>
  `).join("") : emptyHtml("No se detectaron inconsistencias importantes.");
}

function consistencyIssues() {
  const currentDate = localToday();
  const issues = [];
  const push = (level, title, detail, editMode = "", id = "") => issues.push({ level, title, detail, editMode, id });
  state.orders.forEach((order) => {
    if (!order.orderNumber) push("alto", "Orden sin numero", `${order.counterparty || "Sin entidad"} - ${currency(order.amountArs)}`, "order", order.id);
    if (!order.entityId) push("medio", "Orden sin entidad ID", `${order.orderNumber || ""} ${order.counterparty || ""}`, "order", order.id);
    const checks = linkedOrderChecks(order);
    if (isFinalOrderStatus(order.status) && checks.some((check) => check.status === "pendiente")) {
      push("alto", "Orden finalizada con cheques pendientes", `${order.orderNumber || ""} - ${order.counterparty || ""}`, "order", order.id);
    }
    if (order.method === "Mixto" && order.status === "pagado" && checks.some((check) => check.status === "pendiente")) {
      push("alto", "Pago mixto pagado con cheque pendiente", `${order.orderNumber || ""} - conviene revisar componentes`, "order", order.id);
    }
    if (order.method === "Mixto" && !orderHasComponentBreakdown(order)) {
      push("medio", "Orden mixta sin detalle completo", `${order.orderNumber || ""} - ${order.counterparty || ""}`, "order", order.id);
    }
    if (order.type === "pago" && order.status === "pagado" && !orderHasLedgerImpact(order)) {
      push("alto", "Orden pagada sin libro diario", `${order.orderNumber || ""} - ${order.counterparty || ""} - ${currency(order.amountArs)}`, "order", order.id);
    }
  });
  state.checks.forEach((check) => {
    if (!check.entityId) push("medio", "Cheque sin entidad ID", `${check.number || ""} - ${check.counterparty || ""}`, "check", check.id);
    if (!check.orderId) push("medio", "Cheque sin orden vinculada", `${check.number || ""} - ${check.counterparty || ""}`, "check", check.id);
    if (check.status === "pendiente" && check.dueDate && check.dueDate <= currentDate) {
      push("alto", check.dueDate < currentDate ? "Cheque vencido pendiente" : "Cheque a vencer hoy pendiente", `${formatDate(check.dueDate)} - ${check.number || ""} - ${currency(check.direction === "recibido" ? check.amount : -Math.abs(check.amount || 0))}`, "check", check.id);
    }
  });
  state.settlements.forEach((settlement) => {
    const hasOrder = state.orders.some((order) => order.sourceId === `settlement:${settlement.id}`);
    if (!hasOrder) push("alto", "Liquidacion sin orden de cobro", `${formatDate(settlement.date)} - ${settlement.product || ""} - ${settlement.buyer || ""}`, "settlement", settlement.id);
    if (!settlement.buyerEntityId) push("medio", "Liquidacion sin entidad ID", `${settlement.product || ""} - ${settlement.buyer || ""}`, "settlement", settlement.id);
  });
  state.invoices.forEach((invoice) => {
    const linkedOrders = linkedInvoicePaymentOrders(invoice.id);
    if (linkedOrders.length && invoice.status !== "pagada") {
      push("info", "Factura cubierta por orden de pago", `Factura ${invoice.number || ""} - ${invoice.provider || ""} - se muestra en flujo por la orden/cheque`, "invoice", invoice.id);
    }
    if (linkedOrders.some((order) => isFinalOrderStatus(order.status)) && invoice.status !== "pagada") {
      push("medio", "Factura vinculada a pago cerrado pero sigue pendiente", `Factura ${invoice.number || ""} - revisar saldo ${invoiceBalanceLabel(invoice)}`, "invoice", invoice.id);
    }
  });
  state.ledger.forEach((row) => {
    if (row.kind === "Imp. al cheque" && row.status !== "pagado") push("alto", "Imp. al cheque con estado incorrecto", `${formatDate(row.date)} - ${row.receipt || ""} - estado ${row.status || ""}`);
    if (!row.entityId && row.counterparty) push("medio", "Movimiento sin entidad ID", `${formatDate(row.date)} - ${row.counterparty || ""}`);
  });
  duplicateEntityCandidates().forEach((group) => {
    push("info", "Entidades parecidas", group.join(" / "));
  });
  return issues.sort((a, b) => issueLevelWeight(a.level) - issueLevelWeight(b.level) || a.title.localeCompare(b.title));
}

function issueLevelWeight(level) {
  return { alto: 0, medio: 1, info: 2 }[level] ?? 3;
}

function orderHasComponentBreakdown(order) {
  return Number(order.transferAmount || 0)
    || Number(order.currentAccountAmount || 0)
    || (Array.isArray(order.paymentComponents) && order.paymentComponents.length)
    || (Array.isArray(order.checks) && order.checks.length);
}

function orderHasLedgerImpact(order) {
  if (!order?.id) return false;
  const directImpact = state.ledger.some((row) => {
    const orderId = String(row.orderId || "");
    return orderId === order.id
      || orderId.startsWith(`order:${order.id}:`)
      || orderId === `${order.id}:fx`
      || orderId.startsWith(`${order.id}:fx:`);
  });
  if (directImpact) return true;
  const checkIds = new Set(linkedOrderChecks(order).map((check) => check.id));
  return state.ledger.some((row) => row.checkId && checkIds.has(row.checkId));
}

function duplicateEntityCandidates() {
  const groups = {};
  (state.entities || []).forEach((entity) => {
    const key = entityKey(entity.name).slice(0, 8);
    groups[key] ||= [];
    groups[key].push(entity.name);
  });
  return Object.values(groups).filter((items) => items.length > 1);
}

function pendingStatusControl(item) {
  const collection = { order: "orders", check: "checks", invoice: "invoices" }[item.editMode];
  return collection ? statusSelect(collection, item.id, item.status) : `<span class="status ${statusClass(item.status)}">${esc(item.status || "sin estado")}</span>`;
}

function matchesPendingFilters(item) {
  const amount = Number(item.amount || 0);
  const fields = {
    date: formatDate(item.date),
    detail: `${item.title || ""} ${item.category || ""} ${item.activity || ""} ${item.status || ""}`,
  };
  return Object.entries(selectedPendingFilters).every(([key, needle]) => {
    if (!needle) return true;
    return String(fields[key] || "").toLocaleLowerCase("es-AR").includes(String(needle).toLocaleLowerCase("es-AR"));
  });
}

function renderKpiDetail() {
  const panel = $("#kpiDetailPanel");
  if (!selectedKpi) {
    panel.hidden = true;
    return;
  }
  const config = kpiDetailConfig(selectedKpi);
  $("#kpiDetailTitle").textContent = config.title;
  $("#kpiDetail").innerHTML = config.items.map((item) => `
    <div class="due-item clickable" ${item.editMode ? `data-edit="${item.editMode}" data-id="${item.id}"` : ""}>
      <div><strong>${esc(item.title)}</strong><span class="item-meta">${esc(item.meta)}</span></div>
      <strong>${esc(item.amount)}</strong>
    </div>
  `).join("") || emptyHtml();
  panel.hidden = false;
}

function kpiDetailConfig(key) {
  if (key.startsWith("window:")) {
    const [, kind, daysText] = key.split(":");
    const days = Number(daysText || 0);
    return {
      title: `${kind === "receivable" ? "A cobrar" : "A pagar"} proximos ${days} dias`,
      items: dashboardWindowItems(kind, days),
    };
  }
  if (key === "receivable") return {
    title: "Detalle a cobrar",
    items: state.orders.filter((item) => matchesGlobalActivity(item) && item.type === "cobro" && item.status === "pendiente").sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date)).map((item) => ({
      id: item.id,
      editMode: "order",
      title: `${item.counterparty}  -  ${item.concept}`,
      meta: `${formatDate(item.dueDate || item.date)}  -  ${item.method || "sin forma"}  -  ${item.activity}`,
      amount: currency(item.amountArs),
    })),
  };
  if (key === "payable") return {
    title: "Detalle a pagar",
    items: state.orders.filter((item) => matchesGlobalActivity(item) && item.type === "pago" && item.status === "pendiente").sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date)).map((item) => ({
      id: item.id,
      editMode: "order",
      title: `${item.counterparty}  -  ${item.concept}`,
      meta: `${formatDate(item.dueDate || item.date)}  -  ${item.method || "sin forma"}  -  ${item.activity}`,
      amount: currency(item.amountArs),
    })),
  };
  if (key === "invoices") return {
    title: "Detalle facturas financiadas",
    items: openCashflowInvoices().filter((item) => matchesGlobalActivity(item)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((item) => ({
      id: item.id,
      editMode: "invoice",
      title: `${item.provider}  -  Factura ${item.number}`,
      meta: `vence ${formatDate(item.dueDate)}  -  ${invoiceCurrency(item) === "USD" ? `TC ${number(item.tcInvoice)}  -  ` : ""}${item.activity}`,
      amount: invoiceBalanceLabel(item),
    })),
  };
  return {
    title: "Detalle cheques cartera",
    items: state.checks.filter((item) => matchesGlobalActivity(item) && item.status === "pendiente").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((item) => ({
      id: item.id,
      editMode: "check",
      title: `${item.direction}  -  ${item.counterparty}`,
      meta: `${formatDate(item.dueDate)}  -  ${item.bank || ""}  -  ${item.number}`,
      amount: item.direction === "recibido" ? currency(item.amount) : currency(-Math.abs(Number(item.amount || 0))),
    })),
  };
}

function renderIndicators() {
  const rows = indicatorRows();
  const fromDate = indicatorFromDate();
  const toDate = indicatorToDate();
  renderFiscalDataForm();
  const fiscalData = currentFiscalData();
  const stockInitial = stockOpeningValue(fromDate, toDate);
  const stockCurrent = stockValueAt(toDate);
  const stockVariation = stockCurrent - stockInitial;
  const totals = rows.reduce((acc, item) => {
    const value = signed(item.type, item.amount);
    if (value >= 0) acc.income += value;
    if (value < 0) acc.cost += Math.abs(value);
    return acc;
  }, { income: 0, cost: 0 });
  const result = totals.income - totals.cost;
  const economicResult = result + stockVariation;
  const margin = totals.income ? (economicResult / totals.income) * 100 : 0;
  const fixedCosts = fixedCostRows(rows).reduce((sum, item) => sum + Math.abs(signed(item.type, item.amount)), 0);
  const directMargin = directGrossMargin(rows);
  const fixedOverMargin = directMargin > 0 ? (fixedCosts / directMargin) * 100 : 0;
  const commercial = commercialCostSummary();
  const workingCapital = workingCapitalEstimate(toDate, fiscalData);
  const totalHa = Number(fiscalData.agriculturalHa || 0) + Number(fiscalData.cattleHa || 0);
  const fixedPerHa = totalHa ? fixedCosts / totalHa : 0;
  const debtRatio = Number(fiscalData.equity || 0) ? (Number(fiscalData.totalLiabilities || 0) / Number(fiscalData.equity || 0)) * 100 : 0;
  const roe = Number(fiscalData.equity || 0) ? (economicResult / Number(fiscalData.equity || 0)) * 100 : 0;
  const context = { rows, fromDate, toDate, stockInitial, stockCurrent, stockVariation, totals, result, economicResult, margin, fixedCosts, directMargin, fixedOverMargin, commercial, workingCapital, fiscalData, totalHa, fixedPerHa, debtRatio, roe };
  $("#indicatorKpis").innerHTML = [
    metric("income", "Ingreso cobrado", currency(totals.income), "financiero: cobros confirmados"),
    metric("cost", "Costo pagado", currency(totals.cost), "financiero: pagos confirmados"),
    metric("cashResult", "Resultado caja", currency(result), "cobrado menos pagado"),
    metric("stockInitial", "Stock inicial", currency(stockInitial), "apertura valorizada del periodo"),
    metric("stock", "Stock al corte", currency(stockCurrent), "granos + hacienda al corte"),
    metric("stockVariation", "Variacion stock", currency(stockVariation), "stock al corte - stock inicial"),
    metric("economicResult", "Resultado economico", currency(economicResult), "caja + variacion de stock"),
    metric("economicMargin", "Margen economico", `${number(margin)}%`, "resultado economico / ingreso"),
    metric("workingCapital", "Capital trabajo op.", currency(workingCapital.net), `stock + a cobrar - a pagar (${currency(workingCapital.assets)} / ${currency(workingCapital.liabilities)})`),
    metric("fixedCosts", "Costos fijos", currency(fixedCosts), "estructura, administracion y personal"),
    metric("fixedOverMargin", "Fijos / margen bruto", directMargin > 0 ? `${number(fixedOverMargin)}%` : "s/d", directMargin > 0 ? "costos fijos / margen directo" : "falta margen bruto positivo"),
    metric("commercial", "Comercializacion", currency(commercial.amount), `${number(commercial.pct)}% ponderado, solo liquidaciones`),
    metric("debt", "Endeudamiento total", fiscalData.equity ? `${number(debtRatio)}%` : "s/d", fiscalData.equity ? "pasivo total / patrimonio neto" : "falta patrimonio neto y pasivo total"),
    metric("fixedPerHa", "Costo fijo/ha", totalHa ? currency(fixedPerHa) : "s/d", totalHa ? "costos fijos / hectareas totales" : "falta superficie trabajada por ejercicio"),
    metric("roe", "ROE estimado", fiscalData.equity ? `${number(roe)}%` : "s/d", fiscalData.equity ? "resultado economico / patrimonio neto" : "falta patrimonio neto"),
  ].join("");
  const grouped = groupIndicatorsByActivity(rows);
  renderIndicatorBars("#incomeByActivity", grouped, "income");
  renderIndicatorBars("#costByActivity", grouped, "cost");
  renderIndicatorDetail(context);
}

function metric(key, label, value, meta) {
  return `<button class="kpi ${selectedIndicatorMetric === key ? "active-kpi" : ""}" data-indicator-metric="${esc(key)}"><span>${label}</span><strong>${value}</strong><small class="muted">${meta}</small></button>`;
}

function indicatorFromDate() {
  return $("#filterFrom").value || fiscalYearStart(selectedIndicatorFiscalYear) || "0000-01-01";
}

function indicatorToDate() {
  const fiscalEnd = fiscalYearEnd(selectedIndicatorFiscalYear);
  if ($("#filterTo").value) return $("#filterTo").value;
  if (fiscalEnd) return today < fiscalEnd ? today : fiscalEnd;
  return "9999-12-31";
}

function stockValueAt(date) {
  const prices = lastSalePrices(date);
  const balances = {};
  state.stockMovements.filter((item) => item.date <= date && matchesGlobalActivity(item)).forEach((item) => {
    const key = `${item.kind}||${item.product}`;
    balances[key] ||= { kind: item.kind, product: item.product, quantity: 0, weightTotal: 0, pricePerKg: 0, priceDate: "" };
    balances[key].quantity += Number(item.quantity || 0);
    if (item.kind === "hacienda") {
      balances[key].weightTotal += cattleMovementWeightTotal(item.quantity, item.weightKg);
      if (Number(item.pricePerKg || 0) && (!balances[key].priceDate || item.date >= balances[key].priceDate)) {
        balances[key].pricePerKg = Number(item.pricePerKg || 0);
        balances[key].priceDate = item.date;
      }
    }
  });
  return Object.values(balances).reduce((sum, item) => {
    if (item.kind === "hacienda") {
      return sum + cattleStockValue(Math.max(0, item.quantity), cattleAverageWeight(item.quantity, item.weightTotal), item.pricePerKg || prices[item.product] || 0);
    }
    const pricingQuantity = Math.max(0, item.quantity) / 1000;
    return sum + pricingQuantity * (prices[item.product] || 0);
  }, 0);
}

function previousDate(value) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value || "";
  const date = new Date(year, month - 1, day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stockOpeningValue(fromDate, toDate) {
  return stockOpeningDetailItems(fromDate, toDate).reduce((sum, item) => sum + Number(item.value || 0), 0);
}

function stockOpeningDetailItems(fromDate, toDate) {
  const beforePeriod = stockValueDetailAt(previousDate(fromDate)).map((item) => ({
    ...item,
    openingSource: "Saldo previo al periodo",
  }));
  const initialMovements = stockInitialMovementDetails(fromDate, toDate);
  const byKey = {};
  [...beforePeriod, ...initialMovements].forEach((item) => {
    const key = `${item.kind}||${item.product}`;
    byKey[key] ||= { ...item, quantity: 0, value: 0, openingSource: "Apertura" };
    byKey[key].quantity += Number(item.quantity || 0);
    byKey[key].value += Number(item.value || 0);
    byKey[key].id = item.id || byKey[key].id;
    if (item.openingSource) byKey[key].openingSource = item.openingSource;
  });
  return Object.values(byKey).filter((item) => item.value);
}

function stockInitialMovementDetails(fromDate, toDate) {
  const prices = lastSalePrices(toDate);
  return state.stockMovements
    .filter((item) => item.date >= fromDate && item.date <= toDate)
    .filter((item) => normalizeName(item.reason).toLowerCase() === "stock inicial")
    .filter((item) => matchesGlobalActivity(item))
    .map((item) => {
      const quantity = Math.max(0, Number(item.quantity || 0));
      const value = item.kind === "hacienda"
        ? cattleStockValue(quantity, item.weightKg, item.pricePerKg || prices[item.product] || 0)
        : (quantity / 1000) * (prices[item.product] || 0);
      return { id: item.id, kind: item.kind, product: item.product, quantity, value, openingSource: `Stock inicial cargado ${formatDate(item.date)}` };
    })
    .filter((item) => item.value);
}

function lastSalePrices(date) {
  const prices = {};
  state.settlements
    .filter((item) => item.operation === "venta" && item.date <= date && Number(item.quantity || 0) && matchesGlobalActivity({ activity: settlementActivity(item) }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((item) => {
      prices[item.product] = Number(item.priceNet || 0);
    });
  return prices;
}

function indicatorRows() {
  return state.ledger
    .filter((item) => ["pagado", "cobrado"].includes(item.status))
    .filter((item) => !selectedIndicatorFiscalYear || itemFiscalYear(item, ["date"]) === selectedIndicatorFiscalYear)
    .filter((item) => item.date >= indicatorFromDate() && item.date <= indicatorToDate())
    .filter((item) => matchesGlobalActivity(item));
}

function commercialCostSummary() {
  const rows = state.settlements
    .filter((item) => item.date >= indicatorFromDate() && item.date <= indicatorToDate())
    .filter((item) => !selectedIndicatorFiscalYear || itemFiscalYear(item, ["date"]) === selectedIndicatorFiscalYear)
    .filter((item) => matchesGlobalActivity({ activity: settlementActivity(item) }));
  const gross = rows.reduce((sum, item) => sum + Math.max(0, Number(item.grossSubtotal || 0)), 0);
  const amount = rows.reduce((sum, item) => sum + Math.max(0, Number(item.commercialCost || 0)), 0);
  return { amount, pct: gross ? (amount / gross) * 100 : 0 };
}

function currentIndicatorFiscalYear() {
  return selectedIndicatorFiscalYear || fiscalYearForDate(today);
}

function currentFiscalData() {
  const fiscalYear = currentIndicatorFiscalYear();
  return state.fiscalData.find((item) => item.fiscalYear === fiscalYear) || { fiscalYear };
}

function renderFiscalDataForm() {
  const data = currentFiscalData();
  const fields = {
    fiscalAgriculturalHa: data.agriculturalHa,
    fiscalCattleHa: data.cattleHa,
    fiscalEquity: data.equity,
    fiscalTotalLiabilities: data.totalLiabilities,
    fiscalCurrentAssetsExtra: data.currentAssetsExtra,
    fiscalCurrentLiabilitiesExtra: data.currentLiabilitiesExtra,
    fiscalNotes: data.notes,
  };
  Object.entries(fields).forEach(([id, value]) => {
    const field = $(`#${id}`);
    if (field && document.activeElement !== field) field.value = value ? number(value) : "";
  });
}

function saveFiscalData() {
  const fiscalYear = currentIndicatorFiscalYear();
  if (!fiscalYear) return;
  rememberUndo("datos de ejercicio");
  const existing = state.fiscalData.find((item) => item.fiscalYear === fiscalYear);
  const data = {
    id: existing?.id || uid(),
    fiscalYear,
    agriculturalHa: parseAmount($("#fiscalAgriculturalHa")?.value || ""),
    cattleHa: parseAmount($("#fiscalCattleHa")?.value || ""),
    equity: parseAmount($("#fiscalEquity")?.value || ""),
    totalLiabilities: parseAmount($("#fiscalTotalLiabilities")?.value || ""),
    currentAssetsExtra: parseAmount($("#fiscalCurrentAssetsExtra")?.value || ""),
    currentLiabilitiesExtra: parseAmount($("#fiscalCurrentLiabilitiesExtra")?.value || ""),
    notes: $("#fiscalNotes")?.value || "",
  };
  state.fiscalData = existing ? state.fiscalData.map((item) => item.id === existing.id ? data : item) : [...state.fiscalData, data];
  save();
  render();
}

function workingCapitalEstimate(date, fiscalData = currentFiscalData()) {
  const stock = stockValueAt(date);
  const pendingItems = cashflowItems()
    .filter((item) => item.status === "pendiente")
    .filter((item) => !selectedIndicatorFiscalYear || fiscalYearForDate(item.date) === selectedIndicatorFiscalYear)
    .filter((item) => item.date <= addMonthsToDate(date, 12))
    .filter((item) => matchesGlobalActivity({ activity: item.activity }));
  const receivables = pendingItems.filter((item) => item.amount > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const payables = pendingItems.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  const assets = stock + receivables + Number(fiscalData.currentAssetsExtra || 0);
  const liabilities = payables + Number(fiscalData.currentLiabilitiesExtra || 0);
  return { assets, liabilities, net: assets - liabilities };
}

function workingCapitalDetailItems(date) {
  const stockItems = stockValueDetailAt(date).map((item) => ({
    title: `Stock ${item.product}`,
    meta: `${item.kind === "hacienda" ? "hacienda" : "granos"} valorizado al corte`,
    amount: item.value,
    editMode: "stock",
    id: item.id,
  }));
  const pendingItems = cashflowItems()
    .filter((item) => item.status === "pendiente")
    .filter((item) => !selectedIndicatorFiscalYear || fiscalYearForDate(item.date) === selectedIndicatorFiscalYear)
    .filter((item) => item.date <= addMonthsToDate(date, 12))
    .filter((item) => matchesGlobalActivity({ activity: item.activity }))
    .map((item) => ({
      title: item.amount > 0 ? `A cobrar - ${item.title}` : `A pagar - ${item.title}`,
      meta: `${formatDate(item.date)} - ${item.category || ""} - ${item.status || ""}`,
      amount: item.amount,
      editMode: item.editMode,
      id: item.id,
    }));
  return [...stockItems, ...pendingItems];
}

function stockValueDetailAt(date) {
  const prices = lastSalePrices(date);
  const balances = {};
  state.stockMovements.filter((item) => item.date <= date && matchesGlobalActivity(item)).forEach((item) => {
    const key = `${item.kind}||${item.product}`;
    balances[key] ||= { id: item.id, kind: item.kind, product: item.product, quantity: 0, weightTotal: 0, pricePerKg: 0, priceDate: "", value: 0 };
    balances[key].id = item.id;
    balances[key].quantity += Number(item.quantity || 0);
    if (item.kind === "hacienda") {
      balances[key].weightTotal += cattleMovementWeightTotal(item.quantity, item.weightKg);
      if (Number(item.pricePerKg || 0) && (!balances[key].priceDate || item.date >= balances[key].priceDate)) {
        balances[key].pricePerKg = Number(item.pricePerKg || 0);
        balances[key].priceDate = item.date;
      }
    }
  });
  return Object.values(balances).map((item) => {
    const value = item.kind === "hacienda"
      ? cattleStockValue(Math.max(0, item.quantity), cattleAverageWeight(item.quantity, item.weightTotal), item.pricePerKg || prices[item.product] || 0)
      : (Math.max(0, item.quantity) / 1000) * (prices[item.product] || 0);
    return { ...item, value };
  }).filter((item) => item.value);
}

function fixedCostRows(rows) {
  return rows.filter((item) => {
    const value = signed(item.type, item.amount);
    if (value >= 0) return false;
    const activity = itemActivity(item);
    const accountLabel = normalizeName(accountName(item.accountId)).toLowerCase();
    return ["Estructura", "Gerenciamiento"].includes(activity)
      || /sueldo|carga social|personal/.test(accountLabel);
  });
}

function directGrossMargin(rows) {
  return rows.reduce((sum, item) => {
    const activity = itemActivity(item);
    if (!["Agricultura", "Ganaderia"].includes(activity)) return sum;
    const value = signed(item.type, item.amount);
    if (fixedCostRows([item]).length) return sum;
    return sum + value;
  }, 0);
}

function groupIndicatorsByActivity(rows) {
  const grouped = {};
  rows.forEach((item) => {
    const activity = item.activity || "Sin actividad";
    grouped[activity] ||= { income: 0, cost: 0, result: 0 };
    const value = signed(item.type, item.amount);
    grouped[activity].result += value;
    if (value >= 0) grouped[activity].income += value;
    if (value < 0) grouped[activity].cost += Math.abs(value);
  });
  return grouped;
}

function renderIndicatorBars(target, grouped, field) {
  const max = Math.max(...Object.values(grouped).map((item) => item[field]), 1);
  const rows = Object.entries(grouped)
    .filter(([, value]) => value[field])
    .sort(([, a], [, b]) => b[field] - a[field])
    .map(([activity, value]) => {
      const width = Math.max(3, (value[field] / max) * 100);
      return `
        <button class="bar-row indicator-row ${selectedIndicatorActivity === activity ? "active-indicator" : ""}" data-indicator-activity="${esc(activity)}">
          <span>${esc(activity)}</span>
          <span class="bar-track"><span class="bar-fill ${field === "cost" ? "negative" : ""}" style="width:${width}%"></span></span>
          <strong>${currency(value[field])}</strong>
        </button>
      `;
    });
  $(target).innerHTML = rows.join("") || emptyHtml();
}

function renderIndicatorDetail(context) {
  const rows = context.rows;
  const activity = selectedIndicatorActivity;
  if (selectedIndicatorMetric) {
    const detail = indicatorMetricDetail(selectedIndicatorMetric, context);
    $("#indicatorDetailTitle").textContent = detail.title;
    $("#indicatorIncomeDetail").innerHTML = indicatorDetailList(detail.positive, "positive");
    $("#indicatorCostDetail").innerHTML = indicatorDetailList(detail.negative, "negative");
    return;
  }
  $("#indicatorDetailTitle").textContent = activity ? `Composicion: ${activity}` : "Composicion general";
  const detailRows = activity ? rows.filter((item) => (item.activity || "Sin actividad") === activity) : rows;
  $("#indicatorIncomeDetail").innerHTML = indicatorComposition(detailRows, "income");
  $("#indicatorCostDetail").innerHTML = indicatorComposition(detailRows, "cost");
}

function indicatorMetricDetail(key, context) {
  const rows = context.rows;
  const income = rows.filter((item) => signed(item.type, item.amount) >= 0).map(indicatorLedgerDetailItem);
  const costs = rows.filter((item) => signed(item.type, item.amount) < 0).map(indicatorLedgerDetailItem);
  if (key === "income") return { title: "Detalle: ingreso cobrado", positive: income, negative: [] };
  if (key === "cost") return { title: "Detalle: costo pagado", positive: [], negative: costs };
  if (key === "cashResult") return { title: "Detalle: resultado caja", positive: income, negative: costs };
  if (key === "stockInitial") return { title: "Detalle: stock inicial valorizado", positive: stockOpeningDetailItems(context.fromDate, context.toDate).map((item) => indicatorPlainDetailItem(item, item.openingSource || "Stock inicial")), negative: [] };
  if (key === "stock") return { title: "Detalle: stock al corte valorizado", positive: stockValueDetailAt(context.toDate).map((item) => indicatorPlainDetailItem(item, "Stock al corte")), negative: [] };
  if (key === "stockVariation") return {
    title: "Detalle: variacion de stock",
    positive: stockValueDetailAt(context.toDate).map((item) => indicatorPlainDetailItem(item, "Stock al corte")),
    negative: stockOpeningDetailItems(context.fromDate, context.toDate).map((item) => indicatorPlainDetailItem({ ...item, value: -Math.abs(item.value) }, item.openingSource || "Stock inicial")),
  };
  if (key === "economicResult") return {
    title: "Detalle: resultado economico",
    positive: [...income, ...stockValueDetailAt(context.toDate).map((item) => indicatorPlainDetailItem(item, "Stock al corte"))],
    negative: [...costs, ...stockOpeningDetailItems(context.fromDate, context.toDate).map((item) => indicatorPlainDetailItem({ ...item, value: -Math.abs(item.value) }, item.openingSource || "Stock inicial"))],
  };
  if (key === "economicMargin") return indicatorFormulaDetail("Detalle: margen economico", [
    ["Resultado economico", context.economicResult],
    ["Ingreso cobrado", context.totals.income],
  ], "resultado economico / ingreso");
  if (key === "workingCapital") return {
    title: "Detalle: capital de trabajo operativo",
    positive: workingCapitalDetailItems(context.toDate).filter((item) => item.amount >= 0),
    negative: workingCapitalDetailItems(context.toDate).filter((item) => item.amount < 0),
  };
  if (key === "fixedCosts") return { title: "Detalle: costos fijos", positive: [], negative: fixedCostRows(rows).map(indicatorLedgerDetailItem) };
  if (key === "fixedOverMargin") return indicatorFormulaDetail("Detalle: fijos / margen bruto", [
    ["Costos fijos", -Math.abs(context.fixedCosts)],
    ["Margen directo", context.directMargin],
  ], "costos fijos / margen directo");
  if (key === "commercial") return {
    title: "Detalle: gasto de comercializacion",
    positive: [],
    negative: commercialCostDetailItems(),
  };
  if (key === "debt") return indicatorFormulaDetail("Detalle: endeudamiento total", [
    ["Pasivo total", -Math.abs(context.fiscalData.totalLiabilities || 0)],
    ["Patrimonio neto", context.fiscalData.equity || 0],
  ], context.fiscalData.equity ? "pasivo total / patrimonio neto" : "falta cargar pasivo total y patrimonio neto");
  if (key === "fixedPerHa") return indicatorFormulaDetail("Detalle: costo fijo por hectarea", [
    ["Costos fijos", -Math.abs(context.fixedCosts)],
    ["Has agricolas", context.fiscalData.agriculturalHa || 0],
    ["Has ganaderas", context.fiscalData.cattleHa || 0],
  ], context.totalHa ? "costos fijos / hectareas totales" : "falta cargar superficie trabajada");
  if (key === "roe") return indicatorFormulaDetail("Detalle: ROE estimado", [
    ["Resultado economico", context.economicResult],
    ["Patrimonio neto", context.fiscalData.equity || 0],
  ], context.fiscalData.equity ? "resultado economico / patrimonio neto" : "falta cargar patrimonio neto");
  return { title: "Detalle indicador", positive: [], negative: [] };
}

function indicatorLedgerDetailItem(item) {
  const value = signed(item.type, item.amount);
  return {
    title: `${item.counterparty || "Sin entidad"} - ${item.concept || item.kind || ""}`,
    meta: `${formatDate(item.date)} - ${accountName(item.accountId)} - ${item.status || ""}`,
    amount: value,
    editMode: ledgerEditTarget(item)?.mode || "",
    id: ledgerEditTarget(item)?.id || "",
  };
}

function indicatorPlainDetailItem(item, prefix = "Stock") {
  return {
    title: `${prefix} - ${item.product}`,
    meta: item.kind === "hacienda" ? "hacienda valorizada" : "granos valorizados",
    amount: item.value,
    editMode: "stock",
    id: item.id,
  };
}

function commercialCostDetailItems() {
  return state.settlements
    .filter((item) => item.date >= indicatorFromDate() && item.date <= indicatorToDate())
    .filter((item) => !selectedIndicatorFiscalYear || itemFiscalYear(item, ["date"]) === selectedIndicatorFiscalYear)
    .filter((item) => matchesGlobalActivity({ activity: settlementActivity(item) }))
    .filter((item) => Number(item.commercialCost || 0))
    .map((item) => ({
      title: `${item.product} - ${item.buyer || item.stockPlace}`,
      meta: `${formatDate(item.date)} - bruto ${currency(item.grossSubtotal || 0)} - ${number(item.commercialCostPct || 0)}%`,
      amount: -Math.abs(Number(item.commercialCost || 0)),
      editMode: "settlement",
      id: item.id,
    }));
}

function indicatorFormulaDetail(title, entries, note) {
  const rows = entries.map(([label, amount]) => ({ title: label, meta: note, amount }));
  return {
    title,
    positive: rows.filter((item) => Number(item.amount || 0) >= 0),
    negative: rows.filter((item) => Number(item.amount || 0) < 0),
  };
}

function indicatorDetailList(items, tone) {
  if (!items.length) return emptyHtml();
  return items
    .sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)))
    .map((item) => {
      const attrs = item.editMode && item.id ? ` data-edit="${item.editMode}" data-id="${item.id}"` : "";
      return `<div class="due-item clickable"${attrs}><div><strong>${esc(item.title)}</strong><span class="item-meta">${esc(item.meta || "")}</span></div><strong class="${tone === "negative" || item.amount < 0 ? "negative-text" : "positive-text"}">${currency(Math.abs(Number(item.amount || 0)))}</strong></div>`;
    }).join("");
}

function indicatorComposition(rows, mode) {
  const grouped = {};
  rows.forEach((item) => {
    const value = signed(item.type, item.amount);
    if (mode === "income" && value < 0) return;
    if (mode === "cost" && value >= 0) return;
    const key = accountName(item.accountId);
    grouped[key] = (grouped[key] || 0) + Math.abs(value);
  });
  const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);
  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => {
      const pct = total ? (value / total) * 100 : 0;
      return `<div class="due-item"><div><strong>${esc(name)}</strong><span class="item-meta">${number(pct)}% del total</span></div><strong>${currency(value)}</strong></div>`;
    })
    .join("") || emptyHtml();
}

function renderActivitySummary() {
  const grouped = {};
  filterByDate(state.ledger).forEach((item) => {
    const key = item.activity || "Sin actividad";
    grouped[key] ||= { ingresos: 0, egresos: 0, total: 0 };
    const value = signed(item.type, item.amount);
    grouped[key].total += value;
    if (value >= 0) grouped[key].ingresos += value;
    if (value < 0) grouped[key].egresos += Math.abs(value);
  });
  $("#activitySummary").innerHTML = Object.entries(grouped).map(([key, value]) => `<div class="partner-line clickable" data-activity-detail="${esc(key)}"><span>${esc(key)}</span><small>Ingresos ${currency(value.ingresos)}  -  Egresos ${currency(value.egresos)}  -  Neto ${currency(value.total)}</small></div>`).join("") || emptyHtml();
}

function renderActivityDetail() {
  const activity = selectedActivity;
  $("#activityDetailTitle").textContent = activity ? `Detalle: ${activity}` : "Detalle por actividad";
  if (!activity) {
    $("#activityDetail").innerHTML = emptyHtml();
    return;
  }
  const rows = filterByDate(state.ledger).filter((item) => item.activity === activity).slice().sort((a, b) => b.date.localeCompare(a.date));
  $("#activityDetail").innerHTML = rows.map((item) => `
    <div class="due-item">
      <div><strong>${esc(item.concept)}</strong><span class="item-meta">${formatDate(item.date)}  -  ${esc(item.counterparty || "")}  -  ${esc(accountName(item.accountId))}</span></div>
      <strong>${currency(signed(item.type, item.amount))}</strong>
    </div>
  `).join("") || emptyHtml();
}

function renderLedger() {
  const visibleRows = ledgerRows()
    .filter(matchesLedgerColumnFilters)
    .slice().sort(compareLedgerRows);
  renderLedgerTotals(visibleRows);
  const rows = visibleRows.map((item) => {
    const value = signed(item.type, item.amount);
    const receipt = ledgerReceiptHtml(item);
    return `
      <tr ${ledgerEditAttrs(item)}><td>${formatDate(item.date)}</td><td>${esc(item.kind)}</td><td>${receipt}</td><td>${esc(item.counterparty || "")}</td><td><span class="cell-with-badge">${esc(item.concept)}${ledgerBadge(item)}</span></td><td class="num positive-text">${value > 0 ? currency(value) : ""}</td><td class="num negative-text">${value < 0 ? currency(Math.abs(value)) : ""}</td><td>${ledgerStatusSelect(item)}</td><td>${esc(ledgerMethodLabel(item.method))}</td><td>${esc(item.activity)}</td><td>${esc(accountName(item.accountId))}</td><td>${esc(item.notes || "")}</td></tr>
    `;
  });
  $("#ledgerTable").innerHTML = rows.join("") || `<tr><td colspan="12">${emptyHtml()}</td></tr>`;
  requestAnimationFrame(updateFixedScrollbars);
}

function orderNumberForLedgerItem(item) {
  if (item.orderNumber) return item.orderNumber;
  const target = ledgerEditTarget(item);
  if (target?.mode === "order") return state.orders.find((order) => order.id === target.id)?.orderNumber || "";
  if (target?.mode === "check") {
    const check = state.checks.find((row) => row.id === target.id);
    return state.orders.find((order) => order.id === check?.orderId)?.orderNumber || "";
  }
  return "";
}

function ledgerReceiptDisplay(item) {
  const orderNumber = orderNumberForLedgerItem(item);
  return [orderNumber, item.receipt].filter(Boolean).join(" / ");
}

function ledgerReceiptHtml(item) {
  const orderNumber = orderNumberForLedgerItem(item);
  const receipt = item.receipt || "";
  if (orderNumber && receipt) {
    return `<span class="ledger-receipt-stack"><span>${esc(orderNumber)}</span><span>${esc(receipt)}</span></span>`;
  }
  return `<span class="ledger-receipt-stack"><span>${esc(orderNumber || receipt)}</span></span>`;
}

function matchesLedgerColumnFilters(item) {
  const value = signed(item.type, item.amount);
  const fields = {
    date: formatDate(item.date),
    kind: item.kind,
    receipt: ledgerReceiptDisplay(item),
    counterparty: item.counterparty,
    concept: item.concept,
    income: value > 0 ? number(value) : "",
    expense: value < 0 ? number(Math.abs(value)) : "",
    status: item.status,
    method: ledgerMethodLabel(item.method),
    activity: item.activity,
    account: accountName(item.accountId),
    notes: item.notes,
  };
  return Object.entries(selectedLedgerColumns).every(([key, needle]) => {
    if (!needle) return true;
    const candidate = String(fields[key] || "").toLocaleLowerCase("es-AR");
    return candidate.includes(String(needle).toLocaleLowerCase("es-AR"));
  });
}

function ledgerMethodLabel(method) {
  return String(method || "").toLowerCase().startsWith("cheque") ? "Cheque" : method || "";
}

function badgeHtml(label, tone = "") {
  return label ? `<span class="source-badge ${tone}">${esc(label)}</span>` : "";
}

function orderBadge(order) {
  const sourceId = String(order.sourceId || "");
  if (sourceId.startsWith("settlement:")) return badgeHtml("Liquidacion", "settlement");
  if (sourceId.startsWith("invoice:") || (Array.isArray(order.sourceIds) && order.sourceIds.length)) return badgeHtml("Factura financiada", "invoice");
  if (sourceId.startsWith("currentAccount:")) return badgeHtml("Cuenta corriente", "account");
  if (linkedOrderChecks(order).length) return badgeHtml("Cheque vinculado", "check");
  if (order.method === "Cheque" || order.method === "E-cheq") return badgeHtml("Cheque", "check");
  return "";
}

function ledgerBadge(item) {
  if (item.checkId) return badgeHtml("Cheque vinculado", "check");
  const orderId = String(item.orderId || "");
  if (orderId.startsWith("check:")) return badgeHtml("Cheque vinculado", "check");
  const target = ledgerEditTarget(item);
  if (target?.mode !== "order") return "";
  const order = state.orders.find((row) => row.id === target.id);
  return order ? orderBadge(order) : "";
}

function isBankLedgerRow(item) {
  const method = normalizeName(item.method).toLowerCase();
  if (!method) return false;
  if (["efectivo", "canje", "cuenta corriente", "tarjeta"].some((value) => method.includes(value))) return false;
  return ["transferencia", "debito directo", "vep", "cheque", "e-cheq", "deposito"].some((value) => method.includes(value));
}

function renderLedgerTotals(rows) {
  const totals = rows.reduce((acc, item) => {
    const value = signed(item.type, item.amount);
    if (value >= 0) acc.income += value;
    if (value < 0) acc.expense += Math.abs(value);
    acc.net += value;
    return acc;
  }, { income: 0, expense: 0, net: 0 });
  const hasActiveLedgerFilters = Boolean(
    $("#filterFrom")?.value
    || $("#filterTo")?.value
    || selectedActivity
    || Object.values(selectedLedgerColumns).some(Boolean)
  );
  const suffix = hasActiveLedgerFilters ? " filtrados" : "";
  $("#ledgerTotals").innerHTML = `
    <article class="ledger-total-count"><span>Movimientos</span><strong>${rows.length}</strong></article>
    <article><span>Ingresos${suffix}</span><strong class="positive-text">${currency(totals.income)}</strong></article>
    <article><span>Egresos${suffix}</span><strong class="negative-text">${currency(totals.expense)}</strong></article>
    <article><span>Neto${suffix}</span><strong class="${totals.net < 0 ? "negative-text" : "positive-text"}">${currency(totals.net)}</strong></article>
  `;
}

function fixedScrollPairs() {
  return $$("[data-fixed-scrollbar]").map((bar) => {
    const wrap = $(`#${bar.dataset.target}`);
    const spacer = bar.querySelector("[data-fixed-scroll-spacer]");
    return { bar, wrap, spacer };
  }).filter((item) => item.wrap && item.spacer);
}

function updateFixedScrollbars() {
  fixedScrollPairs().forEach(({ bar, wrap, spacer }) => {
    const activeView = wrap.closest(".view")?.id === selectedView;
    spacer.style.width = `${wrap.scrollWidth}px`;
    bar.hidden = !activeView || wrap.scrollWidth <= wrap.clientWidth;
    if (!bar.hidden) bar.scrollLeft = wrap.scrollLeft;
  });
}

function updateLedgerFixedScroll() {
  updateFixedScrollbars();
}

function compareLedgerRows(a, b) {
  return b.date.localeCompare(a.date);
}

function ledgerRows() {
  return filterByDate(state.ledger);
}

function dueCashflowLedgerRows() {
  const currentDate = localToday();
  return cashflowItems()
    .filter((item) => item.status === "pendiente" && item.date && item.date <= currentDate)
    .map((item) => {
      const expired = item.date < currentDate;
      const source = item.editMode === "check"
        ? state.checks.find((check) => check.id === item.id)
        : item.editMode === "invoice"
          ? state.invoices.find((invoice) => invoice.id === item.id)
          : state.orders.find((order) => order.id === item.id);
      const isIncome = Number(item.amount || 0) > 0;
      const isCheck = item.editMode === "check";
      const isInvoice = item.editMode === "invoice";
      return {
        id: `due-cashflow:${item.flowOriginKey || `${item.editMode}:${item.id}`}`,
        orderNumber: item.editMode === "order" ? source?.orderNumber : item.editMode === "check" ? state.orders.find((order) => order.id === source?.orderId)?.orderNumber : "",
        orderId: item.editMode === "order" ? item.id : "",
        checkId: item.editMode === "check" ? item.id : "",
        invoiceId: item.editMode === "invoice" ? item.id : "",
        flowOriginKey: item.flowOriginKey || "",
        date: item.date,
        kind: isInvoice
          ? `Factura ${expired ? "vencida" : "a vencer hoy"}`
          : isCheck
            ? `Cheque ${expired ? "vencido" : "a vencer hoy"}`
            : `${isIncome ? "Cobro" : "Pago"} ${expired ? "vencido" : "a vencer hoy"}`,
        type: isIncome ? "cobro" : "pago",
        receipt: source?.number || source?.receipt || "",
        counterparty: source?.counterparty || source?.provider || "",
        concept: source?.concept || item.title,
        method: source?.method || (isInvoice ? "Factura financiada" : ""),
        activity: source?.activity || item.activity,
        accountId: source?.accountId || "",
        status: "pendiente",
        amount: Math.abs(Number(item.amount || 0)),
        notes: expired ? "Vencido sin cambio de estado." : "En fecha, pendiente de confirmar.",
      };
    });
}

function dueCheckLedgerRows() {
  const currentDate = localToday();
  return state.checks
    .filter((check) => check.status === "pendiente" && check.dueDate && check.dueDate <= currentDate)
    .map((check) => {
      const expired = check.dueDate < currentDate;
      const isReceived = check.direction === "recibido";
      return {
        id: `due:${check.id}`,
        checkId: check.id,
        orderNumber: check.orderNumber || state.orders.find((order) => order.id === check.orderId)?.orderNumber || "",
        date: check.dueDate,
        kind: expired ? "Cheque vencido" : "Cheque a vencer hoy",
        type: isReceived ? "cobro" : "pago",
        receipt: check.number,
        counterparty: check.counterparty,
        concept: check.concept || `Cheque ${check.number}`,
        method: check.direction === "recibido" ? "Cheque recibido" : "Cheque emitido",
        activity: check.activity,
        accountId: check.accountId,
        status: "pendiente",
        amount: check.amount,
        notes: expired ? "Vencido sin cambio de estado." : "En fecha, pendiente de confirmar.",
      };
    });
}

function isFinalOrderStatus(status) {
  return status === "pagado" || status === "cobrado";
}

function isCheckComponent(component) {
  const method = normalizeName(component?.method || "").toLowerCase();
  return method.includes("cheque") || method.includes("e-cheq") || method.includes("echeq");
}

function orderUsesOwnChecks(order) {
  return ["Cheque", "E-cheq", "Mixto"].includes(order?.method) && order?.checkAction !== "endosado";
}

function isFinalFinancialStatus(status, type) {
  if (status === "anulado") return true;
  if (type === "cobro") return ["cobrado", "depositado", "endosado"].includes(status);
  return status === "pagado";
}

function componentFallbackStatus(order, status) {
  if (status) return status;
  return order.status === "pago parcial" ? "pendiente" : order.status;
}

function componentEffectiveDate(order, status, plannedDate, effectiveDate) {
  return isFinalFinancialStatus(status, order.type)
    ? (effectiveDate || plannedDate || order.dueDate || order.date)
    : (plannedDate || order.dueDate || order.date);
}

function financialComponent(order, row) {
  const status = componentFallbackStatus(order, row.status);
  const plannedDate = row.plannedDate || row.date || order.dueDate || order.date;
  const effectiveDate = row.effectiveDate || "";
  const index = row.index ?? 0;
  return {
    sourceType: row.sourceType || "order",
    sourceId: row.sourceId || order.id,
    orderId: order.id,
    orderNumber: order.orderNumber || "",
    checkId: row.checkId || "",
    invoiceId: row.invoiceId || "",
    flowOriginKey: row.flowOriginKey || `order:${order.id}:component:${index}`,
    date: componentEffectiveDate(order, status, plannedDate, effectiveDate),
    plannedDate,
    effectiveDate,
    amount: Number(row.amount || 0),
    method: row.method || order.method || "Orden",
    receipt: row.receipt || order.receipt || "",
    status,
    activity: row.activity || order.activity,
    accountId: row.accountId || order.accountId,
    counterparty: row.counterparty || order.counterparty,
    concept: row.concept || order.concept,
  };
}

function orderFinancialComponents(order) {
  const dueDate = order.dueDate || order.date;
  const components = [];
  const push = (row) => {
    if (!Number(row.amount || 0)) return;
    components.push(financialComponent(order, { ...row, index: components.length }));
  };

  if (Number(order.transferAmount || 0)) push({ amount: order.transferAmount, method: "Transferencia", receipt: order.transferReceipt || order.receipt, plannedDate: order.transferDate || dueDate, status: order.status });
  if (Number(order.currentAccountAmount || 0)) push({ amount: order.currentAccountAmount, method: "cuenta corriente", receipt: order.receipt, plannedDate: order.currentAccountDate || dueDate, status: order.status, flowOriginKey: `order:${order.id}:current-account` });
  if (Number(order.cashAmount || 0)) push({ amount: order.cashAmount, method: "Efectivo", receipt: order.receipt, plannedDate: order.cashDate || dueDate, status: order.status });
  if (Number(order.cardAmount || 0)) push({ amount: order.cardAmount, method: "Tarjeta", receipt: order.receipt, plannedDate: order.cardDate || dueDate, status: order.status });
  if (Number(order.bankLoanAmount || 0)) push({ amount: order.bankLoanAmount, method: "Prestamo bancario", receipt: order.receipt, plannedDate: order.bankLoanDate || dueDate, status: order.status });
  if (Number(order.exchangeAmount || 0)) push({ amount: order.exchangeAmount, method: "Canje", receipt: order.receipt, plannedDate: order.exchangeDate || dueDate, status: order.status });

  (Array.isArray(order.paymentComponents) ? order.paymentComponents : []).forEach((item) => push({
    amount: item.amount,
    method: item.method || "Mixto",
    receipt: item.receipt || order.receipt,
    plannedDate: item.date || dueDate,
    status: item.status || (order.status === "pago parcial" ? "pendiente" : order.status),
    flowOriginKey: `order:${order.id}:payment:${components.length}`,
  }));

  const linkedChecks = linkedOrderChecks(order);
  const formChecks = Array.isArray(order.checks) && order.checks.length
    ? order.checks
    : (order.checkNumber || order.checkAmount || order.checkDueDate
      ? [{ number: order.checkNumber || order.receipt || "", amount: order.checkAmount || order.amountArs, dueDate: order.checkDueDate || dueDate }]
      : []);
  const checkRows = linkedChecks.length ? linkedChecks : formChecks;

  if (order.checkAction === "endosado") {
    const endorsed = state.checks.find((item) => item.id === order.endorsedCheckId);
    push({
      sourceType: "check",
      sourceId: endorsed?.id || order.id,
      checkId: endorsed?.id || "",
      amount: order.amountArs,
      method: "Cheque endosado",
      receipt: endorsed?.number || order.receipt,
      plannedDate: endorsed?.dueDate || dueDate,
      effectiveDate: endorsed?.statusDate || "",
      status: endorsed?.status || order.status,
      flowOriginKey: endorsed?.id ? `check:${endorsed.id}` : `order:${order.id}:endorsed-check`,
    });
  } else if (["Cheque", "E-cheq", "Mixto"].includes(order.method)) {
    let remainingForChecks = order.method === "Mixto"
      ? roundMoney(Number(order.amountArs || 0) - components.reduce((sum, item) => sum + Number(item.amount || 0), 0))
      : Infinity;
    checkRows.forEach((item) => {
      if (remainingForChecks <= 0) return;
      const checkAmount = order.method === "Mixto" ? Math.min(Number(item.amount || 0), remainingForChecks) : Number(item.amount || order.amountArs || 0);
      if (checkAmount > 0) push({
        sourceType: "check",
        sourceId: item.id || order.id,
        checkId: item.id || "",
        amount: checkAmount,
        method: item.direction === "recibido" ? "Cheque recibido" : (order.method === "E-cheq" ? "E-cheq" : "Cheque"),
        receipt: item.number || order.receipt,
        plannedDate: item.dueDate || item.date || dueDate,
        effectiveDate: item.statusDate || "",
        status: item.status || order.status,
        flowOriginKey: item.id ? `check:${item.id}` : `order:${order.id}:check:${components.length}`,
      });
      remainingForChecks = roundMoney(remainingForChecks - checkAmount);
    });
  }

  if (!components.length) push({ amount: order.amountArs || order.amount, method: order.method || "Orden", receipt: order.receipt, plannedDate: dueDate, status: order.status });
  return components;
}

function orderHasNonCheckComponents(order) {
  return orderFinancialComponents(order)
    .some((component) => !isCheckComponent(component) && Math.abs(Number(component.amount || 0)) > 0);
}

function orderNonCheckComponentTotal(order) {
  return orderFinancialComponents(order)
    .filter((component) => !isCheckComponent(component))
    .reduce((sum, component) => sum + Math.abs(Number(component.amount || 0)), 0);
}

function linkedOrderChecks(order) {
  return state.checks.filter((check) => check.orderId === order.id);
}

function pendingOrderLedgerRows() {
  const currentDate = localToday();
  return state.orders
    .filter((order) => order.status !== "anulado" && !isFinalOrderStatus(order.status) && order.dueDate && order.dueDate <= currentDate)
    .flatMap((order) => {
      return orderFinancialComponents(order)
        .filter((component) => component.date && component.date <= currentDate)
        .filter((component) => !isFinalFinancialStatus(component.status, order.type))
        .map((component, index) => {
          const expired = component.date < currentDate;
          return {
            id: `pending:${component.flowOriginKey || `${order.id}:${index}`}`,
            orderId: order.id,
            checkId: component.checkId || "",
            flowOriginKey: component.flowOriginKey,
            date: component.date,
            kind: `${order.type === "cobro" ? "Cobro" : "Pago"} ${expired ? "vencido" : "a vencer hoy"}`,
            type: order.type === "cobro" ? "cobro" : "pago",
            receipt: component.receipt || order.receipt,
            counterparty: order.counterparty,
            concept: order.concept,
            method: component.method || order.method,
            activity: order.activity,
            accountId: order.accountId,
            status: order.status || "pendiente",
            amount: component.amount,
            notes: expired ? "Vencido sin cambio de estado." : "En fecha, pendiente de confirmar.",
          };
        });
    });
}

function pendingInvoiceLedgerRows() {
  const currentDate = localToday();
  return openCashflowInvoices()
    .filter((invoice) => invoice.dueDate && invoice.dueDate <= currentDate)
    .map((invoice) => {
      const expired = invoice.dueDate < currentDate;
      return {
        id: `pending-invoice:${invoice.id}`,
        invoiceId: invoice.id,
        date: invoice.dueDate,
        kind: `Factura ${expired ? "vencida" : "a vencer hoy"}`,
        type: "pago",
        receipt: invoice.number,
        counterparty: invoice.provider,
        concept: invoice.concept || `Factura ${invoice.number}`,
        method: "Factura financiada",
        activity: invoice.activity,
        accountId: invoice.accountId,
        status: invoice.status || "pendiente",
        amount: invoiceArsAmount(invoice),
        notes: expired ? "Vencida sin orden de pago." : "En fecha, pendiente de orden de pago.",
      };
    });
}

function ledgerEditAttrs(item) {
  const target = ledgerEditTarget(item);
  const rowClass = `${target ? "clickable-row " : ""}${item.kind === "Imp. al cheque" ? "bank-tax-row" : ""}`.trim();
  return `${rowClass ? `class="${rowClass}"` : ""}${target ? ` data-edit="${target.mode}" data-id="${target.id}" title="Editar movimiento"` : ""}`;
}

function ledgerEditTarget(item) {
  if (item.invoiceId && state.invoices.some((invoice) => invoice.id === item.invoiceId)) return { mode: "invoice", id: item.invoiceId };
  if (item.checkId && state.checks.some((check) => check.id === item.checkId)) return { mode: "check", id: item.checkId };
  const orderId = String(item.orderId || "");
  if (!orderId) return null;
  if (orderId.startsWith("order:")) {
    const id = orderId.split(":")[1];
    return state.orders.some((order) => order.id === id) ? { mode: "order", id } : null;
  }
  if (orderId.startsWith("check:")) {
    const id = orderId.split(":")[1];
    return state.checks.some((check) => check.id === id) ? { mode: "check", id } : null;
  }
  return state.orders.some((order) => order.id === orderId) ? { mode: "order", id: orderId } : null;
}

function ledgerStatusSelect(item) {
  if (item.kind === "Imp. al cheque") return statusSelect("ledger", item.id, item.status || "pagado");
  const target = ledgerEditTarget(item);
  if (!target) return statusSelect("ledger", item.id, item.status);
  const collectionByMode = { check: "checks", order: "orders", invoice: "invoices" };
  const collection = collectionByMode[target.mode] || "orders";
  const source = state[collection].find((row) => row.id === target.id);
  return statusSelect(collection, target.id, source?.status || item.status);
}

function renderInvoices() {
  const providerSelect = $("#invoiceProviderFilter");
  const providers = [...new Set(filterByDate(state.invoices, "dueDate")
    .filter((item) => matchesGlobalActivity(item))
    .map((item) => item.provider)
    .filter(Boolean))]
    .sort((a, b) => normalizeName(a).localeCompare(normalizeName(b)));
  if (providerSelect) {
    const stillValid = !selectedInvoiceProvider || providers.includes(selectedInvoiceProvider);
    if (!stillValid) selectedInvoiceProvider = "";
    providerSelect.innerHTML = `<option value="">Todos</option>${providers.map((provider) => `<option value="${esc(provider)}" ${provider === selectedInvoiceProvider ? "selected" : ""}>${esc(provider)}</option>`).join("")}`;
  }
  const filtered = filterByDate(state.invoices, "dueDate")
    .filter((item) => matchesGlobalActivity(item))
    .filter((item) => !selectedInvoiceProvider || item.provider === selectedInvoiceProvider)
    .slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const rows = filtered.map((item) => `
    <tr class="clickable-row" data-edit="invoice" data-id="${item.id}"><td>${formatDate(item.dueDate)}</td><td>${esc(item.provider)}</td><td>${esc(item.number)}</td><td>${esc(item.activity)}</td><td>${esc(accountName(item.accountId))}</td><td>${invoiceCurrency(item)}</td><td class="num">${number(invoiceBalance(item))}</td><td class="num">${invoiceCurrency(item) === "USD" ? number(item.tcInvoice) : "-"}</td><td class="num">${currency(invoiceArsAmount(item))}</td><td>${esc(item.status)}</td><td>${esc(item.notes || "")}</td><td><button class="danger-link" data-delete="invoices" data-id="${item.id}">Borrar</button></td></tr>
  `);
  $("#invoiceTable").innerHTML = rows.join("") || `<tr><td colspan="12">${emptyHtml()}</td></tr>`;
  const totalUsd = filtered.filter((item) => invoiceCurrency(item) === "USD").reduce((sum, item) => sum + invoiceBalance(item), 0);
  const totalArsInvoices = filtered.filter((item) => invoiceCurrency(item) === "ARS").reduce((sum, item) => sum + invoiceBalance(item), 0);
  const totalArs = filtered.reduce((sum, item) => sum + invoiceArsAmount(item), 0);
  $("#invoiceTotals").innerHTML = filtered.length ? `<tr class="table-total-row"><td colspan="6">Total facturas filtradas</td><td class="num">USD ${number(totalUsd)} / ARS ${number(totalArsInvoices)}</td><td></td><td class="num">${currency(totalArs)}</td><td colspan="3"></td></tr>` : "";
}

function renderOrders() {
  const entityNeedle = normalizeName(selectedOrderEntity).toLowerCase();
  const from = $("#filterFrom").value;
  const to = $("#filterTo").value;
  const orderDateValues = (order) => [
    order.date,
    order.dueDate,
    ...linkedOrderChecks(order).map((check) => check.dueDate),
  ].filter(Boolean);
  const matchesDateWindow = (order, start, end) => {
    const dates = orderDateValues(order);
    if (!start && !end) return true;
    return dates.some((date) => (!start || date >= start) && (!end || date <= end));
  };
  const filtered = state.orders
    .filter((item) => matchesGlobalActivity(item))
    .filter((item) => matchesDateWindow(item, from, to))
    .filter((item) => !selectedOrderType || item.type === selectedOrderType)
    .filter((item) => !entityNeedle || normalizeName(item.counterparty).toLowerCase().includes(entityNeedle))
    .filter((item) => !selectedOrderStatus || item.status === selectedOrderStatus)
    .filter((item) => matchesDateWindow(item, selectedOrderFrom, selectedOrderTo))
    .slice().sort((a, b) => b.date.localeCompare(a.date));
  const rows = filtered.map((item) => `
    <tr class="clickable-row" data-edit="order" data-id="${item.id}"><td>${esc(item.orderNumber || "")}</td><td>${formatDate(item.date)}</td><td>${esc(item.type)}</td><td>${esc(item.counterparty)}</td><td><span class="cell-with-badge">${esc(orderSourceDisplay(item))}${orderBadge(item)}</span></td><td>${esc(orderReceiptDisplay(item))}</td><td>${esc(item.method)}</td><td>${statusSelect("orders", item.id, item.status)}</td><td class="num">${currency(item.amountArs)}</td><td>${esc(item.notes || "")}</td><td><button class="danger-link" data-delete="orders" data-id="${item.id}">Borrar</button></td></tr>
  `);
  $("#orderTable").innerHTML = rows.join("") || `<tr><td colspan="11">${emptyHtml()}</td></tr>`;
  const total = filtered.reduce((sum, item) => sum + Number(item.amountArs || 0), 0);
  $("#orderTotals").innerHTML = filtered.length ? `<tr class="table-total-row"><td colspan="8">Total ordenes filtradas (${filtered.length})</td><td class="num">${currency(total)}</td><td colspan="2"></td></tr>` : "";
}

function renderCashflow() {
  const items = cashflowItems().filter((item) => matchesGlobalActivity(item));
  const months = cashflowMonths(items);
  $("#cashflowHead").innerHTML = `<tr><th>Actividad / negocio</th>${months.map((item) => `<th class="num month-head ${selectedCashflowMonth === item.key && !selectedCashflowGroup ? "active-month" : ""}" data-cashflow-month="${esc(item.key)}">${esc(item.label)}</th>`).join("")}<th class="num">Total</th></tr>`;
  const renderDirectionRows = (direction) => cashflowActivityRows(items, direction).flatMap((row) => {
    const directionItems = items.filter((item) => item.group === row && (direction === "income" ? item.amount > 0 : item.amount < 0));
    const values = months.map((month) => directionItems.filter((item) => item.month === month.key).reduce((sum, item) => sum + Math.abs(item.amount), 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const rowClass = row === "Agricultura"
      ? "cashflow-agriculture-row"
      : row === "Ganaderia"
        ? "cashflow-cattle-row"
        : row === "Impuestos"
          ? "cashflow-tax-row"
          : "";
    const expandKey = `${row}|${direction}`;
    const expanded = selectedCashflowExpandedGroup === expandKey;
    const directionLabel = direction === "income" ? "Ingresos" : "Egresos";
    const parent = `<tr class="${rowClass} cashflow-direction-row ${direction}"><td><button class="cashflow-expand" type="button" data-cashflow-expand="${esc(expandKey)}" aria-expanded="${expanded}"><span>${expanded ? "-" : "+"}</span><span class="cashflow-business">${esc(cashflowGroupLabel(row))}</span><small>${directionLabel}</small></button></td>${values.map((value, index) => `<td class="num cashflow-cell ${selectedCashflowMonth === months[index].key && selectedCashflowGroup === row && selectedCashflowDirection === direction ? "active-month" : ""}" data-cashflow-month="${esc(months[index].key)}" data-cashflow-group="${esc(row)}" data-cashflow-direction="${direction}" title="${value ? currency(value) : ""}">${value ? compactCurrency(value) : "-"}</td>`).join("")}<td class="num"><strong title="${currency(total)}">${compactCurrency(total)}</strong></td></tr>`;
    return expanded ? [parent, ...cashflowExpandedRows(row, direction, months, items)] : [parent];
  });
  const expenseRows = renderDirectionRows("expense");
  const incomeRows = renderDirectionRows("income");
  const totalIncomeRows = cashflowTotalRow("Total ingresos", months, items, (amount) => amount > 0);
  const totalExpenseRows = cashflowTotalRow("Total egresos", months, items, (amount) => amount < 0);
  const netRows = cashflowNetRow(months, items);
  const accumulatedRows = cashflowAccumulatedRow(months, items);
  $("#cashflowBody").innerHTML = [
    cashflowSectionRow("Egresos por actividad", months.length),
    ...expenseRows,
    totalExpenseRows,
    cashflowSectionRow("Ingresos por actividad", months.length),
    ...incomeRows,
    totalIncomeRows,
    netRows,
    accumulatedRows,
  ].join("");
  const detail = items
    .filter((item) => !selectedCashflowMonth || item.month === selectedCashflowMonth)
    .filter((item) => !selectedCashflowGroup || item.group === selectedCashflowGroup)
    .filter((item) => !selectedCashflowDirection || (selectedCashflowDirection === "income" ? item.amount > 0 : item.amount < 0))
    .filter((item) => !selectedCashflowStatus || item.status === selectedCashflowStatus)
    .filter(matchesCashflowDetailFilters)
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedMonth = months.find((item) => item.key === selectedCashflowMonth);
  const directionTitle = selectedCashflowDirection === "income" ? "Ingresos" : selectedCashflowDirection === "expense" ? "Egresos" : "";
  const detailIncome = detail.filter((item) => item.amount > 0).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const detailExpense = detail.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  const detailNet = detailIncome - detailExpense;
  $("#cashflowDetailTitle").textContent = selectedMonth ? `Detalle ${selectedCashflowGroup ? `${cashflowGroupLabel(selectedCashflowGroup)}${directionTitle ? ` - ${directionTitle}` : ""} - ` : "del flujo "}${selectedMonth.label}` : "Detalle del flujo";
  $("#cashflowClearMonth").hidden = !selectedCashflowMonth && !selectedCashflowGroup;
  $("#cashflowDetail").innerHTML = detail.length ? `
    <div class="cashflow-detail-row cashflow-detail-head">
      <span>Fecha</span>
      <span>Detalle</span>
      <span>Estado</span>
      <span>Ingresos</span>
      <span>Egresos</span>
    </div>
    ${detail.map((item) => `
      <div class="cashflow-detail-row clickable" ${item.editMode ? `data-edit="${item.editMode}" data-id="${item.id}"` : ""}>
        <strong class="cashflow-date">${formatDate(item.date)}</strong>
        <div><strong>${esc(item.title)}</strong><span class="item-meta">${esc(item.category || "")}  -  ${esc(item.activity || "")} ${item.badge || ""}</span></div>
        <span><span class="status ${statusClass(item.status)}">${esc(item.status || "sin estado")}</span></span>
        <strong class="num positive-text">${item.amount > 0 ? currency(item.amount) : ""}</strong>
        <strong class="num negative-text">${item.amount < 0 ? currency(Math.abs(item.amount)) : ""}</strong>
      </div>
    `).join("")}
    <div class="cashflow-detail-row cashflow-detail-total">
      <span></span>
      <strong>Total visible</strong>
      <strong class="${detailNet < 0 ? "negative-text" : "positive-text"}">Neto ${currency(detailNet)}</strong>
      <strong class="num positive-text">${currency(detailIncome)}</strong>
      <strong class="num negative-text">${currency(detailExpense)}</strong>
    </div>
  ` : emptyHtml();
}

function matchesCashflowDetailFilters(item) {
  const amount = Number(item.amount || 0);
  const fields = {
    date: formatDate(item.date),
    detail: `${item.title || ""} ${item.category || ""} ${item.activity || ""}`,
    income: amount > 0 ? number(amount) : "",
    expense: amount < 0 ? number(Math.abs(amount)) : "",
  };
  return Object.entries(selectedCashflowDetailFilters).every(([key, needle]) => {
    if (!needle) return true;
    return String(fields[key] || "").toLocaleLowerCase("es-AR").includes(String(needle).toLocaleLowerCase("es-AR"));
  });
}

function cashflowActivityRows(items, direction) {
  const preferred = ["Agricultura", "Ganaderia", "Impuestos", "Financiero", "Estructura", "Gerenciamiento", "Socios", "INVERSIONES"];
  const available = [...new Set(items
    .filter((item) => direction === "income" ? item.amount > 0 : item.amount < 0)
    .map((item) => item.group)
    .filter((activity) => preferred.includes(activity)))];
  const base = direction === "expense"
    ? preferred
    : ["Agricultura", "Ganaderia", ...preferred.slice(2).filter((activity) => available.includes(activity))];
  return [
    ...new Set(base),
    ...available.filter((activity) => !base.includes(activity)).sort((a, b) => a.localeCompare(b)),
  ];
}

function cashflowSectionRow(label, monthCount) {
  return `<tr class="cashflow-section-row"><td>${esc(label)}</td><td colspan="${monthCount + 1}"></td></tr>`;
}

function cashflowGroupLabel(group) {
  return group === "Ganaderia" ? "Ganaderia" : group;
}

function cashflowExpandedRows(group, direction, months, items) {
  const grouped = {};
  items.filter((item) => item.group === group && (direction === "income" ? item.amount > 0 : item.amount < 0)).forEach((item) => {
    const key = item.title || "Sin detalle";
    grouped[key] ||= {};
    grouped[key][item.month] = (grouped[key][item.month] || 0) + Math.abs(Number(item.amount || 0));
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, byMonth]) => {
      const values = months.map((month) => Number(byMonth[month.key] || 0));
      const total = values.reduce((sum, value) => sum + value, 0);
      return `<tr class="cashflow-expanded-row ${direction}"><td>${esc(title)}</td>${values.map((value, index) => `<td class="num cashflow-cell" data-cashflow-month="${esc(months[index].key)}" data-cashflow-group="${esc(group)}" data-cashflow-direction="${direction}" title="${value ? currency(value) : ""}">${value ? compactCurrency(value) : "-"}</td>`).join("")}<td class="num"><strong title="${currency(total)}">${compactCurrency(total)}</strong></td></tr>`;
    });
}

function cashflowTotalRow(label, months, items, predicate) {
  const values = months.map((month) => items
    .filter((item) => item.month === month.key && predicate(item.amount))
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  return `<tr class="cashflow-total-row"><td>${esc(label)}</td>${values.map((value) => `<td class="num" title="${value ? currency(value) : ""}">${value ? compactCurrency(value) : "-"}</td>`).join("")}<td class="num"><strong title="${currency(total)}">${compactCurrency(total)}</strong></td></tr>`;
}

function cashflowNetRow(months, items) {
  const values = months.map((month) => items
    .filter((item) => item.month === month.key)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  return `<tr class="cashflow-net-row"><td>Resultado mensual</td>${values.map((value) => `<td class="num ${value < 0 ? "negative-text" : "positive-text"}" title="${currency(value)}">${compactCurrency(value)}</td>`).join("")}<td class="num ${total < 0 ? "negative-text" : "positive-text"}"><strong title="${currency(total)}">${compactCurrency(total)}</strong></td></tr>`;
}

function cashflowAccumulatedRow(months, items) {
  let accumulated = 0;
  const values = months.map((month) => {
    const monthResult = items
      .filter((item) => item.month === month.key)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    accumulated += monthResult;
    return accumulated;
  });
  const total = values.at(-1) || 0;
  return `<tr class="cashflow-accumulated-row"><td>Resultado acumulado</td>${values.map((value) => `<td class="num ${value < 0 ? "negative-text" : "positive-text"}" title="${currency(value)}">${compactCurrency(value)}</td>`).join("")}<td class="num ${total < 0 ? "negative-text" : "positive-text"}"><strong title="${currency(total)}">${compactCurrency(total)}</strong></td></tr>`;
}

function cashflowMonths(items) {
  const currentMonth = String(localToday()).slice(0, 7);
  const itemMonths = items.map((item) => item.month).filter((month) => /^\d{4}-\d{2}$/.test(month));
  const firstMonth = itemMonths.length && itemMonths.sort()[0] < currentMonth ? itemMonths.sort()[0] : currentMonth;
  const [startYear, startMonth] = firstMonth.split("-").map(Number);
  const [currentYear, currentMonthNumber] = currentMonth.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, 1);
  const futureEnd = new Date(currentYear, currentMonthNumber - 1 + 11, 1);
  const monthCount = (futureEnd.getFullYear() - start.getFullYear()) * 12 + futureEnd.getMonth() - start.getMonth() + 1;
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return { key: `${year}-${month}`, label: `${month}/${year.slice(-2)}` };
  });
}

function cashflowItems() {
  const currentAccountParentIds = new Set(state.orders
    .map((item) => String(item.sourceId || ""))
    .filter((sourceId) => sourceId.startsWith("currentAccount:"))
    .map((sourceId) => sourceId.split(":")[1]));
  const linkedCheckIds = new Set();
  const invoiceItems = openCashflowInvoices().map((item) => ({
    id: item.id,
    editMode: "invoice",
    flowOriginKey: `invoice:${item.id}`,
    date: item.dueDate,
    plannedDate: item.dueDate,
    effectiveDate: "",
    month: String(item.dueDate || "").slice(0, 7),
    group: "Facturas financiadas",
    title: `Factura ${item.number} - ${item.provider}`,
    amount: -Math.abs(invoiceArsAmount(item)),
    activity: item.activity,
    status: item.status,
    badge: `${badgeHtml("Factura financiada", "invoice")}${isPreexistingDebt(item) ? badgeHtml("Deuda preexistente", "invoice") : ""}`,
  }));
  const orderItems = state.orders
    .filter((item) => item.status !== "anulado" && !(item.method === "cuenta corriente" && currentAccountParentIds.has(item.id)))
    .flatMap((item) => orderFinancialComponents(item).map((component, index) => {
      if (component.checkId) linkedCheckIds.add(component.checkId);
      const isCheck = isCheckComponent(component);
      const editMode = component.checkId ? "check" : "order";
      const id = component.checkId || item.id;
      const titleMethod = item.method === "Mixto" && !isCheck ? `${component.method || "Medio"} - ` : "";
      return {
        id,
        orderId: item.id,
        componentId: component.flowOriginKey || `order:${item.id}:component:${index}`,
        flowOriginKey: component.flowOriginKey || `order:${item.id}:component:${index}`,
        editMode,
        date: component.date || item.dueDate || item.date,
        plannedDate: component.plannedDate,
        effectiveDate: component.effectiveDate,
        month: String(component.date || item.dueDate || item.date || "").slice(0, 7),
        group: isCheck
          ? (item.type === "cobro" ? "Cheques recibidos" : "Cheques emitidos")
          : (item.type === "cobro" ? "Ordenes de cobro" : "Ordenes de pago"),
        title: isCheck
          ? `${item.orderNumber ? `${item.orderNumber} - ` : ""}Cheque ${component.receipt || ""} - ${item.counterparty}`
          : `${item.orderNumber ? `${item.orderNumber} - ` : ""}${titleMethod}${item.concept || item.type} - ${item.counterparty}`,
        amount: item.type === "cobro" ? Math.abs(component.amount) : -Math.abs(component.amount),
        activity: item.activity,
        status: component.status || item.status,
        badge: orderBadge(item),
      };
    }));
  const standaloneCheckItems = state.checks
    .filter((item) => item.dueDate && Number(item.amount || 0) && !linkedCheckIds.has(item.id))
    .map((item) => {
      const orderNumber = item.orderNumber || state.orders.find((order) => order.id === item.orderId)?.orderNumber || "";
      const date = isFinalCheckStatus(item.status) ? (item.statusDate || item.dueDate) : item.dueDate;
      return {
        id: item.id,
        editMode: "check",
        orderId: item.orderId || "",
        flowOriginKey: `check:${item.id}`,
        date,
        plannedDate: item.dueDate,
        effectiveDate: item.statusDate || "",
        month: String(date || "").slice(0, 7),
        group: item.direction === "recibido" ? "Cheques recibidos" : "Cheques emitidos",
        title: `${orderNumber ? `${orderNumber} - ` : ""}Cheque ${item.number} - ${item.counterparty}`,
        amount: item.direction === "recibido" ? Math.abs(Number(item.amount || 0)) : -Math.abs(Number(item.amount || 0)),
        activity: item.activity,
        status: item.status,
        badge: badgeHtml("Cheque vinculado", "check"),
      };
    });
  return dedupeCashflowItems([...invoiceItems, ...orderItems, ...standaloneCheckItems].filter((item) => item.date && Number(item.amount || 0)))
    .map((item) => ({
      ...item,
      category: item.group,
      group: normalizeName(item.activity) || "Sin actividad",
    }));
}

function dedupeCashflowItems(items) {
  const byKey = new Map();
  items.forEach((item) => {
    const key = item.flowOriginKey || `${item.editMode}:${item.id}:${item.componentId || ""}:${item.date}:${item.amount}`;
    if (!byKey.has(key)) byKey.set(key, item);
  });
  return [...byKey.values()];
}

function isPreexistingDebt(invoice) {
  const currentYear = fiscalYearForDate(localToday());
  return invoice?.status !== "pagada" && invoice?.fiscalYear && invoice.fiscalYear < currentYear;
}

function renderChecks() {
  const checks = filterByDate(state.checks, "dueDate");
  const groups = [
    ["todos", "Todos", () => true],
    ["emitido", "Emitidos", (item) => item.direction === "emitido" && item.status === "pendiente"],
    ["recibido", "Recibidos", (item) => item.direction === "recibido" && item.status === "pendiente"],
    ["pendiente", "Pendientes", (item) => item.status === "pendiente"],
    ["depositado", "Depositados", (item) => item.status === "depositado"],
    ["endosado", "Endosados", (item) => item.status === "endosado"],
    ["cobrado", "Cobrados/Pagados", (item) => item.status === "cobrado" || item.status === "pagado"],
  ];
  $("#checkTabs").innerHTML = groups.map(([key, label, matches]) => {
    const count = checks.filter(matches).length;
    return `<button class="tab-button ${selectedCheckStatus === key ? "active" : ""}" data-check-status="${key}">${label}<span>${count}</span></button>`;
  }).join("");
  const selectedGroup = groups.find(([key]) => key === selectedCheckStatus) || groups[0];
  const numberNeedle = normalizeName(selectedCheckNumber).toLowerCase();
  const filtered = checks
    .filter(selectedGroup[2])
    .filter((item) => !numberNeedle || normalizeName(item.number).toLowerCase().includes(numberNeedle))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const rows = filtered.map((item) => {
      const orderNumber = item.orderNumber || state.orders.find((order) => order.id === item.orderId)?.orderNumber || "";
      return `
      <tr class="clickable-row" data-edit="check" data-id="${item.id}">
        <td>${formatDate(item.dueDate)}</td>
        <td>${esc(item.number)}</td>
        <td>${esc(orderNumber)}</td>
        <td>${esc(item.counterparty)}</td>
        <td>${esc(item.bank || "")}</td>
        <td>${esc(item.cuit || "")}</td>
        <td>${statusSelect("checks", item.id, item.status)}</td>
        <td class="num">${currency(item.direction === "recibido" ? item.amount : -Math.abs(Number(item.amount || 0)))}</td>
        <td>${esc(item.notes || "")}</td>
        <td><button class="danger-link" data-delete="checks" data-id="${item.id}">Borrar</button></td>
      </tr>
    `;
    });
  $("#checkTable").innerHTML = rows.join("") || `<tr><td colspan="10">${emptyHtml()}</td></tr>`;
  const issuedTotal = filtered
    .filter((item) => item.direction === "emitido")
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  const receivedTotal = filtered
    .filter((item) => item.direction === "recibido")
    .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0);
  const net = receivedTotal - issuedTotal;
  $("#checkTotals").innerHTML = filtered.length ? `<tr class="table-total-row"><td colspan="4">Total cheques filtrados (${filtered.length})</td><td colspan="3">Recibidos ${currency(receivedTotal)} · Emitidos ${currency(issuedTotal)}</td><td class="num ${net < 0 ? "negative-text" : "positive-text"}">${currency(net)}</td><td colspan="2"></td></tr>` : "";
}

function renderSettlements() {
  const buyerNeedle = normalizeName(selectedSettlementBuyer).toLowerCase();
  const products = [...new Set(state.settlements.map((item) => normalizeName(item.product)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const productFilter = $("#settlementProductFilter");
  productFilter.innerHTML = `<option value="">Todos</option>${products.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join("")}`;
  productFilter.value = selectedSettlementProduct;
  const filtered = state.settlements
    .filter((item) => !selectedSettlementFrom || item.date >= selectedSettlementFrom)
    .filter((item) => !selectedSettlementTo || item.date <= selectedSettlementTo)
    .filter((item) => matchesGlobalActivity({ activity: settlementActivity(item) }))
    .filter((item) => !buyerNeedle || normalizeName(item.buyer).toLowerCase().includes(buyerNeedle))
    .filter((item) => !selectedSettlementProduct || normalizeName(item.product) === selectedSettlementProduct)
    .slice().sort((a, b) => b.date.localeCompare(a.date));
  const totals = filtered.reduce((acc, item) => {
    const quantity = Number(item.quantity || 0);
    acc.quantity += quantity;
    acc.receivable += settlementCollectionAmount(item);
    acc.subtotal += Number(item.subtotal || 0);
    acc.gross += Number(item.priceGross || 0) * quantity;
    acc.net += Number(item.priceNet || 0) * quantity;
    return acc;
  }, { quantity: 0, receivable: 0, subtotal: 0, gross: 0, net: 0 });
  const avgGross = totals.quantity ? totals.gross / totals.quantity : 0;
  const avgNet = totals.quantity ? totals.net / totals.quantity : 0;
  const avgCommercialPct = avgGross ? Math.max(0, ((avgGross - avgNet) / avgGross) * 100) : 0;
  const rows = filtered.map((item) => `
    <tr class="clickable-row" data-edit="settlement" data-id="${item.id}"><td>${formatDate(item.date)}</td><td>${esc(item.operation)}</td><td>${esc(item.buyer)}</td><td>${esc(item.product)}</td><td class="num">${number(item.quantity)}</td><td class="num">${currency(item.subtotal)}</td><td class="num">${currency(settlementCollectionAmount(item))}</td><td class="num">${currency(item.priceGross)}</td><td class="num">${currency(item.priceNet)}</td><td>${esc(item.campaign)}</td><td>${esc(item.stockPlace)}</td><td class="num">${number(item.commercialCostPct)}%</td><td>${esc(item.status)}</td><td>${esc(item.notes || "")}</td><td><button class="danger-link" data-delete="settlements" data-id="${item.id}">Borrar</button></td></tr>
  `);
  const totalRow = filtered.length ? `
    <tr class="table-total-row"><td></td><td></td><td></td><td>Total cobro</td><td class="num">${number(totals.quantity)}</td><td class="num">${currency(totals.subtotal)}</td><td class="num">${currency(totals.receivable)}</td><td class="num">${currency(avgGross)}</td><td class="num">${currency(avgNet)}</td><td></td><td></td><td class="num">${number(avgCommercialPct)}%</td><td></td><td></td><td></td></tr>
    <tr class="table-total-row settlement-subtotal-row"><td></td><td></td><td></td><td>Subtotal neto sin IVA</td><td></td><td class="num">${currency(totals.subtotal)}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  ` : "";
  $("#settlementTable").innerHTML = rows.length ? `${rows.join("")}${totalRow}` : `<tr><td colspan="15">${emptyHtml()}</td></tr>`;
}

function renderStock() {
  const isGrain = selectedStockView === "grano";
  const viewName = isGrain ? "agricola" : "ganadero";
  $("#grainStockPanel").hidden = !isGrain;
  $("#cattleStockPanel").hidden = isGrain;
  $$("[data-stock-view]").forEach((button) => button.classList.toggle("active", button.dataset.stockView === selectedStockView));
  $("#stockViewLabel").textContent = isGrain ? "Stock agricola" : "Stock ganadero";
  $("#grainStockList").innerHTML = stockRows("grano");
  $("#cattleStockList").innerHTML = stockRows("hacienda");
  const stockTable = $(".stock-table");
  stockTable.classList.toggle("grain-stock-table", isGrain);
  stockTable.classList.toggle("cattle-stock-table", !isGrain);
  $("#stockTableHead").innerHTML = isGrain
    ? `<tr><th>Fecha</th><th>Movimiento</th><th>Producto</th><th>Campana</th><th>Acopio / contraparte</th><th class="num">Entrada kg</th><th class="num">Salida kg</th><th>Nota</th><th></th></tr>`
    : `<tr><th>Fecha</th><th>Movimiento</th><th>Categoria</th><th>Ano / campana</th><th>Establecimiento / contraparte</th><th class="num">Entrada cab.</th><th class="num">Salida cab.</th><th class="num">Kg/cab estimado</th><th class="num">Precio/kg</th><th class="num">Valor</th><th>Nota</th><th></th></tr>`;
  renderStockDetail();
  const movements = stockFilteredMovements();
  const dateLabel = selectedStockDate ? ` al ${formatDate(selectedStockDate)}` : "";
  $("#stockMovementTitle").textContent = selectedStockFilter ? `Movimientos: ${stockFilterLabel(selectedStockFilter)}${dateLabel}` : `Movimientos de stock ${viewName}${dateLabel}`;
  const columnCount = isGrain ? 9 : 12;
  const clearFilter = selectedStockFilter ? `<tr><td colspan="${columnCount}"><button class="secondary small" data-stock-clear>Ver todos los movimientos</button></td></tr>` : "";
  const rows = movements.slice().sort((a, b) => b.date.localeCompare(a.date)).map((item) => {
    const target = stockMovementEditTarget(item);
    const deleteCollection = target.mode === "settlement" ? "settlements" : "stockMovements";
    const deleteId = target.mode === "settlement" ? target.id : item.id;
    const quantity = Number(item.quantity || 0);
    const weightKg = Number(item.weightKg || 0);
    const pricePerKg = Number(item.pricePerKg || 0);
    const movementValue = item.kind === "hacienda" && pricePerKg ? cattleStockValue(quantity, weightKg, pricePerKg) : 0;
    const movement = target.mode === "settlement" ? `${item.reason}  -  liquidacion` : item.reason;
    const commonStart = `<tr class="clickable-row" data-edit="${target.mode}" data-id="${target.id}" title="${target.mode === "settlement" ? "Editar liquidacion" : "Editar movimiento de stock"}"><td>${formatDate(item.date)}</td><td>${esc(movement)}</td><td><strong>${esc(item.product)}</strong></td><td>${esc(item.campaign || "")}</td><td>${esc(item.counterparty || "")}</td><td class="num positive-text">${quantity > 0 ? number(quantity) : ""}</td><td class="num negative-text">${quantity < 0 ? number(Math.abs(quantity)) : ""}</td>`;
    return isGrain
      ? `${commonStart}<td>${esc(item.notes || "")}</td><td><button class="danger-link" data-delete="${deleteCollection}" data-id="${deleteId}">Borrar</button></td></tr>`
      : `${commonStart}<td class="num">${weightKg ? number(Math.abs(weightKg)) : ""}</td><td class="num">${pricePerKg ? currency(pricePerKg) : ""}</td><td class="num">${movementValue ? currency(movementValue) : ""}</td><td>${esc(item.notes || "")}</td><td><button class="danger-link" data-delete="${deleteCollection}" data-id="${deleteId}">Borrar</button></td></tr>`;
  });
  $("#stockTable").innerHTML = clearFilter + (rows.join("") || `<tr><td colspan="${columnCount}">${emptyHtml()}</td></tr>`);
}

function stockMovementEditTarget(item) {
  const settlement = item.sourceId && state.settlements.find((row) => row.id === item.sourceId);
  return settlement ? { mode: "settlement", id: settlement.id } : { mode: "stock", id: item.id };
}

function stockRowsLegacyFlat(kind) {
  const balances = {};
  state.stockMovements.filter((item) => item.kind === kind).forEach((item) => {
    const key = `${item.product}  -  ${item.campaign || "Sin campana"}  -  ${item.counterparty || "Sin acopio"}`;
    balances[key] = (balances[key] || 0) + Number(item.quantity || 0);
  });
  return Object.entries(balances).filter(([, qty]) => qty).map(([key, qty]) => `<div class="partner-line"><span>${esc(key)}</span><strong>${number(qty)}</strong></div>`).join("") || emptyHtml();
}

function renderAccounts() {
  $("#accountList").innerHTML = state.accounts.slice().sort((a, b) => a.code.localeCompare(b.code)).map((item) => `<div class="account-row"><div><strong>${esc(item.code)}</strong><span>${esc(item.name)}</span></div><span class="pill">${esc(item.activity)}</span></div>`).join("");
}

function renderEntityMaster() {
  const target = $("#entityMaster");
  if (!target) return;
  const sources = [
    ["Ordenes", state.orders.map((item) => item.counterparty)],
    ["Cheques", state.checks.map((item) => item.counterparty)],
    ["Liquidaciones", [...state.settlements.map((item) => item.buyer), ...state.settlements.map((item) => item.stockPlace)]],
    ["Facturas", state.invoices.map((item) => item.provider)],
    ["Stock", state.stockMovements.map((item) => item.counterparty)],
    ["Libro diario", state.ledger.map((item) => item.counterparty)],
  ];
  const byEntity = new Map((state.entities || []).map((entity) => [entityKey(entity.name), { name: entity.name, id: stableEntityId(entity.name), count: 0, sources: new Set() }]));
  sources.forEach(([source, values]) => {
    values.map(normalizeEntityName).filter(Boolean).forEach((name) => {
      const key = entityKey(name);
      const id = stableEntityId(name);
      byEntity.set(key, byEntity.get(key) || { name, id, count: 0, sources: new Set() });
      const row = byEntity.get(key);
      row.name = normalizeEntityName(row.name);
      row.id = stableEntityId(row.name);
      row.count += 1;
      row.sources.add(source);
    });
  });
  const rows = [...byEntity.values()].sort((a, b) => a.name.localeCompare(b.name));
  target.innerHTML = rows.length ? rows.map((item) => `
    <button class="entity-master-row clickable" type="button" data-edit="entity" data-id="${esc(item.id)}">
      <strong>${esc(item.name)}</strong>
      <code>${esc(item.id)}</code>
      <span>${item.count} registro${item.count === 1 ? "" : "s"}</span>
      <small>${esc([...item.sources].join(" / "))}</small>
    </button>
  `).join("") : emptyHtml();
}

function renderChangeLog() {
  const target = $("#changeLogList");
  if (!target) return;
  const rows = (state.changeLog || []).slice().reverse().slice(0, 30);
  target.innerHTML = rows.length ? rows.map((item) => `
    <div class="due-item">
      <div><strong>${esc(item.label)}</strong><span class="item-meta">${esc(formatDate(String(item.at || "").slice(0, 10)))} - ${esc(String(item.at || "").slice(11, 16))}</span></div>
      <small>${Number(item.records || 0)} registros</small>
    </div>
  `).join("") : emptyHtml("Todavia no hay cambios registrados.");
}

function syncBadge(status) {
  return `<span class="sync-badge ${String(status || "").toLowerCase()}">${esc(status || "")}</span>`;
}

function auditCountsFromRows(rows = []) {
  return rows.reduce((counts, row) => {
    const status = row?.status || "";
    if (status) counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function effectiveAuditCounts(audit = {}) {
  return {
    ...auditCountsFromRows(audit.rows || []),
    ...(audit.counts || {}),
  };
}

let latestSyncDebug = [];

function syncDebugLine(label, value = "") {
  latestSyncDebug = [...latestSyncDebug, {
    at: new Date().toISOString(),
    label,
    value: String(value || ""),
  }].slice(-40);
  renderSyncDebugPanel();
}

function truncateSyncDebug(value, max = 1200) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}... [truncado ${text.length} chars]` : text;
}

function renderSyncDebugPanel() {
  const target = $("#syncDebugList");
  if (!target) return;
  target.innerHTML = latestSyncDebug.length ? latestSyncDebug.map((item) => `
    <div class="due-item">
      <div><strong>${esc(item.label)}</strong><span class="item-meta">${esc(String(item.at || "").slice(11, 19))}</span></div>
      <small><code>${esc(item.value)}</code></small>
    </div>
  `).join("") : emptyHtml("Todavia no hay diagnostico de llamada.");
}

function renderSyncPanel() {
  const summary = $("#syncSummary");
  const collectionSummary = $("#syncCollectionSummary");
  const table = $("#syncAuditTable");
  const queueTable = $("#syncQueueTable");
  const cleanupSummary = $("#syncQueueCleanupSummary");
  const cleanupTable = $("#syncQueueCleanupTable");
  const entityRegistrySummary = $("#syncEntityRegistrySummary");
  const entityRegistryTable = $("#syncEntityRegistryTable");
  const checkConflictSummary = $("#syncCheckConflictSummary");
  const checkConflictTable = $("#syncCheckConflictTable");
  const onlyAppTable = $("#syncOnlyAppTable");
  const log = $("#syncLogList");
  if (!summary || !table || !log) return;
  const localStatusCounts = analyzeSyncState(state, null).localStatusCounts;
  const audit = latestSyncAudit || {
    rows: [],
    counts: {},
    localStatusCounts,
    sheetAvailable: false,
  };
  const auditCounts = effectiveAuditCounts(audit);
  const auditLocalStatusCounts = audit.localStatusCounts || localStatusCounts;
  const items = [
    ["Sincronizados", auditLocalStatusCounts.synced],
    ["Pendientes de enviar", auditLocalStatusCounts.pending],
    ["En cola", syncQueue().length],
    ["Audit Solo App", auditCounts.ONLY_APP],
    ["Audit Solo Sheet", auditCounts.ONLY_SHEET],
    ["Audit Conflictos", (auditCounts.MATERIAL_CONFLICT || 0) + (auditCounts.CONFLICT || 0)],
    ["Audit Registry parcial", auditCounts.REGISTRY_PARTIAL],
    ["Audit duplicados", (auditCounts.POSSIBLE_DUPLICATE || 0) + (auditCounts.SAME_ECONOMIC_EVENT_DIFFERENT_ID || 0)],
    ["Errores locales", auditLocalStatusCounts.error],
  ];
  summary.innerHTML = items.map(([label, value]) => `
    <div class="sync-summary-card"><span>${esc(label)}</span><strong>${Number(value || 0)}</strong></div>
  `).join("");
  if (collectionSummary) {
    const collectionCounts = audit.collectionCounts || {};
    const collectionItems = Object.keys(collectionCounts).sort().flatMap((collection) => {
      return Object.keys(collectionCounts[collection] || {}).sort().map((status) => [
        `${collection} · ${status}`,
        collectionCounts[collection][status],
      ]);
    });
    collectionSummary.innerHTML = collectionItems.length ? collectionItems.map(([label, value]) => `
      <div class="sync-summary-card"><span>${esc(label)}</span><strong>${Number(value || 0)}</strong></div>
    `).join("") : "";
  }
  const rows = audit.rows.slice(0, 150);
  table.innerHTML = rows.length ? rows.map((row, index) => {
    const collection = row.collection || syncCollectionForRecordType(row.recordType);
    const appLabel = row.app ? recordDisplayName(collection, row.app) : (row.recordId || "");
    const sheetLabel = row.sheet ? recordDisplayName(collection, row.sheet) : "";
    const diffs = auditRowDiffs(row);
    const diffText = diffs.length
      ? diffs.slice(0, 4).map((diff) => `${diff.field}: APP ${diff.app} / SHEET ${diff.sheet}`).join(" | ")
      : "";
    return `
      <tr>
        <td><input type="checkbox" data-sync-row="${index}" ${["ONLY_APP", "ONLY_SHEET", "CONFLICT", "MATERIAL_CONFLICT"].includes(row.status) ? "" : "disabled"}></td>
        <td>${syncBadge(row.status)}</td>
        <td>${esc(collection || row.recordType || "")}</td>
        <td><code>${esc(row.key || "")}</code></td>
        <td>${esc(appLabel)}</td>
        <td>${esc(sheetLabel)}</td>
        <td>${esc(diffText)}</td>
      </tr>
    `;
  }).join("") : `<tr><td colspan="7">${emptyHtml(audit.sheetAvailable ? "Sin diferencias detectadas." : "Todavia no se analizo Google Sheets. Apreta Analizar diferencias para comparar contra la planilla.")}</td></tr>`;
  if (checkConflictSummary) {
    const fieldCounts = audit.checkConflictFieldCounts || {};
    const entries = Object.keys(fieldCounts).sort().map((field) => [field, fieldCounts[field]]);
    checkConflictSummary.innerHTML = entries.length ? entries.map(([field, value]) => `
      <div class="sync-summary-card"><span>${esc(field)}</span><strong>${Number(value || 0)}</strong></div>
    `).join("") : "";
  }
  if (checkConflictTable) {
    const details = audit.checkConflictDetails || [];
    checkConflictTable.innerHTML = details.length ? details.map((row) => `
      <tr>
        <td><code>${esc(row.recordId || "")}</code></td>
        <td>${esc(row.appBank || "")}</td>
        <td>${esc(row.sheetBank || "")}</td>
        <td>${esc(row.appNumber || "")}</td>
        <td>${esc(row.sheetNumber || "")}</td>
        <td>${currency(row.appAmount || 0)}</td>
        <td>${currency(row.sheetAmount || 0)}</td>
        <td>${esc(row.appIssueDate || "")}</td>
        <td>${esc(row.sheetIssueDate || "")}</td>
        <td>${esc(row.appDueDate || "")}</td>
        <td>${esc(row.sheetDueDate || "")}</td>
        <td>${syncBadge(row.appStatus || "")}</td>
        <td>${syncBadge(row.sheetStatus || "")}</td>
        <td>${esc(row.appEntity || "")}</td>
        <td>${esc(row.sheetEntity || "")}</td>
        <td><code>${esc(row.appOrderId || "")}</code></td>
        <td><code>${esc(row.sheetOrderId || "")}</code></td>
        <td>${esc(row.appUpdatedAt || "")}</td>
        <td>${esc(row.sheetUpdatedAt || "")}</td>
        <td>${esc((row.materialFields || []).join(", "))}</td>
      </tr>
    `).join("") : `<tr><td colspan="20">${emptyHtml("No hay detalle de conflictos de cheques.")}</td></tr>`;
  }
  if (onlyAppTable) {
    const details = audit.onlyAppDetails || [];
    onlyAppTable.innerHTML = details.length ? details.map((row) => `
      <tr>
        <td>${esc(row.recordType || "")}</td>
        <td><code>${esc(row.recordId || "")}</code></td>
        <td>${esc(row.date || "")}</td>
        <td>${esc(row.entity || "")}</td>
        <td>${esc(row.concept || "")}</td>
        <td>${currency(row.amount || 0)}</td>
        <td>${esc(row.type || "")}</td>
        <td>${syncBadge(row.status || "")}</td>
      </tr>
    `).join("") : `<tr><td colspan="8">${emptyHtml("No hay detalle ONLY_APP en la cola.")}</td></tr>`;
  }
  if (queueTable) {
    const queued = syncQueue();
    queueTable.innerHTML = queued.length ? queued.map((item) => {
      const record = findLocalSyncRecord(item.recordType, item.recordId) || {};
      return `
        <tr>
          <td>${esc(item.recordType || "")}</td>
          <td><code>${esc(item.recordId || "")}</code></td>
          <td>${syncBadge(record.syncStatus || "")}</td>
          <td>${Number(record.syncVersion || 0)}</td>
          <td>${esc(record.updatedAt || "")}</td>
          <td>${esc(item.enqueuedAt || "")}</td>
          <td>${Number(item.attempts || 0)}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="7">${emptyHtml("No hay registros en cola.")}</td></tr>`;
  }
  if (cleanupSummary) {
    const dryRun = latestQueueCleanupDryRun;
    const summaryItems = dryRun ? [
      ["Se marcarian synced", dryRun.cleanable.length],
      ["Quedarian en cola", dryRun.remaining.length],
      ["MATCH", dryRun.counts.MATCH],
      ["COSMETIC no economico", dryRun.counts.COSMETIC_SAFE],
      ["ONLY_APP", dryRun.counts.ONLY_APP],
      ["REGISTRY_PARTIAL", dryRun.counts.REGISTRY_PARTIAL],
      ["MATERIAL_CONFLICT", dryRun.counts.MATERIAL_CONFLICT],
      ["Sin auditoria", dryRun.counts.NO_AUDIT],
    ] : [];
    cleanupSummary.innerHTML = summaryItems.length ? summaryItems.map(([label, value]) => `
      <div class="sync-summary-card"><span>${esc(label)}</span><strong>${Number(value || 0)}</strong></div>
    `).join("") : "";
  }
  if (cleanupTable) {
    const rowsForCleanup = latestQueueCleanupDryRun?.rows || [];
    cleanupTable.innerHTML = rowsForCleanup.length ? rowsForCleanup.map((row) => `
      <tr>
        <td>${esc(row.actionLabel)}</td>
        <td>${syncBadge(row.status)}</td>
        <td>${esc(row.recordType)}</td>
        <td><code>${esc(row.recordId)}</code></td>
        <td>${esc(row.reason)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5">${emptyHtml("Primero apreta Analizar cola y despues Dry-run limpiar cola.")}</td></tr>`;
  }
  if (entityRegistrySummary) {
    const dryRun = latestEntityRegistryDryRun;
    const summaryItems = dryRun ? [
      ["Entidades locales", dryRun.localCount],
      ["Filas registry", dryRun.registryCount],
      ["Mismos 52 IDs", dryRun.sameRecordIds ? 1 : 0],
      ["IDs duplicados", (dryRun.duplicateLocalIds || []).length + (dryRun.duplicateRegistryIds || []).length],
      ["Conflictos stableKey", (dryRun.stableKeyConflicts || []).length],
      ["Pendientes reales", (dryRun.recentPendingEntities || []).length],
      ["Payload suficiente", dryRun.payloadSufficient],
      ["Payload insuficiente", dryRun.payloadInsufficient],
    ] : [];
    entityRegistrySummary.innerHTML = summaryItems.length ? summaryItems.map(([label, value]) => `
      <div class="sync-summary-card"><span>${esc(label)}</span><strong>${Number(value || 0)}</strong></div>
    `).join("") : "";
  }
  if (entityRegistryTable) {
    const rowsForEntities = latestEntityRegistryDryRun?.rows || [];
    entityRegistryTable.innerHTML = rowsForEntities.length ? rowsForEntities.map((row) => `
      <tr>
        <td>${syncBadge(row.status || "")}</td>
        <td><code>${esc(row.recordId || "")}</code></td>
        <td>${esc(row.name || "")}</td>
        <td>${esc(row.cuit || "")}</td>
        <td><code>${esc(row.localStableKey || "")}</code></td>
        <td><code>${esc(row.registryStableKey || "")}</code></td>
        <td>${esc(row.reason || "")}</td>
      </tr>
    `).join("") : `<tr><td colspan="7">${emptyHtml("Primero apreta Dry-run entidades. No escribe en Sheets.")}</td></tr>`;
  }
  const logs = (state.syncLog || []).slice().reverse().slice(0, 30);
  log.innerHTML = logs.length ? logs.map((item) => `
    <div class="due-item">
      <div><strong>${esc(item.action)}</strong><span class="item-meta">${esc(String(item.at || "").slice(0, 16).replace("T", " "))} - ${esc(item.origin)} -> ${esc(item.destination)}</span></div>
      <small>${esc(item.result || "")}${item.error ? ` · ${esc(item.error)}` : ""}</small>
    </div>
  `).join("") : emptyHtml("Todavia no hay eventos de sincronizacion.");
  renderSyncDebugPanel();
}

function queuedSyncRecordsForAudit() {
  return syncQueue().map((item) => {
    const record = findLocalSyncRecord(item.recordType, item.recordId);
    return record ? {
      recordType: item.recordType,
      recordId: item.recordId,
      record,
    } : null;
  }).filter(Boolean);
}

function auditRowRecordType(row = {}) {
  return row.recordType || syncRecordTypeForCollection(row.collection || "");
}

function auditRowRecordId(row = {}) {
  return row.recordId || row.app?.id || row.sheet?.id || "";
}

function auditRowQueueKey(row = {}) {
  return `${auditRowRecordType(row)}:${auditRowRecordId(row)}`;
}

function isExplicitNonEconomicDifference(diff = {}) {
  const markers = [
    diff.nonEconomic,
    diff.material === false,
    diff.economic === false,
    diff.isEconomic === false,
    String(diff.category || "").toLowerCase() === "non-economic",
    String(diff.classification || "").toLowerCase() === "non-economic",
    String(diff.kind || "").toLowerCase() === "noneconomic",
    String(diff.impact || "").toLowerCase() === "non-economic",
  ];
  return markers.some(Boolean);
}

function auditRowDiffs(row = {}) {
  return row.cosmeticDiffs || row.diffs || row.differences || [];
}

function safeCosmeticSyncRecordKey(row = {}) {
  return `${auditRowRecordType(row)}:${auditRowRecordId(row)}`;
}

function cosmeticDifferenceIsSafe(row = {}) {
  const diffs = auditRowDiffs(row);
  if (row.status !== "COSMETIC_DIFFERENCE" || !diffs.length) return false;
  if (SAFE_COSMETIC_SYNC_RECORDS.has(safeCosmeticSyncRecordKey(row))) return true;
  return diffs.every(isExplicitNonEconomicDifference);
}

function queueCleanupDryRun() {
  const auditRows = latestSyncAudit?.rows || [];
  const queue = syncQueue();
  const byRecord = new Map(auditRows.map((row) => [auditRowQueueKey(row), row]));
  const counts = {
    MATCH: 0,
    COSMETIC_SAFE: 0,
    ONLY_APP: 0,
    REGISTRY_PARTIAL: 0,
    MATERIAL_CONFLICT: 0,
    COSMETIC_UNSAFE: 0,
    OLD_VERSION_REPLACED: 0,
    OTHER: 0,
    NO_AUDIT: 0,
  };
  const rows = queue.map((item) => {
    const row = byRecord.get(`${item.recordType}:${item.recordId}`);
    const status = row?.status || "NO_AUDIT";
    let action = "keep";
    let reason = "queda en cola";
    if (status === "MATCH") {
      action = "clean";
      reason = "auditoria MATCH: se podria sacar de cola y marcar synced localmente";
      counts.MATCH += 1;
    } else if (cosmeticDifferenceIsSafe(row)) {
      action = "clean";
      reason = "diferencia cosmetica marcada explicitamente como no economica";
      counts.COSMETIC_SAFE += 1;
    } else if (status === "COSMETIC_DIFFERENCE") {
      reason = "diferencia cosmetica sin marca explicita de no economica";
      counts.COSMETIC_UNSAFE += 1;
    } else if (counts[status] !== undefined) {
      reason = status === "NO_AUDIT" ? "no hay auditoria de cola para este registro" : `no se toca por regla: ${status}`;
      counts[status] += 1;
    } else {
      reason = `estado no habilitado para limpieza: ${status}`;
      counts.OTHER += 1;
    }
    return {
      action,
      actionLabel: action === "clean" ? "Limpiar local" : "Mantener en cola",
      status,
      recordType: item.recordType,
      recordId: item.recordId,
      reason,
    };
  });
  return {
    createdAt: nowIso(),
    rows,
    cleanable: rows.filter((row) => row.action === "clean"),
    remaining: rows.filter((row) => row.action !== "clean"),
    counts,
  };
}

function queueCleanupDiagnostic(dryRun = null) {
  const auditRows = latestSyncAudit?.rows || [];
  const queueRows = syncQueue();
  const counts = dryRun?.counts || {};
  return {
    auditRows: auditRows.length,
    queueRows: queueRows.length,
    eligibleMATCH: counts.MATCH || 0,
    eligibleCOSMETIC: counts.COSMETIC_SAFE || 0,
    keepREGISTRY_PARTIAL: counts.REGISTRY_PARTIAL || 0,
    keepONLY_APP: counts.ONLY_APP || 0,
    unclassified: (counts.OTHER || 0) + (counts.NO_AUDIT || 0) + (counts.COSMETIC_UNSAFE || 0),
    resultRendered: Boolean(dryRun?.rows?.length),
  };
}

function dryRunQueueCleanup() {
  syncDebugLine("dry-run-click", "entro a dryRunQueueCleanup()");
  if (!syncQueue().length) {
    latestQueueCleanupDryRun = queueCleanupDryRun();
    syncDebugLine("dry-run-result", JSON.stringify(queueCleanupDiagnostic(latestQueueCleanupDryRun)));
    setSyncStatus("Cola vacia");
    renderSyncPanel();
    return;
  }
  if (!latestSyncAudit?.rows?.length) {
    latestQueueCleanupDryRun = queueCleanupDryRun();
    syncDebugLine("dry-run-result", JSON.stringify(queueCleanupDiagnostic(latestQueueCleanupDryRun)));
    setSyncStatus("Falta Analizar cola", "error");
    renderSyncPanel();
    alert("Primero apreta Analizar cola. El dry-run no consulta Sheets ni modifica nada: usa esa auditoria para decidir que quedaria en cola.");
    return;
  }
  latestQueueCleanupDryRun = queueCleanupDryRun();
  const diag = queueCleanupDiagnostic(latestQueueCleanupDryRun);
  syncDebugLine("dry-run-result", JSON.stringify(diag));
  syncDebugLine("dry-run-counts", `auditRows=${diag.auditRows}; queueRows=${diag.queueRows}; eligibleMATCH=${diag.eligibleMATCH}; eligibleCOSMETIC=${diag.eligibleCOSMETIC}; keepREGISTRY_PARTIAL=${diag.keepREGISTRY_PARTIAL}; keepONLY_APP=${diag.keepONLY_APP}; unclassified=${diag.unclassified}; resultRendered=${diag.resultRendered}`);
  setSyncStatus("Dry-run listo");
  renderSyncPanel();
}

function markQueueRecordSyncedLocally(item) {
  updateLocalSyncRecord(item.recordType, item.recordId, (record) => ({
    ...record,
    syncStatus: "synced",
    lastSyncAt: record.lastSyncAt || nowIso(),
    lastSyncError: "",
  }));
}

function applySafeQueueReconciliation() {
  syncDebugLine("safe-reconcile-click", "entro a applySafeQueueReconciliation()");
  syncDebugLine("dryRunPresent", String(Boolean(latestQueueCleanupDryRun)));
  syncDebugLine("dryRunRows", String(latestQueueCleanupDryRun?.rows?.length || 0));
  if (!latestQueueCleanupDryRun?.rows?.length) {
    alert("Primero ejecuta Analizar cola y despues Dry-run limpiar cola.");
    return;
  }
  const cleanableKeys = new Set(latestQueueCleanupDryRun.cleanable.map((row) => `${row.recordType}:${row.recordId}`));
  const queue = syncQueue();
  const cleanableQueueItems = queue.filter((item) => cleanableKeys.has(`${item.recordType}:${item.recordId}`));
  const remainingQueueItems = queue.filter((item) => !cleanableKeys.has(`${item.recordType}:${item.recordId}`));
  syncDebugLine("queueBefore", String(queue.length));
  syncDebugLine("cleanable", String(cleanableQueueItems.length));
  syncDebugLine("remaining", String(remainingQueueItems.length));
  const message = `Se reconciliaran ${cleanableQueueItems.length} registros localmente. Permaneceran ${remainingQueueItems.length} en cola. No se escribira en Google Sheets.`;
  const expectedCleanable = latestQueueCleanupDryRun.cleanable.length;
  const expectedRemaining = latestQueueCleanupDryRun.remaining.length;
  const valid = cleanableQueueItems.length === expectedCleanable && remainingQueueItems.length === expectedRemaining;
  syncDebugLine("validation-result", valid ? "ok" : `fallo esperado=${expectedCleanable}/${expectedRemaining}`);
  if (!valid) {
    alert(`${message}\n\nEl control del dry-run no coincide. Se detiene para revisar antes de tocar la cola.`);
    return;
  }
  syncDebugLine("confirm-requested", message);
  if (!confirm(message)) return;
  cleanableQueueItems.forEach(markQueueRecordSyncedLocally);
  setSyncQueue(remainingQueueItems);
  const queueAfterSet = syncQueue();
  syncDebugLine("queueAfterSet", String(queueAfterSet.length));
  if (queueAfterSet.length !== remainingQueueItems.length) {
    alert("La cola no quedo con la cantidad esperada. Se detiene para revisar antes de continuar.");
    return;
  }
  addSyncLog("safe-queue-reconcile", {
    origin: "app",
    destination: "local",
    result: "ok",
    record: `${cleanableQueueItems.length} reconciliados; ${remainingQueueItems.length} en cola`,
  });
  persistLocalState();
  latestQueueCleanupDryRun = null;
  setSyncStatus("Reconciliacion segura aplicada");
  render();
  analyzeSyncQueue();
}

function analyzeSyncQueue() {
  latestSyncDebug = [];
  latestQueueCleanupDryRun = null;
  syncDebugLine("click", "entro a analyzeSyncQueue()");
  if (syncQueueAuditInFlight) {
    syncDebugLine("ignored", "ya hay una auditoria de cola en curso; no se dispara otra request");
    setSyncStatus("Analizando cola...", "saving");
    renderSyncPanel();
    return;
  }
  const url = remoteSyncUrl();
  const records = queuedSyncRecordsForAudit();
  syncDebugLine("url", url || "(sin URL)");
  syncDebugLine("queue-records", `${records.length}`);
  if (!url) {
    latestSyncAudit = {
      rows: [],
      counts: {},
      localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
      sheetAvailable: false,
    };
    renderSyncPanel();
    return;
  }
  if (!records.length) {
    latestSyncAudit = {
      rows: [],
      counts: {},
      collectionCounts: {},
      localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
      sheetAvailable: true,
    };
    setSyncStatus("Cola vacia");
    renderSyncPanel();
    return;
  }
  setSyncStatus("Analizando cola...", "saving");
  syncQueueAuditInFlight = true;
  postRemoteAction("auditQueueDifferences", { records }, url, { timeoutMs: 60000, debug: syncDebugLine })
    .then((payload) => {
      syncDebugLine("json-ok", `ok=${payload?.ok}; keys=${Object.keys(payload || {}).join(",")}`);
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo auditar la cola");
      const result = payload.result || payload;
      syncDebugLine("result", `rows=${(result.rows || []).length}; counts=${JSON.stringify(result.counts || {})}; collections=${JSON.stringify(result.collectionCounts || {})}`);
      latestSyncAudit = {
        rows: result.rows || [],
        counts: result.counts || {},
        collectionCounts: result.collectionCounts || {},
        checkConflictDetails: result.checkConflictDetails || [],
        checkConflictFieldCounts: result.checkConflictFieldCounts || {},
        onlyAppDetails: result.onlyAppDetails || [],
        localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
        sheetAvailable: true,
      };
      setSyncStatus("Cola analizada");
      renderSyncPanel();
    })
    .catch((error) => {
      syncDebugLine("catch", `name=${error?.name || ""}; message=${error?.message || String(error)}; timeout=${error?.name === "AbortError"}; network/cors=${error instanceof TypeError}`);
      latestSyncAudit = {
        rows: [],
        counts: {},
        collectionCounts: {},
        localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
        sheetAvailable: false,
      };
      setSyncStatus("No se pudo analizar cola", "error");
      renderSyncPanel();
    })
    .finally(() => {
      syncQueueAuditInFlight = false;
    });
}

function localEntitiesForRegistryDryRun() {
  const queuedEntityIds = new Set(syncQueue()
    .filter((item) => item.recordType === "entity")
    .map((item) => String(item.recordId || "")));
  return (state.entities || []).map((entity) => ({
    id: entity.id || "",
    name: entity.name || "",
    cuit: entity.cuit || entity.taxId || "",
    stableKey: entityStableKeyForSync(entity),
    syncStatus: entity.syncStatus || "",
    syncVersion: Number(entity.syncVersion || 0),
    updatedAt: entity.updatedAt || "",
    inQueue: queuedEntityIds.has(String(entity.id || "")),
  }));
}

function dryRunEntityRegistryRepair() {
  syncDebugLine("entity-registry-dry-run-click", "entro a dryRunEntityRegistryRepair()");
  const url = remoteSyncUrl();
  const entities = localEntitiesForRegistryDryRun();
  syncDebugLine("entity-registry-dry-run-local", `entities=${entities.length}`);
  latestEntityRegistryDryRun = null;
  if (!url) {
    setSyncStatus("Falta URL de Google Sheets", "error");
    renderSyncPanel();
    return;
  }
  setSyncStatus("Dry-run entidades...", "saving");
  postRemoteAction("dryRunCompleteEntityRegistry", {
    entities,
    expectedCount: 52,
  }, url, { timeoutMs: 60000, debug: syncDebugLine })
    .then((payload) => {
      syncDebugLine("entity-registry-dry-run-ok", `ok=${payload?.ok}; keys=${Object.keys(payload || {}).join(",")}`);
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo ejecutar dry-run de entidades");
      const result = payload.result || payload;
      latestEntityRegistryDryRun = result;
      syncDebugLine("entity-registry-dry-run-result", `rows=${(result.rows || []).length}; payloadInsufficient=${result.payloadInsufficient}; stableKeyConflicts=${(result.stableKeyConflicts || []).length}`);
      setSyncStatus("Dry-run entidades listo");
      renderSyncPanel();
    })
    .catch((error) => {
      syncDebugLine("entity-registry-dry-run-catch", `name=${error?.name || ""}; message=${error?.message || String(error)}; timeout=${error?.name === "AbortError"}; network/cors=${error instanceof TypeError}`);
      latestEntityRegistryDryRun = {
        rows: [],
        localCount: entities.length,
        registryCount: 0,
        sameRecordIds: false,
        duplicateLocalIds: [],
        duplicateRegistryIds: [],
        stableKeyConflicts: [],
        recentPendingEntities: [],
        payloadSufficient: 0,
        payloadInsufficient: 0,
        error: error.message || String(error),
      };
      setSyncStatus("No se pudo hacer dry-run entidades", "error");
      renderSyncPanel();
    });
}

function entityRegistryDryRunIsReady(dryRun = latestEntityRegistryDryRun) {
  return Boolean(
    dryRun
    && dryRun.canComplete === true
    && Number(dryRun.localCount || 0) === 52
    && Number(dryRun.registryCount || 0) === 52
    && dryRun.sameRecordIds === true
    && !(dryRun.missingInApp || []).length
    && !(dryRun.missingInRegistry || []).length
    && !(dryRun.duplicateLocalIds || []).length
    && !(dryRun.duplicateRegistryIds || []).length
    && !(dryRun.stableKeyConflicts || []).length
    && !(dryRun.recentPendingEntities || []).length
    && !(dryRun.materialConflicts || []).length
    && (dryRun.rows || []).length === 52
  );
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function completeEntityRegistryRepair() {
  if (!entityRegistryDryRunIsReady()) {
    alert("Primero ejecuta Dry-run entidades y verifica que cierre: 52 locales, 52 registry, sin faltantes ni conflictos.");
    return;
  }
  const confirmation = "Se completaran 52 filas existentes de _SYNC_REGISTRY. 0 filas nuevas. 0 movimientos economicos modificados.";
  if (!confirm(confirmation)) return;
  const url = remoteSyncUrl();
  if (!url) {
    setSyncStatus("Falta URL de Google Sheets", "error");
    renderSyncPanel();
    return;
  }
  const expectedRecordIds = (latestEntityRegistryDryRun.rows || []).map((row) => row.recordId).sort();
  const expectedPayloads = (latestEntityRegistryDryRun.rows || []).map((row) => ({
    recordId: row.recordId,
    previousPayloadJson: row.previousPayloadJson || "",
  }));
  setSyncStatus("Completando registry entidades...", "saving");
  postRemoteAction("completeEntityRegistry", {
    confirm: true,
    entities: localEntitiesForRegistryDryRun(),
    expectedCount: 52,
    expectedRecordIds,
    expectedPayloads,
    dryRunCreatedAt: latestEntityRegistryDryRun.createdAt || "",
  }, url, { timeoutMs: 60000, debug: syncDebugLine })
    .then((payload) => {
      syncDebugLine("entity-registry-complete-ok", `ok=${payload?.ok}; result=${payload?.result || ""}; updated=${payload?.updated || 0}`);
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo completar registry de entidades");
      const backup = {
        exportedAt: nowIso(),
        action: "completeEntityRegistry",
        result: payload.result,
        backupRows: payload.backupRows || [],
      };
      downloadJsonFile(`sagro_entity_registry_payload_backup_${today.replace(/-/g, "")}.json`, backup);
      setSyncStatus("Registry entidades completado");
      analyzeSyncQueue();
    })
    .catch((error) => {
      syncDebugLine("entity-registry-complete-catch", `name=${error?.name || ""}; message=${error?.message || String(error)}; timeout=${error?.name === "AbortError"}; network/cors=${error instanceof TypeError}`);
      setSyncStatus("No se pudo completar registry entidades", "error");
      renderSyncPanel();
    });
}

function analyzeSyncDiffs() {
  latestSyncDebug = [];
  syncDebugLine("click", "entro a analyzeSyncDiffs()");
  const url = remoteSyncUrl();
  syncDebugLine("url", url || "(sin URL)");
  if (!url) {
    latestSyncAudit = analyzeSyncState(state, null);
    addSyncLog("analyze-differences", { origin: "app", destination: "local", result: "no-remote-url" });
    persistLocalState();
    renderSyncPanel();
    return;
  }
  setSyncStatus("Analizando diferencias...", "saving");
  postRemoteAction("auditDifferences", { state }, url, { timeoutMs: 60000, debug: syncDebugLine })
    .then((payload) => {
      syncDebugLine("json-ok", `ok=${payload?.ok}; keys=${Object.keys(payload || {}).join(",")}`);
      if (!payload?.ok) throw new Error(payload?.error || "No se pudo auditar Sheets");
      const result = payload.result || payload;
      syncDebugLine("result", `rows=${(result.rows || []).length}; counts=${JSON.stringify(result.counts || {})}`);
      latestSyncAudit = {
        rows: result.rows || [],
        counts: result.counts || {},
        localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
        sheetAvailable: true,
      };
      addSyncLog("analyze-differences", { origin: "app", destination: "google-sheets", result: "ok" });
      persistLocalState();
      setSyncStatus("Diferencias analizadas");
      renderSyncPanel();
    })
    .catch((error) => {
      syncDebugLine("catch", `name=${error?.name || ""}; message=${error?.message || String(error)}; timeout=${error?.name === "AbortError"}; network/cors=${error instanceof TypeError}`);
      latestSyncAudit = {
        rows: [],
        counts: {},
        localStatusCounts: analyzeSyncState(state, null).localStatusCounts,
        sheetAvailable: false,
      };
      addSyncLog("analyze-differences", { origin: "app", destination: "google-sheets", result: "error", error: error.message });
      persistLocalState();
      setSyncStatus("No se pudo analizar Sheets", "error");
      renderSyncPanel();
    });
}

function selectedSyncRows() {
  const rows = latestSyncAudit?.rows || [];
  return $$("[data-sync-row]:checked").map((input) => rows[Number(input.dataset.syncRow)]).filter(Boolean);
}

function syncRecordSummary(recordType, record = {}) {
  const collection = syncCollectionForRecordType(recordType);
  return {
    recordType,
    recordId: record.id || "",
    entity: record.counterparty || record.provider || record.buyer || record.name || "",
    concept: record.concept || record.notes || record.number || record.receipt || record.orderNumber || "",
    amount: Number(record.amountArs || record.amount || record.balanceArs || record.receivableTotal || record.receivableTotalOverride || 0),
    status: record.status || record.syncStatus || "",
    collection,
  };
}

function pendingLocalRecordsNotInQueue() {
  const queuedKeys = new Set(syncQueue().map((item) => `${item.recordType}:${item.recordId}`));
  return syncCollections.flatMap((collection) => {
    const recordType = syncRecordTypeForCollection(collection);
    return (state[collection] || [])
      .filter((record) => record?.id)
      .filter((record) => !(collection === "ledger" && record.generated))
      .filter((record) => ["pending", "error", "conflict"].includes(record.syncStatus || ""))
      .filter((record) => !queuedKeys.has(`${recordType}:${record.id}`))
      .map((record) => syncRecordSummary(recordType, record));
  });
}

function pendingLocalRecordListText(rows) {
  return rows.map((row) => [
    row.recordType,
    row.recordId,
    row.entity || "Sin entidad",
    row.concept || "Sin concepto",
    currency(row.amount || 0),
    row.status || "Sin estado",
  ].join(" | ")).join("\n");
}

function requeuePendingLocalRecords() {
  syncDebugLine("requeue-pending-click", "entro a requeuePendingLocalRecords()");
  const rows = pendingLocalRecordsNotInQueue();
  syncDebugLine("requeue-pending-count", String(rows.length));
  syncDebugLine("requeue-pending-list", pendingLocalRecordListText(rows) || "(sin pendientes fuera de cola)");
  if (!rows.length) {
    alert("No hay registros pendientes locales fuera de la cola.");
    renderSyncPanel();
    return;
  }
  if (rows.length !== 1) {
    alert(`Se encontraron ${rows.length} registros pendientes fuera de cola. No se reencola nada.\n\n${pendingLocalRecordListText(rows)}`);
    renderSyncPanel();
    return;
  }
  const row = rows[0];
  const message = `Se reencolara 1 registro local, sin escribir en Google Sheets:\n\n${pendingLocalRecordListText(rows)}`;
  syncDebugLine("requeue-pending-confirm-requested", message);
  if (!confirm(message)) {
    renderSyncPanel();
    return;
  }
  enqueueSyncRecord(row.recordType, row.recordId);
  syncDebugLine("requeue-pending-queued", `${row.recordType}:${row.recordId}; queue=${syncQueue().length}`);
  setSyncStatus("Pendiente local reencolado");
  renderSyncPanel();
}

function sendSelectedSyncRecords() {
  syncDebugLine("send-selected-click", "entro a sendSelectedSyncRecords()");
  const selected = selectedSyncRows();
  syncDebugLine("selectedRows", String(selected.length));
  syncDebugLine("queueBeforeSend", String(syncQueue().length));
  if (!selected.length) {
    alert("Selecciona al menos un registro para enviar. No se envio nada.");
    renderSyncPanel();
    return;
  }
  selected.forEach((row) => {
    const recordType = row.recordType || syncRecordTypeForCollection(row.collection);
    const recordId = row.recordId || row.app?.id;
    if (recordType && recordId && row.status === "ONLY_APP") enqueueSyncRecord(recordType, recordId);
  });
  syncDebugLine("queueAfterSelectEnqueue", String(syncQueue().length));
  processSyncQueue({ reason: "manual" }).catch((error) => {
    alert(`No se pudo enviar a Sheets.\n\n${error.message}`);
  });
}

function importSelectedSyncRecords() {
  const selected = selectedSyncRows().filter((row) => row.status === "ONLY_SHEET");
  if (!selected.length) {
    pullRemoteChanges({ silent: false }).then(() => {
      setSyncStatus("Cambios remotos revisados");
      render();
    }).catch((error) => alert(`No se pudo leer Sheets.\n\n${error.message}`));
    return;
  }
  if (!confirm(`Importar ${selected.length} registro(s) desde Sheets a este dispositivo? No se importaran conflictos.`)) return;
  selected.forEach((row) => {
    const recordType = row.recordType || syncRecordTypeForCollection(row.collection);
    const recordId = row.recordId || row.sheet?.id;
    if (row.sheet && recordType && recordId) mergeRemoteRecord({ recordType, recordId, record: row.sheet, syncVersion: Number(row.sheet.syncVersion || 0) });
  });
  state = normalize(state);
  persistLocalState();
  render();
  renderSyncPanel();
}

function resolveSyncConflicts() {
  const conflicts = selectedSyncRows().filter((row) => ["CONFLICT", "MATERIAL_CONFLICT"].includes(row.status));
  addSyncLog("resolve-conflicts", {
    origin: "app",
    destination: "local",
    result: conflicts.length ? "manual-required" : "none",
    error: conflicts.length ? "Los conflictos requieren decision manual campo por campo." : "",
  });
  persistLocalState();
  renderSyncPanel();
  alert(conflicts.length
    ? "Hay conflictos materiales seleccionados. Por seguridad no se resuelven automaticamente: hay que elegir caso por caso si gana App o Sheets."
    : "No hay conflictos seleccionados.");
}

function renderTools() {
  const hub = $("#toolsHub");
  if (!hub) return;
  hub.hidden = Boolean(selectedToolPanel);
  $$("[data-tool-section]").forEach((section) => {
    section.hidden = section.dataset.toolSection !== selectedToolPanel;
  });
  renderCompanySettings();
  renderSyncPanel();
}

function renderCompanySettings() {
  const form = $("#companySettingsForm");
  if (!form) return;
  form.elements.emitterCuit.value = companyEmitterCuit();
}

function saveCompanySettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.companySettings = {
    ...(state.companySettings || {}),
    emitterCuit: String(form.elements.emitterCuit.value || "").trim(),
  };
  persistLocalState();
  setSyncStatus("Ajustes guardados localmente");
  renderTools();
}

function stockRowsLegacyTree(kind) {
  const tree = {};
  state.stockMovements.filter((item) => item.kind === kind).forEach((item) => {
    const product = item.product || "Sin producto";
    const campaign = item.campaign || "Sin campana";
    const counterparty = item.counterparty || "Sin acopio";
    const qty = Number(item.quantity || 0);
    tree[product] ||= { total: 0, campaigns: {} };
    tree[product].total += qty;
    tree[product].campaigns[campaign] ||= { total: 0, places: {} };
    tree[product].campaigns[campaign].total += qty;
    tree[product].campaigns[campaign].places[counterparty] = (tree[product].campaigns[campaign].places[counterparty] || 0) + qty;
  });
  const rows = [];
  Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).forEach(([product, productData]) => {
    if (!productData.total) return;
    rows.push(stockLine(product, productData.total, { kind, product }, "level-1"));
    Object.entries(productData.campaigns).sort(([a], [b]) => a.localeCompare(b)).forEach(([campaign, campaignData]) => {
      if (!campaignData.total) return;
      rows.push(stockLine(campaign, campaignData.total, { kind, product, campaign }, "level-2"));
      Object.entries(campaignData.places).sort(([a], [b]) => a.localeCompare(b)).forEach(([counterparty, qty]) => {
        if (!qty) return;
        rows.push(stockLine(counterparty, qty, { kind, product, campaign, counterparty }, "level-3"));
      });
    });
  });
  return rows.join("") || emptyHtml();
}

function stockLine(label, qty, filter, level) {
  const attrs = Object.entries(filter).map(([key, value]) => `data-stock-${key}="${esc(value)}"`).join(" ");
  return `<button class="partner-line stock-line ${level}" ${attrs}><span>${esc(label)}</span><strong>${number(qty)}</strong></button>`;
}

function cattleStockLine(label, heads, weightKg, filter, level) {
  const attrs = Object.entries(filter).map(([key, value]) => `data-stock-${key}="${esc(value)}"`).join(" ");
  return `<button class="partner-line stock-line ${level}" ${attrs}><span>${esc(label)}</span><strong>${number(heads)} cab.<small>${number(weightKg)} kg</small></strong></button>`;
}

function cattleMovementWeightTotal(heads, weightKg) {
  return Number(heads || 0) * Number(weightKg || 0);
}

function cattleAverageWeight(heads, weightTotal) {
  return heads ? weightTotal / heads : 0;
}

function cattleStockValue(heads, weightKg, pricePerKg) {
  return Math.abs(Number(heads || 0)) * Math.abs(Number(weightKg || 0)) * Number(pricePerKg || 0);
}

function stockFilteredMovements() {
  return stockMovementsAtDate().filter((item) => {
    if (!selectedStockFilter) return item.kind === selectedStockView;
    if (selectedStockFilter.kind && item.kind !== selectedStockFilter.kind) return false;
    if (selectedStockFilter.product && (item.product || "Sin producto") !== selectedStockFilter.product) return false;
    if (selectedStockFilter.campaign && (item.campaign || "Sin campana") !== selectedStockFilter.campaign) return false;
    if (selectedStockFilter.counterparty && (item.counterparty || "Sin acopio") !== selectedStockFilter.counterparty) return false;
    return true;
  });
}

function stockMovementsAtDate() {
  return state.stockMovements.filter((item) => (!selectedStockDate || item.date <= selectedStockDate) && matchesGlobalActivity(item));
}

function stockFilterLabel(filter) {
  return [filter.product, filter.campaign, filter.counterparty].filter(Boolean).join(" / ") || filter.kind;
}

function stockRows(kind) {
  const balances = {};
  stockMovementsAtDate().filter((item) => item.kind === kind).forEach((item) => {
    const product = item.product || "Sin producto";
    balances[product] ||= { quantity: 0, weightKg: 0, weightTotal: 0 };
    const quantity = Number(item.quantity || 0);
    balances[product].quantity += quantity;
    balances[product].weightKg += Number(item.weightKg || 0);
    if (kind === "hacienda") balances[product].weightTotal += cattleMovementWeightTotal(quantity, item.weightKg);
  });
  const rows = Object.entries(balances)
    .filter(([, data]) => data.quantity || data.weightKg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([product, data]) => kind === "hacienda"
      ? cattleStockLine(product, data.quantity, cattleAverageWeight(data.quantity, data.weightTotal), { kind, product }, "level-1")
      : stockLine(product, data.quantity, { kind, product }, "level-1"))
    .join("");
  if (kind !== "hacienda") return rows || emptyHtml();
  const total = Object.values(balances).reduce((acc, data) => {
    acc.quantity += Number(data.quantity || 0);
    acc.weightTotal += Number(data.weightTotal || 0);
    return acc;
  }, { quantity: 0, weightTotal: 0 });
  const totalRow = total.quantity || total.weightTotal
    ? cattleStockLine("Total hacienda", total.quantity, total.weightTotal, { kind }, "level-total")
    : "";
  return totalRow + rows || emptyHtml();
}

function renderStockDetail() {
  if (!selectedStockFilter?.product && selectedStockFilter?.kind !== "hacienda") {
    $("#stockDetailTitle").textContent = selectedStockView === "grano" ? "Detalle de stock agricola" : "Detalle de stock ganadero";
    $("#stockDetail").innerHTML = emptyHtml();
    return;
  }
  const dateLabel = selectedStockDate ? ` al ${formatDate(selectedStockDate)}` : " actual";
  if (selectedStockFilter.kind === "hacienda") {
    $("#stockDetailTitle").textContent = `Detalle: ${selectedStockFilter.product || "Total hacienda"}${dateLabel}`;
    renderCattleStockDetail();
    return;
  }
  $("#stockDetailTitle").textContent = `Detalle: ${selectedStockFilter.product}${dateLabel}`;
  const tree = {};
  stockMovementsAtDate().filter((item) => item.kind === selectedStockFilter.kind && (item.product || "Sin producto") === selectedStockFilter.product).forEach((item) => {
    const campaign = item.campaign || "Sin campana";
    const counterparty = item.counterparty || "Sin acopio";
    const qty = Number(item.quantity || 0);
    tree[campaign] ||= { initial: 0, entries: 0, exits: 0, total: 0, places: {} };
    const campaignData = tree[campaign];
    campaignData.places[counterparty] ||= { initial: 0, entries: 0, exits: 0, total: 0 };
    const placeData = campaignData.places[counterparty];
    const isInitial = normalizeName(item.reason).toLowerCase() === "stock inicial";
    if (isInitial) {
      campaignData.initial += qty;
      placeData.initial += qty;
    } else if (qty > 0) {
      campaignData.entries += qty;
      placeData.entries += qty;
    } else {
      campaignData.exits += Math.abs(qty);
      placeData.exits += Math.abs(qty);
    }
    campaignData.total += qty;
    placeData.total += qty;
  });
  const stockTotalLabel = selectedStockDate ? "Stock al corte" : "Stock actual";
  const rows = [`<div class="stock-detail-grid stock-detail-head"><span>Campana / acopio</span><span>${stockTotalLabel}</span><span>Stock inicial</span><span>Entradas</span><span>Salidas</span></div>`];
  Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).forEach(([campaign, campaignData]) => {
    rows.push(stockDetailLine(campaign, campaignData, { kind: selectedStockFilter.kind, product: selectedStockFilter.product, campaign }, "campaign"));
    Object.entries(campaignData.places).sort(([a], [b]) => a.localeCompare(b)).forEach(([counterparty, data]) => {
      rows.push(stockDetailLine(counterparty, data, { kind: selectedStockFilter.kind, product: selectedStockFilter.product, campaign, counterparty }, "place"));
    });
  });
  $("#stockDetail").innerHTML = rows.length > 1 ? rows.join("") : emptyHtml();
}

function renderCattleStockDetail() {
  const movements = stockMovementsAtDate()
    .filter((item) => item.kind === "hacienda" && (!selectedStockFilter.product || (item.product || "Sin producto") === selectedStockFilter.product))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const tree = {};
  movements.forEach((item) => {
    const product = item.product || "Sin categoria";
    const rawCampaign = item.campaign || "Sin campana";
    const productPrefix = selectedStockFilter.product ? "" : `${product} - `;
    const campaign = `${productPrefix}${rawCampaign}`;
    const counterparty = item.counterparty || "Sin establecimiento";
    tree[campaign] ||= { heads: 0, weightKg: 0, weightTotal: 0, initialValue: 0, pricePerKg: 0, priceDate: "", filterProduct: product, filterCampaign: rawCampaign, places: {} };
    const campaignData = tree[campaign];
    const heads = Number(item.quantity || 0);
    const weightKg = Number(item.weightKg || 0);
    const pricePerKg = Number(item.pricePerKg || 0);
    const weightTotal = cattleMovementWeightTotal(heads, weightKg);
    const isInitial = normalizeName(item.reason).toLowerCase() === "stock inicial";
    const isGeneralValuation = !item.counterparty && !heads && !weightKg && pricePerKg;
    if (isGeneralValuation) {
      campaignData.pricePerKg = pricePerKg;
      campaignData.priceDate = item.date;
      return;
    }
    campaignData.places[counterparty] ||= { heads: 0, weightKg: 0, weightTotal: 0, initialValue: 0, pricePerKg: 0, priceDate: "" };
    const placeData = campaignData.places[counterparty];
    campaignData.heads += heads;
    campaignData.weightTotal += weightTotal;
    placeData.heads += heads;
    placeData.weightTotal += weightTotal;
    if (isInitial && pricePerKg) {
      campaignData.initialValue += cattleStockValue(heads, weightKg, pricePerKg);
      placeData.initialValue += cattleStockValue(heads, weightKg, pricePerKg);
    }
    if (pricePerKg) {
      if (!item.counterparty) {
        campaignData.pricePerKg = pricePerKg;
        campaignData.priceDate = item.date;
      } else {
        placeData.pricePerKg = pricePerKg;
        placeData.priceDate = item.date;
      }
    }
  });
  const rows = [`<div class="stock-detail-grid cattle-stock-detail stock-detail-head"><span>Campana / establecimiento</span><span>Cabezas actuales</span><span>Kg/cab estimado</span><span>Precio/kg</span><span>Valor actual</span><span>Valor inicial</span><span>Diferencia</span></div>`];
  Object.entries(tree).sort(([a], [b]) => a.localeCompare(b)).forEach(([campaign, campaignData]) => {
    const placeValues = Object.values(campaignData.places);
    placeValues.forEach((data) => {
      data.weightKg = cattleAverageWeight(data.heads, data.weightTotal);
      if (campaignData.pricePerKg && (!data.priceDate || campaignData.priceDate >= data.priceDate)) {
        data.pricePerKg = campaignData.pricePerKg;
        data.priceDate = campaignData.priceDate;
      }
    });
    campaignData.weightKg = cattleAverageWeight(campaignData.heads, campaignData.weightTotal);
    campaignData.currentValue = placeValues.reduce((sum, data) => sum + cattleStockValue(data.heads, data.weightKg, data.pricePerKg), 0);
    campaignData.pricePerKg = campaignData.weightTotal ? campaignData.currentValue / Math.abs(campaignData.weightTotal) : campaignData.pricePerKg;
    campaignData.difference = campaignData.currentValue - campaignData.initialValue;
    rows.push(cattleStockDetailLine(campaign, campaignData, { kind: "hacienda", product: selectedStockFilter.product || campaignData.filterProduct, campaign: campaignData.filterCampaign }, "campaign"));
    Object.entries(campaignData.places).sort(([a], [b]) => a.localeCompare(b)).forEach(([counterparty, data]) => {
      data.currentValue = cattleStockValue(data.heads, data.weightKg, data.pricePerKg);
      data.difference = data.currentValue - data.initialValue;
      rows.push(cattleStockDetailLine(counterparty, data, { kind: "hacienda", product: selectedStockFilter.product || campaignData.filterProduct, campaign: campaignData.filterCampaign, counterparty }, "place"));
    });
  });
  $("#stockDetail").innerHTML = rows.length > 1 ? rows.join("") : emptyHtml();
}

function cattleStockDetailLine(label, data, filter, level) {
  const attrs = Object.entries(filter).map(([key, value]) => `data-stock-${key}="${esc(value)}"`).join(" ");
  return `<button class="stock-detail-grid cattle-stock-detail stock-detail-line ${level}" ${attrs}><span>${esc(label)}</span><strong>${number(data.heads)}</strong><strong>${number(data.weightKg)}</strong><strong>${data.pricePerKg ? currency(data.pricePerKg) : "-"}</strong><strong>${currency(data.currentValue)}</strong><strong>${currency(data.initialValue)}</strong><strong class="${data.difference < 0 ? "negative-text" : "positive-text"}">${currency(data.difference)}</strong></button>`;
}

function stockDetailLine(label, data, filter, level) {
  const attrs = Object.entries(filter).map(([key, value]) => `data-stock-${key}="${esc(value)}"`).join(" ");
  return `<button class="stock-detail-grid stock-detail-line ${level}" ${attrs}><span>${esc(label)}</span><strong class="${data.total < 0 ? "negative-text" : ""}">${number(data.total)}</strong><strong>${number(data.initial)}</strong><strong>${number(data.entries)}</strong><strong>${number(data.exits)}</strong></button>`;
}

function statusClass(status) {
  if (status === "pagado") return "paid";
  if (status === "cobrado") return "collected";
  if (status === "depositado") return "deposited";
  if (status === "endosado") return "endorsed";
  return "pending";
}

function statusSelect(collection, id, status) {
  const check = collection === "checks" ? state.checks.find((item) => item.id === id) : null;
  let opts = check
    ? (check.direction === "recibido" ? ["pendiente", "depositado", "endosado", "cobrado"] : ["pendiente", "pagado"])
    : statuses;
  if (status && !opts.includes(status)) opts = [...opts, status];
  return `<select class="status-select ${statusClass(status)}" data-status-collection="${collection}" data-status-id="${id}">${opts.map((item) => `<option ${item === status ? "selected" : ""}>${item}</option>`).join("")}</select>`;
}

function fieldsFor(mode) {
  const configuredEmitterCuit = companyEmitterCuit();
  if (mode === "entity") return `
    <label>Nombre<input name="name" autocomplete="off" required></label>
    <label>CUIT<input name="cuit" inputmode="numeric"></label>
    <label>Telefono<input name="phone" autocomplete="off"></label>
    <label>Persona de contacto<input name="contact" autocomplete="off"></label>
    <label class="wide">Alias<textarea name="aliases" placeholder="Un nombre alternativo por linea"></textarea></label>
    <label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  if (mode === "invoice") return `
    <label>Proveedor<input name="provider" list="entityList" autocomplete="off" required></label>
    <label>Factura<input name="number" required></label>
    <label>Fecha<input name="date" type="date" value="${today}" required></label>
    <label>Vencimiento<input name="dueDate" type="date" required></label>
    <label>Moneda<select name="currency" required><option value="USD">USD</option><option value="ARS">ARS</option></select></label>
    <label>Importe factura<input name="invoiceAmount" inputmode="decimal" required></label>
    <label>TC factura<input name="tcInvoice" inputmode="decimal" placeholder="solo USD"></label>
    <label>Imputacion<select name="accountId" required>${accountOptions()}</select></label>
    <label>Actividad<select name="activity" required>${activityOptions("Agricultura")}</select></label>
    <label class="wide">Concepto<input name="concept" list="conceptList" placeholder="Compra insumos financiados"></label>
    <label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  if (mode === "order") return `
    <label>N° orden<input name="orderNumber" placeholder="automatico"></label>
    <label>Tipo<select name="type" required><option value="pago">Orden de pago</option><option value="cobro">Orden de cobro</option></select></label>
    <label>Fecha emision<input name="date" type="date" value="${today}" required></label>
    <label>Vencimiento<input name="dueDate" type="date" value="${today}"></label>
    <label>Ejercicio<input name="fiscalYear" value="${esc(fiscalYearForDate(today))}"></label>
    <label>Entidad<input name="counterparty" list="entityList" autocomplete="off" required></label>
    <label class="wide" data-order-invoice-field>Facturas de origen<select name="sourceInvoiceIds" multiple size="6" data-order-invoice-source>${invoiceSourceOptions()}</select><span class="field-help">Puede seleccionar varias facturas con Ctrl/click. La orden suma los importes y las cancela al marcarla pagada.</span></label>
    <label data-order-source-field>Otro origen<select name="sourceId">${sourceOptions("pago")}</select></label>
    <label>Comprobante<input name="receipt"></label>
    <label>Forma<select name="method" required>${methodOptions()}</select></label>
    <label>Estado<select name="status">${statusOptions()}</select></label>
    <label>Importe ARS<input name="amountArs" inputmode="decimal"></label>
    <label>TC pago<input name="tcPayment" inputmode="decimal" placeholder="si cancela factura USD"></label>
    <label>Imputacion<select name="accountId">${accountOptions()}</select></label>
    <label>Actividad<select name="activity">${activityOptions()}</select></label>
    <label class="wide">Concepto<input name="concept" list="conceptList" required></label>
    <fieldset class="wide recurring-order-fields">
      <legend>Proximos vencimientos</legend>
      <div class="multi-checks">
        <div class="multi-checks-head">
          <span class="muted">Crea ordenes pendientes adicionales para el flujo de fondos.</span>
          <button class="link-button" type="button" data-add-order-due>Agregar vencimiento</button>
        </div>
        <div class="multi-check-list" id="orderDueRows"></div>
      </div>
    </fieldset>
    <fieldset class="wide mixed-fields" data-order-mixed-panel hidden>
      <legend>Medios de pago dentro de la orden</legend>
      <label>Importe transferencia<input name="transferAmount" inputmode="decimal"></label>
      <label>Comprobante transferencia<input name="transferReceipt"></label>
      <label>Importe cuenta corriente<input name="currentAccountAmount" inputmode="decimal"></label>
      <div class="wide multi-checks">
        <div class="multi-checks-head">
          <strong>Otros medios</strong>
          <button class="link-button" type="button" data-add-payment-component>Agregar medio</button>
        </div>
        <div class="multi-check-list" id="orderPaymentRows"></div>
      </div>
    </fieldset>
    <fieldset class="wide check-fields" data-order-check-panel hidden>
      <legend>Cheque</legend>
      <label>Operacion<select name="checkAction"><option value="emitido">Emitir cheque</option><option value="endosado">Endosar cheque en cartera</option><option value="recibido">Recibir cheque</option></select></label>
      <label data-issued-check>Numero<input name="checkNumber"></label>
      <label data-issued-check>Importe cheque<input name="checkAmount" inputmode="decimal"></label>
      <label data-issued-check>Banco<input name="checkBank" value="${defaultIssuedCheckBank}"></label>
      <label data-issued-check>CUIT emisor<input name="checkCuit" value="${esc(configuredEmitterCuit)}" placeholder="Cargar en Herramientas > Ajustes"></label>
      <label data-issued-check>Fecha cobro / pago<input name="checkDueDate" type="date"></label>
      <div class="wide multi-checks" data-issued-check>
        <div class="multi-checks-head">
          <strong>Cheques adicionales</strong>
          <button class="link-button" type="button" data-add-order-check>Agregar cheque</button>
        </div>
        <div class="multi-check-list" id="orderCheckRows"></div>
      </div>
      <label class="wide" data-endorsed-check>Cheque a endosar<select name="endorsedCheckId">${portfolioCheckOptions()}</select></label>
    </fieldset>
    <label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  if (mode === "check") return `
    <label>Tipo<select name="direction"><option value="recibido">recibido</option><option value="emitido" selected>emitido</option></select></label>
    <label>Estado<select name="status">${statusSelectOptions(["pendiente", "depositado", "endosado", "cobrado", "pagado"], "pendiente")}</select></label>
    <label>Numero<input name="number" required></label><label>Banco<input name="bank" value="${defaultIssuedCheckBank}"></label><label>CUIT emisor<input name="cuit" value="${esc(configuredEmitterCuit)}" placeholder="Cargar en Herramientas > Ajustes"></label>
    <label>Fecha cobro / pago<input name="dueDate" type="date" required></label><label>Entidad<input name="counterparty" list="entityList" autocomplete="off" required></label><label>Importe<input name="amount" inputmode="decimal" required></label>
    <label>Imputacion<select name="accountId">${accountOptions()}</select></label><label>Actividad<select name="activity">${activityOptions()}</select></label><label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  if (mode === "settlement") return `
    <label>Fecha<input name="date" type="date" value="${today}" required></label><label>Operacion<select name="operation"><option value="venta">venta</option><option value="compra">compra</option></select></label>
    <label>Ejercicio<input name="fiscalYear" value="${esc(fiscalYearForDate(today))}"></label>
    <label>Comprador / vendedor<input name="buyer" list="entityList" autocomplete="off" required></label><label>Producto<select name="product">${stockProductOptions()}</select></label>
    <label>Campana<select name="campaign">${stockCampaignOptions()}</select></label><label>Acopio<select name="stockPlace">${stockPlaceOptions()}</select></label>
    <label class="check-label"><input name="noCartaPorte" type="checkbox"> Sin Carta de Porte</label><label class="check-label"><input name="canje" type="checkbox"> Canje</label>
    <label>Cantidad kg<input name="quantity" inputmode="decimal" required></label><label>Precio bruto por TN<input name="priceGross" inputmode="decimal" required></label>
    <label>Precio neto por TN<input name="priceNet" inputmode="decimal" required></label><label>Subtotal neto<input name="subtotal" inputmode="decimal" readonly></label>
    <label>IVA venta 10,5%<input name="ivaTotal" inputmode="decimal" readonly></label><label>Ret. Ganancias 2%<input name="retentionGanancias" inputmode="decimal" readonly></label>
    <label>Ret. IVA 7%<input name="retentionIva" inputmode="decimal" readonly></label><label>IVA Venta Cereales a cobrar<input name="ivaCobrar" inputmode="decimal" readonly></label>
    <label>Total calculado<input name="calculatedReceivableTotal" inputmode="decimal" readonly></label><label>Total a cobrar manual<input name="receivableTotalOverride" inputmode="decimal" placeholder="Dejar vacio para usar el calculado"></label>
    <label>Gasto comercializacion %<input name="commercialCostPct" inputmode="decimal" readonly></label>
    <label>Estado<select name="status">${statusOptions()}</select></label><label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  if (mode === "stock") return `
    <label>Fecha<input name="date" type="date" value="${today}" required></label><label>Tipo<select name="kind"><option value="grano" ${selectedStockView === "grano" ? "selected" : ""}>grano</option><option value="hacienda" ${selectedStockView === "hacienda" ? "selected" : ""}>hacienda</option></select></label>
    <label>Actividad<select name="activity">${activityOptions("Agricultura")}</select></label><label>Producto<input name="product" list="stockProductList" required></label><label>Campana<input name="campaign" list="stockCampaignList"></label>
    <label>Acopio / establecimiento / contraparte<input name="counterparty" list="stockPlaceList"></label><label>Motivo<select name="reason"><option>stock inicial</option><option>compra</option><option>venta</option><option>muerte</option><option>ajuste</option><option>revaluacion</option></select></label>
    <label data-stock-quantity-label>Cantidad con signo (kg)<input name="quantity" inputmode="decimal" required></label>
    <label data-cattle-stock hidden>Kg/cab estimado<input name="weightKg" inputmode="decimal" placeholder="Peso promedio por cabeza"></label>
    <label data-cattle-stock hidden>Precio por kg<input name="pricePerKg" inputmode="decimal" placeholder="Para valuacion inicial o anual"></label>
    <label class="wide" data-cattle-stock hidden><span class="muted">Para una revaluacion anual, use cantidad 0 y cargue el nuevo precio por kg. No modifica las existencias fisicas.</span></label>
    <label class="wide">Notas<textarea name="notes"></textarea></label>
  `;
  return `<label>Codigo<input name="code" required></label><label>Actividad<select name="activity" required>${activityOptions("Agricultura")}</select></label><label class="wide">Nombre<input name="name" required></label>`;
}

function statusSelectOptions(options, selected = "") {
  return options.map((item) => `<option ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function applyCheckDirectionDefaults() {
  const form = $("#modalForm");
  if (!form.elements.direction) return;
  const direction = form.elements.direction.value;
  const configuredEmitterCuit = companyEmitterCuit();
  if (direction === "emitido") {
    if (form.elements.status && !form.elements.status.value) form.elements.status.value = "pendiente";
    if (form.elements.bank && !form.elements.bank.value) form.elements.bank.value = defaultIssuedCheckBank;
    if (form.elements.cuit && !form.elements.cuit.value && configuredEmitterCuit) form.elements.cuit.value = configuredEmitterCuit;
  }
  if (direction === "recibido") {
    if (form.elements.status && !form.elements.status.value) form.elements.status.value = "pendiente";
    if (form.elements.bank?.value === defaultIssuedCheckBank) form.elements.bank.value = "";
    if (configuredEmitterCuit && form.elements.cuit?.value === configuredEmitterCuit) form.elements.cuit.value = "";
  }
}

function updateOrderCheckFields() {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form.elements.method) return;
  const isMixed = form.elements.method.value === "Mixto";
  const isCheck = ["Cheque", "E-cheq", "Mixto"].includes(form.elements.method.value);
  const panel = form.querySelector("[data-order-check-panel]");
  const mixedPanel = form.querySelector("[data-order-mixed-panel]");
  if (mixedPanel) mixedPanel.hidden = !isMixed;
  if (!panel) return;
  panel.hidden = !isCheck;
  if (!isCheck) return;

  const isPayment = form.elements.type.value === "pago";
  if (form.elements.checkAction) {
    if (!isPayment && form.elements.checkAction.value === "endosado") form.elements.checkAction.value = "recibido";
    if (isPayment && form.elements.checkAction.value === "recibido") form.elements.checkAction.value = "emitido";
  }
  const action = form.elements.checkAction?.value || (isPayment ? "emitido" : "recibido");
  const configuredEmitterCuit = companyEmitterCuit();
  $$("#modalForm [data-issued-check]").forEach((item) => item.hidden = action === "endosado");
  $$("#modalForm [data-endorsed-check]").forEach((item) => item.hidden = action !== "endosado");
  [...(form.elements.checkAction?.options || [])].forEach((option) => {
    option.hidden = (!isPayment && option.value !== "recibido") || (isPayment && option.value === "recibido");
  });
  if (action === "emitido") {
    if (form.elements.checkBank && !form.elements.checkBank.value) form.elements.checkBank.value = defaultIssuedCheckBank;
    if (form.elements.checkCuit && !form.elements.checkCuit.value && configuredEmitterCuit) form.elements.checkCuit.value = configuredEmitterCuit;
  }
  if (action === "recibido") {
    if (form.elements.checkBank?.value === defaultIssuedCheckBank) form.elements.checkBank.value = "";
    if (configuredEmitterCuit && form.elements.checkCuit?.value === configuredEmitterCuit) form.elements.checkCuit.value = "";
  }
  if (form.elements.checkDueDate && !form.elements.checkDueDate.value) form.elements.checkDueDate.value = form.elements.dueDate.value || form.elements.date.value;
  updateEndorsedCheckFields();
}

function addOrderCheckRow(row = {}) {
  const list = $("#orderCheckRows");
  if (!list) return;
  const form = $("#modalForm");
  const defaultCuit = row.cuit || form?.elements?.checkCuit?.value || "";
  const element = document.createElement("div");
  element.className = "multi-check-row";
  element.innerHTML = `
    <label>Numero<input name="extraCheckNumber" value="${esc(row.number || "")}"></label>
    <label>Importe<input name="extraCheckAmount" inputmode="decimal" value="${row.amount ? number(row.amount) : ""}"></label>
    <label>Fecha<input name="extraCheckDueDate" type="date" value="${esc(row.dueDate || "")}"></label>
    <label>CUIT emisor<input name="extraCheckCuit" value="${esc(defaultCuit)}"></label>
    <button class="danger-link" type="button" data-remove-order-check>Quitar</button>
  `;
  list.appendChild(element);
}

function fillOrderCheckRows(order) {
  const list = $("#orderCheckRows");
  if (!list) return;
  list.innerHTML = "";
  const rows = Array.isArray(order?.checks) ? order.checks.slice(1) : [];
  rows.forEach(addOrderCheckRow);
}

function syncBlankExtraCheckCuits() {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form?.elements?.checkCuit) return;
  const cuit = form.elements.checkCuit.value || "";
  if (!cuit) return;
  $$("#orderCheckRows .multi-check-row [name='extraCheckCuit']").forEach((field) => {
    if (!field.value) field.value = cuit;
  });
}

function paymentComponentOptions(selected = "") {
  const options = ["Tarjeta", "Prestamo bancario", "VEP", "debito directo", "Efectivo", "Canje", "cuenta corriente", "Transferencia"];
  return options.map((item) => `<option value="${esc(item)}" ${item === selected ? "selected" : ""}>${esc(item)}</option>`).join("");
}

function addOrderPaymentComponentRow(row = {}) {
  const list = $("#orderPaymentRows");
  const form = $("#modalForm");
  if (!list || !form) return;
  const element = document.createElement("div");
  element.className = "order-payment-row";
  element.innerHTML = `
    <label>Forma<select name="paymentComponentMethod">${paymentComponentOptions(row.method || "Tarjeta")}</select></label>
    <label>Importe<input name="paymentComponentAmount" inputmode="decimal" value="${row.amount ? number(row.amount) : ""}"></label>
    <label>Comprobante<input name="paymentComponentReceipt" value="${esc(row.receipt || "")}"></label>
    <label>Fecha<input name="paymentComponentDate" type="date" value="${esc(row.date || form.elements.dueDate?.value || form.elements.date?.value || today)}"></label>
    <label>Estado<select name="paymentComponentStatus">${statusSelectOptions(["pendiente", "pagado", "cobrado"], row.status || "pendiente")}</select></label>
    <button class="danger-link" type="button" data-remove-payment-component>Quitar</button>
  `;
  list.appendChild(element);
}

function fillOrderPaymentComponents(order) {
  const list = $("#orderPaymentRows");
  if (!list) return;
  list.innerHTML = "";
  (Array.isArray(order?.paymentComponents) ? order.paymentComponents : []).forEach(addOrderPaymentComponentRow);
}

function collectOrderPaymentComponents() {
  return $$("#orderPaymentRows .order-payment-row").map((row) => ({
    method: row.querySelector('[name="paymentComponentMethod"]')?.value || "",
    amount: parseAmount(row.querySelector('[name="paymentComponentAmount"]')?.value || ""),
    receipt: row.querySelector('[name="paymentComponentReceipt"]')?.value || "",
    date: row.querySelector('[name="paymentComponentDate"]')?.value || "",
    status: row.querySelector('[name="paymentComponentStatus"]')?.value || "pendiente",
  })).filter((row) => row.method && row.amount);
}

function collectOrderChecks(data) {
  const form = $("#modalForm");
  if (!form || !["Cheque", "E-cheq", "Mixto"].includes(data.method) || data.checkAction === "endosado") return [];
  const rows = [];
  if (data.checkNumber || data.checkAmount || data.checkDueDate) {
    rows.push({
      number: data.checkNumber,
      amount: parseAmount(data.checkAmount || data.amountArs),
      dueDate: data.checkDueDate || data.dueDate || data.date,
      cuit: data.checkCuit,
    });
  }
  $$("#orderCheckRows .multi-check-row").forEach((row) => {
    const numberValue = row.querySelector('[name="extraCheckNumber"]')?.value || "";
    const amount = parseAmount(row.querySelector('[name="extraCheckAmount"]')?.value || "");
    const dueDate = row.querySelector('[name="extraCheckDueDate"]')?.value || data.checkDueDate || data.dueDate || data.date;
    const cuit = row.querySelector('[name="extraCheckCuit"]')?.value || data.checkCuit || "";
    if (numberValue || amount) rows.push({ number: numberValue, amount, dueDate, cuit });
  });
  return rows.filter((row) => row.number);
}

function orderCheckTotal(order) {
  return (Array.isArray(order.checks) ? order.checks : []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function addOrderDueRow(row = {}) {
  const list = $("#orderDueRows");
  const form = $("#modalForm");
  if (!list || !form) return;
  const existingDates = $$("#orderDueRows [name='futureDueDate']").map((field) => field.value).filter(Boolean);
  const existingAmounts = $$("#orderDueRows [name='futureDueAmount']").map((field) => parseAmount(field.value)).filter(Boolean);
  const baseDate = existingDates.at(-1) || form.elements.dueDate?.value || form.elements.date?.value || today;
  const amount = row.amount ?? existingAmounts.at(-1) ?? parseAmount(form.elements.amountArs?.value || "");
  const element = document.createElement("div");
  element.className = "order-due-row";
  element.innerHTML = `
    <label>Vencimiento<input name="futureDueDate" type="date" value="${esc(row.dueDate || addMonthsToDate(baseDate))}"></label>
    <label>Importe<input name="futureDueAmount" inputmode="decimal" value="${amount ? number(amount) : ""}"></label>
    <button class="danger-link" type="button" data-remove-order-due>Quitar</button>
  `;
  list.appendChild(element);
}

function collectFutureOrderDues() {
  return $$("#orderDueRows .order-due-row").map((row) => ({
    dueDate: row.querySelector('[name="futureDueDate"]')?.value || "",
    amount: parseAmount(row.querySelector('[name="futureDueAmount"]')?.value || ""),
  })).filter((row) => row.dueDate && row.amount);
}

function updateEndorsedCheckFields() {
  const form = $("#modalForm");
  if (modalMode !== "order" || form.elements.checkAction?.value !== "endosado") return;
  const check = state.checks.find((item) => item.id === form.elements.endorsedCheckId?.value);
  if (!check) return;
  if (!form.elements.amountArs.value) form.elements.amountArs.value = number(check.amount);
  if (!form.elements.dueDate.value) form.elements.dueDate.value = check.dueDate;
  if (!form.elements.receipt.value) form.elements.receipt.value = check.number;
}

function syncFiscalYearField() {
  const form = $("#modalForm");
  if (!form?.elements?.fiscalYear || !form.elements.date) return;
  const current = form.elements.fiscalYear.value;
  const previous = form.elements.fiscalYear.dataset.autoValue || "";
  const next = fiscalYearForDate(form.elements.date.value);
  if (!next) return;
  if (!current || current === previous) form.elements.fiscalYear.value = next;
  form.elements.fiscalYear.dataset.autoValue = next;
}

function sourceOptions(orderType = "pago", selected = "") {
  const settlements = orderType === "cobro"
    ? state.settlements.filter((item) => item.status !== "cobrado" || selected === `settlement:${item.id}`).map((item) => `<option value="settlement:${item.id}" ${selected === `settlement:${item.id}` ? "selected" : ""}>Liquidacion ${esc(item.product)}  -  ${esc(item.buyer)}  -  ${currency(settlementCollectionAmount(item))}</option>`)
    : [];
  return `<option value="">Manual</option>${settlements.join("")}`;
}

function invoiceSourceOptions(selectedIds = []) {
  const selected = new Set(selectedIds);
  const invoices = state.invoices
    .filter((item) => item.status !== "pagada" || selected.has(item.id))
    .slice()
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
    .map((item) => `<option value="${esc(item.id)}" ${selected.has(item.id) ? "selected" : ""}>${formatDate(item.dueDate)} - Factura ${esc(item.number)} - ${esc(item.provider)} - ${esc(invoiceBalanceLabel(item))}</option>`);
  return invoices.join("");
}

function orderInvoiceIds(order) {
  if (!order) return [];
  if (Array.isArray(order.sourceIds)) return order.sourceIds.filter(Boolean);
  if (typeof order.sourceIds === "string" && order.sourceIds.trim()) return order.sourceIds.split("|").map((item) => item.trim()).filter(Boolean);
  const [kind, id] = String(order.sourceId || "").split(":");
  return kind === "invoice" && id ? [id] : [];
}

function linkedInvoicePaymentOrders(invoiceId) {
  if (!invoiceId) return [];
  return state.orders.filter((order) => order.type === "pago" && orderInvoiceIds(order).includes(invoiceId));
}

function invoiceCoveredByPaymentOrder(invoice) {
  return linkedInvoicePaymentOrders(invoice?.id).length > 0;
}

function openCashflowInvoices() {
  return state.invoices.filter((invoice) => invoice.status !== "pagada" && !invoiceCoveredByPaymentOrder(invoice));
}

function resolveInvoiceSources(invoiceIds = []) {
  const invoices = invoiceIds.map((id) => state.invoices.find((item) => item.id === id)).filter(Boolean);
  if (!invoices.length) return {};
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const numbers = invoices.map((item) => item.number).filter(Boolean);
  const providers = unique(invoices.map((item) => item.provider));
  const accounts = unique(invoices.map((item) => item.accountId));
  const activities = unique(invoices.map((item) => item.activity));
  const concepts = unique(invoices.map((item) => item.concept));
  return {
    label: `Facturas ${numbers.join(", ")}`,
    counterparty: providers.length === 1 ? providers[0] : "Varios proveedores",
    receipt: numbers.join(", "),
    accountId: accounts.length === 1 ? accounts[0] : "",
    activity: activities.length === 1 ? activities[0] : "",
    concept: concepts.length === 1 ? concepts[0] : `Pago facturas ${numbers.join(", ")}`,
    amountArs: invoices.reduce((sum, invoice) => sum + invoiceArsAmount(invoice), 0),
    invoices,
  };
}

function selectedOrderInvoiceIds() {
  const field = $("#modalForm")?.elements?.sourceInvoiceIds;
  return field ? [...field.selectedOptions].map((option) => option.value).filter(Boolean) : [];
}

function updateOrderSourceVisibility() {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form) return;
  const type = form.elements.type?.value || "pago";
  const invoiceField = form.querySelector("[data-order-invoice-field]");
  const sourceField = form.querySelector("[data-order-source-field]");
  if (invoiceField) invoiceField.hidden = type !== "pago";
  if (form.elements.sourceId) {
    const current = form.elements.sourceId.value;
    form.elements.sourceId.innerHTML = sourceOptions(type, current);
    if (![...form.elements.sourceId.options].some((option) => option.value === current)) form.elements.sourceId.value = "";
  }
  if (sourceField) sourceField.hidden = type === "pago";
  if (type !== "pago" && form.elements.sourceInvoiceIds) {
    [...form.elements.sourceInvoiceIds.options].forEach((option) => option.selected = false);
  }
}

function updateOrderSourceFields() {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form) return;
  updateOrderSourceVisibility();
  const invoiceIds = selectedOrderInvoiceIds();
  const source = invoiceIds.length ? resolveInvoiceSources(invoiceIds) : resolveSource(form.elements.sourceId?.value || "");
  if (invoiceIds.length && form.elements.sourceId) form.elements.sourceId.value = "";
  if (!source || !Object.keys(source).length) return;
  if (form.elements.counterparty) form.elements.counterparty.value = source.counterparty || form.elements.counterparty.value;
  if (form.elements.receipt) form.elements.receipt.value = source.receipt || form.elements.receipt.value;
  if (form.elements.amountArs) form.elements.amountArs.value = source.amountArs ? number(source.amountArs) : form.elements.amountArs.value;
  if (form.elements.accountId && source.accountId) form.elements.accountId.value = source.accountId;
  if (form.elements.activity && source.activity) form.elements.activity.value = normalizeActivity(source.activity);
  if (form.elements.concept) form.elements.concept.value = source.concept || form.elements.concept.value;
}

function orderSourceDisplay(order) {
  const invoiceIds = orderInvoiceIds(order);
  const invoiceSource = invoiceIds.length ? resolveInvoiceSources(invoiceIds) : {};
  return invoiceSource.label || order.sourceLabel || "";
}

function orderReceiptDisplay(order) {
  const invoiceIds = orderInvoiceIds(order);
  const invoiceSource = invoiceIds.length ? resolveInvoiceSources(invoiceIds) : {};
  return invoiceSource.receipt || order.receipt || "";
}

function portfolioCheckOptions(selected = "") {
  const checks = state.checks
    .filter((item) => item.direction === "recibido" && item.status === "pendiente")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return `<option value="">Seleccionar cheque</option>${checks.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${formatDate(item.dueDate)}  -  ${esc(item.counterparty)}  -  ${esc(item.number)}  -  ${currency(item.amount)}</option>`).join("")}`;
}

function stockLots() {
  const lots = {};
  state.stockMovements.forEach((item) => {
    const key = `${item.product}||${item.campaign || ""}||${item.counterparty || ""}`;
    lots[key] ||= { product: item.product, campaign: item.campaign || "", stockPlace: item.counterparty || "", quantity: 0 };
    lots[key].quantity += Number(item.quantity || 0);
  });
  return Object.values(lots).filter((item) => item.quantity > 0);
}

function stockProductOptions() {
  return [...new Set(stockLots().map((item) => item.product))].map((item) => `<option>${esc(item)}</option>`).join("");
}

function stockCampaignOptions(product = "") {
  const values = [...new Set(stockLots().filter((item) => !product || item.product === product).map((item) => item.campaign))];
  return `<option value="">Sin campana</option>${values.map((item) => `<option>${esc(item)}</option>`).join("")}`;
}

function stockPlaceOptions(product = "", campaign = "") {
  const values = [...new Set(stockLots().filter((item) => (!product || item.product === product) && (!campaign || item.campaign === campaign)).map((item) => item.stockPlace))];
  return `<option value="">Sin acopio</option>${values.map((item) => `<option>${esc(item)}</option>`).join("")}`;
}

function updateSettlementSelectors() {
  if (modalMode !== "settlement") return;
  const form = $("#modalForm");
  if (!form.elements.product || !form.elements.campaign || !form.elements.stockPlace) return;
  const product = form.elements.product.value;
  const selectedCampaign = form.elements.campaign.value;
  form.elements.campaign.innerHTML = stockCampaignOptions(product);
  if ([...form.elements.campaign.options].some((option) => option.value === selectedCampaign)) form.elements.campaign.value = selectedCampaign;
  const campaign = form.elements.campaign.value;
  const selectedPlace = form.elements.stockPlace.value;
  form.elements.stockPlace.innerHTML = stockPlaceOptions(product, campaign);
  if ([...form.elements.stockPlace.options].some((option) => option.value === selectedPlace)) form.elements.stockPlace.value = selectedPlace;
  if (form.elements.stockPlace.value && !form.elements.buyer.value) form.elements.buyer.value = form.elements.stockPlace.value;
}

function updateSettlementAmounts() {
  const form = $("#modalForm");
  if (modalMode !== "settlement" || !form.elements.quantity) return;
  const quantity = parseAmount(form.elements.quantity.value);
  const pricingQuantity = stockKindFor(form.elements.product?.value, "grano") === "grano" ? quantity / 1000 : quantity;
  const priceGross = parseAmount(form.elements.priceGross?.value);
  const priceNet = parseAmount(form.elements.priceNet?.value);
  const noCartaPorte = Boolean(form.elements.noCartaPorte?.checked);
  const canje = Boolean(form.elements.canje?.checked);
  const isGrainSale = stockKindFor(form.elements.product?.value, "grano") === "grano" && form.elements.operation?.value === "venta";
  const hasFiscalSettlement = isGrainSale && !noCartaPorte;
  const grossSubtotal = pricingQuantity * priceGross;
  const subtotal = pricingQuantity * priceNet;
  const retentionGanancias = hasFiscalSettlement && !canje ? subtotal * 0.02 : 0;
  const ivaTotal = hasFiscalSettlement ? subtotal * 0.105 : 0;
  const retentionIva = hasFiscalSettlement && !canje ? subtotal * 0.07 : 0;
  const ivaCobrar = Math.max(0, ivaTotal - retentionIva);
  const calculatedReceivableTotal = subtotal + ivaTotal - retentionGanancias - retentionIva;
  if (form.elements.subtotal) form.elements.subtotal.value = number(subtotal);
  if (form.elements.ivaTotal) form.elements.ivaTotal.value = number(ivaTotal);
  if (form.elements.retentionGanancias) form.elements.retentionGanancias.value = number(retentionGanancias);
  if (form.elements.retentionIva) form.elements.retentionIva.value = number(retentionIva);
  if (form.elements.ivaCobrar) form.elements.ivaCobrar.value = number(ivaCobrar);
  if (form.elements.calculatedReceivableTotal) form.elements.calculatedReceivableTotal.value = number(calculatedReceivableTotal);
  if (form.elements.commercialCostPct) form.elements.commercialCostPct.value = number(priceGross ? Math.max(0, ((priceGross - priceNet) / priceGross) * 100) : 0);
}

function openModal(mode, id = "") {
  modalMode = mode;
  editingId = id;
  orderDueDateAuto = mode === "order" && !id;
  const modeLabel = {
    invoice: "factura financiada",
    order: "orden",
    check: "cheque",
    settlement: "liquidacion",
    stock: "stock",
    account: "cuenta",
    entity: "entidad",
  }[mode] || mode;
  $("#modalTitle").textContent = `${id ? "Editar" : "Nuevo"} ${modeLabel}`;
  $("#modalFields").innerHTML = fieldsFor(mode);
  renderDatalists();
  $("#duplicateModal").hidden = !(mode === "order" && id);
  $("#deleteModal").hidden = !(mode === "order" && id);
  if (id) fillForm(mode, id);
  if (mode === "check" && !id) applyCheckDirectionDefaults();
  if (mode === "order") {
    updateOrderNumberSuggestion();
    updateOrderSourceVisibility();
    updateOrderCheckFields();
  }
  if (mode === "stock") updateStockFields();
  if (mode === "invoice") updateInvoiceCurrencyFields();
  updateSettlementSelectors();
  if (mode === "settlement") updateSettlementAmounts();
  if (["order", "settlement"].includes(mode)) syncFiscalYearField();
  $("#modalBackdrop").hidden = false;
}

function updateInvoiceCurrencyFields() {
  const form = $("#modalForm");
  if (modalMode !== "invoice" || !form?.elements?.currency || !form.elements.tcInvoice) return;
  const isArs = form.elements.currency.value === "ARS";
  form.elements.tcInvoice.disabled = isArs;
  form.elements.tcInvoice.required = !isArs;
  if (isArs) form.elements.tcInvoice.value = "";
}

function updateOrderNumberSuggestion() {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form?.elements?.orderNumber || editingId) return;
  const type = form.elements.type?.value || "pago";
  const date = form.elements.date?.value || form.elements.dueDate?.value || localToday();
  form.elements.orderNumber.value = nextOrderNumber(type, date);
}

function closeModal() {
  $("#modalBackdrop").hidden = true;
  $("#modalForm").reset();
  $("#duplicateModal").hidden = true;
  $("#deleteModal").hidden = true;
  modalMode = "";
  editingId = "";
  renderDatalists();
}

function duplicateCurrentOrder() {
  if (modalMode !== "order" || !editingId) return;
  const form = $("#modalForm");
  const originalDate = form.elements.date?.value || today;
  const originalDueDate = form.elements.dueDate?.value || originalDate;

  editingId = "";
  orderDueDateAuto = false;
  $("#modalTitle").textContent = "Nueva orden duplicada";
  $("#duplicateModal").hidden = true;
  $("#deleteModal").hidden = true;

  if (form.elements.date) form.elements.date.value = addMonthsToDate(originalDate);
  if (form.elements.dueDate) form.elements.dueDate.value = addMonthsToDate(originalDueDate);
  if (form.elements.status) form.elements.status.value = "pendiente";
  if (form.elements.sourceId) form.elements.sourceId.value = "";
  if (form.elements.sourceInvoiceIds) [...form.elements.sourceInvoiceIds.options].forEach((option) => option.selected = false);
  if (form.elements.receipt) form.elements.receipt.value = "";
  if (form.elements.transferReceipt) form.elements.transferReceipt.value = "";
  if (form.elements.checkNumber) form.elements.checkNumber.value = "";
  if (form.elements.checkAmount) form.elements.checkAmount.value = "";
  if (form.elements.checkDueDate) form.elements.checkDueDate.value = form.elements.dueDate?.value || form.elements.date?.value || today;
  if (form.elements.fiscalYear) syncFiscalYearField();
  if (form.elements.endorsedCheckId) form.elements.endorsedCheckId.value = "";
  const checkRows = $("#orderCheckRows");
  if (checkRows) checkRows.innerHTML = "";
  const paymentRows = $("#orderPaymentRows");
  if (paymentRows) paymentRows.innerHTML = "";
  updateOrderSourceVisibility();
  updateOrderCheckFields();
}

function fillForm(mode, id) {
  const map = { invoice: "invoices", order: "orders", check: "checks", settlement: "settlements", stock: "stockMovements", account: "accounts", entity: "entities" };
  let item = state[map[mode]]?.find((row) => row.id === id);
  if (!item) return;
  if (mode === "order") item = syncSettlementOrder(item);
  Object.entries(item).forEach(([key, value]) => {
    if (mode === "settlement" && ["campaign", "stockPlace"].includes(key)) return;
    const field = $("#modalForm").elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else if (mode === "entity" && key === "aliases" && Array.isArray(value)) field.value = value.join("\n");
    else field.value = value ?? "";
  });
  if (mode === "settlement" && $("#modalForm").elements.gross && !$("#modalForm").elements.gross.value) $("#modalForm").elements.gross.value = item.net || "";
  if (mode === "invoice") {
    if ($("#modalForm").elements.currency) $("#modalForm").elements.currency.value = invoiceCurrency(item);
    if ($("#modalForm").elements.invoiceAmount) $("#modalForm").elements.invoiceAmount.value = number(invoiceOriginalAmount(item));
    if ($("#modalForm").elements.tcInvoice) $("#modalForm").elements.tcInvoice.value = invoiceCurrency(item) === "USD" ? number(item.tcInvoice) : "";
  }
  if (mode === "settlement") {
    updateSettlementSelectors();
    if ($("#modalForm").elements.campaign) $("#modalForm").elements.campaign.value = item.campaign || "";
    updateSettlementSelectors();
    if ($("#modalForm").elements.stockPlace) $("#modalForm").elements.stockPlace.value = item.stockPlace || "";
    if ($("#modalForm").elements.noCartaPorte) $("#modalForm").elements.noCartaPorte.checked = Boolean(item.noCartaPorte);
    if ($("#modalForm").elements.canje) $("#modalForm").elements.canje.checked = Boolean(item.canje);
    updateSettlementAmounts();
  }
  if (mode === "order") {
    const invoiceIds = new Set(orderInvoiceIds(item));
    const invoiceField = $("#modalForm").elements.sourceInvoiceIds;
    if (invoiceField) [...invoiceField.options].forEach((option) => option.selected = invoiceIds.has(option.value));
    updateOrderSourceVisibility();
    if ($("#modalForm").elements.sourceId) $("#modalForm").elements.sourceId.value = item.sourceId || "";
    if ($("#modalForm").elements.amountArs) $("#modalForm").elements.amountArs.value = number(item.amountArs);
    if (Array.isArray(item.checks) && item.checks.length) {
      const first = item.checks[0];
      if ($("#modalForm").elements.checkNumber) $("#modalForm").elements.checkNumber.value = first.number || "";
      if ($("#modalForm").elements.checkAmount) $("#modalForm").elements.checkAmount.value = first.amount ? number(first.amount) : "";
      if ($("#modalForm").elements.checkDueDate) $("#modalForm").elements.checkDueDate.value = first.dueDate || "";
    }
    updateOrderSourceVisibility();
    updateOrderCheckFields();
    fillOrderCheckRows(item);
    fillOrderPaymentComponents(item);
  }
  if (mode === "stock") updateStockFields();
}

function updateStockFields() {
  const form = $("#modalForm");
  if (modalMode !== "stock" || !form.elements.kind) return;
  const isCattle = form.elements.kind.value === "hacienda";
  form.querySelectorAll("[data-cattle-stock]").forEach((element) => {
    element.hidden = !isCattle;
    element.style.display = isCattle ? "" : "none";
  });
  const quantityLabel = form.querySelector("[data-stock-quantity-label]");
  if (quantityLabel) quantityLabel.firstChild.textContent = isCattle ? "Cabezas con signo" : "Cantidad con signo (kg)";
  if (form.elements.activity) form.elements.activity.value = isCattle ? "Ganaderia" : "Agricultura";
}

function syncSettlementOrder(order) {
  const [sourceKind, sourceId] = String(order.sourceId || "").split(":");
  if (sourceKind !== "settlement") return order;
  const settlement = state.settlements.find((item) => item.id === sourceId);
  if (!settlement) return order;
  const synced = {
    ...order,
    counterparty: settlement.buyer || settlement.stockPlace,
    method: settlement.canje ? "Canje" : order.method,
    amountArs: settlementCollectionAmount(settlement),
  };
  state.orders = state.orders.map((item) => item.id === order.id ? synced : item);
  save();
  return synced;
}

function handleSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  if (modalMode === "order") {
    data.sourceInvoiceIds = new FormData(event.currentTarget).getAll("sourceInvoiceIds").filter(Boolean);
    data.checks = collectOrderChecks(data);
    data.paymentComponents = collectOrderPaymentComponents();
    data.futureDues = collectFutureOrderDues();
  }
  if (!confirmLargeAmounts(modalMode, data)) return;
  rememberUndo(editingId ? `edicion de ${modalMode}` : `nuevo ${modalMode}`);
  beginUserSyncChange();
  let openAfterSave = null;
  if (modalMode === "invoice") saveInvoice(data);
  if (modalMode === "order") {
    const order = saveOrder(data);
    createFutureOrders(order, data.futureDues);
  }
  if (modalMode === "check") saveCheck(data);
  if (modalMode === "settlement") {
    const settlement = saveSettlement(data);
    const order = ensureSettlementOrder(settlement);
    ensureSettlementVatOrder(settlement);
    openAfterSave = { mode: "order", id: order.id };
  }
  if (modalMode === "stock") saveStock(data);
  if (modalMode === "account") upsert("accounts", { id: editingId || uid(), code: data.code, name: data.name, activity: normalizeActivity(data.activity) });
  if (modalMode === "entity") saveEntity(data);
  save();
  closeModal();
  render();
  if (openAfterSave) {
    setView("orders");
    openModal(openAfterSave.mode, openAfterSave.id);
  }
}

function confirmLargeAmounts(mode, data) {
  const amounts = [];
  const add = (label, value) => {
    const amount = typeof value === "number" ? value : parseAmount(value);
    if (Math.abs(amount) > largeAmountWarning) amounts.push({ label, amount });
  };
  if (mode === "invoice") add(`Factura ${data.currency || ""}`, data.invoiceAmount || data.usdAmount);
  if (mode === "order") {
    add("Importe de la orden", data.amountArs);
    add("Transferencia", data.transferAmount);
    add("Cuenta corriente", data.currentAccountAmount);
    (data.checks || []).forEach((check, index) => add(`Cheque ${index + 1}`, check.amount));
    (data.paymentComponents || []).forEach((component, index) => add(`${component.method || "Medio"} ${index + 1}`, component.amount));
    (data.futureDues || []).forEach((due, index) => add(`Vencimiento futuro ${index + 1}`, due.amount));
  }
  if (mode === "check") add("Importe del cheque", data.amount);
  if (mode === "settlement") {
    add("Precio bruto", data.priceGross);
    add("Precio neto", data.priceNet);
    add("Total manual", data.receivableTotalOverride);
    const form = $("#modalForm");
    add("Total calculado de la liquidacion", form.elements.calculatedReceivableTotal?.value);
  }
  if (!amounts.length) return true;
  const detail = amounts.map((item) => `${item.label}: ${currency(item.amount)}`).join("\n");
  return confirm(`Atencion: hay importes mayores a ${currency(largeAmountWarning)}.\n\n${detail}\n\nConfirmar que los valores son correctos?`);
}

function upsert(collection, item) {
  const nextItem = syncCollections.includes(collection) ? markForSyncCollection(collection, item, { force: true }) : item;
  state[collection] = editingId ? state[collection].map((row) => (row.id === editingId ? nextItem : row)) : [...state[collection], nextItem];
}

function deleteOrder(id) {
  state.orders.filter((item) => item.sourceId === `currentAccount:${id}`).forEach((item) => deleteOrder(item.id));
  state.orders = state.orders.filter((item) => item.id !== id);
  state.ledger = state.ledger.filter((item) => item.orderId !== id && !String(item.orderId || "").startsWith(`order:${id}:`) && item.orderId !== `${id}:fx` && !String(item.orderId || "").startsWith(`${id}:fx:`));
  state.checks = state.checks.filter((item) => item.orderId !== id).map((check) => check.endorsedOrderId === id ? { ...check, status: "pendiente", endorsedTo: "", endorsedOrderId: "" } : check);
}

function cleanupDuplicateOrdersForSource(sourceId, keepId) {
  state.orders
    .filter((item) => item.sourceId === sourceId && item.id !== keepId)
    .map((item) => item.id)
    .forEach(deleteOrder);
}

function deleteSettlement(id) {
  state.settlements = state.settlements.filter((item) => item.id !== id);
  state.stockMovements = state.stockMovements.filter((item) => item.sourceId !== id);
  state.orders.filter((item) => item.sourceId === `settlement:${id}` || item.sourceId === `settlementVat:${id}`).forEach((order) => deleteOrder(order.id));
}

function saveInvoice(data) {
  const accountId = data.accountId;
  const currencyCode = invoiceCurrency({ currency: data.currency });
  const amount = parseAmount(data.invoiceAmount || data.usdAmount || data.amountArs);
  const existing = state.invoices.find((item) => item.id === editingId);
  const sameCurrency = existing && invoiceCurrency(existing) === currencyCode;
  const balance = sameCurrency ? Math.min(invoiceBalance(existing), amount) : amount;
  upsert("invoices", {
    id: editingId || uid(),
    provider: normalizeEntityName(data.provider),
    number: data.number,
    date: data.date,
    dueDate: data.dueDate,
    currency: currencyCode,
    usdAmount: currencyCode === "USD" ? amount : 0,
    balanceUsd: currencyCode === "USD" ? balance : 0,
    amountArs: currencyCode === "ARS" ? amount : 0,
    balanceArs: currencyCode === "ARS" ? balance : 0,
    tcInvoice: currencyCode === "USD" ? parseAmount(data.tcInvoice) : 1,
    accountId,
    activity: normalizeActivity(data.activity || accountActivity(accountId)),
    concept: data.concept || "Compra insumos financiados",
    status: data.status || "pendiente",
    notes: data.notes,
  });
}

function saveEntity(data) {
  const name = normalizeEntityName(data.name);
  if (!name) return;
  const id = editingId || data.id || entityIdForName(name) || stableEntityId(name);
  const aliases = String(data.aliases || "")
    .split(/\r?\n|,/)
    .map(normalizeEntityName)
    .filter(Boolean)
    .filter((alias) => entityKey(alias) !== entityKey(name));
  const entity = {
    id,
    name,
    aliases: [...new Set(aliases)],
    cuit: data.cuit || "",
    phone: data.phone || "",
    contact: data.contact || "",
    notes: data.notes || "",
  };
  const existingIndex = state.entities.findIndex((item) => item.id === id || entityKey(item.name) === entityKey(name));
  if (existingIndex >= 0) state.entities[existingIndex] = markForSyncCollection("entities", { ...state.entities[existingIndex], ...entity }, { force: true });
  else state.entities.push(markForSyncCollection("entities", entity, { force: true }));
  state = attachEntityIds(canonicalizeStateEntities(state));
}

function saveOrder(data) {
  const existingOrder = editingId ? state.orders.find((item) => item.id === editingId) : null;
  const selectedInvoiceIds = data.type === "pago" ? (Array.isArray(data.sourceInvoiceIds) ? data.sourceInvoiceIds : orderInvoiceIds(existingOrder)) : [];
  const sourceId = selectedInvoiceIds.length ? `invoice:${selectedInvoiceIds[0]}` : (data.sourceId || existingOrder?.sourceId || "");
  const source = selectedInvoiceIds.length ? resolveInvoiceSources(selectedInvoiceIds) : resolveSource(sourceId);
  const accountId = data.accountId || source.accountId;
  const activity = normalizeActivity(data.activity || accountActivity(accountId) || source.activity);
  const tcPayment = parseAmount(data.tcPayment);
  const endorsedCheck = state.checks.find((item) => item.id === data.endorsedCheckId);
  const transferAmount = parseAmount(data.transferAmount);
  const currentAccountAmount = parseAmount(data.currentAccountAmount);
  const checksTotal = (data.checks || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paymentComponentsTotal = (data.paymentComponents || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const amountArs = parseAmount(data.amountArs) || transferAmount + currentAccountAmount + checksTotal + paymentComponentsTotal || (data.checkAction === "endosado" ? Number(endorsedCheck?.amount || 0) : 0) || (source.invoice && invoiceCurrency(source.invoice) === "USD" && tcPayment ? source.invoice.balanceUsd * tcPayment : source.amountArs) || 0;
  const id = editingId || uid();
  const order = {
    id,
    orderNumber: existingOrder?.orderNumber || data.orderNumber || nextOrderNumber(data.type, data.date || data.dueDate, id),
    type: data.type,
    date: data.date,
    dueDate: data.dueDate || endorsedCheck?.dueDate || data.date,
    fiscalYear: data.fiscalYear || fiscalYearForDate(data.date || data.dueDate),
    counterparty: normalizeEntityName(data.counterparty || source.counterparty),
    sourceId,
    sourceIds: selectedInvoiceIds,
    sourceLabel: source.label || existingOrder?.sourceLabel,
    receipt: data.receipt || endorsedCheck?.number || source.receipt,
    method: data.method,
    status: data.status || "pendiente",
    amountArs,
    tcPayment,
    accountId,
    activity,
    concept: data.concept || source.concept || data.type,
    checkAction: data.method === "Cheque" || data.method === "E-cheq" || data.method === "Mixto" ? data.checkAction : "",
    checkNumber: data.checkNumber,
    checkAmount: parseAmount(data.checkAmount),
    checkBank: data.checkBank,
    checkCuit: data.checkCuit,
    checkDueDate: data.checkDueDate,
    checks: data.checks || [],
    paymentComponents: data.paymentComponents || [],
    transferAmount,
    transferReceipt: data.transferReceipt,
    currentAccountAmount,
    endorsedCheckId: data.endorsedCheckId,
    notes: data.notes,
  };
  upsert("orders", order);
  applyOrder(order);
  if (orderUsesOwnChecks(order)) reconcileOrderStatusFromChecks(order.id);
  ensureCurrentAccountOrder(order);
  return order;
}

function createFutureOrders(order, futureDues = []) {
  futureDues.forEach((due) => {
    const futureOrder = {
      ...order,
      id: uid(),
      orderNumber: nextOrderNumber(order.type, due.dueDate || order.date),
      date: order.date,
      dueDate: due.dueDate,
      fiscalYear: fiscalYearForDate(due.dueDate || order.date) || order.fiscalYear,
      sourceId: "",
      sourceIds: [],
      sourceLabel: "Vencimiento programado",
      receipt: "",
      method: order.method === "Mixto" ? "" : order.method,
      status: "pendiente",
      amountArs: Number(due.amount || 0),
      tcPayment: 0,
      checkAction: "",
      checkNumber: "",
      checkAmount: 0,
      checkDueDate: "",
      checks: [],
      paymentComponents: [],
      transferAmount: 0,
      transferReceipt: "",
      currentAccountAmount: 0,
      endorsedCheckId: "",
    };
    state.orders.push(markForSyncCollection("orders", futureOrder, { force: true }));
    applyOrder(futureOrder);
  });
}

function ensureCurrentAccountOrder(order) {
  if (order.skipCurrentAccountMirror || order.status === "anulado" || isFinalOrderStatus(order.status)) {
    const existing = state.orders.find((item) => item.sourceId === `currentAccount:${order.id}`);
    if (existing) deleteOrder(existing.id);
    return;
  }
  if (String(order.sourceId || "").startsWith("currentAccount:")) return;
  const sourceId = `currentAccount:${order.id}`;
  const existing = state.orders.find((item) => item.sourceId === sourceId);
  const amountArs = order.type === "pago"
    ? Number(order.method === "cuenta corriente" ? order.amountArs : order.currentAccountAmount || 0)
    : 0;
  if (!amountArs) {
    if (existing) deleteOrder(existing.id);
    return;
  }
  const linked = {
    ...(existing || {}),
    id: existing?.id || uid(),
    orderNumber: existing?.orderNumber || nextOrderNumber("pago", existing?.date || order.date),
    type: "pago",
    date: existing?.date || order.date,
    dueDate: existing?.dueDate || order.dueDate || order.date,
    counterparty: order.counterparty,
    sourceId,
    sourceLabel: `Cuenta corriente de ${order.counterparty}`,
    receipt: existing?.receipt || order.receipt,
    method: existing?.method || "cuenta corriente",
    status: existing?.status || "pendiente",
    amountArs,
    tcPayment: existing?.tcPayment || 0,
    accountId: order.accountId,
    activity: order.activity,
    concept: existing?.concept || `Saldo cuenta corriente - ${order.concept}`,
    notes: existing?.notes || order.notes,
  };
  const synced = markForSyncCollection("orders", linked);
  state.orders = existing ? state.orders.map((item) => (item.id === existing.id ? synced : item)) : [...state.orders, synced];
}

function resolveSource(sourceId) {
  if (!sourceId) return {};
  const [kind, id] = sourceId.split(":");
  if (kind === "invoice") {
    const invoice = state.invoices.find((item) => item.id === id);
    if (!invoice) return {};
    return {
      label: `Factura ${invoice.number}`,
      counterparty: invoice.provider,
      receipt: invoice.number,
      accountId: invoice.accountId,
      activity: invoice.activity,
      concept: invoice.concept,
      amountArs: invoiceArsAmount(invoice),
      invoice,
    };
  }
  if (kind === "settlement") {
    const settlement = state.settlements.find((item) => item.id === id);
    if (!settlement) return {};
    return { label: `Liquidacion ${settlement.product}`, counterparty: settlement.buyer || settlement.stockPlace, accountId: accountByName(settlementAccountName(settlement))?.id, activity: settlementActivity(settlement), concept: `Cobro venta ${settlement.product} sin IVA`, amountArs: settlementCollectionAmount(settlement), settlement };
  }
  return {};
}

function applyOrder(order) {
  state.ledger = state.ledger.filter((item) => {
    if (item.disabledEconomicEffect) return true;
    const orderId = String(item.orderId || "");
    return ![order.id, `order:${order.id}:tax`, `order:${order.id}:vat`, `${order.id}:fx`].includes(orderId)
      && !orderId.startsWith(`order:${order.id}:payment:`)
      && !orderId.startsWith(`order:${order.id}:vat:`)
      && !orderId.startsWith(`order:${order.id}:taxsplit:`)
      && !orderId.startsWith(`${order.id}:fx:`);
  });
  const usesCheck = orderUsesOwnChecks(order) || order.checkAction === "endosado";
  if (!usesCheck) state.checks = state.checks.filter((item) => item.orderId !== order.id);
  if (order.status === "anulado") return;
  if (orderUsesOwnChecks(order)) createCheckFromOrder(order);
  if (!isFinalOrderStatus(order.status)) return;
  state.ledger.push(...ledgerRowsFromOrder(order));
  const chequeEmitidoPagado = order.type === "pago" && usesCheck && order.checkAction !== "endosado";
  const checksHaveOwnTax = linkedOrderChecks(order).length > 0 && order.checkAction !== "endosado";
  const taxableMixedComponents = (Array.isArray(order.paymentComponents) ? order.paymentComponents : [])
    .filter((item) => bankTaxableMethods.includes(item.method))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const taxableAmount = checksHaveOwnTax
    ? (order.method === "Mixto" ? Number(order.transferAmount || 0) + taxableMixedComponents : 0)
    : (order.method === "Mixto"
      ? Number(order.transferAmount || 0) + taxableMixedComponents + (order.type === "pago" ? orderCheckTotal(order) : 0)
      : Number(order.amountArs || 0));
  if (((bankedMethods.includes(order.method) && taxableAmount) || (chequeEmitidoPagado && !checksHaveOwnTax && taxableAmount))) {
    addBankTax({ ...order, date: order.dueDate || order.date, amountArs: taxableAmount }, "order");
  }
  if (usesCheck && order.checkAction === "endosado") endorseCheckFromOrder(order);
  applySourceSettlement(order);
}

function ledgerRowsFromOrder(order) {
  const hasLinkedChecks = linkedOrderChecks(order).length > 0 && order.checkAction !== "endosado";
  const components = orderLedgerComponents(order).filter((component) => !hasLinkedChecks || !isCheckComponent(component));
  if (!components.length) return [];
  const [sourceKind, sourceId] = String(order.sourceId || "").split(":");
  const settlement = sourceKind === "settlement" ? state.settlements.find((item) => item.id === sourceId) : null;
  const ivaCobrar = Math.min(Number(settlement?.ivaCobrar || 0), Number(order.amountArs || 0));
  const total = components.reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(order.amountArs || 0);
  return components.flatMap((component, index) => {
    const base = {
      id: uid(),
      orderId: components.length === 1 ? order.id : `order:${order.id}:payment:${index}`,
      orderNumber: order.orderNumber,
      generated: true,
      sourceType: "order",
      sourceId: order.id,
      date: component.date,
      kind: order.type === "cobro" ? "Cobro" : "Pago",
      type: order.type === "cobro" ? "cobro" : "pago",
      receipt: component.receipt || order.receipt,
      counterparty: order.counterparty,
      concept: order.concept,
      method: component.method,
      activity: order.activity,
      accountId: order.accountId,
      status: order.status,
      amount: component.amount,
      notes: order.notes,
    };
    const invoiceSplitRows = ledgerRowsFromInvoiceTaxBreakdown(order, base, component, components, index);
    if (invoiceSplitRows) return invoiceSplitRows;
    if (!settlement) return [base];
    if (!ivaCobrar) return [{ ...base, concept: `Cobro venta ${settlement.product} sin IVA` }];
    const componentVat = index === components.length - 1
      ? roundMoney(ivaCobrar - components.slice(0, index).reduce((sum, prior) => sum + roundMoney(ivaCobrar * Number(prior.amount || 0) / total), 0))
      : roundMoney(ivaCobrar * Number(component.amount || 0) / total);
    return [
      { ...base, amount: roundMoney(Number(component.amount || 0) - componentVat), concept: `Cobro venta ${settlement.product} sin IVA` },
      {
        ...base,
        id: uid(),
        orderId: `order:${order.id}:vat:${index}`,
        activity: "Impuestos",
        accountId: accountByName("IVA Venta Cereales")?.id || accountByName("IVA")?.id || base.accountId,
        concept: `IVA venta cereal ${settlement.product}`,
        amount: componentVat,
      },
    ];
  });
}

function invoiceForOrder(order) {
  const sourceId = String(order.sourceId || "");
  const invoiceIds = [];
  if (sourceId.startsWith("invoice:")) invoiceIds.push(sourceId.split(":")[1]);
  (Array.isArray(order.sourceIds) ? order.sourceIds : []).forEach((id) => invoiceIds.push(String(id).replace(/^invoice:/, "")));
  return state.invoices.find((item) => invoiceIds.includes(item.id));
}

function ledgerRowsFromInvoiceTaxBreakdown(order, base, component, components, index) {
  if (order.type !== "pago") return null;
  const invoice = invoiceForOrder(order);
  const breakdown = order.taxBreakdown || invoice?.taxBreakdown;
  if (!breakdown) return null;
  const total = components.reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(order.amountArs || 0) || 1;
  const ratio = Number(component.amount || 0) / total;
  const expenseNet = roundMoney(Number(breakdown.expenseNet || 0) * ratio);
  const ivaCredit = roundMoney(Number(breakdown.ivaCredit || 0) * ratio);
  const perceptionIva = roundMoney(Number(breakdown.perceptionIva || 0) * ratio);
  const ivaAccountId = accountByName("IVA")?.id || base.accountId;
  const rows = [];
  if (expenseNet) rows.push({ ...base, amount: expenseNet, concept: breakdown.expenseConcept || base.concept });
  if (ivaCredit) rows.push({
    ...base,
    id: uid(),
    orderId: `order:${order.id}:taxsplit:iva:${index}`,
    activity: "Impuestos",
    accountId: ivaAccountId,
    concept: breakdown.ivaConcept || `IVA credito fiscal ${order.receipt || ""}`.trim(),
    amount: ivaCredit,
  });
  if (perceptionIva) rows.push({
    ...base,
    id: uid(),
    orderId: `order:${order.id}:taxsplit:percepcion:${index}`,
    activity: "Impuestos",
    accountId: ivaAccountId,
    concept: breakdown.perceptionConcept || `Percepcion IVA ${order.receipt || ""}`.trim(),
    amount: perceptionIva,
  });
  if (index === components.length - 1) {
    const assigned = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const diff = roundMoney(Number(component.amount || 0) - assigned);
    if (diff && rows.length) rows[rows.length - 1].amount = roundMoney(Number(rows[rows.length - 1].amount || 0) + diff);
  }
  return rows.length ? rows : null;
}

function orderLedgerComponents(order) {
  return orderFinancialComponents(order);
}

function addBankTax(source, tag) {
  const accountId = accountByName("impuestos debito y credito")?.id || source.accountId;
  state.ledger.push({
    id: uid(),
    orderId: `${tag}:${source.id}:tax`,
    orderNumber: source.orderNumber || "",
    generated: true,
    sourceType: tag,
    sourceId: source.id,
    date: source.date || localToday(),
    kind: "Imp. al cheque",
    type: "pago",
    receipt: source.receipt || source.number,
    counterparty: "ARCA",
    concept: "Imp. al cheque",
    method: source.method || "Banco",
    activity: "Impuestos",
    accountId,
    status: "pagado",
    amount: Math.abs(Number(source.amountArs || source.amount || 0)) * 0.006,
    notes: "",
  });
}

function createCheckFromOrder(order) {
  const checkRows = Array.isArray(order.checks) && order.checks.length
    ? order.checks
    : [{ number: order.checkNumber || order.receipt || "", amount: order.checkAmount || order.amountArs, dueDate: order.checkDueDate || order.dueDate }];
  const bank = order.checkBank || "";
  const cuit = order.checkCuit || "";
  const configuredEmitterCuit = companyEmitterCuit();
  const issued = order.type === "pago";
  const keepNumbers = new Set(checkRows.map((row) => String(row.number || "").trim()).filter(Boolean));
  if (!keepNumbers.size && linkedOrderChecks(order).length) return;
  state.checks = state.checks.filter((item) => item.orderId !== order.id || keepNumbers.has(String(item.number || "").trim()));
  checkRows.forEach((row) => {
    const numberValue = String(row.number || "").trim();
    if (!numberValue) return;
    const existing = state.checks.find((item) => item.orderId === order.id && item.number === numberValue);
    const check = {
      ...(existing || {}),
      id: existing?.id || uid(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      direction: issued ? "emitido" : "recibido",
      status: existing?.status || "pendiente",
      statusDate: existing?.statusDate || "",
      number: numberValue,
      bank: issued ? (bank || defaultIssuedCheckBank) : bank,
      cuit: issued ? (row.cuit || cuit || configuredEmitterCuit) : (row.cuit || cuit),
      dueDate: row.dueDate || order.checkDueDate || order.dueDate,
      counterparty: order.counterparty,
      amount: parseAmount(row.amount) || Number(order.amountArs || 0),
      accountId: order.accountId,
      activity: order.activity,
      concept: order.concept,
      notes: order.notes,
    };
    const synced = markForSyncCollection("checks", check);
    state.checks = existing ? state.checks.map((item) => (item.id === existing.id ? synced : item)) : [...state.checks, synced];
  });
}

function linkStandaloneCheckToOrder(check) {
  if (check.orderId) return check.orderId;
  const expectedType = check.direction === "recibido" ? "cobro" : "pago";
  const amount = Number(check.amount || 0);
  const candidates = state.orders
    .filter((order) => order.type === expectedType && ["Cheque", "E-cheq", "Mixto"].includes(order.method))
    .filter((order) => normalizeName(order.counterparty).toLowerCase() === normalizeName(check.counterparty).toLowerCase())
    .map((order) => {
      const checkRows = Array.isArray(order.checks) ? order.checks : [];
      const numberMatch = order.receipt === check.number || order.checkNumber === check.number || checkRows.some((row) => row.number === check.number);
      const dateMatch = [order.dueDate, order.checkDueDate, ...checkRows.map((row) => row.dueDate)].includes(check.dueDate);
      const amountMatch = Math.abs(Number(order.amountArs || 0) - amount) < 0.01
        || Math.abs(Number(order.checkAmount || 0) - amount) < 0.01
        || checkRows.some((row) => Math.abs(Number(row.amount || 0) - amount) < 0.01);
      const score = (numberMatch ? 4 : 0) + (dateMatch ? 2 : 0) + (amountMatch ? 2 : 0);
      return { order, score };
    })
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score);
  const match = candidates[0]?.order;
  if (!match) return "";
  check.orderId = match.id;
  check.orderNumber = match.orderNumber || check.orderNumber || "";
  return match.id;
}

function reconcileOrderStatusFromChecks(orderId) {
  if (!orderId) return;
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const checks = linkedOrderChecks(order);
  if (!checks.length) return;
  const finalCount = checks.filter((check) => isFinalCheckStatus(check.status)).length;
  const hasOtherPaymentComponents = orderHasNonCheckComponents(order);
  const nextStatus = finalCount === checks.length
    ? (hasOtherPaymentComponents ? "pago parcial" : (order.type === "cobro" ? "cobrado" : "pagado"))
    : finalCount
      ? "pago parcial"
      : "pendiente";
  if (order.status === nextStatus) {
    applyOrder(order);
    return;
  }
  order.status = nextStatus;
  markExistingRecordForSync("orders", order.id);
  applyOrder(order);
}

function reconcileExistingCheckOrders() {
  const before = JSON.stringify({
    orders: state.orders.map((item) => ({ id: item.id, status: item.status })),
    checks: state.checks.map((item) => ({ id: item.id, orderId: item.orderId, status: item.status, statusDate: item.statusDate })),
    ledgerCount: state.ledger.length,
  });
  state.checks.forEach((check) => {
    if (!check.orderId) linkStandaloneCheckToOrder(check);
  });
  state.checks
    .filter((check) => isFinalCheckStatus(check.status))
    .forEach((check) => reconcileOrderStatusFromChecks(check.orderId));
  const after = JSON.stringify({
    orders: state.orders.map((item) => ({ id: item.id, status: item.status })),
    checks: state.checks.map((item) => ({ id: item.id, orderId: item.orderId, status: item.status, statusDate: item.statusDate })),
    ledgerCount: state.ledger.length,
  });
  return before !== after;
}

function endorseCheckFromOrder(order) {
  if (!order.endorsedCheckId) return;
  state.ledger = state.ledger.filter((item) => item.checkId !== order.endorsedCheckId);
  state.checks = state.checks.map((check) => check.id === order.endorsedCheckId ? {
    ...check,
    status: "endosado",
    endorsedTo: order.counterparty,
    endorsedOrderId: order.id,
    activity: order.activity || check.activity,
    accountId: order.accountId || check.accountId,
    concept: order.concept || check.concept,
    notes: order.notes || check.notes,
  } : check);
  markExistingRecordForSync("checks", order.endorsedCheckId);
}

function applySourceSettlement(order) {
  const invoiceIds = orderInvoiceIds(order);
  if (invoiceIds.length) {
    let remainingArs = Number(order.amountArs || 0);
    const coversAll = !remainingArs;
    state.invoices = state.invoices.map((invoice) => {
      if (!invoiceIds.includes(invoice.id)) return invoice;
      let nextInvoice = invoice;
      if (invoiceCurrency(invoice) === "ARS") {
        const paidArs = coversAll ? Number(invoice.balanceArs || 0) : Math.min(Number(invoice.balanceArs || 0), remainingArs);
        remainingArs -= paidArs;
        const balanceArs = Math.max(0, Number(invoice.balanceArs || 0) - paidArs);
        nextInvoice = { ...invoice, balanceArs, status: balanceArs ? "pago parcial" : "pagada" };
        return markForSyncCollection("invoices", nextInvoice);
      }
      const effectiveTc = Number(order.tcPayment || invoice.tcInvoice || 1);
      const paidArs = coversAll ? invoiceArsAmount(invoice) : Math.min(invoiceArsAmount(invoice), remainingArs);
      remainingArs -= paidArs;
      const paidUsd = effectiveTc ? paidArs / effectiveTc : Number(invoice.balanceUsd || 0);
      const balanceUsd = Math.max(0, Number(invoice.balanceUsd || 0) - paidUsd);
      if (order.tcPayment && paidUsd && Number(order.tcPayment) !== Number(invoice.tcInvoice)) {
        const diff = paidUsd * (order.tcPayment - invoice.tcInvoice);
        state.ledger.push({ id: uid(), orderId: `${order.id}:fx:${invoice.id}`, date: order.date, kind: "Nota debito diferencia TC", type: "pago", receipt: invoice.number, counterparty: invoice.provider, concept: "Diferencia de cambio", method: order.method, activity: "Financiero", accountId: accountByName("Diferencias t.c.")?.id || invoice.accountId, status: "pagado", amount: Math.abs(diff), notes: `TC factura ${invoice.tcInvoice} / TC pago ${order.tcPayment}` });
      }
      nextInvoice = { ...invoice, balanceUsd, status: balanceUsd ? "pago parcial" : "pagada" };
      return markForSyncCollection("invoices", nextInvoice);
    });
    return;
  }
  if (!order.sourceId) return;
  const [kind, id] = order.sourceId.split(":");
  if (kind === "invoice") {
    state.invoices = state.invoices.map((invoice) => {
      if (invoice.id !== id) return invoice;
      if (invoiceCurrency(invoice) === "ARS") {
        const paidArs = order.amountArs ? Math.min(Number(invoice.balanceArs || 0), Number(order.amountArs || 0)) : Number(invoice.balanceArs || 0);
        const balanceArs = Math.max(0, Number(invoice.balanceArs || 0) - paidArs);
        return markForSyncCollection("invoices", { ...invoice, balanceArs, status: balanceArs ? "pago parcial" : "pagada" });
      }
      const paidUsd = order.tcPayment ? order.amountArs / order.tcPayment : invoice.balanceUsd;
      const balanceUsd = Math.max(0, Number(invoice.balanceUsd || 0) - paidUsd);
      if (order.tcPayment && order.tcPayment !== invoice.tcInvoice) {
        const diff = paidUsd * (order.tcPayment - invoice.tcInvoice);
        state.ledger.push({ id: uid(), orderId: `${order.id}:fx`, date: order.date, kind: "Nota debito diferencia TC", type: "pago", receipt: invoice.number, counterparty: invoice.provider, concept: "Diferencia de cambio", method: order.method, activity: "Financiero", accountId: accountByName("Diferencias t.c.")?.id || invoice.accountId, status: "pagado", amount: Math.abs(diff), notes: `TC factura ${invoice.tcInvoice} / TC pago ${order.tcPayment}` });
      }
      return markForSyncCollection("invoices", { ...invoice, balanceUsd, status: balanceUsd ? "pago parcial" : "pagada" });
    });
  }
  if (kind === "settlement") {
    state.settlements = state.settlements.map((item) => {
      if (item.id !== id) return item;
      const nextStatus = order.status === "cobrado" ? "cobrado" : item.status;
      if (nextStatus === item.status) return item;
      return markForSyncCollection("settlements", { ...item, status: nextStatus });
    });
  }
}

function saveCheck(data) {
  const accountId = data.accountId;
  const issued = data.direction === "emitido";
  const status = data.status || "pendiente";
  const existing = state.checks.find((item) => item.id === editingId);
  const statusDate = isFinalCheckStatus(status)
    ? (status === existing?.status ? existing.statusDate : localToday())
    : "";
  const check = { id: editingId || uid(), direction: data.direction, status, statusDate, number: data.number, bank: issued ? (data.bank || defaultIssuedCheckBank) : data.bank, cuit: issued ? (data.cuit || companyEmitterCuit()) : data.cuit, dueDate: data.dueDate, counterparty: normalizeEntityName(data.counterparty), amount: parseAmount(data.amount), accountId, activity: normalizeActivity(data.activity || accountActivity(accountId)), concept: data.concept || `Cheque ${data.number}`, notes: data.notes };
  upsert("checks", check);
  applyCheck(check);
}

function applyCheck(check) {
  state.ledger = state.ledger.filter((item) => item.checkId !== check.id && item.orderId !== `check:${check.id}:tax`);
  const effectiveDate = check.statusDate || check.dueDate;
  if (check.status === "pagado" || check.status === "cobrado") {
    const isReceived = check.direction === "recibido";
    state.ledger.push({
      id: uid(),
      checkId: check.id,
      orderNumber: check.orderNumber || state.orders.find((order) => order.id === check.orderId)?.orderNumber || "",
      generated: true,
      sourceType: "check",
      sourceId: check.id,
      date: effectiveDate,
      kind: isReceived ? "Cobro cheque" : "Pago cheque",
      type: isReceived ? "cobro" : "pago",
      receipt: check.number,
      counterparty: check.counterparty,
      concept: check.concept,
      method: isReceived ? "Cheque recibido" : "Cheque emitido",
      activity: check.activity,
      accountId: check.accountId,
      status: isReceived ? "cobrado" : "pagado",
      amount: check.amount,
      notes: check.notes,
    });
    addBankTax({
      ...check,
      date: effectiveDate,
      method: isReceived ? "Cheque recibido" : "Cheque emitido",
      amountArs: check.amount,
    }, "check");
  }
  if (check.status === "depositado") {
    state.ledger.push({ id: uid(), checkId: check.id, orderNumber: check.orderNumber || state.orders.find((order) => order.id === check.orderId)?.orderNumber || "", generated: true, sourceType: "check", sourceId: check.id, date: effectiveDate, kind: "Deposito cheque", type: "cobro", receipt: check.number, counterparty: check.counterparty, concept: check.concept, method: "Cheque", activity: check.activity, accountId: check.accountId, status: "cobrado", amount: check.amount, notes: check.notes });
    addBankTax({ ...check, date: effectiveDate, method: "Deposito cheque", amountArs: check.amount }, "check");
  }
  if (check.status === "endosado") {
    state.ledger.push({ id: uid(), checkId: check.id, orderNumber: check.orderNumber || state.orders.find((order) => order.id === check.orderId)?.orderNumber || "", generated: true, sourceType: "check", sourceId: check.id, date: effectiveDate, kind: "Endoso cheque", type: "pago", receipt: check.number, counterparty: check.counterparty, concept: check.concept, method: "Cheque endosado", activity: check.activity, accountId: check.accountId, status: "pagado", amount: check.amount, notes: check.notes });
  }
}

function saveSettlement(data) {
  const product = normalizeName(data.product);
  const settlement = normalizeSettlement({ id: editingId || uid(), date: data.date, fiscalYear: data.fiscalYear || fiscalYearForDate(data.date), operation: data.operation, buyer: normalizeEntityName(data.buyer), product, campaign: normalizeName(data.campaign), stockPlace: normalizeEntityName(data.stockPlace), noCartaPorte: checkboxValue(data.noCartaPorte), canje: checkboxValue(data.canje), quantity: parseAmount(data.quantity), priceGross: parseAmount(data.priceGross), priceNet: parseAmount(data.priceNet), receivableTotalOverride: parseAmount(data.receivableTotalOverride), status: data.status || "pendiente", notes: data.notes });
  upsert("settlements", settlement);
  removeMatchingManualStockMovement(settlement);
  state.stockMovements = state.stockMovements.filter((item) => item.sourceId !== settlement.id);
  const sign = settlement.operation === "venta" ? -1 : 1;
  state.stockMovements.push(markForSyncCollection("stockMovements", normalizeStockMovement({ id: uid(), sourceId: settlement.id, date: settlement.date, kind: stockKindFor(product, "grano"), activity: settlementActivity(settlement), product: settlement.product, campaign: settlement.campaign, counterparty: settlement.stockPlace || settlement.buyer, reason: settlement.operation, quantity: sign * Math.abs(settlement.quantity), notes: settlement.notes })));
  return settlement;
}

function removeMatchingManualStockMovement(settlement) {
  const sign = settlement.operation === "venta" ? -1 : 1;
  const generated = {
    date: settlement.date,
    reason: settlement.operation,
    product: settlement.product,
    campaign: settlement.campaign,
    counterparty: settlement.stockPlace || settlement.buyer,
    quantity: sign * Math.abs(Number(settlement.quantity || 0)),
  };
  const candidate = state.stockMovements
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.sourceId && stockMovementsRepresentSameOperation(item, generated))
    .sort((a, b) => stockMovementDateDistance(a.item, generated) - stockMovementDateDistance(b.item, generated))[0];
  if (candidate && stockMovementDateDistance(candidate.item, generated) <= 45) {
    state.stockMovements.splice(candidate.index, 1);
  }
}

function checkboxValue(value) {
  return value === true || value === "on" || value === "true";
}

function ensureSettlementOrder(settlement) {
  const sourceId = `settlement:${settlement.id}`;
  const existing = state.orders.find((item) => item.sourceId === sourceId);
  const activity = settlementActivity(settlement);
  const accountId = accountByName(settlementAccountName(settlement))?.id || existing?.accountId || state.accounts[0]?.id;
  const counterparty = settlement.buyer || settlement.stockPlace;
  const order = {
    id: existing?.id || uid(),
    type: "cobro",
    date: existing?.date || settlement.date,
    dueDate: existing?.dueDate || settlement.date,
    fiscalYear: existing?.fiscalYear || settlement.fiscalYear || fiscalYearForDate(settlement.date),
    counterparty,
    sourceId,
    sourceLabel: `Liquidacion ${settlement.product}`,
    receipt: existing?.receipt || "",
    method: settlement.canje ? "Canje" : (existing?.method || ""),
    status: existing?.status || "pendiente",
    amountArs: settlementCollectionAmount(settlement),
    tcPayment: existing?.tcPayment || 0,
    accountId,
    activity,
    concept: existing?.concept && !normalizeName(existing.concept).toLowerCase().startsWith("cobro liquidacion")
      ? existing.concept
      : `Cobro venta ${settlement.product} sin IVA`,
    notes: existing?.notes || settlement.notes || "",
  };
  const synced = markForSyncCollection("orders", order);
  state.orders = existing ? state.orders.map((item) => (item.id === existing.id ? synced : item)) : [...state.orders, synced];
  cleanupDuplicateOrdersForSource(sourceId, order.id);
  return synced;
}

function settlementCollectionAmount(settlement) {
  const manualTotal = roundMoney(settlement.receivableTotalOverride || 0);
  if (manualTotal) return manualTotal;
  if (!settlement.canje) return roundMoney(settlement.receivableTotal || 0);
  return roundMoney(Number(settlement.subtotal || 0)
    + Number(settlement.ivaTotal || 0)
    - Number(settlement.retentionGanancias || 0)
    - Number(settlement.retentionIva || 0));
}

function ensureSettlementVatOrder(settlement) {
  const sourceId = `settlementVat:${settlement.id}`;
  const existing = state.orders.find((item) => item.sourceId === sourceId);
  if (existing) deleteOrder(existing.id);
  return null;
}

function saveStock(data) {
  const stock = normalizeStockMovement({
    id: editingId || uid(),
    date: data.date,
    kind: data.kind,
    activity: normalizeActivity(data.activity),
    product: data.product,
    campaign: data.campaign,
    counterparty: normalizeEntityName(data.counterparty),
    reason: data.reason,
    quantity: parseAmount(data.quantity),
    weightKg: parseAmount(data.weightKg),
    pricePerKg: parseAmount(data.pricePerKg),
    notes: data.notes,
  });
  selectedStockView = stock.kind;
  selectedStockFilter = { kind: stock.kind, product: stock.product };
  upsert("stockMovements", stock);
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".status-select")) return;
  const toolPanel = event.target.closest("[data-tool-panel]");
  if (toolPanel) {
    selectedToolPanel = toolPanel.dataset.toolPanel;
    renderTools();
    return;
  }
  if (event.target.closest("[data-tool-back]")) {
    selectedToolPanel = "";
    renderTools();
    return;
  }
  const stockView = event.target.closest("[data-stock-view]");
  if (stockView) {
    selectedStockView = stockView.dataset.stockView;
    selectedStockFilter = null;
    renderStock();
    return;
  }
  const addOrderDue = event.target.closest("[data-add-order-due]");
  if (addOrderDue) {
    addOrderDueRow();
    return;
  }
  const removeOrderDue = event.target.closest("[data-remove-order-due]");
  if (removeOrderDue) {
    removeOrderDue.closest(".order-due-row")?.remove();
    return;
  }
  const addOrderCheck = event.target.closest("[data-add-order-check]");
  if (addOrderCheck) {
    addOrderCheckRow({ dueDate: $("#modalForm")?.elements?.checkDueDate?.value || $("#modalForm")?.elements?.dueDate?.value || today });
    return;
  }
  const removeOrderCheck = event.target.closest("[data-remove-order-check]");
  if (removeOrderCheck) {
    removeOrderCheck.closest(".multi-check-row")?.remove();
    return;
  }
  const addPaymentComponent = event.target.closest("[data-add-payment-component]");
  if (addPaymentComponent) {
    addOrderPaymentComponentRow();
    return;
  }
  const removePaymentComponent = event.target.closest("[data-remove-payment-component]");
  if (removePaymentComponent) {
    removePaymentComponent.closest(".order-payment-row")?.remove();
    return;
  }
  const activity = event.target.closest("[data-activity-detail]");
  if (activity) {
    selectedActivity = activity.dataset.activityDetail;
    renderActivityDetail();
    return;
  }
  const kpiTarget = event.target.closest("[data-kpi]");
  if (kpiTarget) {
    selectedKpi = selectedKpi === kpiTarget.dataset.kpi ? "" : kpiTarget.dataset.kpi;
    renderDashboard();
    if (selectedKpi) $("#kpiDetailPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  const indicator = event.target.closest("[data-indicator-activity]");
  if (indicator) {
    selectedIndicatorActivity = indicator.dataset.indicatorActivity;
    selectedIndicatorMetric = "";
    renderIndicators();
    return;
  }
  const indicatorMetric = event.target.closest("[data-indicator-metric]");
  if (indicatorMetric) {
    selectedIndicatorMetric = selectedIndicatorMetric === indicatorMetric.dataset.indicatorMetric ? "" : indicatorMetric.dataset.indicatorMetric;
    selectedIndicatorActivity = "";
    renderIndicators();
    return;
  }
  const stockClear = event.target.closest("[data-stock-clear]");
  if (stockClear) {
    selectedStockFilter = null;
    renderStock();
    return;
  }
  const stock = event.target.closest("[data-stock-kind]");
  if (stock) {
    selectedStockFilter = {
      kind: stock.dataset.stockKind,
      product: stock.dataset.stockProduct || "",
      campaign: stock.dataset.stockCampaign || "",
      counterparty: stock.dataset.stockCounterparty || "",
    };
    renderStock();
    return;
  }
  const cashflowExpand = event.target.closest("[data-cashflow-expand]");
  if (cashflowExpand) {
    const group = cashflowExpand.dataset.cashflowExpand;
    selectedCashflowExpandedGroup = selectedCashflowExpandedGroup === group ? "" : group;
    renderCashflow();
    return;
  }
  const cashflowMonth = event.target.closest("[data-cashflow-month]");
  if (cashflowMonth) {
    selectedCashflowMonth = cashflowMonth.dataset.cashflowMonth;
    selectedCashflowGroup = cashflowMonth.dataset.cashflowGroup || "";
    selectedCashflowDirection = cashflowMonth.dataset.cashflowDirection || "";
    renderCashflow();
    $("#cashflowDetail").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const cashflowClear = event.target.closest("[data-cashflow-clear]");
  if (cashflowClear) {
    selectedCashflowMonth = "";
    selectedCashflowGroup = "";
    selectedCashflowDirection = "";
    renderCashflow();
    return;
  }
  const checkStatus = event.target.closest("[data-check-status]");
  if (checkStatus) {
    selectedCheckStatus = checkStatus.dataset.checkStatus;
    renderChecks();
    return;
  }
  const deletion = event.target.closest("[data-delete]");
  if (deletion && confirm("Borrar este registro?")) {
    rememberUndo("borrado de registro");
    beginUserSyncChange();
    if (deletion.dataset.delete === "orders") deleteOrder(deletion.dataset.id);
    else if (deletion.dataset.delete === "settlements") deleteSettlement(deletion.dataset.id);
    else state[deletion.dataset.delete] = state[deletion.dataset.delete].filter((item) => item.id !== deletion.dataset.id);
    save();
    render();
    return;
  }
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    openModal(edit.dataset.edit, edit.dataset.id);
    return;
  }
  const modal = event.target.closest("[data-open-modal]");
  if (modal) openModal(modal.dataset.openModal);
  const nav = event.target.closest("[data-view]");
  if (nav) setView(nav.dataset.view);
});

document.addEventListener("change", (event) => {
  if (event.target.closest("#modalForm") && ["order", "settlement"].includes(modalMode) && event.target.name === "date") {
    syncFiscalYearField();
  }
  if (event.target.closest("#modalForm") && modalMode === "settlement" && ["quantity", "priceGross", "priceNet", "operation", "noCartaPorte", "canje"].includes(event.target.name)) {
    updateSettlementAmounts();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "stock" && ["product", "kind"].includes(event.target.name)) {
    const form = $("#modalForm");
    if (event.target.name === "product") form.elements.kind.value = stockKindFor(form.elements.product.value, form.elements.kind.value);
    updateStockFields();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "settlement" && ["product", "campaign"].includes(event.target.name)) {
    updateSettlementSelectors();
    updateSettlementAmounts();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "settlement" && event.target.name === "stockPlace") {
    const form = $("#modalForm");
    if (form.elements.stockPlace.value) form.elements.buyer.value = form.elements.stockPlace.value;
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "check" && event.target.name === "direction") {
    applyCheckDirectionDefaults();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "invoice" && event.target.name === "currency") {
    updateInvoiceCurrencyFields();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "order" && ["sourceInvoiceIds", "sourceId"].includes(event.target.name)) {
    if (event.target.name === "sourceId" && event.target.value && $("#modalForm").elements.sourceInvoiceIds) {
      [...$("#modalForm").elements.sourceInvoiceIds.options].forEach((option) => option.selected = false);
    }
    updateOrderSourceFields();
    updateOrderCheckFields();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "order" && ["type", "method", "checkAction", "dueDate", "date", "amountArs"].includes(event.target.name)) {
    syncOrderDueDate(event.target);
    if (event.target.name === "date") syncFiscalYearField();
    if (["type", "date"].includes(event.target.name)) updateOrderNumberSuggestion();
    if (event.target.name === "type") updateOrderSourceFields();
    updateOrderCheckFields();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "order" && event.target.name === "checkCuit") {
    syncBlankExtraCheckCuits();
    return;
  }
  if (event.target.closest("#modalForm") && modalMode === "order" && event.target.name === "endorsedCheckId") {
    updateEndorsedCheckFields();
    return;
  }
  const status = event.target.closest("[data-status-collection]");
  if (status) {
    const collection = status.dataset.statusCollection;
    const item = state[collection].find((row) => row.id === status.dataset.statusId);
    if (item) {
      rememberUndo("cambio de estado");
      beginUserSyncChange();
      if (collection === "checks") updateCheckStatus(item, status.value);
      else item.status = status.value;
      markExistingRecordForSync(collection, item.id, { force: true });
      if (collection === "orders") {
        applyOrder(item);
        if (orderUsesOwnChecks(item)) reconcileOrderStatusFromChecks(item.id);
      }
      if (collection === "checks") {
        applyCheck(item);
        reconcileOrderStatusFromChecks(item.orderId || linkStandaloneCheckToOrder(item));
      }
      save();
      render();
    }
    return;
  }
  if (event.target.name === "accountId" && event.target.closest("#modalForm")) {
    const activity = accountActivity(event.target.value);
    if ($("#modalForm").elements.activity && activity) $("#modalForm").elements.activity.value = activity;
  }
});

function syncOrderDueDate(target) {
  const form = $("#modalForm");
  if (modalMode !== "order" || !form.elements.date || !form.elements.dueDate) return;
  if (target.name === "dueDate") {
    orderDueDateAuto = false;
    return;
  }
  if (target.name === "date" && orderDueDateAuto) form.elements.dueDate.value = form.elements.date.value;
}

function setView(view) {
  if (!titles[view]) view = "dashboard";
  selectedView = view;
  if (view === "tools") selectedToolPanel = "";
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === view));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#viewTitle").textContent = titles[view][0];
  $("#viewSubtitle").textContent = titles[view][1];
  $("#invoiceProviderFilterWrap").hidden = view !== "invoices";
  renderDatalists();
  renderTools();
  requestAnimationFrame(updateFixedScrollbars);
}

function clearAllFilters(event) {
  if (event?.preventDefault) event.preventDefault();
  selectedActivity = "";
  selectedKpi = "";
  selectedIndicatorActivity = "";
  selectedIndicatorFiscalYear = "";
  selectedIndicatorMetric = "";
  selectedStockFilter = null;
  selectedStockDate = "";
  selectedCashflowMonth = "";
  selectedCashflowGroup = "";
  selectedCashflowDirection = "";
  selectedCashflowExpandedGroup = "";
  selectedCashflowStatus = "";
  selectedCashflowDetailFilters = {};
  selectedPendingStatus = "";
  selectedPendingDirection = "";
  selectedPendingFilters = {};
  selectedCheckStatus = "todos";
  selectedCheckNumber = "";
  selectedInvoiceProvider = "";
  selectedOrderType = "";
  selectedOrderEntity = "";
  selectedOrderStatus = "";
  selectedOrderFrom = "";
  selectedOrderTo = "";
  selectedLedgerEntity = "";
  selectedLedgerStatus = "";
  selectedLedgerColumns = {};
  selectedSettlementFrom = "";
  selectedSettlementTo = "";
  selectedSettlementBuyer = "";
  selectedSettlementProduct = "";

  [
    "filterFrom", "filterTo", "filterActivity",
    "indicatorFiscalYearFilter",
    "invoiceProviderFilter",
    "orderTypeFilter", "orderEntityFilter", "orderStatusFilter", "orderFromFilter", "orderToFilter",
    "cashflowStatusFilter",
    "pendingStatusFilter", "pendingDirectionFilter",
    "settlementFromFilter", "settlementToFilter", "settlementBuyerFilter", "settlementProductFilter",
    "stockDateFilter",
  ].forEach((id) => {
    const field = $(`#${id}`);
    if (field) field.value = "";
  });
  $$("[data-ledger-filter], [data-cashflow-detail-filter], [data-pending-filter]").forEach((field) => {
    field.value = "";
  });
  render();
}

function clearCashflowDetailFilters() {
  selectedCashflowStatus = "";
  selectedCashflowDetailFilters = {};
  const status = $("#cashflowStatusFilter");
  if (status) status.value = "";
  $$("[data-cashflow-detail-filter]").forEach((field) => {
    field.value = "";
  });
  renderCashflow();
}

function clearPendingFilters() {
  selectedPendingStatus = "";
  selectedPendingDirection = "";
  selectedPendingFilters = {};
  const status = $("#pendingStatusFilter");
  const direction = $("#pendingDirectionFilter");
  if (status) status.value = "";
  if (direction) direction.value = "";
  $$("[data-pending-filter]").forEach((field) => {
    field.value = "";
  });
  renderPending();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sagro-respaldo-${today}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function parseLocalStorageJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { _parseError: true, raw };
  }
}

function exportRawCurrentBackup() {
  const rawState = localStorage.getItem(STORAGE_KEY) || "";
  const parsedState = parseLocalStorageJson(STORAGE_KEY);
  const queue = parseLocalStorageJson(REMOTE_QUEUE_KEY) || [];
  const payload = {
    exportedAt: nowIso(),
    appVersion: {
      pwaCacheVersion: PWA_CACHE_VERSION,
      syncEngineExpectedVersion: SYNC_ENGINE_EXPECTED_VERSION,
    },
    appsScriptUrl: remoteSyncUrl(),
    storageKey: STORAGE_KEY,
    queueKey: REMOTE_QUEUE_KEY,
    state: parsedState,
    rawState,
    queue,
    localSyncLog: Array.isArray(parsedState?.syncLog) ? parsedState.syncLog : [],
    localSyncMeta: {
      deviceId: localStorage.getItem(DEVICE_ID_KEY) || "",
      remoteUpdatedAt: localStorage.getItem(REMOTE_UPDATED_AT_KEY) || "",
      remoteSignature: localStorage.getItem(REMOTE_SIGNATURE_KEY) || "",
      remotePending: localStorage.getItem(REMOTE_PENDING_KEY) || "",
      lastPullAt: localStorage.getItem(REMOTE_LAST_PULL_KEY) || "",
    },
  };
  const dateStamp = today.replaceAll("-", "");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `sagro_admin_respaldo_actual_${dateStamp}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = JSON.parse(reader.result);
    if (parsed._import?.mode === "append" && !confirm("Este archivo esta marcado para agregar datos al estado actual. Para evitar duplicados, conviene importar solo respaldos completos. Continuar agregando?")) return;
    if (parsed._import?.mode !== "append" && stateHasData() && !confirm("Restaurar este respaldo reemplaza toda la base local actual. No se sincronizara automaticamente con Google Sheets. Continuar?")) return;
    rememberUndo("importacion");
    state = parsed._import?.mode === "append" ? appendImport(parsed) : normalize(parsed);
    syncCollections.forEach(markCollectionAsLocalBaseline);
    addSyncLog("restore-json", { record: file.name || "respaldo", origin: "json", destination: "app-local", result: "local-only" });
    setSyncQueue([]);
    saveLocalOnly("Respaldo restaurado localmente. Sin sincronizar.");
    syncCollections.forEach(markCollectionAsLocalBaseline);
    latestSyncAudit = null;
    setSyncQueue([]);
    localStorage.removeItem(REMOTE_PENDING_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  };
  reader.readAsText(file);
}

function setupSyncRetryTriggers() {
  const retry = () => {
    if (!syncQueue().length) return;
    if (syncQueue().length > 25) {
      setSyncStatus("Sync pendiente manual", "error");
      return;
    }
    processSyncQueue({ reason: "retry" }).catch(() => null);
  };
  window.addEventListener("online", retry);
  window.addEventListener("focus", retry);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) retry();
  });
  setTimeout(retry, 1800);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js")
    .then(() => addSyncLog("pwa-service-worker", { origin: "app", destination: "browser", result: "registered" }))
    .catch((error) => addSyncLog("pwa-service-worker", { origin: "app", destination: "browser", result: "error", error: error.message }));
}

function appendImport(next) {
  next = normalize(next);
  const accountMap = {};
  (next.accounts || []).forEach((sourceAccount) => {
    accountMap[sourceAccount.id] = ensureLocalAccount(sourceAccount.name, sourceAccount.activity);
  });
  const remapAccount = (item) => ({ ...item, accountId: accountMap[item.accountId] || item.accountId });
  const appendUnique = (collection, incoming, keyFn, mapper = (item) => item) => {
    const seen = new Set(state[collection].map(keyFn));
    const additions = [];
    incoming.forEach((item) => {
      const mapped = mapper(item);
      const key = keyFn(mapped);
      if (seen.has(key)) return;
      seen.add(key);
      additions.push(mapped);
    });
    state[collection] = [...state[collection], ...additions];
  };
  appendUnique("invoices", next.invoices || [], invoiceKey, remapAccount);
  appendUnique("orders", next.orders || [], orderKey, remapAccount);
  appendUnique("checks", next.checks || [], checkKey, remapAccount);
  appendUnique("settlements", next.settlements || [], settlementKey, normalizeSettlement);
  appendUnique("stockMovements", next.stockMovements || [], stockMovementKey, normalizeStockMovement);
  appendUnique("ledger", next.ledger || [], ledgerKey, remapAccount);
  return normalize(state);
}

function importKey(parts) {
  return parts.map((part) => normalizeName(part).toLowerCase()).join("|");
}

function invoiceKey(item) {
  return importKey([item.provider, item.number, item.date, item.dueDate, item.currency, item.usdAmount, item.balanceUsd, item.amountArs, item.balanceArs, item.tcInvoice, item.concept]);
}

function orderKey(item) {
  return importKey([item.sourceId, Array.isArray(item.sourceIds) ? item.sourceIds.join("|") : item.sourceIds, item.type, item.date, item.dueDate, item.counterparty, item.receipt, item.method, item.amountArs, item.concept]);
}

function checkKey(item) {
  return importKey([item.direction, item.number, item.bank, item.cuit, item.dueDate, item.counterparty, item.amount]);
}

function settlementKey(item) {
  return importKey([item.date, item.operation, item.buyer, item.product, item.campaign, item.stockPlace, item.quantity, item.receivableTotal, item.notes]);
}

function stockMovementKey(item) {
  return importKey([item.date, item.kind, item.product, item.campaign, item.counterparty, item.reason, item.quantity, item.weightKg, item.pricePerKg, item.notes]);
}

function ledgerKey(item) {
  return importKey([item.orderId, item.checkId, item.date, item.kind, item.receipt, item.counterparty, item.concept, item.type, item.amount]);
}

function ensureLocalAccount(name, activity) {
  const existing = state.accounts.find((item) => item.name.toLowerCase() === String(name || "").toLowerCase());
  if (existing) return existing.id;
  const codes = state.accounts.map((item) => Number(item.code)).filter(Number.isFinite);
  const account = { id: uid(), code: String(Math.max(...codes, 0) + 1).padStart(3, "0"), name, activity };
  state.accounts.push(account);
  return account.id;
}

function loadExamples() {
  rememberUndo("carga de ejemplos");
  state = cleanState();
  const byName = Object.fromEntries(state.accounts.map((item) => [item.name, item.id]));
  state.stockMovements.push({ id: uid(), date: today, kind: "grano", activity: "Agricultura", product: "Soja", campaign: "25/26", counterparty: "Acopio Demo", reason: "stock inicial", quantity: 120000, notes: "" });
  state.invoices.push({ id: uid(), provider: "Proveedor Demo Insumos", number: "A-0001", date: today, dueDate: "2026-12-15", currency: "USD", usdAmount: 10000, balanceUsd: 10000, amountArs: 0, balanceArs: 0, tcInvoice: 950, accountId: byName["Semillas"], activity: "Agricultura", concept: "Compra semillas financiada", status: "pendiente", notes: "" });
  state.settlements.push(normalizeSettlement({ id: uid(), date: today, operation: "venta", buyer: "Comprador Demo", product: "Soja", campaign: "25/26", stockPlace: "Acopio Demo", quantity: 30000, priceGross: 316666.67, priceNet: 300000, status: "pendiente", notes: "" }));
  save();
  render();
}

$("#modalForm").addEventListener("submit", handleSubmit);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#duplicateModal").addEventListener("click", duplicateCurrentOrder);
$("#deleteModal").addEventListener("click", () => {
  if (modalMode !== "order" || !editingId) return;
  if (!confirm("Eliminar esta orden?")) return;
  rememberUndo("borrado de orden");
  deleteOrder(editingId);
  save();
  closeModal();
  render();
});
$("#exportData").addEventListener("click", exportJson);
$("#importData").addEventListener("change", (event) => event.target.files[0] && importJson(event.target.files[0]));
$("#exportDataTools")?.addEventListener("click", exportJson);
$("#exportRawCurrentDataTools")?.addEventListener("click", exportRawCurrentBackup);
$("#importDataTools")?.addEventListener("change", (event) => event.target.files[0] && importJson(event.target.files[0]));
$("#companySettingsForm")?.addEventListener("submit", saveCompanySettings);
$("#analyzeSyncDiffs")?.addEventListener("click", analyzeSyncDiffs);
$("#analyzeSyncQueue")?.addEventListener("click", analyzeSyncQueue);
$("#dryRunQueueCleanup")?.addEventListener("click", dryRunQueueCleanup);
$("#dryRunEntityRegistryRepair")?.addEventListener("click", dryRunEntityRegistryRepair);
$("#completeEntityRegistryRepair")?.addEventListener("click", completeEntityRegistryRepair);
$("#applySafeQueueReconciliation")?.addEventListener("click", applySafeQueueReconciliation);
$("#requeuePendingLocal")?.addEventListener("click", requeuePendingLocalRecords);
$("#sendSelectedSync")?.addEventListener("click", sendSelectedSyncRecords);
$("#importSelectedSync")?.addEventListener("click", importSelectedSyncRecords);
$("#resolveSyncConflicts")?.addEventListener("click", resolveSyncConflicts);
$("#loadExamples")?.addEventListener("click", loadExamples);
$("#undoAction")?.addEventListener("click", undoLastChange);
$("#resetClean")?.addEventListener("click", () => {
  if (confirm("Esto borra los datos locales de prueba. Continuar?")) {
    rememberUndo("limpieza de datos");
    state = cleanState();
    save();
    render();
  }
});
$("#clearAllFilters").addEventListener("click", clearAllFilters);
$("#cashflowClearDetailFilters").addEventListener("click", clearCashflowDetailFilters);
$("#pendingClearFilters")?.addEventListener("click", clearPendingFilters);
["filterFrom", "filterTo"].forEach((id) => $(`#${id}`).addEventListener("input", render));
$("#filterActivity").addEventListener("change", render);
$("#indicatorFiscalYearFilter")?.addEventListener("change", (event) => {
  selectedIndicatorFiscalYear = event.target.value;
  render();
});
$("#saveFiscalData")?.addEventListener("click", saveFiscalData);
$("#invoiceProviderFilter").addEventListener("change", (event) => {
  selectedInvoiceProvider = event.target.value;
  renderInvoices();
});
$("#orderTypeFilter").addEventListener("change", (event) => {
  selectedOrderType = event.target.value;
  renderOrders();
});
$("#orderEntityFilter").addEventListener("change", (event) => {
  selectedOrderEntity = event.target.value;
  renderOrders();
});
$("#orderStatusFilter").addEventListener("change", (event) => {
  selectedOrderStatus = event.target.value;
  renderOrders();
});
$("#orderFromFilter").addEventListener("input", (event) => {
  selectedOrderFrom = event.target.value;
  renderOrders();
});
$("#orderToFilter").addEventListener("input", (event) => {
  selectedOrderTo = event.target.value;
  renderOrders();
});
$("#checkNumberSearch")?.addEventListener("input", (event) => {
  selectedCheckNumber = event.target.value;
  renderChecks();
});
$$("[data-ledger-filter]").forEach((field) => {
  field.addEventListener(field.tagName === "SELECT" ? "change" : "input", (event) => {
    selectedLedgerColumns[event.target.dataset.ledgerFilter] = event.target.value;
    renderLedger();
  });
});
$("#cashflowStatusFilter").addEventListener("change", (event) => {
  selectedCashflowStatus = event.target.value;
  renderCashflow();
});
$("#pendingStatusFilter")?.addEventListener("change", (event) => {
  selectedPendingStatus = event.target.value;
  renderPending();
});
$("#pendingDirectionFilter")?.addEventListener("change", (event) => {
  selectedPendingDirection = event.target.value;
  renderPending();
});
$$("[data-cashflow-detail-filter]").forEach((field) => {
  field.addEventListener("input", (event) => {
    selectedCashflowDetailFilters[event.target.dataset.cashflowDetailFilter] = event.target.value;
    renderCashflow();
  });
});
$$("[data-pending-filter]").forEach((field) => {
  field.addEventListener("input", (event) => {
    selectedPendingFilters[event.target.dataset.pendingFilter] = event.target.value;
    renderPending();
  });
});
$("#settlementFromFilter").addEventListener("input", (event) => {
  selectedSettlementFrom = event.target.value;
  renderSettlements();
});
$("#settlementToFilter").addEventListener("input", (event) => {
  selectedSettlementTo = event.target.value;
  renderSettlements();
});
$("#settlementBuyerFilter").addEventListener("change", (event) => {
  selectedSettlementBuyer = event.target.value;
  renderSettlements();
});
$("#settlementProductFilter").addEventListener("change", (event) => {
  selectedSettlementProduct = event.target.value;
  renderSettlements();
});
$("#stockDateFilter").addEventListener("input", (event) => {
  selectedStockDate = event.target.value;
  renderStock();
});
$("#stockDateClear").addEventListener("click", () => {
  selectedStockDate = "";
  $("#stockDateFilter").value = "";
  renderStock();
});
$$("[data-fixed-scroll]").forEach((wrap) => {
  wrap.addEventListener("scroll", (event) => {
    const bar = $(`[data-fixed-scrollbar][data-target="${event.target.id}"]`);
    if (bar && !bar.hidden) bar.scrollLeft = event.target.scrollLeft;
  });
});
$$("[data-fixed-scrollbar]").forEach((bar) => {
  bar.addEventListener("scroll", (event) => {
    const wrap = $(`#${event.target.dataset.target}`);
    if (wrap) wrap.scrollLeft = event.target.scrollLeft;
  });
});
window.addEventListener("resize", updateFixedScrollbars);
$("#syncStatus")?.addEventListener("click", () => {
  setView("tools");
  selectedToolPanel = "sync";
  renderTools();
});

const startupLedgerBeforeRebuild = stateSignature({ ledger: state.ledger });
rebuildGeneratedLedgerFromSources();
state = normalize(state);
const startupLedgerChanged = startupLedgerBeforeRebuild !== stateSignature({ ledger: state.ledger });
const startupChecksReconciled = reconcileExistingCheckOrders();
setStartupTechnicalAdjustmentStatus(startupChecksReconciled || startupLedgerChanged);
registerServiceWorker();
setupSyncRetryTriggers();
render();


