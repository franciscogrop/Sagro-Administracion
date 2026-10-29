const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Core = require('./core');
const Corrections = require('./corrections');
const { JsonPersistenceAdapter, PersistenceConflictError } = require('./persistence-json');
const { createConfiguredFirestoreAdapter } = require('./persistence-firestore');

const PORT = Number(process.env.PORT || 8772);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const PUBLIC_API_PATHS = ['/api/auth/config'];
// Only the files the browser needs. Data, backups, credentials, code history and server code are never served.
const STATIC_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/styles.css', 'styles.css'],
  ['/core.js', 'core.js'],
  ['/corrections.js', 'corrections.js'],
  ['/app.js', 'app.js']
]);

// Firestore holds the real data (it is labelled "demo" only because of its Firebase project), and production is real by definition.
// Actions that replace the whole database are never available there.
function destructiveActionsAllowed(persistence) {
  if (!persistence) return false;
  if (typeof persistence.loadStateAsync === 'function') return false;
  return persistence.environment !== 'production';
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function createPersistence() {
  if (process.env.SAGRO_PERSISTENCE === 'firestore') {
    return createConfiguredFirestoreAdapter({
      environment: process.env.SAGRO_ENV || 'demo',
      Core
    });
  }
  return new JsonPersistenceAdapter({
    root: ROOT,
    environment: process.env.SAGRO_ENV || 'demo',
    Core
  });
}

function authIsRequired() {
  if (process.env.SAGRO_AUTH_REQUIRED === '1') return true;
  return process.env.SAGRO_PERSISTENCE === 'firestore';
}

function csvSet(value) {
  return new Set(String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function firebaseProjectId() {
  return process.env.SAGRO_FIREBASE_DEMO_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'sagro-admin-demo';
}

function firebaseCredentialFromEnv() {
  const admin = require('firebase-admin');
  if (process.env.SAGRO_FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.SAGRO_FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return admin.credential.cert(JSON.parse(json));
  }
  if (process.env.SAGRO_FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.SAGRO_FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  return null;
}

function createFirebaseAuthVerifier() {
  const admin = require('firebase-admin');
  const projectId = firebaseProjectId();
  const credential = firebaseCredentialFromEnv();
  const appName = 'sagro-admin-auth';
  const options = credential ? { projectId, credential } : { projectId };
  const app = admin.apps.find((item) => item.name === appName) || admin.initializeApp(options, appName);
  return {
    verifyIdToken(token) {
      return admin.auth(app).verifyIdToken(token);
    }
  };
}

function createAuth(options = {}) {
  const required = options.required ?? authIsRequired();
  const allowedEmails = options.allowedEmails || csvSet(process.env.SAGRO_AUTH_ALLOWED_EMAILS);
  const allowedUids = options.allowedUids || csvSet(process.env.SAGRO_AUTH_ALLOWED_UIDS);
  return {
    required,
    allowedEmails,
    allowedUids,
    verifier: options.verifier || (required ? createFirebaseAuthVerifier() : null),
    webConfig: firebaseWebConfigFromEnv()
  };
}

function firebaseWebConfigFromEnv() {
  const projectId = firebaseProjectId();
  return {
    apiKey: process.env.SAGRO_FIREBASE_WEB_API_KEY || process.env.FIREBASE_WEB_API_KEY || '',
    projectId,
    authDomain: process.env.SAGRO_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.SAGRO_FIREBASE_AUTH_EMULATOR_HOST || ''
  };
}

function authConfigPayload(auth) {
  return {
    ok: true,
    authRequired: !!auth.required,
    provider: 'email_password',
    firebase: firebaseWebConfigFromEnv()
  };
}

async function requireAuthorizedUser(req, auth) {
  if (!auth?.required) return { uid: 'local', email: 'local' };
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Autenticacion requerida');
    error.statusCode = 401;
    throw error;
  }
  let decoded;
  try {
    decoded = await auth.verifier.verifyIdToken(match[1]);
  } catch (error) {
    const authError = new Error('Token de autenticacion invalido');
    authError.statusCode = 401;
    throw authError;
  }
  const email = String(decoded.email || '').toLowerCase();
  const uid = String(decoded.uid || '').toLowerCase();
  const allowed = (email && auth.allowedEmails.has(email)) || (uid && auth.allowedUids.has(uid));
  if (!allowed) {
    const error = new Error('Usuario autenticado pero no autorizado para SAGRO');
    error.statusCode = 403;
    throw error;
  }
  return { uid: decoded.uid, email: decoded.email || decoded.uid, role: 'admin' };
}

async function loadRecord(persistence) {
  if (typeof persistence.loadStateAsync === 'function') return persistence.loadStateAsync();
  return persistence.loadState();
}

async function checkVersion(persistence, expectedVersion, currentVersion) {
  if (typeof persistence.checkExpectedVersionAsync === 'function') return persistence.checkExpectedVersionAsync(expectedVersion, currentVersion);
  return persistence.checkExpectedVersion(expectedVersion, currentVersion);
}

async function saveRecord(persistence, state, options) {
  if (typeof persistence.saveStateAsync === 'function') return persistence.saveStateAsync(state, options);
  return persistence.saveState(state, options);
}

async function initializeProduction(persistence) {
  if (typeof persistence.initializeProductionAsync === 'function') return persistence.initializeProductionAsync();
  return persistence.initializeProduction();
}

function sendJson(res, status, payload, request = null) {
  sendJsonBody(res, status, JSON.stringify(payload), request);
}

function acceptsGzip(request) {
  return String(request?.headers?.['accept-encoding'] || '').split(',').some((entry) => {
    const [name, ...parameters] = entry.trim().split(';');
    const quality = parameters.find((part) => /^\s*q\s*=/i.test(part));
    return name.trim().toLowerCase() === 'gzip' && (!quality || Number(quality.split('=')[1]) > 0);
  });
}

function sendJsonBody(res, status, body, request = null) {
  const compress = acceptsGzip(request) && (status >= 400 || Buffer.byteLength(body) >= 16_384);
  let encoded = body;
  const compressionStartedAt = Date.now();
  if (compress) {
    try { encoded = zlib.gzipSync(body, { level: zlib.constants.Z_BEST_SPEED }); }
    catch (error) { encoded = body; }
  }
  const compressionMs = Date.now() - compressionStartedAt;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(Buffer.isBuffer(encoded) ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {})
  });
  res.end(encoded);
  return { bytes: Buffer.byteLength(encoded), compressionMs };
}

function isPersistenceUnavailable(error) {
  const code = String(error?.code ?? '').toUpperCase();
  const message = String(error?.message || '');
  return ['4', '8', '14', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'UNAVAILABLE'].includes(code)
    || /RESOURCE_EXHAUSTED|quota exceeded|DEADLINE_EXCEEDED|temporarily unavailable/i.test(message);
}

function stringifyJsonMeasured(payload) {
  const serializeStartedAt = Date.now();
  const measuredBody = JSON.stringify(payload);
  if (payload?.performance) payload.performance.serializeResponseMs = Date.now() - serializeStartedAt;
  if (payload?.performance) payload.performance.responseBytes = Buffer.byteLength(measuredBody);
  const finalPassStartedAt = Date.now();
  const body = JSON.stringify(payload);
  if (payload?.performance) payload.performance.serializeFinalPassMs = Date.now() - finalPassStartedAt;
  return body;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;
    const fail = (message) => {
      if (rejected) return;
      rejected = true;
      const error = new Error(message);
      error.statusCode = 400;
      reject(error);
    };
    req.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > 2_000_000) fail('Payload demasiado grande');
    });
    req.on('end', () => {
      if (rejected) return;
      // A malformed or truncated request must be rejected, never crash the server.
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { fail('Pedido mal formado: no se guardo nada'); }
    });
    req.on('error', (error) => fail(error.message || 'Error de lectura del pedido'));
  });
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function serveFile(req, res) {
  let pathname = '';
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch (error) { pathname = ''; }
  const name = STATIC_FILES.get(pathname);
  if (!name || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Not found');
    return;
  }
  const file = path.join(ROOT, name);
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

function applyBusinessTransaction(before, body, options = {}) {
  if (body.action === 'importArcaPlans') return Core.importArcaPlansTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'taxPaymentPlan') return Core.taxPaymentPlanTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createAgriculturalIncomeProjection') return Core.createAgriculturalIncomeProjectionTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateAgriculturalIncomeProjection') return Core.updateAgriculturalIncomeProjectionTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'deleteAgriculturalIncomeProjection') return Core.deleteAgriculturalIncomeProjectionTransaction(before, body.id, body.user || 'local');
  if (body.action === 'replaceAgriculturalIncomeProjection') return Core.replaceAgriculturalIncomeProjectionTransaction(before, body.id, body.payload || {}, body.user || 'local');
  if (body.action === 'createOrder') return Core.createOrderTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'linkExistingOrder') return Core.linkExistingOrderTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'linkExistingOrders') return Core.linkExistingOrdersTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'cleanupArtificialDocument') return Core.cleanupArtificialDocumentTransaction(before, body.id, body.reason, body.user || 'local');
  if (body.action === 'updateOrder') return Core.updateOrderTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'correctHistoricalOrder') return Core.correctHistoricalOrderTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'editOrderWithInstrument') return Core.editOrderWithInstrumentTransaction(before, body.id, body.payload || {}, body.user || 'local');
  if (body.action === 'addOrderInstruments') return Core.addOrderInstrumentsTransaction(before, body.id, body.payload || {}, body.user || 'local');
  if (body.action === 'createEntity') return Core.createEntityTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'applyCorrection') return Corrections.applyCorrectionTransaction(before, body.id, body.user || 'local');
  if (body.action === 'setFxEstimates') return Core.setFxEstimatesTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'saveNote') return Core.saveNoteTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'deleteNote') return Core.deleteNoteTransaction(before, body.id, body.user || 'local');
  if (body.action === 'createCurrentAccountClosing') return Core.createCurrentAccountClosingTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'ensureFinancialChart') return Core.ensureFinancialChartTransaction(before, body.user || 'local');
  if (body.action === 'updateEntity') return Core.updateEntityTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'mergeEntities') return Core.mergeEntitiesTransaction(before, body.sourceEntityId, body.targetEntityId, body.reason, body.user || 'local');
  if (body.action === 'createDocument') return Core.createDocumentTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateDocument') return Core.updateDocumentTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'correctHistoricalDocument') return Core.correctHistoricalDocumentTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'deleteDocument') return Core.removeDocumentTransaction(before, body.id, body.reason, body.user || 'local');
  if (body.action === 'createFinancialInstitution') return Core.createFinancialInstitutionTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createFinancialAccount') return Core.createFinancialAccountTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateFinancialAccount') return Core.updateFinancialAccountTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'voidRecord') return Core.voidRecordTransaction(before, body.entityType, body.id, body.reason, body.user || 'local');
  if (body.action === 'transitionInstrument') return Core.transitionInstrument(before, body.instrumentId, body.status, body.date, body.user || 'local');
  if (body.action === 'repairInactiveOrderInstrument') return Core.repairInactiveOrderInstrumentTransaction(before, body.instrumentId, body.reason, body.user || 'local');
  if (body.action === 'voidScheduledInstrument') return Core.voidScheduledInstrumentTransaction(before, body.instrumentId, body.reason, body.user || 'local');
  if (body.action === 'reverseRealizedInstrument') return Core.reverseRealizedInstrumentTransaction(before, body.instrumentId, body.reason, body.user || 'local');
  if (body.action === 'updateInstrument') return Core.updateInstrumentTransaction(before, body.instrumentId, body.changes || {}, body.user || 'local');
  if (body.action === 'correctHistoricalInstrument') return Core.correctHistoricalInstrumentTransaction(before, body.instrumentId, body.changes || {}, body.user || 'local');
  if (body.action === 'createBankCharge') return Core.createBankChargeTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createFinancialAdjustment') return Core.createFinancialAdjustmentTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createTaxReimbursement') return Core.createTaxReimbursementTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createTaxPayment') return Core.createTaxPaymentTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createInternalTransfer') return Core.createInternalTransferTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainLocation') return Core.createGrainLocationTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainTransfer') return Core.createGrainTransferTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainForward') return Core.createGrainForwardTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainReferencePrice') return Core.createGrainReferencePriceTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainMovement') return Core.createGrainMovementTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainBarterPayment') return Core.createGrainBarterPaymentTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createDocumentCompensation') return Core.createDocumentCompensationTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createGrainReconciliation') return Core.createGrainReconciliationTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'transitionGrainReconciliation') return Core.transitionGrainReconciliationTransaction(before, body.id, body.payload || {}, body.user || 'local');
  if (body.action === 'editDocumentCompensation') return Core.editDocumentCompensationTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'transitionDocumentCompensation') return Core.transitionDocumentCompensationTransaction(before, body.id, body.payload || {}, body.user || 'local');
  if (body.action === 'correctCollectionAndCompensate') return Core.correctCollectionAndCompensateTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'editDocument') return Core.editDocumentTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'createGrainLiquidation') return Core.createGrainLiquidationTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'correctHistoricalGrainLiquidation') return Core.correctHistoricalGrainLiquidationTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'createLivestockLocation') return Core.createLivestockLocationTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateLivestockLocation') return Core.updateLivestockLocationTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'createLivestockHerd') return Core.createLivestockHerdTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateLivestockHerd') return Core.updateLivestockHerdTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'createLivestockTrade') return Core.createLivestockTradeTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'correctHistoricalLivestockPurchaseCategory') return Core.correctHistoricalLivestockPurchaseCategoryTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'createLivestockBirth') return Core.createLivestockBirthTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createLivestockDeath') return Core.createLivestockDeathTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createLivestockTransfer') return Core.createLivestockTransferTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createLivestockCategoryChange') return Core.createLivestockCategoryChangeTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'updateLivestockCategoryChange') return Core.updateLivestockCategoryChangeTransaction(before, body.id, body.changes || {}, body.user || 'local');
  if (body.action === 'voidLivestockCategoryChange') return Core.voidLivestockCategoryChangeTransaction(before, body.id, body.reason, body.user || 'local');
  if (body.action === 'createLivestockWeighing') return Core.createLivestockWeighingTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'createLivestockReferencePrice') return Core.createLivestockReferencePriceTransaction(before, body.payload || {}, body.user || 'local');
  if (body.action === 'resetDemo') {
    if (!options.allowDestructive) throw forbidden('Restaurar demo esta deshabilitado: esta base contiene datos reales.');
    return Core.demoState();
  }
  throw new Error(`Accion desconocida: ${body.action}`);
}

function stateChangeMetrics(before, after) {
  const beforeCollections = Object.keys(before || {}).filter((key) => Array.isArray(before[key]));
  const afterCollections = Object.keys(after || {}).filter((key) => Array.isArray(after[key]));
  const collections = Array.from(new Set([...beforeCollections, ...afterCollections]));
  let modifiedCollections = 0;
  let modifiedRecords = 0;
  collections.forEach((collection) => {
    const beforeRows = before[collection] || [];
    const afterRows = after[collection] || [];
    const beforeById = new Map(beforeRows.map((row, index) => [row?.id || `__index_${index}`, JSON.stringify(row)]));
    const afterById = new Map(afterRows.map((row, index) => [row?.id || `__index_${index}`, JSON.stringify(row)]));
    let changedHere = 0;
    Array.from(new Set([...beforeById.keys(), ...afterById.keys()])).forEach((id) => {
      if (beforeById.get(id) !== afterById.get(id)) changedHere += 1;
    });
    if (changedHere) {
      modifiedCollections += 1;
      modifiedRecords += changedHere;
    }
  });
  return { modifiedCollections, modifiedRecords };
}

function createdRecordIds(before, after) {
  const created = {};
  Object.entries(after || {}).forEach(([collection, rows]) => {
    if (!Array.isArray(rows) || collection === 'auditLog') return;
    const previous = new Set((before?.[collection] || []).map((row) => row.id));
    const ids = rows.filter((row) => row?.id && !previous.has(row.id)).map((row) => row.id);
    if (ids.length) created[collection] = ids;
  });
  return created;
}

async function handleApi(req, res, persistence = createPersistence()) {
  const auth = arguments.length >= 4 ? arguments[3] : createAuth();
  const requestStartedAt = Date.now();
  try {
    if (req.method === 'GET' && req.url.startsWith('/api/auth/config')) {
      sendJson(res, 200, authConfigPayload(auth), req);
      return;
    }
    const isPublic = PUBLIC_API_PATHS.some((prefix) => req.url.startsWith(prefix));
    const user = isPublic ? null : await requireAuthorizedUser(req, auth);
    const authorizedAt = Date.now();
    if (req.method === 'GET' && req.url.startsWith('/api/state')) {
      const record = await loadRecord(persistence);
      sendJson(res, 200, {
        ok: true,
        state: record.state,
        validation: Core.validateState(record.state),
        sourceOfTruth: record.sourceOfTruth,
        stateVersion: record.stateVersion,
        environment: record.environment,
        schemaVersion: record.schemaVersion,
        destructiveActionsAllowed: destructiveActionsAllowed(persistence)
      }, req);
      return;
    }
    if (req.method === 'POST' && req.url.startsWith('/api/transaction')) {
      const startedAt = Date.now();
      const body = await readBody(req);
      const loadedAt = Date.now();
      const current = await loadRecord(persistence);
      const stateLoadedAt = Date.now();
      const loadStats = persistence.lastReadStats ? { ...persistence.lastReadStats } : {};
      await checkVersion(persistence, body.stateVersion, current.stateVersion);
      const versionCheckedAt = Date.now();
      body.user = user?.email || body.user;
      const after = applyBusinessTransaction(current.state, body, { allowDestructive: destructiveActionsAllowed(persistence) });
      const transactedAt = Date.now();
      const changes = stateChangeMetrics(current.state, after);
      const changesMeasuredAt = Date.now();
      const saved = await saveRecord(persistence, after, { expectedVersion: current.stateVersion, label: body.action, currentRecord: current });
      const savedAt = Date.now();
      const writeStats = persistence.lastWriteStats ? { ...persistence.lastWriteStats } : {};
      const validation = Core.validateState(saved.state);
      const validatedAt = Date.now();
      const performance = {
        readBodyMs: loadedAt - startedAt,
        authMs: authorizedAt - requestStartedAt,
        loadStateMs: stateLoadedAt - loadedAt,
        transactionMs: transactedAt - stateLoadedAt,
        versionCheckMs: versionCheckedAt - stateLoadedAt,
        coreTransactionMs: transactedAt - versionCheckedAt,
        persistMs: savedAt - transactedAt,
        changeMetricsMs: changesMeasuredAt - transactedAt,
        saveRecordMs: savedAt - changesMeasuredAt,
        validateMs: validatedAt - savedAt,
        totalMs: validatedAt - startedAt,
        action: body.action,
        modifiedCollections: changes.modifiedCollections,
        modifiedRecords: changes.modifiedRecords,
        loadMetaMs: loadStats.loadMetaMs ?? null,
        loadCollectionsMs: loadStats.loadCollectionsMs ?? null,
        collectionsRead: loadStats.collectionsRead ?? null,
        docsRead: (loadStats.docsRead ?? 0) + (writeStats.docsRead ?? 0),
        cacheHit: loadStats.cacheHit ?? null,
        cacheMiss: loadStats.cacheMiss ?? null,
        cacheInvalidated: loadStats.cacheInvalidated ?? null,
        fullReadsAvoided: loadStats.fullReadsAvoided ?? null,
        diffMs: writeStats.diffMs ?? null,
        persistValidateMs: writeStats.validateStateMs ?? null,
        partitionStateMs: writeStats.partitionStateMs ?? null,
        transactionMetaReadMs: writeStats.transactionMetaReadMs ?? null,
        transactionMetaWriteMs: writeStats.transactionMetaWriteMs ?? null,
        transactionFinalizeMs: writeStats.transactionFinalizeMs ?? null,
        savedCloneMs: writeStats.savedCloneMs ?? null,
        cacheCloneMs: writeStats.cacheCloneMs ?? null,
        returnCloneMs: writeStats.returnCloneMs ?? null,
        batchBuildMs: writeStats.batchBuildMs ?? null,
        firestoreCommitMs: writeStats.firestoreCommitMs ?? null,
        postPersistReadMs: writeStats.postPersistReadMs ?? null,
        batchesFirestore: writeStats.batches ?? null,
        writesFirestore: writeStats.writes ?? null,
        deletesFirestore: writeStats.deletes ?? null,
        serializeResponseMs: null,
        responseBytes: null,
        createdIdsMs: null,
        responseBuildMs: null
      };
      const responseBuildStartedAt = Date.now();
      const createdIds = createdRecordIds(current.state, saved.state);
      performance.createdIdsMs = Date.now() - responseBuildStartedAt;
      const responsePayload = {
        ok: true,
        state: saved.state,
        createdIds,
        validation,
        sourceOfTruth: saved.sourceOfTruth,
        stateVersion: saved.stateVersion,
        environment: saved.environment,
        schemaVersion: saved.schemaVersion,
        performance
      };
      performance.responseBuildMs = Date.now() - responseBuildStartedAt;
      const responseBody = stringifyJsonMeasured(responsePayload);
      performance.responseBytes = Buffer.byteLength(responseBody);
      const transfer = sendJsonBody(res, 200, responseBody, req);
      performance.transferBytes = transfer.bytes;
      performance.compressionMs = transfer.compressionMs;
      performance.totalThroughSendMs = Date.now() - requestStartedAt;
      if (process.env.SAGRO_PERF_LOG !== '0') {
        console.info('[sagro-api-performance]', JSON.stringify(performance));
      }
      return;
    }
    if (req.method === 'POST' && req.url.startsWith('/api/initialize-production')) {
      const record = await initializeProduction(persistence);
      sendJson(res, 200, { ok: true, ...record, validation: Core.validateState(record.state) }, req);
      return;
    }
    if (req.method === 'POST' && req.url.startsWith('/api/backup')) {
      // The full backup travels back to the browser, which saves it as a file outside the server.
      const backup = typeof persistence.createBackupAsync === 'function'
        ? await persistence.createBackupAsync('manual')
        : persistence.createBackup('manual');
      sendJson(res, 200, { ok: true, backup, environment: persistence.environment }, req);
      return;
    }
    if (req.method === 'POST' && req.url.startsWith('/api/restore')) {
      if (!destructiveActionsAllowed(persistence)) throw forbidden('Restaurar respaldo esta deshabilitado en la base real. Una restauracion debe hacerse de forma controlada.');
      const body = await readBody(req);
      const record = persistence.restoreBackup(body.path);
      sendJson(res, 200, { ok: true, ...record, validation: Core.validateState(record.state) }, req);
      return;
    }
    sendJson(res, 404, { ok: false, error: 'API inexistente' }, req);
  } catch (error) {
    const unavailable = isPersistenceUnavailable(error);
    const status = unavailable ? 503 : (error instanceof PersistenceConflictError ? 409 : (error.statusCode || 400));
    sendJson(res, status, {
      ok: false,
      error: unavailable
        ? 'La base central esta temporalmente no disponible. No se leyeron ni guardaron datos. Reintenta mas tarde.'
        : error.message,
      conflict: status === 409,
      unavailable,
      stateVersion: error.currentVersion
    }, req);
  }
}

function createServer(persistence) {
  const auth = createAuth();
  return http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) handleApi(req, res, persistence, auth);
    else serveFile(req, res);
  });
}

if (require.main === module) {
  const persistence = createPersistence();
  const server = createServer(persistence);
  server.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
    console.log(`SAGRO Admin V1.1 en http://${displayHost}:${PORT}/index.html`);
    console.log(`Ambiente: ${persistence.environment}`);
    console.log(`Fuente de verdad: ${persistence.dbPath || persistence.sourceOfTruth}`);
    console.log('Estado: la base central se valida bajo demanda; sin fallback de datos.');
  });
}

module.exports = {
  createServer,
  createPersistence,
  createAuth,
  destructiveActionsAllowed,
  readBody,
  serveFile,
  requireAuthorizedUser,
  isPersistenceUnavailable,
  applyBusinessTransaction,
  handleApi
};
