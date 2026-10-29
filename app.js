(function () {
  'use strict';

  const Core = window.SagroCore;
  const dateFormatter = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' });

  let state = null;
  let validation = [];
  let stateVersion = null;
  let lastRenderStages = {};
  let persistenceEnvironment = '';
  let realDataBase = false;
  let selectedTrace = null;
  let entityCcView = { entityId: '', currency: 'ARS', type: '', status: '', dateFrom: '', dateTo: '' };
  let monthDetail = null;
  let panelUpcomingDetailTarget = null;
  let panelUpcomingDetailMode = 'pending';
  let panelUpcomingWindows = [];
  let orderDetailReturn = null;
  let documentFormMode = { mode: 'create', lastSavedDocumentId: '' };
  let orderFormMode = { mode: 'create', sourceDocumentId: '', orderId: '' };
  let writeInProgress = false;
  let uncertainWrite = false;
  let documentSaveUncertain = false;
  let documentVerificationInProgress = false;
  let documentSubmissionId = '';
  let pendingDateAction = null;
  let pendingInstrumentVerification = null;
  let pendingEditAction = null;
  let editActionSubmit = null;
  let dateActionSubmit = null;
  const pendingSaves = new WeakSet();
  const criticalDisabledStates = new Map();
  const expandedTreeKeys = new Set();
  const UI_PREFS_KEY = 'sagro-admin-v1-ui-preferences';
  const AUTH_TOKEN_KEY = 'sagro-admin-v1-auth-token';
  const AUTH_EMAIL_KEY = 'sagro-admin-v1-auth-email';
  const AUTH_REFRESH_KEY = 'sagro-admin-v1-auth-refresh';
  const UNCERTAIN_DOCUMENT_KEY = 'sagro-admin-v1-uncertain-document';
  const TRANSACTION_TIMEOUT_MS = 60000;
  let authRefreshPromise = null;
  let uiPrefs = loadUiPrefs();
  let authConfig = { authRequired: false, firebase: {} };
  let grainNetManualOverride = false;
  let grainVatManualOverride = false;
  let grainCommissionManualOverride = false;
  let grainCommissionVatManualOverride = false;
  let grainTotalManualOverride = false;
  let livestockNetManualOverride = false;
  let livestockVatManualOverride = false;
  let livestockCommissionManualOverride = false;
  let livestockCommissionVatManualOverride = false;
  let livestockTotalManualOverride = false;
  let documentVatManualOverride = false;
  let documentCalculationSource = 'net';
  let instrumentRowTemplate = null;
  let grainEntityTouched = false;
  const HELP_TEXTS = {
    dueDate: 'Fecha en la que esperas cobrar o pagar si no se cancela hoy.',
    commercialCondition: 'Indica si queda pendiente comercialmente o se cancela en esta operacion.',
    plannedMethod: 'Medio previsto para cancelar; no cambia la imputacion economica.',
    netTaxed: 'Importe economico gravado antes de IVA, retenciones y deducciones.',
    vatRate: 'Alicuota usada solo para calcular el IVA cuando corresponde.',
    vatAmount: 'IVA informado en el comprobante o liquidacion; puede ajustarse manualmente.',
    commissionPercent: 'Porcentaje usado para calcular la comision sobre el neto.',
    commissionAmount: 'Importe de comision; en compra de hacienda suma y en venta resta.',
    commissionVat: 'IVA aplicado sobre la comision cuando figure separado.',
    commissionVatRate: 'Alicuota propia de la comision, independiente del IVA de la hacienda.',
    vatAdjustment: 'Compra: percepcion incluida y suma. Venta: retencion sufrida y resta.',
    iibbAdjustment: 'Compra: percepcion incluida y suma. Venta: retencion sufrida y resta.',
    incomeWithholding: 'Retencion de Ganancias cuando figure en el comprobante; en ventas resta del cobro.',
    otherDeductions: 'Otros gastos o deducciones documentadas, sin inventar conceptos fiscales.',
    documentTotal: 'Total real del comprobante. Puede diferir del calculado y queda advertido.',
    totalCollectPay: 'Total real a cobrar o pagar, editable si el comprobante final difiere.',
    grainLocation: 'Lugar fisico, acopio o empresa receptora del cereal.',
    herd: 'Grupo fisico de animales que conserva su historial.',
    fieldDestination: 'Campo, corral o ubicacion donde entra o sale la hacienda.',
    kgTotal: 'Cantidad total de kilos informada por comprobante, pesada o movimiento.',
    priceKg: 'Precio unitario por kilo vivo o liquidado.',
    priceTon: 'Precio unitario por tonelada de cereal.'
  };

  function loadUiPrefs() {
    try {
      return JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{"columnWidths":{}}');
    } catch (error) {
      return { columnWidths: {} };
    }
  }

  function saveUiPrefs() {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiPrefs));
  }

  function formatMoney(value, currency) {
    const prefix = currency === 'USD' ? 'US$' : '$';
    // Money always shows cents: "$ 1.478.518,40", never "$ 1.478.518,4".
    const number = Number(value || 0);
    const hasCents = Math.abs(Math.round(number * 100) % 100) > 0;
    return `${prefix} ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 }).format(number)}`;
  }

  function formatFlowMoney(value, currency) {
    const prefix = currency === 'USD' ? 'US$' : '$';
    return `${prefix} ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;
  }

  function formatKg(value) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value || 0);
  }

  function formatDecimal(value, digits = 2) {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value || 0);
  }

  function parseLocaleNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const cleaned = raw.replace(/\s/g, '').replace(/US\$|\$/gi, '');
    if (!/^-?\d[\d.,]*$/.test(cleaned)) return NaN;
    const unsigned = cleaned.replace(/^-/, '');
    const separator = decimalSeparatorIndex(unsigned);
    const integer = separator < 0 ? unsigned : unsigned.slice(0, separator);
    const fraction = separator < 0 ? '' : unsigned.slice(separator + 1);
    const grouping = separator < 0 || unsigned[separator] === ',' ? '.' : ',';
    const groups = integer.split(grouping);
    if (!groups[0] || !/^\d+$/.test(groups[0]) || groups.slice(1).some((group) => !/^\d{3}$/.test(group)) ||
        (groups.length > 1 && groups[0].length > 3) || !/^\d*$/.test(fraction)) return NaN;
    const normalized = `${cleaned.startsWith('-') ? '-' : ''}${groups.join('')}${separator < 0 ? '' : `.${fraction}`}`;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function decimalSeparatorIndex(raw) {
    const comma = raw.lastIndexOf(',');
    const dot = raw.lastIndexOf('.');
    if (comma >= 0) return Math.max(comma, dot);
    if (dot < 0) return -1;
    if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(raw)) return -1;
    return dot;
  }

  function formatArgentineMoneyInput(value) {
    const raw = String(value ?? '').replace(/[^\d,.-]/g, '').replace(/-/g, '');
    if (!raw) return '';
    const separator = decimalSeparatorIndex(raw);
    const integerRaw = (separator >= 0 ? raw.slice(0, separator) : raw).replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
    const decimals = separator >= 0 ? raw.slice(separator + 1).replace(/\D/g, '').slice(0, 2) : '';
    const integer = integerRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return separator >= 0 ? `${integer},${decimals}` : integer;
  }

  function editableLocaleNumberText(value, decimalMark) {
    const raw = String(value ?? '').trim().replace(/\s/g, '').replace(/US\$|\$/gi, '');
    if (!Number.isFinite(parseLocaleNumber(raw))) return raw;
    const sign = raw.startsWith('-') ? '-' : '';
    const unsigned = sign ? raw.slice(1) : raw;
    const separator = decimalSeparatorIndex(unsigned);
    const grouping = separator < 0 || unsigned[separator] === ',' ? '.' : ',';
    const integer = (separator < 0 ? unsigned : unsigned.slice(0, separator)).split(grouping).join('');
    return `${sign}${integer}${separator < 0 ? '' : decimalMark + unsigned.slice(separator + 1)}`;
  }

  function wireMoneyInput(input) {
    if (!input || input.dataset.moneyWired === 'true') return;
    // A unit price calculated from an exact net amount must retain all its decimals.
    if (input.id === 'livestockOpPriceKg') return;
    if (input.type === 'date' || input.type === 'hidden' || /(?:Rate|Percent|Percentage)$/.test(input.id || '')) return;
    input.dataset.moneyWired = 'true';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.addEventListener('focus', () => {
      input.value = editableLocaleNumberText(input.value, ',');
    });
    input.addEventListener('input', () => {
      // Grouping while typing turns a growing integer (3081 -> 3.081 -> 3.0816)
      // into an apparent decimal. Apply grouping only after editing finishes.
      const cleaned = input.value.replace(/[^\d.,]/g, '');
      if (input.value !== cleaned) input.value = cleaned;
    });
    input.addEventListener('blur', () => {
      const number = parseLocaleNumber(input.value);
      if (Number.isFinite(number)) input.value = input.id?.startsWith('doc') ? new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number) : formatDecimal(number, 2);
    });
  }

  function wireDecimalNumberInput(input) {
    if (!input || input.type !== 'number' || input.dataset.decimalWired === 'true') return;
    const step = input.getAttribute?.('step') || input.step;
    if (step !== 'any' && !(Number(step) > 0 && Number(step) < 1)) return;
    input.dataset.decimalWired = 'true';
    input.type = 'text';
    input.inputMode = 'decimal';
    input.pattern = '-?[0-9]+(\\.[0-9]+)?';
    input.addEventListener('input', () => {
      if (!input.value.includes(',')) return;
      input.value = editableLocaleNumberText(input.value, '.');
    }, true);
  }

  function wireMoneyInputs(root = document) {
    if (!root?.querySelectorAll) return;
    setupFiscalDisclosures(root);
    root.querySelectorAll('input[data-money-input="true"], input[id*="Amount"], input[id*="Price"], input[id*="Commissions"], input[id*="Expense"], input[id*="Withholding"], #reconcileReported, #financialProductOpeningBalance, #financialProductLimit, [data-field="amount"]').forEach(wireMoneyInput);
    root.querySelectorAll('input[type="number"]').forEach(wireDecimalNumberInput);
  }

  function fiscalInputHasValue(input) {
    const key = input.id || input.name || input.dataset.retentionField || '';
    return !/date|reference/i.test(key) && Number.isFinite(parseLocaleNumber(input.value)) && parseLocaleNumber(input.value) !== 0;
  }

  function syncFiscalDisclosure(panel, reset = false) {
    const count = [...panel.querySelectorAll('input')].filter(fiscalInputHasValue).length;
    const summary = panel.querySelector('summary');
    if (summary) {
      summary.dataset.fiscalLabel ||= summary.textContent;
      summary.textContent = `${summary.dataset.fiscalLabel}${count ? ` (${count} con importe)` : ''}`;
    }
    if (count || reset) panel.open = count > 0;
  }

  function syncFiscalDisclosures(root = document, reset = false) {
    root?.querySelectorAll('[data-fiscal-disclosure]').forEach((panel) => syncFiscalDisclosure(panel, reset));
  }

  function setupFiscalDisclosures(root = document) {
    const groups = new Map();
    root.querySelectorAll('input').forEach((input) => {
      if (!/withholding|perception|otherDeductions/i.test(input.id || input.name || '')) return;
      if (input.closest('[data-fiscal-disclosure]')) return;
      const label = input.closest('label');
      if (!label) return;
      const parent = label.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(label);
    });
    groups.forEach((labels, parent) => {
      const panel = document.createElement('details');
      panel.className = 'fiscal-disclosure';
      panel.dataset.fiscalDisclosure = 'true';
      for (const key of ['grainModes', 'livestockModes']) {
        if (labels.every((label) => label.dataset[key] === labels[0].dataset[key]) && labels[0].dataset[key]) panel.dataset[key] = labels[0].dataset[key];
      }
      const summary = document.createElement('summary');
      summary.textContent = 'Retenciones / percepciones / deducciones';
      const grid = document.createElement('div');
      grid.className = 'form-grid';
      parent.insertBefore(panel, labels[0]);
      panel.append(summary, grid);
      labels.forEach((label) => grid.appendChild(label));
    });
    root.querySelectorAll('[data-fiscal-disclosure]').forEach((panel) => {
      if (!panel.dataset.fiscalWired) {
        panel.dataset.fiscalWired = 'true';
        panel.addEventListener('input', () => syncFiscalDisclosure(panel));
      }
      syncFiscalDisclosure(panel);
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    return dateFormatter.format(new Date(`${iso}T00:00:00Z`));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function labelForType(value) {
    return Core.labelForType(value);
  }

  function labelForStatus(value) {
    return Core.labelForStatus(value);
  }

  function orderDisplayCode(orderOrId) {
    return Core.orderDisplayCode(state, orderOrId);
  }

  function instrumentDisplayName(instrumentOrId) {
    return Core.instrumentDisplayName(state, instrumentOrId);
  }

  function moneyClass(value) {
    if (value > 0) return 'amount positive';
    if (value < 0) return 'amount negative';
    return 'amount neutral';
  }

  function flowVisualCategory(row) {
    if (row.source === 'agricultural-income-projection') return 'Agricultura';
    const text = `${row.activity || ''} ${row.chartPath || ''} ${row.concept || ''} ${row.detail || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\bsin\s+iva\b/g, '');
    if (text.includes('iva') || text.includes('retencion') || text.includes('percepcion') || text.includes('reintegro') || text.includes('impuesto')) return 'Fiscal';
    if (text.includes('aporte') || text.includes('socio') || text.includes('prestamo') || text.includes('financ')) return 'Aportes / Financiamiento';
    if (row.activity === 'Agricultura' || row.activity === 'Ganaderia' || row.activity === 'Estructura/Admin') return row.activity;
    if (row.direction === 'in') return 'Otros ingresos';
    return 'Otros egresos';
  }

  function actualActivityFilterForVisual(visualCategory, rowActivity) {
    return Core.ACTIVITIES.includes(visualCategory) ? visualCategory : (rowActivity || '');
  }

  async function refreshAuthToken() {
    if (authRefreshPromise) return authRefreshPromise;
    authRefreshPromise = (async () => {
      const refreshToken = sessionStorage.getItem(AUTH_REFRESH_KEY);
      if (!refreshToken) throw Object.assign(new Error('La sesion vencio. Inicia sesion nuevamente; tus valores permanecen en el formulario.'), { auth: true });
      const config = authConfig.firebase;
      const host = config.authEmulatorHost ? `http://${config.authEmulatorHost}/securetoken.googleapis.com` : 'https://securetoken.googleapis.com';
      const response = await fetch(`${host}/v1/token?key=${encodeURIComponent(config.apiKey || '')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.id_token) throw Object.assign(new Error('No se pudo renovar la sesion. Inicia sesion nuevamente.'), { auth: true });
      // A logout while renewal is in flight must not restore the session.
      if (sessionStorage.getItem(AUTH_REFRESH_KEY) !== refreshToken) throw Object.assign(new Error('Sesion cerrada.'), { auth: true });
      sessionStorage.setItem(AUTH_TOKEN_KEY, payload.id_token);
      sessionStorage.setItem(AUTH_REFRESH_KEY, payload.refresh_token || refreshToken);
    })();
    try { await authRefreshPromise; } finally { authRefreshPromise = null; }
  }

  async function api(path, options = {}, retried = false, timing = null) {
    const skipAuth = !!options.skipAuth;
    const headers = { 'Content-Type': 'application/json', ...(options?.headers || {}) };
    if (!skipAuth && authConfig.authRequired) {
      const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        const authError = new Error('Iniciá sesión para acceder a la base.');
        authError.auth = true;
        throw authError;
      }
      headers.Authorization = `Bearer ${token}`;
    }
    const transactionWrite = path === '/api/transaction' && options.method === 'POST';
    const controller = transactionWrite && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), TRANSACTION_TIMEOUT_MS) : null;
    let response, text;
    try {
      const requestStartedAt = Date.now();
      response = await fetch(path, { ...options, headers, ...(controller ? { signal: controller.signal } : {}) });
      if (timing) timing.waitForHeadersMs = (timing.waitForHeadersMs || 0) + Date.now() - requestStartedAt;
      if (response.status === 401 && !skipAuth && authConfig.authRequired && !retried) {
        const refreshStartedAt = Date.now();
        await refreshAuthToken();
        if (timing) timing.authRefreshMs = Date.now() - refreshStartedAt;
        return api(path, options, true, timing);
      }
      const bodyStartedAt = Date.now();
      text = await response.text();
      if (timing) timing.responseBodyMs = (timing.responseBodyMs || 0) + Date.now() - bodyStartedAt;
      if (timing) timing.responseChars = text.length;
    } catch (error) {
      if (!transactionWrite || response?.status === 401) throw error;
      const uncertain = new Error('No llegó la confirmación del servidor. El guardado puede haberse realizado. Verificá la base antes de intentar otra escritura.');
      uncertain.uncertainWrite = true;
      throw uncertain;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    let payload;
    const parseStartedAt = Date.now();
    try {
      payload = JSON.parse(text);
      if (timing) timing.parseResponseMs = (timing.parseResponseMs || 0) + Date.now() - parseStartedAt;
    } catch (error) {
      const apiError = new Error(
        !text.trim()
          ? 'El servidor no devolvio una respuesta. La operacion puede haber quedado confirmada: recarga la base antes de volver a intentarla.'
          : `El servidor devolvio una respuesta no valida (HTTP ${response.status}). Recarga la base antes de reintentar.`
      );
      apiError.uncertainWrite = options.method === 'POST';
      throw apiError;
    }
    if (!payload.ok) {
      const rawMessage = payload.error || 'Error de API';
      const quotaExceeded = /RESOURCE_EXHAUSTED|quota exceeded/i.test(rawMessage);
      const apiError = new Error(quotaExceeded
        ? 'Firebase alcanzo temporalmente su limite de uso. No se confirmo el guardado; espera y recarga la base antes de reintentar.'
        : rawMessage);
      apiError.conflict = !!payload.conflict || response.status === 409;
      apiError.stateVersion = payload.stateVersion;
      apiError.auth = response.status === 401 || response.status === 403;
      apiError.quotaExceeded = quotaExceeded;
      throw apiError;
    }
    return payload;
  }

  async function apiPost(path, body, timing = null) {
    return api(path, { method: 'POST', body: JSON.stringify(body || {}) }, false, timing);
  }

  async function load() {
    let payload;
    try {
      payload = await api('/api/state');
    } catch (error) {
      if (error.auth) throw error;
      throw new Error(`No se pudo cargar la base central: ${error.message}`);
    }
    state = payload.state;
    validation = payload.validation || [];
    stateVersion = payload.stateVersion;
    persistenceEnvironment = payload.environment || '';
    realDataBase = payload.destructiveActionsAllowed === false;
    applyDestructiveActionsVisibility(payload.destructiveActionsAllowed === true);
    try {
      render();
      cleanDocumentForm();
      cleanOrderForm();
      const unresolvedId = sessionStorage.getItem(UNCERTAIN_DOCUMENT_KEY);
      if (unresolvedId) {
        documentSubmissionId = unresolvedId;
        documentSaveUncertain = true;
        uncertainWrite = true;
        document.getElementById('documentFormPanel')?.classList.remove('hidden');
        showDocumentSaveUncertain();
      }
    } catch (error) {
      throw new Error(`No se pudo inicializar la interfaz: ${error.message}`);
    }
  }

  async function postTransaction(body) {
    if (uncertainWrite) throw new Error('Hay un guardado sin confirmación. Verificá la base antes de iniciar otra operación.');
    if (writeInProgress) throw new Error('Ya hay una operacion guardandose. Esperá a que termine.');
    writeInProgress = true;
    setCriticalActionsDisabled(true);
    const startedAt = Date.now();
    try {
      const apiTiming = {};
      const payload = await apiPost('/api/transaction', { ...body, stateVersion }, apiTiming);
      const requestMs = Date.now() - startedAt;
      state = payload.state;
      validation = payload.validation || [];
      stateVersion = payload.stateVersion;
      persistenceEnvironment = payload.environment || persistenceEnvironment;
      const renderStartedAt = Date.now();
      try { render(); }
      catch (error) {
        const confirmed = new Error('El servidor confirmó el guardado, pero la pantalla no pudo actualizarse. Recargá la base; no vuelvas a guardar esta operación.');
        confirmed.saved = true;
        confirmed.createdIds = payload.createdIds;
        throw confirmed;
      }
      console.info('[sagro-save-performance]', JSON.stringify({ action: body.action, requestMs, ...apiTiming, renderMs: Date.now() - renderStartedAt,
        renderStagesMs: lastRenderStages,
        serverTotalMs: payload.performance?.totalMs ?? null, serverLoadMs: payload.performance?.loadStateMs ?? null,
        serverAuthMs: payload.performance?.authMs ?? null, serverCoreTransactionMs: payload.performance?.coreTransactionMs ?? null,
        serverChangeMetricsMs: payload.performance?.changeMetricsMs ?? null, serverSaveRecordMs: payload.performance?.saveRecordMs ?? null,
        serverPersistValidateMs: payload.performance?.persistValidateMs ?? null,
        serverPartitionStateMs: payload.performance?.partitionStateMs ?? null,
        serverDiffMs: payload.performance?.diffMs ?? null,
        serverTransactionMetaReadMs: payload.performance?.transactionMetaReadMs ?? null,
        serverTransactionFinalizeMs: payload.performance?.transactionFinalizeMs ?? null,
        serverSavedCloneMs: payload.performance?.savedCloneMs ?? null,
        serverCacheCloneMs: payload.performance?.cacheCloneMs ?? null,
        serverReturnCloneMs: payload.performance?.returnCloneMs ?? null,
        serverValidateMs: payload.performance?.validateMs ?? null,
        serverResponseBuildMs: payload.performance?.responseBuildMs ?? null,
        serverResponseBytes: payload.performance?.responseBytes ?? null,
        serverPersistMs: payload.performance?.persistMs ?? null, serverSerializeMs: payload.performance?.serializeResponseMs ?? null,
        serverCacheHit: payload.performance?.cacheHit ?? null, serverDocsRead: payload.performance?.docsRead ?? null,
        serverFirestoreCommitMs: payload.performance?.firestoreCommitMs ?? null,
        serverWrites: payload.performance?.writesFirestore ?? null }));
      return payload;
    } catch (error) {
      if (error.uncertainWrite) uncertainWrite = true;
      if (error.saved) throw error;
      if (error.conflict) {
        await reloadCentralState();
        throw new Error('La informacion cambio en otra sesion. No se guardo tu operacion. Revisá la pantalla actualizada y volvé a intentarlo si corresponde.');
      }
      if (error.auth) {
        clearAuthSession();
        showAuthPanel(error.message);
      }
      throw error;
    } finally {
      if (uncertainWrite) console.warn('[sagro-save-performance]', JSON.stringify({ action: body.action, result: 'uncertain', elapsedMs: Date.now() - startedAt }));
      writeInProgress = false;
      setCriticalActionsDisabled(false);
    }
  }

  async function reloadCentralState() {
    const payload = await api('/api/state');
    state = payload.state;
    validation = payload.validation || [];
    stateVersion = payload.stateVersion;
    persistenceEnvironment = payload.environment || persistenceEnvironment;
    render();
  }

  async function configureAuth() {
    authConfig = await api('/api/auth/config', { skipAuth: true });
    if (!authConfig.authRequired) {
      updateAuthStatus('Sesion local', false);
      return true;
    }
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      showAuthPanel();
      return false;
    }
    updateAuthStatus(sessionStorage.getItem(AUTH_EMAIL_KEY) || 'Usuario autorizado', true);
    return true;
  }

  function setupAuthEvents() {
    document.getElementById('authForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await signIn();
        hideAuthPanel();
        await load();
      } catch (error) {
        showAuthPanel(error.message);
      }
    });
    document.getElementById('signOut')?.addEventListener('click', () => {
      clearAuthSession();
      showAuthPanel('Sesion cerrada.');
    });
  }

  async function signIn() {
    if (!authConfig.firebase?.apiKey) throw new Error('Falta configurar SAGRO_FIREBASE_WEB_API_KEY para iniciar sesion.');
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const endpoint = firebasePasswordEndpoint(authConfig.firebase);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(authErrorMessage(payload?.error?.message));
    sessionStorage.setItem(AUTH_TOKEN_KEY, payload.idToken);
    if (payload.refreshToken) sessionStorage.setItem(AUTH_REFRESH_KEY, payload.refreshToken);
    else sessionStorage.removeItem(AUTH_REFRESH_KEY);
    sessionStorage.setItem(AUTH_EMAIL_KEY, payload.email || email);
    updateAuthStatus(payload.email || email, true);
  }

  function firebasePasswordEndpoint(firebaseConfig) {
    const key = encodeURIComponent(firebaseConfig.apiKey || '');
    if (firebaseConfig.authEmulatorHost) {
      return `http://${firebaseConfig.authEmulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`;
    }
    return `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`;
  }

  function authErrorMessage(code) {
    const messages = {
      EMAIL_NOT_FOUND: 'Usuario o contraseña incorrectos.',
      INVALID_PASSWORD: 'Usuario o contraseña incorrectos.',
      INVALID_LOGIN_CREDENTIALS: 'Usuario o contraseña incorrectos.',
      USER_DISABLED: 'El usuario esta deshabilitado.',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Probá nuevamente mas tarde.'
    };
    return messages[code] || 'No se pudo iniciar sesion.';
  }

  function clearAuthSession() {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_EMAIL_KEY);
    sessionStorage.removeItem(AUTH_REFRESH_KEY);
    updateAuthStatus('Sin sesion', false);
  }

  function showAuthPanel(message = '') {
    document.body.classList.add('auth-locked');
    document.getElementById('authPanel')?.classList.remove('hidden');
    const error = document.getElementById('authError');
    if (error) error.textContent = message;
    updateAuthStatus('Sin sesion', false);
  }

  function hideAuthPanel() {
    document.body.classList.remove('auth-locked');
    document.getElementById('authPanel')?.classList.add('hidden');
    const error = document.getElementById('authError');
    if (error) error.textContent = '';
  }

  function updateAuthStatus(label, signedIn) {
    const badge = document.getElementById('authStatus');
    if (badge) {
      badge.textContent = label;
      badge.className = `badge ${signedIn ? 'ok' : 'neutral'}`;
    }
    document.getElementById('signOut')?.classList.toggle('hidden', !signedIn || !authConfig.authRequired);
  }

  function savingLabel(label = '') {
    if (/eliminar|borrar/i.test(label)) return 'Eliminando...';
    if (/anular/i.test(label)) return 'Anulando...';
    if (/revertir/i.test(label)) return 'Revirtiendo...';
    if (/restaurar/i.test(label)) return 'Restaurando...';
    return 'Guardando...';
  }

  function showSaveError(owner, error) {
    let box = owner.querySelector('[role="alert"]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'fatal';
      box.setAttribute('role', 'alert');
      owner.appendChild(box);
    }
    box.textContent = error.message;
    box.classList.remove('hidden');
  }

  async function runPersistentAction(owner, work, { button, label } = {}) {
    if (!owner || pendingSaves.has(owner)) return;
    pendingSaves.add(owner);
    const controls = [...owner.querySelectorAll('button, input[type="submit"]')];
    button = button || owner.querySelector('[type="submit"]') || (owner.tagName === 'BUTTON' ? owner : null);
    if (button && !controls.includes(button)) controls.push(button);
    const disabledStates = controls.map((control) => [control, control.disabled]);
    const originalText = button?.textContent;
    owner.setAttribute('aria-busy', 'true');
    controls.forEach((control) => { control.disabled = true; });
    if (button) button.textContent = label || savingLabel(originalText);
    try {
      return await work();
    } catch (error) {
      showSaveError(owner, error);
    } finally {
      disabledStates.forEach(([control, disabled]) => { control.disabled = disabled; });
      if (button) button.textContent = originalText;
      owner.removeAttribute('aria-busy');
      pendingSaves.delete(owner);
    }
  }

  function bindPersistentSubmit(formOrId, handler, options = {}) {
    const form = typeof formOrId === 'string' ? document.getElementById(formOrId) : formOrId;
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      // Native currentTarget becomes null after dispatch; keep the form across awaits.
      const savedEvent = { currentTarget: form, target: event.target, submitter: event.submitter, preventDefault() {} };
      return runPersistentAction(form, () => handler(savedEvent), { ...options, button: event.submitter });
    });
  }

  function bindPersistentClick(id, handler, options = {}) {
    const button = document.getElementById(id);
    button?.addEventListener('click', () => runPersistentAction(button.parentElement, handler, { ...options, button }));
  }

  function finishNewForm(formOrId, panelId) {
    const form = typeof formOrId === 'string' ? document.getElementById(formOrId) : formOrId;
    form?.reset();
    const panel = document.getElementById(panelId);
    if (panel?.tagName === 'DETAILS') panel.open = false;
    else panel?.classList.add('hidden');
  }

  function setCriticalActionsDisabled(disabled) {
    if (!disabled) {
      criticalDisabledStates.forEach((value, item) => { item.disabled = value; });
      criticalDisabledStates.clear();
      return;
    }
    const disable = (item) => {
      if (!criticalDisabledStates.has(item)) criticalDisabledStates.set(item, item.disabled);
      item.disabled = true;
    };
    ['documentForm', 'entityForm', 'orderForm'].forEach((id) => {
      document.querySelectorAll(`#${id} button, #${id} input[type="submit"]`).forEach((item) => {
        disable(item);
      });
    });
    ['createReconciliationAdjustment', 'createBackup', 'restoreBackup', 'resetDemo'].forEach((id) => {
      const item = document.getElementById(id);
      if (item) disable(item);
    });
  }

  function backupFileName(backup) {
    const date = new Date(backup.createdAt || Date.now());
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
    return `sagro-respaldo-${backup.environment || 'base'}-v${backup.stateVersion ?? 'x'}-${stamp}.json`;
  }

  function downloadBackupFile(backup) {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName(backup);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return link.download;
  }

  async function createBackup() {
    const payload = await apiPost('/api/backup');
    const backup = payload.backup || {};
    if (backup.state) {
      const name = downloadBackupFile(backup);
      const counts = ['documents', 'orders', 'instruments'].map((key) => `${(backup.state[key] || []).length} ${{ documents: 'documentos', orders: 'ordenes', instruments: 'instrumentos' }[key]}`).join(', ');
      const warning = backup.validationErrors?.length ? `\n\nAtencion: la base tiene ${backup.validationErrors.length} observaciones de control; el respaldo igual se descargo completo.` : '';
      alert(`Respaldo descargado en tu computadora:\n${name}\n\nContiene ${counts}.\nGuardalo en un lugar seguro (por ejemplo, tu Google Drive).${warning}`);
      return;
    }
    alert(`Respaldo creado:\n${backup.path}`);
  }

  function applyDestructiveActionsVisibility(allowed) {
    ['resetDemo', 'restoreBackup'].forEach((id) => document.getElementById(id)?.classList.toggle('hidden', !allowed));
  }

  async function restoreBackup() {
    if (writeInProgress) throw new Error('Ya hay una operacion guardandose. Esperá a que termine.');
    await requestEditAction({ title: 'Restaurar respaldo', description: 'Ingresá la ruta completa del respaldo.', fields: [{ name: 'backupPath', label: 'Ruta del respaldo', required: true }], submitLabel: 'Restaurar', onSubmit: async ({ backupPath }) => {
      if (writeInProgress) throw new Error('Ya hay una operacion guardandose. Esperá a que termine.');
      if (!confirm('Restaurar este respaldo reemplaza la base actual. Antes se creará un respaldo automático de seguridad.')) return false;
      writeInProgress = true;
      setCriticalActionsDisabled(true);
      try {
        const payload = await apiPost('/api/restore', { path: backupPath });
        state = payload.state;
        validation = payload.validation || [];
        stateVersion = payload.stateVersion;
        persistenceEnvironment = payload.environment || persistenceEnvironment;
        render();
        alert(`Respaldo restaurado.\nBackup previo: ${payload.safetyBackup?.path || 'creado'}`);
      } finally {
        writeInProgress = false;
        setCriticalActionsDisabled(false);
      }
    } });
  }

  function cleanDocumentForm() {
    const { keepConfirmation = false } = arguments[0] || {};
    if (documentSaveUncertain || uncertainWrite || writeInProgress) {
      showDocumentSaveUncertain('Hay un guardado sin resolver. Verificá el guardado antes de limpiar el formulario o iniciar otro documento.');
      return;
    }
    documentSubmissionId = '';
    documentFormMode = { mode: 'create', lastSavedDocumentId: '' };
    const today = Core.todayIso();
    document.getElementById('docType').value = 'purchase_invoice';
    document.getElementById('docEntitySearch').value = '';
    document.getElementById('docEntity').value = '';
    document.getElementById('docEntitySearch').setAttribute('aria-expanded', 'false');
    document.getElementById('docEntitySuggestions')?.classList.add('hidden');
    document.getElementById('documentSaveFeedback')?.classList.add('hidden');
    document.getElementById('verifyDocumentSave')?.classList.add('hidden');
    document.getElementById('docNumber').value = '';
    document.getElementById('docAmount').value = '';
    document.getElementById('docCurrency').value = 'ARS';
    const invoiceRateInput = document.getElementById('docInvoiceRate');
    if (invoiceRateInput) invoiceRateInput.value = '';
    syncDocumentInvoiceRateField();
    document.getElementById('docCommercialSide').value = '';
    syncDocumentCommercialSide();
    document.getElementById('docChartAccount').value = '';
    if (document.getElementById('docAdditionalFields')) document.getElementById('docAdditionalFields').open = false;
    document.getElementById('docFiscalStatus').value = 'documented';
    documentVatManualOverride = false;
    documentCalculationSource = 'net';
    ['docNetTaxed', 'docVatAmount', 'docExemptAmount', 'docNotTaxedAmount', 'docPerceptionVat', 'docPerceptionIibb', 'docOtherPerceptions', 'docWithholdingVat', 'docWithholdingIncome', 'docWithholdingIibb', 'docOtherDeductions', 'docTotalAmount'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    const docVatRate = document.getElementById('docVatRate');
    if (docVatRate) docVatRate.value = '21';
    document.getElementById('docIssueDate').value = today;
    document.getElementById('docDueDate').value = Core.addDays(today, 15);
    document.getElementById('docActivity').value = 'Agricultura';
    document.getElementById('docDescription').value = '';
    document.getElementById('documentAfterSaveActions').classList.add('hidden');
    document.getElementById('documentAfterSaveActions').innerHTML = '';
    if (!keepConfirmation) {
      document.getElementById('documentSaveConfirmation')?.classList.add('hidden');
      const confirmation = document.getElementById('documentSaveConfirmation');
      if (confirmation) confirmation.innerHTML = '';
    }
    updateDocumentFiscalLabels();
    updateDocumentBackingFields();
    updateDocumentCalculatedFields();
    syncDocumentAdditionalFields();
    renderSelects();
  }

  function showDocumentSaveUncertain(message = 'El resultado del guardado no está confirmado. No lo envíes de nuevo: usá Verificar guardado para consultar el estado central.') {
    const feedback = document.getElementById('documentSaveFeedback');
    if (feedback) { feedback.textContent = message; feedback.classList.remove('hidden'); }
    document.getElementById('verifyDocumentSave')?.classList.remove('hidden');
  }

  async function verifyUncertainDocumentSave() {
    if (documentVerificationInProgress) return;
    documentVerificationInProgress = true;
    const button = document.getElementById('verifyDocumentSave');
    if (button) button.disabled = true;
    documentSaveUncertain = true;
    uncertainWrite = true;
    showDocumentSaveUncertain('Verificando guardado en el servidor. No se enviará otra escritura.');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), TRANSACTION_TIMEOUT_MS) : null;
    try {
      const storedId = sessionStorage.getItem(UNCERTAIN_DOCUMENT_KEY);
      if (storedId && documentSubmissionId && storedId !== documentSubmissionId) {
        throw new Error('Los identificadores de seguimiento no coinciden; no se puede confirmar este guardado');
      }
      documentSubmissionId = documentSubmissionId || storedId || '';
      if (!documentSubmissionId) throw new Error('No se conserva el identificador del envío. No se puede confirmar ni repetir de forma segura');
      const payload = await api('/api/state', { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) });
      if (!Array.isArray(payload.state?.documents) || !Number.isInteger(payload.stateVersion) || !Array.isArray(payload.validation) || payload.validation.length) {
        throw new Error('El servidor no devolvió un estado válido para verificar el documento');
      }
      state = payload.state;
      validation = payload.validation || [];
      stateVersion = payload.stateVersion;
      persistenceEnvironment = payload.environment || persistenceEnvironment;
      render();
      const saved = state.documents.some((item) => item.id === documentSubmissionId);
      if (!saved) {
        showDocumentSaveUncertain('El documento aún no aparece en el estado central. Esto no demuestra que el envío haya terminado: el resultado sigue sin confirmar. Las escrituras permanecen bloqueadas. Volvé a verificar más tarde; no vuelvas a cargarlo.');
        return;
      }
      const id = documentSubmissionId;
      sessionStorage.removeItem(UNCERTAIN_DOCUMENT_KEY);
      documentSaveUncertain = false;
      uncertainWrite = false;
      documentSubmissionId = '';
      document.getElementById('verifyDocumentSave')?.classList.add('hidden');
      cleanDocumentForm({ keepConfirmation: true });
      showDocumentAfterSaveActions(id);
    } catch (error) {
      const reason = error.name === 'AbortError' ? 'El servidor no respondió a tiempo' : error.message;
      showDocumentSaveUncertain(`No se pudo verificar el guardado: ${reason}. Conservá la pantalla y volvé a verificar más tarde.`);
    } finally {
      if (timeout) clearTimeout(timeout);
      documentVerificationInProgress = false;
      if (button) button.disabled = false;
    }
  }

  function documentDisplayLabel(doc) {
    if (!doc) return '';
    if (doc.number) return doc.number;
    if (Core.documentReading(doc) === 'pending_receipt') return doc.description || 'Documento sin número';
    if (doc.fiscalStatus === 'no_receipt') return 'Sin comprobante';
    return doc.description || doc.id;
  }

  function cleanOrderForm() {
    orderFormMode = { mode: 'create', sourceDocumentId: '', orderId: '' };
    const today = Core.todayIso();
    document.getElementById('orderType').value = 'payment';
    document.getElementById('orderWithholdingsPanel')?.classList.add('hidden');
    document.getElementById('orderPracticedPanel')?.classList.remove('hidden');
    if (document.getElementById('orderPracticedPanel')) document.getElementById('orderPracticedPanel').open = false;
    document.getElementById('orderExistingRetentionPanel')?.classList.add('hidden');
    if (document.getElementById('orderExistingRetentionRows')) document.getElementById('orderExistingRetentionRows').innerHTML = '';
    document.getElementById('orderEntitySearch').value = '';
    document.getElementById('orderEntity').value = '';
    document.getElementById('orderDescription').value = '';
    document.getElementById('orderDate').value = today;
    ['orderWithholdingIncome', 'orderWithholdingVat', 'orderWithholdingIibb', 'orderWithholdingReference'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
    if (document.getElementById('orderWithholdingDate')) document.getElementById('orderWithholdingDate').value = today;
    ['orderPracticedIncome', 'orderPracticedVat', 'orderPracticedIibb', 'orderPracticedReference'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
    syncFiscalDisclosures(document.getElementById('orderForm'), true);
    if (document.getElementById('orderPracticedDate')) document.getElementById('orderPracticedDate').value = today;
    document.querySelectorAll('.instrument-row[data-dynamic-instrument="true"]').forEach((row) => row.remove());
    document.querySelectorAll('.instrument-row').forEach((row, index) => {
      row.classList.toggle('hidden', index > 0);
      row.querySelector('[data-field="type"]').value = index === 0 ? 'transfer' : 'own_check';
      syncInstrumentStatusOptions(row);
      row.querySelector('[data-field="amount"]').value = '';
      delete row.querySelector('[data-field="amount"]').dataset.autoProposed;
      delete row.querySelector('[data-field="amount"]').dataset.amountTouched;
      row.querySelector('[data-field="scheduledDate"]').value = Core.addDays(today, index * 30);
      if (index === 0) row.querySelector('[data-field="scheduledDate"]').dataset.dateProposed = 'true';
      else delete row.querySelector('[data-field="scheduledDate"]').dataset.dateProposed;
      row.querySelector('[data-field="reference"]').value = '';
      row.querySelector('[data-field="notes"]')?.setAttribute('value', '');
      if (row.querySelector('[data-field="notes"]')) row.querySelector('[data-field="notes"]').value = '';
      row.querySelector('[data-field="checkNumber"]').value = '';
      row.querySelector('[data-field="bankName"]').value = '';
      resetInstrumentApplicationFields(row);
      syncInstrumentAccountOptions(row);
    });
    renderSelects();
    document.getElementById('orderEntitySearch').value = '';
    document.getElementById('orderEntity').value = '';
    renderOrderDocumentsList();
    ['orderType', 'orderEntitySearch', 'orderEntity', 'quickCreateOrderEntity', 'orderDescription', 'orderDate'].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.disabled = false;
    });
    document.getElementById('orderFormTitle').textContent = 'Nueva OP/OC';
    document.getElementById('orderFormHelp').textContent = 'La actividad y cuenta economica provienen de los documentos seleccionados.';
    const submit = document.querySelector('#orderForm button[type="submit"]');
    if (submit) { submit.textContent = 'Guardar orden'; submit.disabled = false; }
  }

  function showDocumentFormPanel({ clean = true } = {}) {
    if (clean) cleanDocumentForm();
    document.getElementById('documentFormPanel')?.classList.remove('hidden');
    document.getElementById('documentSaveConfirmation')?.classList.add('hidden');
  }

  function hideDocumentFormPanel({ keepConfirmation = false } = {}) {
    document.getElementById('documentFormPanel')?.classList.add('hidden');
    if (!keepConfirmation) document.getElementById('documentSaveConfirmation')?.classList.add('hidden');
  }

  function showOrderFormPanel({ clean = true } = {}) {
    if (clean) cleanOrderForm();
    document.getElementById('orderFromFlowDecisionPanel')?.classList.add('hidden');
    const panel = document.getElementById('orderFormPanel');
    panel?.classList.remove('hidden');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('orderType')?.focus();
  }

  function hideOrderFormPanel() {
    document.getElementById('orderFormPanel')?.classList.add('hidden');
  }

  function hideOrderDecisionPanel() {
    const panel = document.getElementById('orderFromFlowDecisionPanel');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.innerHTML = '';
  }

  const tableFilters = {};
  const generalMovementsUi = { page: 0, size: 25, sort: 'date', descending: true };
  const operationsControls = {};

  function columnText(column, row) {
    return String((typeof column.value === 'function' ? column.value(row) : row[column.value]) ?? '');
  }

  function filteredTableRows(tableId, columns, rows) {
    return rows.filter((row) => columns.every((column, index) => {
      const filter = tableFilters[tableId]?.[index];
      if (!filter) return true;
      const text = columnText(column, row);
      if (filter.min !== undefined || filter.max !== undefined) {
        const matchesDebt = tableId === 'generalMovementsTable' && filter.currency && row.debtCurrency === filter.currency;
        const amount = Number(matchesDebt ? row.debtAmount : row[column.numericValue || 'amount']);
        return (!filter.currency || row.currency === filter.currency || matchesDebt) && (filter.min === '' || filter.min === undefined || amount >= Number(filter.min))
          && (filter.max === '' || filter.max === undefined || amount <= Number(filter.max));
      }
      if (filter.from || filter.to) {
        const parts = text.split('/');
        const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : '';
        return !!date && (!filter.from || date >= filter.from) && (!filter.to || date <= filter.to);
      }
      return !filter.text || (filter.exact ? text === filter.text : text.toLocaleLowerCase('es').includes(filter.text.toLocaleLowerCase('es')));
    }));
  }

  function headerFilter(tableId, column, index, rows, columns, redraw) {
    if (tableId === 'generalMovementsTable' && column.label === 'Importe') {
      return generalAmountFilter(index, redraw);
    }
    if (/^(panel|closing|periodSummary|taxMatrix|monthDetail)/.test(tableId)) return null;
    const balanceFilter = tableId === 'documentsTable' && column.label === 'Sin medio';
    try { if (!balanceFilter && String(column.className?.(rows[0] || {}) || '').includes('amount')) return null; } catch (_) { /* Dynamic numeric classes can require a row. */ }
    if (column.node || !column.value || (!balanceFilter && (/amount/.test(column.headerClass || '') || /Original|Cancelado|Comprometido|Sin medio|Aplicado|Pagado|Pendiente$|Importe|Ingreso|Egreso|Saldo|Stock|Kg|Cabezas|Total|Resultado|Precio|Valor/i.test(column.label)))) return null;
    const menu = document.createElement('details');
    menu.className = 'column-filter';
    const summary = document.createElement('summary');
    summary.textContent = '▾';
    summary.title = `Filtrar ${column.label}`;
    menu.appendChild(summary);
    const panel = document.createElement('div');
    panel.className = 'column-filter-menu';
    menu.appendChild(panel);
    menu.addEventListener('toggle', () => {
      if (!menu.open || typeof summary.getBoundingClientRect !== 'function') return;
      document.querySelectorAll('.column-filter[open]').forEach((other) => { if (other !== menu) other.open = false; });
      const rect = summary.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 256))}px`;
      panel.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 240))}px`;
    });
    const operationKind = tableId === 'documentsTable' ? 'documents' : tableId === 'ordersTable' ? 'orders' : null;
    const keys = { Documento: 'number', Orden: 'number', Entidad: 'entity', Tipo: 'type', Estado: 'status', Actividad: 'activity', Cuenta: 'chartAccountId', Moneda: 'currency', Fecha: 'date', Concepto: 'search', 'Sin medio': 'coverage' };
    const key = operationKind && !(operationKind === 'orders' && column.label === 'Concepto') && keys[column.label];
    if (key) {
      const names = key === 'date' ? ['dateFrom', 'dateTo'] : [key];
      if (names.some((name) => operationsUi[operationKind].filters[name])) summary.classList.add('filter-active');
      names.forEach((name) => {
        const control = operationsControls[`${operationKind}Filter-${name}`] || document.getElementById(`${operationKind}Filter-${name}`);
        if (control?.parentElement) panel.appendChild(control.parentElement);
      });
      panel.appendChild(actionGroup([
        { label: 'Aplicar', fn: () => {
          names.forEach((name) => { operationsUi[operationKind].filters[name] = operationsControls[`${operationKind}Filter-${name}`]?.value || ''; });
          operationsUi[operationKind].page = 0;
          renderOperations();
        } },
        { label: 'Limpiar', fn: () => {
          names.forEach((name) => { delete operationsUi[operationKind].filters[name]; const control = operationsControls[`${operationKind}Filter-${name}`]; if (control) control.value = ''; });
          operationsUi[operationKind].page = 0;
          renderOperations();
        } }
      ]));
      return menu;
    }
    if (operationKind) return null;
    const current = tableFilters[tableId]?.[index] || {};
    const isDate = /Fecha|Vence|Vto|Venc/i.test(column.label);
    const exact = /Tipo|Estado|Actividad|Cuenta|Moneda|Cereal|Campana|Categoria/i.test(column.label);
    const save = (values) => {
      tableFilters[tableId] ||= {};
      tableFilters[tableId][index] = values;
      if (tableId === 'generalMovementsTable') generalMovementsUi.page = 0;
      redraw();
    };
    const controls = [];
    (isDate ? ['Desde', 'Hasta'] : [column.label]).forEach((label, pos) => {
      const wrapper = document.createElement('label');
      wrapper.textContent = label;
      const control = document.createElement(exact && !isDate ? 'select' : 'input');
      if (isDate) control.type = 'date';
      else if (exact) control.innerHTML = '<option value="">Todos</option>' + [...new Set(rows.map((row) => columnText(column, row)))].map((text) => `<option value="${escapeHtml(text)}">${escapeHtml(text)}</option>`).join('');
      else control.type = 'search';
      control.value = isDate ? current[pos ? 'to' : 'from'] || '' : current.text || '';
      controls.push(control);
      wrapper.appendChild(control);
      panel.appendChild(wrapper);
    });
    panel.appendChild(actionGroup([
      { label: 'Aplicar', fn: () => save(isDate ? { from: controls[0].value, to: controls[1].value } : { text: controls[0].value, exact }) },
      { label: 'Limpiar', fn: () => save({}) }
    ]));
    if (tableId === 'generalMovementsTable' && isDate) panel.appendChild(actionGroup([
      { label: 'Mas recientes', fn: () => { generalMovementsUi.descending = true; generalMovementsUi.sort = 'date'; redraw(); } },
      { label: 'Mas antiguos', fn: () => { generalMovementsUi.descending = false; generalMovementsUi.sort = 'date'; redraw(); } }
    ]));
    if (current.text || current.from || current.to) summary.classList.add('filter-active');
    return menu;
  }

  function monetaryTotals(tableId, columns, rows) {
    const values = {
      documentsTable: { Original: (r) => r.amount, Cancelado: (r) => operationBreakdown('documents', r.id).cancelled, Comprometido: (r) => operationBreakdown('documents', r.id).committedPending, 'Sin medio': (r) => operationBreakdown('documents', r.id).nonInstrumented },
      ordersTable: { Aplicado: (r) => operationBreakdown('orders', r.id).applied, 'Pagado/Cobrado': (r) => operationBreakdown('orders', r.id).paidOrCollected, Pendiente: (r) => operationBreakdown('orders', r.id).pending + operationBreakdown('orders', r.id).notCoveredByInstrument },
      accountsTable: { 'Saldo banco/caja real': (r) => r.realBalance, 'Proyeccion por cuenta': (r) => r.projectedBalance },
      instrumentsTable: { Ingresos: (r) => r.direction === 'in' ? r.amount : 0, Egresos: (r) => r.direction === 'out' ? r.amount : 0 },
      realizedTable: { Ingresos: (r) => r.income, Egresos: (r) => r.expense },
      checksPortfolioTable: { Importe: (r) => r.amount },
      taxDetailTable: { Importe: (r) => r.amount },
      flowTable: { Ingreso: (r) => r.direction === 'in' ? Math.abs(r.amount) : 0, Egreso: (r) => r.direction === 'out' ? Math.abs(r.amount) : 0 },
      currentAccountTable: { 'Aumenta deuda': (r) => Math.max(r.debtChange, 0), 'Reduce deuda': (r) => Math.max(-r.debtChange, 0), 'Aumenta credito': (r) => Math.max(r.receivableChange, 0), 'Reduce credito': (r) => Math.max(-r.receivableChange, 0) },
      entityCcTable: { 'Aumenta deuda': (r) => Math.max(r.debtChange, 0), 'Reduce deuda': (r) => Math.max(-r.debtChange, 0), 'Aumenta credito': (r) => Math.max(r.receivableChange, 0), 'Reduce credito': (r) => Math.max(-r.receivableChange, 0) },
      grainForwardTable: { 'Importe estimado': (r) => r.estimatedAmount || (r.contractedKg / 1000) * r.price },
      grainLiquidationTable: { Neto: (r) => grainLiquidationAmount(r, 'net'), IVA: (r) => grainLiquidationAmount(r, 'vat'), 'Comision/gastos': (r) => grainLiquidationAmount(r, 'expenses'), Retenciones: (r) => grainLiquidationAmount(r, 'withholdings'), 'Total a cobrar': (r) => grainLiquidationAmount(r, 'total') },
      entityDocsTable: { Importe: (r) => r.amount },
      entityInstrumentsTable: { Importe: (r) => r.amount }
    }[tableId];
    if (!values) return [];
    const groups = [...new Set(rows.filter((row) => row.currency).map((row) => JSON.stringify([row.currency, tableId === 'taxDetailTable' ? row.label || '' : ''])))];
    return groups.map((key) => {
      const [currency, concept] = JSON.parse(key);
      return { currency, concept, amounts: columns.map((column) => values[column.label] ? rows.filter((r) => r.currency === currency && !r.voidedAt && (tableId !== 'taxDetailTable' || (r.label || '') === concept)).reduce((sum, r) => sum + Number(values[column.label](r) || 0), 0) : null) };
    });
  }

  function renderTable(tableId, columns, rows) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const baseRows = rows;
    rows = filteredTableRows(tableId, columns, rows);
    const allFilteredRows = rows;
    if (tableId === 'generalMovementsTable') {
      const currency = Object.values(tableFilters[tableId] || {}).find((filter) => filter?.currency)?.currency;
      const sortAmount = (row) => currency && row.debtCurrency === currency ? row.debtAmount : row.amount;
      rows.sort((a, b) => (generalMovementsUi.sort === 'amount' ? sortAmount(a) - sortAmount(b) : a.date.localeCompare(b.date)) * (generalMovementsUi.descending ? -1 : 1));
      document.getElementById('generalMovementsCount').textContent = `${rows.length} registros`;
      const page = operationPage(rows, generalMovementsUi.page, generalMovementsUi.size);
      generalMovementsUi.page = page.page;
      const pager = document.getElementById('generalMovementsPager');
      pager.innerHTML = '';
      const info = document.createElement('span');
      info.textContent = `Pagina ${page.page + 1} de ${page.pages}`;
      pager.appendChild(info);
      [['Anterior', -1], ['Siguiente', 1]].forEach(([label, step]) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = label;
        button.disabled = page.page + step < 0 || page.page + step >= page.pages;
        button.addEventListener('click', () => { generalMovementsUi.page += step; renderTable(tableId, columns, baseRows); });
        pager.appendChild(button);
      });
      const size = document.createElement('select');
      size.ariaLabel = 'Filas por pagina'; size.innerHTML = '<option>25</option><option>50</option>'; size.value = String(generalMovementsUi.size);
      size.addEventListener('change', () => { generalMovementsUi.size = Number(size.value); generalMovementsUi.page = 0; renderTable(tableId, columns, baseRows); });
      pager.appendChild(size);
      rows = page.rows;
    }
    table.innerHTML = '';
    table.dataset.resizable = 'true';
    const thead = table.createTHead();
    const header = thead.insertRow();
    columns.forEach((column, index) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      if (column.headerClass) th.className = column.headerClass;
      else if (column.className) {
        try {
          if (String(column.className({})).includes('amount')) th.classList.add('amount-head');
        } catch (error) {
          // Some dynamic classes need a complete row; leave those headers neutral.
        }
      }
      applyColumnWidth(tableId, th, index, column.minWidth);
      th.appendChild(resizeHandle(tableId, index, column.minWidth));
      const filter = headerFilter(tableId, column, index, baseRows, columns, () => renderTable(tableId, columns, baseRows));
      if (filter) th.appendChild(filter);
      header.appendChild(th);
    });
    const tbody = table.createTBody();
    rows.forEach((row) => {
      const tr = tbody.insertRow();
      if (row.rowClass) tr.className = row.rowClass;
      columns.forEach((column, index) => {
        const td = tr.insertCell();
        const value = typeof column.value === 'function' ? column.value(row) : row[column.value];
        if (column.node) {
          td.appendChild(column.node(row));
        } else if (column.link) {
          const linkTarget = column.link(row);
          if (linkTarget) td.appendChild(traceButton(value ?? '', linkTarget));
          else td.textContent = value ?? '';
        } else {
          td.textContent = value ?? '';
        }
        if (column.className) td.className = column.className(row);
        if ((tableId === 'documentsTable' && index < 8) || tableId === 'generalMovementsTable') td.title = String(value ?? '');
        if (/flow-(concept|reference)/.test(td.className)) td.title = String(value ?? '');
      });
    });
    const totalRows = tableId === 'documentsTable' || tableId === 'ordersTable' ? operationRows(tableId === 'documentsTable' ? 'documents' : 'orders', operationsUi[tableId === 'documentsTable' ? 'documents' : 'orders'].filters) : rows;
    const totals = monetaryTotals(tableId, columns, totalRows);
    if (totals.length) {
      const footer = table.createTFoot();
      totals.forEach(({ currency, concept, amounts }) => {
        const tr = footer.insertRow();
        columns.forEach((column, index) => {
          const td = tr.insertCell();
          const moneyFormatter = tableId === 'flowTable' ? formatFlowMoney : formatMoney;
          td.textContent = index === 0 ? `TOTAL ${currency}${concept ? ' · ' + concept : ''} · todos los filtrados` : amounts[index] == null ? '' : moneyFormatter(amounts[index], currency);
          if (index === 0) td.className = 'totals-label';
          else if (amounts[index] != null) td.className = `amount ${amounts[index] === 0 ? 'neutral' : /Egreso/.test(column.label) || amounts[index] < 0 ? 'negative' : /Ingreso/.test(column.label) ? 'positive' : ''}`;
        });
      });
    }
    setupTableScroll(table);
    appendPhysicalTotals(tableId, table, columns, rows);
    if (tableId === 'flowTable') renderFlowCurrencyTotals('flowTotals', flowCurrencyTotals(rows, valueFromInput('flowCurrencyFilter')));
    // Libro: ingresos y egresos de fondos de las filas que pasan la búsqueda y los filtros de columna. Compensaciones no mueven fondos.
    if (tableId === 'generalMovementsTable') {
      const funds = allFilteredRows.filter((row) => row.affectsFunds).map((row) => ({ amount: Number(row.financialAmount || 0), currency: row.currency }));
      renderFlowCurrencyTotals('generalMovementsTotals', flowCurrencyTotals(funds).filter((group) => group.incomes || group.expenses));
    }
  }

  function appendPhysicalTotals(tableId, table, columns, rows) {
    const specs = {
      grainStockTable: { 'Kg entrada': 'kgIn', 'Kg salida': 'kgOut', 'Kg saldo': 'balanceKg' },
      livestockStockTable: { Cabezas: 'balanceHeads', 'Peso vivo estimado': 'liveWeightKg' },
      livestockCategoryTable: { Cabezas: 'heads' },
      livestockHistoryTable: { 'Entradas cab': 'headsIn', 'Salidas cab': 'headsOut' },
      grainHistoryTable: { 'Kg entrada': 'kgIn', 'Kg salida': 'kgOut' }
    }[tableId];
    if (!specs) return;
    const groups = [...new Set(rows.map((row) => tableId.startsWith('grain') ? `${row.cereal || ''} / ${row.campaign || ''}` : 'Cabezas / kg'))];
    const footer = table.createTFoot();
    groups.forEach((group) => {
      const tr = footer.insertRow();
      columns.forEach((column, index) => {
        const td = tr.insertCell();
        if (index === 0) { td.textContent = `TOTAL ${group} · todos los filtrados`; td.className = 'totals-label'; }
        else if (specs[column.label]) {
          td.className = 'amount';
          td.textContent = formatDecimal(rows.filter((row) => !tableId.startsWith('grain') || `${row.cereal || ''} / ${row.campaign || ''}` === group).reduce((sum, row) => sum + Number(row[specs[column.label]] || 0), 0));
        }
      });
    });
  }

  function setupTableScroll(table) {
    const wrap = table.parentElement;
    if (!wrap?.classList.contains('table-wrap') || !wrap.parentElement || typeof ResizeObserver === 'undefined') return;
    if (wrap._scrollBar) { wrap._scrollRefresh(); return; }
    const bar = document.createElement('div');
    bar.className = 'table-scrollbar';
    bar.tabIndex = 0;
    bar.title = 'Desplazamiento horizontal de la tabla';
    const track = document.createElement('div');
    bar.appendChild(track);
    const frame = document.createElement('div');
    frame.className = 'table-scroll-frame';
    // The generated frame, rather than the inner wrapper, becomes the grid item.
    if (table.id === 'taxPlanReviewTable') frame.classList.add('wide-section');
    wrap.parentElement.insertBefore(frame, wrap);
    frame.append(bar, wrap);
    wrap._scrollBar = bar;
    wrap._scrollRefresh = () => { track.style.width = `${table.scrollWidth}px`; bar.classList.toggle('hidden', table.scrollWidth <= wrap.clientWidth + 1); bar.scrollLeft = wrap.scrollLeft; };
    bar.addEventListener('scroll', () => { wrap.scrollLeft = bar.scrollLeft; });
    wrap.addEventListener('scroll', () => { bar.scrollLeft = wrap.scrollLeft; });
    const observer = new ResizeObserver(wrap._scrollRefresh);
    observer.observe(wrap);
    observer.observe(table);
    wrap._scrollRefresh();
  }

  const COLUMN_MIN_WIDTH_CAP = 130;

  function applyColumnWidth(tableId, cell, index, minWidth) {
    const width = uiPrefs.columnWidths?.[`${tableId}:${index}`];
    // Code-defined minimums are capped so short content does not leave wide empty columns; long text wraps instead.
    // A width the user dragged by hand is always respected.
    const finalWidth = Math.max(Number(width || 0), Math.min(minWidth || 0, COLUMN_MIN_WIDTH_CAP));
    if (finalWidth) {
      cell.style.width = `${finalWidth}px`;
      cell.style.minWidth = `${finalWidth}px`;
    }
  }

  function resizeHandle(tableId, index, minWidth) {
    const handle = document.createElement('span');
    handle.className = 'resize-handle';
    handle.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const th = event.currentTarget.parentElement;
      const startX = event.pageX;
      const startWidth = th.offsetWidth;
      const onMove = (moveEvent) => {
        const next = Math.max(minWidth || 40, startWidth + moveEvent.pageX - startX);
        th.style.width = `${next}px`;
        th.style.minWidth = `${next}px`;
        uiPrefs.columnWidths[`${tableId}:${index}`] = next;
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveUiPrefs();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    return handle;
  }

  const TAX_ACTION_HELP = {
    showTaxReimbursementForm: 'Registra un reintegro recibido y su ingreso bancario. No crea una venta ni un nuevo resultado económico. Verificá que el reintegro no esté registrado previamente.',
    showTaxPaymentForm: 'Paga retenciones practicadas pendientes mediante un VEP realizado. Genera el egreso bancario y cancela esas obligaciones fiscales; no crea un segundo gasto. Para un VEP de otro documento, utilizá su OP e instrumento existente.',
    prepareArcaPlans: 'Prepara los tres cronogramas ARCA conocidos y reconoce cuotas ya registradas para completar sólo las faltantes. Requiere revisión y confirmación. No equivale al alta de un plan nuevo; no seleccionés un plan existente sin conciliarlo.',
    newTaxPaymentPlan: 'Registra la identificación y el cronograma de un plan. No vigente conserva cuotas informativas; activarlo crea obligación y débitos pendientes, sin gasto económico automático. Capital e intereses requieren conciliación.',
    'Ver detalle': 'Consulta cuotas, pagos, anticipo e historial sin modificar datos. Cerrar sale sin guardar.',
    'Anular plan': 'Revisa y anula únicamente cuotas pendientes compatibles. Conserva pagos bancarios realizados y deuda tributaria. Requiere motivo y confirmación; no equivale a Cerrar.',
    'Verificar identificación sin reclasificar': 'Registra la identificación del plan histórico y auditoría. No reclasifica el documento ni modifica sus instrumentos o pagos; es un paso previo a evaluar su anulación.',
    'Editar concepto': 'Corrige la identificación del plan con auditoría. No modifica importes, vencimientos ni pagos.',
    'Activar cronograma': 'Tras verificar número y cuenta, crea la obligación y los débitos pendientes del cronograma. No registra pagos realizados ni gastos económicos.',
    'Sustituir por moratoria': 'Reemplaza cuotas pendientes conservando pagos y la misma deuda subyacente. Requiere conciliación y coincidencia exacta del importe; las diferencias de capital o intereses están bloqueadas.'
  };

  function actionHelp(key) {
    const help = document.createElement('details'); help.className = 'action-help';
    const summary = document.createElement('summary'); summary.textContent = 'ⓘ'; summary.setAttribute('aria-label', `Ayuda: ${key}`);
    const text = document.createElement('p'); text.textContent = TAX_ACTION_HELP[key];
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Cerrar ayuda';
    close.addEventListener('click', () => { help.open = false; });
    help.addEventListener('keydown', (event) => { if (event.key === 'Escape') { help.open = false; summary.focus(); } });
    help.append(summary, text, close);
    return help;
  }

  function setupTaxActionHelp() {
    ['showTaxReimbursementForm', 'showTaxPaymentForm', 'newTaxPaymentPlan'].forEach((id) => {
      const button = document.getElementById(id);
      if (!button?.parentElement || button.dataset.actionHelp) return;
      button.insertAdjacentElement('afterend', actionHelp(id)); button.dataset.actionHelp = 'true';
    });
  }

  function setupFieldHelp() {
    document.querySelectorAll('label[data-help-key]').forEach((label) => {
      if (label.querySelector('.help-tip')) return;
      const text = HELP_TEXTS[label.dataset.helpKey];
      if (!text) return;
      const tip = document.createElement('button');
      tip.type = 'button';
      tip.className = 'help-tip';
      tip.textContent = 'ⓘ';
      tip.setAttribute('aria-label', text);
      tip.setAttribute('aria-expanded', 'false');
      tip.dataset.tooltip = text;
      let hoverTimer = null;
      const open = () => {
        tip.classList.add('tooltip-open');
        tip.setAttribute('aria-expanded', 'true');
      };
      const close = () => {
        clearTimeout(hoverTimer);
        tip.classList.remove('tooltip-open');
        tip.setAttribute('aria-expanded', 'false');
      };
      tip.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(open, 3000);
      });
      tip.addEventListener('mouseleave', close);
      tip.addEventListener('focus', open);
      tip.addEventListener('blur', close);
      tip.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (tip.classList.contains('tooltip-open')) close();
        else open();
      });
      const firstControl = label.querySelector('input, select, textarea');
      label.insertBefore(tip, firstControl || label.firstChild?.nextSibling || null);
    });
    if (!document.body?.dataset.helpTipOutsideClick) {
      document.body.dataset.helpTipOutsideClick = 'true';
      document.addEventListener('click', () => {
        document.querySelectorAll('.help-tip.tooltip-open').forEach((tip) => {
          tip.classList.remove('tooltip-open');
          tip.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function traceButton(label, target, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className || 'link-button';
    button.textContent = label || '';
    button.addEventListener('click', () => navigateTarget(target));
    return button;
  }

  function navigateTarget(target) {
    if (target?.type === 'panelUpcoming') {
      openPanelUpcomingDetail(target);
      return;
    }
    if (target?.type === 'agricultural-income-projection') {
      openAgriculturalProjection(target.id);
      return;
    }
    if (target?.type === 'document') {
      openDocumentDetail(target.id);
      return;
    }
    if (target?.type === 'order') {
      openOrderDetail(target.id);
      return;
    }
    if (target?.type === 'instrument') {
      openInstrumentDetail(target.id);
      return;
    }
    if (target?.type === 'monthDetail') {
      openMonthDetail(target);
      return;
    }
    if (target?.type === 'grainLocationDetail') {
      openGrainLocationDetail(target);
      return;
    }
    showTrace(target);
  }

  function statusMatches(row, status) {
    if (!status) return true;
    if (status === 'settled') return row.userStatus === 'Pagado' || row.userStatus === 'Cobrado';
    return row.userStatus === status;
  }

  function makeEntityLink(entityId) {
    return { type: 'entity', id: entityId };
  }

  function makeAccountLink(accountId) {
    return { type: 'financialAccount', id: accountId };
  }

  function makeChartLink(chartAccountId) {
    return { type: 'chartAccount', id: chartAccountId };
  }

  function roleOptions(includeAll) {
    return `${includeAll ? '<option value="">Todos</option>' : ''}${Core.ENTITY_ROLES.map((role) => `<option>${role}</option>`).join('')}`;
  }

  function filteredEntities(searchId, role) {
    const q = (document.getElementById(searchId)?.value || '').trim().toLowerCase();
    return state.entities
      .filter((entity) => entity.active !== false && !entity.mergedIntoEntityId)
      .filter((entity) => !role || entity.role === role)
      .filter((entity) => !q || entity.name.toLowerCase().includes(q) || String(entity.cuit || '').includes(q));
  }

  function entityOptionsFor(searchId, selectedId) {
    const entities = filteredEntities(searchId);
    return entities.map((entity) => `<option value="${entity.id}" ${entity.id === selectedId ? 'selected' : ''}>${entity.name}${entity.cuit ? ` - ${entity.cuit}` : ''}</option>`).join('');
  }

  function renderDocumentEntitySuggestions(open = false) {
    const input = document.getElementById('docEntitySearch');
    const selected = document.getElementById('docEntity');
    const menu = document.getElementById('docEntitySuggestions');
    const matches = document.getElementById('docEntityMatches');
    if (!input || !selected || !menu || !matches) return;
    const selectedEntity = state.entities.find((entity) => entity.id === selected.value && entity.active !== false && !entity.mergedIntoEntityId);
    if (selectedEntity && !open) input.value = selectedEntity.name;
    matches.replaceChildren();
    filteredEntities('docEntitySearch').slice(0, 20).forEach((entity) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'entity-picker-option';
      option.setAttribute('role', 'option');
      option.textContent = `${entity.name}${entity.cuit ? ` · ${entity.cuit}` : ''}`;
      option.addEventListener('click', () => {
        selected.value = entity.id;
        input.value = entity.name;
        menu.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
      });
      matches.appendChild(option);
    });
    if (!matches.children.length) {
      const empty = document.createElement('span');
      empty.textContent = 'Sin coincidencias';
      matches.appendChild(empty);
    }
    menu.classList.toggle('hidden', !open);
    input.setAttribute('aria-expanded', String(open));
  }

  function renderMetrics() {
    const rows = Core.flowRows(state);
    const arRows = rows.filter((row) => row.currency === 'ARS');
    const cards = [
      ['Banco/caja real', Core.accountBalances(state).reduce((sum, account) => account.currency === 'ARS' ? sum + account.realBalance : sum, 0), 'ARS'],
      ['Flujo empresa ARS', Core.consolidatedFlow(state, 'ARS').total, 'ARS'],
      ['Ingresos pendientes', arRows.filter((row) => row.direction === 'in' && row.userStatus === 'Pendiente').reduce((sum, row) => sum + row.amount, 0), 'ARS'],
      ['Egresos pendientes', Math.abs(arRows.filter((row) => row.direction === 'out' && row.userStatus === 'Pendiente').reduce((sum, row) => sum + row.amount, 0)), 'ARS']
    ];
    document.getElementById('panelCards').innerHTML = cards.map(([label, value, currency]) => `
      <div class="metric"><span>${label}</span><strong>${formatMoney(value, currency)}</strong></div>
    `).join('');
  }

  function metricCard(label, value) {
    return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function metricButton(label, value, currency, target) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metric metric-button';
    button.innerHTML = `<span>${label}</span><strong>${formatMoney(value, currency)}</strong>`;
    button.addEventListener('click', () => openMonthDetail(target));
    return button;
  }

  function renderPendingWindows() {
    const container = document.getElementById('pendingWindows');
    container.innerHTML = '';
    const currency = document.getElementById('panelCurrency')?.value || 'ARS';
    const columns = [
      { title: 'Proximos ingresos', key: 'income', direction: 'in' },
      { title: 'Proximos egresos', key: 'expense', direction: 'out' }
    ];
    const windows = Core.pendingWindows(state, { currency });
    columns.forEach((column) => {
      const box = document.createElement('div');
      box.className = 'pending-column';
      const title = document.createElement('h4');
      title.textContent = column.title;
      box.appendChild(title);
      windows.forEach((windowItem) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pending-row';
        button.innerHTML = `<span>${windowItem.days} dias</span><strong>${formatMoney(windowItem[column.key], currency)}</strong>`;
        button.addEventListener('click', () => openMonthDetail({
          dateFrom: windowItem.dateFrom,
          dateTo: windowItem.dateTo,
          status: 'Pendiente',
          direction: column.direction,
          currency
        }));
        box.appendChild(button);
      });
      container.appendChild(box);
    });
  }

  function panelPeriodFilters() {
    return {
      dateFrom: document.getElementById('panelDateFrom').value,
      dateTo: document.getElementById('panelDateTo').value,
      currency: document.getElementById('panelCurrency').value,
      reading: document.getElementById('panelReading')?.value || 'total',
      exercise: document.getElementById('panelExercise')?.value || Core.managementExerciseForDate(Core.todayIso())
    };
  }

  function renderPeriodPanel() {
    const filters = panelPeriodFilters();
    const settledRows = Core.filterFlowRows(state, {
      currency: filters.currency,
      status: 'settled',
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    });
    const collected = settledRows.filter((row) => row.direction === 'in' && row.userStatus === 'Cobrado');
    const paid = settledRows.filter((row) => row.direction === 'out' && row.userStatus === 'Pagado');
    const income = Core.flowTotals(collected).incomes;
    const expense = Core.flowTotals(paid).expenses;
    const cards = document.getElementById('periodCards');
    cards.innerHTML = '';
    cards.appendChild(metricButton('Total ingresos cobrados', income, filters.currency, { ...filters, status: 'Cobrado', direction: 'in' }));
    cards.appendChild(metricButton('Total egresos pagados', expense, filters.currency, { ...filters, status: 'Pagado', direction: 'out' }));
    cards.appendChild(metricButton('Saldo financiero del periodo', income - expense, filters.currency, { ...filters, status: 'settled' }));
    renderDonut('paidDonut', Core.activityDistribution(state, { ...filters, status: 'Pagado', direction: 'out' }), filters.currency, { ...filters, status: 'Pagado', direction: 'out' });
    renderDonut('collectedDonut', Core.activityDistribution(state, { ...filters, status: 'Cobrado', direction: 'in' }), filters.currency, { ...filters, status: 'Cobrado', direction: 'in' });
    const rows = Core.periodSummaryByActivity(state, filters);
    const totals = rows.reduce((acc, row) => {
      acc.income += row.income;
      acc.expense += row.expense;
      acc.net += row.net;
      return acc;
    }, { activity: 'TOTAL', income: 0, expense: 0, net: 0 });
    renderTable('periodSummaryTable', [
      { label: 'Actividad', value: 'activity', minWidth: 170 },
      { label: 'Ingresos cobrados', value: (row) => formatMoney(row.income, filters.currency), link: (row) => ({ type: 'monthDetail', dateFrom: filters.dateFrom, dateTo: filters.dateTo, currency: filters.currency, status: 'Cobrado', direction: 'in', filters: row.activity === 'TOTAL' ? {} : { activity: row.activity } }), className: () => 'amount', minWidth: 160 },
      { label: 'Egresos pagados', value: (row) => formatMoney(row.expense, filters.currency), link: (row) => ({ type: 'monthDetail', dateFrom: filters.dateFrom, dateTo: filters.dateTo, currency: filters.currency, status: 'Pagado', direction: 'out', filters: row.activity === 'TOTAL' ? {} : { activity: row.activity } }), className: () => 'amount', minWidth: 160 },
      { label: 'Saldo', value: (row) => formatMoney(row.net, filters.currency), link: (row) => ({ type: 'monthDetail', dateFrom: filters.dateFrom, dateTo: filters.dateTo, currency: filters.currency, status: 'settled', filters: row.activity === 'TOTAL' ? {} : { activity: row.activity } }), className: (row) => `amount ${row.net < 0 ? 'negative' : 'positive'}`, minWidth: 150 }
    ], [...rows, totals]);
  }

  function renderDonut(containerId, segments, currency, baseTarget) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const total = segments.reduce((sum, item) => sum + item.amount, 0);
    const colors = ['#245447', '#A96B13', '#5D6B63', '#23804D', '#7A837E'];
    let cursor = 0;
    const gradient = segments.map((segment, index) => {
      const start = cursor;
      const end = cursor + (total ? segment.amount / total * 100 : 0);
      cursor = end;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    }).join(', ');
    const donut = document.createElement('div');
    donut.className = 'donut';
    donut.style.background = total ? `conic-gradient(${gradient})` : '#EEF4F1';
    const center = document.createElement('span');
    center.textContent = formatMoney(total, currency);
    donut.appendChild(center);
    const legend = document.createElement('div');
    legend.className = 'donut-legend';
    segments.forEach((segment, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'legend-item';
      button.innerHTML = `<span style="background:${colors[index % colors.length]}"></span>${segment.activity}: ${formatMoney(segment.amount, currency)} (${Math.round(segment.percent * 100)}%)`;
      button.addEventListener('click', () => openMonthDetail({ ...baseTarget, filters: { activity: segment.activity } }));
      legend.appendChild(button);
    });
    container.append(donut, legend);
  }

  function renderPanel() {
    const filters = panelPeriodFilters();
    const summary = Core.panelGeneralSummary(state, filters);
    renderEconomicNotes('panelEconomicPeriod', 'panelEconomicWarnings', summary.exercise, summary.range, summary.economicByCurrency);
    panelUpcomingWindows = summary.upcoming;
    renderPanelPosition(summary);

    renderTable('panelUpcomingTable', [
      { label: 'Horizonte', value: (row) => `${row.days} dias`, link: (row) => ({ type: 'panelUpcoming', days: row.days, currency: row.currency }), minWidth: 82 },
      { label: 'Moneda', value: 'currency', minWidth: 66 },
      { label: 'Ingresos', node: (row) => panelAmountWithBreakdown(row.income, row.currency, row.overdueIncome, row.horizonIncome, { type: 'panelUpcoming', days: row.days, currency: row.currency, direction: 'in' }), className: () => 'amount positive panel-amount-cell', minWidth: 150 },
      { label: 'Egresos', node: (row) => panelAmountWithBreakdown(row.expense, row.currency, row.overdueExpense, row.horizonExpense, { type: 'panelUpcoming', days: row.days, currency: row.currency, direction: 'out' }), className: () => 'amount negative panel-amount-cell', minWidth: 150 }
    ], summary.upcoming);
    if (panelUpcomingDetailTarget) renderPanelUpcomingDetail();

    renderEconomicPanelTable('panelExerciseResultTable', summary.economicByCurrency, { ...filters, ...summary.range });
    renderEconomicPanelTable('panelAgricultureResultTable', summary.agriculture.economicByCurrency, { ...filters, ...summary.range, activity: 'Agricultura' });
    renderTable('panelGrainTable', [
      { label: 'Cereal/campana', value: (row) => `${row.cereal} ${row.campaign}`, link: (row) => ({ type: 'grainLocation', id: row.rows[0]?.locationId, cereal: row.cereal, campaign: row.campaign }), minWidth: 126 },
      { label: 'Stock total', value: (row) => `${formatKg(row.totalKg)} kg`, className: () => 'amount', minWidth: 96 },
      { label: 'Acopios', value: (row) => `${formatKg(row.elevatorKg)} kg`, className: () => 'amount', minWidth: 86 },
      { label: 'Campo/silos', value: (row) => `${formatKg(row.fieldStorageKg)} kg`, className: () => 'amount', minWidth: 96 },
      { label: 'FWD pendiente', value: (row) => `${formatKg(row.pendingForwardKg)} kg`, className: () => 'amount', minWidth: 108 },
      { label: 'Valuacion estimada', value: (row) => row.valuationCurrency ? formatMoney(row.estimatedValuation, row.valuationCurrency) : 'Sin precio', className: () => 'amount', minWidth: 132 }
    ], summary.agriculture.grain);

    renderEconomicPanelTable('panelLivestockResultTable', summary.livestock.economicByCurrency, { ...filters, ...summary.range, activity: 'Ganaderia' });
    renderTable('panelLivestockTable', [
      { label: 'Indicador', value: 'label', minWidth: 150 },
      { label: 'Valor', value: 'value', link: (row) => row.link, className: () => 'amount', minWidth: 108 }
    ], [
      { label: 'Cabezas totales', value: formatKg(summary.livestock.summary.totalHeads), link: { type: 'livestockHerd', id: summary.livestock.summary.rows[0]?.herdId } },
      { label: 'Kg vivos estimados', value: `${formatKg(summary.livestock.summary.liveWeightKg)} kg`, link: { type: 'livestockHerd', id: summary.livestock.summary.rows[0]?.herdId } },
      ...Object.entries(summary.livestock.summary.valuationByCurrency).map(([currency, amount]) => ({ label: `Valuacion estimada ${currency}`, value: formatMoney(amount, currency), link: { type: 'livestockHerd', id: summary.livestock.summary.rows[0]?.herdId } })),
      ...summary.livestock.summary.byCategory.map((row) => ({ label: row.category, value: `${formatKg(row.heads)} cabezas`, link: { type: 'livestockHerd', id: summary.livestock.summary.rows.find((item) => item.category === row.category)?.herdId } }))
    ]);

    renderTable('panelTaxTable', [
      { label: 'Moneda', value: 'currency', minWidth: 64 },
      ...[['vatDebit', 'IVA débito'], ['vatCredit', 'IVA crédito'], ['vatDifference', 'Diferencia IVA'], ['vatWithholdings', 'Retenciones IVA'], ['vatPerceptions', 'Percepciones IVA'], ['vatReimbursements', 'Reintegros']].map(([metric, label]) => ({ label,
        node: (row) => indicatorAmountNode(Core.taxIndicatorDetail(state, row.totals, metric, { exercise: summary.exercise, ...Core.exerciseBounds(summary.exercise), reading: summary.reading, currency: row.currency }), label),
        className: () => 'amount', minWidth: 108 }))
    ], summary.taxesByCurrency);

    renderTable('panelControlTable', [
      { label: 'Control', value: 'label', minWidth: 170 },
      { label: 'Cant.', value: 'count', className: () => 'amount', minWidth: 54 },
      { label: 'Accion', node: (row) => actionGroup([{ label: 'Ver', fn: () => showTrace({ type: 'controlGroup', row }) }]), minWidth: 66 }
    ], summary.controls);
  }

  function renderPanelPosition(summary) {
    const bankCashRows = panelBankCashRows(summary.currencies);
    const rows = [
      { label: 'Bancos', metric: 'bank', amounts: Object.fromEntries(summary.currencies.map((currency) => [currency, bankCashRows.bank[currency] || 0])) },
      { label: 'Caja', metric: 'cash', amounts: Object.fromEntries(summary.currencies.map((currency) => [currency, bankCashRows.cash[currency] || 0])) },
      { label: 'Cuentas a cobrar', metric: 'receivables', rowClass: 'panel-position-commercial', amounts: summary.position.receivable },
      { label: 'Cuentas a pagar', metric: 'payables', amounts: summary.position.payable },
      { label: 'Valores en cartera', metric: 'portfolio', amounts: summary.position.receivedChecks }
    ];
    const columns = [
      { label: 'Concepto', value: 'label', minWidth: 150 },
      ...summary.currencies.map((currency) => ({
        label: currency,
        node: (row) => indicatorAmountNode(panelPositionDetail(summary, row, currency)),
        className: (row) => moneyClass(row.amounts[currency] || 0),
        minWidth: 112
      }))
    ];
    renderTable('panelPositionTable', columns, rows);
  }

  function panelPositionDetail(summary, row, currency) {
    let components;
    if (['bank', 'cash'].includes(row.metric)) components = summary.position.accounts.filter((account) => account.type === row.metric).map((account) => ({
      id: account.id, financialAccountId: account.id, currency: account.currency, amount: account.realBalance, documentType: 'Saldo de cuenta',
      description: `Saldo registrado; incluye apertura ${account.openingBalance} ${account.currency}. No es una suma de movimientos.` }));
    else if (row.metric === 'portfolio') components = summary.position.portfolio.map((instrument) => ({ ...instrument, instrumentId: instrument.id, date: instrument.scheduledDate }));
    else components = summary.position[row.metric];
    return Core.reconcileIndicatorDetail(state, { title: row.label, amount: row.amounts[currency] || 0, currency,
      filters: { currency, scope: 'Situación actual: sin filtro de ejercicio, período o lectura documental' }, rows: components.filter((item) => item.currency === currency && item.amount !== 0) });
  }

  function panelBankCashRows(currencies) {
    return Core.accountBalances(state).reduce((totals, account) => {
      if (!currencies.includes(account.currency)) return totals;
      const bucket = account.type === 'cash' ? 'cash' : account.type === 'bank' ? 'bank' : '';
      if (!bucket) return totals;
      totals[bucket][account.currency] = (totals[bucket][account.currency] || 0) + Number(account.realBalance || 0);
      return totals;
    }, { bank: {}, cash: {} });
  }

  function panelAccountLinksByCurrency(type, currencies) {
    return Object.fromEntries(currencies.map((currency) => [
      currency,
      { type: 'financialAccount', id: state.financialAccounts.find((account) => account.type === type && account.currency === currency)?.id }
    ]));
  }

  function panelAmountWithBreakdown(total, currency, overdue, horizon, target) {
    const wrap = document.createElement('span');
    wrap.className = 'panel-amount-breakdown';
    wrap.appendChild(traceButton(formatMoney(total, currency), target, 'link-button panel-total-link'));
    const detail = document.createElement('span');
    detail.className = 'panel-subamounts';
    detail.textContent = `Anteriores ${formatMoney(overdue, currency)} · Horizonte ${formatMoney(horizon, currency)}`;
    wrap.appendChild(detail);
    return wrap;
  }

  function panelUpcomingDetailRows(target) {
    const period = panelUpcomingWindows.find((item) => item.days === target.days && item.currency === target.currency);
    const rows = panelUpcomingDetailMode === 'all' ? period?.displayRows : period?.rows;
    return rows ? rows.filter((row) => !target.direction || row.direction === target.direction) : [];
  }

  function panelDocumentReference(row) {
    const doc = state.documents.find((item) => item.id === row.documentId);
    const readable = (value, technicalIds = []) => {
      if (typeof value !== 'string') return '';
      const text = value.trim();
      if (!text || /^(true|false)$/i.test(text) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) return '';
      return technicalIds.includes(text) ? '' : text;
    };
    if (doc) {
      return readable(doc.number, [doc.id]) || readable(doc.description, [doc.id])
        || (doc.fiscalStatus === 'no_receipt' ? 'Sin comprobante' : 'Sin número de documento');
    }
    if (row.orderId) return orderDisplayCode(row.orderId) || 'Orden vinculada';
    const instrument = state.instruments.find((item) => item.id === row.instrumentId);
    if (instrument) return readable(instrument.checkNumber, [instrument.id]) || readable(instrument.reference, [instrument.id]) || labelForType(instrument.type);
    return readable(row.reference, [row.id]) || readable(row.concept, [row.id]) || 'Sin documento';
  }

  function panelDocumentTarget(row) {
    if (row.documentId && state.documents.some((doc) => doc.id === row.documentId)) return { type: 'document', id: row.documentId };
    if (row.orderId && state.orders.some((order) => order.id === row.orderId)) return { type: 'order', id: row.orderId };
    return flowRowPrimaryTarget(row);
  }

  function renderPanelUpcomingDetail() {
    const target = panelUpcomingDetailTarget;
    if (!target) return;
    const period = panelUpcomingWindows.find((item) => item.days === target.days && item.currency === target.currency);
    if (!period) { closePanelUpcomingDetail(); return; }
    const rows = panelUpcomingDetailRows(target);
    const openRows = period.rows.filter((row) => !target.direction || row.direction === target.direction);
    const totals = Core.flowTotals(openRows);
    document.getElementById('panelUpcomingDetailTitle').textContent = `${target.days} dias · ${target.currency}${target.direction ? ` · ${target.direction === 'in' ? 'Ingresos' : 'Egresos'}` : ''}`;
    document.getElementById('panelUpcomingDetailTotals').textContent = `Anteriores al ${formatDate(period.dateFrom)} + vencimientos hasta ${formatDate(period.dateTo)} · Ingresos abiertos ${formatMoney(totals.incomes, target.currency)} · Egresos abiertos ${formatMoney(totals.expenses, target.currency)}`;
    document.getElementById('panelUpcomingDetailMode').value = panelUpcomingDetailMode;
    renderTable('panelUpcomingDetailTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 88 },
      { label: 'Tipo', value: (row) => row.direction === 'in' ? 'Ingreso' : 'Egreso', minWidth: 70 },
      { label: 'Contraparte', value: (row) => row.entityName || '—', minWidth: 130 },
      { label: 'Documento', value: panelDocumentReference, link: panelDocumentTarget, minWidth: 102 },
      { label: 'OP/OC', value: (row) => row.orderId ? orderDisplayCode(row.orderId) : '—', link: (row) => row.orderId ? { type: 'order', id: row.orderId } : null, minWidth: 80 },
      { label: 'Importe', value: (row) => formatMoney(Math.abs(row.amount), row.currency), link: (row) => flowRowPrimaryTarget(row), className: () => 'amount', minWidth: 122 },
      { label: 'Moneda', value: 'currency', minWidth: 55 },
      { label: 'Estado', value: 'userStatus', minWidth: 85 },
      { label: 'Tramo', value: (row) => row.userStatus === 'Pagado' || row.userStatus === 'Cobrado' ? 'Realizado' : row.date < period.dateFrom ? 'Pendiente anterior' : 'Horizonte', minWidth: 110 },
      { label: 'Acciones', node: flowActionNode, minWidth: 132 }
    ], rows);
  }

  function openPanelUpcomingDetail(target) {
    panelUpcomingDetailTarget = { days: target.days, currency: target.currency, direction: target.direction || '' };
    panelUpcomingDetailMode = 'pending';
    renderPanelUpcomingDetail();
    const panel = document.getElementById('panelUpcomingDetail');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closePanelUpcomingDetail() {
    panelUpcomingDetailTarget = null;
    document.getElementById('panelUpcomingDetail')?.classList.add('hidden');
    document.getElementById('panelUpcomingTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderEconomicPanelTable(tableId, rows, filters) {
    renderTable(tableId, [
      { label: 'Moneda', value: 'currency', minWidth: 64 },
      ...[['income', 'Ingresos económicos'], ['expense', 'Costos económicos'], ['result', 'Resultado de gestión']].map(([metric, label]) => ({
        label, node: (row) => indicatorAmountNode(Core.economicIndicatorDetail(state, row.summary, metric, { ...filters, currency: row.currency })),
        className: () => 'amount', minWidth: 134
      }))
    ], rows);
  }

  function indicatorAmountNode(detail, title) {
    const node = document.createElement(detail.reconciled ? 'button' : 'span');
    node.textContent = formatFlowMoney(detail.amount, detail.currency);
    if (detail.reconciled) {
      node.type = 'button'; node.className = 'link-button';
      node.addEventListener('click', () => openIndicatorDetail({ ...detail, title: title || detail.title }));
    } else {
      node.title = detail.limitation;
      // Short mark in the cell; the full explanation stays in the tooltip.
      const reason = document.createElement('small'); reason.className = 'indicator-limitation'; reason.textContent = 'sin detalle'; reason.title = detail.limitation;
      node.appendChild(reason);
    }
    return node;
  }

  function filterIndicatorRows(rows, query) {
    const text = String(query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return rows.filter((row) => [row.entityName, row.number, row.documentType, row.description, row.activity].join(' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(text));
  }

  function openIndicatorDetail(detail) {
    if (!detail.reconciled) return;
    const panel = openRecordPanel(detail.title);
    const criteria = document.createElement('p');
    const f = detail.filters || {};
    const readings = { total: 'Gestión total', documented: 'Documentado', no_receipt: 'Sin comprobante' };
    criteria.textContent = [f.exercise && `Ejercicio ${f.exercise}`, f.dateFrom && `Desde ${formatDate(f.dateFrom)}`, f.dateTo && `Hasta ${formatDate(f.dateTo)}`,
      f.activity || 'Todas las actividades', readings[f.reading] || 'Saldo/valores sin filtro documental', detail.currency, f.scope].filter(Boolean).join(' · ');
    const totals = document.createElement('p');
    totals.className = 'indicator-totals';
    totals.textContent = `Importe original: ${formatFlowMoney(detail.amount, detail.currency)} · Total conciliado: ${formatFlowMoney(detail.total, detail.currency)}`;
    const searchLabel = document.createElement('label'); searchLabel.textContent = 'Buscar contraparte, concepto o documento';
    const search = document.createElement('input'); search.type = 'search'; searchLabel.appendChild(search);
    const visibleTotal = document.createElement('p'); visibleTotal.className = 'muted';
    const wrapper = document.createElement('div'); wrapper.className = 'table-wrap indicator-detail-table';
    const table = document.createElement('table'); wrapper.appendChild(table);
    const render = () => {
      const rows = filterIndicatorRows(detail.rows, search.value);
      table.innerHTML = '';
      const header = table.createTHead().insertRow();
      ['Fecha / actividad', 'Contraparte', 'Tipo / referencia', 'Concepto', 'Moneda', 'Contribución', 'Origen'].forEach((label) => {
        const th = document.createElement('th'); th.textContent = label; header.appendChild(th);
      });
      const body = table.createTBody();
      rows.forEach((row) => {
        const tr = body.insertRow();
        [`${row.date ? formatDate(row.date) : 'Sin fecha registrada'} · ${row.activity || 'Sin actividad informada'}`, row.entityName || 'Sin contraparte',
          `${row.documentType} · ${row.number || 'Sin referencia'}`, row.description, row.currency, formatFlowMoney(row.amount, row.currency)]
          .forEach((value, index) => { const cell = tr.insertCell(); cell.textContent = value; if (index === 5) cell.className = 'amount'; });
        const cell = tr.insertCell();
        if (row.target) cell.appendChild(traceButton('Abrir', row.target));
        else cell.textContent = 'Sin registro individual';
      });
      const cents = rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
      visibleTotal.textContent = `${rows.length} componentes visibles · Subtotal de búsqueda: ${formatFlowMoney(cents / 100, detail.currency)}${detail.rows.length ? '' : ' · Indicador sin componentes'}`;
    };
    search.addEventListener('input', render);
    panel.append(criteria, totals, searchLabel, visibleTotal, wrapper);
    render(); panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return panel;
  }

  function renderEconomicNotes(periodId, warningsId, exercise, range, rows) {
    const period = document.getElementById(periodId);
    if (period) period.textContent = `Ejercicio ${exercise} · Período económico: ${formatDate(range.dateFrom)} a ${formatDate(range.dateTo)}${range.dateFrom > range.dateTo ? ' · Sin período transcurrido' : ''}`;
    const container = document.getElementById(warningsId);
    if (!container) return;
    const messages = rows.flatMap(({ currency, summary }) => {
      const legacy = summary.legacyUnclassified;
      return [
        ...(legacy?.count ? [`${currency}: ${legacy.count} registros con clasificación histórica conservada. Incluidos en Gestión total: ingresos ${formatMoney(legacy.income, currency)}, costos ${formatMoney(legacy.expense, currency)}, resultado ${formatMoney(legacy.result, currency)}. No integran Documentado ni Sin comprobante.`] : []),
        ...(summary.warnings || []).map((message) => `${currency}: ${message}`)
      ];
    });
    container.innerHTML = messages.length ? `<details><summary>Observaciones económicas (${messages.length})</summary>${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join('')}</details>` : '';
  }

  function renderPanelTaxSummary() {
    const container = document.getElementById('panelTaxSummary');
    if (!container) return;
    const filters = panelPeriodFilters();
    const taxes = Core.taxTotals(state, { mode: 'exercise', exercise: filters.exercise, reading: filters.reading, currency: filters.currency });
    const rows = [
      ['IVA debito', taxes.vatDebit],
      ['IVA credito', taxes.vatCredit],
      ['Diferencia IVA debito - IVA credito', taxes.vatDifference],
      ['Retenciones sufridas', taxes.vatWithholdings],
      ['Percepciones sufridas', taxes.vatPerceptions],
      ['Reintegros recibidos', taxes.vatReimbursements],
      ['Debitos/creditos bancarios', taxes.bankDebitCreditTax],
      ['Otros', taxes.other]
    ];
    container.innerHTML = rows.map(([label, value]) => `
      <button type="button" class="summary-line" data-tax-jump="1">
        <span>${label}</span>
        <strong class="${value < 0 ? 'negative' : value > 0 ? 'positive' : ''}">${formatMoney(value, filters.currency)}</strong>
      </button>
    `).join('');
    container.querySelectorAll('[data-tax-jump]').forEach((button) => {
      button.addEventListener('click', () => document.querySelector('[data-view="impuestos"]')?.click());
    });
  }

  function renderEntities() {
    const q = document.getElementById('entitySearch').value.trim().toLowerCase();
    const role = document.getElementById('entityRoleFilter').value;
    const rows = state.entities
      .filter((entity) => entity.active !== false && !entity.mergedIntoEntityId)
      .filter((entity) => !role || entity.role === role)
      .filter((entity) => !q || entity.name.toLowerCase().includes(q) || String(entity.cuit || '').includes(q));
    renderTable('entitiesTable', [
      { label: 'Contraparte', value: 'name', link: (row) => makeEntityLink(row.id), minWidth: 220 },
      { label: 'CUIT', value: 'cuit', minWidth: 130 },
      { label: 'Rol', value: (row) => row.role || row.type, minWidth: 130 },
      { label: 'Actividad sugerida', value: 'suggestedActivity', minWidth: 170 },
      { label: 'Cuenta sugerida', value: (row) => row.suggestedChartAccountId ? Core.chartPath(state, row.suggestedChartAccountId) : '', link: (row) => makeChartLink(row.suggestedChartAccountId), minWidth: 240 },
      { label: 'Acciones', node: (row) => actionGroup([{ label: 'Ficha', fn: () => showEntityDetail(row.id) }, { label: 'Editar', fn: () => editEntity(row.id) }]), minWidth: 130 }
    ], rows);
  }

  function flowColumns() {
    return [
      { label: 'Fecha', value: (row) => row.datePrecision === 'month' ? `${row.date.slice(5, 7)}/${row.date.slice(0, 4)}` : formatDate(row.date), minWidth: 82 },
      { label: 'Contraparte', value: 'entityName', link: (row) => makeEntityLink(row.entityId), minWidth: 132 },
      { label: 'Referencia', value: flowOriginLabel, link: flowRowPrimaryTarget, className: () => 'flow-reference', minWidth: 94 },
      { label: 'Concepto', value: (row) => row.concept || row.detail || '', link: (row) => makeChartLink(row.chartAccountId), className: () => 'flow-concept', minWidth: 140 },
      { label: 'Medio', value: flowMediumLabel, minWidth: 94 },
      { label: 'Estado', value: (row) => labelForStatus(row.userStatus), node: flowStatusBadge, minWidth: 76 },
      { label: 'Ingreso', value: flowIncomeAmount, link: flowRowPrimaryTarget, className: () => 'amount positive', headerClass: 'amount-head positive', minWidth: 108 },
      { label: 'Egreso', value: flowExpenseAmount, link: flowRowPrimaryTarget, className: () => 'amount negative', headerClass: 'amount-head negative', minWidth: 108 },
      { label: 'Acción', node: flowActionNode, minWidth: 132 }
    ];
  }

  function renderFlow() {
    const activity = document.getElementById('flowActivityFilter').value;
    const status = document.getElementById('flowKindFilter').value;
    const currency = document.getElementById('flowCurrencyFilter').value;
    const chartAccountId = document.getElementById('flowChartFilter').value;
    const entityId = document.getElementById('flowEntityFilter').value;
    const rows = Core.filterFlowRows(state, { activity, status, currency, chartAccountId, entityId });
    renderTable('flowTable', flowColumns(), rows);
    renderMonthly();
    renderAgriculturalProjectionHistory();
    // Folded filters still show how many are applied, so a filtered flow is never mistaken for the full one.
    const active = [activity, status, currency, chartAccountId, entityId].filter(Boolean).length;
    const counter = document.getElementById('flowActiveFilters');
    if (counter) counter.textContent = active ? `(${active} activo${active === 1 ? '' : 's'})` : '';
  }

  function agriculturalIncomeKind(row) {
    if (row.activity !== 'Agricultura' || row.direction !== 'in') return '';
    if (row.source === 'agricultural-income-projection') return 'Cosecha estimada';
    return row.source === 'estimate' ? 'Otras previsiones' : 'Registrado / FWD';
  }

  function renderAgriculturalProjectionHistory() {
    const active = document.getElementById('agriculturalProjectionActiveTable');
    if (active) {
      const estimated = (state.agriculturalIncomeProjections || []).filter((item) => item.status === 'estimated');
      renderTable(active.id, [
        { label: 'Campaña', value: (item) => item.campaign },
        { label: 'Cultivo', value: (item) => item.crop },
        { label: 'Fecha prevista', value: (item) => item.datePrecision === 'month' ? String(item.plannedDate || '').slice(0, 7) : formatDate(item.plannedDate) },
        { label: 'Concepto', value: (item) => item.concept },
        { label: 'Importe', value: (item) => formatFlowMoney(item.amount, item.currency), className: () => 'amount' },
        { label: 'Acción', node: (item) => actionGroup([{ label: 'Editar, eliminar o convertir', fn: () => openAgriculturalProjection(item.id) }]) }
      ], estimated);
      active.closest?.('.table-wrap')?.classList.toggle('hidden', !estimated.length);
    }
    const table = document.getElementById('agriculturalProjectionHistoryTable');
    if (!table) return;
    const rows = (state.agriculturalIncomeProjections || []).filter((item) => item.status !== 'estimated');
    document.getElementById('agriculturalProjectionHistoryCount').textContent = `(${rows.length})`;
    renderTable(table.id, [
      { label: 'Campaña', value: (item) => item.campaign },
      { label: 'Cultivo', value: (item) => item.crop },
      { label: 'Concepto', value: (item) => item.concept, link: (item) => ({ type: 'agricultural-income-projection', id: item.id }) },
      { label: 'Estado', value: (item) => item.status === 'replaced' ? 'Reemplazada' : 'Eliminada' },
      { label: 'Importe', value: (item) => formatFlowMoney(item.amount, item.currency), className: () => 'amount' },
      { label: 'Acción', node: (item) => actionGroup([{ label: 'Ver', fn: () => openAgriculturalProjection(item.id) }]) }
    ], rows);
  }

  function openAgriculturalProjection(id) {
    const item = (state.agriculturalIncomeProjections || []).find((candidate) => candidate.id === id);
    if (id && !item) return;
    const editable = !item || item.status === 'estimated';
    document.getElementById('agriculturalProjectionTitle').textContent = !item ? 'Nueva proyección agrícola' : editable ? 'Editar cosecha estimada' : `Proyección ${item.status === 'replaced' ? 'reemplazada' : 'eliminada'}`;
    document.getElementById('agriculturalProjectionId').value = item?.id || '';
    fillOptions('agriculturalProjectionCrop', Core.GRAIN_TYPES.map((crop) => ({ value: crop, label: crop })));
    const fields = { Campaign: item?.campaign || '', Crop: item?.crop || Core.GRAIN_TYPES[0], Precision: item?.datePrecision || 'month', Currency: item?.currency || 'ARS', Amount: item ? formatDecimal(item.amount) : '', Concept: item?.concept || 'Cosecha estimada', Notes: item?.notes || '', Circuit: '' };
    Object.entries(fields).forEach(([name, value]) => { document.getElementById(`agriculturalProjection${name}`).value = value; });
    const date = document.getElementById('agriculturalProjectionDate');
    date.type = item?.datePrecision === 'day' ? 'date' : 'month';
    date.value = date.type === 'month' ? (item?.plannedDate || Core.todayIso()).slice(0, 7) : item.plannedDate;
    document.getElementById('agriculturalProjectionFields').disabled = !editable;
    document.getElementById('agriculturalProjectionActions').classList.toggle('hidden', !editable);
    document.getElementById('deleteAgriculturalProjection').classList.toggle('hidden', !item);
    document.getElementById('replaceAgriculturalProjection').classList.toggle('hidden', !item);
    document.getElementById('agriculturalProjectionCircuit').parentElement.classList.toggle('hidden', !item);
    document.getElementById('agriculturalProjectionError').classList.add('hidden');
    document.getElementById('agriculturalProjectionHistoryInfo').textContent = item ? `ID: ${item.id} · Agricultura · ${item.status} · ${item.replacedAt || item.voidedAt || item.updatedAt}${item.replacementCircuit ? ` · Circuito elegido: ${item.replacementCircuit}` : ''}` : '';
    const panel = document.getElementById('agriculturalProjectionPanel');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (editable) document.getElementById('agriculturalProjectionCampaign').focus();
  }

  function changeAgriculturalProjectionPrecision() {
    const date = document.getElementById('agriculturalProjectionDate');
    const previous = date.value;
    date.type = valueFromInput('agriculturalProjectionPrecision') === 'month' ? 'month' : 'date';
    date.value = previous ? (date.type === 'month' ? previous.slice(0, 7) : `${previous.slice(0, 7)}-01`) : '';
  }

  function agriculturalProjectionPayload() {
    const datePrecision = valueFromInput('agriculturalProjectionPrecision');
    const value = valueFromInput('agriculturalProjectionDate');
    return { campaign: valueFromInput('agriculturalProjectionCampaign'), crop: valueFromInput('agriculturalProjectionCrop'), plannedDate: datePrecision === 'month' && value ? `${value}-01` : value, datePrecision, currency: valueFromInput('agriculturalProjectionCurrency'), amount: numberFromInput('agriculturalProjectionAmount'), concept: valueFromInput('agriculturalProjectionConcept'), notes: valueFromInput('agriculturalProjectionNotes') };
  }

  async function saveAgriculturalProjection(action = 'save') {
    const form = document.getElementById('agriculturalProjectionForm');
    if (pendingSaves.has(form)) return;
    const id = valueFromInput('agriculturalProjectionId');
    if (action === 'delete' && !window.confirm('¿Eliminar esta estimación del Flujo?')) return;
    const circuit = valueFromInput('agriculturalProjectionCircuit');
    const errorBox = document.getElementById('agriculturalProjectionError');
    const button = action === 'save' ? form.querySelector('[type="submit"]') : document.getElementById(action === 'delete' ? 'deleteAgriculturalProjection' : 'replaceAgriculturalProjection');
    return runPersistentAction(form, async () => {
      if (action === 'replace' && !circuit) throw new Error('Elegí el circuito del ingreso real antes de reemplazar.');
      if (action === 'replace' && !window.confirm('¿Retirar la estimación y continuar al formulario del ingreso real?')) return;
      errorBox.classList.add('hidden');
      const body = action === 'save'
        ? id ? { action: 'updateAgriculturalIncomeProjection', id, changes: agriculturalProjectionPayload() } : { action: 'createAgriculturalIncomeProjection', payload: agriculturalProjectionPayload() }
        : { action: action === 'delete' ? 'deleteAgriculturalIncomeProjection' : 'replaceAgriculturalIncomeProjection', id, ...(action === 'replace' ? { payload: { replacementCircuit: circuit } } : {}) };
      await postTransaction(body);
      ['Id', 'Campaign', 'Crop', 'Date', 'Amount', 'Concept', 'Notes', 'Circuit'].forEach((name) => { document.getElementById(`agriculturalProjection${name}`).value = ''; });
      document.getElementById('agriculturalProjectionCurrency').value = 'ARS';
      document.getElementById('agriculturalProjectionPrecision').value = 'month';
      document.getElementById('agriculturalProjectionPanel').classList.add('hidden');
      if (action === 'replace') continueAgriculturalRealIncome(circuit);
    }, { button, label: action === 'delete' ? 'Eliminando...' : 'Guardando...' });
  }

  function continueAgriculturalRealIncome(circuit) {
    if (circuit === 'sale') {
      document.querySelector('[data-view="operaciones"]')?.click();
      showDocumentFormPanel();
      document.getElementById('docType').value = 'sale_invoice';
      document.getElementById('docType').dispatchEvent(new Event('change'));
      return;
    }
    document.querySelector('[data-view="cereales"]')?.click();
    showGrainOperation(circuit);
  }

  function resetFlowFilters() {
    const defaults = {
      flowActivityFilter: '',
      flowKindFilter: '',
      flowCurrencyFilter: '',
      flowChartFilter: '',
      flowEntityFilter: '',
      flowExercise: '',
      monthlyHorizon: '12'
    };
    Object.entries(defaults).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });
    const startMonth = document.getElementById('flowStartMonth');
    if (startMonth) startMonth.value = Core.todayIso().slice(0, 7);
    monthDetail = null;
    orderDetailReturn = null;
    document.getElementById('monthDetailPanel')?.classList.add('hidden');
    document.getElementById('orderDetailPanel')?.classList.add('hidden');
    document.getElementById('instrumentDetailPanel')?.classList.add('hidden');
    renderFlow();
  }

  function flowCurrencyTotals(rows, currency) {
    return (currency ? [currency] : Core.CURRENCIES).map((unit) => ({ currency: unit, ...Core.flowTotals(rows.filter((row) => row.currency === unit)) }));
  }

  function renderFlowCurrencyTotals(containerId, groups) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    groups.forEach((totals) => {
      const group = document.createElement('div');
      group.className = 'flow-currency-total';
      group.dataset.currency = totals.currency;
      [
        [`Total ingresos ${totals.currency}`, totals.incomes, 'positive'],
        [`Total egresos ${totals.currency}`, totals.expenses, 'negative'],
        [`Saldo ${totals.currency}`, totals.net, totals.net < 0 ? 'negative' : totals.net > 0 ? 'positive' : 'neutral']
      ].forEach(([label, amount, className]) => {
        const name = document.createElement('span');
        name.textContent = label;
        const value = document.createElement('strong');
        value.className = className;
        value.textContent = formatFlowMoney(amount, totals.currency);
        if (label.startsWith('Saldo')) value.title = 'Ingresos menos egresos de las filas filtradas';
        group.append(name, value);
      });
      container.appendChild(group);
    });
  }

  function flowMonthlyCurrencyGroups(options) {
    // "Todo en pesos": a single group where USD rows are converted with the month's estimated rate (display only).
    if (options.viewMode === 'ARS_TOTAL') return [{ currency: 'ARS_TOTAL', months: Core.monthlyFlow(state, { ...options, currency: 'ARS_TOTAL' }) }];
    return (options.currency ? [options.currency] : Core.CURRENCIES).map((currency) => ({ currency, months: Core.monthlyFlow(state, { ...options, currency }) }));
  }

  function shiftMonthStart(isoDate, months) {
    const date = new Date(`${String(isoDate).slice(0, 7)}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + months);
    return date.toISOString().slice(0, 10);
  }

  // How many months before the start month to include, so unpaid items of earlier months stay visible.
  function flowPastMonthCount(from, exercise) {
    const mode = document.getElementById('flowPastMonths')?.value || '';
    if (!mode || exercise) return 0;
    if (mode === 'exercise') {
      const exerciseStart = Core.exerciseBounds(Core.managementExerciseForDate(from)).dateFrom;
      return Math.max(Core.monthKeysBetween(exerciseStart, from).length - 1, 0);
    }
    return Math.max(Number(mode) || 0, 0);
  }

  function renderFxEstimatesEditor(monthKeys) {
    const editor = document.getElementById('fxEstimatesEditor');
    if (!editor) return;
    const stored = new Map((state.fxEstimates || []).map((item) => [item.month, item.rate]));
    const keys = [...new Set([...monthKeys, ...stored.keys()])].sort();
    editor.innerHTML = '';
    keys.forEach((key) => {
      const label = document.createElement('label');
      label.textContent = key;
      const input = document.createElement('input');
      input.type = 'text'; input.inputMode = 'decimal'; input.dataset.fxMonth = key;
      input.value = stored.has(key) ? formatDecimal(stored.get(key)) : '';
      input.placeholder = Core.fxRateForMonth(state, key) ? `usa ${formatDecimal(Core.fxRateForMonth(state, key))}` : 'sin valor';
      label.appendChild(input);
      editor.appendChild(label);
    });
    const status = document.getElementById('fxEstimatesStatus');
    const pesosMode = document.getElementById('flowViewMode')?.value === 'ARS_TOTAL';
    if (status) status.textContent = stored.size ? '' : (pesosMode ? '(sin cargar: los dólares no se están sumando)' : '(sin cargar)');
    if (pesosMode && !stored.size) { const fold = document.getElementById('fxEstimatesFold'); if (fold) fold.open = true; }
  }

  async function saveFxEstimates() {
    const inputs = [...document.querySelectorAll('#fxEstimatesEditor input[data-fx-month]')];
    const rates = inputs.map((input) => ({ month: input.dataset.fxMonth, rate: input.value.trim() === '' ? null : parseLocaleNumber(input.value) }));
    await postTransaction({ action: 'setFxEstimates', payload: { rates } });
  }

  function renderMonthly() {
    const horizon = Number(document.getElementById('monthlyHorizon').value);
    const currency = document.getElementById('flowCurrencyFilter').value;
    const activity = document.getElementById('flowActivityFilter').value;
    const status = document.getElementById('flowKindFilter').value;
    const chartAccountId = document.getElementById('flowChartFilter').value;
    const entityId = document.getElementById('flowEntityFilter').value;
    const exercise = document.getElementById('flowExercise').value;
    const from = document.getElementById('flowStartMonth').value ? `${document.getElementById('flowStartMonth').value}-01` : Core.todayIso();
    const viewMode = document.getElementById('flowViewMode')?.value || '';
    const past = flowPastMonthCount(from, exercise);
    const effectiveFrom = past ? shiftMonthStart(from, -past) : from;
    const groups = flowMonthlyCurrencyGroups({ horizon: horizon + past, currency: viewMode ? '' : currency, viewMode, activity, status, chartAccountId, entityId, exercise: exercise || '', from: effectiveFrom });
    const monthStart = `${groups[0]?.months[0]?.month || from.slice(0, 7)}-01`;
    const overdue = status === 'settled' ? [] : Core.openFlowRows(state, { currency, activity, chartAccountId, entityId, status })
      .filter((row) => row.date && row.date < monthStart);
    const overduePanel = document.getElementById('monthlyOverdue');
    overduePanel.innerHTML = '';
    if (overdue.length) {
      const label = document.createElement('span');
      label.textContent = `Pendientes anteriores al ${formatDate(monthStart)}`;
      overduePanel.appendChild(label);
      [...new Set(overdue.map((row) => row.currency))].sort().forEach((unit) => {
        const totals = Core.flowTotals(overdue.filter((row) => row.currency === unit));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'link-button';
        button.textContent = `${unit}: ingresos ${formatMoney(totals.incomes, unit)} · egresos ${formatMoney(totals.expenses, unit)} · Ver`;
        button.addEventListener('click', () => openMonthDetail({ dateTo: Core.addDays(monthStart, -1), currency: unit, openOnly: true }));
        overduePanel.appendChild(button);
      });
    }
    const container = document.getElementById('monthlyFlow');
    container.innerHTML = '';
    const scope = document.getElementById('monthlyFlowScope');
    if (scope) scope.textContent = status === 'settled' ? 'Realizados' : status === 'Pendiente' ? 'Pendientes proyectados' : status === 'Estimado' ? 'Estimaciones' : 'Realizados + pendientes + estimaciones';
    const currentKey = from.slice(0, 7);
    container.appendChild(monthlyMatrix(groups[0]?.months || [], viewMode || currency, groups, currentKey));
    renderFxEstimatesEditor((groups[0]?.months || []).map((month) => month.month));
    // Open on the start month (normally the current one); earlier months stay one scroll away.
    flowScrollPastMonths = past;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(scrollFlowToStartMonth);
  }

  let flowScrollPastMonths = 0;
  // Called after rendering and when the Flujo tab becomes visible (a hidden table has no width to scroll).
  function scrollFlowToStartMonth() {
    const wrap = document.getElementById('monthlyFlow')?.querySelector?.('.matrix-wrap');
    const heads = wrap?.querySelectorAll?.('thead th');
    const target = heads?.[flowScrollPastMonths + 1];
    if (!wrap || !target || !heads[0] || !wrap.clientWidth) return;
    if (!flowScrollPastMonths) { wrap.scrollLeft = 0; return; }
    // The concept column is sticky, so align the target month with its right edge.
    wrap.scrollLeft = Math.max(wrap.scrollLeft + target.getBoundingClientRect().left - heads[0].getBoundingClientRect().right, 0);
  }

  function mergedCurrencyTreeRows(groups) {
    const trees = groups.map((group) => ({ currency: group.currency, rows: buildTreeRows(group.months) }));
    const mergeNodes = (nodes) => {
      const source = Object.values(nodes)[0];
      const children = new Map();
      const keys = new Set(Object.values(nodes).flatMap((node) => [...node.children?.keys() || []]));
      keys.forEach((key) => {
        const childNodes = Object.fromEntries(Object.entries(nodes).filter(([, node]) => node.children?.has(key)).map(([unit, node]) => [unit, node.children.get(key)]));
        children.set(key, mergeNodes(childNodes));
      });
      return { ...source, months: {}, total: null, children, rows: Object.values(nodes).flatMap((node) => node.rows || []), currencyRows: nodes };
    };
    const rowForKey = (key) => mergeNodes(Object.fromEntries(trees.map((tree) => {
      let row = tree.rows.find((item) => item.key === key);
      if (row && key.startsWith('root/')) {
        const summary = tree.rows.find((item) => item.key === key.replace('root/', 'total/'));
        row = { ...row, months: summary.months, total: summary.total, rows: summary.rows, kind: 'total' };
      }
      return [tree.currency, row];
    }).filter(([, row]) => row)));
    const rows = [];
    ['in', 'out'].forEach((direction) => {
      const root = rowForKey(`root/${direction}`);
      root.kind = 'section';
      rows.push(root);
      root.children.forEach((child) => flattenTree(child, rows));
      rows.push(rowForKey(`total/${direction}`));
    });
    rows.push(rowForKey('total/net'), rowForKey('total/balance'));
    return rows;
  }

  function monthlyMatrix(months, currency, currencyGroups, currentMonthKey = '') {
    const groups = currencyGroups || [{ currency, months }];
    const rows = mergedCurrencyTreeRows(groups);
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-wrap';
    wrapper.dataset.currency = currency || 'all';
    const table = document.createElement('table');
    table.className = 'monthly-matrix';
    const thead = table.createTHead();
    const header = thead.insertRow();
    ['Concepto', ...months.map((month) => month.month), 'Total'].forEach((label, index) => {
      const th = document.createElement('th');
      th.className = index === 0 ? 'matrix-concept-head' : `matrix-month-head${currentMonthKey && label < currentMonthKey && label !== 'Total' ? ' past-month' : ''}${label === currentMonthKey ? ' current-month' : ''}`;
      if (label === 'Concepto' || label === 'Total') th.textContent = label;
      else th.appendChild(traceButton(label, { type: 'monthDetail', month: label, currency }, 'link-button month-header-link'));
      applyColumnWidth('monthlyMatrix', th, index, index === 0 ? 360 : 120);
      th.appendChild(resizeHandle('monthlyMatrix', index, index === 0 ? 260 : 110));
      header.appendChild(th);
    });
    const tbody = table.createTBody();
    rows.forEach((row) => {
      const tr = tbody.insertRow();
      tr.className = `tree-level-${row.level} ${row.kind || ''}`;
      const labelCell = tr.insertCell();
      labelCell.className = 'tree-label';
      labelCell.appendChild(isSummaryMatrixRow(row) ? summaryLabel(row) : treeLabel(row));
      months.forEach((month) => {
        const td = tr.insertCell();
        td.className = `amount${currentMonthKey && month.month < currentMonthKey ? ' past-month' : ''}`;
        renderCurrencyMatrixCell(td, row, groups, (unitRow) => unitRow.months[month.month] || 0, (unitRow, unit) => ({ ...matrixMonthTarget(unitRow, month.month), currency: unit }));
      });
      const total = tr.insertCell();
      total.className = 'amount';
      renderCurrencyMatrixCell(total, row, groups, (unitRow) => unitRow.total || 0, (unitRow, unit) => ({ ...totalTargetForMatrixRow(unitRow, months), currency: unit }));
    });
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderCurrencyMatrixCell(cell, row, groups, amountFor, targetFor) {
    groups.forEach(({ currency }) => {
      const unitRow = row.currencyRows[currency];
      if (!unitRow) return;
      const value = amountFor(unitRow);
      if (Math.abs(value) < 0.005) return;
      const line = document.createElement('div');
      line.className = `matrix-currency-amount ${matrixAmountClass(unitRow, value)}`;
      line.dataset.currency = currency;
      const code = document.createElement('span');
      code.className = 'matrix-currency-code';
      code.textContent = currency === 'ARS_TOTAL' ? 'ARS*' : currency;
      if (currency === 'ARS_TOTAL') code.title = 'Pesos + dólares convertidos con el tipo de cambio estimado del mes';
      line.appendChild(code);
      const target = targetFor(unitRow, currency);
      if (target?.currency === 'ARS_TOTAL') target.currency = '';
      renderMatrixAmountCell(line, value, currency, target, unitRow);
      cell.appendChild(line);
    });
    if (!cell.children.length) {
      cell.textContent = '—';
      cell.classList.add('empty-amount');
    }
  }

  function renderMatrixAmountCell(cell, value, currency, target, row) {
    if (row.kind === 'section') {
      cell.textContent = '';
      return;
    }
    if (Math.abs(value) < 0.005) {
      cell.textContent = '—';
      cell.classList.add('empty-amount');
      return;
    }
    const displayAmount = row.kind === 'balance' || row.kind === 'net' ? value : Math.abs(value);
    cell.appendChild(traceButton(formatFlowMoney(displayAmount, currency), target, 'link-button amount-link'));
  }

  function matrixAmountClass(row, value) {
    if (row.kind === 'section') return 'neutral';
    if (row.kind === 'net' || row.kind === 'balance') {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return 'neutral';
    }
    if (row.direction === 'in') return 'positive';
    if (row.direction === 'out') return 'negative';
    return 'neutral';
  }

  function matrixMonthTarget(row, monthKey) {
    return {
      type: 'monthDetail',
      month: monthKey,
      filters: row.filters || {},
      direction: row.direction || '',
      group: row
    };
  }

  function buildTreeRows(months) {
    const incomeRoot = { key: 'root/in', label: 'INGRESOS', level: -1, direction: 'in', months: {}, total: 0, children: new Map(), rows: [], filters: { direction: 'in' } };
    const expenseRoot = { key: 'root/out', label: 'EGRESOS', level: -1, direction: 'out', months: {}, total: 0, children: new Map(), rows: [], filters: { direction: 'out' } };
    const incomeTotals = { key: 'total/in', label: 'TOTAL INGRESOS', level: 0, direction: 'in', kind: 'total positive-row', months: {}, total: 0, rows: [], filters: { direction: 'in' } };
    const expenseTotals = { key: 'total/out', label: 'TOTAL EGRESOS', level: 0, direction: 'out', kind: 'total negative-row', months: {}, total: 0, rows: [], filters: { direction: 'out' } };
    const netRow = { key: 'total/net', label: 'NETO DEL MES', level: 0, kind: 'net', months: {}, total: 0, rows: [], filters: {} };
    const balanceRow = { key: 'total/balance', label: 'SALDO ACUMULADO', level: 0, kind: 'balance', months: {}, total: 0, rows: [], filters: {} };
    months.forEach((month) => {
      month.rows.forEach((row) => {
        const root = row.direction === 'in' ? incomeRoot : expenseRoot;
        const visualCategory = flowVisualCategory(row);
        const chartParts = String(row.chartPath || '').split(' > ').filter(Boolean);
        const cleanChartParts = row.activity === 'Agricultura' && row.cereal
          ? [row.cereal]
          : (chartParts[0] === row.activity ? chartParts.slice(1) : chartParts);
        const operationId = row.orderId || row.documentId || row.instrumentId || row.id;
        const chartPartsWithIds = cleanChartParts.map((label, index) => ({ label, chartAccountId: row.projectionId ? '' : chartIdByPath(row.activity, cleanChartParts.slice(0, index + 1)) }));
        const lastChartId = chartPartsWithIds.at(-1)?.chartAccountId || row.chartAccountId || '';
        const agriculturalKind = agriculturalIncomeKind(row);
        const parts = [
          { label: visualCategory, kind: 'activity', filters: { activity: actualActivityFilterForVisual(visualCategory, row.activity), visualCategory } },
          ...(agriculturalKind ? [{ label: agriculturalKind, kind: 'agriculturalKind', filters: { activity: 'Agricultura', agriculturalIncomeKind: agriculturalKind } }] : []),
          ...chartPartsWithIds.map((item) => ({ label: item.label, kind: 'chart', filters: { activity: row.activity || '', chartAccountId: item.chartAccountId, projectionCrop: row.projectionId ? row.cereal : '' } })),
          { label: row.entityName || 'Sin contraparte', kind: 'entity', filters: { activity: row.activity || '', chartAccountId: lastChartId, entityId: row.entityId || '' } },
          { label: operationId, kind: 'operation', filters: { activity: row.activity || '', chartAccountId: lastChartId, entityId: row.entityId || '', sourceId: row.id } }
        ];
        addTreeRow(root, parts, row, month.month);
      });
      incomeTotals.months[month.month] = month.incomes;
      incomeTotals.total += month.incomes;
      expenseTotals.months[month.month] = month.expenses;
      expenseTotals.total += month.expenses;
      netRow.months[month.month] = month.net;
      netRow.total += month.net;
      balanceRow.months[month.month] = month.accumulated;
      balanceRow.total = month.accumulated;
    });
    incomeTotals.rows = months.flatMap((month) => month.rows.filter((row) => row.direction === 'in'));
    expenseTotals.rows = months.flatMap((month) => month.rows.filter((row) => row.direction === 'out'));
    netRow.rows = months.flatMap((month) => month.rows);
    const flatIncome = [];
    const flatExpense = [];
    incomeRoot.children.forEach((child) => flattenTree(child, flatIncome));
    expenseRoot.children.forEach((child) => flattenTree(child, flatExpense));
    return [
      { ...incomeRoot, kind: 'section', level: 0 },
      ...flatIncome,
      incomeTotals,
      { ...expenseRoot, kind: 'section', level: 0 },
      ...flatExpense,
      expenseTotals,
      netRow,
      balanceRow
    ];
  }

  function addTreeRow(parent, parts, flowRow, month) {
    const [part, ...rest] = parts;
    const keyPart = `${part.kind}:${part.filters.chartAccountId || part.filters.entityId || part.filters.sourceId || part.label}`;
    const key = `${parent.key}/${keyPart}`;
    if (!parent.children.has(keyPart)) {
      parent.children.set(keyPart, { key, label: part.label, level: parent.level + 1, direction: parent.direction, months: {}, total: 0, children: new Map(), rows: [], filters: { ...part.filters, direction: parent.direction } });
    }
    const node = parent.children.get(keyPart);
    if (parent.filters?.agriculturalIncomeKind) node.filters.agriculturalIncomeKind = parent.filters.agriculturalIncomeKind;
    if (parent.filters?.projectionCrop) node.filters.projectionCrop = parent.filters.projectionCrop;
    const amount = Math.abs(flowRow.amount);
    node.months[month] = (node.months[month] || 0) + amount;
    node.total += amount;
    node.rows.push(flowRow);
    if (rest.length) addTreeRow(node, rest, flowRow, month);
  }

  function summaryLabel(row) {
    const span = document.createElement('span');
    span.className = 'tree-summary-label';
    span.textContent = row.label;
    return span;
  }

  function isSummaryMatrixRow(row) {
    return ['section', 'total', 'net', 'balance'].includes(String(row.kind || '').split(' ')[0]);
  }

  function cellClass(row, monthKey) {
    const value = row.months[monthKey] || 0;
    if (row.kind?.includes('negative') || value < 0) return 'negative';
    if (row.kind?.includes('positive') || value > 0) return 'positive';
    return '';
  }

  function totalTargetForMatrixRow(row, months) {
    const first = months[0]?.month;
    const last = months[months.length - 1]?.month;
    if (isSummaryMatrixRow(row) && first && last) {
      return {
        type: 'monthDetail',
        dateFrom: Core.monthBounds(first).from,
        dateTo: Core.monthBounds(last).to,
        filters: row.filters || {},
        direction: row.direction || ''
      };
    }
    return { type: 'flowGroup', id: row.key, row };
  }

  function flattenTree(node, flat) {
    flat.push(node);
    if (!expandedTreeKeys.has(node.key)) return;
    node.children.forEach((child) => flattenTree(child, flat));
  }

  function treeLabel(row) {
    const span = document.createElement('span');
    span.className = 'tree-node';
    span.style.setProperty('--level', row.level);
    const hasChildren = row.children.size > 0;
    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'tree-toggle';
      toggle.textContent = expandedTreeKeys.has(row.key) ? '−' : '+';
      toggle.addEventListener('click', () => {
        if (expandedTreeKeys.has(row.key)) expandedTreeKeys.delete(row.key);
        else expandedTreeKeys.add(row.key);
        renderMonthly();
      });
      span.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'tree-spacer';
      span.appendChild(spacer);
    }
    const target = row.rows.length === 1
      ? flowRowTraceTarget(row.rows[0])
      : { type: 'flowGroup', id: row.key, row };
    span.appendChild(traceButton(row.label, target, 'link-button tree-link'));
    return span;
  }

  function flowRowTraceTarget(row) {
    if (row.orderId) return { type: 'order', id: row.orderId, row };
    if (row.documentId) return { type: 'document', id: row.documentId, row };
    if (row.instrumentId) return { type: 'instrument', id: row.instrumentId, row };
    if (row.forwardId) return { type: 'grainForward', id: row.forwardId, row };
    return { type: row.source, id: row.id, row };
  }

  function flowRowPrimaryTarget(row) {
    if (row.instrumentId) return { type: 'instrument', id: row.instrumentId, row };
    return flowRowTraceTarget(row);
  }

  function chartIdByPath(activity, cleanParts) {
    const label = cleanParts[cleanParts.length - 1];
    const candidates = state.chartAccounts.filter((account) => account.name === label && (!activity || account.activity === activity));
    if (candidates.length === 1) return candidates[0].id;
    return candidates.find((account) => Core.chartPath(state, account.id).endsWith(cleanParts.join(' > ')))?.id || '';
  }

  function openMonthDetail(target) {
    document.getElementById('orderDetailPanel')?.classList.add('hidden');
    document.getElementById('instrumentDetailPanel')?.classList.add('hidden');
    const bounds = target.month ? Core.monthBounds(target.month) : { from: target.dateFrom || '', to: target.dateTo || '' };
    const currency = document.getElementById('flowCurrencyFilter').value;
    monthDetail = {
      month: target.month || '',
      openOnly: !!target.openOnly,
      dateFrom: bounds.from,
      dateTo: bounds.to,
      status: target.status ?? document.getElementById('flowKindFilter').value,
      activity: target.filters?.activity || document.getElementById('flowActivityFilter').value,
      visualCategory: target.filters?.visualCategory || '',
      agriculturalIncomeKind: target.filters?.agriculturalIncomeKind || '',
      projectionCrop: target.filters?.projectionCrop || '',
      chartAccountId: target.filters?.chartAccountId || '',
      entityId: target.filters?.entityId || '',
      sourceId: target.filters?.sourceId || '',
      direction: target.direction || '',
      currency: target.currency ?? currency
    };
    renderDetailFilters();
    renderMonthDetail();
    document.getElementById('monthDetailPanel').classList.remove('hidden');
    document.getElementById('monthDetailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let orderDetailOrigin = null;
  let instrumentDetailOrigin = null;
  let orderOriginScroll = 0;
  let instrumentOriginScroll = 0;

  function relatedDetailOrigin(excludedId) {
    const activeView = document.querySelector('.view.active');
    return ['recordDetailPanel', 'orderDetailPanel', 'instrumentDetailPanel', 'monthDetailPanel']
      .map((id) => document.getElementById(id))
      .find((panel) => panel && panel.id !== excludedId && !panel.classList.contains('hidden') && (panel.id !== 'monthDetailPanel' || !activeView || activeView.id === 'flujo')) || activeView;
  }

  function openOrderDetail(orderId) {
    const order = state.orders.find((item) => item.id === orderId);
    const breakdown = Core.orderBreakdown(state, orderId) || operationBreakdown('orders', orderId);
    if (!order || !breakdown) return;
    orderDetailOrigin = relatedDetailOrigin('orderDetailPanel');
    orderOriginScroll = window.scrollY;
    document.getElementById('recordDetailPanel')?.classList.add('hidden');
    orderDetailReturn = monthDetail ? { ...monthDetail } : null;
    document.getElementById('monthDetailPanel')?.classList.add('hidden');
    document.getElementById('instrumentDetailPanel')?.classList.add('hidden');
    const panel = document.getElementById('orderDetailPanel');
    const body = document.getElementById('orderDetailBody');
    document.getElementById('orderDetailTitle').textContent = `${order.type === 'collection' ? 'ORDEN DE COBRO' : 'ORDEN DE PAGO'} — ${orderDisplayCode(order)}`;
    body.innerHTML = '';
    const summary = document.createElement('div');
    summary.className = 'order-detail-summary';
    [
      ['Fecha', formatDate(order.date)],
      ['Contraparte', linkList([{ label: Core.entityName(state, order.entityId), target: makeEntityLink(order.entityId) }])],
      ['Estado', labelForStatus(breakdown.status)],
      ['Moneda', order.currency || 'ARS']
    ].forEach(([label, value]) => {
      const item = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = label;
      const span = document.createElement('span');
      if (value instanceof Node) span.appendChild(value);
      else span.textContent = value || '';
      item.append(strong, span);
      summary.appendChild(item);
    });
    body.appendChild(summary);

    const docs = state.orderDocuments
      .filter((item) => item.orderId === orderId && !item.voidedAt)
      .map((item) => ({ link: item, doc: state.documents.find((doc) => doc.id === item.documentId) }))
      .filter((item) => item.doc);
    body.appendChild(detailHeading('DOCUMENTOS APLICADOS'));
    body.appendChild(inlineTable([
      { label: 'Documento', value: (row) => documentDisplayLabel(row.doc), link: (row) => ({ type: 'document', id: row.doc.id }) },
      { label: 'Concepto', value: (row) => row.doc.description || '', className: () => 'wrap' },
      { label: 'Actividad', value: (row) => row.doc.activity || '' },
      { label: 'Cuenta', value: (row) => Core.chartPath(state, row.doc.chartAccountId), link: (row) => makeChartLink(row.doc.chartAccountId), className: () => 'wrap' },
      { label: 'Importe aplicado', value: (row) => formatMoney(row.link.amountApplied, row.link.currency || row.doc.currency), className: () => 'amount' }
    ], docs));

    if (order.voidedAt) {
      const historicalDocuments = state.orderDocuments
        .filter((item) => item.orderId === orderId)
        .map((item) => ({ link: item, doc: state.documents.find((doc) => doc.id === item.documentId) }))
        .filter((item) => item.doc);
      if (historicalDocuments.length) {
        body.appendChild(detailHeading('DOCUMENTOS HISTÓRICOS (SIN APLICACIÓN ACTIVA)'));
        body.appendChild(inlineTable([
          { label: 'Documento', value: (row) => documentDisplayLabel(row.doc), link: (row) => ({ type: 'document', id: row.doc.id }) },
          { label: 'Importe histórico', value: (row) => formatMoney(row.link.amountApplied, row.link.currency), className: () => 'amount' }
        ], historicalDocuments));
      }
    }

    const instruments = state.orderInstruments
      .filter((item) => item.orderId === orderId && !item.voidedAt)
      .map((item) => ({ link: item, instrument: state.instruments.find((instrument) => instrument.id === item.instrumentId) }))
      .filter((item) => item.instrument);
    body.appendChild(detailHeading('INSTRUMENTOS FINANCIEROS'));
    body.appendChild(inlineTable([
      { label: 'Instrumento', value: (row) => instrumentDisplayName(row.instrument), link: (row) => ({ type: 'instrument', id: row.instrument.id }) },
      { label: 'Estado', value: (row) => labelForStatus(row.instrument.status) },
      { label: 'Fecha', value: (row) => formatDate(row.instrument.scheduledDate || row.instrument.executedDate || row.instrument.date) },
      { label: 'Importe', value: (row) => formatMoney(row.link.amount, row.instrument.currency), className: () => 'amount' },
      { label: 'Cuenta financiera', value: (row) => Core.accountName(state, row.instrument.financialAccountId), link: (row) => makeAccountLink(row.instrument.financialAccountId), className: () => 'wrap' },
      { label: 'Acciones', node: (row) => {
        const action = nextInstrumentAction(row.instrument);
        const actions = [{ label: 'Ver', fn: () => openInstrumentDetail(row.instrument.id) }];
        if (action) actions.push({ label: action.label, fn: () => transitionInstrumentTo(row.instrument.id, action.status, () => openOrderDetail(orderId)) });
        return actionGroup(actions);
      } }
    ], instruments));

    if (order.voidedAt) {
      const historicalInstruments = state.orderInstruments
        .filter((item) => item.orderId === orderId)
        .map((item) => state.instruments.find((instrument) => instrument.id === item.instrumentId))
        .filter(Boolean);
      if (historicalInstruments.length) {
        body.appendChild(detailHeading('INSTRUMENTOS HISTÓRICOS (SIN EFECTO ACTIVO)'));
        body.appendChild(inlineTable([
          { label: 'Instrumento', value: instrumentDisplayName, link: (item) => ({ type: 'instrument', id: item.id }) },
          { label: 'Estado', value: (item) => Core.instrumentLinkedOnlyToInactiveOrders(state, item.id) && Core.instrumentIsPending(item) ? 'Inactivo por orden anulada' : labelForStatus(item.status) },
          { label: 'Importe histórico', value: (item) => formatMoney(item.amount, item.currency), className: () => 'amount' }
        ], historicalInstruments));
      }
    }

    const withholdings = (state.orderTaxWithholdings || []).filter((item) => item.orderId === orderId && !item.voidedAt);
    body.appendChild(detailHeading('RETENCIONES SUFRIDAS'));
    body.appendChild(inlineTable([
      { label: 'Tipo', value: (row) => Core.labelForTaxType(row.taxType) },
      { label: 'Fecha', value: (row) => formatDate(row.date) },
      { label: 'Referencia', value: (row) => row.reference || '' },
      { label: 'Importe', value: (row) => formatMoney(row.amount, row.currency), className: () => 'amount' }
    ], withholdings));

    body.appendChild(detailHeading('RESUMEN'));
    body.appendChild(inlineTable([
      { label: 'Total aplicado', value: () => formatMoney(breakdown.applied, order.currency), className: () => 'amount' },
      { label: 'Cancelado comercialmente', value: () => formatMoney(breakdown.commercialCancelled, order.currency), className: () => 'amount' },
      { label: 'Realizado financieramente', value: () => formatMoney(breakdown.paidOrCollected, order.currency), className: () => 'amount' },
      { label: 'Retenciones', value: () => formatMoney(breakdown.taxWithheld || 0, order.currency), className: () => 'amount' },
      { label: 'Instrumentado pendiente de banco', value: () => formatMoney(breakdown.financialPending, order.currency), className: () => 'amount' },
      { label: 'Saldo sin instrumentar', value: () => formatMoney(breakdown.notCoveredByInstrument, order.currency), className: () => 'amount' }
    ], [{}]));
    body.appendChild(auditHistory('order', orderId));
    body.appendChild(actionGroup([
      ...(breakdown.notCoveredByInstrument > 0.01 && !order.voidedAt ? [{ label: order.type === 'collection' ? '+ Definir medio de cobro' : '+ Definir medio de pago', fn: () => startInstrumentingOrder(orderId) }] : []),
      ...(!order.voidedAt ? [{ label: 'Editar', fn: () => {
        const form = historicalOrderForm(orderId);
        if (!form) { editOrder(orderId); return; }
        body.appendChild(form);
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } }] : []),
      { label: 'Ver en Operaciones', fn: () => document.querySelector('[data-view="operaciones"]')?.click() },
      { label: 'Anular orden', fn: () => voidRecord('order', orderId) }
    ]));
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function historicalOrderForm(orderId) {
    return combinedOrderEditForm(orderId) || historicalOrderFormAdministrative(orderId);
  }

  function historicalOrderFormAdministrative(orderId) {
    const order = state.orders.find((item) => item.id === orderId);
    const links = state.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    if (!order || links.length !== 1) return null;
    const form = document.createElement('form');
    form.className = 'instrument-edit-form';
    const withholdings = (state.orderTaxWithholdings || []).filter((item) => item.orderId === orderId && !item.voidedAt);
    if ((state.orderPracticedWithholdings || []).some((item) => item.orderId === orderId && !item.voidedAt)
      || new Set(withholdings.map((item) => item.taxType)).size !== withholdings.length
      || withholdings.some((item) => item.date !== withholdings[0].date || item.reference !== withholdings[0].reference)) return null;
    const amountFor = (type) => withholdings.find((item) => item.taxType === type)?.amount || '';
    form.innerHTML = `
      <label>Concepto<input name="description" value="${escapeHtml(order.description || '')}"></label>
      <label>Fecha de orden<input name="date" type="date" value="${order.date || ''}" required></label>
      <label>Importe aplicado<input name="amountApplied" data-money-input="true" inputmode="decimal" value="${formatDecimal(links[0].amountApplied, 2)}" required></label>
      <label>Retención Ganancias<input name="withholding_income_tax" data-money-input="true" inputmode="decimal" value="${amountFor('withholding_income_tax') ? formatDecimal(amountFor('withholding_income_tax'), 2) : ''}"></label>
      <label>Retención IVA<input name="withholding_vat" data-money-input="true" inputmode="decimal" value="${amountFor('withholding_vat') ? formatDecimal(amountFor('withholding_vat'), 2) : ''}"></label>
      <label>Retención IIBB<input name="withholding_iibb" data-money-input="true" inputmode="decimal" value="${amountFor('withholding_iibb') ? formatDecimal(amountFor('withholding_iibb'), 2) : ''}"></label>
      <label>Fecha retenciones<input name="withholdingDate" type="date" value="${withholdings[0]?.date || order.date || ''}"></label>
      <label>Referencia retenciones<input name="withholdingReference" value="${escapeHtml(withholdings[0]?.reference || '')}"></label>
      <label>Motivo de la modificación<input name="reason"></label>
      <p>Los instrumentos y settlements conservan sus IDs. Para corregir un instrumento, abrilo desde la tabla superior.</p>
      <div class="actions"><button type="submit">Guardar corrección</button><button type="button" class="secondary">Cancelar</button></div>`;
    wireMoneyInputs(form);
    form.querySelector('button[type="button"]').addEventListener('click', () => form.remove());
    bindPersistentSubmit(form, async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const types = ['withholding_income_tax', 'withholding_vat', 'withholding_iibb'];
      const withholdingsPayload = types.map((taxType) => {
        const current = withholdings.find((item) => item.taxType === taxType);
        return { id: current?.id, taxType, amount: parseLocaleNumber(data.get(taxType)), date: data.get('withholdingDate'), reference: data.get('withholdingReference') };
      }).filter((item) => Number(item.amount || 0) > 0);
      const amount = parseLocaleNumber(data.get('amountApplied'));
      const changedWithholdings = JSON.stringify(withholdingsPayload.map((item) => [item.taxType, item.amount, item.date, item.reference])) !== JSON.stringify(withholdings.map((item) => [item.taxType, item.amount, item.date, item.reference]));
      const sensitive = Math.round(amount * 100) !== Math.round(links[0].amountApplied * 100) || changedWithholdings;
      const reason = String(data.get('reason') || '').trim();
      const errorBox = form.querySelector('[role="alert"]') || document.createElement('div');
      errorBox.className = 'fatal hidden'; errorBox.setAttribute('role', 'alert');
      if (!errorBox.parentNode) form.appendChild(errorBox);
      try {
        if (sensitive && !reason) throw new Error('Motivo obligatorio para cambiar importe o retenciones');
        if (!sensitive && data.get('description') === (order.description || '') && data.get('date') === order.date) { form.remove(); return; }
        await postTransaction({ action: sensitive ? 'correctHistoricalOrder' : 'updateOrder', id: orderId, changes: sensitive
          ? { description: data.get('description'), date: data.get('date'), amountApplied: amount, withholdings: withholdingsPayload, reason }
          : { description: data.get('description'), date: data.get('date'), reason: reason || 'Edición administrativa' } });
        openOrderDetail(orderId);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
    });
    return form;
  }

  function combinedOrderEditForm(orderId) {
    const order = state.orders.find((item) => item.id === orderId && !item.voidedAt);
    if (!order) return null;
    const blockers = Core.orderInstrumentEditBlockers(state, orderId);
    const partialCorrection = blockers.length === 1 && blockers[0].startsWith('Pago parcial:');
    if (blockers.length && !partialCorrection) {
      const notice = document.createElement('div');
      notice.className = 'fatal';
      notice.setAttribute('role', 'alert');
      notice.textContent = `Edición conjunta no disponible: ${blockers.join('; ')}. La edición administrativa de la orden sigue disponible por separado.`;
      const administrative = historicalOrderFormAdministrative(orderId);
      if (administrative) notice.appendChild(administrative);
      return notice;
    }
    const link = state.orderDocuments.find((item) => item.orderId === orderId && !item.voidedAt);
    const source = state.documents.find((item) => item.id === link.documentId);
    const instrumentLink = state.orderInstruments.find((item) => item.orderId === orderId && !item.voidedAt);
    const instrument = instrumentLink && state.instruments.find((item) => item.id === instrumentLink.instrumentId);
    const realized = instrument && Core.instrumentIsBankRealized(instrument);
    const form = document.createElement('form');
    form.className = 'instrument-edit-form';
    const types = order.type === 'collection' ? [['transfer', 'Transferencia'], ['received_check', 'Cheque recibido']] : [['transfer', 'Transferencia'], ['account_debit', 'Débito en cuenta'], ['own_check', 'Cheque propio'], ['vep', 'VEP']];
    const accounts = state.financialAccounts.filter((account) => (account.active !== false || account.id === instrument?.financialAccountId) && account.currency === order.currency);
    form.innerHTML = `<h4>Orden</h4>
      <p>${escapeHtml(orderDisplayCode(order))} · ${escapeHtml(documentDisplayLabel(source))} · ${escapeHtml(Core.entityName(state, order.entityId))} · ${escapeHtml(order.currency)} · ${escapeHtml(labelForStatus(Core.orderBreakdown(state, orderId)?.status || 'Pendiente'))}</p>
      <label>Importe aplicado (${escapeHtml(order.currency)})<input name="amountApplied" data-money-input="true" inputmode="decimal" value="${formatDecimal(link.amountApplied, 2)}" required></label>
      <label>Fecha de orden<input name="orderDate" type="date" value="${order.date || ''}" required></label>
      <label>Concepto / observaciones<input name="description" value="${escapeHtml(order.description || '')}"></label>
      <h4>Medio de pago/cobro</h4>
      <p>${instrument ? `${escapeHtml(instrumentDisplayName(instrument))} · ${escapeHtml(labelForStatus(instrument.status))}` : 'Sin medio definido'}</p>
      <label>Medio<select name="instrumentType" ${realized ? 'disabled' : ''}>${instrument ? '' : '<option value="">Sin definir</option>'}${types.map(([value, label]) => `<option value="${value}" ${value === instrument?.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label data-medium-field>Importe nominal (${escapeHtml(order.currency)})<input name="instrumentAmount" data-money-input="true" inputmode="decimal" value="${formatDecimal(instrument?.amount ?? link.amountApplied, 2)}" required></label>
      <label data-medium-field>Fecha/vencimiento<input name="scheduledDate" type="date" value="${instrument?.scheduledDate || order.date || ''}" required></label>
      ${realized ? `<label>Fecha efectiva<input name="executedDate" type="date" value="${instrument.executedDate || instrument.scheduledDate || ''}" required></label>` : ''}
      <label data-medium-field>Cuenta financiera<select name="financialAccountId" required></select></label>
      <label data-check-number>N.º cheque<input name="checkNumber" value="${escapeHtml(instrument?.checkNumber || '')}"></label>
      <label data-issuer-bank>Banco emisor<input name="bankName" value="${escapeHtml(instrument?.type === 'received_check' ? instrument.bankName || '' : '')}"></label>
      <label data-medium-field>Referencia<input name="reference" value="${escapeHtml(instrument?.reference || '')}"></label>
      <label data-medium-field>Observaciones del medio<input name="notes" value="${escapeHtml(instrument?.notes || '')}"></label>
      ${partialCorrection ? `<label class="wide-section"><input name="reconcilePartialInstrument" type="checkbox" required> Confirmo que el importe menor del único medio es un error histórico y no un pago parcial real. Se corregirá ese mismo instrumento; no se distribuirá entre otros.</label>` : ''}
      <label>Motivo de la corrección<input name="reason" required></label>
      <div class="fatal hidden" role="alert"></div>
      <div class="actions"><button type="submit">Revisar cambios</button><button type="button" class="secondary">Cancelar</button></div>`;
    const typeInput = form.elements.instrumentType;
    const accountInput = form.elements.financialAccountId;
    let previousType = instrument?.type || '';
    const syncType = () => {
      const type = typeInput.disabled ? instrument.type : typeInput.value;
      if (type !== previousType && ['own_check', 'received_check'].includes(type) && !['own_check', 'received_check'].includes(previousType)) form.elements.checkNumber.value = '';
      const available = accounts.filter((account) => type === 'received_check' || ((account.productType || 'bank_account') === 'bank_account' && account.type !== 'cash' && (type !== 'own_check' || account.checkEnabled === true)));
      accountInput.innerHTML = available.map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === instrument?.financialAccountId ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('');
      form.querySelector('[data-check-number]').classList.toggle('hidden', !['own_check', 'received_check'].includes(type));
      form.elements.checkNumber.required = ['own_check', 'received_check'].includes(type);
      form.querySelector('[data-issuer-bank]').classList.toggle('hidden', type !== 'received_check');
      previousType = type;
      for (const label of form.querySelectorAll('[data-medium-field]')) {
        label.classList.toggle('hidden', !type);
        label.querySelector('input,select').disabled = !type;
      }
    };
    typeInput.addEventListener('change', syncType);
    syncType();
    wireMoneyInputs(form);
    form.querySelector('button[type="button"]').addEventListener('click', () => form.remove());
    let reviewing = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (reviewing) return;
      reviewing = true;
      const reviewButton = form.querySelector('button[type="submit"]');
      reviewButton.disabled = true;
      reviewButton.textContent = 'Revisando...';
      const errorBox = form.querySelector('[role="alert"]');
      errorBox.classList.add('hidden');
      try {
        const data = new FormData(form);
        const type = typeInput.disabled ? instrument.type : typeInput.value;
        const payload = { reason: String(data.get('reason') || '').trim(), reconcilePartialInstrument: data.get('reconcilePartialInstrument') === 'on', order: { amountApplied: parseLocaleNumber(data.get('amountApplied')), date: data.get('orderDate'), description: data.get('description') },
          instrument: type ? { type, amount: parseLocaleNumber(data.get('instrumentAmount')), currency: order.currency, scheduledDate: data.get('scheduledDate'), financialAccountId: data.get('financialAccountId'), checkNumber: data.get('checkNumber') || '', bankName: type === 'received_check' ? data.get('bankName') || '' : undefined, reference: data.get('reference') || '', notes: data.get('notes') || '', ...(realized ? { executedDate: data.get('executedDate') } : {}) } : null };
        const candidate = Core.editOrderWithInstrumentTransaction(state, orderId, payload, 'vista-previa');
        const afterLink = candidate.orderInstruments.find((item) => item.orderId === orderId && !item.voidedAt);
        const afterInstrument = afterLink && candidate.instruments.find((item) => item.id === afterLink.instrumentId);
        const bankText = (item) => item && Core.instrumentIsBankRealized(item) ? `${formatMoney(item.amount, item.currency)} · ${Core.accountName(item === instrument ? state : candidate, item.financialAccountId)}` : 'Sin movimiento realizado';
        const description = `OP/OC: ${formatMoney(link.amountApplied, order.currency)} → ${formatMoney(payload.order.amountApplied, order.currency)}. Medio: ${instrument ? `${instrumentDisplayName(instrument)} · ${formatMoney(instrument.amount, instrument.currency)} · ${Core.accountName(state, instrument.financialAccountId)}` : 'Sin definir'} → ${afterInstrument ? `${instrumentDisplayName(afterInstrument)} · ${formatMoney(afterInstrument.amount, afterInstrument.currency)} · ${Core.accountName(candidate, afterInstrument.financialAccountId)}` : 'Sin definir'}. Banco/Caja: ${bankText(instrument)} → ${bankText(afterInstrument)}. ${instrument && afterInstrument && instrument.id !== afterInstrument.id ? 'El medio anterior queda anulado con auditoría.' : 'Se conservan los IDs de los registros existentes.'}`;
        const confirmed = await requestEditAction({ title: 'Confirmar OP/OC + medio', description, submitLabel: 'Guardar corrección', onSubmit: async () => {
          await postTransaction({ action: 'editOrderWithInstrument', id: orderId, payload });
        } });
        if (confirmed) openOrderDetail(orderId);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      } finally {
        reviewing = false;
        reviewButton.disabled = false;
        reviewButton.textContent = 'Revisar cambios';
      }
    });
    return form;
  }

  function instrumentRelations(instrumentId) {
    const instrument = state.instruments.find((item) => item.id === instrumentId);
    const orderLinks = state.orderInstruments.filter((item) => item.instrumentId === instrumentId && !item.voidedAt);
    const orders = orderLinks.map((link) => state.orders.find((order) => order.id === link.orderId)).filter(Boolean);
    const historicalOrders = state.orderInstruments.filter((item) => item.instrumentId === instrumentId)
      .map((link) => state.orders.find((order) => order.id === link.orderId && order.voidedAt)).filter(Boolean);
    const orderInstrumentIds = new Set(orderLinks.map((link) => link.id));
    const settlements = state.orderDocumentSettlements.filter((item) => orderInstrumentIds.has(item.orderInstrumentId) && !item.voidedAt);
    const orderDocumentIds = new Set(settlements.map((item) => item.orderDocumentId));
    const orderDocuments = state.orderDocuments.filter((item) => orderDocumentIds.has(item.id) && !item.voidedAt);
    const documents = orderDocuments.map((link) => state.documents.find((doc) => doc.id === link.documentId)).filter(Boolean);
    const historicalInstrumentIds = new Set(state.orderInstruments.filter((link) => link.instrumentId === instrumentId && state.orders.some((order) => order.id === link.orderId && order.voidedAt)).map((link) => link.id));
    const historicalDocumentIds = new Set(state.orderDocumentSettlements.filter((item) => historicalInstrumentIds.has(item.orderInstrumentId)).map((item) => state.orderDocuments.find((link) => link.id === item.orderDocumentId)?.documentId).filter(Boolean));
    const historicalDocuments = state.documents.filter((doc) => historicalDocumentIds.has(doc.id));
    return { instrument, orderLinks, orders, historicalOrders, historicalDocuments, settlements, orderDocuments, documents };
  }

  function taxPaymentOriginLines(instrumentId) {
    const payment = (state.taxPayments || []).find((item) => item.instrumentId === instrumentId);
    if (!payment) return [];
    const origins = (payment.allocations || []).map((allocation) => {
      const withholding = (state.orderPracticedWithholdings || []).find((item) => item.id === allocation.withholdingId);
      const order = state.orders.find((item) => item.id === withholding?.orderId);
      const link = state.orderDocuments.find((item) => item.id === withholding?.orderDocumentId);
      const doc = state.documents.find((item) => item.id === link?.documentId);
      return { allocation, withholding, order, doc };
    }).filter((item) => item.withholding);
    return [
      ['Concepto', payment.concept || Core.taxPaymentSuggestedConcept(state, origins.map((item) => item.withholding.id)) || payment.reference || 'VEP'],
      ['Retención de origen', origins.map((item) => `${Core.labelForTaxType(item.withholding.taxType)} ${formatMoney(item.allocation.amount, item.withholding.currency)}`).join(' · ')],
      ['Proveedor original', linkList(origins.filter((item) => item.order?.entityId).map((item) => ({ label: Core.entityName(state, item.order.entityId), target: makeEntityLink(item.order.entityId) })), 'Sin proveedor vinculado')],
      ['Documento original', linkList(origins.filter((item) => item.doc).map((item) => ({ label: documentDisplayLabel(item.doc), target: { type: 'document', id: item.doc.id } })), 'Sin documento vinculado')],
      ['OP original', linkList(origins.filter((item) => item.order).map((item) => ({ label: orderDisplayCode(item.order), target: { type: 'order', id: item.order.id } })), 'Sin OP vinculada')],
      ['Actividad original', [...new Set(origins.map((item) => item.doc?.activity).filter(Boolean))].join(' · ') || 'Sin actividad registrada'],
      ['Cuenta económica original', linkList(origins.filter((item) => item.doc?.chartAccountId).map((item) => ({ label: Core.chartPath(state, item.doc.chartAccountId), target: makeChartLink(item.doc.chartAccountId) })), 'Sin cuenta registrada')]
    ];
  }

  function openInstrumentDetail(instrumentId) {
    const { instrument, orderLinks, orders, historicalOrders, historicalDocuments, documents } = instrumentRelations(instrumentId);
    if (!instrument) return;
    const inactive = Core.instrumentLinkedOnlyToInactiveOrders(state, instrumentId) && Core.instrumentIsPending(instrument);
    const repairable = inactive && Core.instrumentLinkedOnlyToVoidedOrders(state, instrumentId);
    const historicalOrderLinks = historicalOrders.map((item) => ({ label: `${orderDisplayCode(item)} (Anulada)`, target: { type: 'order', id: item.id } }));
    instrumentDetailOrigin = relatedDetailOrigin('instrumentDetailPanel');
    instrumentOriginScroll = window.scrollY;
    document.getElementById('recordDetailPanel')?.classList.add('hidden');
    orderDetailReturn = monthDetail ? { ...monthDetail } : orderDetailReturn;
    document.getElementById('monthDetailPanel')?.classList.add('hidden');
    document.getElementById('orderDetailPanel')?.classList.add('hidden');
    const panel = document.getElementById('instrumentDetailPanel');
    const body = document.getElementById('instrumentDetailBody');
    document.getElementById('instrumentDetailTitle').textContent = `INSTRUMENTO — ${instrumentDisplayName(instrument)}`;
    body.innerHTML = '';
    const summary = document.createElement('div');
    summary.className = 'order-detail-summary';
    [
      ['Contraparte', linkList([{ label: Core.entityName(state, instrument.entityId), target: makeEntityLink(instrument.entityId) }])],
      ['Documento origen', linkList(documents.map((item) => ({ label: item.number || 'Documento', target: { type: 'document', id: item.id } })), 'Sin documento vinculado')],
      ...(historicalDocuments.length ? [['Documento histórico', linkList(historicalDocuments.map((item) => ({ label: documentDisplayLabel(item), target: { type: 'document', id: item.id } })))]] : []),
      ['OP/OC', linkList(orders.filter((item) => !item.voidedAt).map((item) => ({ label: orderDisplayCode(item), target: { type: 'order', id: item.id } })), 'Sin orden activa')],
      ...(historicalOrderLinks.length ? [['Órdenes anuladas', linkList(historicalOrderLinks)]] : []),
      ['Medio', labelForType(instrument.type)],
      ['Importe', formatMoney(instrument.amount, instrument.currency)],
      ...orderLinks.filter((link) => link.commercialCurrency && link.commercialCurrency !== link.currency).map((link) => ['Imputacion comercial', `${formatMoney(link.commercialAmount, link.commercialCurrency)} · TC ${link.exchangeRate} ${link.currency}/${link.commercialCurrency} · ${formatDate(link.exchangeRateDate)} · ${link.exchangeRateReference || 'Sin referencia'} · diferencia de redondeo ${formatMoney(link.roundingDifference, link.currency)}`]),
      ['Estado', inactive ? (repairable ? 'Inactivo por orden anulada' : 'Inactivo: sin orden vigente') : labelForStatus(instrument.status)],
      ['Fecha de emisión', instrument.issueDate ? formatDate(instrument.issueDate) : 'Sin fecha registrada'],
      ['Pago previsto / vencimiento', instrument.scheduledDate ? formatDate(instrument.scheduledDate) : 'Sin fecha registrada'],
      ['Fecha efectiva bancaria', instrument.executedDate ? formatDate(instrument.executedDate) : 'Sin realización registrada'],
      ...(instrument.type === 'own_check' ? [['Entrega comercial', instrument.deliveredDate ? formatDate(instrument.deliveredDate) : 'Sin fecha registrada']] : []),
      ['Cuenta', linkList([{ label: Core.accountName(state, instrument.financialAccountId), target: makeAccountLink(instrument.financialAccountId) }])],
      ...taxPaymentOriginLines(instrumentId)
    ].forEach(([label, value]) => {
      const item = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = label;
      const span = document.createElement('span');
      if (value instanceof Node) span.appendChild(value);
      else span.textContent = value || '';
      item.append(strong, span);
      summary.appendChild(item);
    });
    body.appendChild(summary);
    if (instrument.reference) body.appendChild(detailHeading(`Referencia: ${instrument.reference}`));
    if (instrument.notes) body.appendChild(detailHeading(`Observaciones: ${instrument.notes}`));
    body.appendChild(auditHistory('instrument', instrumentId));
    const editForm = instrumentEditForm(instrument, true);
    editForm.classList.add('hidden');
    body.appendChild(editForm);
    const action = nextInstrumentAction(instrument);
    const actions = [{ label: 'Trazabilidad', fn: () => showTrace({ type: 'instrument', id: instrument.id }) }];
    if (repairable) actions.push({ label: 'Sanear instrumento inactivo', fn: () => repairInactiveOrderInstrument(instrument.id) });
    if (!instrument.voidedAt && !inactive) actions.unshift({ label: 'Editar', fn: () => { editForm.classList.remove('hidden'); editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });
    if (!instrument.voidedAt && !inactive && ['scheduled', 'issued'].includes(instrument.status)) actions.push({ label: 'Anular instrumento programado', fn: () => showInstrumentSafetyAction(instrument.id, 'void') });
    if (!instrument.voidedAt && !inactive && Core.instrumentIsBankRealized(instrument) && ['transfer', 'account_debit', 'own_check'].includes(instrument.type)) actions.push({ label: instrument.direction === 'in' ? 'Revertir cobro' : 'Revertir pago', fn: () => showInstrumentSafetyAction(instrument.id, 'reverse') });
    if (action) actions.unshift({ label: action.label, fn: () => transitionInstrumentTo(instrument.id, action.status, () => openInstrumentDetail(instrument.id)) });
    body.appendChild(actionGroup(actions));
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function historicalInstrumentEffectiveDate(instrument) {
    const stored = instrument.executedDate || '';
    const scheduled = instrument.scheduledDate || '';
    return {
      value: stored && scheduled && stored < scheduled ? scheduled : (stored || scheduled),
      stored,
      suggested: Boolean(stored && scheduled && stored < scheduled)
    };
  }

  function instrumentEditForm(instrument, historical = false) {
    const form = document.createElement('form');
    form.className = 'instrument-edit-form';
    form.dataset.historical = String(historical);
    const effectiveDate = historicalInstrumentEffectiveDate(instrument);
    const application = state.orderInstruments.find((link) => link.instrumentId === instrument.id && !link.voidedAt && link.commercialCurrency && link.commercialCurrency !== instrument.currency);
    let exchangeSource = application?.exchangeRateSource || 'commercialAmount';
    let exchangePrincipal = 'amount';
    form.innerHTML = `
      ${historical ? '<p>Conserva identidad y estado financiero. Los cambios sensibles requieren motivo.</p><label>Motivo de la modificación<input name="reason"></label>' : ''}
      ${historical && instrument.direction === 'out' && ['transfer', 'account_debit'].includes(instrument.type) ? `<label>Medio<select name="type"><option value="transfer" ${instrument.type === 'transfer' ? 'selected' : ''}>Transferencia</option><option value="account_debit" ${instrument.type === 'account_debit' ? 'selected' : ''}>Débito en cuenta</option></select></label>` : ''}
      <label>Importe (${escapeHtml(instrument.currency)})
        <input name="amount" data-money-input="true" inputmode="decimal" required value="${formatDecimal(instrument.amount, 2)}">
      </label>
      ${application ? `<fieldset class="instrument-exchange-edit"><legend>Imputacion multimoneda</legend><label>Importe comercial (${escapeHtml(application.commercialCurrency)})<input name="commercialAmount" data-money-input="true" value="${formatDecimal(application.commercialAmount, 2)}" required></label><label>TC (${escapeHtml(instrument.currency)}/${escapeHtml(application.commercialCurrency)})<input name="exchangeRate" type="number" min="0" step="any" value="${application.exchangeRate}" required></label><label>Fecha del TC<input name="exchangeRateDate" type="date" value="${application.exchangeRateDate}" required></label><label>Referencia del TC<input name="exchangeRateReference" value="${escapeHtml(application.exchangeRateReference || '')}"></label><p data-exchange-edit-summary role="status">Diferencia de redondeo: ${formatMoney(application.roundingDifference, instrument.currency)}</p></fieldset>` : ''}
      ${['own_check', 'received_check'].includes(instrument.type) ? `<label>N.º cheque<input name="checkNumber" required value="${escapeHtml(instrument.checkNumber || '')}"></label>` : ''}
      <label>Fecha/vencimiento
        <input name="scheduledDate" type="date" value="${instrument.scheduledDate || instrument.executedDate || ''}">
      </label>
      ${historical && Core.instrumentIsBankRealized(instrument) ? `<label>Fecha efectiva<input name="executedDate" type="date" value="${effectiveDate.value}" required></label>${effectiveDate.suggested ? `<p>Fecha efectiva guardada: ${formatDate(effectiveDate.stored)}. Se propone el vencimiento; confirme la fecha real antes de guardar.</p>` : ''}` : ''}
      ${historical ? `<label>Cuenta financiera<select name="financialAccountId">${state.financialAccounts.filter((account) => account.id === instrument.financialAccountId || financialAccountsForInstrument(instrument.type, instrument.currency).some((eligible) => eligible.id === account.id)).map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === instrument.financialAccountId ? 'selected' : ''}>${escapeHtml(account.name)}</option>`).join('')}</select></label><label>Contraparte vinculada<input value="${escapeHtml(Core.entityName(state, instrument.entityId))}" readonly></label><input name="entityId" type="hidden" value="${escapeHtml(instrument.entityId)}">` : ''}
      <label>Referencia
        <input name="reference" type="text" value="${escapeHtml(instrument.reference || '')}">
      </label>
      <details><summary>Más datos</summary><label>Observaciones<input name="notes" type="text" value="${escapeHtml(instrument.notes || '')}"></label></details>
      <div class="actions"><button type="submit">Guardar cambios</button><button type="button" class="secondary" data-cancel-edit="true">Cancelar</button></div>
    `;
    wireMoneyInputs(form);
    if (application) {
      for (const key of ['amount', 'commercialAmount', 'exchangeRate']) form.elements[key]?.addEventListener('input', () => {
        const fields = calculateInstrumentCurrencyFields({ amount: parseLocaleNumber(form.elements.amount.value), commercialAmount: parseLocaleNumber(form.elements.commercialAmount.value), exchangeRate: Number(form.elements.exchangeRate.value), exchangeRateEmpty: form.elements.exchangeRate.value === '', source: key, principal: exchangePrincipal });
        exchangePrincipal = fields.principal;
        if (fields.calculatedField) {
          form.elements[fields.calculatedField].value = fields.calculatedField === 'exchangeRate' ? fields.exchangeRate : formatDecimal(fields[fields.calculatedField], 2);
          exchangeSource = fields.calculatedField === 'exchangeRate' ? 'commercialAmount' : 'exchangeRate';
        }
        const message = form.querySelector('[data-exchange-edit-summary]');
        if (message) message.textContent = fields.roundingDifference == null ? 'Defina una imputacion valida.' : `Diferencia de redondeo: ${formatMoney(fields.roundingDifference, instrument.currency)}. No modifica la factura ni genera diferencias cambiarias automaticamente.`;
      });
    }
    const notesDetails = form.querySelector?.('details');
    if (notesDetails) notesDetails.open = Boolean(instrument.notes);
    const saveError = document.createElement('div');
    saveError.className = 'fatal hidden';
    saveError.setAttribute('role', 'alert');
    form.appendChild(saveError);
    form.addEventListener('click', (event) => {
      if (event.target?.dataset.cancelEdit !== 'true') return;
      if (historical) form.remove();
      else form.classList.add('hidden');
    });
    if (!historical && Core.instrumentIsBankRealized(instrument)) {
      form.querySelector('[name="scheduledDate"]').disabled = true;
      form.elements.amount.disabled = true;
      if (form.elements.checkNumber) form.elements.checkNumber.disabled = true;
      if (application) for (const key of ['commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference']) form.elements[key].disabled = true;
    }
    bindPersistentSubmit(form, async (event) => {
      event.preventDefault();
      try {
        saveError.classList.add('hidden');
        const candidates = {
          amount: parseLocaleNumber(form.elements.amount.value),
          scheduledDate: form.elements.scheduledDate.value,
          ...(form.elements.executedDate ? { executedDate: form.elements.executedDate.value } : {}),
          ...(form.elements.checkNumber ? { checkNumber: form.elements.checkNumber.value } : {}),
          ...(form.elements.type ? { type: form.elements.type.value } : {}),
          ...(historical ? { financialAccountId: form.elements.financialAccountId.value, entityId: form.elements.entityId.value } : {}),
          reference: form.elements.reference.value,
          notes: form.elements.notes.value
        };
        if (application) Object.assign(candidates, { commercialAmount: parseLocaleNumber(form.elements.commercialAmount.value), exchangeRate: Number(form.elements.exchangeRate.value), exchangeRateDate: form.elements.exchangeRateDate.value, exchangeRateReference: form.elements.exchangeRateReference.value, exchangeRateSource: exchangeSource });
        const changes = Object.fromEntries(Object.entries(candidates).filter(([key, value]) => key === 'amount' ? Math.round(Number(value) * 100) !== Math.round(Number(instrument.amount) * 100) : String(value ?? '') !== String((application?.[key] ?? instrument[key]) ?? '')));
        if (application && Object.keys(changes).some((key) => ['amount', 'commercialAmount', 'exchangeRate'].includes(key))) Object.assign(changes, { commercialAmount: candidates.commercialAmount, exchangeRate: candidates.exchangeRate, exchangeRateSource: exchangeSource });
        if (!Object.keys(changes).length) { form.remove(); return; }
        const sensitive = Object.keys(changes).some((key) => !['reference', 'notes'].includes(key));
        if (sensitive && !String(form.elements.reason.value || '').trim()) throw new Error('Motivo obligatorio para modificar importe, fecha, cuenta, número o medio');
        changes.reason = sensitive ? form.elements.reason.value : 'Edición operativa desde ficha de instrumento';
        await postTransaction({ action: sensitive ? 'correctHistoricalInstrument' : 'updateInstrument', instrumentId: instrument.id, changes });
        const origin = instrumentDetailOrigin;
        const scroll = instrumentOriginScroll;
        openInstrumentDetail(instrument.id);
        instrumentDetailOrigin = origin;
        instrumentOriginScroll = scroll;
        if (monthDetail) renderMonthDetail();
      } catch (error) {
        saveError.textContent = `No se pudo guardar el instrumento: ${error.message}`;
        saveError.classList.remove('hidden');
      }
    });
    return form;
  }

  function showInstrumentSafetyAction(instrumentId, mode) {
    const { instrument, orders, documents } = instrumentRelations(instrumentId);
    const body = document.getElementById('instrumentDetailBody');
    if (!instrument || !body) return;
    body.querySelector('.instrument-safety-form')?.remove();
    const form = document.createElement('form');
    form.className = 'instrument-edit-form instrument-safety-form';
    const title = mode === 'void' ? 'Anular instrumento programado' : instrument.direction === 'in' ? 'Revertir cobro' : 'Revertir pago';
    form.innerHTML = `<h4>${title}</h4><p>${escapeHtml(instrumentDisplayName(instrument))} · ${formatMoney(instrument.amount, instrument.currency)} · ${escapeHtml(Core.entityName(state, instrument.entityId))} · ${escapeHtml(orders.map(orderDisplayCode).join(', '))} · ${escapeHtml(documents.map(documentDisplayLabel).join(', '))} · ${formatDate(instrument.scheduledDate)}</p><label>Motivo<input name="reason" required></label><div class="fatal hidden" role="alert"></div><div class="actions"><button type="submit">${title}</button><button type="button" class="secondary">Cancelar</button></div>`;
    const errorBox = form.querySelector('[role="alert"]');
    form.querySelector('button[type="button"]').addEventListener('click', () => form.remove());
    bindPersistentSubmit(form, async (event) => {
      event.preventDefault();
      errorBox.classList.add('hidden');
      try {
        await postTransaction({ action: mode === 'void' ? 'voidScheduledInstrument' : 'reverseRealizedInstrument', instrumentId, reason: form.elements.reason.value });
        openInstrumentDetail(instrumentId);
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove('hidden');
      }
    });
    body.appendChild(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.elements.reason.focus();
  }

  async function repairInactiveOrderInstrument(instrumentId) {
    const instrument = state.instruments.find((item) => item.id === instrumentId);
    if (!instrument || !Core.instrumentLinkedOnlyToVoidedOrders(state, instrumentId) || !Core.instrumentIsPending(instrument)) return;
    await requestEditAction({ title: 'Sanear instrumento de orden anulada', description: `${instrumentDisplayName(instrument)} · ${formatMoney(instrument.amount, instrument.currency)}. No se generará movimiento bancario.`, fields: [{ name: 'reason', label: 'Motivo obligatorio', required: true }], submitLabel: 'Sanear instrumento', onSubmit: async (values) => {
      await postTransaction({ action: 'repairInactiveOrderInstrument', instrumentId, reason: values.reason });
      openInstrumentDetail(instrumentId);
    } });
  }

  function detailHeading(text) {
    const heading = document.createElement('h4');
    heading.className = 'detail-heading';
    heading.textContent = text;
    return heading;
  }

  function inlineTable(columns, rows) {
    const table = document.createElement('table');
    table.className = 'inline-detail-table';
    const thead = table.createTHead();
    const header = thead.insertRow();
    columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      if (column.headerClass) th.className = column.headerClass;
      else if (column.className && rows.length) th.className = column.className(rows[0]);
      header.appendChild(th);
    });
    const tbody = table.createTBody();
    rows.forEach((row) => {
      const tr = tbody.insertRow();
      columns.forEach((column) => {
        const td = tr.insertCell();
        if (column.node) {
          const node = column.node(row);
          if (node) td.appendChild(node);
        } else {
          const value = typeof column.value === 'function' ? column.value(row) : row[column.value];
          if (column.link) {
            const target = column.link(row);
            if (target) td.appendChild(traceButton(value ?? '', target));
            else td.textContent = value ?? '';
          } else {
            td.textContent = value ?? '';
          }
        }
        if (column.className) td.className = column.className(row);
      });
    });
    return table;
  }

  function backToMonthDetail() {
    document.getElementById('orderDetailPanel')?.classList.add('hidden');
    document.getElementById('instrumentDetailPanel')?.classList.add('hidden');
    if (orderDetailOrigin) {
      orderDetailOrigin.classList.remove('hidden');
      if (orderDetailOrigin.classList.contains('view')) window.scrollTo({ top: orderOriginScroll, behavior: 'smooth' });
      else orderDetailOrigin.scrollIntoView({ behavior: 'smooth', block: 'start' });
      orderDetailOrigin = null;
      return;
    }
    if (!orderDetailReturn) return;
    monthDetail = { ...orderDetailReturn };
    renderDetailFilters();
    renderMonthDetail();
    document.getElementById('monthDetailPanel').classList.remove('hidden');
    document.getElementById('monthDetailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function backFromInstrumentDetail() {
    document.getElementById('instrumentDetailPanel')?.classList.add('hidden');
    if (instrumentDetailOrigin) {
      instrumentDetailOrigin.classList.remove('hidden');
      if (instrumentDetailOrigin.classList.contains('view')) window.scrollTo({ top: instrumentOriginScroll, behavior: 'smooth' });
      else instrumentDetailOrigin.scrollIntoView({ behavior: 'smooth', block: 'start' });
      instrumentDetailOrigin = null;
      return;
    }
    if (orderDetailReturn) backToMonthDetail();
  }

  function renderDetailFilters() {
    const activityOptions = ['', ...Core.ACTIVITIES].map((value) => `<option value="${value}">${value || 'Todas'}</option>`).join('');
    document.getElementById('detailActivityFilter').innerHTML = activityOptions;
    document.getElementById('detailChartFilter').innerHTML = [
      '<option value="">Todas</option>',
      ...state.chartAccounts.map((account) => `<option value="${account.id}">${Core.chartPath(state, account.id)}</option>`)
    ].join('');
    document.getElementById('detailEntityFilter').innerHTML = [
      '<option value="">Todas</option>',
      ...state.entities.map((entity) => `<option value="${entity.id}">${entity.name}</option>`)
    ].join('');
    document.getElementById('detailStatusFilter').value = monthDetail.status || '';
    document.getElementById('detailActivityFilter').value = monthDetail.activity || '';
    document.getElementById('detailChartFilter').value = monthDetail.chartAccountId || '';
    document.getElementById('detailEntityFilter').value = monthDetail.entityId || '';
    document.getElementById('detailCurrencyFilter').value = monthDetail.currency ?? '';
    document.getElementById('detailDateFrom').value = monthDetail.dateFrom || '';
    document.getElementById('detailDateTo').value = monthDetail.dateTo || '';
  }

  function renderMonthDetail() {
    if (!monthDetail) return;
    monthDetail.status = document.getElementById('detailStatusFilter').value;
    monthDetail.activity = document.getElementById('detailActivityFilter').value;
    monthDetail.chartAccountId = document.getElementById('detailChartFilter').value;
    monthDetail.entityId = document.getElementById('detailEntityFilter').value;
    monthDetail.currency = document.getElementById('detailCurrencyFilter').value;
    monthDetail.dateFrom = document.getElementById('detailDateFrom').value;
    monthDetail.dateTo = document.getElementById('detailDateTo').value;
    document.getElementById('monthDetailTitle').textContent = monthDetail.openOnly ? 'Pendientes anteriores' : monthDetail.month ? `Detalle del mes ${monthDetail.month}` : 'Detalle del flujo';
    let rows = (monthDetail.openOnly ? Core.openFlowRows : Core.filterFlowRows)(state, {
      currency: monthDetail.currency,
      status: monthDetail.status,
      activity: monthDetail.activity,
      chartAccountId: monthDetail.chartAccountId,
      entityId: monthDetail.entityId,
      direction: monthDetail.direction,
      sourceId: monthDetail.sourceId,
      dateFrom: monthDetail.dateFrom,
      dateTo: monthDetail.dateTo
    });
    if (monthDetail.visualCategory) rows = rows.filter((row) => flowVisualCategory(row) === monthDetail.visualCategory);
    if (monthDetail.agriculturalIncomeKind) rows = rows.filter((row) => agriculturalIncomeKind(row) === monthDetail.agriculturalIncomeKind);
    if (monthDetail.projectionCrop) rows = rows.filter((row) => row.projectionId && row.cereal === monthDetail.projectionCrop);
    const totals = flowCurrencyTotals(rows, monthDetail.currency);
    renderFlowCurrencyTotals('monthDetailTotals', totals);

    renderTable('monthDetailTable', flowColumns(), rows);
    appendMonthDetailTotals(totals);
    const overdueSection = document.getElementById('monthDetailOverdue');
    const monthBounds = monthDetail.month ? Core.monthBounds(monthDetail.month) : null;
    const showOverdue = monthBounds && !monthDetail.openOnly && monthDetail.status !== 'settled'
      && monthDetail.dateFrom === monthBounds.from && monthDetail.dateTo === monthBounds.to;
    const overdueRows = showOverdue ? Core.openFlowRows(state, {
      currency: monthDetail.currency,
      status: monthDetail.status,
      activity: monthDetail.activity,
      chartAccountId: monthDetail.chartAccountId,
      entityId: monthDetail.entityId,
      direction: monthDetail.direction
    }).filter((row) => row.date && row.date < monthBounds.from) : [];
    overdueSection.classList.toggle('hidden', !overdueRows.length);
    if (overdueRows.length) {
      document.getElementById('monthDetailOverdueCount').textContent = `(${overdueRows.length})`;
      renderFlowCurrencyTotals('monthDetailOverdueTotals', flowCurrencyTotals(overdueRows, monthDetail.currency));
      renderTable('monthDetailOverdueTable', flowColumns(), overdueRows);
    }
  }

  function flowIncomeAmount(row) {
    return row.direction === 'in' && row.amount > 0 ? formatFlowMoney(row.amount, row.currency) : '';
  }

  function flowExpenseAmount(row) {
    return row.direction === 'out' && row.amount < 0 ? formatFlowMoney(Math.abs(row.amount), row.currency) : '';
  }

  function flowMediumLabel(row) {
    if (!row.instrumentId) return row.source === 'document-balance' ? 'Sin definir' : '—';
    const instrument = state.instruments.find((item) => item.id === row.instrumentId);
    return instrument ? labelForType(instrument.type) : '—';
  }

  function flowStatusBadge(row) {
    const label = labelForStatus(row.userStatus);
    const normalized = String(label || '').toLowerCase();
    const tone = normalized === 'pendiente' || normalized === 'pendiente vencido'
      ? 'pending'
      : normalized === 'pagado'
        ? 'paid'
        : normalized === 'cobrado'
          ? 'collected'
          : 'neutral';
    const badge = document.createElement('span');
    badge.className = `badge flow-status flow-status-${tone}`;
    badge.textContent = label;
    return badge;
  }

  function instrumentOrderContext(instrumentId) {
    const link = state.orderInstruments.find((item) => item.instrumentId === instrumentId && !item.voidedAt);
    const order = link ? state.orders.find((item) => item.id === link.orderId && !item.voidedAt) : null;
    return { link, order, isCollection: order?.type === 'collection' };
  }

  function nextInstrumentAction(instrument) {
    if (!instrument || instrument.voidedAt || Core.instrumentLinkedOnlyToInactiveOrders(state, instrument.id)) return null;
    const { isCollection } = instrumentOrderContext(instrument.id);
    const direction = instrument.direction || (isCollection ? 'in' : 'out');
    if (['transfer', 'account_debit'].includes(instrument.type) && instrument.status === 'scheduled') return { label: direction === 'in' ? 'Marcar cobrado' : 'Marcar pagado', status: 'executed' };
    if (instrument.type === 'vep' && instrument.status === 'scheduled') return { label: direction === 'in' ? 'Marcar cobrado' : 'Marcar pagado', status: 'executed' };
    if (instrument.type === 'card_financing' && instrument.status === 'scheduled') return { label: direction === 'in' ? 'Marcar cobrado' : 'Marcar pagado', status: 'executed' };
    if (instrument.type === 'cash' && instrument.status !== 'executed') return { label: direction === 'in' ? 'Marcar cobrado' : 'Marcar pagado', status: 'executed' };
    if (instrument.type === 'own_check' && direction === 'out' && instrument.status === 'issued') return { label: 'Marcar entregado', status: 'delivered' };
    if (instrument.type === 'own_check' && direction === 'out' && instrument.status === 'delivered') return { label: 'Marcar debitado', status: 'debited' };
    if (instrument.type === 'own_check' && direction === 'in' && instrument.status === 'scheduled') return { label: 'Marcar cobrado', status: 'executed' };
    if (instrument.type === 'received_check' && instrument.status === 'received') return { label: 'Pasar a cartera', status: 'inPortfolio' };
    if (instrument.type === 'received_check' && ['inPortfolio', 'deposited'].includes(instrument.status)) return { label: 'Acreditar', status: 'accredited' };
    return null;
  }

  function flowActionNode(row) {
    if (row.source === 'agricultural-income-projection') {
      return actionGroup([{ label: 'Ver / Editar', fn: () => openAgriculturalProjection(row.projectionId) }], 'flow-action-group');
    }
    if (row.source === 'document-balance' && row.documentId) {
      const label = row.direction === 'in' ? 'Definir cobro' : 'Definir pago';
      return actionGroup([{ label, fn: () => prepareOrderFromDocument(row.documentId) }, { label: 'Ver', fn: () => navigateTarget({ type: 'document', id: row.documentId, row }) }], 'flow-action-group');
    }
    if (row.instrumentId) {
      const instrument = state.instruments.find((item) => item.id === row.instrumentId);
      const action = flowInstrumentAction(instrument);
      const actions = [{ label: 'Ver', fn: () => openInstrumentDetail(row.instrumentId) }];
      if (action) actions.unshift({ label: action.label, fn: () => transitionInstrumentTo(row.instrumentId, action.status) });
      return actionGroup(actions, 'flow-action-group');
    }
    const target = flowRowTraceTarget(row);
    return target ? actionGroup([{ label: 'Ver', fn: () => navigateTarget(target) }], 'flow-action-group') : document.createTextNode('');
  }

  function flowInstrumentAction(instrument) {
    if (!instrument || Core.instrumentIsBankRealized?.(instrument)) return null;
    const { isCollection } = instrumentOrderContext(instrument.id);
    const direction = instrument.direction || (isCollection ? 'in' : 'out');
    if (instrument.type === 'own_check' && direction === 'out' && instrument.status === 'issued') return { label: 'Marcar entregado', status: 'delivered' };
    if (instrument.type === 'own_check' && direction === 'out' && instrument.status === 'delivered') return { label: 'Marcar debitado', status: 'debited' };
    if (instrument.type === 'received_check' && direction === 'in' && ['received', 'inPortfolio', 'deposited'].includes(instrument.status)) return { label: 'Marcar cobrado', status: 'accredited' };
    const action = nextInstrumentAction(instrument);
    if (!action) return null;
    return { ...action, label: direction === 'in' ? 'Marcar cobrado' : 'Marcar pagado' };
  }

  function appendMonthDetailTotals(groups) {
    const table = document.getElementById('monthDetailTable');
    if (!table) return;
    const foot = table.createTFoot();
    groups.forEach((totals) => {
      const tr = foot.insertRow();
      tr.className = 'total-row';
      [`TOTAL ${totals.currency}`, '', '', '', '', ''].forEach((text) => {
        const td = tr.insertCell();
        td.textContent = text;
      });
      const income = tr.insertCell();
      income.className = 'amount positive';
      income.textContent = formatFlowMoney(totals.incomes, totals.currency);
      const expense = tr.insertCell();
      expense.className = 'amount negative';
      expense.textContent = formatFlowMoney(totals.expenses, totals.currency);
      tr.insertCell().textContent = '';
    });
  }

  function flowOriginLabel(row) {
    if (row.source === 'agricultural-income-projection') return `Cosecha estimada · ${row.cereal} ${row.campaign}`;
    if (row.instrumentId) return instrumentDisplayName(row.instrumentId);
    if (row.orderId) return orderDisplayCode(row.orderId);
    if (row.documentId) return state.documents.find((doc) => doc.id === row.documentId)?.number || row.documentId;
    if (row.forwardId) return row.reference || `FWD ${row.cereal || ''} ${row.campaign || ''}`.trim();
    return row.id || '';
  }

  function chartIncludes(rowChartId, selectedChartId) {
    if (!selectedChartId) return true;
    if (rowChartId === selectedChartId) return true;
    const selectedPath = Core.chartPath(state, selectedChartId);
    const rowPath = Core.chartPath(state, rowChartId);
    return rowPath.startsWith(`${selectedPath} > `);
  }

  function resetDetailToMonth() {
    if (!monthDetail) return;
    if (monthDetail.month) {
      const bounds = Core.monthBounds(monthDetail.month);
      monthDetail.dateFrom = bounds.from;
      monthDetail.dateTo = bounds.to;
    }
    monthDetail.status = '';
    monthDetail.activity = '';
    monthDetail.chartAccountId = '';
    monthDetail.entityId = '';
    monthDetail.sourceId = '';
    monthDetail.agriculturalIncomeKind = '';
    monthDetail.projectionCrop = '';
    monthDetail.direction = '';
    renderDetailFilters();
    renderMonthDetail();
  }

  const operationsUi = {
    documents: { filters: {}, page: 0, pageSize: 25 },
    orders: { filters: {}, page: 0, pageSize: 25 }
  };

  function operationRows(kind, filters = {}) {
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return state[kind].filter((row) => {
      const breakdown = kind === 'documents' ? Core.documentBreakdown(state, row.id) : Core.orderBreakdown(state, row.id);
      const status = row.voidedAt ? 'Anulado' : breakdown?.status || '';
      const date = kind === 'documents' ? row.issueDate : row.date;
      const number = kind === 'documents' ? row.number : orderDisplayCode(row);
      return (!filters.status || status === filters.status)
        && (!filters.coverage || (kind === 'documents' && !row.voidedAt && (filters.coverage === 'uncovered' ? breakdown.nonInstrumented >= 0.005 : breakdown.nonInstrumented < 0.005)))
        && (!filters.dateFrom || date >= filters.dateFrom)
        && (!filters.dateTo || date <= filters.dateTo)
        && (!filters.entity || normalize(Core.entityName(state, row.entityId)).includes(normalize(filters.entity)))
        && (!filters.number || normalize(number).includes(normalize(filters.number)))
        && (!filters.type || row.type === filters.type)
        && (!filters.activity || row.activity === filters.activity)
        && (!filters.chartAccountId || chartIncludes(row.chartAccountId, filters.chartAccountId))
        && (!filters.currency || row.currency === filters.currency)
        && (!filters.search || normalize([number, row.description, Core.entityName(state, row.entityId), labelForType(row.type), ...(kind === 'orders' ? [
          ...state.orderDocuments.filter((link) => link.orderId === row.id && !link.voidedAt).map((link) => state.documents.find((doc) => doc.id === link.documentId)?.number || ''),
          ...state.orderInstruments.filter((link) => link.orderId === row.id && !link.voidedAt).map((link) => { const instrument = state.instruments.find((item) => item.id === link.instrumentId); return [instrument?.checkNumber, instrument?.reference, instrument?.type, instrument && labelForType(instrument.type)].join(' '); })
        ] : [])].join(' ')).includes(normalize(filters.search)));
    });
  }

  function operationPage(rows, page, pageSize) {
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.max(0, Math.min(page, pages - 1));
    return { rows: rows.slice(current * pageSize, (current + 1) * pageSize), page: current, pages };
  }

  function generalAmountFilter(index, redraw) {
    const menu = document.createElement('details'); menu.className = 'column-filter';
    const summary = document.createElement('summary'); summary.textContent = '▾'; summary.title = 'Filtrar y ordenar importe'; menu.appendChild(summary);
    const panel = document.createElement('div'); panel.className = 'column-filter-menu'; menu.appendChild(panel);
    menu.addEventListener('toggle', () => {
      if (!menu.open || typeof summary.getBoundingClientRect !== 'function') return;
      document.querySelectorAll('.column-filter[open]').forEach((other) => { if (other !== menu) other.open = false; });
      const rect = summary.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 256))}px`;
      panel.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 280))}px`;
    });
    const current = tableFilters.generalMovementsTable?.[index] || {};
    const currencyLabel = document.createElement('label'); currencyLabel.textContent = 'Moneda';
    const currency = document.createElement('select');
    currency.innerHTML = '<option value="">Todas</option><option>ARS</option><option>USD</option>';
    currency.value = current.currency || '';
    currencyLabel.appendChild(currency); panel.appendChild(currencyLabel);
    const controls = ['Minimo', 'Maximo'].map((label, position) => {
      const wrapper = document.createElement('label'); wrapper.textContent = label;
      const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'decimal'; input.value = current[position ? 'max' : 'min'] ?? '';
      wrapper.appendChild(input); panel.appendChild(wrapper); return input;
    });
    panel.appendChild(actionGroup([
      { label: 'Aplicar', fn: () => { tableFilters.generalMovementsTable ||= {}; tableFilters.generalMovementsTable[index] = { currency: currency.value, min: controls[0].value === '' ? '' : parseLocaleNumber(controls[0].value), max: controls[1].value === '' ? '' : parseLocaleNumber(controls[1].value) }; generalMovementsUi.page = 0; redraw(); } },
      { label: 'Limpiar', fn: () => { delete tableFilters.generalMovementsTable?.[index]; generalMovementsUi.page = 0; redraw(); } },
      { label: 'Menor primero', fn: () => { generalMovementsUi.sort = 'amount'; generalMovementsUi.descending = false; redraw(); } },
      { label: 'Mayor primero', fn: () => { generalMovementsUi.sort = 'amount'; generalMovementsUi.descending = true; redraw(); } }
    ]));
    return menu;
  }

  function generalMovementActions(row) {
    const target = row.target;
    const record = target.type === 'document' ? state.documents.find((x) => x.id === target.id)
      : target.type === 'order' ? state.orders.find((x) => x.id === target.id)
      : target.type === 'instrument' ? state.instruments.find((x) => x.id === target.id)
      : target.type === 'documentCompensation' ? state.documentCompensations?.find((x) => x.id === target.id) : null;
    const actions = [{ label: 'Ver', fn: () => navigateTarget(target) }];
    if (record && !record.voidedAt && !['cancelled', 'voided'].includes(record.status)) actions.push({ label: 'Editar', fn: () => {
      navigateTarget(target);
      if (target.type === 'document') openDocumentEditor(target.id, false);
      else if (target.type === 'order') editOrder(target.id);
      else if (target.type === 'documentCompensation') editDocumentCompensation(target.id);
      else document.getElementById('instrumentDetailBody')?.querySelector('.instrument-edit-form')?.classList.remove('hidden');
    } });
    return actionGroup(actions);
  }

  function renderGeneralMovements() {
    if (!document.getElementById('generalMovementsTable')) return;
    const search = String(document.getElementById('generalMovementsSearch')?.value || '').toLocaleLowerCase('es');
    const rows = Core.generalMovementRows(state).map((row) => ({ ...row,
      reference: row.target.type === 'order' && row.referenceKind !== 'withholding' ? orderDisplayCode(row.target.id) : row.target.type === 'instrument' ? instrumentDisplayName(row.target.id) : row.reference,
      entity: Core.entityName(state, row.entityId), account: row.chartAccountId ? Core.chartPath(state, row.chartAccountId) : Core.accountName(state, row.financialAccountId) || ''
    })).filter((row) => !search || [row.reference, row.entity, row.concept, row.type].join(' ').toLocaleLowerCase('es').includes(search));
    renderTable('generalMovementsTable', [
      { label: 'Fecha efectiva', value: (row) => row.date ? formatDate(row.date) : 'Sin fecha registrada', minWidth: 95 },
      { label: 'Tipo', value: 'type', minWidth: 95 },
      { label: 'Referencia', value: 'reference', link: (row) => row.target, minWidth: 130 },
      { label: 'Contraparte', value: 'entity', minWidth: 130 },
      { label: 'Concepto', value: 'concept', minWidth: 165 },
      { label: 'Importe', value: (row) => row.debtCurrency ? compensationAmountLabel(row) : formatFlowMoney(row.amount, row.currency), className: () => 'amount', minWidth: 115 },
      { label: 'Estado', value: (row) => labelForStatus(row.status), minWidth: 110 },
      { label: 'Actividad', value: 'activity', minWidth: 100 },
      { label: 'Cuenta', value: 'account', minWidth: 120 },
      { label: 'Acciones', node: generalMovementActions, minWidth: 105 }
    ], rows);
  }

  function setupOperationsLists() {
    Object.keys(operationsUi).forEach((kind) => {
      const ui = operationsUi[kind];
      const fields = [
        ['search', 'Busqueda rapida', 'search'], ['status', 'Estado', 'select'],
        ['dateFrom', 'Fecha desde', 'date'], ['dateTo', 'Fecha hasta', 'date'],
        ['entity', 'Contraparte / Razon social', 'search'], ['number', kind === 'documents' ? 'N.o documento' : 'N.o OP/OC', 'search'],
        ['type', 'Tipo', 'select'], ['currency', 'Moneda', 'select'],
        ...(kind === 'documents' ? [['activity', 'Actividad', 'select'], ['chartAccountId', 'Cuenta / Concepto', 'select'], ['coverage', 'Sin medio', 'select']] : [])
      ];
      const container = document.getElementById(`${kind}Filters`);
      fields.forEach(([key, label, type]) => {
        const wrapper = document.createElement('label');
        wrapper.textContent = label;
        const input = document.createElement(type === 'select' ? 'select' : 'input');
        input.id = `${kind}Filter-${key}`;
        operationsControls[input.id] = input;
        if (type !== 'select') input.type = type;
        input.addEventListener(type === 'select' || type === 'date' ? 'change' : 'input', () => {
          if (input.parentElement?.closest?.('.column-filter-menu')) return;
          ui.filters[key] = input.value;
          ui.page = 0;
          renderOperations();
        });
        wrapper.appendChild(input);
        container.appendChild(wrapper);
        if (kind === 'orders' && key === 'search') {
          wrapper.className = 'orders-quick-search';
          container.before?.(wrapper);
        }
      });
      container.appendChild(actionGroup([{ label: 'Limpiar filtros', fn: () => {
        ui.filters = {};
        fields.forEach(([key]) => { document.getElementById(`${kind}Filter-${key}`).value = ''; });
        ui.page = 0;
        renderOperations();
      } }]));
    });
  }

  function operationsVisibleRows(kind) {
    const ui = operationsUi[kind];
    const rows = operationRows(kind, ui.filters);
    const choices = {
      status: [...new Set(state[kind].map((row) => row.voidedAt ? 'Anulado' : (kind === 'documents' ? Core.documentBreakdown(state, row.id) : Core.orderBreakdown(state, row.id))?.status).filter(Boolean))].map((value) => [value, labelForStatus(value)]),
      type: [...new Set(state[kind].map((row) => row.type))].map((value) => [value, labelForType(value)]),
      currency: [['ARS', 'ARS'], ['USD', 'USD']],
      coverage: [['uncovered', 'Con saldo sin instrumentar'], ['covered', 'Totalmente cubiertos (instrumentados o cancelados)']],
      activity: Core.ACTIVITIES.map((value) => [value, value]),
      chartAccountId: state.chartAccounts.map((account) => [account.id, Core.chartPath(state, account.id)])
    };
    Object.entries(choices).forEach(([key, options]) => {
      const select = document.getElementById(`${kind}Filter-${key}`);
      if (!select) return;
      select.innerHTML = '<option value="">Todos</option>' + options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
      select.value = ui.filters[key] || '';
    });
    const page = operationPage(rows, ui.page, ui.pageSize);
    ui.page = page.page;
    document.getElementById(`${kind}Count`).textContent = `${rows.length} / ${state[kind].length}`;
    const pager = document.getElementById(`${kind}Pager`);
    pager.innerHTML = '';
    const info = document.createElement('span');
    info.textContent = `Pagina ${page.page + 1} de ${page.pages}`;
    pager.appendChild(info);
    [['Anterior', -1], ['Siguiente', 1]].forEach(([label, step]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = label;
      button.disabled = ui.page + step < 0 || ui.page + step >= page.pages;
      button.addEventListener('click', () => { ui.page += step; renderOperations(); });
      pager.appendChild(button);
    });
    const size = document.createElement('select');
    size.ariaLabel = 'Filas por pagina';
    size.innerHTML = '<option value="25">25 filas</option><option value="50">50 filas</option>';
    size.value = String(ui.pageSize);
    size.addEventListener('change', () => { ui.pageSize = Number(size.value); ui.page = 0; renderOperations(); });
    pager.appendChild(size);
    return page.rows;
  }

  function operationBreakdown(kind, id) {
    const result = kind === 'documents' ? Core.documentBreakdown(state, id) : Core.orderBreakdown(state, id);
    return result || { status: 'Anulado', cancelled: 0, committedPending: 0, nonInstrumented: 0, applied: 0, commercialCancelled: 0, paidOrCollected: 0, pending: 0, notCoveredByInstrument: 0 };
  }

  function renderOperations() {
    renderTable('compensationRequestsTable', [
      { label: 'Fecha solicitud', value: (row) => formatDate(row.requestedDate || row.date) },
      { label: 'Contraparte', value: (row) => Core.entityName(state, row.entityId) },
      { label: 'Crédito', value: (row) => documentDisplayLabel(state.documents.find((doc) => doc.id === row.creditDocumentId)), link: (row) => ({ type: 'document', id: row.creditDocumentId }) },
      { label: 'Deuda', value: (row) => documentDisplayLabel(state.documents.find((doc) => doc.id === row.debtDocumentId)), link: (row) => ({ type: 'document', id: row.debtDocumentId }) },
      { label: 'Moneda', value: 'currency' },
      { label: 'Importe', value: (row) => compensationAmountLabel(row), className: () => 'amount' },
      { label: 'Estado', value: () => 'Solicitada' },
      { label: 'Acciones', node: (row) => actionGroup([
        { label: 'Ver', fn: () => showTrace({ type: 'documentCompensation', id: row.id }, true) },
        { label: 'Confirmar', fn: () => transitionDocumentCompensation(row.id, 'confirmed') },
        { label: 'Anular solicitud', fn: () => transitionDocumentCompensation(row.id, 'cancelled') }
      ]) }
    ], (state.documentCompensations || []).filter((item) => Core.compensationStatus(item) === 'requested'));
    renderTable('documentsTable', [
      { label: 'Documento', value: 'number', link: (row) => ({ type: 'document', id: row.id }) },
      { label: 'Tipo', value: (row) => labelForType(row.type) },
      { label: 'Entidad', value: (row) => Core.entityName(state, row.entityId), link: (row) => makeEntityLink(row.entityId) },
      { label: 'Fecha', value: (row) => formatDate(row.issueDate) },
      { label: 'Vence', value: (row) => formatDate(row.dueDate) },
      { label: 'Actividad', value: 'activity' },
      { label: 'Cuenta', value: (row) => Core.chartPath(state, row.chartAccountId), link: (row) => makeChartLink(row.chartAccountId), className: () => 'wrap' },
      { label: 'Moneda', value: 'currency' },
      { label: 'Original', value: (row) => formatMoney(row.amount, row.currency), className: () => 'amount' },
      { label: 'Cancelado', value: (row) => formatMoney(operationBreakdown('documents', row.id).cancelled, row.currency), className: () => 'amount' },
      { label: 'Comprometido', value: (row) => formatMoney(operationBreakdown('documents', row.id).committedPending, row.currency), className: () => 'amount' },
      { label: 'Sin medio', value: (row) => formatMoney(operationBreakdown('documents', row.id).nonInstrumented, row.currency), className: () => 'amount' },
      { label: 'Estado', value: (row) => operationBreakdown('documents', row.id).status },
      { label: 'Acciones', node: (row) => actionGroup([{ label: 'Editar', fn: () => editDocument(row.id) }, { label: 'Anular', fn: () => voidRecord('document', row.id) }]), minWidth: 110 }
    ], operationsVisibleRows('documents'));

    renderTable('ordersTable', [
      { label: 'Orden', value: (row) => orderDisplayCode(row), link: (row) => ({ type: 'order', id: row.id }) },
      { label: 'Tipo', value: (row) => labelForType(row.type) },
      { label: 'Fecha', value: (row) => formatDate(row.date) },
      { label: 'Entidad', value: (row) => Core.entityName(state, row.entityId), link: (row) => makeEntityLink(row.entityId) },
      { label: 'Concepto', value: 'description', className: () => 'wrap' },
      { label: 'Moneda', value: 'currency' },
      { label: 'Aplicado', value: (row) => formatMoney(operationBreakdown('orders', row.id).applied, row.currency), className: () => 'amount' },
      { label: 'Pagado/Cobrado', value: (row) => formatMoney(operationBreakdown('orders', row.id).paidOrCollected, row.currency), className: () => 'amount' },
      { label: 'Pendiente', value: (row) => formatMoney(operationBreakdown('orders', row.id).pending + operationBreakdown('orders', row.id).notCoveredByInstrument, row.currency), className: () => 'amount' },
      { label: 'Estado', value: (row) => operationBreakdown('orders', row.id).status },
      { label: 'Acciones', node: (row) => actionGroup([{ label: 'Anular', fn: () => voidRecord('order', row.id) }]), minWidth: 120 }
    ], operationsVisibleRows('orders'));
  }

  function pendingDocumentsForOrder() {
    const entityId = document.getElementById('orderEntity').value;
    const orderType = document.getElementById('orderType').value;
    const expectedDirection = orderType === 'collection' ? 'in' : 'out';
    return state.documents.filter((doc) => {
      if (entityId && doc.entityId !== entityId) return false;
      if (Core.documentDirection(doc, state) !== expectedDirection) return false;
      return orderDocumentAvailableToApply(doc.id) > 0.01;
    });
  }

  function orderDocumentAvailableToApply(documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    const b = Core.documentBreakdown(state, documentId);
    if (!doc || !b) return 0;
    return Math.max(Math.min(b.nonInstrumented, doc.amount - b.assigned), 0);
  }

  function orderDocumentSettlementSummary(orderDocumentId) {
    const settlements = state.orderDocumentSettlements.filter((item) => item.orderDocumentId === orderDocumentId && !item.voidedAt);
    const summary = settlements.reduce((summary, settlement) => {
      const orderInstrument = state.orderInstruments.find((item) => item.id === settlement.orderInstrumentId && !item.voidedAt);
      const instrument = orderInstrument ? state.instruments.find((item) => item.id === orderInstrument.instrumentId && !item.voidedAt) : null;
      if (!instrument) return summary;
      if (Core.instrumentCommerciallyCancelsNow(instrument)) summary.commercialCancelled += settlement.amount;
      if (Core.instrumentIsBankRealized(instrument)) summary.financialRealized += settlement.amount;
      else {
        if (Core.instrumentIsPending(instrument)) summary.financialPending += settlement.amount;
        if (!Core.instrumentCommerciallyCancelsNow(instrument) && (Core.instrumentCancelsDocument(instrument) || Core.instrumentIsPending(instrument))) summary.committedPending += settlement.amount;
      }
      return summary;
    }, { commercialCancelled: 0, financialRealized: 0, committedPending: 0, financialPending: 0, taxWithheld: 0 });
    summary.taxWithheld = (state.orderTaxWithholdings || []).filter((item) => item.orderDocumentId === orderDocumentId && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    summary.commercialCancelled += summary.taxWithheld;
    return summary;
  }

  function documentOrderApplicationContext(documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    const breakdown = Core.documentBreakdown(state, documentId);
    if (!doc || doc.voidedAt || !breakdown) return null;
    const assignments = state.orderDocuments
      .filter((item) => item.documentId === documentId && !item.voidedAt)
      .map((link) => {
        const order = state.orders.find((item) => item.id === link.orderId && !item.voidedAt);
        const orderBreakdown = order ? Core.orderBreakdown(state, order.id) : null;
        const settlement = orderDocumentSettlementSummary(link.id);
        const withoutInstrument = Math.max(Number(link.amountApplied || 0) - settlement.commercialCancelled - settlement.committedPending, 0);
        return { link, order, orderBreakdown, settlement, withoutInstrument };
      })
      .filter((item) => item.order);
    return {
      doc,
      breakdown,
      assignments,
      commercialPending: Math.max(doc.amount - breakdown.commercialCancelled, 0),
      assigned: breakdown.assigned,
      free: orderDocumentAvailableToApply(documentId),
      continuable: assignments.filter((item) => item.withoutInstrument > 0.01 && item.orderBreakdown?.status === 'Pendiente')
    };
  }

  function renderOrderDocumentsList() {
    const container = document.getElementById('orderDocumentsList');
    const docs = pendingDocumentsForOrder();
    container.innerHTML = docs.map((doc) => {
      const b = Core.documentBreakdown(state, doc.id);
      const available = orderDocumentAvailableToApply(doc.id);
      return `
        <label class="selection-row">
          <input type="checkbox" data-doc-id="${doc.id}" data-doc-currency="${doc.currency}">
          <span class="selection-main">
            <strong>${doc.number || doc.description || doc.id}</strong>
            <small>${Core.entityName(state, doc.entityId)} · vence ${formatDate(doc.dueDate)} · ${doc.description || Core.chartPath(state, doc.chartAccountId)}</small>
          </span>
          <span class="selection-balance"><small>Saldo</small><strong class="amount">${formatMoney(available, doc.currency)}</strong></span>
          <span class="selection-apply"><small>Aplicar</small><input type="number" step="0.01" min="0" max="${available}" value="${available}" data-doc-amount="${doc.id}" aria-label="Importe aplicado a ${doc.number || doc.id}"></span>
        </label>
      `;
    }).join('') || '<p class="muted">No hay documentos pendientes para el tipo y filtro seleccionados.</p>';
    container.querySelectorAll('[data-doc-amount]').forEach(wireDecimalNumberInput);
    container.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', renderOrderSummary);
      if (input.matches('[data-doc-amount]')) input.addEventListener('input', renderOrderSummary);
    });
    renderOrderSummary();
  }

  function selectedOrderDocuments() {
    return Array.from(document.querySelectorAll('#orderDocumentsList [data-doc-id]:checked')).map((input) => ({
      documentId: input.dataset.docId,
      amountApplied: parseLocaleNumber(document.querySelector(`[data-doc-amount="${input.dataset.docId}"]`).value || 0)
    })).filter((item) => item.amountApplied > 0);
  }

  function calculateInstrumentCurrencyFields({ amount, commercialAmount, exchangeRate, exchangeRateEmpty = exchangeRate == null || exchangeRate === 0, source, principal }) {
    const positive = (value) => Number.isFinite(value) && value > 0;
    if (source === 'amount' || source === 'commercialAmount') principal = source;
    if (!principal) principal = positive(amount) ? 'amount' : 'commercialAmount';
    let calculatedField = '';
    if (source && positive(exchangeRate)) {
      if (principal === 'commercialAmount' && positive(commercialAmount)) {
        amount = Math.round(commercialAmount * exchangeRate * 100) / 100;
        calculatedField = 'amount';
      } else if (principal === 'amount' && positive(amount)) {
        commercialAmount = Math.round(amount / exchangeRate * 100) / 100;
        calculatedField = 'commercialAmount';
      }
    } else if (exchangeRateEmpty && ['amount', 'commercialAmount'].includes(source) && positive(amount) && positive(commercialAmount)) {
      exchangeRate = Number((amount / commercialAmount).toFixed(12));
      calculatedField = 'exchangeRate';
    }
    return { amount, commercialAmount, exchangeRate, principal, calculatedField,
      roundingDifference: positive(amount) && positive(commercialAmount) && positive(exchangeRate) ? Math.round((amount - commercialAmount * exchangeRate) * 100) / 100 : null };
  }

  function documentExchangeRateSuggestion(doc, currency) {
    if (!doc || doc.currency === currency) return null;
    const explicitNumber = (value) => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? (value.includes(',') ? parseLocaleNumber(value) : Number(value)) : NaN;
    // Legacy invoice TC is ARS/USD; native liquidation TC has an explicit financial currency.
    const invoiceRate = doc.currency === 'USD' && currency === 'ARS' ? explicitNumber(doc.tcInvoice) : NaN;
    const fromInvoice = Number.isFinite(invoiceRate) && invoiceRate > 0;
    const rate = fromInvoice ? invoiceRate : doc.financialCurrency === currency ? explicitNumber(doc.exchangeRate) : NaN;
    return Number.isFinite(rate) && rate > 0 ? { rate, source: fromInvoice ? 'tcInvoice' : 'exchangeRate', documentId: doc.id, number: doc.number || doc.id } : null;
  }

  function existingOrderExchangeRateDate(doc, suggestion) {
    return suggestion?.source === 'tcInvoice' && doc.issueDate ? doc.issueDate : Core.todayIso();
  }

  function suggestInstrumentExchangeRate(row, currency) {
    const docs = selectedOrderDocuments().map((link) => state.documents.find((doc) => doc.id === link.documentId)).filter(Boolean);
    const context = `${currency}:${docs.map((doc) => doc.id).sort().join(',')}`;
    if (row.dataset.exchangeSuggestionContext === context) return;
    row.dataset.exchangeSuggestionContext = context;
    delete row.dataset.exchangeRateSuggestion;
    const rateInput = row.querySelector('[data-field="exchangeRate"]');
    if (rateInput.value !== '' || !docs.length) return;
    const suggestions = docs.map((doc) => documentExchangeRateSuggestion(doc, currency));
    if (suggestions.some((item) => !item) || suggestions.some((item) => item.rate !== suggestions[0].rate)) return;
    rateInput.value = suggestions[0].rate;
    row.dataset.exchangeRateSuggestion = String(suggestions[0].rate);
    row.dataset.exchangeRateSource = 'exchangeRate';
  }

  function ensureInstrumentApplicationFields(row) {
    if (row.querySelector('[data-field="currency"]')) return;
    for (const [field, type] of [['currency', 'select'], ['commercialAmount', 'text'], ['exchangeRate', 'number'], ['exchangeRateDate', 'date'], ['exchangeRateReference', 'text']]) {
      const input = document.createElement(type === 'select' ? 'select' : 'input');
      input.dataset.field = field;
      if (type === 'select') input.innerHTML = Core.CURRENCIES.map((currency) => `<option>${currency}</option>`).join('');
      else input.type = type;
      if (field === 'commercialAmount') { input.dataset.moneyInput = 'true'; input.inputMode = 'decimal'; }
      if (field === 'exchangeRate') { input.min = '0'; input.step = 'any'; }
      row.appendChild(input);
    }
    const summary = document.createElement('p');
    summary.dataset.exchangeSummary = 'true'; summary.className = 'context-help hidden'; summary.setAttribute('role', 'status');
    row.appendChild(summary);
  }

  function resetInstrumentApplicationFields(row) {
    delete row.dataset.currencyTouched; delete row.dataset.exchangeRateSource;
    delete row.dataset.exchangePrincipal; delete row.dataset.exchangeSuggestionContext; delete row.dataset.exchangeRateSuggestion;
    const currency = row.querySelector('[data-field="currency"]');
    if (currency) currency.value = selectedOrderCurrency();
    for (const field of ['commercialAmount', 'exchangeRate', 'exchangeRateReference']) {
      const input = row.querySelector(`[data-field="${field}"]`); if (input) input.value = '';
    }
    const date = row.querySelector('[data-field="exchangeRateDate"]');
    if (date) date.value = valueFromInput('orderDate') || Core.todayIso();
    syncInstrumentApplicationFields(row);
  }

  function syncInstrumentApplicationFields(row, source) {
    const currencyInput = row.querySelector('[data-field="currency"]');
    if (!currencyInput) return;
    if (!row.dataset.currencyTouched) currencyInput.value = selectedOrderCurrency();
    const currency = currencyInput.value, commercialCurrency = selectedOrderCurrency(), cross = currency !== commercialCurrency;
    row.classList.toggle('multicurrency', cross);
    for (const field of ['commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference']) {
      row.querySelector(`[data-instrument-field="${field}"]`)?.classList.toggle('hidden', !cross);
      const input = row.querySelector(`[data-field="${field}"]`); if (input) { input.disabled = !cross; input.required = cross && field !== 'exchangeRateReference'; }
    }
    const summary = row.querySelector('[data-exchange-summary]'); summary?.classList.toggle('hidden', !cross);
    const nominalLabel = row.querySelector('[data-instrument-field="amount"]');
    if (nominalLabel?.firstChild) nominalLabel.firstChild.textContent = `Importe nominal (${currency})`;
    if (!cross) return;
    suggestInstrumentExchangeRate(row, currency);
    const commercial = row.querySelector('[data-field="commercialAmount"]'), rate = row.querySelector('[data-field="exchangeRate"]');
    const nominal = row.querySelector('[data-field="amount"]');
    const values = calculateInstrumentCurrencyFields({ amount: parseLocaleNumber(nominal.value) || 0, commercialAmount: parseLocaleNumber(commercial.value) || 0, exchangeRate: Number(rate.value) || 0, exchangeRateEmpty: rate.value === '', source, principal: row.dataset.exchangePrincipal });
    if (source) row.dataset.exchangePrincipal = values.principal;
    if (values.calculatedField) {
      const input = row.querySelector(`[data-field="${values.calculatedField}"]`);
      input.value = values.calculatedField === 'exchangeRate' ? values.exchangeRate : formatDecimal(values[values.calculatedField], 2);
      row.dataset.exchangeRateSource = values.calculatedField === 'exchangeRate' ? 'commercialAmount' : 'exchangeRate';
      if (values.calculatedField === 'amount') delete nominal.dataset.autoProposed;
    }
    const commercialLabel = row.querySelector('[data-instrument-field="commercialAmount"]'), rateLabel = row.querySelector('[data-instrument-field="exchangeRate"]');
    if (commercialLabel?.firstChild) commercialLabel.firstChild.textContent = `Importe aplicado (${commercialCurrency})`;
    if (rateLabel?.firstChild) rateLabel.firstChild.textContent = `TC (${currency}/${commercialCurrency})`;
    const suggestion = row.dataset.exchangeRateSuggestion ? `TC de factura sugerido: ${row.dataset.exchangeRateSuggestion} ${currency}/${commercialCurrency}. Editable; confirme el TC del pago. ` : '';
    if (summary) summary.textContent = suggestion + (values.roundingDifference == null ? 'Indique nominal e importe comercial o TC. Sin dato registrado no se propone una tasa.' : `Imputacion ${formatMoney(values.commercialAmount, commercialCurrency)} · diferencia de redondeo ${formatMoney(values.roundingDifference, currency)}. No genera una nota ni modifica la factura.`);
  }

  function instrumentApplicationPayload(row) {
    const currency = row.querySelector('[data-field="currency"]')?.value || selectedOrderCurrency();
    const commercialCurrency = selectedOrderCurrency();
    return { currency, ...(currency !== commercialCurrency ? {
      commercialCurrency, commercialAmount: parseLocaleNumber(row.querySelector('[data-field="commercialAmount"]')?.value) || 0,
      exchangeRate: Number(row.querySelector('[data-field="exchangeRate"]')?.value) || 0,
      exchangeRateDate: row.querySelector('[data-field="exchangeRateDate"]')?.value || '',
      exchangeRateReference: row.querySelector('[data-field="exchangeRateReference"]')?.value || '',
      exchangeRateSource: row.dataset.exchangeRateSource || 'commercialAmount'
    } : {}) };
  }

  function formInstruments() {
    return Array.from(document.querySelectorAll('.instrument-row')).filter((row) => !row.classList.contains('hidden')).map((row) => ({
      type: row.querySelector('[data-field="type"]').value,
      amount: parseLocaleNumber(row.querySelector('[data-field="amount"]').value || 0),
      scheduledDate: row.querySelector('[data-field="scheduledDate"]').value,
      status: row.querySelector('[data-field="status"]').value,
      deliveredDate: row.querySelector('[data-field="status"]').value === 'delivered' ? row.querySelector('[data-field="deliveredDate"]')?.value || '' : '',
      reference: row.querySelector('[data-field="reference"]').value,
      checkNumber: row.querySelector('[data-field="checkNumber"]')?.value || '',
      bankName: row.querySelector('[data-field="bankName"]')?.value || '',
      notes: row.querySelector('[data-field="notes"]')?.value || '',
      financialAccountId: row.querySelector('[data-field="financialAccountId"]')?.value || selectedFinancialAccount(selectedOrderCurrency()),
      ...instrumentApplicationPayload(row)
    })).filter((item) => item.amount > 0);
  }

  function formOrderWithholdings() {
    if (orderFormMode.mode === 'instrumentExisting') return formExistingOrderRetentions('collection');
    const date = valueFromInput('orderWithholdingDate') || valueFromInput('orderDate') || Core.todayIso();
    const reference = valueFromInput('orderWithholdingReference');
    return [
      ['withholding_income_tax', numberFromInput('orderWithholdingIncome') || 0],
      ['withholding_vat', numberFromInput('orderWithholdingVat') || 0],
      ['withholding_iibb', numberFromInput('orderWithholdingIibb') || 0]
    ].filter(([, amount]) => amount > 0).map(([taxType, amount]) => ({ taxType, amount, date, reference }));
  }

  function formPracticedWithholdings() {
    if (orderFormMode.mode === 'instrumentExisting') return formExistingOrderRetentions('payment');
    const date = valueFromInput('orderPracticedDate') || valueFromInput('orderDate') || Core.todayIso();
    const reference = valueFromInput('orderPracticedReference');
    return [
      ['withholding_income_tax', numberFromInput('orderPracticedIncome') || 0],
      ['withholding_vat', numberFromInput('orderPracticedVat') || 0],
      ['withholding_iibb', numberFromInput('orderPracticedIibb') || 0]
    ].filter(([, amount]) => amount > 0).map(([taxType, amount]) => ({ taxType, amount, date, reference }));
  }

  function formExistingOrderRetentions(orderType) {
    return Array.from(document.querySelectorAll('#orderExistingRetentionRows .order-retention-row')).map((row) => ({
      taxType: row.querySelector('[data-retention-field="taxType"]').value,
      amount: parseLocaleNumber(row.querySelector('[data-retention-field="amount"]').value || 0),
      date: row.querySelector('[data-retention-field="date"]').value,
      reference: row.querySelector('[data-retention-field="reference"]').value
    })).filter((item) => item.amount > 0 && orderType === valueFromInput('orderType'));
  }

  function addOrderRetentionRow() {
    const container = document.getElementById('orderExistingRetentionRows');
    if (!container || orderFormMode.mode !== 'instrumentExisting') return;
    const row = document.createElement('div');
    row.className = 'form-grid order-retention-row';
    row.innerHTML = `<label>Impuesto<select data-retention-field="taxType"><option value="withholding_income_tax">Ganancias</option><option value="withholding_vat">IVA</option><option value="withholding_iibb">IIBB</option></select></label><label>Importe<input data-retention-field="amount" data-money-input="true" inputmode="decimal" required></label><label>Fecha de retención<input data-retention-field="date" type="date" value="${valueFromInput('orderDate') || Core.todayIso()}" required></label><label>Referencia<input data-retention-field="reference" type="text"></label><button type="button" class="secondary" data-remove-retention="true">Quitar</button>`;
    container.appendChild(row);
    wireMoneyInputs(row);
    row.querySelector('[data-remove-retention]').addEventListener('click', () => { row.remove(); renderOrderSummary(); });
    row.querySelectorAll('input, select').forEach((input) => input.addEventListener('input', renderOrderSummary));
    renderOrderSummary();
  }

  function orderFormFinancialTotals(docs, instruments, withholdings, limit, existing = {}) {
    const cents = (amount) => Math.round(Number(amount || 0) * 100);
    const commercial = (item) => item.commercialCurrency && item.currency !== item.commercialCurrency ? item.commercialAmount : item.amount;
    const totalDocuments = docs.reduce((sum, item) => sum + cents(item.amountApplied), 0);
    const newInstrumented = instruments.reduce((sum, item) => sum + cents(commercial(item)), 0);
    const newWithheld = withholdings.reduce((sum, item) => sum + cents(item.amount), 0);
    const totalInstrumented = cents(existing.instrumented) + newInstrumented;
    const totalWithheld = cents(existing.withheld) + newWithheld;
    const totalSettled = cents(existing.settled) + instruments.filter(Core.instrumentIsBankRealized).reduce((sum, item) => sum + cents(commercial(item)), 0);
    return {
      totalDocuments: totalDocuments / 100,
      totalInstrumented: totalInstrumented / 100,
      totalWithheld: totalWithheld / 100,
      totalSettled: totalSettled / 100,
      totalCancelled: (totalInstrumented + totalWithheld) / 100,
      remaining: Math.max(cents(limit) - newInstrumented - newWithheld, 0) / 100,
      excess: Math.max(newInstrumented + newWithheld - cents(limit), 0) / 100
    };
  }

  function expandPracticedWithholdingsIfNeeded() {
    const panel = document.getElementById('orderPracticedPanel');
    if (panel && ['orderPracticedIncome', 'orderPracticedVat', 'orderPracticedIibb'].some((id) => (numberFromInput(id) || 0) > 0)) panel.open = true;
  }

  function renderOrderSummary() {
    const docs = selectedOrderDocuments();
    const withholdings = formOrderWithholdings();
    const practicedWithholdings = formPracticedWithholdings();
    expandPracticedWithholdingsIfNeeded();
    syncFiscalDisclosures(document.getElementById('orderForm'));
    const totalDocuments = docs.reduce((sum, item) => sum + item.amountApplied, 0);
    const totalWithheld = [...withholdings, ...practicedWithholdings].reduce((sum, item) => sum + item.amount, 0);
    const currency = state.documents.find((doc) => doc.id === docs[0]?.documentId)?.currency || 'ARS';
    const existingOrder = orderFormMode.mode === 'instrumentExisting' ? Core.orderBreakdown(state, orderFormMode.orderId) : null;
    const instrumentLimit = orderFormMode.mode === 'instrumentExisting'
      ? existingOrder?.notCoveredByInstrument || 0
      : totalDocuments;
    const activeRows = Array.from(document.querySelectorAll('.instrument-row:not(.hidden)'));
    activeRows.forEach((row) => { syncInstrumentApplicationFields(row); syncInstrumentAccountOptions(row); });
    const firstAmount = activeRows[0]?.querySelector('[data-field="amount"]');
    if (activeRows.length === 1 && firstAmount && !firstAmount.value && !firstAmount.dataset.amountTouched && instrumentLimit > totalWithheld) firstAmount.dataset.autoProposed = 'true';
    const selectedSummary = document.getElementById('orderDocumentsSelectedSummary');
    if (selectedSummary) selectedSummary.innerHTML = `<span>${docs.length} documento${docs.length === 1 ? '' : 's'} seleccionado${docs.length === 1 ? '' : 's'}</span><strong>TOTAL APLICADO: ${formatMoney(totalDocuments, currency)}</strong>`;
    const selectedCurrency = docs.length ? currency : '';
    document.querySelectorAll('#orderDocumentsList [data-doc-id]').forEach((checkbox) => {
      if (!checkbox.checked && !checkbox.readOnly) checkbox.disabled = Boolean(selectedCurrency && checkbox.dataset.docCurrency && checkbox.dataset.docCurrency !== selectedCurrency);
    });
    const autoAmount = document.querySelector('.instrument-row:not(.hidden) [data-field="amount"][data-auto-proposed="true"]');
    if (autoAmount && (!autoAmount.closest('.instrument-row')?.querySelector('[data-field="currency"]') || autoAmount.closest('.instrument-row').querySelector('[data-field="currency"]').value === currency)) {
      const otherInstrumented = activeRows
        .filter((row) => row.querySelector('[data-field="amount"]') !== autoAmount)
        .reduce((sum, row) => sum + Core.orderInstrumentCommercialAmount({ amount: parseLocaleNumber(row.querySelector('[data-field="amount"]').value) || 0, ...instrumentApplicationPayload(row) }), 0);
      const proposed = Math.max(Math.round((instrumentLimit - totalWithheld - otherInstrumented) * 100), 0) / 100;
      autoAmount.value = proposed > 0 ? new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(proposed) : '';
    }
    const instruments = formInstruments();
    const existing = existingOrder ? {
      instrumented: existingOrder.applied - existingOrder.notCoveredByInstrument - existingOrder.taxWithheld,
      withheld: existingOrder.taxWithheld,
      settled: existingOrder.paidOrCollected
    } : {};
    const totals = orderFormFinancialTotals(docs, instruments, [...withholdings, ...practicedWithholdings], instrumentLimit, existing);
    const { totalInstrumented, totalSettled, remaining } = totals;
    const addInstrument = document.getElementById('addInstrumentRow');
    if (addInstrument) addInstrument.disabled = remaining <= 0;
    document.getElementById('orderSummary').innerHTML = `
      <div><span>Total documentos seleccionados</span><strong>${formatMoney(totalDocuments, currency)}</strong></div>
      <div><span>${instruments.some((item) => item.currency !== currency) ? 'Instrumentado comercial' : 'Total instrumentado'}</span><strong>${formatMoney(totalInstrumented, currency)}</strong></div>
      <div><span>Retenciones ${valueFromInput('orderType') === 'collection' ? 'sufridas' : 'practicadas'}</span><strong>${formatMoney(totals.totalWithheld, currency)}</strong></div>
      <div><span>Total pagado/cobrado</span><strong>${formatMoney(totalSettled, currency)}</strong></div>
      <div><span>Total cancelado</span><strong>${formatMoney(totals.totalCancelled, currency)}</strong></div>
      <div><span>Saldo pendiente</span><strong>${formatMoney(remaining, currency)}</strong></div>
      ${totals.excess ? `<p class="money-warning">Los medios y retenciones exceden el saldo aplicable en ${formatMoney(totals.excess, currency)}.</p>` : ''}
      ${instruments.some((item) => item.currency !== currency && !(item.commercialAmount > 0 && item.exchangeRate > 0)) ? '<p class="money-warning">Defina el importe comercial o el tipo de cambio de cada medio multimoneda.</p>' : ''}
    `;
    return remaining;
  }

  function showDocumentAfterSaveActions(documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    const panel = document.getElementById('documentSaveConfirmation') || document.getElementById('documentAfterSaveActions');
    if (!doc || !panel) return;
    const isIncome = Core.documentDirection(doc, state) === 'in';
    const breakdown = Core.documentBreakdown(state, doc.id);
    hideDocumentFormPanel({ keepConfirmation: true });
    panel.classList.remove('hidden');
    panel.innerHTML = '';
    const summary = document.createElement('div');
    summary.className = 'save-confirmation-summary';
    summary.innerHTML = `<strong>Documento guardado</strong><span>${escapeHtml(documentDisplayLabel(doc))} · ${escapeHtml(Core.entityName(state, doc.entityId))} · ${formatMoney(doc.amount, doc.currency)} · saldo ${formatMoney(breakdown.nonInstrumented, doc.currency)}</span>`;
    const createOrder = document.createElement('button');
    createOrder.type = 'button';
    createOrder.textContent = isIncome ? 'Crear Orden de Cobro' : 'Crear Orden de Pago';
    createOrder.addEventListener('click', () => prepareOrderFromDocument(documentId));
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'secondary';
    close.textContent = 'Guardar y cerrar';
    close.addEventListener('click', () => {
      documentFormMode = { mode: 'create', lastSavedDocumentId: '' };
      panel.classList.add('hidden');
      panel.innerHTML = '';
    });
    const another = document.createElement('button');
    another.type = 'button';
    another.className = 'secondary';
    another.textContent = 'Cargar otro documento';
    another.addEventListener('click', () => showDocumentFormPanel());
    panel.append(summary, createOrder, close, another);
  }

  function showOrderDecisionFromDocument(documentId) {
    const context = documentOrderApplicationContext(documentId);
    if (!context) return;
    const { doc, assignments, continuable, free } = context;
    const orderCode = Core.documentDirection(doc, state) === 'in' ? 'OC' : 'OP';
    const panel = document.getElementById('orderFromFlowDecisionPanel');
    if (!panel) {
      startNewOrderFromDocument(documentId, free);
      return;
    }
    document.getElementById('orderFormPanel')?.classList.add('hidden');
    panel.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `${doc.number || doc.id} · ${Core.entityName(state, doc.entityId)}`;
    const summary = document.createElement('div');
    summary.className = 'order-decision-summary';
    [
      ['Saldo comercial pendiente', context.commercialPending],
      ['Ya asignado a OP/OC existente', context.assigned],
      ['Saldo libre para nueva OP/OC', context.free]
    ].forEach(([label, value]) => {
      const item = document.createElement('div');
      const small = document.createElement('span');
      small.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = formatMoney(value, doc.currency);
      item.append(small, strong);
      summary.appendChild(item);
    });
    panel.append(title, summary);

    if (assignments.length) {
      const listTitle = document.createElement('h4');
      listTitle.textContent = 'Órdenes existentes vinculadas';
      panel.appendChild(listTitle);
      const list = document.createElement('div');
      list.className = 'order-decision-list';
      assignments.forEach(({ link, order, orderBreakdown, settlement, withoutInstrument }) => {
        const row = document.createElement('div');
        row.className = 'order-decision-row';
        const main = document.createElement('div');
        main.innerHTML = `<strong>${orderDisplayCode(order)}</strong><span>${labelForType(order.type)} · aplicado ${formatMoney(link.amountApplied, link.currency || doc.currency)} · sin instrumento ${formatMoney(withoutInstrument, link.currency || doc.currency)} · instrumentado pendiente de banco ${formatMoney(settlement.financialPending, link.currency || doc.currency)} · estado ${labelForStatus(orderBreakdown?.status || '')}</span>`;
        const actions = [{ label: 'Ver orden', fn: () => openOrderDetail(order.id) }];
        if (withoutInstrument > 0.01 && orderBreakdown?.status === 'Pendiente') actions.unshift({ label: `Continuar ${orderDisplayCode(order)}`, fn: () => startInstrumentingOrder(order.id) });
        row.append(main, actionGroup(actions));
        list.appendChild(row);
      });
      panel.appendChild(list);
    }

    const actions = [];
    if (continuable.length && free > 0.01) {
      actions.push({ label: `Crear nueva ${orderCode} por ${formatMoney(free, doc.currency)}`, fn: () => startNewOrderFromDocument(documentId, free) });
    } else if (!continuable.length && free > 0.01) {
      actions.push({ label: `Crear ${orderCode} por ${formatMoney(free, doc.currency)}`, fn: () => startNewOrderFromDocument(documentId, free) });
    }
    actions.push({ label: 'Ver documento', fn: () => navigateTarget({ type: 'document', id: documentId }) });
    actions.push({ label: 'Cancelar', fn: hideOrderDecisionPanel });
    panel.appendChild(actionGroup(actions, 'order-decision-actions'));
    panel.classList.remove('hidden');
    document.querySelector('[data-view="operaciones"]')?.click();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function prepareOrderFromDocument(documentId) {
    const context = documentOrderApplicationContext(documentId);
    if (!context) return;
    if (context.continuable.length === 1 && context.free <= 0.01) {
      startInstrumentingOrder(context.continuable[0].order.id);
      return;
    }
    if (context.assigned > 0.01) {
      showOrderDecisionFromDocument(documentId);
      return;
    }
    startNewOrderFromDocument(documentId, context.free);
  }

  function startNewOrderFromDocument(documentId, amountToApply) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) return;
    const pending = Number(amountToApply || 0);
    if (pending <= 0.01) {
      alert('Este documento ya no tiene saldo aplicable para una nueva orden. Revisá las órdenes existentes vinculadas.');
      return;
    }
    showOrderFormPanel({ clean: true });
    orderFormMode = { mode: 'createFromSource', sourceDocumentId: documentId };
    document.getElementById('orderType').value = Core.documentDirection(doc, state) === 'in' ? 'collection' : 'payment';
    document.getElementById('orderWithholdingsPanel')?.classList.toggle('hidden', valueFromInput('orderType') !== 'collection');
    document.getElementById('orderPracticedPanel')?.classList.toggle('hidden', valueFromInput('orderType') !== 'payment');
    document.getElementById('orderEntitySearch').value = '';
    renderSelects();
    document.getElementById('orderEntity').value = doc.entityId;
    document.getElementById('orderDescription').value = doc.description || doc.number;
    document.getElementById('orderDate').value = Core.todayIso();
    document.querySelectorAll('.instrument-row').forEach((row) => {
      row.querySelector('[data-field="amount"]').value = '';
      row.querySelector('[data-field="reference"]').value = '';
      row.querySelector('[data-field="checkNumber"]').value = '';
      row.querySelector('[data-field="bankName"]').value = '';
    });
    renderOrderDocumentsList();
    const checkbox = document.querySelector(`#orderDocumentsList [data-doc-id="${documentId}"]`);
    const amount = document.querySelector(`#orderDocumentsList [data-doc-amount="${documentId}"]`);
    if (checkbox) checkbox.checked = true;
    if (amount) amount.value = pending;
    renderOrderSummary();
    document.querySelector('[data-view="operaciones"]')?.click();
    document.getElementById('orderFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startInstrumentingOrder(orderId) {
    const order = state.orders.find((item) => item.id === orderId && !item.voidedAt);
    const breakdown = Core.orderBreakdown(state, orderId);
    if (!order || !breakdown || breakdown.notCoveredByInstrument <= 0.01) return;
    const capacity = Core.orderInstrumentationCapacity(state, orderId);
    document.querySelector('[data-view="operaciones"]')?.click();
    showOrderFormPanel({ clean: true });
    orderFormMode = { mode: 'instrumentExisting', sourceDocumentId: '', orderId };
    document.getElementById('orderFormTitle').textContent = `${order.type === 'collection' ? 'Definir medio de cobro' : 'Definir medio de pago'} · ${orderDisplayCode(order)}`;
    document.getElementById('orderFormHelp').textContent = capacity.blockers.length
      ? `Revisar antes de guardar: ${capacity.blockers.join('; ')}.`
      : `Se agregarán medios a la orden existente. Saldo documental disponible: ${formatMoney(capacity.available, order.currency)}.`;
    document.getElementById('orderType').value = order.type;
    document.getElementById('orderWithholdingsPanel')?.classList.add('hidden');
    document.getElementById('orderPracticedPanel')?.classList.add('hidden');
    document.getElementById('orderExistingRetentionPanel')?.classList.remove('hidden');
    document.getElementById('orderEntitySearch').value = '';
    renderSelects();
    document.getElementById('orderEntity').value = order.entityId;
    document.getElementById('orderDescription').value = order.description || '';
    document.getElementById('orderDate').value = order.date;
    ['orderType', 'orderEntitySearch', 'orderEntity', 'quickCreateOrderEntity', 'orderDescription', 'orderDate'].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.disabled = true;
    });
    const links = state.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    document.getElementById('orderDocumentsList').innerHTML = links.map((link) => {
      const doc = state.documents.find((item) => item.id === link.documentId);
      return `<label class="selection-row"><input type="checkbox" data-doc-id="${link.documentId}" checked disabled><span>${doc?.number || link.documentId} · ${Core.entityName(state, order.entityId)}</span><input data-doc-amount="${link.documentId}" type="number" step="0.01" value="${link.amountApplied}" readonly></label>`;
    }).join('');
    document.querySelectorAll('.instrument-row').forEach((row) => row.classList.add('hidden'));
    const submit = document.querySelector('#orderForm button[type="submit"]');
    if (submit) submit.disabled = capacity.blockers.length > 0;
    if (submit) submit.textContent = order.type === 'collection' ? 'Guardar medio de cobro' : 'Guardar medio de pago';
    renderOrderSummary();
    document.getElementById('orderFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderTreasury() {
    renderFinancialProducts();
    renderTable('accountsTable', [
      { label: 'Cuenta', value: 'name', link: (row) => makeAccountLink(row.id) },
      { label: 'Moneda', value: 'currency' },
      { label: 'Saldo banco/caja real', value: (row) => formatMoney(row.realBalance, row.currency), className: () => 'amount' },
      { label: 'Proyeccion por cuenta', value: (row) => formatMoney(row.projectedBalance, row.currency), className: () => 'amount' }
    ], Core.accountBalances(state));

    const instrumentRows = filteredTreasuryInstruments();
    renderTable('instrumentsTable', [
      { label: 'Instrumento', value: (row) => instrumentDisplayName(row), link: (row) => ({ type: 'instrument', id: row.id }) },
      { label: 'Tipo', value: (row) => labelForType(row.type) },
      { label: 'Estado', value: (row) => Core.instrumentLinkedOnlyToInactiveOrders(state, row.id) && Core.instrumentIsPending(row) ? (Core.instrumentLinkedOnlyToVoidedOrders(state, row.id) ? 'Inactivo por orden anulada' : 'Inactivo: sin orden vigente') : labelForStatus(row.status) },
      { label: 'Fecha', value: (row) => formatDate(row.executedDate || row.scheduledDate) },
      { label: 'Orden', value: (row) => orderDisplayCode(state.orderInstruments.find((x) => x.instrumentId === row.id && !x.voidedAt)?.orderId), link: (row) => ({ type: 'order', id: state.orderInstruments.find((x) => x.instrumentId === row.id && !x.voidedAt)?.orderId }), minWidth: 120 },
      { label: 'Contraparte', value: (row) => Core.entityName(state, row.entityId), link: (row) => makeEntityLink(row.entityId) },
      { label: 'Cuenta/Cartera', value: (row) => Core.accountName(state, row.financialAccountId), link: (row) => makeAccountLink(row.financialAccountId) },
      { label: 'Ingresos', value: (row) => row.direction === 'in' ? formatMoney(row.amount, row.currency) : '', className: () => 'amount positive' },
      { label: 'Egresos', value: (row) => row.direction === 'out' ? formatMoney(row.amount, row.currency) : '', className: () => 'amount negative' },
      { label: 'Acciones', node: treasuryInstrumentActions, minWidth: 210 }
    ], instrumentRows);

    renderTable('realizedTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 120 },
      { label: 'Cuenta', value: 'accountName', link: (row) => makeAccountLink(row.financialAccountId), minWidth: 190 },
      { label: 'Contraparte', value: 'entityName', link: (row) => row.entityId ? makeEntityLink(row.entityId) : null, minWidth: 180 },
      { label: 'Movimiento', value: 'description', link: (row) => row.source === 'instrument' ? { type: 'instrument', id: row.id } : null, className: () => 'wrap', minWidth: 240 },
      { label: 'Ingresos', value: (row) => row.income ? formatMoney(row.income, row.currency) : '', className: () => 'amount positive', minWidth: 140 },
      { label: 'Egresos', value: (row) => row.expense ? formatMoney(row.expense, row.currency) : '', className: () => 'amount negative', minWidth: 140 }
    ], Core.financialMovementRows(state));
    renderReconciliation();
    renderChecksPortfolio();
    renderCurrentAccount();
  }

  function treasuryInstrumentActions(instrument) {
    const actions = [{ label: 'Ver', fn: () => openInstrumentDetail(instrument.id) }];
    if (instrument.voidedAt) return actionGroup(actions);
    if (Core.instrumentLinkedOnlyToInactiveOrders(state, instrument.id) && Core.instrumentIsPending(instrument)) {
      if (Core.instrumentLinkedOnlyToVoidedOrders(state, instrument.id)) actions.push({ label: 'Sanear', fn: () => repairInactiveOrderInstrument(instrument.id) });
      return actionGroup(actions);
    }
    const next = nextInstrumentAction(instrument);
    if (next) actions.push({ label: next.label, fn: () => transitionInstrumentTo(instrument.id, next.status) });
    if (instrument.type === 'received_check' && instrument.status === 'inPortfolio') {
      actions.push({ label: 'Depositar', fn: () => transitionInstrumentTo(instrument.id, 'deposited') });
      actions.push({ label: 'Endosar', fn: () => transitionInstrumentTo(instrument.id, 'endorsed') });
    }
    if (!['voided', 'cancelled', 'rejected', 'accredited', 'debited'].includes(instrument.status)) {
      actions.push({ label: 'Anular', fn: () => voidRecord('instrument', instrument.id) });
    }
    return actionGroup(actions);
  }

  function renderFinancialProducts() {
    const bankAccounts = (state.financialAccounts || []).filter((item) => item.active !== false && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account');
    const options = bankAccounts.map((item) => ({ value: item.id, label: `${item.name} · ${item.currency}` }));
    fillOptions('internalTransferFrom', options, valueFromInput('internalTransferFrom') || options[0]?.value || '');
    fillOptions('internalTransferTo', options, valueFromInput('internalTransferTo') || options[1]?.value || '');
    if (!valueFromInput('internalTransferDate')) document.getElementById('internalTransferDate').value = Core.todayIso();
    renderTable('financialProductsTable', [
      { label: 'Institucion', value: (row) => row.institutionName, minWidth: 180 },
      { label: 'Producto / Cuenta', value: (row) => row.name, link: (row) => makeAccountLink(row.id), minWidth: 220 },
      { label: 'Tipo', value: (row) => financialProductTypeLabel(row.productType), minWidth: 160 },
      { label: 'Moneda', value: 'currency', minWidth: 90 },
      { label: 'CBU/Alias', value: (row) => [row.cbu, row.alias].filter(Boolean).join(' / ') || '-', minWidth: 220 },
      { label: 'Emite cheques', value: (row) => row.productType === 'bank_account' ? (row.checkEnabled ? 'Si' : 'No') : '-', minWidth: 120 },
      { label: 'Imp. bancario', value: (row) => row.bankTaxTreatment || 'Sin configurar', minWidth: 120 },
      { label: 'Limite', value: (row) => row.creditLimit ? formatMoney(row.creditLimit, row.currency) : '-', className: () => 'amount', minWidth: 130 },
      { label: 'Estado', value: (row) => row.active === false ? 'Inactivo' : 'Activo', minWidth: 100 },
      { label: 'Notas', value: (row) => row.notes || '', className: () => 'wrap', minWidth: 220 },
      { label: 'Acciones', node: (row) => actionGroup([{ label: 'Editar datos', fn: () => editFinancialAccount(row.id) }]), minWidth: 110 }
    ], (state.financialAccounts || []).map((account) => ({
      ...account,
      institutionName: (state.financialInstitutions || []).find((item) => item.id === account.institutionId)?.name || account.bankName || 'Sin institucion'
    })));
  }

  async function editFinancialAccount(accountId) {
    const account = state.financialAccounts.find((item) => item.id === accountId);
    if (!account) return;
    await requestEditAction({
      title: 'Editar cuenta financiera',
      description: `Se conserva el ID ${account.id}, la moneda, el tipo y todos sus movimientos históricos.`,
      fields: [
        { name: 'name', label: 'Nombre visible', value: account.name, required: true },
        { name: 'institutionId', label: 'Institución', type: 'select', value: account.institutionId || '', options: [{ value: '', label: 'Sin institución' }, ...(state.financialInstitutions || []).map((item) => ({ value: item.id, label: item.name }))] },
        { name: 'bankName', label: 'Banco', value: account.bankName || '' },
        { name: 'alias', label: 'Alias', value: account.alias || '' },
        { name: 'notes', label: 'Descripción/notas', value: account.notes || '' },
        ...(account.type === 'cash' ? [] : [
          { name: 'bankTaxTreatment', label: 'Impuesto débito/crédito', type: 'select', value: account.bankTaxTreatment || 'exempt', options: [{ value: 'exempt', label: 'Exenta / sin cálculo automático' }, { value: 'taxable', label: 'Alcanzada' }, { value: 'differential', label: 'Tratamiento diferencial' }] },
          { name: 'bankTaxDebitRate', label: 'Alícuota débito (%)', type: 'number', value: account.bankTaxDebitRate ?? 0, min: 0, step: '0.001' },
          { name: 'bankTaxCreditRate', label: 'Alícuota crédito (%)', type: 'number', value: account.bankTaxCreditRate ?? 0, min: 0, step: '0.001' },
          { name: 'bankTaxEffectiveFrom', label: 'Vigencia desde', type: 'date', value: account.bankTaxEffectiveFrom || Core.todayIso() },
          { name: 'bankTaxInternalTransferExempt', label: 'Transferencia propia exenta', type: 'select', value: String(account.bankTaxInternalTransferExempt !== false), options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No, evaluar impuesto' }] }
        ]),
        { name: 'reason', label: 'Motivo', required: true }
      ],
      onSubmit: (values) => postTransaction({ action: 'updateFinancialAccount', id: account.id, changes: values })
    });
  }

  function filteredTreasuryInstruments() {
    const type = document.getElementById('treasuryInstrumentTypeFilter')?.value || '';
    const status = document.getElementById('treasuryInstrumentStatusFilter')?.value || '';
    const accountId = document.getElementById('treasuryInstrumentAccountFilter')?.value || '';
    const entityId = document.getElementById('treasuryInstrumentEntityFilter')?.value || '';
    const dateFrom = document.getElementById('treasuryInstrumentDateFrom')?.value || '';
    const dateTo = document.getElementById('treasuryInstrumentDateTo')?.value || '';
    const checkSearch = (document.getElementById('treasuryInstrumentCheckSearch')?.value || '').trim().toLowerCase();
    const textSearch = (document.getElementById('treasuryInstrumentTextSearch')?.value || '').trim().toLowerCase();
    return (state.instruments || [])
      .filter((item) => !type || (type === 'checks' ? item.type === 'own_check' || item.type === 'received_check' : item.type === type))
      .filter((item) => !status || item.status === status)
      .filter((item) => !accountId || item.financialAccountId === accountId)
      .filter((item) => !entityId || item.entityId === entityId)
      .filter((item) => !dateFrom || (item.executedDate || item.scheduledDate || '') >= dateFrom)
      .filter((item) => !dateTo || (item.executedDate || item.scheduledDate || '') <= dateTo)
      .filter((item) => !checkSearch || String(item.checkNumber || item.reference || '').toLowerCase().includes(checkSearch))
      .filter((item) => {
        if (!textSearch) return true;
        const orderCode = orderDisplayCode(state.orderInstruments.find((link) => link.instrumentId === item.id && !link.voidedAt)?.orderId).toLowerCase();
        return `${instrumentDisplayName(item)} ${item.reference || ''} ${item.notes || ''} ${orderCode}`.toLowerCase().includes(textSearch);
      });
  }

  function currentReconciliation() {
    return Core.financialReconciliation(state, {
      financialAccountId: document.getElementById('reconcileAccount')?.value,
      date: document.getElementById('reconcileDate')?.value || Core.todayIso(),
      reportedBalance: document.getElementById('reconcileReported')?.value || 0
    });
  }

  function renderReconciliation() {
    const container = document.getElementById('reconciliationSummary');
    if (!container || !document.getElementById('reconcileAccount')?.value) return;
    let reconciliation;
    try {
      reconciliation = currentReconciliation();
    } catch (error) {
      container.innerHTML = `<div class="summary-line"><span>Error</span><strong class="negative">${error.message}</strong></div>`;
      return;
    }
    container.innerHTML = [
      ['Cuenta', reconciliation.accountName],
      ['Saldo sistema', formatMoney(reconciliation.systemBalance, reconciliation.currency)],
      ['Saldo informado', formatMoney(reconciliation.reportedBalance, reconciliation.currency)],
      ['Diferencia', formatMoney(reconciliation.difference, reconciliation.currency)],
      ['Estado', reconciliation.reconciled ? 'Conciliada' : 'Diferencia pendiente']
    ].map(([label, value]) => `<div class="summary-line"><span>${label}</span><strong>${value}</strong></div>`).join('');
  }

  async function createReconciliationAdjustment() {
    let reconciliation;
    try {
      reconciliation = currentReconciliation();
    } catch (error) {
      alert(error.message);
      return;
    }
    if (reconciliation.reconciled) {
      alert('La diferencia es cero. No se crea ningun movimiento.');
      return;
    }
    const reason = document.getElementById('reconcileReason').value.trim();
    const notes = document.getElementById('reconcileNotes').value.trim();
    if (!reason) {
      alert('El motivo es obligatorio para registrar un ajuste de conciliacion.');
      return;
    }
    try {
      await postTransaction({
        action: 'createFinancialAdjustment',
        payload: {
          financialAccountId: reconciliation.financialAccountId,
          date: reconciliation.date,
          amount: reconciliation.difference,
          currency: reconciliation.currency,
          reason,
          notes
        }
      });
      renderReconciliation();
      ['reconcileReported', 'reconcileReason', 'reconcileNotes'].forEach((id) => { document.getElementById(id).value = ''; });
      document.getElementById('reconciliationEntry').open = false;
    } catch (error) {
      alert(error.message);
    }
  }

  function renderChecksPortfolio() {
    const type = document.getElementById('checkTypeFilter').value;
    const status = document.getElementById('checkStatusFilter').value;
    const bank = document.getElementById('checkBankFilter').value.trim().toLowerCase();
    const entityId = document.getElementById('checkEntityFilter').value;
    const dateFrom = document.getElementById('checkDateFrom').value;
    const dateTo = document.getElementById('checkDateTo').value;
    const due = document.getElementById('checkDueFilter').value;
    const currency = document.getElementById('checkCurrencyFilter').value;
    const checks = state.instruments
      .filter((item) => item.type === 'own_check' || item.type === 'received_check')
      .filter((item) => !type || item.type === type)
      .filter((item) => !status || item.status === status)
      .filter((item) => !bank || String(item.bankName || '').toLowerCase().includes(bank))
      .filter((item) => !entityId || item.entityId === entityId)
      .filter((item) => !currency || item.currency === currency)
      .filter((item) => !dateFrom || (item.executedDate || item.scheduledDate) >= dateFrom)
      .filter((item) => !dateTo || (item.executedDate || item.scheduledDate) <= dateTo)
      .filter((item) => !due || item.scheduledDate === due);
    renderTable('checksPortfolioTable', [
      { label: 'Cheque', value: (row) => row.checkNumber || row.reference || row.id, link: (row) => ({ type: 'instrument', id: row.id }), minWidth: 130 },
      { label: 'Tipo', value: (row) => labelForType(row.type), minWidth: 120 },
      { label: 'Estado', value: (row) => labelForStatus(row.status), minWidth: 120 },
      { label: 'Banco', value: 'bankName', minWidth: 150 },
      { label: 'Contraparte', value: (row) => Core.entityName(state, row.entityId), link: (row) => makeEntityLink(row.entityId), minWidth: 180 },
      { label: 'Fecha/vto', value: (row) => formatDate(row.scheduledDate), minWidth: 120 },
      { label: 'Importe', value: (row) => formatMoney(row.amount, row.currency), link: (row) => ({ type: 'instrument', id: row.id }), className: (row) => row.direction === 'out' ? 'amount negative' : 'amount positive', minWidth: 140 },
      { label: 'Orden madre', value: (row) => orderDisplayCode(state.orderInstruments.find((x) => x.instrumentId === row.id)?.orderId), link: (row) => ({ type: 'order', id: state.orderInstruments.find((x) => x.instrumentId === row.id)?.orderId }), minWidth: 140 }
    ], checks);
  }

  function renderCurrentAccount() {
    const rows = Core.currentAccountRows(state, {
      entityId: document.getElementById('ccEntityFilter').value,
      currency: document.getElementById('ccCurrencyFilter').value,
      status: document.getElementById('ccStatusFilter').value,
      dateFrom: document.getElementById('ccDateFrom').value,
      dateTo: document.getElementById('ccDateTo').value
    });
    renderTable('currentAccountTable', [
      { label: 'Fecha comercial', value: currentAccountDate, minWidth: 120 },
      { label: 'Tipo', value: currentAccountType, minWidth: 110 },
      { label: 'Referencia', value: currentAccountLabel, link: currentAccountTarget, minWidth: 170 },
      { label: 'Concepto', value: currentAccountConcept, minWidth: 200 },
      ...currentAccountAmountColumns(),
      { label: 'Estado', value: (row) => labelForStatus(row.status), minWidth: 130 },
      { label: 'Acción', node: currentAccountActions, minWidth: 100 }
    ], rows);
  }

  function currentAccountDate(row) {
    return row.dateUnknown ? 'Entrega sin fecha registrada' : formatDate(row.date);
  }

  function currentAccountAmountColumns() {
    return [
      { label: 'Aumenta deuda', value: (row) => row.debtChange > 0 ? formatMoney(row.debtChange, row.currency) : '', className: () => 'amount', minWidth: 130 },
      { label: 'Reduce deuda', value: (row) => row.debtChange < 0 ? formatMoney(-row.debtChange, row.currency) : '', className: () => 'amount', minWidth: 130 },
      { label: 'Saldo deuda', value: (row) => formatMoney(row.debtBalance, row.currency), className: () => 'amount', minWidth: 130 },
      { label: 'Aumenta credito', value: (row) => row.receivableChange > 0 ? formatMoney(row.receivableChange, row.currency) : '', className: () => 'amount', minWidth: 130 },
      { label: 'Reduce credito', value: (row) => row.receivableChange < 0 ? formatMoney(-row.receivableChange, row.currency) : '', className: () => 'amount', minWidth: 130 },
      { label: 'Saldo credito', value: (row) => formatMoney(row.receivableBalance, row.currency), className: () => 'amount', minWidth: 130 }
    ];
  }

  function currentAccountTarget(row) {
    if (['document', 'instrument', 'documentCompensation'].includes(row.source)) return { type: row.source, id: row.id };
    const withholding = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].find((item) => item.id === row.id);
    return withholding ? { type: 'order', id: withholding.orderId } : null;
  }

  function currentAccountType(row) {
    if (row.source === 'document') return 'Documento';
    if (row.source === 'instrument') return 'Pago/cobro';
    if (row.source === 'documentCompensation') return 'Compensación';
    return 'Retención';
  }

  function currentAccountLabel(row) {
    if (row.source === 'instrument') return instrumentDisplayName(row.id);
    if (row.source === 'documentCompensation') {
      const doc = state.documents.find((item) => item.id === row.documentId);
      const other = state.documents.find((item) => item.id === row.counterpartDocumentId);
      return `Comp. ${documentDisplayLabel(doc)} / ${documentDisplayLabel(other)}`;
    }
    if (row.source === 'document') return documentDisplayLabel(state.documents.find((item) => item.id === row.id));
    const withholding = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].find((item) => item.id === row.id);
    return withholding ? `${orderDisplayCode(withholding.orderId)} · ${Core.labelForTaxType(withholding.taxType)}` : 'Retención';
  }

  function currentAccountConcept(row) {
    if (row.source === 'document') return state.documents.find((item) => item.id === row.id)?.description || '';
    if (row.source === 'instrument') {
      const link = state.orderInstruments.find((item) => item.instrumentId === row.id && !item.voidedAt);
      const order = state.orders.find((item) => item.id === link?.orderId);
      return order?.description || state.instruments.find((item) => item.id === row.id)?.reference || '';
    }
    if (row.source === 'documentCompensation') return state.documentCompensations?.find((item) => item.id === row.id)?.reference || 'Cancelación entre documentos';
    return row.description || '';
  }

  function currentAccountActions(row) {
    const target = currentAccountTarget(row);
    if (!target) return document.createTextNode('');
    const editable = target.type === 'document' && !state.documents.find((item) => item.id === target.id)?.voidedAt
      || target.type === 'documentCompensation' && !(state.documentCompensations || []).find((item) => item.id === target.id)?.voidedAt
      || target.type === 'instrument' && !state.instruments.find((item) => item.id === target.id)?.voidedAt;
    return actionGroup([{ label: 'Ver', fn: () => navigateTarget(target) }, ...(editable ? [{ label: 'Editar', fn: () => {
      navigateTarget(target);
      if (target.type === 'document') openDocumentEditor(target.id, false);
      else if (target.type === 'documentCompensation') editDocumentCompensation(target.id);
      else {
        const form = document.getElementById('instrumentDetailBody')?.querySelector('.instrument-edit-form');
        form?.classList.remove('hidden');
        form?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } }] : [])]);
  }

  function grainMetricCards(cereal, campaign) {
    if (cereal) {
      const summary = Core.grainStockSummary(state, { cereal, campaign });
      return [
        metricCard('Stock total', `${formatKg(summary.totalKg)} kg`),
        metricCard('En campo', `${formatKg(summary.fieldKg)} kg`),
        metricCard('En acopios', `${formatKg(summary.elevatorKg)} kg`),
        metricCard('Deposito propio', `${formatKg(summary.storageKg)} kg`),
        metricCard('FWD pendiente', `${formatKg(summary.pendingForwardKg)} kg`),
        metricCard('Valuacion estimada', summary.referencePrice ? `${formatMoney(summary.estimatedValuation, summary.valuationCurrency)} (${formatMoney(summary.referencePrice.price, summary.referencePrice.currency)}/tn)` : 'Sin precio')
      ].join('');
    }
    const stockRows = Core.grainStockRows(state, { campaign });
    const cereals = [...new Set(stockRows.map((row) => row.cereal).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (!cereals.length) return metricCard('Stock por cereal', 'Sin stock');
    return cereals.map((item) => {
      const summary = Core.grainStockSummary(state, { cereal: item, campaign });
      return metricCard(`Stock ${item}`, `${formatKg(summary.totalKg)} kg`);
    }).join('');
  }

  function openGrainLocationDetail(target) {
    const locationFilter = document.getElementById('grainLocationFilter');
    const cerealFilter = document.getElementById('grainCerealFilter');
    const campaignFilter = document.getElementById('grainCampaignFilter');
    if (locationFilter) locationFilter.value = target.id || '';
    if (cerealFilter && target.cereal) cerealFilter.value = target.cereal;
    if (campaignFilter && target.campaign) campaignFilter.value = target.campaign;
    renderCereals();
    document.getElementById('grainHistoryTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCereals() {
    const cereal = document.getElementById('grainCerealFilter')?.value || '';
    const campaign = document.getElementById('grainCampaignFilter')?.value || '';
    const locationId = document.getElementById('grainLocationFilter')?.value || '';
    document.getElementById('grainCards').innerHTML = grainMetricCards(cereal, campaign);

    const stockRows = Core.grainStockRows(state, { cereal, campaign });
    renderTable('grainStockTable', [
      { label: 'Cereal', value: 'cereal', minWidth: 90 },
      { label: 'Campana', value: 'campaign', minWidth: 100 },
      { label: 'Lugar / Acopio', value: 'locationName', link: (row) => ({ type: 'grainLocationDetail', id: row.locationId, cereal: row.cereal, campaign: row.campaign }), minWidth: 260 },
      { label: 'Tipo', value: 'locationTypeLabel', minWidth: 110 },
      { label: 'Kg entrada', value: (row) => formatKg(row.kgIn), className: () => 'amount positive', minWidth: 130 },
      { label: 'Kg salida', value: (row) => formatKg(row.kgOut), className: () => 'amount negative', minWidth: 130 },
      { label: 'Kg saldo', value: (row) => formatKg(row.balanceKg), className: () => 'amount', minWidth: 130 }
    ], stockRows);

    const forwards = (state.grainForwards || [])
      .filter((forward) => !cereal || forward.cereal === cereal)
      .filter((forward) => !campaign || forward.campaign === campaign)
      .map((forward) => ({ ...forward, pendingKg: Core.grainForwardPendingKg(state, forward.id), liquidatedKg: Core.grainForwardLiquidatedKg(state, forward.id) }));
    renderTable('grainForwardTable', [
      { label: 'FWD', value: 'id', link: (row) => ({ type: 'grainForward', id: row.id }), minWidth: 130 },
      { label: 'Comprador', value: (row) => Core.entityName(state, row.buyerEntityId), link: (row) => makeEntityLink(row.buyerEntityId), minWidth: 200 },
      { label: 'Kg contrato', value: (row) => formatKg(row.contractedKg), className: () => 'amount', minWidth: 130 },
      { label: 'Kg liquidados', value: (row) => formatKg(row.liquidatedKg), className: () => 'amount', minWidth: 130 },
      { label: 'Kg pendientes', value: (row) => formatKg(row.pendingKg), className: () => 'amount', minWidth: 130 },
      { label: 'Precio', value: (row) => `${formatMoney(row.price, row.currency)}/tn`, className: () => 'amount', minWidth: 130 },
      { label: 'Importe estimado', value: (row) => formatMoney(row.estimatedAmount || (row.contractedKg / 1000) * row.price, row.currency), className: () => 'amount', minWidth: 150 },
      { label: 'Fecha estimada', value: (row) => formatDate(row.plannedLiquidationDate), minWidth: 130 }
    ], forwards);

    const historyLocation = locationId || '';
    const history = historyLocation ? Core.grainLocationHistory(state, { cereal, campaign, locationId: historyLocation }) : [];
    renderTable('grainHistoryTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 120 },
      { label: 'Cereal', value: 'cereal', minWidth: 90 },
      { label: 'Campana', value: 'campaign', minWidth: 100 },
      { label: 'Tipo', value: (row) => labelForType(row.type || row.movementType || row.direction), minWidth: 130 },
      { label: 'Kg entrada', value: (row) => row.kgIn ? formatKg(row.kgIn) : '', className: () => 'amount positive', minWidth: 130 },
      { label: 'Kg salida', value: (row) => row.kgOut ? formatKg(row.kgOut) : '', className: () => 'amount negative', minWidth: 130 },
      { label: 'Kg saldo', value: (row) => formatKg(row.balanceKg), className: () => 'amount', minWidth: 130 },
      { label: 'Documento/origen/referencia', value: 'referenceLabel', link: grainMovementReferenceLink, minWidth: 220 },
      { label: 'Descripcion', value: 'description', className: () => 'wrap', minWidth: 260 }
    ], history);

    const liquidationRows = (state.grainLiquidations || []).filter((row) => (!cereal || row.cereal === cereal) && (!campaign || row.campaign === campaign) && (!locationId || row.locationId === locationId));
    renderTable('grainLiquidationTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 120 },
      { label: 'Contraparte', value: (row) => Core.entityName(state, row.counterpartyEntityId), link: (row) => makeEntityLink(row.counterpartyEntityId), minWidth: 200 },
      { label: 'Cereal', value: 'cereal', minWidth: 90 },
      { label: 'Campana', value: 'campaign', minWidth: 100 },
      { label: 'Lugar / Acopio', value: (row) => Core.grainLocationName(state, row.locationId), link: (row) => ({ type: 'grainLocationDetail', id: row.locationId, cereal: row.cereal, campaign: row.campaign }), minWidth: 200 },
      { label: 'Kg', value: (row) => formatKg(row.kg), className: () => 'amount', minWidth: 110 },
      { label: 'Precio', value: (row) => `${formatMoney(row.settlementPrice || row.price || row.contractPrice || 0, row.currency)}/tn`, className: () => 'amount', minWidth: 130 },
      { label: 'Neto', value: (row) => formatMoney(grainLiquidationAmount(row, 'net'), row.currency), className: () => 'amount positive', minWidth: 130 },
      { label: 'IVA', value: (row) => formatMoney(grainLiquidationAmount(row, 'vat'), row.currency), className: () => 'amount positive', minWidth: 120 },
      { label: 'Comision/gastos', value: (row) => formatMoney(grainLiquidationAmount(row, 'expenses'), row.currency), className: () => 'amount negative', minWidth: 150 },
      { label: 'Retenciones', value: (row) => formatMoney(grainLiquidationAmount(row, 'withholdings'), row.currency), className: () => 'amount negative', minWidth: 140 },
      { label: 'Total a cobrar', value: (row) => formatMoney(grainLiquidationAmount(row, 'total'), row.currency), className: () => 'amount positive', minWidth: 150 },
      { label: 'Documento', value: grainLiquidationDocumentLabel, link: (row) => ({ type: 'document', id: row.documentId }), minWidth: 160 },
      { label: 'Acciones', node: (row) => actionGroup([{ label: 'Ver', fn: () => showTrace({ type: 'grainLiquidation', id: row.id }) }, { label: 'Corregir datos históricos', fn: () => editHistoricalGrainLiquidation(row.id) }]), minWidth: 185 }
    ], liquidationRows);
    addGrainLiquidationTotals(liquidationRows);
  }

  function grainMovementReferenceLink(row) {
    if (row.referenceType === 'document') return { type: 'document', id: row.referenceId };
    if (row.referenceType === 'order') return { type: 'order', id: row.referenceId };
    if (row.referenceType === 'grain_transfer') return { type: 'grainTransfer', id: row.referenceId };
    if (row.referenceType === 'grain_forward') return { type: 'grainForward', id: row.referenceId };
    return { type: 'grainMovement', id: row.id, row };
  }

  function renderLivestock() {
    const category = document.getElementById('livestockCategoryFilter')?.value || '';
    const herdId = document.getElementById('livestockHerdFilter')?.value || '';
    const locationId = document.getElementById('livestockLocationFilter')?.value || '';
    const summary = Core.livestockSummary(state, { category, herdId, locationId });
    const valuationText = Object.entries(summary.valuationByCurrency).map(([currency, amount]) => formatMoney(amount, currency)).join(' / ') || 'Sin precio/peso';
    document.getElementById('livestockCards').innerHTML = [
      metricCard('Cabezas totales', summary.totalHeads),
      metricCard('Kg vivos estimados', summary.liveWeightKg ? `${formatKg(summary.liveWeightKg)} kg` : 'Sin pesada'),
      metricCard('Valuacion estimada', valuationText),
      metricCard('Categorias', summary.byCategory.length)
    ].join('');

    renderTable('livestockStockTable', [
      { label: 'Categoria', value: 'category', minWidth: 120 },
      { label: 'Tropa', value: 'herdName', link: (row) => ({ type: 'livestockHerd', id: row.herdId, category: row.category, locationId: row.locationId }), minWidth: 200 },
      { label: 'Ubicacion', value: 'locationName', link: (row) => ({ type: 'livestockLocation', id: row.locationId }), minWidth: 180 },
      { label: 'Cabezas', value: (row) => row.balanceHeads, className: () => 'amount', minWidth: 110 },
      { label: 'Ultimo peso prom.', value: (row) => row.lastAverageWeightKg ? `${formatKg(row.lastAverageWeightKg)} kg` : 'Sin pesada', className: () => 'amount', minWidth: 150 },
      { label: 'Peso vivo estimado', value: (row) => row.liveWeightKg ? `${formatKg(row.liveWeightKg)} kg` : '', className: () => 'amount', minWidth: 160 },
      { label: 'Valuacion', value: (row) => row.estimatedValuation == null ? '' : formatMoney(row.estimatedValuation, row.valuationCurrency), className: () => 'amount', minWidth: 150 }
    ], summary.rows);

    renderTable('livestockCategoryTable', [
      { label: 'Categoria', value: 'category', minWidth: 140 },
      { label: 'Cabezas', value: 'heads', className: () => 'amount', minWidth: 120 }
    ], summary.byCategory);

    const historyHerd = herdId || summary.rows[0]?.herdId || '';
    const history = historyHerd ? Core.livestockMovementHistory(state, { herdId: historyHerd }) : [];
    renderTable('livestockHistoryTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 120 },
      { label: 'Movimiento', value: (row) => labelForType(`livestock_${row.movementType}`), minWidth: 160 },
      { label: 'Categoria', value: 'category' },
      { label: 'Estado', value: (row) => row.voidedAt ? 'Anulado' : 'Vigente' },
      { label: 'Referencia', value: 'referenceLabel', link: livestockMovementReferenceLink, minWidth: 180 },
      { label: 'Entradas cab', value: (row) => row.headsIn || '', className: () => 'amount positive', minWidth: 130 },
      { label: 'Salidas cab', value: (row) => row.headsOut || '', className: () => 'amount negative', minWidth: 130 },
      { label: 'Saldo cab', value: 'balanceHeads', className: () => 'amount', minWidth: 120 },
      { label: 'Observacion', value: 'description', className: () => 'wrap', minWidth: 260 }
    ], history);

    renderTable('livestockWeighingTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), link: (row) => ({ type: 'livestockWeighing', id: row.id, row }), minWidth: 120 },
      { label: 'Tropa', value: (row) => Core.livestockHerdName(state, row.herdId), link: (row) => ({ type: 'livestockHerd', id: row.herdId }), minWidth: 200 },
      { label: 'Cabezas pesadas', value: 'heads', className: () => 'amount', minWidth: 140 },
      { label: 'Kg totales', value: (row) => formatKg(row.totalKg), className: () => 'amount', minWidth: 130 },
      { label: 'Peso promedio', value: (row) => `${formatKg(row.averageWeightKg)} kg`, className: () => 'amount', minWidth: 140 },
      { label: 'Criterio', value: 'condition', className: () => 'wrap', minWidth: 180 }
    ], Core.livestockWeighingRows(state, { herdId: historyHerd, category }));
  }

  function livestockMovementReferenceLink(row) {
    if (row.referenceType === 'document') return { type: 'document', id: row.referenceId };
    if (row.movementType === 'category_change') return { type: 'livestockCategoryChange', id: row.referenceId };
    return { type: 'livestockMovement', id: row.referenceId || row.id, row };
  }

  function selectedOptionValue(id, fallback = '') {
    return document.getElementById(id)?.value || fallback;
  }

  function numberFromInput(id) {
    const value = document.getElementById(id)?.value;
    if (value == null || value === '') return null;
    const number = ['livestockOpCommissionPercent', 'livestockOpPriceKg'].includes(id) ? Number(value) : parseLocaleNumber(value);
    if (!Number.isFinite(number)) throw new Error(`${id}: valor numerico invalido`);
    return number;
  }

  function valueFromInput(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  function fillOptions(id, rows, selected = '') {
    const element = document.getElementById(id);
    if (!element) return;
    element.innerHTML = rows.map((row) => `<option value="${row.value}">${row.label}</option>`).join('');
    if (selected && rows.some((row) => row.value === selected)) element.value = selected;
  }

  function selectedFinancialAccount(currency) {
    const accounts = state?.financialAccounts || [];
    return accounts.find((account) => account.active !== false && account.currency === currency)?.id || accounts.find((account) => account.currency === currency)?.id || accounts[0]?.id || '';
  }

  function selectedOrderCurrency() {
    if (!state?.documents) return 'ARS';
    const docId = selectedOrderDocuments()[0]?.documentId;
    return state.documents.find((doc) => doc.id === docId)?.currency || 'ARS';
  }

  function financialAccountsForInstrument(type, currency) {
    const active = (state?.financialAccounts || []).filter((account) => account.active !== false && (!currency || account.currency === currency));
    if (type === 'cash') return active.filter((account) => account.type === 'cash' || /caja/i.test(account.name || ''));
    if (type === 'card_financing') return active.filter((account) => ['card_financing', 'credit_line'].includes(account.productType));
    if (type === 'bank_loan') return [];
    if (type === 'own_check') return active.filter((account) => (account.productType || 'bank_account') === 'bank_account' && account.type !== 'cash' && account.checkEnabled === true);
    if (type === 'transfer' || type === 'account_debit' || type === 'vep') return active.filter((account) => (account.productType || 'bank_account') === 'bank_account' && account.type !== 'cash');
    return active;
  }

  function financialProductTypeLabel(type) {
    return labelForType(type || 'bank_account');
  }

  function documentCommercialSide() {
    const explicit = valueFromInput('docCommercialSide');
    if (explicit) return explicit;
    return Core.inferredCommercialSide(valueFromInput('docType'));
  }

  function syncDocumentCommercialSide() {
    const select = document.getElementById('docCommercialSide');
    if (!select) return;
    const inferred = Core.inferredCommercialSide(valueFromInput('docType'));
    if (select.options?.[0]) select.options[0].textContent = inferred ? `Automático (${inferred === 'purchase' ? 'Compra' : 'Venta'})` : 'Automático (elegí Compra o Venta)';
    select.required = !inferred;
  }

  function chartOptionsForActivity(activity) {
    return (state.chartAccounts || []).filter((account) => account.active !== false && Core.chartAccountSupportsActivity(account, activity));
  }

  function numericInputValue(id) {
    const value = document.getElementById(id)?.value;
    if (value == null || value === '') return 0;
    const number = ['livestockOpCommissionPercent', 'livestockOpPriceKg'].includes(id) ? Number(value) : parseLocaleNumber(value);
    return Number.isFinite(number) ? number : 0;
  }

  function taxPayload(prefix, commercialSide = '') {
    const vatRateValue = valueFromInput(`${prefix}VatRate`);
    const netTaxedAmount = numberFromInput(`${prefix}NetTaxed`);
    const isPurchase = commercialSide === 'purchase';
    const perceptionVat = prefix === 'doc' ? numberFromInput('docPerceptionVat') || 0 : (isPurchase ? numberFromInput(`${prefix}WithholdingVat`) || 0 : 0);
    const perceptionIibb = prefix === 'doc' ? numberFromInput('docPerceptionIibb') || 0 : (isPurchase ? numberFromInput(`${prefix}WithholdingIibb`) || 0 : 0);
    const otherPerceptions = prefix === 'doc' ? numberFromInput('docOtherPerceptions') || 0 : 0;
    const vatAdjustment = numberFromInput(`${prefix}WithholdingVat`) || 0;
    const iibbAdjustment = numberFromInput(`${prefix}WithholdingIibb`) || 0;
    const incomeAdjustment = numberFromInput(`${prefix}WithholdingIncome`) || 0;
    const payload = {
      netTaxedAmount,
      amount: numberFromInput(`${prefix}TotalAmount`),
      vatAmount: numberFromInput(`${prefix}VatAmount`),
      exemptAmount: numberFromInput(`${prefix}ExemptAmount`) || 0,
      notTaxedAmount: numberFromInput(`${prefix}NotTaxedAmount`) || 0,
      commissionPercent: numberFromInput(`${prefix}CommissionPercent`),
      commissionVat: numberFromInput(`${prefix}CommissionVat`) || 0,
      adminExpenses: numberFromInput(`${prefix}AdminExpenses`) || 0,
      otherDeductions: isPurchase ? 0 : numberFromInput(`${prefix}OtherDeductions`) || 0,
      otherExpenses: isPurchase ? numberFromInput(`${prefix}OtherDeductions`) || 0 : 0,
      perceptionVat,
      perceptionIibb,
      otherPerceptions,
      perceptions: perceptionVat + perceptionIibb + otherPerceptions,
      withholdingVat: isPurchase ? 0 : vatAdjustment,
      withholdingIncomeTax: isPurchase ? 0 : incomeAdjustment,
      withholdingIibb: isPurchase ? 0 : iibbAdjustment,
      commissions: numberFromInput(`${prefix}Commissions`) || 0
    };
    if (vatRateValue === 'exempt') {
      payload.exemptAmount = netTaxedAmount || 0;
      payload.netTaxedAmount = null;
    } else if (vatRateValue === 'not_taxed') {
      payload.notTaxedAmount = netTaxedAmount || 0;
      payload.netTaxedAmount = null;
    }
    else if (vatRateValue !== '') payload.vatRate = Number(vatRateValue || 0);
    return payload;
  }

  function updateDocumentFiscalLabels() {
    const side = documentCommercialSide();
    const purchase = side === 'purchase';
    ['docFiscalVatLabel', 'docFiscalIibbLabel', 'docFiscalIncomeLabel', 'docRetentionGroupLabel'].forEach((id) => document.getElementById(id)?.classList.toggle('hidden', purchase));
    document.getElementById('docPurchaseRetentionHint')?.classList.toggle('hidden', !purchase);
    const otherLabel = document.getElementById('docOtherDeductionsLabel');
    if (otherLabel?.firstChild) otherLabel.firstChild.textContent = purchase ? 'Otros cargos' : 'Otras deducciones';
  }

  function updateDocumentBackingFields() {
    const status = valueFromInput('docFiscalStatus') || 'documented';
    const documented = status === 'documented';
    const number = document.getElementById('docNumber');
    const date = document.getElementById('docIssueDate');
    if (number) {
      number.required = documented;
      number.placeholder = documented ? 'Numero o referencia del comprobante' : 'Opcional hasta recibir comprobante';
    }
    if (date) date.required = true;
    const numberLabel = document.getElementById('docNumberLabel');
    const dateLabel = document.getElementById('docIssueDateLabel');
    if (numberLabel?.firstChild) numberLabel.firstChild.textContent = documented ? 'Numero ' : 'Numero (opcional) ';
    if (dateLabel?.firstChild) dateLabel.firstChild.textContent = documented ? 'Emision ' : 'Fecha de obligacion ';
  }

  function applyDocumentBackingDefault() {
    updateDocumentBackingFields();
    const status = valueFromInput('docFiscalStatus');
    if (status === 'no_receipt') {
      const total = numericInputValue('docTotalAmount') || numericInputValue('docNetTaxed');
      maybeSetInputValue('docNetTaxed', total);
      document.getElementById('docVatRate').value = '0';
      maybeSetInputValue('docVatAmount', 0);
      documentCalculationSource = 'net';
      documentVatManualOverride = false;
      updateDocumentCalculatedFields();
    }
  }

  function refreshDocumentChartOptions() {
    const select = document.getElementById('docChartAccount');
    if (!select) return;
    const current = select.value;
    const activity = valueFromInput('docActivity') || 'Agricultura';
    const options = chartOptionsForActivity(activity);
    fillOptions('docChartAccount', [{ value: '', label: 'Seleccionar cuenta' }, ...options.map((account) => ({ value: account.id, label: Core.chartPath(state, account.id) }))], options.some((account) => account.id === current) ? current : '');
    const financialButton = document.getElementById('completeFinancialChart');
    financialButton?.classList.toggle('hidden', activity !== 'Financiero');
    if (financialButton) financialButton.textContent = options.length ? 'Revisar cuentas financieras faltantes' : 'Habilitar cuentas financieras';
  }

  function syncDocumentAdditionalFields() {
    const ids = ['docPerceptionVat', 'docPerceptionIibb', 'docOtherPerceptions', 'docOtherDeductions', ...(documentCommercialSide() === 'purchase' ? [] : ['docWithholdingVat', 'docWithholdingIibb', 'docWithholdingIncome'])];
    const count = ids.filter((id) => numericInputValue(id) !== 0).length;
    const details = document.getElementById('docAdditionalFields');
    const summary = document.getElementById('docAdditionalFieldsSummary');
    if (summary) summary.textContent = `Percepciones, retenciones y cargos adicionales${count ? ` (${count})` : ''}`;
    if (details && count) details.open = true;
  }

  function moneyBreakdown(prefix) {
    const commercialSide = prefix === 'doc' ? documentCommercialSide() : '';
    const condition = prefix === 'doc' ? valueFromInput('docVatRate') : '';
    const net = ['exempt', 'not_taxed'].includes(condition) ? 0 : numericInputValue(`${prefix}NetTaxed`);
    const exempt = numericInputValue(`${prefix}ExemptAmount`) + numericInputValue(`${prefix}NotTaxedAmount`);
    const vat = numericInputValue(`${prefix}VatAmount`);
    const commissions = numericInputValue(`${prefix}Commissions`);
    const commissionVat = numericInputValue(`${prefix}CommissionVat`);
    const guides = numericInputValue(`${prefix}Guides`);
    const handling = numericInputValue(`${prefix}Handling`);
    const adminExpenses = numericInputValue(`${prefix}AdminExpenses`);
    const withholdingVat = commercialSide === 'purchase' ? 0 : numericInputValue(`${prefix}WithholdingVat`);
    const withholdingIncome = commercialSide === 'purchase' ? 0 : numericInputValue(`${prefix}WithholdingIncome`);
    const withholdingIibb = commercialSide === 'purchase' ? 0 : numericInputValue(`${prefix}WithholdingIibb`);
    const perceptions = prefix === 'doc' ? numericInputValue('docPerceptionVat') + numericInputValue('docPerceptionIibb') + numericInputValue('docOtherPerceptions') : 0;
    const purchaseAdditions = commercialSide === 'purchase' ? perceptions + numericInputValue(`${prefix}OtherDeductions`) : perceptions;
    const other = numericInputValue(`${prefix}OtherDeductions`);
    const deductions = commissions + commissionVat + guides + handling + adminExpenses + withholdingVat + withholdingIncome + withholdingIibb + other;
    return {
      net,
      exempt,
      vat,
      commissions,
      commissionVat,
      guides,
      handling,
      adminExpenses,
      withholdingVat,
      withholdingIncome,
      withholdingIibb,
      other,
      deductions,
      purchaseAdditions,
      total: commercialSide === 'purchase' ? net + exempt + vat + purchaseAdditions : net + exempt + vat + purchaseAdditions - deductions
    };
  }

  function renderMoneySummary(prefix, currency, totalLabel = 'TOTAL') {
    if (prefix === 'livestockOp') {
      renderLivestockMoneySummary(currency, totalLabel);
      return;
    }
    const target = document.getElementById(`${prefix}MoneySummary`);
    if (!target) return;
    const b = moneyBreakdown(prefix);
    const manualTotal = numericInputValue(`${prefix}TotalAmount`);
    const totalDiffers = manualTotal > 0 && Math.abs(manualTotal - b.total) > 0.01;
    target.innerHTML = `
      <div><span>Neto</span><strong>${formatMoney(b.net, currency)}</strong></div>
      ${b.exempt ? `<div><span>Exento/no gravado</span><strong>${formatMoney(b.exempt, currency)}</strong></div>` : ''}
      <div><span>IVA</span><strong class="positive">${formatMoney(b.vat, currency)}</strong></div>
      ${b.purchaseAdditions ? `<div><span>Percepciones/cargos</span><strong class="positive">${formatMoney(b.purchaseAdditions, currency)}</strong></div>` : ''}
      <div><span>Comisiones/gastos</span><strong class="negative">${b.commissions + b.commissionVat + b.guides + b.handling + b.adminExpenses + (prefix === 'doc' && documentCommercialSide() === 'purchase' ? 0 : b.other) > 0 ? '-' : ''}${formatMoney(b.commissions + b.commissionVat + b.guides + b.handling + b.adminExpenses + (prefix === 'doc' && documentCommercialSide() === 'purchase' ? 0 : b.other), currency)}</strong></div>
      <div><span>Retenciones</span><strong class="negative">${b.withholdingVat + b.withholdingIncome + b.withholdingIibb > 0 ? '-' : ''}${formatMoney(b.withholdingVat + b.withholdingIncome + b.withholdingIibb, currency)}</strong></div>
      <div><span>${totalLabel}</span><strong>${formatMoney(manualTotal || b.total, currency)}</strong></div>
      ${totalDiffers ? `<p class="money-warning">El total manual difiere del calculado (${formatMoney(b.total, currency)}). Revisar componentes.</p>` : ''}
    `;
  }

  function livestockTradeFinancialPayload() {
    return {
      ...taxPayload('livestockOp'),
      type: valueFromInput('livestockOperationMode'),
      totalKg: numericInputValue('livestockOpTotalKg'),
      pricePerKg: numericInputValue('livestockOpPriceKg'),
      guides: numericInputValue('livestockOpGuides'),
      controlDelivery: numericInputValue('livestockOpHandling'),
      otherExpenses: numericInputValue('livestockOpOtherExpenses')
    };
  }

  function renderLivestockMoneySummary(currency, totalLabel) {
    const target = document.getElementById('livestockOpMoneySummary');
    if (!target) return;
    const breakdown = Core.calculateLivestockTradeBreakdown(livestockTradeFinancialPayload());
    const manualTotal = numericInputValue('livestockOpTotalAmount');
    const labels = { net_taxed: 'Valor hacienda', commission: 'Comisión', commission_vat: 'IVA comisión', guide_fee: 'Guías / SENASA', control_delivery: 'Control / entrega / baño', other: 'Otros gastos / deducciones' };
    const rows = breakdown.taxComponents.filter((item) => Number(item.amount || 0) !== 0).map((item) => {
      const negative = item.effect === 'subtract';
      const label = item.taxType === 'other' ? (item.notes || labels.other) : (labels[item.taxType] || Core.labelForTaxType(item.taxType));
      return `<div><span>${escapeHtml(label)}</span><strong class="${negative ? 'negative' : 'positive'}">${negative ? '-' : '+'}${formatMoney(item.amount, currency)}</strong></div>`;
    });
    rows.push(`<div><span>${escapeHtml(totalLabel)}</span><strong>${formatMoney(manualTotal || breakdown.amount, currency)}</strong></div>`);
    if (manualTotal > 0 && Math.abs(manualTotal - breakdown.amount) > 0.01) rows.push(`<p class="money-warning">El total informado no reconcilia con los componentes (${formatMoney(breakdown.amount, currency)}). Ajustá los componentes antes de guardar.</p>`);
    target.innerHTML = rows.join('');
  }

  function documentForGrainLiquidation(row) {
    return (state.documents || []).find((doc) => doc.id === row.documentId);
  }

  function taxSumFromComponents(components, types) {
    const selected = new Set(types);
    return (components || [])
      .filter((component) => selected.has(component.taxType || component.type))
      .reduce((sum, component) => sum + Number(component.amount || 0), 0);
  }

  function grainLiquidationAmount(row, key) {
    const doc = documentForGrainLiquidation(row);
    if (key === 'net') return Number(row.netTaxedAmount ?? doc?.economicAmount ?? row.amount ?? row.estimatedAmount ?? 0);
    if (key === 'vat') return Number(row.vatAmount || 0) || taxSumFromComponents(doc?.taxComponents, ['vat']);
    if (key === 'expenses') {
      return ['commissions', 'commissionVat', 'adminExpenses', 'stampTax', 'laboratoryFees', 'guides', 'senasa', 'controlDelivery', 'bath', 'otherDeductions']
        .reduce((sum, field) => sum + Number(row[field] || 0), 0)
        || taxSumFromComponents(doc?.taxComponents, ['commission', 'commission_vat', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee', 'other']);
    }
    if (key === 'withholdings') {
      return Number(row.withholdingVat || 0) + Number(row.withholdingIncomeTax || 0) + Number(row.withholdingIibb || 0)
        || taxSumFromComponents(doc?.taxComponents, ['withholding_vat', 'withholding_income_tax', 'withholding_iibb']);
    }
    if (key === 'total') return Number(row.totalAmount ?? doc?.amount ?? row.amount ?? 0);
    return 0;
  }

  async function editHistoricalGrainLiquidation(id) {
    const liquidation = (state.grainLiquidations || []).find((item) => item.id === id);
    const doc = liquidation && state.documents.find((item) => item.id === liquidation.documentId);
    if (!liquidation || !doc) return;
    const numericFields = [
      ['netTaxedAmount', 'Neto / importe base'], ['vatAmount', 'Importe IVA'],
      ['commissionPercent', 'Comisión %'], ['commissions', 'Comisión'], ['commissionVat', 'IVA sobre comisión'],
      ['withholdingVat', 'Retención IVA'], ['withholdingIncomeTax', 'Retención Ganancias'], ['withholdingIibb', 'Retención IIBB'],
      ['otherDeductions', 'Otros gastos/deducciones'], ['otherExpenses', 'Otros cargos']
    ];
    const extraFields = [
      ['adminExpenses', 'Gastos administrativos'], ['stampTax', 'Sellados'], ['laboratoryFees', 'Laboratorio'],
      ['guides', 'Guías'], ['senasa', 'SENASA'], ['controlDelivery', 'Control/entrega'], ['bath', 'Baño'],
      ['perceptionVat', 'Percepción IVA'], ['perceptionIibb', 'Percepción IIBB']
    ].filter(([field]) => Number(liquidation[field] || 0) !== 0);
    const condition = doc.taxComponents?.some((item) => item.taxType === 'exempt') ? 'exempt'
      : doc.taxComponents?.some((item) => item.taxType === 'not_taxed') ? 'not_taxed'
        : liquidation.vatRate == null ? '' : String(liquidation.vatRate);
    const fields = [
      { name: 'netTaxedAmount', label: 'Neto / importe base', value: liquidation.netTaxedAmount ?? doc.economicAmount, money: true, required: true },
      { name: 'vatCondition', label: 'Condición / alícuota IVA', type: 'select', value: condition, options: [
        { value: '', label: 'Sin IVA automático' }, { value: '21', label: '21%' }, { value: '10.5', label: '10,5%' },
        { value: '0', label: '0%' }, { value: 'exempt', label: 'Exento' }, { value: 'not_taxed', label: 'No gravado' }
      ] },
      ...numericFields.slice(1).concat(extraFields).map(([name, label]) => ({ name, label, value: liquidation[name] ?? 0, money: true })),
      { name: 'commissionVatRate', label: 'IVA sobre comisión %', type: 'select', value: (() => {
        const rate = Number(liquidation.commissions) ? Math.round(Number(liquidation.commissionVat || 0) / Number(liquidation.commissions) * 10) / 10 : 0;
        return [0, 10.5, 21].includes(rate) ? String(rate) : 'manual';
      })(), options: [{ value: '0', label: '0%' }, { value: '10.5', label: '10,5%' }, { value: '21', label: '21%' }, { value: 'manual', label: 'Manual' }] },
      { name: 'reason', label: 'Motivo de la corrección', required: true }
    ];
    const pending = requestEditAction({ title: 'Corregir datos históricos · liquidación de cereal', description: 'No modifica kilos ni stock.', fields, submitLabel: 'Guardar corrección', onSubmit: async (values) => {
      const changes = Object.fromEntries([...numericFields, ...extraFields].map(([name]) => [name, parseLocaleNumber(values[name] || 0)]));
      changes.vatCondition = values.vatCondition;
      changes.totalAmount = Number(values.totalAmount);
      changes.reason = values.reason;
      await postTransaction({ action: 'correctHistoricalGrainLiquidation', id, changes });
    } });
    const container = document.getElementById('editActionFields');
    const preview = document.createElement('div');
    preview.className = 'liquidation-preview';
    preview.setAttribute('aria-live', 'polite');
    container.appendChild(preview);
    const hiddenTotal = document.createElement('input');
    hiddenTotal.type = 'hidden';
    hiddenTotal.name = 'totalAmount';
    container.appendChild(hiddenTotal);
    let vatTouched = false;
    let commissionSource = 'commissionPercent';
    let commissionVatTouched = false;
    const input = (name) => container.querySelector(`[name="${name}"]`);
    const amount = (name) => Math.round((parseLocaleNumber(input(name)?.value || 0) || 0) * 100);
    const updatePreview = (event) => {
      if (event?.target?.name === 'vatAmount') vatTouched = true;
      if (['netTaxedAmount', 'vatCondition'].includes(event?.target?.name)) vatTouched = false;
      if (event?.target?.name === 'commissionPercent' || event?.target?.name === 'commissions') commissionSource = event.target.name;
      if (event?.target?.name === 'commissionVat') commissionVatTouched = true;
      if (event?.target?.name === 'commissionVatRate') commissionVatTouched = false;
      const net = amount('netTaxedAmount');
      if (event && ['netTaxedAmount', 'commissionPercent', 'commissions'].includes(event.target?.name)) {
        if (commissionSource === 'commissionPercent') input('commissions').value = (Math.round(net * (parseLocaleNumber(input('commissionPercent').value) || 0) / 100) / 100).toFixed(2);
        else input('commissionPercent').value = net ? (Math.round(amount('commissions') / net * 10000) / 100).toFixed(2) : '0.00';
      }
      const commissionRate = input('commissionVatRate').value;
      if (event && !commissionVatTouched && commissionRate !== 'manual' && ['commissions', 'commissionPercent', 'netTaxedAmount', 'commissionVatRate'].includes(event.target?.name)) input('commissionVat').value = (Math.round(amount('commissions') * Number(commissionRate) / 100) / 100).toFixed(2);
      const rate = input('vatCondition').value;
      if (!vatTouched && ['netTaxedAmount', 'vatCondition'].includes(event?.target?.name) && ['0', '10.5', '21', 'exempt', 'not_taxed'].includes(rate)) {
        const vat = ['exempt', 'not_taxed'].includes(rate) ? 0 : Math.round(amount('netTaxedAmount') * Number(rate) / 100);
        input('vatAmount').value = (vat / 100).toFixed(2);
      }
      const additions = amount('otherExpenses') + (input('perceptionVat') ? amount('perceptionVat') : 0) + (input('perceptionIibb') ? amount('perceptionIibb') : 0);
      const deductions = ['commissions', 'commissionVat', 'withholdingVat', 'withholdingIncomeTax', 'withholdingIibb', 'otherDeductions', 'adminExpenses', 'stampTax', 'laboratoryFees', 'guides', 'senasa', 'controlDelivery', 'bath']
        .reduce((sum, field) => sum + (input(field) ? amount(field) : 0), 0);
      const vat = amount('vatAmount');
      const total = net + vat + additions - deductions;
      hiddenTotal.value = (total / 100).toFixed(2);
      preview.innerHTML = `<span>OPERACIÓN C/IVA</span><strong>${formatMoney((net + vat + additions) / 100, doc.currency)}</strong><span>DEDUCCIONES</span><strong>${formatMoney(deductions / 100, doc.currency)}</strong><span>TOTAL A COBRAR</span><strong>${formatMoney(total / 100, doc.currency)}</strong>`;
    };
    container.addEventListener('input', updatePreview);
    container.addEventListener('change', updatePreview);
    updatePreview();
    await pending;
    container.removeEventListener('input', updatePreview);
    container.removeEventListener('change', updatePreview);
  }

  function grainLiquidationDocumentLabel(row) {
    const doc = documentForGrainLiquidation(row);
    const label = doc?.number || row.documentNumber || row.number || row.documentId || '';
    return label === true || label === 'true' ? (row.number || row.documentId || '') : label;
  }

  function addGrainLiquidationTotals(rows) {
    const table = document.getElementById('grainLiquidationTable');
    if (!table) return;
    const totals = new Map();
    rows.forEach((row) => {
      const currency = row.currency || documentForGrainLiquidation(row)?.currency || 'ARS';
      const current = totals.get(currency) || { kg: 0, net: 0, vat: 0, expenses: 0, withholdings: 0, total: 0 };
      current.kg += Number(row.kg || 0);
      current.net += grainLiquidationAmount(row, 'net');
      current.vat += grainLiquidationAmount(row, 'vat');
      current.expenses += grainLiquidationAmount(row, 'expenses');
      current.withholdings += grainLiquidationAmount(row, 'withholdings');
      current.total += grainLiquidationAmount(row, 'total');
      totals.set(currency, current);
    });
    const foot = table.createTFoot();
    for (const [currency, total] of totals.entries()) {
      const tr = foot.insertRow();
      tr.className = 'table-total-row';
      ['TOTAL', currency, '', '', '', ''].forEach((text) => { tr.insertCell().textContent = text; });
      const kg = tr.insertCell();
      kg.className = 'amount';
      kg.textContent = formatKg(total.kg);
      tr.insertCell().textContent = '';
      [['positive', total.net], ['positive', total.vat], ['negative', total.expenses], ['negative', total.withholdings], ['positive', total.total]].forEach(([kind, value]) => {
        const td = tr.insertCell();
        td.className = `amount ${kind}`;
        td.textContent = formatMoney(value, currency);
      });
      tr.insertCell().textContent = '';
    }
  }

  function setModeVisibility(attribute, mode) {
    document.querySelectorAll(`[${attribute}]`).forEach((element) => {
      const modes = String(element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean);
      element.classList.toggle('hidden', !modes.includes(mode));
    });
  }

  function setCalculatedText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function maybeSetInputValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    const rounded = Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
    element.value = rounded == null ? '' : element.dataset.moneyWired === 'true' ? new Intl.NumberFormat('es-AR', { minimumFractionDigits: id.startsWith('doc') ? 2 : 0, maximumFractionDigits: 2 }).format(rounded) : String(rounded);
  }

  function grainEstimatedAmount() {
    const kg = numberFromInput('grainOpKg') || 0;
    const price = numberFromInput('grainOpPrice') || 0;
    return kg > 0 && price > 0 ? (kg / 1000) * price : 0;
  }

  function updateGrainCalculatedFields({ writeNetTaxed = false, economicInputChanged = false } = {}) {
    syncFiscalDisclosures(document.getElementById('grainOperationForm'));
    const mode = valueFromInput('grainOperationMode');
    const amount = grainEstimatedAmount();
    const currency = valueFromInput('grainOpCurrency') || 'ARS';
    const label = mode === 'forward' ? 'Importe contractual estimado' : 'Calculado';
    setCalculatedText('grainOpCalculatedAmount', amount ? `${label}: ${formatMoney(amount, currency)}` : `${label}: -`);
    if (economicInputChanged) {
      grainNetManualOverride = false;
      grainCommissionManualOverride = false;
      grainCommissionVatManualOverride = false;
      grainTotalManualOverride = false;
    }
    if (writeNetTaxed && !grainNetManualOverride && ['liquidation', 'forward', 'barter'].includes(mode)) maybeSetInputValue('grainOpNetTaxed', amount);
    const net = numericInputValue('grainOpNetTaxed');
    const vatRate = valueFromInput('grainOpVatRate');
    if (!grainVatManualOverride && vatRate && !['exempt', 'not_taxed'].includes(vatRate)) maybeSetInputValue('grainOpVatAmount', net * Number(vatRate || 0) / 100);
    const pct = numericInputValue('grainOpCommissionPercent');
    if (!grainCommissionManualOverride && pct) maybeSetInputValue('grainOpCommissions', net * pct / 100);
    if (!grainCommissionVatManualOverride && numericInputValue('grainOpCommissions')) maybeSetInputValue('grainOpCommissionVat', numericInputValue('grainOpCommissions') * 0.21);
    const summary = moneyBreakdown('grainOp');
    if (!grainTotalManualOverride && ['liquidation', 'forward', 'barter'].includes(mode)) maybeSetInputValue('grainOpTotalAmount', summary.total);
    renderMoneySummary('grainOp', currency, mode === 'barter' ? 'TOTAL A CANCELAR' : 'TOTAL A COBRAR');
  }

  function livestockEstimatedAmount() {
    const totalKg = numberFromInput('livestockOpTotalKg') || 0;
    const pricePerKg = numberFromInput('livestockOpPriceKg') || 0;
    return totalKg > 0 && pricePerKg > 0 ? totalKg * pricePerKg : 0;
  }

  function updateLivestockCalculatedFields({ writeNetTaxed = false, economicInputChanged = false, source = '' } = {}) {
    const heads = numberFromInput('livestockOpHeads') || 0;
    const totalKg = numberFromInput('livestockOpTotalKg') || 0;
    const currency = valueFromInput('livestockOpCurrency') || 'ARS';
    if (source === 'net') livestockNetManualOverride = true;
    else if (source === 'price' || (economicInputChanged && !source)) livestockNetManualOverride = false;
    if (economicInputChanged) {
      livestockCommissionVatManualOverride = false;
      livestockTotalManualOverride = false;
    }
    if (writeNetTaxed && ['purchase', 'sale'].includes(valueFromInput('livestockOperationMode'))) {
      if (livestockNetManualOverride) {
        // Keep the entered net authoritative; never feed a rounded unit price back into it.
        const price = document.getElementById('livestockOpPriceKg');
        const net = numericInputValue('livestockOpNetTaxed');
        if (price && totalKg > 0) price.value = net > 0 ? String(net / totalKg) : '';
      } else maybeSetInputValue('livestockOpNetTaxed', livestockEstimatedAmount());
    }
    const amount = livestockEstimatedAmount();
    setCalculatedText('livestockOpKgPerHead', heads > 0 && totalKg > 0 ? `Kg/cabeza: ${formatDecimal(totalKg / heads, 2)} kg` : 'Kg/cabeza: -');
    setCalculatedText('livestockOpCalculatedAmount', amount ? `Calculado: ${formatMoney(amount, currency)}` : 'Calculado: -');
    const net = numericInputValue('livestockOpNetTaxed');
    const vatRate = valueFromInput('livestockOpVatRate');
    if (!livestockVatManualOverride && vatRate && !['exempt', 'not_taxed'].includes(vatRate)) maybeSetInputValue('livestockOpVatAmount', net * Number(vatRate || 0) / 100);
    const pct = numericInputValue('livestockOpCommissionPercent');
    if (livestockCommissionManualOverride) {
      // The displayed percentage is informational: never feed its rounding back into the amount.
      const percent = document.getElementById('livestockOpCommissionPercent');
      if (percent) percent.value = net > 0 ? (numericInputValue('livestockOpCommissions') / net * 100).toFixed(6) : '';
    } else maybeSetInputValue('livestockOpCommissions', net * pct / 100);
    const commissionVatRate = valueFromInput('livestockOpCommissionVatRate') || '21';
    if (!livestockCommissionVatManualOverride && commissionVatRate !== 'manual') maybeSetInputValue('livestockOpCommissionVat', numericInputValue('livestockOpCommissions') * Number(commissionVatRate) / 100);
    syncFiscalDisclosures(document.getElementById('livestockOperationForm'));
    const summary = Core.calculateLivestockTradeBreakdown(livestockTradeFinancialPayload());
    if (!livestockTotalManualOverride && ['purchase', 'sale'].includes(valueFromInput('livestockOperationMode'))) maybeSetInputValue('livestockOpTotalAmount', summary.amount);
    renderMoneySummary('livestockOp', currency, valueFromInput('livestockOperationMode') === 'purchase' ? 'TOTAL A PAGAR' : 'TOTAL A COBRAR');
    updateLivestockWeightsSummary();
  }

  function invoiceRateInputValue(value) {
    const rate = parseLocaleNumber(value);
    if (rate == null) return null;
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('TC de factura invalido: debe ser mayor que cero');
    return rate;
  }

  function documentInvoiceRatePayload(currency, value) {
    if (currency !== 'USD') return {};
    const rate = invoiceRateInputValue(value);
    return rate == null ? {} : { tcInvoice: rate };
  }

  function syncDocumentInvoiceRateField() {
    const visible = valueFromInput('docCurrency') === 'USD';
    document.getElementById('docInvoiceRateField')?.classList.toggle('hidden', !visible);
    const input = document.getElementById('docInvoiceRate');
    if (input) input.disabled = !visible;
  }

  function updateDocumentCalculatedFields() {
    syncDocumentInvoiceRateField();
    const currency = valueFromInput('docCurrency') || 'ARS';
    const vatRate = valueFromInput('docVatRate');
    const fiscalRate = ['exempt', 'not_taxed'].includes(vatRate) ? 0 : Number(vatRate || 0);
    maybeSetInputValue('docExemptAmount', 0);
    maybeSetInputValue('docNotTaxedAmount', 0);
    if (documentCalculationSource === 'total') {
      const before = moneyBreakdown('doc');
      const fixed = Math.round((before.total - before.net - before.vat) * 100) / 100;
      const gross = Math.round((numericInputValue('docTotalAmount') - fixed) * 100) / 100;
      if (gross > 0) {
        const result = Core.calculateSimpleDocumentTax({ mode: 'total', totalAmount: gross, vatRate: fiscalRate });
        maybeSetInputValue('docNetTaxed', result.netTaxedAmount);
        maybeSetInputValue('docVatAmount', result.vatAmount);
      } else {
        maybeSetInputValue('docNetTaxed', 0);
        maybeSetInputValue('docVatAmount', 0);
      }
    } else if (!documentVatManualOverride || !fiscalRate) {
      const result = Core.calculateSimpleDocumentTax({ netTaxedAmount: numericInputValue('docNetTaxed'), vatRate: fiscalRate });
      maybeSetInputValue('docVatAmount', result.vatAmount);
    }
    const net = numericInputValue('docNetTaxed');
    if (vatRate === 'exempt') maybeSetInputValue('docExemptAmount', net);
    if (vatRate === 'not_taxed') maybeSetInputValue('docNotTaxedAmount', net);
    const summary = moneyBreakdown('doc');
    if (documentCalculationSource === 'net') maybeSetInputValue('docTotalAmount', Math.round(summary.total * 100) / 100);
    const total = numericInputValue('docTotalAmount');
    maybeSetInputValue('docAmount', total);
    renderMoneySummary('doc', currency, 'TOTAL FINAL');
    syncDocumentAdditionalFields();
  }

  function documentPrincipalInputChanged(source) {
    documentCalculationSource = source;
    documentVatManualOverride = false;
    updateDocumentCalculatedFields();
  }

  function entityForGrainLocation(locationId) {
    const location = (state.grainLocations || []).find((item) => item.id === locationId);
    if (!location) return null;
    if (location.entityId) return state.entities.find((entity) => entity.id === location.entityId) || null;
    const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedLocation = normalize(location.name);
    if (!normalizedLocation) return null;
    return state.entities.find((entity) => normalize(entity.name) === normalizedLocation) || null;
  }

  function suggestEntityFromGrainLocation({ force = false } = {}) {
    if (grainEntityTouched && !force) return;
    const entity = entityForGrainLocation(valueFromInput('grainOpLocation'));
    const select = document.getElementById('grainOpEntity');
    if (entity && select && Array.from(select.options).some((option) => option.value === entity.id)) {
      select.value = entity.id;
    }
  }

  function updateLivestockWeightsSummary() {
    const raw = valueFromInput('livestockOpWeights');
    if (!raw) {
      setCalculatedText('livestockOpWeightsSummary', 'Pesos: -');
      return;
    }
    try {
      const weights = parseWeightList(raw);
      if (!weights.length) {
        setCalculatedText('livestockOpWeightsSummary', 'Pesos: -');
        return;
      }
      const total = weights.reduce((sum, value) => sum + value, 0);
      setCalculatedText('livestockOpWeightsSummary', `Pesos: ${weights.length} cab | Total ${formatKg(total)} kg | Prom. ${formatDecimal(total / weights.length, 2)} kg | Min ${formatKg(Math.min(...weights))} | Max ${formatKg(Math.max(...weights))}`);
    } catch (error) {
      setCalculatedText('livestockOpWeightsSummary', error.message);
    }
  }

  function applyGrainOperationMode(mode) {
    setModeVisibility('data-grain-modes', mode);
    const locationLabel = document.getElementById('grainOpLocationLabel');
    if (locationLabel?.firstChild) locationLabel.firstChild.textContent = mode === 'transfer' ? 'Lugar origen / Acopio' : 'Lugar de entrega / Acopio';
    updateGrainCalculatedFields({ writeNetTaxed: true });
  }

  function applyLivestockOperationMode(mode) {
    setModeVisibility('data-livestock-modes', mode);
    const locationLabel = document.getElementById('livestockOpLocationLabel');
    if (locationLabel?.firstChild) {
      locationLabel.firstChild.textContent = mode === 'purchase' ? 'Destino/campo' : mode === 'category_change' ? 'Ubicacion/campo' : mode === 'sale' || mode === 'death' || mode === 'weighing' ? 'Origen/campo' : 'Ubicacion origen';
    }
    for (const [id, label] of [['livestockOpCategoryLabel', 'Categoria'], ['livestockOpHerdLabel', 'Tropa']]) {
      const element = document.getElementById(id);
      if (element?.firstChild) element.firstChild.textContent = `${label}${mode === 'category_change' ? ' origen' : ''}`;
    }
    const totalLabel = document.getElementById('livestockOpTotalLabel');
    if (totalLabel) totalLabel.textContent = mode === 'purchase' ? 'TOTAL A PAGAR' : 'TOTAL A COBRAR';
    updateLivestockCalculatedFields({ writeNetTaxed: true });
    if (mode === 'category_change') updateLivestockCategoryChangeForm();
    else document.getElementById('livestockOpHeads')?.removeAttribute('max');
  }

  function updateLivestockCategoryChangeForm({ herdChanged = false } = {}) {
    if (valueFromInput('livestockOperationMode') !== 'category_change') return;
    const herdId = valueFromInput('livestockOpHerd');
    const destination = document.getElementById('livestockOpDestinationHerd');
    if (herdChanged) {
      const herd = (state.livestockHerds || []).find((item) => item.id === herdId);
      const rows = Core.livestockStockRows(state, { herdId }).filter((row) => row.balanceHeads > 0);
      document.getElementById('livestockOpLocation').value = rows[0]?.locationId || herd?.locationId || '';
      document.getElementById('livestockOpCategory').value = rows[0]?.category || herd?.category || '';
      if (destination.dataset.manualSelection !== 'true') destination.value = herdId;
    }
    const category = valueFromInput('livestockOpCategory');
    const previous = valueFromInput('livestockOpDestinationCategory');
    const options = Core.LIVESTOCK_CATEGORIES.filter((item) => item !== category);
    fillOptions('livestockOpDestinationCategory', options.map((item) => ({ value: item, label: item })), options.includes(previous) ? previous : options[0] || '');
    const available = Core.livestockStockAt(state, { herdId, category, locationId: valueFromInput('livestockOpLocation'), date: valueFromInput('livestockOpDate') });
    setCalculatedText('livestockOpCategoryStock', `Disponibles: ${formatKg(available)} cabezas`);
    document.getElementById('livestockOpHeads')?.setAttribute('max', Math.max(0, available));
  }

  function chartOptionsForGrainOperation(mode) {
    const accounts = (state.chartAccounts || []).filter((account) => account.activity === 'Agricultura');
    if (mode === 'liquidation') {
      const preferred = accounts.filter((account) => /cereal|grano|soja|maiz|maíz|venta/i.test(Core.chartPath(state, account.id)));
      return preferred.length ? preferred : accounts;
    }
    if (mode === 'forward') return accounts;
    return accounts;
  }

  function chartOptionsForLivestockOperation(mode) {
    const accounts = (state.chartAccounts || []).filter((account) => account.activity === 'Ganaderia');
    const pathOf = (account) => Core.chartPath(state, account.id);
    const notOperationalCost = (account) => !/sueldo|jornal|carga social|aliment|sanidad/i.test(pathOf(account));
    if (mode === 'sale') {
      const exact = accounts.filter((account) => account.id === 'CA-GAN-VENTAS');
      if (exact.length) return exact;
      const preferred = accounts.filter((account) => /venta/i.test(pathOf(account)) && /hacienda|ganad/i.test(pathOf(account)) && notOperationalCost(account));
      return preferred.length ? preferred : accounts;
    }
    if (mode === 'purchase') {
      const exact = accounts.filter((account) => account.id === 'CA-GAN-COMPRA-HACIENDA');
      if (exact.length) return exact;
      const preferred = accounts.filter((account) => /compra|hacienda/i.test(pathOf(account)) && !/venta/i.test(pathOf(account)) && notOperationalCost(account));
      return preferred.length ? preferred : [];
    }
    return accounts;
  }

  function applyOperationChartOptions(kind, mode) {
    if (kind === 'grain') {
      const options = chartOptionsForGrainOperation(mode);
      const preferredId = options.find((account) => account.id === 'CA-AGRI-CEREALES-SOJA')?.id || options[0]?.id || '';
      fillOptions('grainOpChart', options.map((account) => ({ value: account.id, label: Core.chartPath(state, account.id) })), preferredId);
      return;
    }
    const options = chartOptionsForLivestockOperation(mode);
    const preferredId = mode === 'sale'
      ? options.find((account) => account.id === 'CA-GAN-VENTAS')?.id || options[0]?.id || ''
      : options.find((account) => account.id === 'CA-GAN-COMPRA-HACIENDA')?.id || options.find((account) => /compra|hacienda/i.test(Core.chartPath(state, account.id)))?.id || options[0]?.id || '';
    const rows = options.length
      ? options.map((account) => ({ value: account.id, label: Core.chartPath(state, account.id) }))
      : [{ value: '', label: mode === 'purchase' ? 'Falta cuenta Compra hacienda' : 'Sin cuenta disponible' }];
    fillOptions('livestockOpChart', rows, preferredId);
  }

  function showGrainOperation(mode) {
    const panel = document.getElementById('grainOperationPanel');
    if (!panel) return;
    grainNetManualOverride = false;
    grainVatManualOverride = false;
    grainCommissionManualOverride = false;
    grainCommissionVatManualOverride = false;
    grainTotalManualOverride = false;
    document.getElementById('grainOperationMode').value = mode;
    document.getElementById('grainOperationTitle').textContent = {
      harvest: 'Ingreso de cereal',
      transfer: 'Transferencia de cereal',
      adjustment: 'Ajuste fisico de cereal',
      liquidation: 'Nueva liquidacion de cereal',
      forward: 'Nuevo FWD',
      barter: 'Canje con proveedor'
    }[mode] || 'Operacion de cereal';
    document.getElementById('grainOpDate').value = Core.todayIso();
    document.getElementById('grainOpDueDate').value = Core.todayIso();
    document.getElementById('grainOpCereal').value = selectedOptionValue('grainCerealFilter') || Core.GRAIN_TYPES[0];
    document.getElementById('grainOpCampaign').value = selectedOptionValue('grainCampaignFilter') || '2026/27';
    const grainLocations = state.grainLocations || [];
    document.getElementById('grainOpLocation').value = selectedOptionValue('grainLocationFilter') || grainLocations[0]?.id || '';
    document.getElementById('grainOpDestinationLocation').value = grainLocations.find((location) => location.id !== valueFromInput('grainOpLocation'))?.id || valueFromInput('grainOpLocation');
    grainEntityTouched = false;
    suggestEntityFromGrainLocation({ force: true });
    applyOperationChartOptions('grain', mode);
    document.getElementById('grainOpCurrency').value = mode === 'forward' || mode === 'liquidation' ? 'USD' : 'ARS';
    ['grainOpKg', 'grainOpPrice', 'grainOpNetTaxed', 'grainOpVatAmount', 'grainOpCommissionPercent', 'grainOpWithholdingVat', 'grainOpWithholdingIncome', 'grainOpWithholdingIibb', 'grainOpCommissions', 'grainOpCommissionVat', 'grainOpOtherDeductions', 'grainOpTotalAmount', 'grainOpNumber', 'grainOpDescription'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    syncFiscalDisclosures(document.getElementById('grainOperationForm'), true);
    const grainCondition = document.getElementById('grainOpFinancialCondition');
    if (grainCondition) grainCondition.value = 'pending';
    const grainMethod = document.getElementById('grainOpPaymentMethod');
    if (grainMethod) grainMethod.value = 'undefined';
    applyGrainOperationMode(mode);
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeGrainOperation() {
    ['grainOpKg', 'grainOpPrice', 'grainOpNetTaxed', 'grainOpVatAmount', 'grainOpCommissionPercent', 'grainOpWithholdingVat', 'grainOpWithholdingIncome', 'grainOpWithholdingIibb', 'grainOpCommissions', 'grainOpCommissionVat', 'grainOpOtherDeductions', 'grainOpTotalAmount', 'grainOpNumber', 'grainOpDescription'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('grainOperationPanel')?.classList.add('hidden');
  }

  async function submitGrainOperation(event) {
    event.preventDefault();
    try {
      const mode = valueFromInput('grainOperationMode');
      const date = valueFromInput('grainOpDate') || Core.todayIso();
      const dueDate = valueFromInput('grainOpDueDate') || date;
      const cereal = valueFromInput('grainOpCereal');
      const campaign = valueFromInput('grainOpCampaign');
      const locationId = valueFromInput('grainOpLocation');
      const destinationLocationId = valueFromInput('grainOpDestinationLocation');
      const counterpartyEntityId = valueFromInput('grainOpEntity');
      const chartAccountId = valueFromInput('grainOpChart');
      const currency = valueFromInput('grainOpCurrency') || 'ARS';
      const kg = numberFromInput('grainOpKg') || 0;
      const price = numberFromInput('grainOpPrice') || 0;
      const description = valueFromInput('grainOpDescription') || document.getElementById('grainOperationTitle')?.textContent || '';
      const base = { date, cereal, campaign, locationId, kg, description };
      let savedLiquidationId = '';
      if (mode === 'forward') {
        await postTransaction({ action: 'createGrainForward', payload: { cereal, campaign, buyerEntityId: counterpartyEntityId, contractedKg: kg, price, estimatedAmount: numberFromInput('grainOpNetTaxed') || (kg / 1000) * price, currency, plannedDeliveryDate: date, plannedLiquidationDate: dueDate, chartAccountId, description, reference: valueFromInput('grainOpNumber') } });
      } else if (mode === 'barter') {
        const amountApplied = numberFromInput('grainOpNetTaxed') || (kg / 1000) * price;
        await postTransaction({ action: 'createGrainBarterPayment', payload: { documentId: valueFromInput('grainOpDocument'), date, cereal, campaign, locationId, kg, amountApplied, financialAccountId: selectedFinancialAccount(currency), description, reference: valueFromInput('grainOpNumber') || 'Canje de cereal' } });
      } else if (mode === 'liquidation') {
        const saved = await postTransaction({ action: 'createGrainLiquidation', payload: { ...base, dueDate, counterpartyEntityId, chartAccountId, price, currency, number: valueFromInput('grainOpNumber'), financialCondition: valueFromInput('grainOpFinancialCondition'), paymentMethodPlanned: valueFromInput('grainOpPaymentMethod'), ...taxPayload('grainOp') } });
        savedLiquidationId = saved.createdIds?.grainLiquidations?.[0] || '';
      } else if (mode === 'transfer') {
        await postTransaction({ action: 'createGrainTransfer', payload: { date, cereal, campaign, originLocationId: locationId, destinationLocationId, kgSent: kg, kgNetRecognized: kg, description } });
      } else {
        const direction = mode === 'adjustment' && kg < 0 ? 'out' : 'in';
        await postTransaction({ action: 'createGrainMovement', payload: { ...base, kg: Math.abs(kg), direction, movementType: mode, reason: description || 'Movimiento cereal desde formulario' } });
      }
      finishNewForm('grainOperationForm', 'grainOperationPanel');
      closeGrainOperation();
      if (savedLiquidationId) showTrace({ type: 'grainLiquidation', id: savedLiquidationId });
    } catch (error) {
      alert(error.message);
    }
  }

  async function createGrainMovement(defaultType) {
    showGrainOperation(defaultType);
  }

  async function createGrainTransfer() {
    showGrainOperation('transfer');
  }

  async function createGrainLiquidation() {
    showGrainOperation('liquidation');
  }

  async function createLivestockTrade(type) {
    showLivestockOperation(type);
  }

  async function createLivestockDeath() {
    showLivestockOperation('death');
  }

  async function createLivestockTransfer() {
    showLivestockOperation('transfer');
  }

  function parseWeightList(text) {
    return String(text || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).map((value) => {
      const number = Number(value.replace(',', '.'));
      if (!Number.isFinite(number) || number <= 0) throw new Error(`Peso invalido: ${value}`);
      return number;
    });
  }

  async function createLivestockWeighing() {
    showLivestockOperation('weighing');
  }

  async function quickCreateLivestockHerd(destination = false) {
    await requestEditAction({ title: 'Nueva tropa', fields: [{ name: 'name', label: 'Nombre de la tropa', required: true }], onSubmit: async ({ name }) => {
      const locationId = valueFromInput('livestockOpLocation') || selectedOptionValue('livestockLocationFilter') || (state.livestockLocations || [])[0]?.id || '';
      await postTransaction({
        action: 'createLivestockHerd',
        payload: {
          name,
          category: valueFromInput(destination ? 'livestockOpDestinationCategory' : 'livestockOpCategory') || Core.LIVESTOCK_CATEGORIES[0],
          locationId,
          startDate: valueFromInput('livestockOpDate') || Core.todayIso()
        }
      });
      const created = (state.livestockHerds || []).find((herd) => herd.name === name);
      if (created) {
        const select = document.getElementById(destination ? 'livestockOpDestinationHerd' : 'livestockOpHerd');
        select.value = created.id;
        if (destination) select.dataset.manualSelection = 'true';
        updateLivestockCategoryChangeForm({ herdChanged: !destination });
      }
    } });
  }

  async function renameSelectedLivestockHerd() {
    const herdId = valueFromInput('livestockOpHerd') || selectedOptionValue('livestockHerdFilter');
    const herd = (state.livestockHerds || []).find((item) => item.id === herdId);
    if (!herd) {
      alert('Seleccioná una tropa para renombrar.');
      return;
    }
    await requestEditAction({ title: 'Renombrar tropa', fields: [{ name: 'name', label: 'Nombre visible', value: herd.name, required: true }], onSubmit: async ({ name }) => {
      if (name === herd.name) return;
      await postTransaction({ action: 'updateLivestockHerd', id: herd.id, changes: { name, locationId: valueFromInput('livestockOpLocation') || herd.locationId } });
    } });
  }

  async function quickCreateLivestockLocation() {
    await requestEditAction({ title: 'Nueva ubicación/campo', fields: [{ name: 'name', label: 'Nombre', required: true }], onSubmit: async ({ name }) => {
      await postTransaction({ action: 'createLivestockLocation', payload: { name, notes: 'Alta rapida desde formulario de hacienda' } });
      const created = (state.livestockLocations || []).find((location) => location.name === name);
      renderSelects();
      if (created) {
        const operationLocation = document.getElementById('livestockOpLocation');
        const filterLocation = document.getElementById('livestockLocationFilter');
        if (operationLocation) operationLocation.value = created.id;
        if (filterLocation) filterLocation.value = created.id;
        renderLivestock();
      }
    } });
  }

  async function renameSelectedLivestockLocation() {
    const locationId = valueFromInput('livestockOpLocation') || selectedOptionValue('livestockLocationFilter');
    const location = (state.livestockLocations || []).find((item) => item.id === locationId);
    if (!location) {
      alert('Seleccioná una ubicacion/campo para renombrar.');
      return;
    }
    await requestEditAction({ title: 'Renombrar ubicación/campo', fields: [{ name: 'name', label: 'Nombre visible', value: location.name, required: true }], onSubmit: async ({ name }) => {
      if (name === location.name) return;
      await postTransaction({ action: 'updateLivestockLocation', id: location.id, changes: { name } });
      renderSelects();
      const operationLocation = document.getElementById('livestockOpLocation');
      const filterLocation = document.getElementById('livestockLocationFilter');
      if (operationLocation) operationLocation.value = location.id;
      if (filterLocation) filterLocation.value = location.id;
      renderLivestock();
    } });
  }

  function showLivestockOperation(mode) {
    const panel = document.getElementById('livestockOperationPanel');
    if (!panel) return;
    livestockNetManualOverride = false;
    livestockVatManualOverride = false;
    livestockCommissionManualOverride = false;
    livestockCommissionVatManualOverride = false;
    livestockTotalManualOverride = false;
    document.getElementById('livestockOpCommissionVatRate').value = '21';
    const livestockHerds = state.livestockHerds || [];
    const livestockLocations = state.livestockLocations || [];
    const herd = livestockHerds.find((item) => item.id === selectedOptionValue('livestockHerdFilter')) || livestockHerds[0];
    document.getElementById('livestockOperationMode').value = mode;
    document.getElementById('livestockOperationTitle').textContent = {
      purchase: 'Compra de hacienda',
      sale: 'Venta de hacienda',
      death: 'Muerte / baja de hacienda',
      transfer: 'Cambio de campo',
      category_change: 'Cambio de categoría',
      weighing: 'Nueva pesada'
    }[mode] || 'Operacion de hacienda';
    document.getElementById('livestockOpDate').value = Core.todayIso();
    document.getElementById('livestockOpDueDate').value = Core.todayIso();
    document.getElementById('livestockOpCategory').value = selectedOptionValue('livestockCategoryFilter') || herd?.category || Core.LIVESTOCK_CATEGORIES[0];
    document.getElementById('livestockOpHerd').value = herd?.id || '';
    const destinationHerd = document.getElementById('livestockOpDestinationHerd');
    if (destinationHerd) { destinationHerd.value = herd?.id || ''; delete destinationHerd.dataset.manualSelection; }
    document.getElementById('livestockOpLocation').value = selectedOptionValue('livestockLocationFilter') || herd?.locationId || livestockLocations[0]?.id || '';
    document.getElementById('livestockOpDestinationLocation').value = livestockLocations.find((location) => location.id !== valueFromInput('livestockOpLocation'))?.id || valueFromInput('livestockOpLocation');
    applyOperationChartOptions('livestock', mode);
    document.getElementById('livestockOpCurrency').value = 'ARS';
    ['livestockOpHeads', 'livestockOpTotalKg', 'livestockOpPriceKg', 'livestockOpNetTaxed', 'livestockOpVatAmount', 'livestockOpCommissionPercent', 'livestockOpCommissions', 'livestockOpCommissionVat', 'livestockOpGuides', 'livestockOpHandling', 'livestockOpWithholdingVat', 'livestockOpWithholdingIncome', 'livestockOpWithholdingIibb', 'livestockOpOtherExpenses', 'livestockOpOtherDeductions', 'livestockOpTotalAmount', 'livestockOpNumber', 'livestockOpDescription', 'livestockOpWeights'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
    syncFiscalDisclosures(document.getElementById('livestockOperationForm'), true);
    const livestockCondition = document.getElementById('livestockOpFinancialCondition');
    if (livestockCondition) livestockCondition.value = 'pending';
    const livestockMethod = document.getElementById('livestockOpPaymentMethod');
    if (livestockMethod) livestockMethod.value = 'undefined';
    applyLivestockOperationMode(mode);
    if (mode === 'category_change') updateLivestockCategoryChangeForm({ herdChanged: true });
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeLivestockOperation() {
    document.getElementById('livestockOperationPanel')?.classList.add('hidden');
  }

  async function submitLivestockOperation(event) {
    event.preventDefault();
    try {
      const mode = valueFromInput('livestockOperationMode');
      const date = valueFromInput('livestockOpDate') || Core.todayIso();
      const dueDate = valueFromInput('livestockOpDueDate') || date;
      const herdId = valueFromInput('livestockOpHerd');
      const herd = (state.livestockHerds || []).find((item) => item.id === herdId);
      const category = valueFromInput('livestockOpCategory') || herd?.category || '';
      const locationId = valueFromInput('livestockOpLocation') || herd?.locationId || '';
      const description = valueFromInput('livestockOpDescription');
      const heads = numberFromInput('livestockOpHeads') || 0;
      if (mode === 'weighing') {
        const weights = parseWeightList(valueFromInput('livestockOpWeights'));
        if (!weights.length) throw new Error('Pegá al menos una pesada');
        const totalKg = weights.reduce((sum, value) => sum + value, 0);
        await postTransaction({ action: 'createLivestockWeighing', payload: { date, herdId, category, heads: weights.length, totalKg, averageWeightKg: totalKg / weights.length, condition: description, notes: `Pesos: ${weights.join(', ')}. Min ${Math.min(...weights)} kg; max ${Math.max(...weights)} kg.` } });
      } else if (mode === 'category_change') {
        await postTransaction({ action: 'createLivestockCategoryChange', payload: {
          date, heads, originHerdId: herdId, locationId, originCategory: category,
          destinationHerdId: valueFromInput('livestockOpDestinationHerd') || herdId,
          destinationCategory: valueFromInput('livestockOpDestinationCategory'), description
        } });
      } else if (mode === 'transfer') {
        await postTransaction({ action: 'createLivestockTransfer', payload: { date, originHerdId: herdId, destinationHerdId: herdId, originLocationId: locationId, destinationLocationId: valueFromInput('livestockOpDestinationLocation'), originCategory: category, destinationCategory: category, heads, description } });
      } else if (mode === 'death') {
        await postTransaction({ action: 'createLivestockDeath', payload: { date, herdId, locationId, category, heads, cause: description || 'Baja informada', description } });
      } else {
        await postTransaction({ action: 'createLivestockTrade', payload: { type: mode, date, dueDate, herdId, category, locationId, heads, totalKg: numberFromInput('livestockOpTotalKg') || 0, pricePerKg: numberFromInput('livestockOpPriceKg') || 0, counterpartyEntityId: valueFromInput('livestockOpEntity'), chartAccountId: valueFromInput('livestockOpChart'), currency: valueFromInput('livestockOpCurrency') || 'ARS', number: valueFromInput('livestockOpNumber'), description, financialCondition: valueFromInput('livestockOpFinancialCondition'), paymentMethodPlanned: valueFromInput('livestockOpPaymentMethod'), ...livestockTradeFinancialPayload(), senasa: 0 } });
      }
      finishNewForm('livestockOperationForm', 'livestockOperationPanel');
      closeLivestockOperation();
    } catch (error) {
      alert(error.message);
    }
  }

  function actionGroup(actions, extraClass = '') {
    const wrap = document.createElement('span');
    wrap.className = `action-group ${extraClass}`.trim();
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mini-action';
      button.textContent = action.label;
      button.addEventListener('click', action.fn);
      wrap.appendChild(button);
    });
    return wrap;
  }

  async function quickCreateEntity(selectId, searchId) {
    const suggested = document.getElementById(searchId).value.trim();
    await requestEditAction({ title: 'Nueva contraparte', fields: [{ name: 'name', label: 'Nombre/Razón social', value: suggested, required: true }, { name: 'cuit', label: 'CUIT' }, { name: 'role', label: 'Rol', type: 'select', value: 'Proveedor', options: Core.ENTITY_ROLES.map((value) => ({ value, label: value })) }], onSubmit: async (values) => {
      const name = values.name;
      const cuit = values.cuit || '';
      const role = values.role || 'Proveedor';
      const existing = state.entities.find((entity) => entity.active !== false && !entity.mergedIntoEntityId && ((cuit && entity.cuit === cuit) || entity.name.trim().toLocaleLowerCase('es') === name.trim().toLocaleLowerCase('es')));
      if (!existing) await postTransaction({ action: 'createEntity', payload: { name, cuit, role, reason: 'Alta rapida desde operacion' } });
      const created = state.entities.find((entity) => (cuit && entity.cuit === cuit) || entity.name.toLowerCase() === name.toLowerCase());
      if (selectId !== 'docEntity') document.getElementById(searchId).value = '';
      renderSelects();
      if (created) document.getElementById(selectId).value = created.id;
      if (selectId === 'docEntity') renderDocumentEntitySuggestions();
      renderOrderDocumentsList();
    } });
  }

  async function editEntity(id) {
    const entity = state.entities.find((x) => x.id === id);
    if (!entity) return;
    await requestEditAction({ title: 'Editar contraparte', fields: [{ name: 'name', label: 'Nombre/Razón social', value: entity.name, required: true }, { name: 'cuit', label: 'CUIT', value: entity.cuit || '' }, { name: 'role', label: 'Rol', type: 'select', value: entity.role || 'Proveedor', options: Core.ENTITY_ROLES.map((value) => ({ value, label: value })) }], onSubmit: async (values) => {
      const name = values.name;
      const cuit = values.cuit || '';
      const role = values.role || entity.role || 'Proveedor';
      await postTransaction({ action: 'updateEntity', id, changes: { name, cuit, role, reason: 'Edicion de contraparte desde UI' } });
      showEntityDetail(id);
    } });
  }

  function renderEntityMergePreview() {
    const panel = document.getElementById('entityMergePreview');
    if (!panel) return null;
    const sourceId = valueFromInput('entityMergeSource');
    const targetId = valueFromInput('entityMergeTarget');
    if (!sourceId || !targetId || sourceId === targetId) {
      panel.textContent = sourceId && targetId ? 'Origen y destino deben ser distintos.' : 'Seleccioná origen y destino para revisar las referencias.';
      return null;
    }
    try {
      const preview = Core.entityMergePreview(state, sourceId, targetId);
      const detail = Object.entries(preview.counts).map(([key, count]) => `${key}: ${count}`).join(' · ') || 'sin referencias operativas';
      panel.textContent = `${preview.source.name} → ${preview.target.name}. Referencias: ${preview.total}. ${detail}${preview.ambiguous.length ? ` · BLOQUEADA: ${preview.ambiguous.length} ambiguas` : ''}`;
      panel.classList.toggle('merge-preview-blocked', preview.ambiguous.length > 0);
      return preview;
    } catch (error) {
      panel.textContent = error.message;
      panel.classList.add('merge-preview-blocked');
      return null;
    }
  }

  async function mergeEntitiesFromForm(event) {
    event.preventDefault();
    const preview = renderEntityMergePreview();
    if (!preview || preview.ambiguous.length) return;
    const reason = valueFromInput('entityMergeReason');
    if (!reason) {
      document.getElementById('entityMergeReason')?.focus();
      return;
    }
    if (!confirm(`Unificar ${preview.source.name} en ${preview.target.name}? Se reasignaran ${preview.total} referencias y el origen quedara inactivo.`)) return;
    try {
      await postTransaction({ action: 'mergeEntities', sourceEntityId: preview.source.id, targetEntityId: preview.target.id, reason });
      document.getElementById('entityMergeReason').value = '';
      finishNewForm('entityMergeForm', 'entityMergePanel');
      renderEntityMergePreview();
    } catch (error) {
      const panel = document.getElementById('entityMergePreview');
      panel.textContent = error.message;
      panel.classList.add('merge-preview-blocked');
    }
  }

  async function editDocument(id) {
    const doc = state.documents.find((x) => x.id === id);
    if (!doc) return;
    openDocumentEditor(id);
  }

  function openDocumentEditor(id, navigate = true) {
    const doc = state.documents.find((item) => item.id === id && !item.voidedAt);
    if (!doc) return;
    if (navigate) showTrace({ type: 'document', id });
    const panel = document.getElementById('recordDetailPanel');
    panel.querySelectorAll('.instrument-edit-form').forEach((item) => item.remove());
    const form = documentEditForm(doc);
    panel.appendChild(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function editOrder(id) {
    const order = state.orders.find((item) => item.id === id);
    if (!order) return;
    await requestEditAction({ title: `Editar ${orderDisplayCode(order)}`, description: 'Edición administrativa. No modifica documentos, importes, instrumentos ni settlements.', fields: [{ name: 'description', label: 'Concepto/observación', value: order.description || '' }, { name: 'date', label: 'Fecha de orden', type: 'date', value: order.date, required: true }], onSubmit: async (values) => {
      await postTransaction({ action: 'updateOrder', id, changes: { description: values.description, date: values.date, reason: 'Edicion simple desde ficha de orden' } });
      openOrderDetail(id);
    } });
  }

  async function voidRecord(entityType, id) {
    await requestEditAction({ title: `Anular/revertir ${id}`, fields: [{ name: 'reason', label: 'Motivo', required: true }], submitLabel: 'Anular/revertir', onSubmit: async (values) => {
      if (!confirm(`Confirmar anulacion/reversa de ${id}?`)) return false;
      await postTransaction({ action: 'voidRecord', entityType, id, reason: values.reason });
    } });
  }

  async function transitionInstrument(id, returnOrderId = '') {
    const instrument = state.instruments.find((x) => x.id === id);
    if (!instrument) return;
    const states = Core.validStatesForInstrument(instrument.type);
    const values = await requestEditAction({ title: `Cambiar estado · ${instrumentDisplayName(instrument)}`, fields: [{ name: 'status', label: 'Nuevo estado', type: 'select', value: instrument.status, options: states.map((value) => ({ value, label: labelForStatus(value) })) }] });
    const status = values?.status;
    if (!status || status === instrument.status) return;
    await requestDateAction({
      title: `Fecha efectiva · ${labelForStatus(status)}`,
      description: instrumentDisplayName(instrument),
      date: instrument.executedDate || instrument.scheduledDate || Core.todayIso(),
      onSubmit: async (date) => {
        await postTransaction({ action: 'transitionInstrument', instrumentId: id, status, date });
        if (returnOrderId) openOrderDetail(returnOrderId);
      }
    });
  }

  function requestDateAction({ title, description, date, onSubmit }) {
    const modal = document.getElementById('dateActionModal');
    const input = document.getElementById('dateActionInput');
    document.getElementById('dateActionTitle').textContent = title || 'Fecha efectiva';
    document.getElementById('dateActionDescription').textContent = description || '';
    input.value = date || Core.todayIso();
    dateActionSubmit = onSubmit || null;
    document.getElementById('dateActionError')?.classList.add('hidden');
    document.getElementById('verifyInstrumentTransition')?.classList.add('hidden');
    modal.classList.remove('hidden');
    input.focus();
    return new Promise((resolve) => {
      pendingDateAction = resolve;
    });
  }

  function requestEditAction({ title, description = '', fields = [], submitLabel = 'Guardar', wideReview = false, taxPlanView = false, closeOnly = false, onSubmit }) {
    const modal = document.getElementById('editActionModal');
    const form = document.getElementById('editActionForm');
    const container = document.getElementById('editActionFields');
    modal.classList[wideReview ? 'add' : 'remove']('bank-reversal-review');
    modal.classList[taxPlanView ? 'add' : 'remove']('tax-plan-modal');
    document.getElementById('editActionCancel').classList[closeOnly ? 'add' : 'remove']('hidden');
    document.getElementById('editActionCancel').textContent = taxPlanView ? 'Volver sin cambios' : 'Cancelar';
    editActionSubmit = onSubmit || null;
    document.getElementById('editActionTitle').textContent = title || 'Editar';
    document.getElementById('editActionDescription').textContent = description;
    document.getElementById('editActionAccept').textContent = submitLabel;
    document.getElementById('editActionError').classList.add('hidden');
    container.innerHTML = fields.map((field) => {
      const options = (field.options || []).map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value ?? '') ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      const control = field.type === 'checkboxes'
        ? `<span class="edit-action-choices">${(field.options || []).map((option) => `<span><input type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(option.value)}" ${Array.isArray(field.value) && field.value.includes(option.value) ? 'checked' : ''}><span>${escapeHtml(option.label)}</span></span>`).join('')}</span>`
        : field.type === 'select'
        ? `<select name="${escapeHtml(field.name)}" ${field.required ? 'required' : ''}>${options}</select>`
        : field.type === 'textarea'
        ? `<textarea name="${escapeHtml(field.name)}" rows="6" ${field.required ? 'required' : ''}>${escapeHtml(field.value ?? '')}</textarea>`
        : `<input name="${escapeHtml(field.name)}" type="${field.type || 'text'}" value="${escapeHtml(field.value ?? '')}" ${field.required ? 'required' : ''} ${field.step != null ? `step="${escapeHtml(field.step)}"` : ''} ${field.min != null ? `min="${escapeHtml(field.min)}"` : ''} ${field.money ? 'data-money-input="true" inputmode="decimal"' : ''}>`;
      return `<label${['checkboxes', 'textarea'].includes(field.type) ? ' class="wide-section"' : ''}>${escapeHtml(field.label)}${control}</label>`;
    }).join('');
    wireMoneyInputs(container);
    modal.classList.remove('hidden');
    container.querySelector('input,select')?.focus();
    return new Promise((resolve) => { pendingEditAction = resolve; });
  }

  function closeEditActionModal(value) {
    if (pendingSaves.has(document.getElementById('editActionForm'))) return;
    document.getElementById('editActionModal')?.classList.add('hidden');
    const resolve = pendingEditAction;
    pendingEditAction = null;
    editActionSubmit = null;
    document.getElementById('editActionForm')?.reset();
    if (resolve) resolve(value);
  }

  function closeDateActionModal(value) {
    if (pendingSaves.has(document.getElementById('dateActionForm'))) return;
    if (pendingInstrumentVerification && uncertainWrite) {
      const error = document.getElementById('dateActionError');
      error.textContent = 'El resultado sigue sin confirmarse. Verificá el estado central antes de cerrar o volver a guardar.';
      error.classList.remove('hidden');
      return;
    }
    document.getElementById('dateActionModal')?.classList.add('hidden');
    document.getElementById('verifyInstrumentTransition')?.classList.add('hidden');
    pendingInstrumentVerification = null;
    const resolve = pendingDateAction;
    pendingDateAction = null;
    dateActionSubmit = null;
    if (resolve) resolve(value);
  }

  async function submitEditAction(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    form.querySelectorAll('.edit-action-choices input[type="checkbox"]').forEach((input) => {
      if (!Array.isArray(values[input.name])) values[input.name] = [];
      if (input.checked) values[input.name].push(input.value);
    });
    if (!editActionSubmit) { closeEditActionModal(values); return; }
    let saved = false;
    await runPersistentAction(form, async () => {
      document.getElementById('editActionError').classList.add('hidden');
      saved = await editActionSubmit(values) !== false;
    });
    if (saved) closeEditActionModal(values);
  }

  async function submitDateAction(event) {
    event.preventDefault();
    const date = document.getElementById('dateActionInput').value || Core.todayIso();
    if (!dateActionSubmit) { closeDateActionModal(date); return; }
    let saved = false;
    await runPersistentAction(event.currentTarget, async () => {
      document.getElementById('dateActionError').classList.add('hidden');
      saved = await dateActionSubmit(date) !== false;
    });
    if (saved) closeDateActionModal(date);
  }

  async function verifyUncertainInstrumentTransition() {
    const pending = pendingInstrumentVerification;
    if (!pending) return;
    const form = document.getElementById('dateActionForm');
    let confirmed = false;
    await runPersistentAction(form, async () => {
      const payload = await api('/api/state');
      if (payload.validation?.length) throw new Error('El estado central no pasó la validación; se requiere revisión antes de operar.');
      state = payload.state;
      validation = payload.validation || [];
      stateVersion = payload.stateVersion;
      persistenceEnvironment = payload.environment || persistenceEnvironment;
      render();
      const current = state.instruments.find((item) => item.id === pending.id);
      if (current?.status === pending.status && (!Core.instrumentIsBankRealized(current) || current.executedDate === pending.date)) {
        uncertainWrite = false;
        confirmed = true;
        return;
      }
      if (current?.status !== pending.previousStatus) throw new Error('El instrumento cambió de otra forma en la base central. Revisá su ficha antes de operar.');
      uncertainWrite = false;
      const error = document.getElementById('dateActionError');
      error.textContent = 'El pago aún no figura realizado. Podés verificar de nuevo o reintentar manualmente; el control de versión impedirá duplicarlo si el primer envío se confirma después.';
      error.classList.remove('hidden');
    }, { button: document.getElementById('verifyInstrumentTransition'), label: 'Verificando...' });
    if (confirmed) closeDateActionModal(pending.date);
  }

  async function transitionInstrumentTo(id, status, afterSave) {
    const instrument = state.instruments.find((x) => x.id === id);
    if (!instrument || !status || status === instrument.status) return;
    const proposed = status === 'delivered' ? Core.todayIso() : instrument.executedDate || instrument.scheduledDate || Core.todayIso();
    await requestDateAction({
      title: instrument.type === 'own_check' && status === 'debited' ? 'Confirmar débito bancario' : labelForStatus(status),
      description: `${instrumentDisplayName(instrument)} · ${formatMoney(instrument.amount, instrument.currency)}`,
      date: proposed,
      onSubmit: async (date) => {
        const effectiveDate = date || Core.todayIso();
        try {
          await postTransaction({ action: 'transitionInstrument', instrumentId: id, status, date: effectiveDate });
          pendingInstrumentVerification = null;
          document.getElementById('verifyInstrumentTransition')?.classList.add('hidden');
        } catch (error) {
          if (error.uncertainWrite || error.saved) {
            uncertainWrite = true;
            pendingInstrumentVerification = { id, status, date: effectiveDate, previousStatus: instrument.status };
            document.getElementById('verifyInstrumentTransition')?.classList.remove('hidden');
          }
          throw error;
        }
        if (afterSave) afterSave();
      }
    });
  }


  // One-time reviewed corrections (corrections.js). Preview runs locally; applying is one server transaction.
  const correctionPreviews = new Map();

  function correctionSummaryTable(preview) {
    const table = document.createElement('table');
    table.className = 'correction-preview';
    const head = table.createTHead().insertRow();
    ['', 'Hoy en la app', 'Después de corregir', 'Diferencia'].forEach((label) => { const th = document.createElement('th'); th.textContent = label; head.appendChild(th); });
    const body = table.createTBody();
    const rows = [
      ['Pendiente con LAR (cuenta en pesos)', 'larPending'],
      ['Saldo BNA en la app', 'bank'],
      ['Resultado ejercicio 2026/27', 'result']
    ];
    rows.forEach(([label, key]) => {
      const tr = body.insertRow();
      const before = preview.before[key];
      const after = preview.after[key];
      [label, formatMoney(before, 'ARS'), formatMoney(after, 'ARS'), formatMoney(after - before, 'ARS')].forEach((text, index) => {
        const cell = tr.insertCell();
        cell.textContent = text;
        if (index) cell.className = 'amount';
      });
    });
    if (preview.expected?.larPending != null) {
      const tr = body.insertRow();
      const cell = tr.insertCell();
      cell.colSpan = 4;
      cell.className = 'muted';
      const diff = preview.after.larPending - preview.expected.larPending;
      cell.textContent = `Saldo según resumen de LAR: ${formatMoney(preview.expected.larPending, 'ARS')}. Diferencia: ${formatMoney(diff, 'ARS')} (redondeo del pago del 24/08).`;
    }
    return table;
  }

  function renderCorrections() {
    const panel = document.getElementById('correctionsPanel');
    const list = document.getElementById('correctionsList');
    const count = document.getElementById('correctionsTabCount');
    if (!panel || !list || typeof SagroCorrections === 'undefined') return;
    const ready = SagroCorrections.available(state).filter((item) => item.ready);
    panel.classList.toggle('hidden', !ready.length);
    if (count) count.textContent = ready.length ? String(ready.length) : '';
    list.innerHTML = '';
    ready.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'correction-card';
      const title = document.createElement('h4');
      title.textContent = item.title;
      const description = document.createElement('p');
      description.textContent = item.description;
      const result = document.createElement('div');
      const actions = document.createElement('div');
      actions.className = 'actions';
      const previewButton = document.createElement('button');
      previewButton.type = 'button';
      previewButton.className = 'secondary';
      previewButton.textContent = 'Ver vista previa';
      const applyButton = document.createElement('button');
      applyButton.type = 'button';
      applyButton.textContent = 'Aplicar corrección';
      applyButton.disabled = true;
      const showPreview = () => {
        try {
          const preview = SagroCorrections.preview(state, item.id, 'vista previa');
          correctionPreviews.set(item.id, preview);
          result.innerHTML = '';
          result.appendChild(correctionSummaryTable(preview));
          applyButton.disabled = false;
        } catch (error) {
          result.textContent = `No se puede aplicar: ${error.message}`;
          applyButton.disabled = true;
        }
      };
      previewButton.addEventListener('click', showPreview);
      applyButton.addEventListener('click', async () => {
        if (applyButton.disabled) return;
        applyButton.disabled = true;
        previewButton.disabled = true;
        applyButton.textContent = 'Aplicando…';
        try {
          await postTransaction({ action: 'applyCorrection', id: item.id });
          correctionPreviews.delete(item.id);
        } catch (error) {
          result.textContent = `No se aplicó: ${error.message}`;
          applyButton.textContent = 'Aplicar corrección';
          previewButton.disabled = false;
        }
      });
      actions.append(previewButton, applyButton);
      card.append(title, description, actions, result);
      list.appendChild(card);
    });
  }

  function renderControl() {
    const rows = state.documents.filter((doc) => !doc.voidedAt).map((doc) => {
      const b = Core.documentBreakdown(state, doc.id);
      return { doc, ...b, diff: doc.amount - b.control };
    });
    renderTable('controlTable', [
      { label: 'Documento', value: (row) => documentDisplayLabel(row.doc), link: (row) => ({ type: 'document', id: row.doc.id }) },
      { label: 'Original', value: (row) => formatMoney(row.doc.amount, row.doc.currency), className: () => 'amount' },
      { label: 'Cancelado', value: (row) => formatMoney(row.cancelled, row.doc.currency), className: () => 'amount' },
      { label: 'Comprometido pendiente', value: (row) => formatMoney(row.committedPending, row.doc.currency), className: () => 'amount' },
      { label: 'No instrumentado', value: (row) => formatMoney(row.nonInstrumented, row.doc.currency), className: () => 'amount' },
      { label: 'Diferencia', value: (row) => formatMoney(row.diff, row.doc.currency), className: () => 'amount' },
      { label: 'Estado', value: (row) => Math.abs(row.diff) <= 0.01 ? 'OK' : 'Revisar' }
    ], rows);

    renderTable('auditTable', [
      { label: 'Fecha', value: 'createdAt' },
      { label: 'Entidad', value: (row) => `${row.entityType} ${row.entityId}` },
      { label: 'Accion', value: 'action' },
      { label: 'Cambios', value: (row) => (row.changes || []).map((c) => `${c.field}: ${c.from ?? '-'} -> ${c.to ?? '-'}`).join('; '), className: () => 'wrap' },
      { label: 'Motivo', value: 'reason', className: () => 'wrap' }
    ], state.auditLog.slice(0, 30));

    const badge = document.getElementById('integrityBadge');
    badge.textContent = validation.length ? `${validation.length} controles para revisar` : 'Control OK';
    badge.className = `badge ${validation.length ? 'error' : 'ok'}`;
    document.getElementById('validationList').innerHTML = validation.length
      ? validation.map((item) => `<li>${item}</li>`).join('')
      : '<li>Sin diferencias de integridad.</li>';
    if (document.getElementById('documentFlowAuditPanel')?.open) renderDocumentFlowAudit();
  }

  function openRecordPanel(title) {
    const panel = document.getElementById('recordDetailPanel');
    const originView = document.querySelector('.view.active');
    const visible = ['orderDetailPanel', 'instrumentDetailPanel', 'monthDetailPanel', 'recordDetailPanel']
      .map((id) => document.getElementById(id)).filter((item) => item && !item.classList.contains('hidden') && (item.id !== 'monthDetailPanel' || !originView || originView.id === 'flujo'));
    const originScroll = window.scrollY;
    const previous = Array.from(panel.childNodes || panel.children);
    visible.forEach((item) => item.classList.add('hidden'));
    panel.innerHTML = '';
    panel.appendChild(detailHeading(title));
    panel.appendChild(actionGroup([{ label: 'Volver', fn: () => {
      panel.classList.add('hidden');
      if (visible.includes(panel)) { panel.innerHTML = ''; previous.forEach((node) => panel.appendChild(node)); }
      visible.forEach((item) => item.classList.remove('hidden'));
      if (visible.length) visible[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (originView) window.scrollTo({ top: originScroll, behavior: 'smooth' });
    } }]));
    panel.classList.remove('hidden');
    return panel;
  }

  function openDocumentDetail(documentId) {
    if (!state.documents.some((item) => item.id === documentId)) return;
    showTrace({ type: 'document', id: documentId });
  }

  function showTrace(target, refresh = false) {
    if (target.type === 'monthDetail') {
      openMonthDetail(target);
      return;
    }
    selectedTrace = target;
    const lines = [];
    if (target.row) {
      lines.push(['Flujo', `${target.row.userStatus} ${target.row.detail}`]);
      lines.push(['Importe', formatMoney(target.row.amount, target.row.currency)]);
      if (target.row.documentId) addDocumentTrace(lines, target.row.documentId);
      if (target.row.orderId) addOrderTrace(lines, target.row.orderId);
      if (target.row.instrumentId) addInstrumentTrace(lines, target.row.instrumentId);
      if (target.row.forwardId) addGrainForwardTrace(lines, target.row.forwardId);
    } else if (target.type === 'document') addDocumentTrace(lines, target.id);
    else if (target.type === 'order') addOrderTrace(lines, target.id);
    else if (target.type === 'instrument') addInstrumentTrace(lines, target.id);
    else if (target.type === 'documentCompensation') addDocumentCompensationTrace(lines, target.id);
    else if (target.type === 'entity') addEntityTrace(lines, target.id);
    else if (target.type === 'financialAccount') addFinancialAccountTrace(lines, target.id);
    else if (target.type === 'chartAccount') addChartAccountTrace(lines, target.id);
    else if (target.type === 'flowGroup') addFlowGroupTrace(lines, target);
    else if (target.type === 'grainLocation') addGrainLocationTrace(lines, target);
    else if (target.type === 'grainMovement') addGrainMovementTrace(lines, target);
    else if (target.type === 'grainForward') addGrainForwardTrace(lines, target.id);
    else if (target.type === 'grainTransfer') addGrainTransferTrace(lines, target.id);
    else if (target.type === 'grainLiquidation') addGrainLiquidationTrace(lines, target.id);
    else if (target.type === 'livestockHerd') addLivestockHerdTrace(lines, target.id);
    else if (target.type === 'livestockLocation') addLivestockLocationTrace(lines, target.id);
    else if (target.type === 'livestockMovement') addLivestockMovementTrace(lines, target);
    else if (target.type === 'livestockCategoryChange') addLivestockCategoryChangeTrace(lines, target.id);
    else if (target.type === 'livestockWeighing') addLivestockWeighingTrace(lines, target);
    else if (target.type === 'taxes') {
      document.querySelector('[data-view="impuestos"]')?.click();
      return;
    }
    else if (target.type === 'controlGroup') addControlGroupTrace(lines, target.row);
    const previousBack = refresh ? document.getElementById('recordDetailPanel').children[1] : null;
    const detailDoc = target.type === 'document' ? state.documents.find((doc) => doc.id === target.id) : null;
    const panel = openRecordPanel(detailDoc ? `DOCUMENTO — ${labelForType(detailDoc.type)} — ${detailDoc.number || detailDoc.id}` : target.type === 'documentCompensation' ? 'COMPENSACIÓN ENTRE DOCUMENTOS' : 'Trazabilidad navegable');
    panel.classList.toggle('detail-document', !!detailDoc);
    panel.classList.toggle('detail-compensation', target.type === 'documentCompensation');
    if (previousBack) panel.children[1].replaceWith(previousBack);
    lines.forEach(([k, v]) => {
      const line = document.createElement('div');
      line.className = 'trace-line';
      const strong = document.createElement('strong');
      strong.textContent = k;
      const span = document.createElement('span');
      if (v instanceof Node) span.appendChild(v);
      else span.textContent = v;
      line.append(strong, span);
      panel.appendChild(line);
    });
    if (detailDoc) {
      panel.appendChild(auditHistory('document', detailDoc.id));
      panel.appendChild(documentFinancialDiagnosticPanel(detailDoc.id));
      const purchase = (state.livestockTrades || []).find((trade) => trade.type === 'purchase' && trade.documentId === detailDoc.id);
      if (purchase) {
        if (!detailDoc.voidedAt && !purchase.voidedAt) panel.appendChild(actionGroup([
          { label: 'Corregir categoria de compra', fn: () => correctLivestockPurchaseCategory(purchase.id) }
        ]));
      }
    }
    if (target.type === 'livestockCategoryChange') {
      const change = Core.livestockCategoryChange(state, target.id);
      panel.appendChild(auditHistory('livestockCategoryChange', target.id));
      if (!change.voidedAt) panel.appendChild(actionGroup([
        { label: 'Editar cambio de categoria', fn: () => editLivestockCategoryChange(target.id) },
        { label: 'Anular cambio de categoria', fn: () => voidLivestockCategoryChange(target.id) }
      ]));
    }
    if (target.type === 'document' && !state.documents.find((doc) => doc.id === target.id)?.voidedAt) {
      const context = documentOrderApplicationContext(target.id);
      if (context && context.commercialPending > 0.01 && (context.free > 0.01 || context.continuable.length)) {
        const label = Core.documentDirection(context.doc, state) === 'in' ? 'Definir cobro' : 'Definir pago';
        panel.appendChild(actionGroup([{ label, fn: () => prepareOrderFromDocument(target.id) }]));
      }
      panel.appendChild(actionGroup([{ label: 'Solicitar compensación', fn: () => compensateDocumentsFrom(target.id) }]));
      if (detailDoc.type === 'debit_note' && detailDoc.currency === 'ARS' && Core.documentDirection(detailDoc, state) === 'out') panel.appendChild(actionGroup([{ label: 'Vincular facturas origen (informativo)', fn: () => editDebitNoteInvoiceLinks(detailDoc.id) }]));
      if (Core.documentDirection(detailDoc, state) === 'in') panel.appendChild(actionGroup([{ label: 'Corregir cobro y compensar', fn: () => correctCollectionAndCompensateFrom(target.id) }]));
      panel.appendChild(actionGroup([{ label: 'Vincular orden existente', fn: () => linkExistingOrderFromDocument(target.id) }]));
      panel.appendChild(actionGroup([{ label: 'Eliminar documento', fn: () => reviewDocumentRemoval(target.id) }]));
      panel.appendChild(actionGroup([{ label: 'Editar', fn: () => openDocumentEditor(target.id, false) }]));
    }
    if (target.type === 'grainLiquidation') {
      const liquidation = state.grainLiquidations?.find((item) => item.id === target.id && !item.voidedAt);
      const credit = liquidation && state.documents.find((doc) => doc.id === liquidation.documentId && !doc.voidedAt);
      if (credit?.currency === 'ARS' && Core.documentDirection(credit, state) === 'in' && Core.documentBreakdown(state, credit.id).nonInstrumented > 0) {
        panel.appendChild(actionGroup([{ label: 'Conciliar con proveedor', fn: () => reconcileGrainLiquidation(liquidation.id) }]));
      }
    }
    if (target.type === 'documentCompensation' && (state.documentCompensations || []).some((item) => item.id === target.id)) {
      panel.appendChild(auditHistory('documentCompensation', target.id));
      const item = state.documentCompensations.find((record) => record.id === target.id);
      if (Core.compensationStatus(item) !== 'cancelled' && !item.reconciliationId) panel.appendChild(actionGroup([{ label: 'Editar', fn: () => editDocumentCompensation(target.id) }]));
      if (Core.compensationStatus(item) === 'requested') panel.appendChild(actionGroup([
        { label: 'Confirmar', fn: () => transitionDocumentCompensation(item.id, 'confirmed') },
        { label: 'Anular solicitud', fn: () => transitionDocumentCompensation(item.id, 'cancelled') }
      ]));
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function existingOrderLinkChoices(documentId) {
    const doc = state.documents.find((item) => item.id === documentId && !item.voidedAt);
    if (!doc) return [];
    const type = Core.documentDirection(doc, state) === 'out' ? 'payment' : 'collection';
    return state.orderDocuments.filter((link) => {
      const order = state.orders.find((item) => item.id === link.orderId);
      return !link.voidedAt && link.documentId !== doc.id && link.amountApplied > 0 && order && !order.voidedAt && order.entityId === doc.entityId && order.type === type && state.documents.some((item) => item.id === link.documentId && !item.voidedAt);
    }).map((link) => {
      const order = state.orders.find((item) => item.id === link.orderId);
      const source = state.documents.find((item) => item.id === link.documentId);
      const instruments = state.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt).map((item) => state.instruments.find((instrument) => instrument.id === item.instrumentId)).filter(Boolean);
      const means = instruments.length ? instruments.map((instrument) => `${instrumentDisplayName(instrument)} · ${formatMoney(instrument.amount, instrument.currency)} · vence ${formatDate(instrument.scheduledDate)} · ${labelForStatus(instrument.status)}`).join(' / ') : 'Sin instrumento';
      const orderTotal = state.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt).reduce((sum, item) => sum + item.amountApplied, 0);
      return { value: link.id, label: `${orderDisplayCode(order)} · ${formatDate(order.date)} · total ${formatMoney(orderTotal, order.currency)} · origen ${formatMoney(link.amountApplied, link.currency)} · ${means} · ${documentDisplayLabel(source)}` };
    });
  }

  function existingOrderLinkPayload(documentId, source, values) {
    const order = state.orders.find((item) => item.id === source.orderId);
    const doc = state.documents.find((item) => item.id === documentId);
    const cross = order.currency !== doc.currency;
    const payload = { orderId: order.id, sourceOrderDocumentId: source.id, documentId,
      expectedSourceDocumentId: source.documentId, expectedSourceAmount: source.amountApplied,
      amountApplied: parseLocaleNumber(values.amountApplied) };
    if (cross) payload.instrumentApplications = state.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt).map((item) => ({
      orderInstrumentId: item.id, commercialAmount: parseLocaleNumber(values[`commercial-${item.id}`]),
      exchangeRate: Number(values[`rate-${item.id}`]), exchangeRateDate: values[`rateDate-${item.id}`],
      exchangeRateReference: values[`rateRef-${item.id}`], exchangeRateSource: 'commercialAmount'
    }));
    else payload.settlementAllocations = state.orderDocumentSettlements.filter((item) => item.orderDocumentId === source.id && !item.voidedAt).map((item) => ({ settlementId: item.id, amount: parseLocaleNumber(values[`settlement-${item.id}`]) })).filter((item) => item.amount !== 0);
    return payload;
  }

  function existingOrderLinkPreviewPanel(preview) {
    const box = document.createElement('div');
    box.className = 'table-wrap wide-section';
    const source = state.documents.find((item) => item.id === preview.sourceDocumentId);
    const target = state.documents.find((item) => item.id === preview.targetDocumentId);
    const rows = [[source, preview.sourceBefore, preview.sourceAfter], [target, preview.targetBefore, preview.targetAfter]];
    box.innerHTML = `<table><thead><tr><th>Documento</th><th>Asignado antes / después</th><th>Saldo comercial antes / después</th><th>Sin medio antes / después</th></tr></thead><tbody>${rows.map(([doc, before, after]) => `<tr><td>${escapeHtml(documentDisplayLabel(doc))}</td><td class="num">${formatMoney(before.assigned, doc.currency)} / ${formatMoney(after.assigned, doc.currency)}</td><td class="num">${formatMoney(doc.amount - before.commercialCancelled, doc.currency)} / ${formatMoney(doc.amount - after.commercialCancelled, doc.currency)}</td><td class="num">${formatMoney(before.nonInstrumented, doc.currency)} / ${formatMoney(after.nonInstrumented, doc.currency)}</td></tr>`).join('')}</tbody></table>`;
    const changes = document.createElement('p');
    changes.textContent = `${preview.orderNumber}: asignado a otros documentos ${formatMoney(preview.assignedElsewhere, preview.previousCurrency)}; sin instrumentar antes ${formatMoney(preview.previousUninstrumented, preview.previousCurrency)}. Moneda comercial ${preview.previousCurrency} → ${preview.currency}. Vínculos antes: ${preview.before.orderDocuments.map((item) => `${item.id} → ${item.documentId}`).join('; ')}. Después: ${preview.after.orderDocuments.map((item) => `${preview.before.orderDocuments.some((old) => old.id === item.id) ? item.id : 'Nuevo vínculo'} → ${item.documentId}`).join('; ')}. Settlements: ${preview.before.settlements.length} → ${preview.after.settlements.length} (una división conserva el original y agrega sólo la parte trasladada). ${preview.warning}`;
    box.appendChild(changes);
    const detail = document.createElement('div');
    const ids = [...new Set([...preview.before.settlements, ...preview.after.settlements].map((item) => item.id))];
    const describe = (entry, snapshot) => {
      if (!entry) return 'Sin vínculo';
      const link = snapshot.orderDocuments.find((item) => item.id === entry.orderDocumentId);
      const doc = state.documents.find((item) => item.id === link?.documentId);
      return `${doc ? documentDisplayLabel(doc) : entry.orderDocumentId} · ${formatMoney(entry.amount, entry.currency)}`;
    };
    detail.innerHTML = `<table><thead><tr><th>Imputación</th><th>Antes</th><th>Después</th><th>Instrumento (sin cambios)</th><th>TC aplicado</th></tr></thead><tbody>${ids.map((id) => {
      const before = preview.before.settlements.find((item) => item.id === id), after = preview.after.settlements.find((item) => item.id === id);
      const oi = preview.after.orderInstruments.find((item) => item.id === (after || before).orderInstrumentId);
      const instrument = state.instruments.find((item) => item.id === oi?.instrumentId);
      return `<tr><td>${escapeHtml(before ? id : 'Nueva parte de imputación')}</td><td>${escapeHtml(describe(before, preview.before))}</td><td>${escapeHtml(describe(after, preview.after))}</td><td>${escapeHtml(`${instrumentDisplayName(instrument)} · ${formatMoney(instrument.amount, instrument.currency)} · ${labelForStatus(instrument.status)} · ${formatDate(instrument.executedDate || instrument.scheduledDate)}`)}</td><td>${oi.exchangeRate ? escapeHtml(`${oi.exchangeRate} ${oi.currency}/${oi.commercialCurrency} · ${formatDate(oi.exchangeRateDate)} · ${oi.exchangeRateReference} · diferencia nominal ${formatMoney(oi.roundingDifference, oi.currency)}`) : 'Misma moneda'}</td></tr>`;
    }).join('')}</tbody></table>`;
    box.appendChild(detail);
    return box;
  }

  function existingOrderLinksPreviewPanel(preview) {
    const box = document.createElement('div');
    box.className = 'table-wrap wide-section';
    const target = state.documents.find((item) => item.id === preview.targetDocumentId);
    box.innerHTML = `<table><thead><tr><th>OP/OC</th><th>Importe a vincular</th><th>Moneda</th></tr></thead><tbody>${preview.previews.map((item) => `<tr><td>${escapeHtml(item.orderNumber)}</td><td class="num">${formatMoney(item.amountApplied, item.currency)}</td><td>${escapeHtml(item.currency)}</td></tr>`).join('')}<tr><th>Total</th><th class="num">${formatMoney(preview.totalAmountApplied, preview.currency)}</th><th>${escapeHtml(preview.currency)}</th></tr></tbody></table>`;
    const summary = document.createElement('p');
    summary.textContent = `${documentDisplayLabel(target)}: saldo comercial ${formatMoney(target.amount - preview.targetBefore.commercialCancelled, target.currency)} → ${formatMoney(target.amount - preview.targetAfter.commercialCancelled, target.currency)}; libre para asignar ${formatMoney(target.amount - preview.targetBefore.assigned, target.currency)} → ${formatMoney(target.amount - preview.targetAfter.assigned, target.currency)}. Los documentos de origen no se eliminan ni se anulan. Ningún instrumento nominal cambia.`;
    box.appendChild(summary);
    return box;
  }

  function offerArtificialDocumentCleanup(sourceDocumentIds) {
    const panel = document.getElementById('recordDetailPanel');
    [...new Set(sourceDocumentIds)].forEach((id) => {
      const preview = Core.documentRemovalPreview(state, id);
      if (!preview.allowed || !['artificial-cleanup', 'reassigned-source'].includes(preview.kind)) return;
      const notice = document.createElement('p');
      notice.className = 'muted';
      notice.textContent = `Documento origen ${preview.document.number || id} quedó sin relaciones y es elegible para retiro protegido. No se retirará automáticamente; abrí su ficha y usá Eliminar documento.`;
      panel.appendChild(notice);
    });
  }

  async function reviewDocumentRemoval(documentId) {
    const preview = Core.documentRemovalPreview(state, documentId);
    if (!preview.allowed) {
      const notice = document.createElement('p');
      notice.className = 'fatal';
      notice.textContent = `No se puede eliminar: ${preview.blockers.join('; ')}`;
      document.getElementById('recordDetailPanel')?.appendChild(notice);
      notice.scrollIntoView({ block: 'nearest' });
      return;
    }
    const doc = state.documents.find((item) => item.id === documentId);
    let description;
    if (preview.kind === 'normal-delete') {
      description = `${Core.entityName(state, doc.entityId)} · ${doc.number || doc.id} · ${formatDate(doc.issueDate)} · ${formatMoney(doc.amount, doc.currency)}. Se retirarán ${preview.records.documents.length} documento(s), ${preview.records.orders.length} orden(es), ${preview.records.instruments.length} instrumento(s) ya anulados y sus vínculos técnicos. Una copia íntegra quedará en auditoría. Esta acción no equivale a anular.`;
    } else if (preview.kind === 'artificial-cleanup') {
      description = `Documento artificial ${documentDisplayLabel(doc)} · ${Core.entityName(state, doc.entityId)} · ${formatMoney(doc.amount, doc.currency)}. Su OP/OC fue reasignada a un comprobante migrado real. Se inactivará sólo este documento y se conservará íntegro el historial. No habrá borrado físico.`;
    } else {
      const proof = preview.proof;
      const target = state.documents.find((item) => item.id === proof.targetDocumentId);
      description = `Documento origen ${documentDisplayLabel(doc)} (${Core.entityName(state, doc.entityId)}, ${formatMoney(doc.amount, doc.currency)}) → ${proof.orderNumber} (${formatMoney(proof.amount, proof.currency)}) → Documento destino ${documentDisplayLabel(target)} (${Core.entityName(state, target.entityId)}, ${formatMoney(target.amount, target.currency)}). Reasignación auditada y conciliada. Se inactivará sólo el documento origen, sin borrado físico. La factura destino, la OP/OC, los instrumentos y Banco/Caja no serán modificados. El saldo de este documento dejará de proyectarse en Flujo.`;
    }
    await requestEditAction({ title: 'Eliminar documento', description,
      fields: [{ name: 'reason', label: 'Motivo obligatorio', required: true }], submitLabel: 'Confirmar', onSubmit: async (values) => {
        await postTransaction({ action: 'deleteDocument', id: documentId, reason: values.reason });
        if (preview.kind !== 'normal-delete') navigateTarget({ type: 'document', id: documentId });
      } });
  }

  async function linkMultipleExistingOrders(documentId, sources) {
    const doc = state.documents.find((item) => item.id === documentId);
    const breakdown = Core.documentBreakdown(state, documentId);
    const free = Math.max(doc.amount - breakdown.assigned, 0);
    const fields = [];
    for (const source of sources) {
      const order = state.orders.find((item) => item.id === source.orderId);
      const prefix = `${source.id}--`;
      const cross = order.currency !== doc.currency;
      fields.push({ name: `${prefix}amountApplied`, label: `${orderDisplayCode(order)} · importe a vincular (${doc.currency})`, money: true, value: formatDecimal(cross ? free : Math.min(free, source.amountApplied), 2), required: true });
      const instruments = state.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt);
      if (cross) for (const oi of instruments) {
        const instrument = state.instruments.find((item) => item.id === oi.instrumentId);
        const rate = documentExchangeRateSuggestion(doc, instrument.currency);
        fields.push({ name: `${prefix}commercial-${oi.id}`, label: `${orderDisplayCode(order)} · ${instrumentDisplayName(instrument)} · imputación (${doc.currency})`, money: true, required: true },
          { name: `${prefix}rate-${oi.id}`, label: `TC ${instrument.currency}/${doc.currency} (editable)`, type: 'number', step: 'any', min: '0', value: rate?.rate || '', required: true },
          { name: `${prefix}rateDate-${oi.id}`, label: 'Fecha del TC acordado', type: 'date', value: existingOrderExchangeRateDate(doc, rate), required: true },
          { name: `${prefix}rateRef-${oi.id}`, label: 'Referencia del acuerdo de TC', required: true });
      } else for (const settlement of state.orderDocumentSettlements.filter((item) => item.orderDocumentId === source.id && !item.voidedAt)) {
        const oi = instruments.find((item) => item.id === settlement.orderInstrumentId);
        fields.push({ name: `${prefix}settlement-${settlement.id}`, label: `${orderDisplayCode(order)} · ${instrumentDisplayName(oi?.instrumentId)} · imputación a trasladar (0 conserva origen)`, money: true, value: formatDecimal(settlement.amount, 2), required: true });
      }
    }
    let payload, preview;
    const values = await requestEditAction({ title: 'Conciliar órdenes existentes', description: `${sources.length} OP/OC seleccionadas. Saldo comercial ${formatMoney(doc.amount - breakdown.commercialCancelled, doc.currency)}; libre para asignar ${formatMoney(free, doc.currency)}. Cada importe se valida en su moneda comercial; los instrumentos mantienen su nominal.`, fields, submitLabel: 'Ver conciliación', onSubmit: (input) => {
      payload = { links: sources.map((source) => {
        const prefix = `${source.id}--`;
        const local = Object.fromEntries(Object.entries(input).filter(([name]) => name.startsWith(prefix)).map(([name, value]) => [name.slice(prefix.length), value]));
        return existingOrderLinkPayload(documentId, source, local);
      }) };
      preview = Core.existingOrderLinksPreview(state, payload);
      if (!preview.allowed) throw new Error(preview.blockers.join('; '));
    } });
    if (!values) return;
    const reviewedState = state, reviewedVersion = stateVersion;
    const confirmation = requestEditAction({ title: 'Confirmar vinculación múltiple', description: `${sources.length} OP/OC · total ${formatMoney(preview.totalAmountApplied, preview.currency)}. Una sola transacción; si alguna falla, no se aplica ninguna.`, fields: [{ name: 'reason', label: 'Motivo obligatorio', required: true }], submitLabel: 'Confirmar vínculos', onSubmit: async (input) => {
      if (state !== reviewedState || stateVersion !== reviewedVersion) throw new Error('La base cambió después de la conciliación. Revise nuevamente los vínculos.');
      await postTransaction({ action: 'linkExistingOrders', payload: { ...payload, reason: input.reason } });
      navigateTarget({ type: 'document', id: documentId });
      offerArtificialDocumentCleanup(sources.map((item) => item.documentId));
    } });
    document.getElementById('editActionFields').prepend(existingOrderLinksPreviewPanel(preview));
    await confirmation;
  }

  async function linkExistingOrderFromDocument(documentId) {
    const doc = state.documents.find((item) => item.id === documentId && !item.voidedAt);
    if (!doc) return;
    const choices = existingOrderLinkChoices(documentId);
    if (!choices.length) {
      const notice = document.createElement('p');
      notice.className = 'fatal';
      notice.textContent = 'No hay órdenes activas de esta contraparte y sentido comercial con asignaciones para trasladar.';
      document.getElementById('recordDetailPanel')?.appendChild(notice);
      return;
    }
    const selected = await requestEditAction({ title: 'Vincular orden existente', description: `${documentDisplayLabel(doc)}. Seleccione una o varias OP/OC existentes. No se crean pagos ni se elimina el documento anterior.`, fields: [{ name: 'sourceOrderDocumentIds', label: 'Órdenes y asignaciones de origen', type: 'checkboxes', options: choices, required: true }], submitLabel: 'Revisar asignación', onSubmit: (input) => {
      if (!input.sourceOrderDocumentIds?.length) throw new Error('Seleccione al menos una OP/OC.');
    } });
    if (!selected) return;
    const selectedIds = selected.sourceOrderDocumentIds || [];
    const sources = selectedIds.map((id) => state.orderDocuments.find((item) => item.id === id));
    if (sources.length > 1) return linkMultipleExistingOrders(documentId, sources);
    const source = sources[0];
    const order = state.orders.find((item) => item.id === source?.orderId);
    if (!order || !source) return;
    const cross = order.currency !== doc.currency;
    const breakdown = Core.documentBreakdown(state, doc.id);
    const free = Math.max(doc.amount - breakdown.assigned, 0);
    const fields = [{ name: 'amountApplied', label: `Asignación al documento (${doc.currency})`, money: true, value: formatDecimal(cross ? free : Math.min(free, source.amountApplied), 2), required: true }];
    const instruments = state.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt);
    const nominal = instruments.map((oi) => {
      const instrument = state.instruments.find((item) => item.id === oi.instrumentId);
      return `${instrumentDisplayName(instrument)} · nominal ${formatMoney(instrument.amount, instrument.currency)} · ${labelForStatus(instrument.status)} · ${formatDate(instrument.executedDate || instrument.scheduledDate)}`;
    }).join('; ');
    if (cross) instruments.forEach((oi) => {
      const instrument = state.instruments.find((item) => item.id === oi.instrumentId);
      const rate = documentExchangeRateSuggestion(doc, instrument.currency);
      fields.push({ name: `commercial-${oi.id}`, label: `${instrumentDisplayName(instrument)}: imputación (${doc.currency})`, money: true, value: instrument.currency === doc.currency ? formatDecimal(instrument.amount, 2) : '', required: true },
        { name: `rate-${oi.id}`, label: `TC ${instrument.currency}/${doc.currency} (editable)`, type: 'number', step: 'any', min: '0', value: rate?.rate || (instrument.currency === doc.currency ? 1 : ''), required: true },
        { name: `rateDate-${oi.id}`, label: 'Fecha del TC acordado', type: 'date', value: existingOrderExchangeRateDate(doc, rate), required: true },
        { name: `rateRef-${oi.id}`, label: 'Referencia del acuerdo de TC', required: true });
    });
    else state.orderDocumentSettlements.filter((item) => item.orderDocumentId === source.id && !item.voidedAt).forEach((settlement) => {
      const oi = instruments.find((item) => item.id === settlement.orderInstrumentId);
      const instrument = state.instruments.find((item) => item.id === oi?.instrumentId);
      fields.push({ name: `settlement-${settlement.id}`, label: `${instrumentDisplayName(instrument)}: imputación a trasladar (${doc.currency}; 0 conserva origen)`, money: true, value: formatDecimal(settlement.amount, 2), required: true });
    });
    let payload, preview;
    const values = await requestEditAction({ title: `Reasignar vínculo de ${orderDisplayCode(order)}`, description: `Saldo comercial ${formatMoney(doc.amount - breakdown.commercialCancelled, doc.currency)}; libre para asignar ${formatMoney(free, doc.currency)}. Origen disponible ${formatMoney(source.amountApplied, source.currency)}. ${nominal || 'Sin instrumentos.'} ${cross ? 'El cambio de moneda requiere trasladar toda la orden; indique cada conversión explícitamente. La asignación debe coincidir con la suma de imputaciones de los instrumentos. El TC de factura es sólo una sugerencia.' : 'Para una asignación parcial indique qué parte de cada pago se traslada; el nominal no cambia.'}`, fields, submitLabel: 'Ver conciliación', onSubmit: (input) => {
      payload = existingOrderLinkPayload(documentId, source, input);
      preview = Core.existingOrderLinkPreview(state, payload);
      if (!preview.allowed) throw new Error(preview.blockers.join('; '));
    } });
    if (!values) return;
    const reviewedState = state, reviewedVersion = stateVersion;
    const confirmation = requestEditAction({ title: 'Confirmar reasignación documental', description: `Aplicar ${formatMoney(preview.amountApplied, preview.currency)} mediante ${preview.orderNumber}. Los instrumentos conservan identidad, nominal, estado y fechas.`, fields: [{ name: 'reason', label: 'Motivo obligatorio', required: true }], submitLabel: 'Confirmar vínculo', onSubmit: async (input) => {
      if (state !== reviewedState || stateVersion !== reviewedVersion) throw new Error('La base cambio despues de la conciliacion. Cancele y revise nuevamente los vinculos antes de confirmar.');
      await postTransaction({ action: 'linkExistingOrder', payload: { ...payload, reason: input.reason } });
      navigateTarget({ type: 'order', id: order.id });
      offerArtificialDocumentCleanup([source.documentId]);
    } });
    document.getElementById('editActionFields').prepend(existingOrderLinkPreviewPanel(preview));
    await confirmation;
  }

  async function compensateDocumentsFrom(documentId) {
    const source = state.documents.find((doc) => doc.id === documentId);
    if (!source) return;
    const direction = Core.documentDirection(source, state);
    const sourceFree = Core.documentBreakdown(state, source.id)?.nonInstrumented || 0;
    const candidates = state.documents.filter((doc) => !doc.voidedAt && doc.id !== source.id && doc.entityId === source.entityId && (doc.currency === source.currency || (direction === 'out' ? source.currency === 'USD' && doc.currency === 'ARS' : source.currency === 'ARS' && doc.currency === 'USD')) && Core.documentDirection(doc, state) !== direction && (Core.documentBreakdown(state, doc.id)?.nonInstrumented || 0) > 0.009);
    if (sourceFree < 0.01 || !candidates.length) {
      const notice = document.createElement('p');
      notice.className = 'fatal';
      notice.textContent = sourceFree < 0.01 ? 'Este documento no tiene saldo libre para compensar.' : 'No hay documentos compatibles con saldo libre de la misma contraparte.';
      document.getElementById('recordDetailPanel')?.appendChild(notice);
      return;
    }
    const selection = await requestEditAction({ title: 'Seleccionar contrapartida', fields: [
      { name: 'oppositeDocumentId', label: 'Documento de sentido contrario', type: 'select', options: candidates.map((doc) => ({ value: doc.id, label: `${documentDisplayLabel(doc)} · ${formatMoney(Core.documentBreakdown(state, doc.id).nonInstrumented, doc.currency)}` })), required: true }
    ], submitLabel: 'Continuar' });
    if (!selection) return;
    const opposite = candidates.find((doc) => doc.id === selection.oppositeDocumentId);
    if (!opposite) return;
    const credit = direction === 'in' ? source : opposite, debt = direction === 'out' ? source : opposite;
    const cross = credit.currency !== debt.currency;
    const creditFree = Core.documentBreakdown(state, credit.id).nonInstrumented;
    const debtFree = Core.documentBreakdown(state, debt.id).nonInstrumented;
    const values = await requestEditAction({ title: 'Solicitar compensación', description: `${documentDisplayLabel(debt)} · deuda ${formatMoney(debtFree, debt.currency)}. ${documentDisplayLabel(credit)} · crédito ${formatMoney(creditFree, credit.currency)}. La solicitud no cancela ni reserva saldos. ${cross ? 'TC explícito: si la diferencia cambiaria se documenta con ND, aplicá el TC base acordado y cancelá la ND por separado. No se calculará ni creará una ND.' : ''}`, fields: [
      { name: 'amount', label: `Importe aplicado del crédito (${credit.currency})`, value: cross ? '' : formatDecimal(Math.min(creditFree, debtFree), 2), money: true, required: true },
      ...(cross ? [
        { name: 'debtAmount', label: 'Importe USD de factura a cancelar', money: true, required: true },
        { name: 'exchangeRate', label: 'TC acordado (ARS/USD)', value: '', required: true },
      ] : []),
      { name: 'date', label: 'Fecha', type: 'date', value: Core.todayIso(), required: true },
      { name: 'reference', label: 'Referencia' },
      { name: 'notes', label: 'Observaciones' },
      { name: 'reason', label: 'Motivo', required: true }
    ], submitLabel: 'Registrar solicitud', onSubmit: async (values) => {
      await postTransaction({ action: 'createDocumentCompensation', payload: {
        status: 'requested',
        creditDocumentId: credit.id,
        debtDocumentId: debt.id,
        ...(cross ? { debtAmount: parseLocaleNumber(values.debtAmount), exchangeRate: parseLocaleNumber(values.exchangeRate) } : {}),
        amount: parseLocaleNumber(values.amount), date: values.date, reference: values.reference, notes: values.notes, reason: values.reason
      } });
      showTrace({ type: 'document', id: source.id }, true);
    } });
  }

  async function correctCollectionAndCompensateFrom(documentId) {
    const credit = state.documents.find((doc) => doc.id === documentId && !doc.voidedAt);
    if (!credit || Core.documentDirection(credit, state) !== 'in') return;
    const debtOptions = state.documents.filter((doc) => !doc.voidedAt && doc.entityId === credit.entityId && doc.currency === credit.currency && Core.documentDirection(doc, state) === 'out' && (Core.documentBreakdown(state, doc.id)?.nonInstrumented || 0) > 0.009);
    const instrumentOptions = state.instruments.filter((instrument) => !instrument.voidedAt && instrument.type === 'transfer' && instrument.direction === 'in' && Core.instrumentIsBankRealized(instrument) && instrument.entityId === credit.entityId && instrument.currency === credit.currency && state.orderDocumentSettlements.some((settlement) => !settlement.voidedAt && state.orderInstruments.some((link) => !link.voidedAt && link.instrumentId === instrument.id && link.id === settlement.orderInstrumentId && state.orderDocuments.some((orderDoc) => !orderDoc.voidedAt && orderDoc.id === settlement.orderDocumentId && orderDoc.documentId === credit.id))));
    if (!debtOptions.length || !instrumentOptions.length) {
      const notice = document.createElement('p');
      notice.className = 'fatal';
      notice.textContent = !instrumentOptions.length ? 'No hay una transferencia realizada vinculada a este documento que pueda revisarse.' : 'No hay un documento de egreso con saldo libre de la misma contraparte y moneda.';
      document.getElementById('recordDetailPanel')?.appendChild(notice);
      return;
    }
    let preview;
    const values = await requestEditAction({ title: 'Corregir cobro y compensar', description: `${documentDisplayLabel(credit)} · ${Core.entityName(state, credit.entityId)}. Primero se revisarán todos los efectos; todavía no se guardará nada.`, fields: [
      { name: 'instrumentId', label: 'Transferencia cobrada por error', type: 'select', options: instrumentOptions.map((instrument) => ({ value: instrument.id, label: `${instrument.reference || 'Transferencia'} · ${formatMoney(instrument.amount, instrument.currency)} · ${formatDate(instrument.executedDate || instrument.scheduledDate)}` })), required: true },
      { name: 'debtDocumentId', label: 'Documento a compensar', type: 'select', options: debtOptions.map((doc) => ({ value: doc.id, label: `${documentDisplayLabel(doc)} · ${formatMoney(Core.documentBreakdown(state, doc.id).nonInstrumented, doc.currency)}` })), required: true },
      { name: 'amount', label: 'Importe a compensar', value: formatDecimal(Math.min(instrumentOptions[0].amount, Core.documentBreakdown(state, debtOptions[0].id).nonInstrumented), 2), money: true, required: true },
      { name: 'date', label: 'Fecha de compensación', type: 'date', value: Core.todayIso(), required: true },
      { name: 'reference', label: 'Referencia' },
      { name: 'reason', label: 'Motivo obligatorio', required: true }
    ], submitLabel: 'Revisar efectos', onSubmit: async (input) => {
      const payload = { ...input, creditDocumentId: credit.id, amount: parseLocaleNumber(input.amount) };
      const after = Core.correctCollectionAndCompensateTransaction(state, payload, 'vista previa');
      preview = { payload, before: state, after };
    } });
    if (!values || !preview) return;
    const { payload, before, after } = preview;
    const instrument = before.instruments.find((item) => item.id === payload.instrumentId);
    const debt = before.documents.find((item) => item.id === payload.debtDocumentId);
    const accountBefore = Core.accountBalances(before).find((item) => item.id === instrument.financialAccountId);
    const accountAfter = Core.accountBalances(after).find((item) => item.id === instrument.financialAccountId);
    const balance = (snapshot, doc) => Core.documentBreakdown(snapshot, doc.id).nonInstrumented;
    const reviewedVersion = stateVersion;
    const charges = Core.bankChargeReversalDetails(before, instrument.id).charges;
    const confirmation = requestEditAction({ title: 'Confirmar corrección y compensación', description: 'Se guardarán juntos la reversa, la anulación y la compensación. Si falla una validación, no se guardará ningún cambio.', wideReview: true, fields: [
      { name: 'confirm', label: 'Confirmación explícita', type: 'checkboxes', options: [{ value: 'yes', label: 'Confirmo que no existió el cobro bancario y que ambos documentos deben compensarse' }] }
    ], submitLabel: 'Confirmar y guardar', onSubmit: async (input) => {
      if (!input.confirm?.includes('yes')) throw new Error('Confirme expresamente la corrección antes de guardar');
      if (state !== before || stateVersion !== reviewedVersion) throw new Error('La base cambió desde la vista previa. Cancele y revise nuevamente los efectos.');
      await postTransaction({ action: 'correctCollectionAndCompensate', payload });
      showTrace({ type: 'document', id: credit.id }, true);
    } });
    const summary = document.createElement('div');
    summary.className = 'financial-correction-preview';
    const heading = (title) => {
      const node = document.createElement('h4');
      node.textContent = title;
      summary.appendChild(node);
    };
    const line = (label, value) => {
      const row = document.createElement('div');
      row.className = 'trace-line';
      const strong = document.createElement('strong');
      strong.textContent = label;
      const text = document.createElement('span');
      text.textContent = value;
      row.append(strong, text);
      summary.appendChild(row);
    };
    heading('Transferencia que se revierte');
    line('Instrumento', `${instrumentDisplayName(instrument)} · ID ${instrument.id}`);
    line('Importe y fecha', `${formatMoney(instrument.amount, instrument.currency)} · ${formatDate(instrument.executedDate || instrument.scheduledDate)}`);
    line('Cuenta', accountBefore?.name || instrument.financialAccountId);
    heading('Cargos automáticos asociados que se retiran');
    if (!charges.length) line('Cargos', 'Ninguno');
    else {
      const scroll = document.createElement('div');
      scroll.className = 'bank-reversal-charges-scroll';
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const header = document.createElement('tr');
      ['ID cargo', 'Instrumento de origen', 'Fecha', 'Importe', 'Cuenta', 'Automático', 'Vínculo'].forEach((value) => {
        const cell = document.createElement('th');
        cell.textContent = value;
        header.appendChild(cell);
      });
      head.appendChild(header);
      table.appendChild(head);
      const body = document.createElement('tbody');
      charges.forEach((charge) => {
        const row = document.createElement('tr');
        const values = [charge.id, `${instrumentDisplayName(instrument)} · ${charge.instrumentId}`, formatDate(charge.date), formatMoney(charge.amount, charge.currency), accountBefore?.name || charge.financialAccountId, 'Sí', `instrumentId = ${instrument.id}`];
        values.forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });
        body.appendChild(row);
      });
      table.appendChild(body);
      scroll.appendChild(table);
      summary.appendChild(scroll);
    }
    heading('Efecto neto sobre Banco/Caja');
    line('Saldo antes → después', `${formatMoney(accountBefore?.realBalance || 0, instrument.currency)} → ${formatMoney(accountAfter?.realBalance || 0, instrument.currency)}`);
    line('Variación neta', formatMoney((accountAfter?.realBalance || 0) - (accountBefore?.realBalance || 0), instrument.currency));
    heading('Compensación comercial, sin movimiento bancario');
    line('Documento de ingreso', `${documentDisplayLabel(credit)} · ${formatMoney(balance(before, credit), credit.currency)} → ${formatMoney(balance(after, credit), credit.currency)}`);
    line('Documento de egreso', `${documentDisplayLabel(debt)} · ${formatMoney(balance(before, debt), debt.currency)} → ${formatMoney(balance(after, debt), debt.currency)}`);
    line('Importe a compensar', formatMoney(payload.amount, credit.currency));
    document.getElementById('editActionFields').prepend(summary);
    await confirmation;
  }

  function documentBackingEditor(doc) {
    // Preserve retired classifications without offering them for new selections.
    if (Core.documentReading(doc) === 'pending_receipt') {
      return `<label>Respaldo<input value="Clasificación histórica conservada" readonly><input type="hidden" name="fiscalStatus" value="${escapeHtml(doc.fiscalStatus || '')}"></label>`;
    }
    return `<label>Respaldo<select name="fiscalStatus"><option value="documented" ${doc.fiscalStatus === 'documented' || !doc.fiscalStatus ? 'selected' : ''}>Documentado</option><option value="no_receipt" ${doc.fiscalStatus === 'no_receipt' ? 'selected' : ''}>Sin comprobante</option></select></label>`;
  }

  function documentEditForm(doc) {
    const form = document.createElement('form');
    form.className = 'instrument-edit-form document-edit-form';
    const liabilityOnly = doc.economicTreatment === 'liability_only';
    const specialized = Boolean(doc.grainLiquidationId || doc.livestockTradeId || ['grainLiquidations', 'livestockTrades', 'taxReimbursements'].some((key) => (state[key] || []).some((item) => item.documentId === doc.id)));
    form.innerHTML = `
      ${doc.type === 'no_receipt' ? `<label>Tipo de comprobante<select name="type"><option value="no_receipt">Sin comprobante</option><option value="${doc.commercialSide === 'sale' ? 'sale_invoice' : 'purchase_invoice'}">${doc.commercialSide === 'sale' ? 'Factura de venta' : 'Factura de compra'}</option></select></label>` : `<label>Tipo de comprobante<input value="${escapeHtml(labelForType(doc.type))}" readonly></label>`}
      <label>Contraparte<input value="${escapeHtml(Core.entityName(state, doc.entityId))}" readonly></label>
      <label>Moneda<input value="${escapeHtml(doc.currency)}" readonly></label>
      ${documentBackingEditor(doc)}
      <label>Número/referencia<input name="number" value="${escapeHtml(doc.number || '')}"></label>
      <label>Concepto<input name="description" value="${escapeHtml(doc.description || '')}"></label>
      <label>Fecha de emisión/obligación<input name="issueDate" type="date" value="${doc.issueDate || doc.recordDate || ''}"></label>
      <label>Vencimiento<input name="dueDate" type="date" value="${doc.dueDate || ''}"></label>
      ${doc.currency === 'USD' ? `<label>TC de factura (ARS/USD)<input name="tcInvoice" inputmode="decimal" placeholder="Opcional" value="${escapeHtml(doc.tcInvoice == null ? '' : String(doc.tcInvoice).replace('.', ','))}"></label>` : ''}
      <label>Actividad<select name="activity">${Core.ACTIVITIES.map((value) => `<option value="${escapeHtml(value)}" ${value === doc.activity ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></label>
      ${liabilityOnly ? '<label>Tratamiento<input readonly value="Obligación sin resultado económico"></label><label>Total de la obligación<input name="amount" data-money-input="true" inputmode="decimal" required value="' + formatDecimal(doc.amount, 2) + '"></label>' : `<label>Cuenta<select name="chartAccountId">${state.chartAccounts.map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === doc.chartAccountId ? 'selected' : ''}>${escapeHtml(Core.chartPath(state, account.id))}</option>`).join('')}</select></label>`}
      <details ${doc.notes ? 'open' : ''}><summary>Más datos</summary><label>Observaciones<input name="notes" value="${escapeHtml(doc.notes || '')}"></label></details>
      <p>${specialized ? 'El importe fiscal se corrige desde la operación de origen.' : 'Los campos sensibles se validan junto con sus relaciones.'}</p>
      <label>Motivo de la modificación<input name="reason"></label>
      <div class="actions"><button type="submit">Guardar cambios</button><button type="button" class="secondary">Cancelar</button></div>`;
    if (liabilityOnly) {
      wireMoneyInputs(form);
      form.querySelector('p').textContent = 'No reconoce gastos ni impuestos. Capital e intereses requieren conciliación independiente. La edición conserva el efecto económico cero.';
    }
    if (!specialized && !liabilityOnly) {
      const componentAmount = (types) => (doc.taxComponents || []).filter((item) => types.includes(item.taxType)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const currentVatRate = (doc.taxComponents || []).find((item) => item.taxType === 'vat')?.rate;
      const hasExempt = componentAmount(['exempt']) > 0;
      const hasNotTaxed = componentAmount(['not_taxed']) > 0;
      const hasUnsupportedComponents = (doc.taxComponents || []).some((item) => !['net_taxed', 'vat', 'exempt', 'not_taxed', 'perception_vat', 'perception_iibb', 'perception_other'].includes(item.taxType));
      const simpleCondition = hasUnsupportedComponents ? 'advanced' : hasExempt && !currentVatRate && !hasNotTaxed ? 'exempt' : hasNotTaxed && !currentVatRate && !hasExempt ? 'not_taxed' : [21, 10.5].includes(Number(currentVatRate)) && !hasExempt && !hasNotTaxed ? String(currentVatRate) : !currentVatRate ? '0' : 'advanced';
      const fiscal = document.createElement('div');
      fiscal.className = 'form-grid historical-fiscal-grid';
      fiscal.innerHTML = `
        <label>Modo de cálculo<select name="calculationMode"><option value="net">Calcular desde neto</option><option value="total">Calcular desde total</option></select></label>
        <label>Total fiscal<input name="amount" data-money-input="true" inputmode="decimal" required value="${formatDecimal(doc.amount, 2)}"></label>
        <label>Base / importe simple<input name="netTaxedAmount" data-money-input="true" inputmode="decimal" value="${formatDecimal(componentAmount(['net_taxed']) || componentAmount(['exempt']) || componentAmount(['not_taxed']) || doc.economicAmount || 0, 2)}"></label>
        <label>Condición fiscal / IVA<select name="fiscalCondition"><option value="0" ${simpleCondition === '0' ? 'selected' : ''}>Sin IVA</option><option value="21" ${simpleCondition === '21' ? 'selected' : ''}>IVA 21%</option><option value="10.5" ${simpleCondition === '10.5' ? 'selected' : ''}>IVA 10,5%</option><option value="exempt" ${simpleCondition === 'exempt' ? 'selected' : ''}>Exento</option><option value="not_taxed" ${simpleCondition === 'not_taxed' ? 'selected' : ''}>No gravado</option><option value="advanced" ${simpleCondition === 'advanced' ? 'selected' : ''}>Composición avanzada actual</option></select></label>
        <input name="vatRate" type="hidden" value="${currentVatRate ?? 0}">
        <label>Importe IVA<input name="vatAmount" data-money-input="true" inputmode="decimal" value="${componentAmount(['vat']) ? formatDecimal(componentAmount(['vat']), 2) : ''}"></label>
        <label class="advanced-fiscal-field">Exento<input name="exemptAmount" data-money-input="true" inputmode="decimal" value="${componentAmount(['exempt']) ? formatDecimal(componentAmount(['exempt']), 2) : ''}"></label>
        <label class="advanced-fiscal-field">No gravado<input name="notTaxedAmount" data-money-input="true" inputmode="decimal" value="${componentAmount(['not_taxed']) ? formatDecimal(componentAmount(['not_taxed']), 2) : ''}"></label>
        <label>Percepción IVA<input name="perceptionVat" data-money-input="true" inputmode="decimal" value="${componentAmount(['perception_vat']) ? formatDecimal(componentAmount(['perception_vat']), 2) : ''}"></label>
        <label>Percepción IIBB<input name="perceptionIibb" data-money-input="true" inputmode="decimal" value="${componentAmount(['perception_iibb']) ? formatDecimal(componentAmount(['perception_iibb']), 2) : ''}"></label>
        <label>Otras percepciones fiscales<input name="otherPerceptions" data-money-input="true" inputmode="decimal" value="${componentAmount(['perception_other']) ? formatDecimal(componentAmount(['perception_other']), 2) : ''}"></label>
        <label>Otros cargos<input name="otherExpenses" data-money-input="true" inputmode="decimal" value=""></label>
        <label>Otras deducciones<input name="otherDeductions" data-money-input="true" inputmode="decimal" value=""></label>`;
      form.prepend(fiscal);
      wireMoneyInputs(fiscal);
      const recalculate = () => {
        const condition = form.elements.fiscalCondition.value;
        if (condition === 'advanced') return;
        const mode = form.elements.calculationMode.value;
        const rate = ['21', '10.5'].includes(condition) ? Number(condition) : 0;
        const base = parseLocaleNumber(form.elements.netTaxedAmount.value) || 0;
        const total = parseLocaleNumber(form.elements.amount.value) || 0;
        const perceptions = (parseLocaleNumber(form.elements.perceptionVat.value) || 0) + (parseLocaleNumber(form.elements.perceptionIibb.value) || 0) + (parseLocaleNumber(form.elements.otherPerceptions.value) || 0);
        const otherCharges = parseLocaleNumber(form.elements.otherExpenses.value) || 0;
        const otherDeductions = parseLocaleNumber(form.elements.otherDeductions.value) || 0;
        const result = Core.calculateSimpleDocumentTax({ mode, netTaxedAmount: base, totalAmount: total, vatRate: rate, perceptions, otherCharges, otherDeductions });
        form.elements.vatRate.value = String(rate);
        form.elements.vatAmount.value = formatDecimal(result.vatAmount, 2);
        if (mode === 'total') form.elements.netTaxedAmount.value = formatDecimal(result.netTaxedAmount, 2);
        else form.elements.amount.value = formatDecimal(result.totalAmount, 2);
        form.elements.exemptAmount.value = condition === 'exempt' ? formatDecimal(result.netTaxedAmount, 2) : '';
        form.elements.notTaxedAmount.value = condition === 'not_taxed' ? formatDecimal(result.netTaxedAmount, 2) : '';
      };
      ['calculationMode', 'fiscalCondition', 'netTaxedAmount', 'amount', 'perceptionVat', 'perceptionIibb', 'otherPerceptions', 'otherExpenses', 'otherDeductions'].forEach((name) => form.elements[name].addEventListener('input', recalculate));
      form.elements.fiscalCondition.addEventListener('change', recalculate);
      form.querySelector('p').textContent = 'Corrección histórica: preserva documento, órdenes, instrumentos y settlements. Las retenciones sufridas al cobro se registran en la OC.';
    }
    const saveError = document.createElement('div');
    saveError.className = 'fatal hidden'; saveError.setAttribute('role', 'alert'); form.appendChild(saveError);
    form.querySelector('button[type="button"]').addEventListener('click', () => form.remove());
    const initial = Object.fromEntries(Array.from(form.querySelectorAll('[name]')).map((input) => [input.name, input.value]));
    bindPersistentSubmit(form, async (event) => {
      event.preventDefault();
      const changes = {};
      try {
        saveError.classList.add('hidden');
        const numeric = ['amount', 'netTaxedAmount', 'vatRate', 'vatAmount', 'exemptAmount', 'notTaxedAmount', 'perceptionVat', 'perceptionIibb', 'otherPerceptions', 'otherExpenses', 'otherDeductions'];
        const changed = (key) => numeric.includes(key)
          ? Math.round((parseLocaleNumber(form.elements[key]?.value || 0) || 0) * 100) !== Math.round((parseLocaleNumber(initial[key] || 0) || 0) * 100)
          : String(form.elements[key]?.value ?? '') !== String(initial[key] ?? '');
        ['fiscalStatus', 'number', 'description', 'issueDate', 'dueDate', 'activity', 'chartAccountId', 'notes', 'type'].forEach((key) => { if (form.elements[key] && changed(key)) changes[key] = form.elements[key].value; });
        if (form.elements.tcInvoice && changed('tcInvoice')) changes.tcInvoice = invoiceRateInputValue(form.elements.tcInvoice.value);
        const fiscalNames = ['amount', 'calculationMode', 'netTaxedAmount', 'vatRate', 'vatAmount', 'exemptAmount', 'notTaxedAmount', 'perceptionVat', 'perceptionIibb', 'otherPerceptions', 'otherExpenses', 'otherDeductions'];
        const fiscalChanged = form.elements.amount && [...fiscalNames, 'fiscalCondition'].some((key) => changed(key));
        if (liabilityOnly && changed('amount')) changes.amount = parseLocaleNumber(form.elements.amount.value);
        if (fiscalChanged && !liabilityOnly) {
          if (form.elements.fiscalCondition.value === 'advanced') throw new Error('La composición fiscal compleja requiere corrección específica del origen');
          fiscalNames.forEach((key) => { changes[key] = numeric.includes(key) ? Number(parseLocaleNumber(form.elements[key].value) || 0) : form.elements[key].value; });
          if (form.elements.fiscalCondition.value === 'exempt' || form.elements.fiscalCondition.value === 'not_taxed') {
            const key = form.elements.fiscalCondition.value === 'exempt' ? 'exemptAmount' : 'notTaxedAmount';
            changes[key] = changes.netTaxedAmount; changes.netTaxedAmount = 0; changes.vatRate = 0; changes.vatAmount = 0;
          }
        }
        if (changes.issueDate !== undefined && form.elements.fiscalStatus.value !== 'documented') {
          changes.recordDate = changes.issueDate;
          changes.issueDate = '';
        }
        if (!Object.keys(changes).length) { form.remove(); return; }
        const sensitive = Object.keys(changes).some((key) => !['description', 'notes'].includes(key));
        if (sensitive && !String(form.elements.reason.value || '').trim()) throw new Error('Motivo obligatorio para cambiar datos sensibles');
        changes.reason = sensitive ? form.elements.reason.value : 'Edición administrativa desde ficha de documento';
        await postTransaction({ action: 'editDocument', id: doc.id, changes });
        form.remove();
        showTrace({ type: 'document', id: doc.id }, true);
      } catch (error) { saveError.textContent = `No se pudo editar: ${error.message}`; saveError.classList.remove('hidden'); }
    });
    return form;
  }

  function addControlGroupTrace(lines, group) {
    lines.push(['Control', group.label]);
    lines.push(['Cantidad', String(group.count)]);
    const items = (group.rows || []).slice(0, 12).map((row) => {
      if (row.documentId || row.doc?.id) return traceButton(row.number || row.doc?.number || row.id, { type: 'document', id: row.documentId || row.doc.id });
      if (row.type === 'received_check' || row.type === 'own_check') return traceButton(instrumentDisplayName(row), { type: 'instrument', id: row.id });
      if (row.contractedKg) return traceButton(row.id, { type: 'grainForward', id: row.id });
      if (row.cereal && row.locationId) return traceButton(`${row.cereal} ${row.campaign} ${row.locationName}`, { type: 'grainLocation', id: row.locationId, cereal: row.cereal, campaign: row.campaign });
      return document.createTextNode(row.id || row.label || '');
    });
    lines.push(['Origenes', linkList(items, 'Sin registros')]);
  }

  function linkList(items, emptyText) {
    const wrap = document.createElement('span');
    wrap.className = 'trace-links';
    if (!items.length) {
      wrap.textContent = emptyText || 'Sin vinculos';
      return wrap;
    }
    items.forEach((item, index) => {
      if (index) wrap.appendChild(document.createTextNode(', '));
      if (item instanceof Node) wrap.appendChild(item);
      else wrap.appendChild(traceButton(item.label, item.target));
    });
    return wrap;
  }

  function auditHistory(entityType, entityId) {
    const details = document.createElement('details');
    details.className = 'audit-history';
    const summary = document.createElement('summary');
    summary.textContent = 'Historial de cambios';
    details.appendChild(summary);
    const entries = (state.auditLog || []).filter((entry) => (entry.entityType === entityType && entry.entityId === entityId) || (entry.changes || []).some((change) => change.recordId === entityId)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Sin cambios registrados.';
      details.appendChild(empty);
      return details;
    }
    entries.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'audit-history-entry';
      const title = document.createElement('strong');
      title.textContent = `${entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-AR') : 'Fecha no registrada'} · ${entry.user || 'Usuario no registrado'} · ${entry.action || 'Cambio'}`;
      item.appendChild(title);
      (entry.changes || []).forEach((change) => {
        const line = document.createElement('div');
        const show = (value) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value);
        line.textContent = `${change.field || 'Registro'}: ${show(change.from)} → ${show(change.to)}`;
        item.appendChild(line);
      });
      if (entry.reason) {
        const reason = document.createElement('div');
        reason.textContent = `Motivo: ${entry.reason}`;
        item.appendChild(reason);
      }
      details.appendChild(item);
    });
    return details;
  }

  function documentInstrumentedAmount(inputState, breakdown) {
    return (breakdown?.details || []).filter((item) => item.instrumentId && (item.commercialCancelled || item.financialRealized || Core.instrumentIsPending(inputState.instruments.find((instrument) => instrument.id === item.instrumentId)))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function validDocumentAuditDate(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date || '') && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  }

  function documentAuditExpectedDate(doc) {
    // Diagnostic expectation only: due date, issue date, then Core's legacy record-date fallback.
    return [doc.dueDate, doc.issueDate, doc.recordDate].find(validDocumentAuditDate) || Core.todayIso();
  }

  function reconcileDocumentsFlow(inputState, projections = Core.flowRows(inputState)) {
    const balanceRows = projections.filter((row) => row.source === 'document-balance');
    const byDocument = new Map();
    balanceRows.forEach((row) => {
      if (!byDocument.has(row.documentId)) byDocument.set(row.documentId, []);
      byDocument.get(row.documentId).push(row);
    });
    const byId = new Map(inputState.documents.map((doc) => [doc.id, doc]));
    const documents = inputState.documents.filter((doc) => !doc.voidedAt).map((doc) => {
      const b = Core.documentBreakdown(inputState, doc.id);
      const projected = byDocument.get(doc.id) || [];
      const expectedDate = documentAuditExpectedDate(doc);
      const shouldProject = !!b && b.nonInstrumented >= 0.005 && Core.documentPlanProjectionEnabled(inputState, doc.id);
      const expectedAmount = shouldProject ? (Core.documentDirection(doc, inputState) === 'in' ? 1 : -1) * b.nonInstrumented : 0;
      const issues = [];
      const reasons = [];
      if (projected.length > 1) { issues.push('DUPLICADO EN FLUJO'); reasons.push(`${projected.length} document-balance para el mismo document ID.`); }
      if (!shouldProject && projected.length) { issues.push('NO DEBE PROYECTARSE'); reasons.push('No existe saldo sin instrumentar proyectable, pero Core devuelve una proyeccion.'); }
      if (shouldProject && !projected.length) { issues.push('NO APARECE EN FLUJO'); reasons.push(`Saldo sin instrumentar ${b.nonInstrumented}; no existe document-balance por ID.`); }
      if (shouldProject && projected.some((row) => !Number.isFinite(Number(row.amount)) || Math.round(Number(row.amount) * 100) !== Math.round(expectedAmount * 100))) { issues.push('IMPORTE INCORRECTO'); reasons.push(`Importe firmado esperado: ${expectedAmount}.`); }
      if (shouldProject && projected.some((row) => row.date !== expectedDate)) { issues.push('FECHA INCORRECTA'); reasons.push(`Fecha esperada: ${expectedDate}.`); }
      if (projected.some((row) => row.currency !== doc.currency)) { issues.push('MONEDA INCORRECTA'); reasons.push(`Moneda esperada: ${doc.currency}.`); }
      const result = issues[0] || (shouldProject ? 'OK' : 'NO DEBE PROYECTARSE');
      return {
        documentId: doc.id, number: doc.number || '', entityId: doc.entityId,
        entityName: Core.entityName(inputState, doc.entityId), issueDate: doc.issueDate || '', dueDate: doc.dueDate || '', currency: doc.currency,
        total: doc.amount, commercialBalance: b ? doc.amount - b.cancelled : null,
        instrumented: documentInstrumentedAmount(inputState, b), nonInstrumented: b?.nonInstrumented ?? null,
        applied: b?.assigned ?? null, expectedDate, expectedAmount, shouldProject, projectionCount: projected.length,
        projections: projected.map((row) => ({ id: row.id, amount: row.amount, currency: row.currency, date: row.date })),
        result, issues, hasDifference: issues.length > 0, reason: reasons.join(' ') || (shouldProject ? 'Coinciden ID, importe firmado, moneda y fecha.' : !Core.documentPlanProjectionEnabled(inputState, doc.id) ? 'Deuda tributaria conservada, sin cronograma activo.' : 'Saldo sin instrumentar inferior a 0.005; no corresponde document-balance.')
      };
    });
    const checked = new Map(documents.map((row) => [row.documentId, row]));
    const inverse = balanceRows.map((projection) => {
      const doc = byId.get(projection.documentId);
      const check = checked.get(projection.documentId);
      const issues = check ? [...check.issues] : [doc ? 'NO DEBE PROYECTARSE' : 'PROYECCION HUERFANA'];
      if (!check && (byDocument.get(projection.documentId)?.length || 0) > 1) issues.push('DUPLICADO EN FLUJO');
      return {
        projectionId: projection.id, documentId: projection.documentId || '', number: doc?.number || '',
        entityId: doc?.entityId || projection.entityId || '', entityName: doc ? Core.entityName(inputState, doc.entityId) : projection.entityName || '',
        amount: projection.amount, currency: projection.currency, date: projection.date,
        issueDate: doc?.issueDate || '', dueDate: doc?.dueDate || '', expectedDate: check?.expectedDate || projection.date,
        documentStatus: !doc ? 'Inexistente' : doc.voidedAt ? 'Anulado' : 'Activo',
        result: issues[0] || 'OK', issues, hasDifference: issues.length > 0,
        reason: check?.reason || (doc ? 'Proyeccion asociada a un documento anulado.' : 'El document ID no existe en el estado cargado.')
      };
    });
    return {
      documents, inverse,
      summary: { reviewed: documents.length, ok: documents.filter((row) => row.result === 'OK').length,
        differences: documents.filter((row) => row.hasDifference).length,
        noProjection: documents.filter((row) => !row.shouldProject && !row.hasDifference).length,
        projections: inverse.length, inverseDifferences: inverse.filter((row) => row.hasDifference).length }
    };
  }

  function filterDocumentFlowAuditRows(rows, filters = {}) {
    const field = ['dueDate', 'issueDate', 'expectedDate'].includes(filters.dateField) ? filters.dateField : 'expectedDate';
    return rows.filter((row) => (!filters.result || row.result === filters.result || row.issues.includes(filters.result))
      && (!filters.currency || row.currency === filters.currency)
      && (!filters.entityId || row.entityId === filters.entityId)
      && (!filters.from || row[field] && row[field] >= filters.from)
      && (!filters.to || row[field] && row[field] <= filters.to));
  }

  function renderDocumentFlowAudit() {
    const audit = reconcileDocumentsFlow(state);
    const filters = { result: valueFromInput('documentFlowAuditResult'), currency: valueFromInput('documentFlowAuditCurrency'), entityId: valueFromInput('documentFlowAuditEntity'), dateField: valueFromInput('documentFlowAuditDateField'), from: valueFromInput('documentFlowAuditFrom'), to: valueFromInput('documentFlowAuditTo') };
    const entities = [...new Map([...audit.documents, ...audit.inverse].filter((row) => row.entityId).map((row) => [row.entityId, row.entityName])).entries()];
    fillOptions('documentFlowAuditEntity', [{ value: '', label: 'Todas' }, ...entities.map(([value, label]) => ({ value, label }))], filters.entityId);
    const summary = audit.summary;
    document.getElementById('documentFlowAuditSummary').textContent = `Documentos revisados: ${summary.reviewed} | OK: ${summary.ok} | Con diferencias: ${summary.differences} | No deben proyectarse: ${summary.noProjection}`;
    document.getElementById('documentFlowAuditInverseSummary').textContent = `Proyecciones revisadas: ${summary.projections} | Con diferencias: ${summary.inverseDifferences}`;
    const date = (value) => validDocumentAuditDate(value) ? formatDate(value) : value ? `${value} (invalida)` : 'Sin fecha';
    const money = (value, currency) => value == null ? 'Sin desglose' : formatFlowMoney(value, currency);
    renderTable('documentFlowAuditTable', [
      { label: 'Document ID', value: 'documentId', className: () => 'diagnostic-id', link: (row) => ({ type: 'document', id: row.documentId }) },
      { label: 'Numero', value: 'number' }, { label: 'Entidad', value: 'entityName', className: () => 'wrap' },
      { label: 'Emision', value: (row) => date(row.issueDate) }, { label: 'Vencimiento', value: (row) => date(row.dueDate) },
      { label: 'Moneda', value: 'currency' },
      ...[['Total', 'total'], ['Saldo comercial', 'commercialBalance'], ['Instrumentado', 'instrumented'], ['Sin instrumentar', 'nonInstrumented']].map(([label, key]) => ({ label, value: (row) => money(row[key], row.currency), className: () => 'amount' })),
      { label: 'Fecha esperada', value: (row) => date(row.expectedDate) }, { label: 'Filas en Flujo', value: 'projectionCount', className: () => 'amount' },
      { label: 'Importes proyectados', value: (row) => row.projections.map((item) => money(item.amount, item.currency)).join(' / '), className: () => 'amount' },
      { label: 'Monedas proyectadas', value: (row) => row.projections.map((item) => item.currency).join(' / ') },
      { label: 'Fechas proyectadas', value: (row) => row.projections.map((item) => date(item.date)).join(' / ') },
      { label: 'Resultado', value: 'result' }, { label: 'Motivo', value: 'reason', className: () => 'wrap' }
    ], filterDocumentFlowAuditRows(audit.documents, filters));
    renderTable('documentFlowAuditInverseTable', [
      { label: 'Proyeccion ID', value: 'projectionId', className: () => 'diagnostic-id' },
      { label: 'Document ID', value: 'documentId', className: () => 'diagnostic-id', link: (row) => row.documentStatus === 'Inexistente' ? null : ({ type: 'document', id: row.documentId }) },
      { label: 'Numero', value: 'number' }, { label: 'Entidad', value: 'entityName', className: () => 'wrap' },
      { label: 'Documento', value: 'documentStatus' }, { label: 'Importe', value: (row) => money(row.amount, row.currency), className: () => 'amount' },
      { label: 'Moneda', value: 'currency' }, { label: 'Fecha proyectada', value: (row) => date(row.date) },
      { label: 'Resultado', value: 'result' }, { label: 'Motivo', value: 'reason', className: () => 'wrap' }
    ], filterDocumentFlowAuditRows(audit.inverse, filters));
  }

  function documentFinancialDiagnostics(documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) return null;
    const asOfDate = Core.todayIso();
    const breakdown = Core.documentBreakdown(state, documentId, asOfDate);
    const details = breakdown?.details || [];
    const allFlowRows = Core.flowRows(state, { asOfDate });
    const projections = allFlowRows.filter((row) => row.documentId === documentId && row.source === 'document-balance');
    const reason = projections.length
      ? 'Core.flowRows() genera document-balance por el saldo sin instrumentar.'
      : doc.voidedAt ? `Documento anulado: voidedAt=${doc.voidedAt}`
      : !breakdown ? 'Core.documentBreakdown() no devuelve un desglose para este documento.'
      : !Core.documentPlanProjectionEnabled(state, documentId) ? 'Deuda tributaria conservada en Cuenta Corriente; cronograma del plan inactivo/anulado, sin proyeccion documental automatica.'
      : breakdown.nonInstrumented < 0.005 ? `Core excluye document-balance porque nonInstrumented=${breakdown.nonInstrumented} es menor que 0.005 (cancelado=${breakdown.cancelled}; comprometido=${breakdown.committedPending}).`
      : 'Core.flowRows() no devuelve document-balance pese a un saldo sin instrumentar suficiente. Discrepancia: revisar los valores y relaciones de este diagnostico.';
    const links = state.orderDocuments.filter((item) => item.documentId === documentId);
    const linkIds = new Set(links.map((item) => item.id));
    const orderIds = new Set(links.map((item) => item.orderId));
    const settlements = state.orderDocumentSettlements.filter((item) => linkIds.has(item.orderDocumentId));
    const instrumentLinks = state.orderInstruments.filter((item) => orderIds.has(item.orderId) || settlements.some((settlement) => settlement.orderInstrumentId === item.id));
    const instrumentIds = new Set(instrumentLinks.map((item) => item.instrumentId));
    const instruments = state.instruments.filter((item) => instrumentIds.has(item.id));
    const instrumented = documentInstrumentedAmount(state, breakdown);
    const filters = {
      currency: valueFromInput('flowCurrencyFilter'), status: valueFromInput('flowKindFilter'),
      activity: valueFromInput('flowActivityFilter'), chartAccountId: valueFromInput('flowChartFilter'), entityId: valueFromInput('flowEntityFilter')
    };
    const filteredRows = Core.filterFlowRows(state, { ...filters, asOfDate });
    const isProjection = (row) => projections.some((projection) => projection.id === row.id);
    const tableRows = filteredTableRows('flowTable', flowColumns(), filteredRows);
    const filterReasons = projections.length ? Object.entries(filters).filter(([key, value]) => value && !Core.filterFlowRows(state, { [key]: value, asOfDate }).some(isProjection)).map(([key, value]) => `Filtro ${key}=${value}`) : [];
    if (filteredRows.some(isProjection) && !tableRows.some(isProjection)) filterReasons.push('Filtros de encabezado de la tabla Flujo');
    const monthlyOptions = {
      ...filters, asOfDate, from: valueFromInput('flowStartMonth') ? `${valueFromInput('flowStartMonth')}-01` : asOfDate,
      exercise: valueFromInput('flowExercise'), horizon: Number(valueFromInput('monthlyHorizon')) || 12
    };
    const monthlyGroups = flowMonthlyCurrencyGroups(monthlyOptions);
    const months = monthlyGroups.flatMap((group) => group.months);
    const monthlyIncluded = months.some((month) => month.rows.some(isProjection));
    const range = { firstMonth: months[0]?.month || '', lastMonth: months.at(-1)?.month || '' };
    const monthlyReasons = [...filterReasons.filter((item) => item !== 'Filtros de encabezado de la tabla Flujo')];
    if (projections.length && filteredRows.some(isProjection) && !monthlyIncluded) monthlyReasons.push(`Fuera del rango mensual ${range.firstMonth} a ${range.lastMonth}`);
    const detailFilters = monthDetail ? {
      currency: valueFromInput('detailCurrencyFilter'), status: valueFromInput('detailStatusFilter'), activity: valueFromInput('detailActivityFilter'),
      chartAccountId: valueFromInput('detailChartFilter'), entityId: valueFromInput('detailEntityFilter'), dateFrom: valueFromInput('detailDateFrom'),
      dateTo: valueFromInput('detailDateTo'), direction: monthDetail.direction, sourceId: monthDetail.sourceId
    } : null;
    const detailRows = detailFilters ? Core.filterFlowRows(state, { ...detailFilters, asOfDate }).filter((row) => (!monthDetail.visualCategory || flowVisualCategory(row) === monthDetail.visualCategory) && (!monthDetail.agriculturalIncomeKind || agriculturalIncomeKind(row) === monthDetail.agriculturalIncomeKind) && (!monthDetail.projectionCrop || (row.projectionId && row.cereal === monthDetail.projectionCrop))) : [];
    const detailReasons = projections.length && detailFilters ? Object.entries(detailFilters).filter(([key, value]) => value && !Core.filterFlowRows(state, { [key]: value, asOfDate }).some(isProjection)).map(([key, value]) => `Filtro detalle ${key}=${value}`) : [];
    if (projections.length && detailFilters && monthDetail.visualCategory && !projections.some((row) => flowVisualCategory(row) === monthDetail.visualCategory)) detailReasons.push(`Categoria visual del detalle: ${monthDetail.visualCategory}`);
    const orderState = (order) => !order ? 'Orden inexistente' : order.voidedAt ? `Anulada (${order.voidedAt})` : Core.orderBreakdown(state, order.id)?.status || 'Sin estado derivado';
    return {
      documentId, number: doc.number || '', type: doc.type, entityId: doc.entityId, activity: doc.activity, chartAccountId: doc.chartAccountId,
      stateVersion, environment: persistenceEnvironment, asOfDate, total: doc.amount, currency: doc.currency,
      commercialBalance: breakdown ? doc.amount - breakdown.cancelled : null, applied: breakdown?.assigned ?? null,
      instrumented, cancelled: breakdown?.cancelled ?? null, financialRealized: breakdown?.financialRealized ?? null,
      committedPending: breakdown?.committedPending ?? null, nonInstrumented: breakdown?.nonInstrumented ?? null,
      dueDate: doc.dueDate || '', issueDate: doc.issueDate || '', recordDate: doc.recordDate || '',
      commercialSide: doc.commercialSide || '', direction: Core.documentDirection(doc, state), status: breakdown?.status || 'Sin desglose',
      storedStatus: doc.status || '', voidedAt: doc.voidedAt || null,
      projectionIncluded: projections.length > 0, projectionReason: reason,
      projections: projections.map((row) => ({ id: row.id, date: row.date, amount: row.amount, currency: row.currency, direction: row.direction, userStatus: row.userStatus, source: row.source })),
      view: {
        filters, headerFilters: { ...(tableFilters.flowTable || {}) }, tableIncluded: tableRows.some(isProjection), filterReasons,
        monthlyOptions, monthlyCurrencies: monthlyGroups.map((group) => group.currency), range, monthlyIncluded, monthlyReasons,
        detailFilters, detailVisualCategory: monthDetail?.visualCategory || '', detailReasons, detailIncluded: detailFilters ? detailRows.some(isProjection) : null
      },
      orderDocuments: links.map((link) => {
        const order = state.orders.find((item) => item.id === link.orderId);
        return { ...link, linkStatus: link.voidedAt ? 'Anulado' : 'Activo', orderNumber: order ? orderDisplayCode(order) : '', orderType: order?.type || '', orderStoredStatus: order?.status || '', orderStatus: orderState(order), orderVoidedAt: order?.voidedAt || null, countedInApplied: !!order && !order.voidedAt && !link.voidedAt };
      }),
      settlements: settlements.map((item) => ({ ...item, linkStatus: item.voidedAt ? 'Anulado' : 'No anulado', countedInBreakdown: !item.voidedAt && details.some((detail) => detail.orderDocumentId === item.orderDocumentId && detail.orderInstrumentId === item.orderInstrumentId) })),
      orderInstruments: instrumentLinks.map((item) => ({ ...item, linkStatus: item.voidedAt ? 'Anulado' : 'Activo' })),
      instruments: instruments.map((item) => ({ id: item.id, label: instrumentDisplayName(item), type: item.type, amount: item.amount, currency: item.currency, status: item.status, voidedAt: item.voidedAt || null, scheduledDate: item.scheduledDate || '', executedDate: item.executedDate || '', financialAccountId: item.financialAccountId, reference: item.reference || '', checkNumber: item.checkNumber || '' })),
      compensations: (state.documentCompensations || []).filter((item) => [item.creditDocumentId, item.debtDocumentId].includes(documentId)).map((item) => ({ ...item, linkStatus: compensationStatusLabel(item), countedInBreakdown: details.some((detail) => detail.compensationId === item.id) })),
      withholdings: ['orderTaxWithholdings', 'orderPracticedWithholdings'].flatMap((collection) => (state[collection] || []).filter((item) => linkIds.has(item.orderDocumentId)).map((item) => ({ ...item, collection, countedInBreakdown: details.some((detail) => detail.withholdingId === item.id || detail.practicedWithholdingId === item.id) }))),
      taxComponents: (doc.taxComponents || []).map((item) => ({ ...item })),
      breakdownDetails: details.map((item) => ({ ...item }))
    };
  }

  function documentFinancialDiagnosticPanel(documentId) {
    const panel = document.createElement('details');
    panel.className = 'audit-history document-diagnostics';
    panel.open = false;
    const summary = document.createElement('summary');
    summary.textContent = 'Diagnóstico financiero (sólo lectura)';
    const body = document.createElement('div');
    panel.append(summary, body);
    panel.addEventListener('toggle', () => {
      if (!panel.open) return;
      body.innerHTML = '';
      try {
        const data = documentFinancialDiagnostics(documentId);
        if (!data) { body.textContent = 'Documento inexistente en el estado cargado.'; return; }
        const money = (value) => value == null ? 'Sin desglose' : `${formatFlowMoney(value, data.currency)} [${value}]`;
        const rows = [
          ['Document ID', data.documentId], ['Número / tipo', `${data.number || '(vacío)'} / ${data.type}`],
          ['Entidad / actividad / cuenta', `${data.entityId || '(vacío)'} / ${data.activity || '(vacío)'} / ${data.chartAccountId || '(vacío)'}`],
          ['StateVersion / ambiente', `${data.stateVersion ?? 'No disponible'} / ${data.environment || 'No disponible'}`],
          ['Fecha del diagnóstico', data.asOfDate], ['Total', money(data.total)], ['Saldo comercial (commercial balance)', money(data.commercialBalance)],
          ['Aplicado (applied / assigned)', money(data.applied)], ['Instrumentado (settlements vigentes)', money(data.instrumented)],
          ['Cancelado comercialmente', money(data.cancelled)], ['Realizado financieramente', money(data.financialRealized)],
          ['Comprometido pendiente', money(data.committedPending)], ['Sin instrumentar (nonInstrumented)', money(data.nonInstrumented)],
          ['dueDate', data.dueDate || '(vacío)'], ['issueDate', data.issueDate || '(vacío)'], ['recordDate', data.recordDate || '(vacío)'],
          ['Lado comercial / dirección', `${data.commercialSide || '(vacío)'} / ${data.direction}`], ['Estado derivado / almacenado', `${data.status} / ${data.storedStatus || '(vacío)'}`],
          ['voidedAt', data.voidedAt || '(vacío)'], ['Proyección en Flujo:', data.projectionIncluded ? 'SÍ' : 'NO'], ['Motivo:', data.projectionReason],
          ['Visible en tabla con filtros actuales', data.view.tableIncluded ? 'SÍ' : 'NO'], ['Motivo de filtros', data.view.filterReasons.join('; ') || 'Ningún filtro excluye la proyección; ver motivo de Core.'],
          ['Visible en matriz mensual', data.view.monthlyIncluded ? 'SÍ' : 'NO'], ['Rango mensual', `${data.view.range.firstMonth} a ${data.view.range.lastMonth}`],
          ['Motivo mensual', data.view.monthlyReasons.join('; ') || 'Ningún filtro/período excluye la proyección; ver motivo de Core.'],
          ['Visible en último detalle mensual abierto', data.view.detailIncluded == null ? 'Sin detalle mensual' : data.view.detailIncluded ? 'SÍ' : 'NO'],
          ['Motivo del detalle mensual', data.view.detailReasons.join('; ') || 'Sin filtro excluyente del detalle; ver motivo de Core.']
        ];
        rows.forEach(([label, value]) => {
          const line = document.createElement('div');
          line.className = 'trace-line';
          const heading = document.createElement('strong');
          heading.textContent = label;
          const text = document.createElement('span');
          text.textContent = value;
          line.append(heading, text);
          body.appendChild(line);
        });
        const sections = [
          ['Proyecciones document-balance', data.projections], ['Filtros actuales de Flujo y detalle', data.view],
          ['orderDocuments', data.orderDocuments], ['orderDocumentSettlements', data.settlements], ['orderInstruments', data.orderInstruments],
          ['Instrumentos relacionados', data.instruments], ['Compensaciones', data.compensations], ['Retenciones', data.withholdings],
          ['Componentes fiscales del documento', data.taxComponents], ['Detalles usados por documentBreakdown()', data.breakdownDetails]
        ];
        sections.forEach(([label, records]) => {
          const heading = document.createElement('h4');
          heading.textContent = `${label}${Array.isArray(records) ? ` (${records.length})` : ''}`;
          const text = document.createElement('pre');
          text.textContent = JSON.stringify(records, null, 2);
          body.append(heading, text);
        });
      } catch (error) {
        body.textContent = `No se pudo calcular el diagnóstico sobre el estado cargado: ${error.message}`;
      }
    });
    return panel;
  }

  function addDocumentTrace(lines, id) {
    const doc = state.documents.find((x) => x.id === id);
    if (!doc) return;
    const b = operationBreakdown('documents', id);
    lines.push(['Documento', [doc.number, doc.description].filter(Boolean).join(' - ')]);
    if (doc.relatedInvoiceIds?.length) lines.push(['Facturas origen (informativo)', linkList(doc.relatedInvoiceIds.map((invoiceId) => ({ label: documentDisplayLabel(state.documents.find((item) => item.id === invoiceId)), target: { type: 'document', id: invoiceId } })))]);
    lines.push(['Tipo', labelForType(doc.type)]);
    if (doc.livestockCategory) lines.push(['Categoria de hacienda', doc.livestockCategory]);
    lines.push(['Fecha de emisión', formatDate(doc.issueDate) || 'Sin fecha registrada']);
    lines.push(['Vencimiento', doc.dueDate ? formatDate(doc.dueDate) : 'Sin vencimiento registrado']);
    lines.push(['Actividad', doc.activity || 'Sin imputacion definida']);
    lines.push(['Total del documento', formatMoney(doc.amount, doc.currency)]);
    if (doc.economicTreatment === 'liability_only') {
      lines.push(['Tratamiento económico', 'Obligación pendiente sin resultado económico. Capital e intereses pendientes de conciliación.']);
      if (doc.liabilityPlanNumber) lines.push(['Plan', doc.liabilityPlanNumber]);
      if (doc.notes) lines.push(['Observación del plan', doc.notes]);
    }
    if (doc.currency === 'USD' && doc.tcInvoice != null) lines.push(['TC de factura (ARS/USD)', String(doc.tcInvoice).replace('.', ',')]);
    lines.push(['Saldo comercial pendiente', formatMoney(doc.amount - b.cancelled, doc.currency)]);
    lines.push(['Contraparte', linkList([{ label: Core.entityName(state, doc.entityId), target: makeEntityLink(doc.entityId) }])]);
    lines.push(['Cuenta', doc.economicTreatment === 'liability_only' ? 'Sin imputación a gasto' : linkList([{ label: Core.chartPath(state, doc.chartAccountId), target: makeChartLink(doc.chartAccountId) }])]);
    lines.push(['Control documento', `original ${formatMoney(doc.amount, doc.currency)} = cancelado ${formatMoney(b.cancelled, doc.currency)} + pendiente ${formatMoney(b.committedPending, doc.currency)} + sin medio ${formatMoney(b.nonInstrumented, doc.currency)}`]);
    const orderLinks = state.orderDocuments.filter((link) => link.documentId === id)
      .map((link) => ({ link, order: state.orders.find((order) => order.id === link.orderId) }))
      .filter((item) => item.order);
    const activeOrders = orderLinks.filter(({ link, order }) => !link.voidedAt && !order.voidedAt)
      .map(({ order }) => ({ label: orderDisplayCode(order), target: { type: 'order', id: order.id } }));
    const historicalOrders = orderLinks.filter(({ order }) => order.voidedAt)
      .map(({ order }) => ({ label: `${orderDisplayCode(order)} (Anulada)`, target: { type: 'order', id: order.id } }));
    lines.push(['Ordenes vinculadas', linkList(activeOrders, 'Sin ordenes activas')]);
    if (historicalOrders.length) lines.push(['Historial de ordenes anuladas', linkList(historicalOrders)]);
    const related = state.instruments.filter((item) => instrumentRelations(item.id).documents.some((document) => document.id === id));
    lines.push(['Instrumentos vinculados', linkList(related.map((item) => ({ label: instrumentDisplayName(item), target: { type: 'instrument', id: item.id } })), 'Sin instrumentos')]);
    const compensations = (state.documentCompensations || []).filter((item) => [item.creditDocumentId, item.debtDocumentId].includes(id));
    lines.push(['Compensaciones', linkList(compensations.map((item) => ({ label: `${compensationStatusLabel(item)} · ${formatDate(item.date)} · ${formatMoney(item.amount, item.currency)} · ${state.documents.find((doc) => doc.id === (item.creditDocumentId === id ? item.debtDocumentId : item.creditDocumentId))?.number || 'Documento'}`, target: { type: 'documentCompensation', id: item.id } })), 'Sin compensaciones')]);
  }

  function compensationStatusLabel(item) {
    return { requested: 'Solicitada (sin efecto en saldos)', confirmed: 'Confirmada', cancelled: 'Anulada' }[Core.compensationStatus(item)];
  }

  async function editDebitNoteInvoiceLinks(id) {
    const doc = state.documents.find((item) => item.id === id);
    if (!doc || doc.voidedAt) return;
    const invoices = state.documents.filter((item) => item.type === 'purchase_invoice' && item.entityId === doc.entityId && (!item.voidedAt || doc.relatedInvoiceIds?.includes(item.id)));
    await requestEditAction({ title: 'Facturas origen de la ND', description: 'Vínculo exclusivamente informativo. No calcula diferencias cambiarias ni modifica importes, saldos o impuestos.', fields: [
      { name: 'relatedInvoiceIds', label: 'Facturas originales', type: 'checkboxes', value: doc.relatedInvoiceIds || [], options: invoices.map((item) => ({ value: item.id, label: `${documentDisplayLabel(item)} · ${formatMoney(item.amount, item.currency)}` })) },
      { name: 'reason', label: 'Motivo', required: true }
    ], onSubmit: async (values) => {
      await postTransaction({ action: 'updateDocument', id, changes: { relatedInvoiceIds: values.relatedInvoiceIds || [], reason: values.reason } });
      showTrace({ type: 'document', id }, true);
    } });
  }

  const taxPlanStatusLabels = { active: 'Vigente', completed: 'Finalizado', inactive: 'No vigente', pending_verification: 'Pendiente de verificar', cancelled: 'Anulado' };

  function taxPlanAdvanceLabel(row) {
    const instrument = (row.instruments || []).find((item) => item.id === row.advanceInstrumentId);
    if (instrument) return instrument.voidedAt ? 'Anulado' : Core.instrumentIsBankRealized(instrument) ? 'Pagado' : Core.instrumentIsPending(instrument) ? 'Pendiente en Flujo' : 'Estado por revisar';
    if (!row.advance?.amount) return 'Sin anticipo informado';
    if (row.advance?.mode !== 'scheduled') return 'Informativo: pago pendiente de conciliación, sin movimiento registrado';
    return row.status === 'cancelled' ? 'Cronograma anulado, sin pago registrado' : 'Previsto no activo: fuera de Flujo y Banco/Caja';
  }

  function taxPlanInstallmentSummary(row) {
    const groups = { paid: { count: 0, cents: 0 }, pending: { count: 0, cents: 0 }, cancelled: { count: 0, cents: 0 }, provisional: { count: 0, cents: 0 } };
    const instruments = (row.instruments || []).filter((item) => item.id !== row.advanceInstrumentId);
    if (instruments.length) instruments.forEach((item) => {
      const kind = item.voidedAt || ['voided','cancelled'].includes(item.status) ? 'cancelled' : Core.instrumentIsBankRealized(item) ? 'paid' : Core.instrumentIsPending(item) ? 'pending' : 'provisional';
      groups[kind].count++; groups[kind].cents += Math.round(item.amount * 100);
    });
    else (row.installments || []).forEach((item) => {
      const kind = row.status === 'cancelled' ? 'cancelled' : 'provisional';
      groups[kind].count++; groups[kind].cents += Math.round(item.amount * 100);
    });
    return groups;
  }

  function appendTaxPlanSummary(row) {
    const box = document.createElement('section'); box.className = 'tax-plan-summary wide-section';
    const title = document.createElement('h4'); title.textContent = 'Resumen de cuotas (anticipo separado)'; box.appendChild(title);
    const groups = taxPlanInstallmentSummary(row);
    [['paid','Pagadas'],['pending','Pendientes activas'],['cancelled','Anuladas'],['provisional','Previstas / por verificar, no activas']].forEach(([key,label]) => {
      const line = document.createElement('p'); line.textContent = `${label}: ${groups[key].count} · ${formatMoney(groups[key].cents / 100, 'ARS')}`; box.appendChild(line);
    });
    const advance = document.createElement('p'); advance.textContent = `Anticipo: ${formatMoney(row.advance?.amount || 0, 'ARS')} · ${taxPlanAdvanceLabel(row)}`; box.appendChild(advance);
    document.getElementById('editActionFields').appendChild(box);
  }

  function taxPlanBankOptions() {
    return [{ value: '', label: 'Seleccionar cuenta' }, ...state.financialAccounts.filter((item) => item.active !== false && item.currency === 'ARS' && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account').map((item) => ({ value: item.id, label: Core.accountName(state, item.id) }))];
  }

  function parseTaxPlanSchedule(text) {
    return String(text || '').trim().split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
      const parts = line.trim().split(';');
      if (parts.length !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(parts[0].trim())) throw new Error(`Cuota ${index + 1}: usar fecha AAAA-MM-DD; importe`);
      const amount = parseLocaleNumber(parts[1].trim());
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Cuota ${index + 1}: importe invalido`);
      return { date: parts[0].trim(), amount };
    });
  }

  function taxPlanReviewRows(row) {
    let number = 0;
    if (row.instruments.length) return row.instruments.map((item) => ({ number: item.id === row.advanceInstrumentId ? 'Anticipo' : String(++number), date: item.scheduledDate, amount: item.amount, status: item.voidedAt ? 'Anulada' : Core.instrumentIsBankRealized(item) ? 'Pagada' : 'Pendiente', reference: item.reference || '', instrumentId: item.id }));
    return [...(row.advance?.mode === 'scheduled' ? [{ ...row.advance, number: 'Anticipo', reference: 'Anticipo' }] : []), ...(row.installments || []).map((item,index) => ({ ...item, number: String(index + 1), reference: `Cuota ${index + 1}` }))].map((item) => ({ ...item, status: row.status === 'cancelled' ? 'Anulada' : 'No activa / provisional' }));
  }

  function appendTaxPlanTable(row) {
    const box = document.createElement('div'); box.className = 'wide-section table-wrap';
    const table = document.createElement('table'); table.id = 'taxPlanReviewTable'; box.appendChild(table);
    document.getElementById('editActionFields').appendChild(box);
    renderTable(table.id, [
      { label: 'Cuota', value: 'number' }, { label: 'Referencia', value: 'reference' }, { label: 'Vencimiento', value: (item) => formatDate(item.date) },
      { label: 'Importe ARS', value: (item) => formatMoney(item.amount, 'ARS'), className: () => 'amount' }, { label: 'Estado', value: 'status' },
      { label: 'Instrumento', value: (item) => item.instrumentId ? state.instruments.some((instrument) => instrument.id === item.instrumentId) ? 'Ver' : 'Nuevo (vista previa)' : '', link: (item) => state.instruments.some((instrument) => instrument.id === item.instrumentId) ? { type: 'instrument', id: item.instrumentId } : null }
    ], taxPlanReviewRows(row));
  }

  async function reviewTaxPlanOperation(payload) {
    // The preview uses a disposable clone through Core; nothing is persisted here.
    const simulated = Core.taxPaymentPlanTransaction(state, { ...payload, confirmed: true, reason: 'Vista previa local' }, 'preview');
    const changed = simulated.auditLog[0];
    const simulatedRows = Core.taxPaymentPlanRows(simulated);
    const row = payload.operation === 'create'
      ? simulatedRows.find((item) => item.agency.toUpperCase() === String(payload.agency).trim().toUpperCase() && item.entityId === payload.entityId && item.number === String(payload.number || '').trim().toUpperCase())
      : simulatedRows.find((item) => item.id === changed.entityId) || simulatedRows.find((item) => item.id === payload.planId);
    if (!row) throw new Error('No se pudo identificar el plan de la vista previa');
    const cancellation = payload.operation === 'cancel' || payload.operation === 'replace'
      ? Core.taxPaymentPlanRows(state).find((item) => item.id === payload.planId) : null;
    const paid = cancellation?.instruments.filter((item) => !item.voidedAt && Core.instrumentIsBankRealized(item)) || [];
    const pendingInstruments = cancellation?.instruments.filter((item) => !item.voidedAt && Core.instrumentIsPending(item)) || [];
    const sum = (items) => items.reduce((total,item) => total + Math.round(item.amount * 100),0) / 100;
    const cancelText = cancellation ? ` Se conservan ${paid.length} pagos (${formatMoney(sum(paid), 'ARS')}); se retiran ${pendingInstruments.length} vencimientos activos, incluyendo anticipos programados (${formatMoney(sum(pendingInstruments), 'ARS')}). La deuda no se extingue. Documento ${state.documents.find((doc) => doc.id === cancellation.documentId)?.number || 'sin obligación reconocida'}, orden ${orderDisplayCode(state.orders.find((order) => order.id === cancellation.orderId)) || 'sin orden'}.` : '';
    const adoptionText = payload.operation === 'adopt' ? ' Se registra la identificación del plan y se reconocen sus vínculos existentes. Pasará de Pendiente de verificar a Vigente, o Finalizado si todas sus cuotas están pagadas. No modifica documento, clasificación económica, OP, cuotas, pagos ni fechas; no crea nuevos vencimientos. La anulación seguirá bloqueada si el tratamiento histórico no está conciliado.' : '';
    const pending = requestEditAction({ title: payload.operation === 'cancel' ? 'Confirmar anulación del plan' : 'Confirmar gestión de plan', wideReview: true, taxPlanView: true,
      description: `${row.agency} · ${row.number || 'Número pendiente'} · ${row.concept} · ${Core.entityName(state, row.entityId)}. ${taxPlanStatusLabels[row.displayStatus]}. ${row.count} cuotas: ${formatMoney(row.total, 'ARS')}. Anticipo separado: ${formatMoney(row.advance?.amount || 0, 'ARS')} (${taxPlanAdvanceLabel(row)}).${cancelText}${adoptionText} No se generan pagos bancarios ni resultado económico. Capital e intereses pendientes de conciliación.`,
      fields: [{ name: 'reason', label: 'Motivo obligatorio', required: true }, { name: 'confirmation', label: 'Confirmación', type: 'checkboxes', options: [{ value: 'yes', label: 'Verifiqué origen, importes y relaciones; no duplica obligaciones ya registradas' }] }],
      submitLabel: payload.operation === 'cancel' ? 'Confirmar anulación del plan' : 'Confirmar', onSubmit: async (values) => {
        if (!values.confirmation?.includes('yes')) throw new Error('Confirmación explícita obligatoria');
        await postTransaction({ action: 'taxPaymentPlan', payload: { ...payload, confirmed: true, reason: values.reason } });
      }
    });
    appendTaxPlanSummary(row);
    appendTaxPlanTable(row);
    if (cancellation) {
      const note = document.createElement('p'); note.className = 'wide-section';
      note.textContent = `Instrumentos anteriores: ${cancellation.instruments.map((item) => `${item.reference || item.id}: ${item.voidedAt ? 'ya anulado' : Core.instrumentIsBankRealized(item) ? 'se conserva' : 'se anula'}`).join('; ')}`;
      document.getElementById('editActionFields').appendChild(note);
    }
    await pending;
  }

  async function openTaxPaymentPlanForm(previousPlanId = '') {
    // One circuit for every plan: known ARCA schedules are presets of "Nuevo plan", like ATER.
    const arcaPresets = (Core.ARCA_PLAN_SCHEDULES || []).map((plan) => ({ value: `ARCA:${plan.number}`, label: `ARCA ${plan.number} - ${plan.description} (${plan.count} cuotas)` }));
    const selection = await requestEditAction({ title: previousPlanId ? 'Nueva moratoria conciliada' : 'Nuevo plan de pago', fields: [
      { name: 'preset', label: 'Cronograma inicial', type: 'select', options: [{ value: 'manual', label: 'Otro plan / cronograma manual' }, { value: 'ATER', label: 'ATER Ingresos Brutos - NO VIGENTE' }, ...(previousPlanId ? [] : arcaPresets)] }
    ], submitLabel: 'Continuar' });
    if (!selection) return;
    const ater = selection.preset === 'ATER';
    const arca = String(selection.preset || '').startsWith('ARCA:') ? (Core.ARCA_PLAN_SCHEDULES || []).find((plan) => `ARCA:${plan.number}` === selection.preset) : null;
    const arcaEntity = arca ? state.entities.find((item) => item.active !== false && !item.mergedIntoEntityId && /^(arca|afip)\b/i.test(String(item.name || '').trim())) : null;
    const arcaDates = arca ? Array.from({ length: arca.count }, (_, index) => new Date(Date.UTC(2026, 10 + index, 16)).toISOString().slice(0, 10)) : [];
    const previous = Core.taxPaymentPlanRows(state).find((item) => item.id === previousPlanId);
    const dates = ['2026-11-16','2026-12-15','2027-01-15','2027-02-15','2027-03-15','2027-04-15','2027-05-17','2027-06-15','2027-07-15','2027-08-16','2027-09-15','2027-10-15'];
    const presetSchedule = ater ? dates.map((date) => `${date}; 463344,62`).join('\n') : arca ? arcaDates.map((date) => `${date}; ${String(arca.amount.toFixed(2)).replace('.', ',')}`).join('\n') : '';
    let payload;
    const values = await requestEditAction({ title: previous ? `Sustituir ${previous.number}` : 'Preparar plan', wideReview: true, taxPlanView: true,
      description: previous ? 'Sólo se admite un cronograma cuyo total concilie exactamente con la deuda libre. Las diferencias de capital/intereses requieren conciliación previa; no se modifica el documento.' : 'No se reconoce gasto automáticamente. Conciliar el origen de la deuda y los intereses por separado. Anticipos informativos no generan pagos.',
      fields: [
        { name: 'agency', label: 'Organismo', value: ater ? 'ATER' : arca ? 'ARCA' : previous?.agency || '', required: true },
        { name: 'entityId', label: 'Contraparte', type: 'select', value: previous?.entityId || arcaEntity?.id || '', required: true, options: [{ value: '', label: 'Seleccionar' }, ...state.entities.filter((item) => item.active !== false && !item.mergedIntoEntityId).map((item) => ({ value: item.id, label: item.name }))] },
        { name: 'number', label: 'Número de plan (obligatorio para activar)', value: arca ? arca.number : '' },
        { name: 'concept', label: 'Concepto tributario', value: ater ? 'Impuesto sobre los Ingresos Brutos' : arca ? arca.description : '', required: true },
        { name: 'adhesionDate', label: 'Adhesión / consolidación', type: 'date' },
        { name: 'date', label: 'Fecha de registro de la obligación', type: 'date', value: Core.todayIso(), required: true },
        { name: 'status', label: 'Estado', type: 'select', value: ater ? 'inactive' : (previous || arca) ? 'active' : 'pending_verification', options: [{ value: 'pending_verification', label: 'Pendiente de verificar' }, { value: 'inactive', label: 'No vigente' }, { value: 'active', label: 'Vigente (crea cronograma pendiente)' }] },
        { name: 'financialAccountId', label: 'Cuenta bancaria ARS (al activar)', type: 'select', options: taxPlanBankOptions() },
        { name: 'schedule', label: 'Cuotas: una por línea, AAAA-MM-DD; importe ARS. Revisá las fechas: si el 16 cae fin de semana o feriado, el débito real suele ser el día hábil siguiente', type: 'textarea', value: presetSchedule, required: true },
        { name: 'advanceAmount', label: 'Anticipo separado', money: true, value: ater ? '1178515,78' : arca?.advance ? String(arca.advance.toFixed(2)).replace('.', ',') : '0' },
        { name: 'advanceDate', label: 'Vencimiento del anticipo', type: 'date', value: ater ? '2026-10-30' : '' },
        { name: 'advanceMode', label: 'Tratamiento del anticipo', type: 'select', value: ater ? 'scheduled' : 'informational', options: [{ value: 'informational', label: 'Informativo / pendiente de conciliación' }, { value: 'scheduled', label: 'Programar únicamente al activar el plan' }] },
        { name: 'notes', label: 'Observaciones / capital e intereses pendientes de desglose' },
        ...(previous ? [{ name: 'reconciliationReference', label: 'Referencia de conciliación del saldo sustituido', required: true }] : [])
      ], submitLabel: 'Revisar', onSubmit: (input) => {
        payload = { operation: previous ? 'replace' : 'create', planId: previousPlanId, ...input, installments: parseTaxPlanSchedule(input.schedule),
          advance: { amount: parseLocaleNumber(input.advanceAmount), date: input.advanceDate, mode: input.advanceMode } };
        Core.taxPaymentPlanTransaction(state, { ...payload, reason: 'Vista previa', confirmed: true }, 'preview');
      } });
    if (values) await reviewTaxPlanOperation(payload);
  }

  async function openTaxPaymentPlanDetail(id) {
    const row = Core.taxPaymentPlanRows(state).find((item) => item.id === id);
    if (!row) return;
    const doc = state.documents.find((item) => item.id === row.documentId);
    const pending = requestEditAction({ title: `${row.agency} · ${row.number || 'Número pendiente'} · ${taxPlanStatusLabels[row.displayStatus]}`, wideReview: true, taxPlanView: true, closeOnly: true, submitLabel: 'Cerrar', fields: [],
      description: `${row.concept}. ${Core.entityName(state, row.entityId)}. Cuotas: ${formatMoney(row.total, 'ARS')}. Anticipo: ${formatMoney(row.advance?.amount || 0, 'ARS')} (${taxPlanAdvanceLabel(row)}). Total con anticipo: ${formatMoney(row.total + (row.advance?.amount || 0), 'ARS')}. Deuda comercial: ${row.commercialBalance == null ? 'no conciliada en esta ficha' : formatMoney(row.commercialBalance, 'ARS')}. Tratamiento económico ${doc && doc.economicTreatment !== 'liability_only' ? 'HISTÓRICO: conserva su clasificación, requiere revisión expresa' : 'provisional sin nuevo resultado; capital e intereses pendientes de conciliación'}. ${row.notes || ''}` });
    const actions = document.createElement('div'); actions.className = 'actions wide-section';
    if (row.documentId) actions.appendChild(traceButton(doc?.number || 'Documento', { type: 'document', id: row.documentId }));
    if (row.orderId) actions.appendChild(traceButton(orderDisplayCode(state.orders.find((item) => item.id === row.orderId)), { type: 'order', id: row.orderId }));
    const action = (label, handler) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = label;
      button.addEventListener('click', async () => { closeEditActionModal(null); try { await handler(); } catch (error) { alert(error.message); } }); actions.appendChild(button);
      if (TAX_ACTION_HELP[label]) actions.appendChild(actionHelp(label));
    };
    if (row.legacy) {
      const notice = document.createElement('p'); notice.className = 'wide-section';
      notice.textContent = 'Pendiente de verificar: se detectó el documento histórico, sin identificación registrada del plan. Verificar agrega esa identificación y su auditoría; no reclasifica ni cambia pagos. Anular plan requiere primero esa verificación y superar las protecciones contables. Abrir esta ficha no activa ni modifica el plan.';
      document.getElementById('editActionFields').appendChild(notice);
      action('Verificar identificación sin reclasificar', () => reviewTaxPlanOperation({ operation: 'adopt', planId: id }));
      const unavailable = document.createElement('button'); unavailable.type = 'button'; unavailable.className = 'secondary'; unavailable.textContent = 'Anular plan'; unavailable.disabled = true; unavailable.title = 'Primero verificar la identificación histórica'; actions.appendChild(unavailable);
    }
    else {
      action('Editar concepto', async () => {
        const values = await requestEditAction({ title: 'Corregir identificación del plan', description: 'No modifica documentos, cuotas ni pagos.', fields: [
          { name: 'concept', label: 'Concepto', value: row.concept, required: true }, ...(!row.number && !row.documentId ? [{ name: 'number', label: 'Número de plan identificado' }] : [])
        ], submitLabel: 'Revisar' });
        if (values) await reviewTaxPlanOperation({ ...values, operation: 'edit', planId: id });
      });
      if (!['cancelled', 'completed'].includes(row.displayStatus)) action('Anular plan', () => reviewTaxPlanOperation({ operation: 'cancel', planId: id }));
      if (!row.documentId && ['inactive','pending_verification'].includes(row.status)) action('Activar cronograma', async () => {
        const values = await requestEditAction({ title: 'Activar plan verificado', fields: [{ name: 'financialAccountId', label: 'Cuenta ARS', type: 'select', options: taxPlanBankOptions(), required: true }], submitLabel: 'Revisar' });
        if (values) await reviewTaxPlanOperation({ ...values, operation: 'activate', planId: id });
      });
      if (row.documentId && !row.nextPlanId && row.displayStatus !== 'completed') action('Sustituir por moratoria', () => openTaxPaymentPlanForm(id));
    }
    document.getElementById('editActionFields').appendChild(actions);
    appendTaxPlanSummary(row);
    appendTaxPlanTable(row);
    const history = document.createElement('details'); history.className = 'wide-section';
    const summary = document.createElement('summary'); summary.textContent = 'Historial y relaciones'; history.appendChild(summary);
    const text = document.createElement('pre'); text.style.whiteSpace = 'pre-wrap';
    text.textContent = `Plan anterior: ${Core.taxPaymentPlanRows(state).find((item) => item.id === row.previousPlanId)?.number || '-'}\nPlan siguiente: ${Core.taxPaymentPlanRows(state).find((item) => item.id === row.nextPlanId)?.number || '-'}\n` + state.auditLog.filter((item) => item.entityType === 'taxPaymentPlan' && item.entityId === row.id).map((item) => `${item.createdAt} · ${item.user} · ${item.action} · ${item.reason}`).join('\n');
    history.appendChild(text); document.getElementById('editActionFields').appendChild(history);
    await pending;
  }

  function renderTaxPaymentPlans() {
    const countAmount = (count, amount) => {
      const box = document.createElement('span');
      const quantity = document.createElement('span'); quantity.className = 'plan-count'; quantity.textContent = `${count} cuotas`;
      const money = document.createElement('span'); money.className = 'plan-money'; money.textContent = formatMoney(amount, 'ARS');
      box.append(quantity, money); return box;
    };
    renderTable('taxPaymentPlansTable', [
      { label: 'Organismo', value: 'agency' }, { label: 'Plan', value: (row) => row.number || 'Pendiente de identificar' },
      { label: 'Concepto', value: 'concept' }, { label: 'Inicio / adhesión', value: (row) => row.adhesionDate ? formatDate(row.adhesionDate) : 'No informada' },
      { label: 'Primera cuota', value: (row) => formatDate(row.firstDate) }, { label: 'Cuotas', value: 'count' },
      { label: 'Total cuotas ARS', value: (row) => formatMoney(row.total, 'ARS'), className: () => 'amount' },
      { label: 'Pagadas', value: (row) => `${row.paidCount} · ${formatMoney(row.paidAmount, 'ARS')}`, node: (row) => countAmount(row.paidCount, row.paidAmount), className: () => 'amount' },
      { label: 'Pendientes / previstas', value: (row) => `${row.pendingCount} · ${formatMoney(row.pendingAmount, 'ARS')}`, node: (row) => countAmount(row.pendingCount, row.pendingAmount), className: () => 'amount' },
      { label: 'Estado', value: (row) => taxPlanStatusLabels[row.displayStatus], className: (row) => `tax-plan-status tax-plan-status-${row.displayStatus}` },
      { label: 'Acciones', node: (row) => { const box = document.createElement('div'); box.className = 'actions';
        [['Ver detalle', () => openTaxPaymentPlanDetail(row.id)], ...(!row.legacy && !['cancelled','completed'].includes(row.displayStatus) ? [['Anular plan', () => reviewTaxPlanOperation({ operation: 'cancel', planId: row.id })]] : [])].forEach(([label, handler]) => {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary tiny'; button.textContent = label;
          button.addEventListener('click', async () => { try { await handler(); } catch (error) { alert(error.message); } }); box.appendChild(button); box.appendChild(actionHelp(label));
        }); return box; } }
    ], Core.taxPaymentPlanRows(state));
  }

  async function prepareArcaPlans() {
    const entities = state.entities.filter((item) => item.active !== false && !item.mergedIntoEntityId);
    const accounts = state.financialAccounts.filter((item) => item.active !== false && item.currency === 'ARS' && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account');
    const values = await requestEditAction({ title: 'Preparar cuotas ARCA',
      description: 'Seleccioná sólo los planes faltantes. W761122 ya fue cargado manualmente: no está seleccionado. Conceptos identificados; reconocimiento económico pendiente de conciliación. Pagos a cuenta informativos; no incluye V818947.',
      submitLabel: 'Revisar cronograma', fields: [
        { name: 'planNumbers', label: 'Planes', type: 'checkboxes', value: ['W761123', 'W760582'], options: Core.ARCA_PLAN_SCHEDULES.map((plan) => ({ value: plan.number, label: `${plan.number} - ${plan.description}` })) },
        { name: 'entityId', label: 'Contraparte ARCA', type: 'select', required: true, options: [{ value: '', label: 'Seleccionar ARCA' }, ...entities.map((item) => ({ value: item.id, label: item.name }))] },
        { name: 'financialAccountId', label: 'Cuenta bancaria ARS', type: 'select', required: true, options: [{ value: '', label: 'Seleccionar cuenta' }, ...accounts.map((item) => ({ value: item.id, label: item.name }))] },
        { name: 'date', label: 'Fecha de registro de las obligaciones', type: 'date', value: Core.todayIso(), required: true }
      ], onSubmit: (input) => { Core.prepareArcaPlans(state, input); } });
    if (!values) return;
    const preview = Core.prepareArcaPlans(state, values);
    const blocked = preview.blockers.length > 0;
    const pending = requestEditAction({ title: 'Confirmar preparación ARCA', wideReview: true,
      description: `${Core.entityName(state, values.entityId)} · ${state.financialAccounts.find((item) => item.id === values.financialAccountId)?.name || ''} · registro ${formatDate(values.date)}. ${preview.count} cuotas · ${formatMoney(preview.total, 'ARS')}. Estructura/Admin. Las obligaciones no generan gasto ni IVA. Banco/Caja sólo se afecta al realizar cada débito, con los cargos bancarios que correspondan. No reclasifica documentos existentes.`,
      fields: blocked ? [] : [
        { name: 'reason', label: 'Motivo obligatorio', required: true },
        { name: 'confirmation', label: 'Confirmación', type: 'checkboxes', options: [{ value: 'confirmed', label: 'Confirmo contraparte, cuenta, cronograma y tratamiento sin resultado; verifiqué que no duplica otras obligaciones tributarias' }] }
      ], submitLabel: blocked ? 'Cerrar revisión' : 'Registrar cuotas pendientes', onSubmit: async (input) => {
        if (blocked) return;
        if (!input.confirmation?.includes('confirmed')) throw new Error('Confirmación explícita obligatoria');
        await postTransaction({ action: 'importArcaPlans', payload: { ...values, reason: input.reason, confirmed: true } });
        alert('Preparación confirmada. Revisá los documentos de los planes en Operaciones y las cuotas en Flujo.');
      } });
    const review = document.createElement('div'); review.className = 'wide-section';
    const summary = document.createElement('p');
    summary.textContent = preview.plans.map((plan) => `${plan.number}: ${plan.existingCount} existentes, ${plan.missing.length} nuevas · ${formatMoney(plan.total, 'ARS')}`).join(' | ');
    review.appendChild(summary);
    if (blocked) {
      const error = document.createElement('p'); error.className = 'fatal'; error.textContent = preview.blockers.join('\n'); review.appendChild(error);
    }
    preview.plans.forEach((plan) => {
      const info = document.createElement('p'); info.textContent = `${plan.number}: ${plan.description}. ${plan.notes}`; review.appendChild(info);
    });
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Cuota</th><th>Vencimiento</th><th>Importe ARS</th><th>Acción</th></tr></thead>';
    const body = table.createTBody();
    preview.plans.forEach((plan) => plan.installments.forEach((item) => {
      const row = body.insertRow();
      [item.reference, formatDate(item.scheduledDate), formatMoney(item.amount, 'ARS'), plan.missing.includes(item) ? 'Agregar pendiente' : 'Conservar existente'].forEach((value) => { row.insertCell().textContent = value; });
    }));
    review.appendChild(table);
    document.getElementById('editActionFields').prepend(review);
    await pending;
  }

  async function reconcileGrainLiquidation(liquidationId) {
    const liquidation = state.grainLiquidations?.find((item) => item.id === liquidationId && !item.voidedAt);
    const credit = liquidation && state.documents.find((doc) => doc.id === liquidation.documentId && !doc.voidedAt);
    if (!credit || credit.currency !== 'ARS') return;
    const debts = state.documents.filter((doc) => !doc.voidedAt && doc.entityId === credit.entityId && doc.currency === 'ARS'
      && Core.documentDirection(doc, state) === 'out' && Core.documentBreakdown(state, doc.id).nonInstrumented > 0);
    const selected = await requestEditAction({ title: 'Conciliar con proveedor',
      description: `${documentDisplayLabel(credit)} · ${Core.entityName(state, credit.entityId)}. Solicitar no cancela ni reserva saldos.`,
      fields: [{ name: 'debts', label: 'Documentos pendientes ARS', type: 'checkboxes', options: debts.map((doc) => ({
        value: doc.id, label: `${documentDisplayLabel(doc)} · disponible ${formatMoney(Core.documentBreakdown(state, doc.id).nonInstrumented, 'ARS')}`
      })) }], submitLabel: 'Distribuir crédito', onSubmit: (values) => {
        if (!values.debts?.length) throw new Error('Seleccione al menos un documento');
      } });
    if (!selected) return;
    const chosen = selected.debts.map((id) => debts.find((doc) => doc.id === id));
    const available = Core.documentBreakdown(state, credit.id).nonInstrumented;
    const pending = requestEditAction({ title: 'Solicitar conciliación con proveedor', wideReview: true,
      description: 'Se confirmará toda la distribución después de conciliar con el proveedor. No genera movimientos bancarios.',
      fields: [
        ...chosen.map((doc, index) => ({ name: `allocation${index}`, label: `${documentDisplayLabel(doc)} · libre ${formatMoney(Core.documentBreakdown(state, doc.id).nonInstrumented, 'ARS')}`, money: true, required: true })),
        { name: 'date', label: 'Fecha de solicitud', type: 'date', value: Core.todayIso(), required: true },
        { name: 'reference', label: 'Referencia común (opcional)' },
        { name: 'reason', label: 'Motivo', required: true }
      ], submitLabel: 'Registrar solicitud', onSubmit: async (values) => {
        const payload = { liquidationId, date: values.date, reference: values.reference, reason: values.reason,
          allocations: chosen.map((doc, index) => ({ debtDocumentId: doc.id, amount: parseLocaleNumber(values[`allocation${index}`]) })) };
        Core.createGrainReconciliationTransaction(state, payload, 'preview');
        await postTransaction({ action: 'createGrainReconciliation', payload });
        showTrace({ type: 'grainLiquidation', id: liquidationId }, true);
      } });
    const fields = document.getElementById('editActionFields');
    const summary = document.createElement('p');
    summary.className = 'wide-section';
    summary.setAttribute('aria-live', 'polite');
    fields.prepend(summary);
    const update = () => {
      const cents = chosen.reduce((total, doc, index) => total + Math.round((parseLocaleNumber(fields.querySelector(`[name="allocation${index}"]`).value) || 0) * 100), 0);
      summary.textContent = `Crédito disponible: ${formatMoney(available, 'ARS')} · Distribuido: ${formatMoney(cents / 100, 'ARS')} · Remanente: ${formatMoney((Math.round(available * 100) - cents) / 100, 'ARS')}`;
    };
    fields.addEventListener('input', update);
    update();
    try { await pending; } finally { fields.removeEventListener('input', update); }
  }

  function compensationAmountLabel(item) {
    return `${formatMoney(item.amount, item.currency)}${item.debtCurrency ? ` / ${formatMoney(item.debtAmount, item.debtCurrency)} · TC ARS/USD ${item.exchangeRate}` : ''}`;
  }

  function addDocumentCompensationTrace(lines, id) {
    const item = (state.documentCompensations || []).find((record) => record.id === id);
    if (!item) return;
    const credit = state.documents.find((doc) => doc.id === item.creditDocumentId);
    const debt = state.documents.find((doc) => doc.id === item.debtDocumentId);
    lines.push(['Compensación', item.reference || `${documentDisplayLabel(credit)} con ${documentDisplayLabel(debt)}`]);
    lines.push(['Fecha', formatDate(item.date)]);
    lines.push(['Estado', compensationStatusLabel(item)]);
    if (item.reconciliationId) {
      lines.push(['Conciliación común', item.reference || item.reconciliationId]);
      lines.push(['Distribución completa', linkList(state.documentCompensations.filter((row) => row.reconciliationId === item.reconciliationId).map((row) => ({
        label: `${documentDisplayLabel(state.documents.find((doc) => doc.id === row.debtDocumentId))} · ${compensationAmountLabel(row)} · ${compensationStatusLabel(row)}`,
        target: { type: 'documentCompensation', id: row.id }
      })))]);
    }
    if (item.requestedDate) lines.push(['Fecha de solicitud', formatDate(item.requestedDate)]);
    if (item.requestedReference) lines.push(['Referencia de solicitud', item.requestedReference]);
    if (Core.compensationStatus(item) === 'confirmed') lines.push(['Fecha efectiva', formatDate(item.date)]);
    if (item.cancelledDate) lines.push(['Fecha de anulación', formatDate(item.cancelledDate)]);
    if (item.cancellationReference) lines.push(['Referencia de anulación', item.cancellationReference]);
    lines.push(['Crédito', linkList(credit ? [{ label: documentDisplayLabel(credit), target: { type: 'document', id: credit.id } }] : [])]);
    lines.push(['Deuda', linkList(debt ? [{ label: documentDisplayLabel(debt), target: { type: 'document', id: debt.id } }] : [])]);
    lines.push(['Importe comercial', compensationAmountLabel(item)]);
    if (item.debtCurrency) lines.push(['Redondeo ARS', String(item.roundingDifference || 0)]);
    lines.push(['Caja/Bancos', 'Sin movimiento bancario']);
    if (item.notes) lines.push(['Observaciones', item.notes]);
  }

  async function transitionDocumentCompensation(id, status) {
    const item = state.documentCompensations?.find((record) => record.id === id);
    if (!item || Core.compensationStatus(item) !== 'requested') return;
    const group = item.reconciliationId ? state.documentCompensations.filter((row) => row.reconciliationId === item.reconciliationId) : [item];
    const groupDescription = item.reconciliationId ? `Se ${status === 'confirmed' ? 'confirmarán' : 'anularán'} TODAS las ${group.length} imputaciones: ${group.map((row) => `${documentDisplayLabel(state.documents.find((doc) => doc.id === row.debtDocumentId))}: ${compensationAmountLabel(row)}`).join('; ')}. Total ${formatMoney(group.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100, 'ARS')}. ` : '';
    await requestEditAction({ title: status === 'confirmed' ? 'Confirmar compensación conciliada' : 'Anular solicitud',
      description: `${groupDescription}${Core.entityName(state, item.entityId)} · ${compensationAmountLabel(item)}. ${status === 'confirmed' ? 'Confirmá sólo después de conciliar con el proveedor. Se validarán nuevamente ambos saldos; no genera fondos. Si hay una ND por diferencia cambiaria, se cancela por separado; revisá que el TC no incluya el mismo ajuste.' : 'La solicitud quedará en el historial sin modificar saldos.'}`,
      fields: [
        { name: 'date', label: status === 'confirmed' ? 'Fecha efectiva de compensación' : 'Fecha de anulación', type: 'date', value: Core.todayIso(), required: true },
        { name: 'reference', label: 'Referencia de conciliación (opcional)' },
        { name: 'reason', label: 'Motivo', required: true },
        { name: 'confirm', label: 'Escribí CONFIRMAR', required: true }
      ], submitLabel: status === 'confirmed' ? 'Confirmar compensación' : 'Anular solicitud', onSubmit: async (values) => {
        if (String(values.confirm || '').trim().toUpperCase() !== 'CONFIRMAR') throw new Error('Confirmación explícita requerida');
        await postTransaction({ action: item.reconciliationId ? 'transitionGrainReconciliation' : 'transitionDocumentCompensation', id: item.reconciliationId || id, payload: { status, date: values.date, reference: values.reference, reason: values.reason } });
        showTrace({ type: 'documentCompensation', id }, true);
      } });
  }

  async function editDocumentCompensation(id) {
    const item = (state.documentCompensations || []).find((record) => record.id === id && !record.voidedAt);
    if (!item) return;
    if (item.reconciliationId) {
      await requestEditAction({ title: 'Conciliación múltiple', description: 'Esta imputación pertenece a una conciliación completa y no puede editarse por separado. Si todavía está solicitada, puede anular toda la solicitud y registrar una nueva distribución.', submitLabel: 'Entendido' });
      return;
    }
    const directionOptions = (direction) => state.documents.filter((doc) => !doc.voidedAt && doc.entityId === item.entityId
      && doc.currency === (direction === 'out' ? item.debtCurrency || item.currency : item.currency) && Core.documentDirection(doc, state) === direction)
      .map((doc) => ({ value: doc.id, label: documentDisplayLabel(doc) }));
    let changes, candidate;
    const values = await requestEditAction({ title: 'Editar compensación', description: `Contraparte ${Core.entityName(state, item.entityId)} · ${item.currency}. Conserva el mismo vínculo y no genera fondos.`, fields: [
      { name: 'creditDocumentId', label: 'Documento a cobrar', type: 'select', options: directionOptions('in'), value: item.creditDocumentId, required: true },
      { name: 'debtDocumentId', label: 'Documento a pagar', type: 'select', options: directionOptions('out'), value: item.debtDocumentId, required: true },
      { name: 'amount', label: `Importe del crédito (${item.currency})`, value: formatDecimal(item.amount, 2), money: true, required: true },
      ...(item.debtCurrency ? [
        { name: 'debtAmount', label: 'Importe de deuda USD', value: formatDecimal(item.debtAmount, 2), money: true, required: true },
        { name: 'exchangeRate', label: 'TC acordado ARS/USD', value: String(item.exchangeRate).replace('.', ','), required: true }
      ] : []),
      { name: 'date', label: 'Fecha', type: 'date', value: item.date, required: true },
      { name: 'reference', label: 'Referencia', value: item.reference || '' },
      { name: 'notes', label: 'Observaciones', value: item.notes || '' },
      { name: 'reason', label: 'Motivo de la corrección', required: true }
    ], submitLabel: 'Revisar cambios', onSubmit: (input) => {
      changes = { ...input, amount: parseLocaleNumber(input.amount) };
      if (item.debtCurrency) Object.assign(changes, { debtAmount: parseLocaleNumber(input.debtAmount), exchangeRate: parseLocaleNumber(input.exchangeRate) });
      candidate = Core.editDocumentCompensationTransaction(state, id, changes, 'vista previa');
    } });
    if (!values) return;
    const before = state, version = stateVersion;
    const affected = [...new Set([item.creditDocumentId, item.debtDocumentId, changes.creditDocumentId, changes.debtDocumentId])]
      .map((documentId) => state.documents.find((doc) => doc.id === documentId)).filter(Boolean);
    const saldo = (snapshot, doc) => doc.amount - Core.documentBreakdown(snapshot, doc.id).commercialCancelled;
    const summary = document.createElement('div');
    summary.className = 'compensation-edit-preview';
    summary.innerHTML = `<h4>Efecto comercial</h4><div class="table-wrap"><table><thead><tr><th>Documento</th><th>Saldo antes</th><th>Saldo después</th></tr></thead><tbody>${affected.map((doc) => `<tr><td>${escapeHtml(documentDisplayLabel(doc))}</td><td class="amount">${formatMoney(saldo(state, doc), doc.currency)}</td><td class="amount">${formatMoney(saldo(candidate, doc), doc.currency)}</td></tr>`).join('')}</tbody></table></div>
      <p>Importe: ${compensationAmountLabel(item)} → ${compensationAmountLabel(candidate.documentCompensations.find((row) => row.id === id))}</p>
      <p>Fecha anterior: ${formatDate(item.date)} → Fecha nueva: ${formatDate(changes.date)}</p>
      <p>Referencia anterior: ${escapeHtml(item.reference || '-')} → Referencia nueva: ${escapeHtml(changes.reference || '-')}</p>
      <p>Banco/Caja: sin cambios. Documentos e instrumentos: mismos IDs.</p>`;
    const confirmation = requestEditAction({ title: 'Confirmar corrección', description: 'Se modificará sólo la compensación existente. La operación es atómica y quedará auditada.', fields: [
      { name: 'confirm', label: 'Escribí CONFIRMAR', required: true }
    ], submitLabel: 'Guardar corrección', onSubmit: async (input) => {
      if (String(input.confirm || '').trim().toUpperCase() !== 'CONFIRMAR') throw new Error('Confirmación requerida');
      if (state !== before || stateVersion !== version) throw new Error('La base cambió; revisá la compensación nuevamente');
      await postTransaction({ action: 'editDocumentCompensation', id, changes });
      showTrace({ type: 'documentCompensation', id }, true);
    } });
    document.getElementById('editActionFields').prepend(summary);
    await confirmation;
  }

  function addOrderTrace(lines, id) {
    const order = state.orders.find((x) => x.id === id);
    if (!order) return;
    const b = Core.orderBreakdown(state, id);
    lines.push(['Orden', `${orderDisplayCode(order)} - ${order.description}`]);
    lines.push(['Estado orden', labelForStatus(b.status)]);
    lines.push(['Contraparte', linkList([{ label: Core.entityName(state, order.entityId), target: makeEntityLink(order.entityId) }])]);
    const orderDocs = state.orderDocuments.filter((x) => x.orderId === id).map((x) => state.documents.find((doc) => doc.id === x.documentId)).filter(Boolean);
    const activities = [...new Set(orderDocs.map((doc) => doc.activity))];
    lines.push(['Imputacion economica', activities.length > 1 ? 'Segun documentos vinculados' : activities[0] || order.activity]);
    const docLinks = state.orderDocuments.filter((x) => x.orderId === id).map((x) => {
      const doc = state.documents.find((d) => d.id === x.documentId);
      return { label: doc?.number || x.documentId, target: { type: 'document', id: x.documentId } };
    });
    const instrumentLinks = state.orderInstruments.filter((x) => x.orderId === id).map((x) => ({ label: instrumentDisplayName(x.instrumentId), target: { type: 'instrument', id: x.instrumentId } }));
    const chartLinks = state.orderDocuments.filter((x) => x.orderId === id).map((x) => state.documents.find((d) => d.id === x.documentId)).filter(Boolean).map((doc) => ({ label: Core.chartPath(state, doc.chartAccountId), target: makeChartLink(doc.chartAccountId) }));
    lines.push(['Documentos', linkList(docLinks, 'Sin documentos')]);
    lines.push(['Instrumentos', linkList(instrumentLinks, 'Sin instrumentos')]);
    const withholdings = (state.orderTaxWithholdings || []).filter((item) => item.orderId === id && !item.voidedAt).map((item) => `${Core.labelForTaxType(item.taxType)} ${formatMoney(item.amount, item.currency)} · ${formatDate(item.date)}`);
    lines.push(['Retenciones sufridas', withholdings.join(' · ') || 'Sin retenciones']);
    lines.push(['Cuenta/concepto', linkList(chartLinks, 'Sin cuenta')]);
    lines.push(['Historial', linkList(state.auditLog.filter((x) => x.entityId === id).map((x) => ({ label: `${x.action} ${x.createdAt}`, target: { type: 'audit', id: x.id } })), 'Sin historial especifico')]);
  }

  function addInstrumentTrace(lines, id) {
    const instrument = state.instruments.find((x) => x.id === id);
    if (!instrument) return;
    const allOrderLinks = state.orderInstruments.filter((x) => x.instrumentId === id);
    const orderInstrumentLinks = allOrderLinks.filter((x) => !x.voidedAt && !state.orders.find((order) => order.id === x.orderId)?.voidedAt);
    const orderLinks = orderInstrumentLinks.map((x) => ({ label: orderDisplayCode(x.orderId), target: { type: 'order', id: x.orderId } }));
    const historicalOrderLinks = allOrderLinks.filter((x) => state.orders.find((order) => order.id === x.orderId)?.voidedAt)
      .map((x) => ({ label: `${orderDisplayCode(x.orderId)} (Anulada)`, target: { type: 'order', id: x.orderId } }));
    const orderInstrumentIds = new Set(orderInstrumentLinks.map((link) => link.id));
    const docLinks = state.orderDocumentSettlements
      .filter((settlement) => orderInstrumentIds.has(settlement.orderInstrumentId) && !settlement.voidedAt)
      .map((settlement) => state.orderDocuments.find((link) => link.id === settlement.orderDocumentId))
      .filter(Boolean)
      .map((link) => state.documents.find((doc) => doc.id === link.documentId))
      .filter(Boolean)
      .map((doc) => ({ label: doc.number, target: { type: 'document', id: doc.id } }));
    lines.push(['Instrumento', instrumentDisplayName(instrument)]);
    lines.push(['Tipo', labelForType(instrument.type)]);
    lines.push(['Estado', Core.instrumentLinkedOnlyToInactiveOrders(state, id) && Core.instrumentIsPending(instrument) ? 'Inactivo por orden anulada' : labelForStatus(instrument.status)]);
    lines.push(['Estado financiero', Core.instrumentIsBankRealized(instrument) ? 'Realizado financieramente' : 'Sin movimiento realizado de Caja/Bancos']);
    lines.push(['Importe', formatMoney(instrument.amount, instrument.currency)]);
    lines.push(['Fecha', formatDate(instrument.executedDate || instrument.scheduledDate)]);
    if (instrument.checkNumber) lines.push(['Numero cheque', instrument.checkNumber]);
    if (instrument.bankName) lines.push(['Banco', instrument.bankName]);
    if (instrument.deliveredToEntityId) lines.push(['Endoso/uso posterior', linkList([{ label: Core.entityName(state, instrument.deliveredToEntityId), target: makeEntityLink(instrument.deliveredToEntityId) }])]);
    lines.push(['Contraparte', linkList([{ label: Core.entityName(state, instrument.entityId), target: makeEntityLink(instrument.entityId) }])]);
    lines.push(['Cuenta', linkList([{ label: Core.accountName(state, instrument.financialAccountId), target: makeAccountLink(instrument.financialAccountId) }])]);
    lines.push(['Ordenes vinculadas', linkList(orderLinks, 'Sin orden')]);
    if (historicalOrderLinks.length) lines.push(['Órdenes anuladas', linkList(historicalOrderLinks)]);
    lines.push(['Documentos vinculados', linkList(docLinks, 'Sin documentos')]);
    lines.push(...taxPaymentOriginLines(id));
  }

  function addGrainMovementTrace(lines, target) {
    const row = target.row || (state.grainMovements || []).find((item) => item.id === target.id);
    if (!row) return;
    const history = Core.grainLocationHistory(state, { cereal: row.cereal, campaign: row.campaign, locationId: row.locationId });
    const historicRow = history.find((item) => item.id === row.id) || row;
    lines.push(['Movimiento cereal', `${labelForType(row.movementType || row.direction)} ${formatDate(row.date)}`]);
    lines.push(['Cereal/campana', `${row.cereal} ${row.campaign}`]);
    lines.push(['Ubicacion', linkList([{ label: Core.grainLocationName(state, row.locationId), target: { type: 'grainLocation', id: row.locationId, cereal: row.cereal, campaign: row.campaign } }])]);
    lines.push(['Entrada', row.direction === 'in' ? `${formatKg(row.kg)} kg` : '—']);
    lines.push(['Salida', row.direction === 'out' ? `${formatKg(row.kg)} kg` : '—']);
    lines.push(['Saldo posterior', historicRow.balanceKg == null ? 'No reconstruido' : `${formatKg(historicRow.balanceKg)} kg`]);
    lines.push(['Referencia', row.referenceType === 'document'
      ? linkList([{ label: historicRow.referenceLabel || row.referenceId, target: { type: 'document', id: row.referenceId } }])
      : (historicRow.referenceLabel || row.referenceId || row.id)]);
    lines.push(['Observacion', row.description || '']);
    document.querySelector('[data-view="cereales"]')?.click();
  }

  function addGrainLocationTrace(lines, target) {
    const location = (state.grainLocations || []).find((item) => item.id === target.id);
    if (!location) return;
    const cereal = target.cereal || document.getElementById('grainCerealFilter')?.value || '';
    const campaign = target.campaign || document.getElementById('grainCampaignFilter')?.value || '';
    const stock = Core.grainStockAt(state, { cereal, campaign, locationId: location.id });
    const history = Core.grainLocationHistory(state, { cereal, campaign, locationId: location.id });
    lines.push(['Ubicacion cereal', `${location.name} (${Core.grainLocationTypeLabel(location.type)})`]);
    if (location.entityId) lines.push(['Contraparte vinculada', linkList([{ label: Core.entityName(state, location.entityId), target: makeEntityLink(location.entityId) }])]);
    lines.push(['Stock reconstruido', `${formatKg(stock)} kg`]);
    lines.push(['Movimientos', linkList(history.map((row) => ({ label: `${formatDate(row.date)} ${row.referenceLabel} ${formatKg(row.kgIn || row.kgOut)} kg`, target: grainMovementReferenceLink(row) })).filter((row) => row.target), 'Sin movimientos')]);
    document.querySelector('[data-view="cereales"]')?.click();
  }

  function addGrainForwardTrace(lines, id) {
    const forward = (state.grainForwards || []).find((item) => item.id === id);
    if (!forward) return;
    const pending = Core.grainForwardPendingKg(state, id);
    const liquidations = (state.grainLiquidations || []).filter((item) => item.forwardId === id).map((item) => ({ label: item.id, target: { type: 'grainLiquidation', id: item.id } }));
    lines.push(['FWD', `${forward.cereal} ${forward.campaign} ${formatKg(forward.contractedKg)} kg`]);
    lines.push(['Comprador', linkList([{ label: Core.entityName(state, forward.buyerEntityId), target: makeEntityLink(forward.buyerEntityId) }])]);
    lines.push(['Precio fijo', `${formatMoney(forward.price, forward.currency)}/tn`]);
    lines.push(['Kg pendiente', `${formatKg(pending)} kg`]);
    lines.push(['Liquidaciones vinculadas', linkList(liquidations, 'Sin liquidaciones')]);
    document.querySelector('[data-view="cereales"]')?.click();
  }

  function addGrainTransferTrace(lines, id) {
    const transfer = (state.grainTransfers || []).find((item) => item.id === id);
    if (!transfer) return;
    lines.push(['Traslado cereal', `${transfer.cereal} ${transfer.campaign}`]);
    lines.push(['Origen', linkList([{ label: Core.grainLocationName(state, transfer.originLocationId), target: { type: 'grainLocation', id: transfer.originLocationId, cereal: transfer.cereal, campaign: transfer.campaign } }])]);
    lines.push(['Destino', linkList([{ label: Core.grainLocationName(state, transfer.destinationLocationId), target: { type: 'grainLocation', id: transfer.destinationLocationId, cereal: transfer.cereal, campaign: transfer.campaign } }])]);
    lines.push(['Kilos', `enviados ${formatKg(transfer.kgSent)} kg; reconocidos ${formatKg(transfer.kgNetRecognized)} kg; diferencia ${formatKg(transfer.differenceKg)} kg`]);
    document.querySelector('[data-view="cereales"]')?.click();
  }

  function addGrainLiquidationTrace(lines, id) {
    const liquidation = (state.grainLiquidations || []).find((item) => item.id === id);
    if (!liquidation) return;
    lines.push(['Liquidacion cereal', `${liquidation.cereal} ${liquidation.campaign}`]);
    lines.push(['Documento economico', linkList([{ label: state.documents.find((doc) => doc.id === liquidation.documentId)?.number || liquidation.documentId, target: { type: 'document', id: liquidation.documentId } }])]);
    lines.push(['Ubicacion', linkList([{ label: Core.grainLocationName(state, liquidation.locationId), target: { type: 'grainLocation', id: liquidation.locationId, cereal: liquidation.cereal, campaign: liquidation.campaign } }])]);
    lines.push(['Contraparte', linkList([{ label: Core.entityName(state, liquidation.counterpartyEntityId), target: makeEntityLink(liquidation.counterpartyEntityId) }])]);
    lines.push(['Kilos e importe', `${formatKg(liquidation.kg)} kg a ${formatMoney(liquidation.settlementPrice || liquidation.price, liquidation.currency)}/tn`]);
    if (liquidation.contractPrice) lines.push(['Precio contractual FWD', `${formatMoney(liquidation.contractPrice, liquidation.currency)}/tn`]);
    if (liquidation.priceDifferenceReason) lines.push(['Motivo diferencia precio', liquidation.priceDifferenceReason]);
    if (liquidation.forwardId) lines.push(['FWD', linkList([{ label: liquidation.forwardId, target: { type: 'grainForward', id: liquidation.forwardId } }])]);
    const reconciliations = (state.documentCompensations || []).filter((item) => item.grainLiquidationId === id);
    lines.push(['Conciliaciones comerciales', linkList(reconciliations.map((item) => ({
      label: `${item.reference || 'Conciliación'} · ${documentDisplayLabel(state.documents.find((doc) => doc.id === item.debtDocumentId))} · ${compensationAmountLabel(item)} · ${compensationStatusLabel(item)}`,
      target: { type: 'documentCompensation', id: item.id }
    })))]);
    document.querySelector('[data-view="cereales"]')?.click();
  }

  function addLivestockHerdTrace(lines, id) {
    const herd = (state.livestockHerds || []).find((item) => item.id === id);
    if (!herd) return;
    const summary = Core.livestockSummary(state, { herdId: id });
    const stock = summary.totalHeads;
    const weighing = Core.latestLivestockWeighing(state, { herdId: id });
    const weightedRows = summary.rows.filter((row) => row.balanceHeads > 0);
    const incompleteWeight = weightedRows.some((row) => row.liveWeightKg == null);
    lines.push(['Tropa', herd.name]);
    lines.push(['Categorias actuales', weightedRows.map((row) => `${row.category}: ${row.balanceHeads} cab`).join(' · ') || 'Sin stock']);
    lines.push(['Ubicacion base', linkList([{ label: Core.livestockLocationName(state, herd.locationId), target: { type: 'livestockLocation', id: herd.locationId } }])]);
    lines.push(['Cabezas actuales', String(stock)]);
    lines.push(['Ultimo peso promedio', weighing ? `${formatKg(weighing.averageWeightKg)} kg el ${formatDate(weighing.date)}` : 'Sin pesada']);
    lines.push(['Peso vivo estimado conocido', summary.liveWeightKg ? `${formatKg(summary.liveWeightKg)} kg${incompleteWeight ? ' · hay categorias sin pesada aplicable' : ''}` : 'Sin pesada aplicable']);
    lines.push(['Valuacion estimada conocida', Object.entries(summary.valuationByCurrency).map(([currency, amount]) => formatMoney(amount, currency)).join(' / ') || 'Sin precio/peso']);
    const movements = Core.livestockMovementHistory(state, { herdId: id }).map((row) => ({ label: `${formatDate(row.date)} ${row.movementType} ${row.voidedAt ? row.heads : row.headsIn || row.headsOut} cab${row.voidedAt ? ' (anulado)' : ''}`, target: livestockMovementReferenceLink(row) }));
    const weighings = Core.livestockWeighingRows(state, { herdId: id }).map((row) => ({ label: `${formatDate(row.date)} ${formatKg(row.averageWeightKg)} kg`, target: { type: 'livestockWeighing', id: row.id, row } }));
    lines.push(['Historial fisico', linkList(movements, 'Sin movimientos')]);
    lines.push(['Pesadas', linkList(weighings, 'Sin pesadas')]);
    document.querySelector('[data-view="hacienda"]')?.click();
  }

  function addLivestockLocationTrace(lines, id) {
    const location = (state.livestockLocations || []).find((item) => item.id === id);
    if (!location) return;
    const rows = Core.livestockStockRows(state, { locationId: id }).filter((row) => row.balanceHeads);
    lines.push(['Ubicacion hacienda', location.name]);
    lines.push(['Cabezas', String(rows.reduce((total, row) => total + row.balanceHeads, 0))]);
    lines.push(['Tropas', linkList(rows.map((row) => ({ label: `${row.herdName} ${row.balanceHeads} cab`, target: { type: 'livestockHerd', id: row.herdId } })), 'Sin tropas')]);
    document.querySelector('[data-view="hacienda"]')?.click();
  }

  function addLivestockMovementTrace(lines, target) {
    const row = target.row || (state.livestockMovements || []).find((item) => item.id === target.id);
    if (!row) return;
    lines.push(['Movimiento hacienda', `${labelForType(`livestock_${row.movementType}`)} ${formatDate(row.date)}`]);
    lines.push(['Tropa', linkList([{ label: Core.livestockHerdName(state, row.herdId), target: { type: 'livestockHerd', id: row.herdId } }])]);
    lines.push(['Ubicacion', linkList([{ label: Core.livestockLocationName(state, row.locationId), target: { type: 'livestockLocation', id: row.locationId } }])]);
    lines.push(['Cabezas', String(row.heads || row.headsIn || row.headsOut || '')]);
    lines.push(['Motivo/observacion', row.cause || row.description || '']);
    if (row.referenceType === 'document') lines.push(['Documento', linkList([{ label: row.referenceLabel || row.referenceId, target: { type: 'document', id: row.referenceId } }])]);
    document.querySelector('[data-view="hacienda"]')?.click();
  }

  function addLivestockCategoryChangeTrace(lines, id) {
    const { origin, destination, voidedAt } = Core.livestockCategoryChange(state, id);
    lines.push(['Cambio de categoria', `${origin.category} → ${destination.category}`]);
    lines.push(['Fecha', formatDate(origin.date)]);
    lines.push(['Estado', voidedAt ? 'Anulado' : 'Vigente']);
    lines.push(['Cabezas', String(origin.heads)]);
    lines.push(['Tropa origen', linkList([{ label: Core.livestockHerdName(state, origin.herdId), target: { type: 'livestockHerd', id: origin.herdId } }])]);
    lines.push(['Tropa destino', linkList([{ label: Core.livestockHerdName(state, destination.herdId), target: { type: 'livestockHerd', id: destination.herdId } }])]);
    lines.push(['Ubicacion', Core.livestockLocationName(state, origin.locationId)]);
    lines.push(['Observacion', origin.description || '']);
    if (destination.weightSourceWeighingId) lines.push(['Pesada de origen', linkList([{ label: destination.weightSourceWeighingId, target: { type: 'livestockWeighing', id: destination.weightSourceWeighingId } }])]);
    document.querySelector('[data-view="hacienda"]')?.click();
  }

  async function correctLivestockPurchaseCategory(id) {
    let context;
    try { context = Core.livestockPurchaseCategoryCorrectionInfo(state, id); }
    catch (error) { context = { blockers: [error.message] }; }
    if (context.blockers.length) {
      const notice = document.createElement('p');
      notice.className = 'fatal'; notice.setAttribute('role', 'alert');
      notice.textContent = `No se puede corregir la categoria historica: ${context.blockers.join('; ')}`;
      document.getElementById('recordDetailPanel').appendChild(notice);
      notice.scrollIntoView({ block: 'nearest' });
      return;
    }
    const { trade, document: doc } = context;
    await requestEditAction({ title: 'Corregir categoria de compra',
      description: `${doc.number || doc.id} · ${trade.heads} cabezas · categoria original: ${trade.category}. Corrige un error de carga desde la fecha original; no es Cambio de categoria. No modifica importes, pagos ni pesadas.`,
      fields: [
        { name: 'category', label: 'Categoria correcta', type: 'select', value: trade.category,
          options: Core.LIVESTOCK_CATEGORIES.map((category) => ({ value: category, label: category })), required: true },
        { name: 'reason', label: 'Motivo de la correccion', required: true }
      ], submitLabel: 'Guardar correccion', onSubmit: async (changes) => {
        await postTransaction({ action: 'correctHistoricalLivestockPurchaseCategory', id, changes });
        showTrace({ type: 'document', id: doc.id }, true);
      } });
  }

  async function editLivestockCategoryChange(id) {
    const { origin, destination } = Core.livestockCategoryChange(state, id);
    const categoryOptions = Core.LIVESTOCK_CATEGORIES.map((category) => ({ value: category, label: category }));
    const herdOptions = (state.livestockHerds || []).filter((herd) => herd.status !== 'inactive').map((herd) => ({ value: herd.id, label: herd.name }));
    await requestEditAction({ title: 'Corregir cambio de categoria', fields: [
      { name: 'date', label: 'Fecha', type: 'date', value: origin.date, required: true },
      { name: 'originHerdId', label: 'Tropa origen', type: 'select', value: origin.herdId, options: herdOptions },
      { name: 'locationId', label: 'Ubicacion/campo', type: 'select', value: origin.locationId, options: (state.livestockLocations || []).filter((location) => location.active !== false).map((location) => ({ value: location.id, label: location.name })) },
      { name: 'originCategory', label: 'Categoria origen', type: 'select', value: origin.category, options: categoryOptions },
      { name: 'destinationCategory', label: 'Categoria destino', type: 'select', value: destination.category, options: categoryOptions },
      { name: 'heads', label: 'Cabezas', type: 'number', value: origin.heads, min: 1, step: 1, required: true },
      { name: 'destinationHerdId', label: 'Tropa destino', type: 'select', value: destination.herdId, options: herdOptions },
      { name: 'description', label: 'Observacion', value: origin.description },
      { name: 'reason', label: 'Motivo de la correccion', required: true }
    ], onSubmit: async (values) => {
      await postTransaction({ action: 'updateLivestockCategoryChange', id, changes: { ...values, heads: Number(values.heads) } });
      showTrace({ type: 'livestockCategoryChange', id }, true);
    } });
  }

  async function voidLivestockCategoryChange(id) {
    await requestEditAction({ title: 'Anular cambio de categoria', fields: [{ name: 'reason', label: 'Motivo de anulacion', required: true }],
      onSubmit: async ({ reason }) => {
        await postTransaction({ action: 'voidLivestockCategoryChange', id, reason });
        showTrace({ type: 'livestockCategoryChange', id }, true);
      } });
  }

  function addLivestockWeighingTrace(lines, target) {
    const weighing = target.row || (state.livestockWeighings || []).find((item) => item.id === target.id);
    if (!weighing) return;
    const weightsMatch = String(weighing.notes || '').match(/Pesos:\s*([^.]*)/);
    const weights = weightsMatch ? parseWeightList(weightsMatch[1]) : [];
    const rows = Core.livestockWeighingRows(state, { herdId: weighing.herdId }).sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));
    const index = rows.findIndex((row) => row.id === weighing.id);
    const previous = index > 0 ? rows[index - 1] : null;
    const gmd = previous ? Core.livestockGmd(state, weighing.herdId, previous.id, weighing.id) : null;
    lines.push(['Pesada', formatDate(weighing.date)]);
    lines.push(['Tropa', linkList([{ label: Core.livestockHerdName(state, weighing.herdId), target: { type: 'livestockHerd', id: weighing.herdId } }])]);
    lines.push(['Cabezas', String(weighing.heads)]);
    lines.push(['Kg totales', `${formatKg(weighing.totalKg)} kg`]);
    lines.push(['Peso promedio', `${formatKg(weighing.averageWeightKg)} kg`]);
    lines.push(['Minimo / maximo', weights.length ? `${formatKg(Math.min(...weights))} / ${formatKg(Math.max(...weights))} kg` : 'No informado individualmente']);
    lines.push(['Criterio', weighing.condition || 'Sin criterio']);
    lines.push(['Pesos individuales', weights.length ? weights.join(', ') : (weighing.notes || 'No informados')]);
    lines.push(['Comparacion anterior', gmd ? (gmd.calculable ? `${gmd.days} dias; diferencia ${formatKg(gmd.averageGainKg)} kg; GMD ${gmd.gmdKgPerHeadPerDay.toFixed(3)} kg/cab/dia` : gmd.reason) : 'Sin pesada anterior']);
    document.querySelector('[data-view="hacienda"]')?.click();
  }

  function addEntityTrace(lines, id) {
    const entity = state.entities.find((x) => x.id === id);
    if (!entity) return;
    const docs = state.documents.filter((x) => x.entityId === id).map((x) => ({ label: x.number, target: { type: 'document', id: x.id } }));
    const orders = state.orders.filter((x) => x.entityId === id).map((x) => ({ label: orderDisplayCode(x), target: { type: 'order', id: x.id } }));
    const instruments = state.instruments.filter((x) => x.entityId === id).map((x) => ({ label: instrumentDisplayName(x), target: { type: 'instrument', id: x.id } }));
    lines.push(['Entidad', entity.name]);
    lines.push(['Rol', entity.role || labelForType(entity.type)]);
    lines.push(['CUIT', entity.cuit || 'Sin CUIT']);
    lines.push(['Sugerencia', `${entity.suggestedActivity || 'Sin actividad'} ${entity.suggestedChartAccountId ? '- ' + Core.chartPath(state, entity.suggestedChartAccountId) : ''}`]);
    lines.push(['Documentos', linkList(docs, 'Sin documentos')]);
    lines.push(['Ordenes', linkList(orders, 'Sin ordenes')]);
    lines.push(['Instrumentos', linkList(instruments, 'Sin instrumentos')]);
    showEntityDetail(id);
  }

  function showEntityDetail(id) {
    const entity = state.entities.find((x) => x.id === id);
    if (!entity) return;
    const panel = document.getElementById('entityDetailPanel');
    if (!panel) return;
    if (entityCcView.entityId !== id) entityCcView = { entityId: id, currency: 'ARS', type: '', status: '', dateFrom: '', dateTo: '' };
    const docs = state.documents.filter((doc) => doc.entityId === id);
    const orders = state.orders.filter((order) => order.entityId === id);
    const instruments = state.instruments.filter((instrument) => instrument.entityId === id);
    const byCurrency = ['ARS', 'USD'].map((currency) => {
      const last = Core.currentAccountRows(state, { entityId: id, currency }).at(-1);
      return { currency, collect: last?.receivableBalance || 0, pay: last?.debtBalance || 0 };
    });
    panel.innerHTML = `
      <h3>${escapeHtml(entity.name)}</h3>
      <div class="entity-summary">
        <div><span>Rol</span><strong>${escapeHtml(entity.role || labelForType(entity.type))}</strong></div>
        <div><span>CUIT</span><strong>${escapeHtml(entity.cuit || '-')}</strong></div>
        <div><span>Documentos</span><strong>${docs.length}</strong></div>
        <div><span>Ordenes</span><strong>${orders.length}</strong></div>
        <div><span>Instrumentos</span><strong>${instruments.length}</strong></div>
      </div>
      <div class="entity-cc-summary">${byCurrency.map((item) => `<div><strong>${item.currency}</strong><span>A cobrar ${formatMoney(item.collect, item.currency)}</span><span>A pagar ${formatMoney(item.pay, item.currency)}</span></div>`).join('')}</div>
      <div class="trace-tabs">
        <h4>Cuenta corriente</h4>
        <div class="filters detail-filters entity-cc-filters">
          <label>Moneda<select id="entityCcCurrency"><option>ARS</option><option>USD</option></select></label>
          <label>Desde<input id="entityCcFrom" type="date"></label>
          <label>Hasta<input id="entityCcTo" type="date"></label>
          <label>Tipo<select id="entityCcType"><option value="">Todos</option><option value="document">Documento</option><option value="instrument">Pago/cobro</option><option value="documentCompensation">Compensación</option><option value="withholding">Retención</option></select></label>
          <label>Estado<select id="entityCcStatus"><option value="">Todos</option><option>Pendiente</option><option>Pagado</option><option>Cobrado</option><option>Compensado</option></select></label>
        </div>
        <p id="entityCcDateWarning" class="hidden" role="status"></p>
        <div class="table-wrap"><table id="entityCcTable"></table></div>
        <details class="entity-closing-panel"><summary>Conciliacion y cierre</summary><div id="entityClosingActions"></div><div id="entityClosings"></div></details>
        <h4>Documentos</h4><div class="table-wrap"><table id="entityDocsTable"></table></div>
        <h4>Ordenes</h4><div class="table-wrap"><table id="entityOrdersTable"></table></div>
        <h4>Instrumentos</h4><div class="table-wrap"><table id="entityInstrumentsTable"></table></div>
      </div>
    `;
    for (const [key, control] of [['currency', 'entityCcCurrency'], ['dateFrom', 'entityCcFrom'], ['dateTo', 'entityCcTo'], ['type', 'entityCcType'], ['status', 'entityCcStatus']]) {
      const input = panel.querySelector(`#${control}`);
      input.value = entityCcView[key];
      input.addEventListener('change', () => { entityCcView[key] = input.value; renderEntityCurrentAccount(id); });
    }
    renderEntityCurrentAccount(id);
    renderEntityClosings(id);
    renderTable('entityDocsTable', [
      { label: 'Documento', value: 'number', link: (row) => ({ type: 'document', id: row.id }), minWidth: 160 },
      { label: 'Tipo', value: (row) => labelForType(row.type), minWidth: 130 },
      { label: 'Importe', value: (row) => formatMoney(row.amount, row.currency), className: () => 'amount', minWidth: 130 },
      { label: 'Estado', value: (row) => operationBreakdown('documents', row.id).status, minWidth: 130 }
    ], docs);
    renderTable('entityOrdersTable', [
      { label: 'Orden', value: (row) => orderDisplayCode(row), link: (row) => ({ type: 'order', id: row.id }), minWidth: 160 },
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 110 },
      { label: 'Concepto', value: 'description', minWidth: 240 },
      { label: 'Estado', value: (row) => operationBreakdown('orders', row.id).status, minWidth: 130 }
    ], orders);
    renderTable('entityInstrumentsTable', [
      { label: 'Instrumento', value: (row) => instrumentDisplayName(row), link: (row) => ({ type: 'instrument', id: row.id }), minWidth: 170 },
      { label: 'Tipo', value: (row) => labelForType(row.type), minWidth: 130 },
      { label: 'Estado', value: (row) => labelForStatus(row.status), minWidth: 130 },
      { label: 'Importe', value: (row) => formatMoney(row.amount, row.currency), className: (row) => row.direction === 'out' ? 'amount negative' : 'amount positive', minWidth: 130 }
    ], instruments);
    document.querySelector('[data-view="contrapartes"]')?.click();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderEntityCurrentAccount(entityId) {
    const unknown = Core.currentAccountRows(state, { entityId, currency: entityCcView.currency }).filter((row) => row.dateUnknown);
    const warning = document.getElementById('entityCcDateWarning');
    if (warning) {
      warning.classList.toggle('hidden', !unknown.length);
      warning.textContent = unknown.length ? 'Hay cancelaciones comerciales con fecha de entrega desconocida. Se incluyen en el saldo actual, pero no se atribuyen a un período ni permiten confirmar un cierre por fecha.' : '';
    }
    const rows = Core.currentAccountRows(state, { entityId, currency: entityCcView.currency,
      dateFrom: entityCcView.dateFrom, dateTo: entityCcView.dateTo })
      .filter((row) => !entityCcView.type || row.source === entityCcView.type
        || (entityCcView.type === 'withholding' && row.source.includes('Withholding')))
      .filter((row) => !entityCcView.status || labelForStatus(row.status) === entityCcView.status);
    renderTable('entityCcTable', [
      { label: 'Fecha comercial', value: currentAccountDate, minWidth: 105 },
      { label: 'Tipo', value: currentAccountType, minWidth: 105 },
      { label: 'Referencia', value: currentAccountLabel, link: currentAccountTarget, minWidth: 170 },
      { label: 'Concepto', value: currentAccountConcept, minWidth: 190 },
      ...currentAccountAmountColumns(),
      { label: 'Estado', value: (row) => labelForStatus(row.status), minWidth: 105 },
      { label: 'Acción', node: currentAccountActions, minWidth: 70 }
    ], rows);
  }

  function renderEntityClosings(entityId) {
    const actions = document.getElementById('entityClosingActions');
    if (!actions) return;
    actions.appendChild(actionGroup([{ label: 'Conciliar y registrar cierre', fn: () => openCurrentAccountClosing(entityId) }]));
    const history = document.getElementById('entityClosings');
    (state.currentAccountClosings || []).filter((item) => item.entityId === entityId).sort((a, b) => b.date.localeCompare(a.date)).forEach((item) => {
      const entry = document.createElement('div'); entry.className = 'audit-history-entry';
      entry.textContent = `${formatDate(item.date)} · ${item.currency} · Deuda calculada ${formatMoney(item.debt, item.currency)} / confirmada ${formatMoney(item.confirmedDebt, item.currency)} · Credito calculado ${formatMoney(item.receivable, item.currency)} / confirmado ${formatMoney(item.confirmedReceivable, item.currency)} · ${item.notes}`;
      entry.appendChild(actionGroup([{ label: 'Ver periodo siguiente', fn: () => {
        entityCcView.currency = item.currency; entityCcView.dateFrom = Core.addDays(item.date, 1); entityCcView.dateTo = '';
        showEntityDetail(entityId);
        const opening = document.createElement('p'); opening.className = 'muted';
        opening.textContent = `Apertura comercial calculada: deuda ${formatMoney(item.debt, item.currency)}; credito ${formatMoney(item.receivable, item.currency)}. Diferencias confirmadas pendientes de tratamiento: deuda ${formatMoney(item.confirmedDebt - item.debt, item.currency)}; credito ${formatMoney(item.confirmedReceivable - item.receivable, item.currency)}.`;
        document.getElementById('entityCcTable').parentElement.before(opening);
      } }]));
      history.appendChild(entry);
    });
  }

  async function openCurrentAccountClosing(entityId) {
    let payload;
    const values = await requestEditAction({ title: 'Conciliacion y cierre', description: 'Registra saldos confirmados sin cancelar documentos ni aplicar ajustes. Las diferencias quedan pendientes de tratamiento.', fields: [
      { name: 'date', label: 'Fecha de cierre', type: 'date', value: Core.todayIso(), required: true },
      { name: 'currency', label: 'Moneda', type: 'select', options: Core.CURRENCIES.map((value) => ({ value, label: value })), value: entityCcView.currency },
      { name: 'confirmedDebt', label: 'Deuda por compras confirmada', money: true, required: true },
      { name: 'confirmedReceivable', label: 'Credito por ventas confirmado', money: true, required: true },
      { name: 'notes', label: 'Observaciones / motivo', required: true }
    ], submitLabel: 'Revisar cierre', onSubmit: (input) => {
      payload = { ...input, entityId, confirmedDebt: parseLocaleNumber(input.confirmedDebt), confirmedReceivable: parseLocaleNumber(input.confirmedReceivable) };
      Core.createCurrentAccountClosingTransaction(state, payload, 'vista previa');
    } });
    if (!values) return;
    const summary = Core.currentAccountClosingSummary(state, entityId, payload.currency, payload.date);
    const before = state, version = stateVersion;
    const confirmation = requestEditAction({ title: 'Confirmar cierre visual', description: `Deuda calculada ${formatMoney(summary.debt, payload.currency)} / confirmada ${formatMoney(payload.confirmedDebt, payload.currency)}; credito calculado ${formatMoney(summary.receivable, payload.currency)} / confirmado ${formatMoney(payload.confirmedReceivable, payload.currency)}. Los saldos confirmados no sustituyen las obligaciones.`, fields: [
      { name: 'confirm', label: 'Escribi CONFIRMAR', required: true }
    ], submitLabel: 'Guardar cierre', onSubmit: async (input) => {
      if (String(input.confirm).trim().toUpperCase() !== 'CONFIRMAR') throw new Error('Confirmacion requerida');
      if (state !== before || stateVersion !== version) throw new Error('La base cambio; revisa el cierre nuevamente');
      await postTransaction({ action: 'createCurrentAccountClosing', payload }); showEntityDetail(entityId);
    } });
    const pending = document.createElement('div'); pending.className = 'compensation-edit-preview';
    pending.innerHTML = `<h4>Obligaciones y creditos pendientes al cierre</h4><div class="table-wrap"><table><thead><tr><th>Documento</th><th>Naturaleza</th><th>Saldo</th></tr></thead><tbody>${summary.pendingDocuments.map((item) => {
      const doc = state.documents.find((candidate) => candidate.id === item.documentId);
      return `<tr><td>${escapeHtml(documentDisplayLabel(doc))}</td><td>${Core.documentDirection(doc, state) === 'in' ? 'A cobrar' : 'A pagar'}</td><td class="amount">${formatMoney(item.balance, payload.currency)}</td></tr>`;
    }).join('') || '<tr><td colspan="3">Sin documentos pendientes</td></tr>'}</tbody></table></div>`;
    document.getElementById('editActionFields').prepend(pending);
    await confirmation;
  }

  function addFinancialAccountTrace(lines, id) {
    const account = state.financialAccounts.find((x) => x.id === id);
    if (!account) return;
    const balance = Core.accountBalances(state).find((x) => x.id === id);
    const instruments = state.instruments.filter((x) => x.financialAccountId === id).map((x) => ({ label: `${instrumentDisplayName(x)} ${formatMoney(x.amount, x.currency)}`, target: { type: 'instrument', id: x.id } }));
    const movements = Core.financialMovementRows(state, { financialAccountId: id }).map((x) => ({ label: `${formatDate(x.date)} ${x.description} ${formatMoney(x.amount, x.currency)}`, target: x.source === 'instrument' ? { type: 'instrument', id: x.id } : { type: 'financialAccount', id } }));
    lines.push(['Cuenta financiera', `${account.name} (${account.currency})`]);
    lines.push(['Saldo banco/caja real', formatMoney(balance.realBalance, account.currency)]);
    lines.push(['Proyeccion por cuenta', formatMoney(balance.projectedBalance, account.currency)]);
    lines.push(['Movimientos', linkList(instruments, 'Sin movimientos')]);
    lines.push(['Realizados y ajustes', linkList(movements, 'Sin movimientos realizados')]);
  }

  function accountEconomicSummary(id) {
    const documents = state.documents.filter((doc) => !doc.voidedAt && chartIncludes(doc.chartAccountId, id));
    return [...new Set(documents.map((doc) => doc.currency))].map((currency) => {
      const summary = { currency, original: 0, cancelled: 0, pending: 0, realized: 0, instrumentedPending: 0 };
      documents.filter((doc) => doc.currency === currency).forEach((doc) => {
        const b = Core.documentBreakdown(state, doc.id);
        summary.original += doc.amount;
        summary.cancelled += b.cancelled;
        summary.pending += doc.amount - b.cancelled;
        summary.realized += b.financialRealized;
        summary.instrumentedPending += b.instrumentedFinancialPending;
      });
      return summary;
    });
  }

  function addChartAccountTrace(lines, id) {
    const account = state.chartAccounts.find((x) => x.id === id);
    if (!account) return;
    const docs = state.documents.filter((x) => chartIncludes(x.chartAccountId, id)).map((x) => ({ label: x.number, target: { type: 'document', id: x.id } }));
    lines.push(['Cuenta/concepto', Core.chartPath(state, id)]);
    lines.push(['Actividad', account.activity]);
    accountEconomicSummary(id).forEach((summary) => {
      lines.push([`Resumen ${summary.currency}`, `Documentos ${formatMoney(summary.original, summary.currency)}; cancelado comercialmente ${formatMoney(summary.cancelled, summary.currency)}; saldo comercial pendiente ${formatMoney(summary.pending, summary.currency)}; realizado financieramente ${formatMoney(summary.realized, summary.currency)}; instrumentado pendiente ${formatMoney(summary.instrumentedPending, summary.currency)}`]);
    });
    lines.push(['Documentos', linkList(docs, 'Sin documentos')]);
  }

  function addFlowGroupTrace(lines, target) {
    const rows = target.month ? target.row.rows.filter((row) => row.date?.slice(0, 7) === target.month) : target.row.rows;
    lines.push(['Grupo flujo', target.row.label || target.id]);
    lines.push(['Periodo', target.month || 'Todos los meses visibles']);
    lines.push(['Total trazado', flowCurrencyTotals(rows, target.currency).map((totals) => `${totals.currency}: ${formatFlowMoney(totals.incomes + totals.expenses, totals.currency)}`).join(' · ')]);
    lines.push(['Operaciones origen', linkList(rows.map((row) => ({
      label: `${flowOriginLabel(row)} ${formatMoney(Math.abs(row.amount), row.currency)}`,
      target: { type: row.source, id: row.id, row }
    })), 'Sin operaciones')]);
  }

  function selectedTaxFilters() {
    const mode = document.getElementById('taxMode')?.value || 'month';
    const month = document.getElementById('taxMonth')?.value || Core.todayIso().slice(0, 7);
    const year = document.getElementById('taxYear')?.value || Core.todayIso().slice(0, 4);
    const exercise = document.getElementById('taxExercise')?.value || Core.managementExerciseForDate(Core.todayIso());
    const filters = {
      mode,
      year,
      exercise,
      reading: document.getElementById('taxReading')?.value || 'total',
      activity: document.getElementById('taxActivity')?.value || '',
      currency: document.getElementById('taxCurrency')?.value || 'ARS'
    };
    if (mode === 'month') {
      const bounds = Core.monthBounds(month);
      filters.mode = 'custom';
      filters.dateFrom = bounds.from;
      filters.dateTo = bounds.to;
    }
    return filters;
  }

  function openTaxReimbursementForm() {
    const panel = document.getElementById('taxReimbursementFormPanel');
    if (!panel) return;
    fillOptions('taxReimbursementEntity', (state.entities || []).filter((item) => item.active !== false).map((item) => ({ value: item.id, label: item.name })), (state.entities || []).find((item) => /arca|afip/i.test(item.name || ''))?.id || '');
    document.getElementById('taxReimbursementDate').value = Core.todayIso();
    document.getElementById('taxReimbursementAmount').value = '';
    document.getElementById('taxReimbursementReference').value = '';
    document.getElementById('taxReimbursementNotes').value = '';
    document.getElementById('taxReimbursementSuccess')?.classList.add('hidden');
    document.getElementById('taxReimbursementError')?.classList.add('hidden');
    refreshTaxReimbursementAccounts();
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function refreshTaxReimbursementAccounts() {
    const currency = valueFromInput('taxReimbursementCurrency') || 'ARS';
    const accounts = (state.financialAccounts || []).filter((account) => account.active !== false && account.currency === currency && (account.productType || 'bank_account') === 'bank_account' && account.type !== 'cash');
    fillOptions('taxReimbursementAccount', accounts.map((account) => ({ value: account.id, label: account.name })), accounts[0]?.id || '');
  }

  function renderTaxes() {
    renderTaxPaymentPlans();
    const container = document.getElementById('taxCards');
    if (!container) return;
    const filters = selectedTaxFilters();
    const totals = Core.taxTotals(state, filters);
    const practiced = (state.orderPracticedWithholdings || []).filter((item) => !item.voidedAt);
    renderTable('taxPracticedTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date) },
      { label: 'Tipo', value: (row) => Core.labelForTaxType(row.taxType) },
      { label: 'Proveedor', value: (row) => Core.entityName(state, state.orders.find((order) => order.id === row.orderId)?.entityId) },
      { label: 'OP', value: (row) => orderDisplayCode(state.orders.find((order) => order.id === row.orderId)), link: (row) => ({ type: 'order', id: row.orderId }) },
      { label: 'Documento', value: (row) => state.documents.find((doc) => doc.id === state.orderDocuments.find((link) => link.id === row.orderDocumentId)?.documentId)?.number || 'Sin número', link: (row) => ({ type: 'document', id: state.orderDocuments.find((link) => link.id === row.orderDocumentId)?.documentId }) },
      { label: 'Original', value: (row) => formatMoney(row.amount, row.currency), className: () => 'amount' },
      { label: 'Pendiente ARCA', value: (row) => formatMoney(Core.practicedWithholdingBalance(state, row.id), row.currency), className: () => 'amount' }
    ], practiced);
    const rows = [
      ['IVA debito', totals.vatDebit],
      ['IVA credito', totals.vatCredit],
      ['Diferencia IVA debito - IVA credito', totals.vatDifference],
      ['Retenciones IVA sufridas', totals.vatWithholdings],
      ['Retenciones practicadas pendientes ARCA', totals.practicedPending],
      ['Retenciones practicadas ingresadas', totals.practicedPaid],
      ['Percepciones IVA sufridas', totals.vatPerceptions],
      ['Reintegros recibidos', totals.vatReimbursements],
      ['Debitos/creditos bancarios', totals.bankDebitCreditTax],
      ['Otros', totals.other]
    ];
    container.innerHTML = rows.map(([label, value]) => `<div class="summary-line"><span>${label}</span><strong class="${value < 0 ? 'negative' : value > 0 ? 'positive' : ''}">${formatMoney(value, filters.currency)}</strong></div>`).join('');
    const matrixRows = Core.taxMatrix(state, filters);
    const months = matrixRows[0]?.values.map((item) => item.month) || [];
    renderTable('taxMatrixTable', [
      { label: 'Concepto', value: 'label', minWidth: 220 },
      ...months.map((month) => ({ label: month, value: (row) => formatMoney(row.values.find((item) => item.month === month)?.amount || 0, filters.currency), className: () => 'amount', minWidth: 120 })),
      { label: 'Total', value: (row) => formatMoney(row.total, filters.currency), className: () => 'amount', minWidth: 130 }
    ], matrixRows);
    renderTable('taxDetailTable', [
      { label: 'Fecha', value: (row) => formatDate(row.date), minWidth: 110 },
      { label: 'Impuesto', value: 'label', minWidth: 190 },
      { label: 'Actividad', value: 'activity', minWidth: 150 },
      { label: 'Contraparte', value: 'entityName', link: (row) => row.entityId ? ({ type: 'entity', id: row.entityId }) : null, minWidth: 190 },
      { label: 'Origen', value: 'description', link: (row) => row.documentId ? ({ type: 'document', id: row.documentId }) : row.instrumentId ? ({ type: 'instrument', id: row.instrumentId }) : null, minWidth: 260 },
      { label: 'Importe', value: (row) => formatMoney(row.amount, row.currency), className: () => 'amount', minWidth: 130 }
    ], totals.rows);
  }

  function renderTaxPaymentPending() {
    const account = state.financialAccounts.find((item) => item.id === valueFromInput('taxPaymentAccount'));
    const rows = (state.orderPracticedWithholdings || []).filter((item) => !item.voidedAt && (!account || item.currency === account.currency) && Core.practicedWithholdingBalance(state, item.id) > 0.001);
    document.getElementById('taxPaymentPending').innerHTML = rows.length ? rows.map((item) => {
      const remaining = Core.practicedWithholdingBalance(state, item.id);
      const order = state.orders.find((entry) => entry.id === item.orderId);
      return `<label class="selection-row"><input type="checkbox" data-tax-id="${escapeHtml(item.id)}"><span>${escapeHtml(Core.labelForTaxType(item.taxType))} · ${escapeHtml(orderDisplayCode(order))} · ${escapeHtml(Core.entityName(state, order?.entityId))} · pendiente ${formatMoney(remaining, item.currency)}</span><input type="number" data-tax-amount="${escapeHtml(item.id)}" min="0.01" max="${remaining}" step="0.01" value="${remaining}"></label>`;
    }).join('') : '<p>No hay retenciones practicadas pendientes para esta moneda.</p>';
    document.querySelectorAll('#taxPaymentPending [data-tax-amount]').forEach(wireDecimalNumberInput);
    syncTaxPaymentConcept();
    syncTaxPaymentAvailability(rows.length > 0);
  }

  function syncTaxPaymentAvailability(hasPending) {
    const hasAuthority = state.entities.some((item) => item.id === valueFromInput('taxPaymentEntity') && item.active !== false && /ARCA|AFIP/i.test(item.name || ''));
    const account = state.financialAccounts.find((item) => item.id === valueFromInput('taxPaymentAccount') && item.active !== false && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account');
    const enabled = hasPending && hasAuthority && !!account;
    ['taxPaymentDate', 'taxPaymentConcept', 'taxPaymentReference', 'taxPaymentNotes'].forEach((id) => { document.getElementById(id).disabled = !enabled; });
    const selected = document.querySelectorAll('#taxPaymentPending [data-tax-id]:checked').length > 0;
    document.querySelector('#taxPaymentForm button[type="submit"]').disabled = !enabled || !selected;
  }

  function syncTaxPaymentConcept() {
    const input = document.getElementById('taxPaymentConcept');
    if (!input) return;
    const ids = [...document.querySelectorAll('#taxPaymentPending [data-tax-id]:checked')].map((item) => item.dataset.taxId);
    const suggested = Core.taxPaymentSuggestedConcept(state, ids);
    if (!input.value.trim() || input.value === input.dataset.suggested) input.value = suggested;
    input.dataset.suggested = suggested;
    syncTaxPaymentAvailability(document.querySelectorAll('#taxPaymentPending [data-tax-id]').length > 0);
  }

  function openTaxPaymentForm() {
    const authorities = (state.entities || []).filter((item) => item.active !== false && /ARCA|AFIP/i.test(item.name || ''));
    const accounts = (state.financialAccounts || []).filter((item) => item.active !== false && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account');
    fillOptions('taxPaymentEntity', authorities.map((item) => ({ value: item.id, label: item.name })));
    fillOptions('taxPaymentAccount', accounts.map((item) => ({ value: item.id, label: item.name })));
    document.getElementById('taxPaymentDate').value = Core.todayIso();
    document.getElementById('taxPaymentConcept').value = '';
    document.getElementById('taxPaymentConcept').dataset.suggested = '';
    document.getElementById('taxPaymentReference').value = '';
    document.getElementById('taxPaymentNotes').value = '';
    const errorBox = document.getElementById('taxPaymentError');
    errorBox.classList.toggle('hidden', authorities.length > 0 && accounts.length > 0);
    if (!authorities.length) errorBox.textContent = 'Primero creá la contraparte ARCA en Contrapartes.';
    else if (!accounts.length) errorBox.textContent = 'No hay una cuenta bancaria activa para registrar el VEP.';
    document.querySelector('#taxPaymentForm button[type="submit"]').disabled = !authorities.length || !accounts.length;
    document.getElementById('taxPaymentFormPanel').classList.remove('hidden');
    renderTaxPaymentPending();
    document.getElementById('taxPaymentFormPanel').scrollIntoView({ block: 'start' });
  }

  function renderClosing() {
    const table = document.getElementById('closingEconomicTable');
    if (!table) return;
    const exercise = document.getElementById('closingExercise')?.value || Core.managementExerciseForDate(Core.todayIso());
    const reading = document.getElementById('closingReading')?.value || 'total';
    const currency = document.getElementById('closingCurrency')?.value || 'ARS';
    const dateFrom = document.getElementById('closingDateFrom')?.value || '';
    const dateTo = document.getElementById('closingDateTo')?.value || '';
    const summary = Core.closingSummary(state, { exercise, reading, currency, dateFrom, dateTo });
    const totalEconomic = reading === 'total' ? summary.economic : Core.economicSummary(state, { ...summary.economicRange, currency, reading: 'total' });
    renderEconomicNotes('closingEconomicPeriod', 'closingEconomicWarnings', summary.exercise, summary.economicRange, [{ currency, summary: totalEconomic }]);
    const economicRows = summary.economic.byActivity.filter((row) => row.income || row.expense || row.result);
    const total = { activity: 'TOTAL', ...summary.economic };
    const economicNode = (row, metric) => indicatorAmountNode(Core.economicIndicatorDetail(state, row, metric, {
      exercise, ...summary.economicRange, reading, currency, activity: row.activity === 'TOTAL' ? '' : row.activity
    }));
    renderTable('closingEconomicTable', [
      { label: 'Actividad', value: 'activity', minWidth: 180 },
      { label: 'Ingresos economicos', node: (row) => economicNode(row, 'income'), className: () => 'amount positive', minWidth: 170 },
      { label: 'Egresos/costos economicos', node: (row) => economicNode(row, 'expense'), className: () => 'amount negative', minWidth: 190 },
      { label: 'Resultado gestion', node: (row) => economicNode(row, 'result'), className: (row) => `amount ${row.result < 0 ? 'negative' : 'positive'}`, minWidth: 170 }
    ], [...economicRows, total]);
    renderTable('closingFinancialTable', [
      { label: 'Indicador', value: 'label', minWidth: 220 },
      { label: 'Importe', node: (row) => indicatorAmountNode(Core.closingIndicatorDetail(state, summary, row.metric), row.label), className: (row) => `amount ${row.value < 0 ? 'negative' : row.value > 0 ? 'positive' : ''}`, minWidth: 150 }
    ], [
      { label: 'Banco/Caja real', metric: 'bankCash', value: summary.financial.bankCash },
      { label: 'Cuentas a cobrar pendientes', metric: 'receivable', value: summary.financial.receivable },
      { label: 'Cuentas a pagar pendientes', metric: 'payable', value: summary.financial.payable },
      { label: 'Cheques de terceros en cartera (a cobrar)', metric: 'pendingReceivableValues', value: summary.financial.pendingReceivableValues },
      { label: 'Cheques propios diferidos (a pagar)', metric: 'pendingValues', value: summary.financial.pendingValues },
      { label: 'Diferencia IVA debito - IVA credito', metric: 'vatDifference', value: summary.taxes.vatDifference },
      { label: 'Retenciones IVA/percepciones IVA/reintegros informados por separado', metric: 'vatRelated', value: summary.taxes.vatWithholdings + summary.taxes.vatPerceptions + summary.taxes.vatReimbursements }
    ]);
    const readings = ['total', 'documented', 'no_receipt'].map((item) => {
      const s = Core.economicSummary(state, { ...summary.economicRange, reading: item, currency });
      return { reading: item === 'total' ? 'Gestion total' : item === 'documented' ? 'Documentado' : 'Sin comprobante', readingKey: item, summary: s };
    });
    renderTable('closingReadingTable', [
      { label: 'Lectura', value: 'reading', minWidth: 180 },
      ...[['income', 'Ingresos'], ['expense', 'Costos'], ['result', 'Resultado de gestión']].map(([metric, label]) => ({ label,
        node: (row) => indicatorAmountNode(Core.economicIndicatorDetail(state, row.summary, metric, { exercise, ...summary.economicRange, currency, reading: row.readingKey })),
        className: () => 'amount', minWidth: 150 }))
    ], readings);
  }

  function renderSelects() {
    ['docActivity', 'entitySuggestedActivity', 'flowActivityFilter'].forEach((id) => {
      const select = document.getElementById(id);
      if (select && !Array.from(select.options || []).some((option) => option.value === 'Financiero')) {
        const option = document.createElement('option'); option.value = 'Financiero'; option.textContent = 'Financiero'; select.appendChild(option);
      }
    });
    const docSelected = document.getElementById('docEntity').value;
    const orderSelected = document.getElementById('orderEntity').value;
    const entityRoleSelected = document.getElementById('entityRoleFilter').value;
    const checkEntitySelected = document.getElementById('checkEntityFilter').value;
    const checkStatusSelected = document.getElementById('checkStatusFilter').value;
    const ccEntitySelected = document.getElementById('ccEntityFilter').value;
    const treasuryInstrumentStatusSelected = document.getElementById('treasuryInstrumentStatusFilter')?.value || '';
    const treasuryInstrumentAccountSelected = document.getElementById('treasuryInstrumentAccountFilter')?.value || '';
    const treasuryInstrumentEntitySelected = document.getElementById('treasuryInstrumentEntityFilter')?.value || '';
    const grainCerealSelected = document.getElementById('grainCerealFilter')?.value || '';
    const grainCampaignSelected = document.getElementById('grainCampaignFilter')?.value || '';
    const grainLocationSelected = document.getElementById('grainLocationFilter')?.value || '';
    const grainOpCerealSelected = document.getElementById('grainOpCereal')?.value || '';
    const grainOpLocationSelected = document.getElementById('grainOpLocation')?.value || '';
    const grainOpDestinationLocationSelected = document.getElementById('grainOpDestinationLocation')?.value || '';
    const grainOpEntitySelected = document.getElementById('grainOpEntity')?.value || '';
    const grainOpChartSelected = document.getElementById('grainOpChart')?.value || '';
    const grainOpDocumentSelected = document.getElementById('grainOpDocument')?.value || '';
    const livestockCategorySelected = document.getElementById('livestockCategoryFilter')?.value || '';
    const livestockHerdSelected = document.getElementById('livestockHerdFilter')?.value || '';
    const livestockLocationSelected = document.getElementById('livestockLocationFilter')?.value || '';
    const livestockOpCategorySelected = document.getElementById('livestockOpCategory')?.value || '';
    const livestockOpHerdSelected = document.getElementById('livestockOpHerd')?.value || '';
    const livestockOpDestinationHerdSelected = valueFromInput('livestockOpDestinationHerd');
    const livestockOpDestinationCategorySelected = valueFromInput('livestockOpDestinationCategory');
    const livestockOpLocationSelected = document.getElementById('livestockOpLocation')?.value || '';
    const livestockOpDestinationLocationSelected = document.getElementById('livestockOpDestinationLocation')?.value || '';
    const livestockOpEntitySelected = document.getElementById('livestockOpEntity')?.value || '';
    const livestockOpChartSelected = document.getElementById('livestockOpChart')?.value || '';
    const livestockMovementCategorySelected = document.getElementById('livestockMovementCategory')?.value || '';
    const livestockMovementHerdSelected = document.getElementById('livestockMovementHerd')?.value || '';
    const livestockMovementLocationSelected = document.getElementById('livestockMovementLocation')?.value || '';
    const livestockMovementDestinationSelected = document.getElementById('livestockMovementDestination')?.value || '';
    const livestockMovementEntitySelected = document.getElementById('livestockMovementEntity')?.value || '';
    const livestockMovementChartSelected = document.getElementById('livestockMovementChart')?.value || '';
    const flowChartSelected = document.getElementById('flowChartFilter')?.value || '';
    const flowEntitySelected = document.getElementById('flowEntityFilter')?.value || '';
    const flowExerciseSelected = document.getElementById('flowExercise')?.value || '';
    const chartSelected = document.getElementById('docChartAccount').value;
    const suggestedChartSelected = document.getElementById('entitySuggestedChart').value;
    const financialInstitutionSelected = document.getElementById('financialProductInstitution')?.value || '';
    const exerciseOptions = availableExercises().map((exercise) => `<option value="${exercise}">${exercise}</option>`).join('');
    const activeEntities = state.entities.filter((entity) => entity.active !== false && !entity.mergedIntoEntityId);
    const entityOptions = activeEntities.map((entity) => `<option value="${entity.id}">${entity.name}</option>`).join('');
    document.getElementById('docEntity').value = docSelected;
    renderDocumentEntitySuggestions();
    document.getElementById('orderEntity').innerHTML = `<option value="">Todas las contrapartes</option>${entityOptionsFor('orderEntitySearch', orderSelected)}`;
    if (orderSelected && state.entities.some((entity) => entity.id === orderSelected)) document.getElementById('orderEntity').value = orderSelected;
    else document.getElementById('orderEntity').value = '';
    document.getElementById('entityRole').innerHTML = roleOptions(false);
    document.getElementById('entityRoleFilter').innerHTML = roleOptions(true);
    document.getElementById('entityRoleFilter').value = entityRoleSelected;
    document.getElementById('checkEntityFilter').innerHTML = `<option value="">Todas</option>${entityOptions}`;
    document.getElementById('checkEntityFilter').value = checkEntitySelected;
    const treasuryEntityFilter = document.getElementById('treasuryInstrumentEntityFilter');
    if (treasuryEntityFilter) {
      treasuryEntityFilter.innerHTML = `<option value="">Todas</option>${entityOptions}`;
      treasuryEntityFilter.value = treasuryInstrumentEntitySelected;
    }
    document.getElementById('ccEntityFilter').innerHTML = entityOptions;
    document.getElementById('ccEntityFilter').value = ccEntitySelected || activeEntities[0]?.id || '';
    ['entityMergeSource', 'entityMergeTarget'].forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;
      const selected = select.value;
      select.innerHTML = `<option value="">Seleccionar</option>${entityOptions}`;
      if (selected && activeEntities.some((entity) => entity.id === selected)) select.value = selected;
    });
    const chartOptions = state.chartAccounts.map((account) => `<option value="${account.id}">${Core.chartPath(state, account.id)}</option>`).join('');
    refreshDocumentChartOptions();
    if (chartSelected && state.chartAccounts.some((account) => account.id === chartSelected && chartOptionsForActivity(valueFromInput('docActivity') || 'Agricultura').some((option) => option.id === account.id))) {
      document.getElementById('docChartAccount').value = chartSelected;
    }
    document.getElementById('entitySuggestedChart').innerHTML = `<option value="">Sin sugerencia</option>${chartOptions}`;
    document.getElementById('entitySuggestedChart').value = suggestedChartSelected;
    document.getElementById('flowChartFilter').innerHTML = `<option value="">Todas</option>${chartOptions}`;
    document.getElementById('flowChartFilter').value = flowChartSelected;
    document.getElementById('flowEntityFilter').innerHTML = `<option value="">Todas</option>${entityOptions}`;
    document.getElementById('flowEntityFilter').value = flowEntitySelected;
    const accountOptionLabel = (account) => `${Core.accountName(state, account.id)} (${account.currency})`;
    document.getElementById('orderAccount').innerHTML = state.financialAccounts.map((account) => `<option value="${account.id}">${accountOptionLabel(account)}</option>`).join('');
    document.querySelectorAll('.instrument-row').forEach((row) => syncInstrumentAccountOptions(row));
    const financialProductInstitution = document.getElementById('financialProductInstitution');
    if (financialProductInstitution) {
      financialProductInstitution.innerHTML = (state.financialInstitutions || []).map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
      financialProductInstitution.value = financialInstitutionSelected && (state.financialInstitutions || []).some((item) => item.id === financialInstitutionSelected) ? financialInstitutionSelected : (state.financialInstitutions || [])[0]?.id || '';
    }
    const reconcileAccount = document.getElementById('reconcileAccount');
    if (reconcileAccount) {
      const selected = reconcileAccount.value;
      reconcileAccount.innerHTML = state.financialAccounts.map((account) => `<option value="${account.id}">${account.name} (${account.currency})</option>`).join('');
      reconcileAccount.value = selected && state.financialAccounts.some((account) => account.id === selected) ? selected : state.financialAccounts[0]?.id || '';
    }
    const treasuryAccountFilter = document.getElementById('treasuryInstrumentAccountFilter');
    if (treasuryAccountFilter) {
      treasuryAccountFilter.innerHTML = `<option value="">Todas</option>${state.financialAccounts.map((account) => `<option value="${account.id}">${account.name} (${account.currency})</option>`).join('')}`;
      treasuryAccountFilter.value = treasuryInstrumentAccountSelected;
    }
    document.getElementById('checkStatusFilter').innerHTML = [''].concat(['issued', 'delivered', 'debited', 'received', 'inPortfolio', 'deposited', 'endorsed', 'accredited', 'rejected', 'cancelled', 'voided']).map((status) => `<option value="${status}">${status ? labelForStatus(status) : 'Todos'}</option>`).join('');
    document.getElementById('checkStatusFilter').value = checkStatusSelected;
    const treasuryStatusFilter = document.getElementById('treasuryInstrumentStatusFilter');
    if (treasuryStatusFilter) {
      treasuryStatusFilter.innerHTML = [''].concat(['scheduled', 'executed', 'issued', 'delivered', 'debited', 'received', 'inPortfolio', 'deposited', 'endorsed', 'accredited', 'rejected', 'cancelled', 'voided']).map((status) => `<option value="${status}">${status ? labelForStatus(status) : 'Todos'}</option>`).join('');
      treasuryStatusFilter.value = treasuryInstrumentStatusSelected;
    }
    const grainCereals = Array.from(new Set([...(state.grainMovements || []).map((item) => item.cereal), ...(state.grainForwards || []).map((item) => item.cereal), ...(state.grainReferencePrices || []).map((item) => item.cereal)].filter(Boolean))).sort();
    const grainCampaigns = Array.from(new Set([...(state.grainMovements || []).map((item) => item.campaign), ...(state.grainForwards || []).map((item) => item.campaign), ...(state.grainReferencePrices || []).map((item) => item.campaign)].filter(Boolean))).sort();
    const grainCerealFilter = document.getElementById('grainCerealFilter');
    if (grainCerealFilter) {
      grainCerealFilter.innerHTML = `<option value="">Todos</option>${grainCereals.map((item) => `<option value="${item}">${item}</option>`).join('')}`;
      grainCerealFilter.value = grainCerealSelected && grainCereals.includes(grainCerealSelected) ? grainCerealSelected : '';
    }
    const grainCampaignFilter = document.getElementById('grainCampaignFilter');
    if (grainCampaignFilter) {
      grainCampaignFilter.innerHTML = `<option value="">Todas</option>${grainCampaigns.map((item) => `<option value="${item}">${item}</option>`).join('')}`;
      grainCampaignFilter.value = grainCampaignSelected && grainCampaigns.includes(grainCampaignSelected) ? grainCampaignSelected : '';
    }
    const grainLocationFilter = document.getElementById('grainLocationFilter');
    if (grainLocationFilter) {
      grainLocationFilter.innerHTML = `<option value="">Todas</option>${(state.grainLocations || []).map((location) => `<option value="${location.id}">${location.name}</option>`).join('')}`;
      grainLocationFilter.value = grainLocationSelected && (state.grainLocations || []).some((location) => location.id === grainLocationSelected) ? grainLocationSelected : '';
    }
    fillOptions('grainOpCereal', Core.GRAIN_TYPES.map((item) => ({ value: item, label: item })), grainOpCerealSelected || Core.GRAIN_TYPES[0]);
    fillOptions('grainOpLocation', (state.grainLocations || []).map((location) => ({ value: location.id, label: location.name })), grainOpLocationSelected || (state.grainLocations || [])[0]?.id || '');
    fillOptions('grainOpDestinationLocation', (state.grainLocations || []).map((location) => ({ value: location.id, label: location.name })), grainOpDestinationLocationSelected || (state.grainLocations || [])[0]?.id || '');
    fillOptions('grainOpEntity', state.entities.map((entity) => ({ value: entity.id, label: `${entity.name}${entity.cuit ? ` (${entity.cuit})` : ''}` })), grainOpEntitySelected || state.entities[0]?.id || '');
    {
      const grainMode = valueFromInput('grainOperationMode') || 'harvest';
      const options = chartOptionsForGrainOperation(grainMode);
      const fallback = options.find((account) => account.id === 'CA-AGRI-CEREALES-SOJA')?.id || options[0]?.id || '';
      fillOptions('grainOpChart', options.map((account) => ({ value: account.id, label: Core.chartPath(state, account.id) })), options.some((account) => account.id === grainOpChartSelected) ? grainOpChartSelected : fallback);
    }
    fillOptions('grainOpDocument', state.documents.filter((doc) => Core.documentDirection(doc, state) === 'out' && (Core.documentBreakdown(state, doc.id)?.nonInstrumented || 0) > 0.01).map((doc) => ({ value: doc.id, label: `${doc.number} · ${Core.entityName(state, doc.entityId)} · ${formatMoney(Core.documentBreakdown(state, doc.id)?.nonInstrumented || 0, doc.currency)}` })), grainOpDocumentSelected);
    const livestockCategoryFilter = document.getElementById('livestockCategoryFilter');
    if (livestockCategoryFilter) {
      const categories = Array.from(new Set([...(state.livestockMovements || []).map((item) => item.category), ...Core.LIVESTOCK_CATEGORIES].filter(Boolean))).sort();
      livestockCategoryFilter.innerHTML = `<option value="">Todas</option>${categories.map((item) => `<option value="${item}">${item}</option>`).join('')}`;
      livestockCategoryFilter.value = livestockCategorySelected && categories.includes(livestockCategorySelected) ? livestockCategorySelected : '';
    }
    const livestockHerdFilter = document.getElementById('livestockHerdFilter');
    if (livestockHerdFilter) {
      livestockHerdFilter.innerHTML = `<option value="">Todas</option>${(state.livestockHerds || []).map((herd) => `<option value="${herd.id}">${herd.name}</option>`).join('')}`;
      livestockHerdFilter.value = livestockHerdSelected && (state.livestockHerds || []).some((herd) => herd.id === livestockHerdSelected) ? livestockHerdSelected : '';
    }
    const livestockLocationFilter = document.getElementById('livestockLocationFilter');
    if (livestockLocationFilter) {
      livestockLocationFilter.innerHTML = `<option value="">Todas</option>${(state.livestockLocations || []).map((location) => `<option value="${location.id}">${location.name}</option>`).join('')}`;
      livestockLocationFilter.value = livestockLocationSelected && (state.livestockLocations || []).some((location) => location.id === livestockLocationSelected) ? livestockLocationSelected : '';
    }
    fillOptions('livestockOpCategory', Core.LIVESTOCK_CATEGORIES.map((item) => ({ value: item, label: item })), livestockOpCategorySelected || Core.LIVESTOCK_CATEGORIES[0]);
    fillOptions('livestockOpHerd', (state.livestockHerds || []).map((herd) => ({ value: herd.id, label: herd.name })), livestockOpHerdSelected || (state.livestockHerds || [])[0]?.id || '');
    fillOptions('livestockOpDestinationHerd', (state.livestockHerds || []).filter((herd) => herd.status !== 'inactive').map((herd) => ({ value: herd.id, label: herd.name })), livestockOpDestinationHerdSelected || livestockOpHerdSelected || (state.livestockHerds || [])[0]?.id || '');
    fillOptions('livestockOpDestinationCategory', Core.LIVESTOCK_CATEGORIES.map((item) => ({ value: item, label: item })), livestockOpDestinationCategorySelected || Core.LIVESTOCK_CATEGORIES[0]);
    fillOptions('livestockOpLocation', (state.livestockLocations || []).map((location) => ({ value: location.id, label: location.name })), livestockOpLocationSelected || (state.livestockLocations || [])[0]?.id || '');
    fillOptions('livestockOpDestinationLocation', (state.livestockLocations || []).map((location) => ({ value: location.id, label: location.name })), livestockOpDestinationLocationSelected || (state.livestockLocations || [])[0]?.id || '');
    fillOptions('livestockOpEntity', state.entities.map((entity) => ({ value: entity.id, label: `${entity.name}${entity.cuit ? ` (${entity.cuit})` : ''}` })), livestockOpEntitySelected || state.entities[0]?.id || '');
    {
      const livestockMode = valueFromInput('livestockOperationMode') || 'purchase';
      const options = chartOptionsForLivestockOperation(livestockMode);
      const fallback = livestockMode === 'sale'
        ? options.find((account) => account.id === 'CA-GAN-VENTAS')?.id || options[0]?.id || ''
        : options.find((account) => account.id === 'CA-GAN-COMPRA-HACIENDA')?.id || options.find((account) => /compra|hacienda/i.test(Core.chartPath(state, account.id)))?.id || options[0]?.id || '';
      const rows = options.length
        ? options.map((account) => ({ value: account.id, label: Core.chartPath(state, account.id) }))
        : [{ value: '', label: livestockMode === 'purchase' ? 'Falta cuenta Compra hacienda' : 'Sin cuenta disponible' }];
      fillOptions('livestockOpChart', rows, options.some((account) => account.id === livestockOpChartSelected) ? livestockOpChartSelected : fallback);
    }
    ['panelExercise', 'taxExercise', 'closingExercise'].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      const selected = element.value;
      element.innerHTML = exerciseOptions;
      element.value = selected || Core.managementExerciseForDate(Core.todayIso());
    });
    const flowExercise = document.getElementById('flowExercise');
    if (flowExercise) {
      flowExercise.innerHTML = `<option value="">Desde mes elegido</option>${exerciseOptions}`;
      flowExercise.value = flowExerciseSelected;
    }
    renderOrderDocumentsList();
  }

  function availableExercises() {
    const set = new Set([Core.managementExerciseForDate(Core.todayIso())]);
    (state.agriculturalIncomeProjections || []).filter((item) => item.status === 'estimated').forEach((item) => set.add(Core.managementExerciseForDate(item.plannedDate)));
    state.documents.forEach((doc) => {
      set.add(Core.managementExerciseForDate(doc.issueDate));
      set.add(Core.managementExerciseForDate(doc.dueDate));
    });
    return Array.from(set).sort();
  }


  // ---- Notas y tareas: texto libre, sin efecto económico ni financiero. ----
  function noteElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function noteDueLabel(note) {
    if (!note.dueDate) return null;
    const today = Core.todayIso();
    const label = noteElement('span', 'note-due', formatDate(note.dueDate));
    if (!note.done && note.dueDate < today) { label.classList.add('overdue'); label.textContent = `Vencida ${formatDate(note.dueDate)}`; }
    else if (!note.done && note.dueDate === today) { label.classList.add('today'); label.textContent = 'Hoy'; }
    return label;
  }

  function noteActions(note) {
    const group = noteElement('span', 'note-actions');
    const edit = noteElement('button', 'secondary mini-action', 'Editar'); edit.type = 'button';
    edit.addEventListener('click', () => editNote(note.id));
    const remove = noteElement('button', 'secondary mini-action', 'Borrar'); remove.type = 'button';
    remove.addEventListener('click', () => deleteNote(note.id));
    group.append(edit, remove);
    return group;
  }

  function renderNotes() {
    const taskList = document.getElementById('notesTaskList');
    if (!taskList) return;
    const notes = state.notes || [];
    const byDue = (x, y) => (x.dueDate || '9999').localeCompare(y.dueDate || '9999') || String(y.createdAt).localeCompare(String(x.createdAt));
    const pending = notes.filter((item) => item.kind === 'task' && !item.done).sort(byDue);
    const done = notes.filter((item) => item.kind === 'task' && item.done).sort((x, y) => String(y.doneAt || y.updatedAt).localeCompare(String(x.doneAt || x.updatedAt)));
    const plain = notes.filter((item) => item.kind === 'note').sort((x, y) => String(y.updatedAt).localeCompare(String(x.updatedAt)));
    const taskItem = (note) => {
      const li = noteElement('li', 'note-task');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = Boolean(note.done);
      check.setAttribute('aria-label', note.done ? 'Marcar como pendiente' : 'Marcar como hecha');
      check.addEventListener('change', () => toggleNoteDone(note.id, check.checked));
      const text = noteElement('div', 'note-text');
      text.appendChild(noteElement('span', 'note-title', note.title));
      const due = noteDueLabel(note); if (due) text.appendChild(due);
      if (note.body) text.appendChild(noteElement('p', 'note-body', note.body));
      li.append(check, text, noteActions(note));
      return li;
    };
    taskList.innerHTML = '';
    pending.forEach((note) => taskList.appendChild(taskItem(note)));
    if (!pending.length) taskList.appendChild(noteElement('li', 'note-empty', 'No hay tareas pendientes. Agregá una arriba.'));
    const doneList = document.getElementById('notesDoneList');
    doneList.innerHTML = '';
    done.forEach((note) => doneList.appendChild(taskItem(note)));
    const cards = document.getElementById('notesList');
    cards.innerHTML = '';
    plain.forEach((note) => {
      const card = noteElement('article', 'note-card');
      card.appendChild(noteElement('h4', '', note.title));
      if (note.body) card.appendChild(noteElement('p', 'note-body', note.body));
      const foot = noteElement('div', 'note-foot');
      foot.appendChild(noteElement('span', 'note-meta', `Actualizada ${formatDate(String(note.updatedAt || note.createdAt).slice(0, 10))}`));
      foot.appendChild(noteActions(note));
      card.appendChild(foot);
      cards.appendChild(card);
    });
    if (!plain.length) cards.appendChild(noteElement('p', 'note-empty', 'Todavía no hay notas.'));
    document.getElementById('notesPendingCount').textContent = String(pending.length);
    document.getElementById('notesDoneCount').textContent = `(${done.length})`;
    const tabCount = document.getElementById('notesTabCount');
    if (tabCount) tabCount.textContent = pending.length ? String(pending.length) : '';
  }

  function resetNoteForm() {
    ['noteId', 'noteTitle', 'noteDueDate', 'noteBody'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
    document.getElementById('noteKind').value = 'task';
    document.getElementById('saveNote').textContent = 'Agregar';
    document.getElementById('cancelNoteEdit').classList.add('hidden');
    document.getElementById('noteBodyFold').open = false;
    document.getElementById('noteError').classList.add('hidden');
  }

  function editNote(id) {
    const note = (state.notes || []).find((item) => item.id === id);
    if (!note) return;
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteKind').value = note.kind;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteDueDate').value = note.dueDate || '';
    document.getElementById('noteBody').value = note.body || '';
    document.getElementById('noteBodyFold').open = Boolean(note.body);
    document.getElementById('saveNote').textContent = 'Guardar cambios';
    document.getElementById('cancelNoteEdit').classList.remove('hidden');
    document.getElementById('noteTitle').focus();
  }

  async function saveNoteFromForm() {
    const id = document.getElementById('noteId').value;
    const existing = id ? (state.notes || []).find((item) => item.id === id) : null;
    const payload = { id: id || undefined, kind: document.getElementById('noteKind').value, title: document.getElementById('noteTitle').value,
      dueDate: document.getElementById('noteDueDate').value, body: document.getElementById('noteBody').value, done: existing?.done || false };
    try {
      await postTransaction({ action: 'saveNote', payload });
      resetNoteForm();
    } catch (error) {
      const box = document.getElementById('noteError');
      box.textContent = error.message; box.classList.remove('hidden');
    }
  }

  async function toggleNoteDone(id, done) {
    const note = (state.notes || []).find((item) => item.id === id);
    if (!note) return;
    try { await postTransaction({ action: 'saveNote', payload: { ...note, done } }); } catch (error) { alert(error.message); renderNotes(); }
  }

  async function deleteNote(id) {
    const note = (state.notes || []).find((item) => item.id === id);
    if (!note || !confirm(`¿Borrar "${note.title}"?`)) return;
    try { await postTransaction({ action: 'deleteNote', id }); } catch (error) { alert(error.message); }
  }

  function render() {
    const stages = {};
    const stage = (name, fn) => {
      const startedAt = Date.now();
      try { fn(); } finally { stages[name] = Date.now() - startedAt; }
    };
    stage('selects', renderSelects);
    stage('panel', renderPanel);
    stage('notes', renderNotes);
    stage('corrections', renderCorrections);
    stage('entities', renderEntities);
    stage('flow', renderFlow);
    stage('operations', renderOperations);
    stage('generalMovements', renderGeneralMovements);
    stage('treasury', renderTreasury);
    stage('cereals', renderCereals);
    stage('livestock', renderLivestock);
    stage('taxes', renderTaxes);
    stage('closing', renderClosing);
    stage('control', renderControl);
    stage('environment', renderEnvironmentBadge);
    if (monthDetail) {
      stage('detailFilters', renderDetailFilters);
      stage('monthDetail', renderMonthDetail);
      document.getElementById('monthDetailPanel').classList.remove('hidden');
    }
    const pendingDocumentEdit = document.getElementById('recordDetailPanel')?.querySelector('form[aria-busy="true"]');
    if (selectedTrace && !pendingDocumentEdit) stage('trace', () => showTrace(selectedTrace));
    lastRenderStages = stages;
  }

  function renderEnvironmentBadge() {
    const badge = document.getElementById('environmentBadge');
    if (!badge) return;
    // Firestore keeps the real data even though its project is called "demo"; the server reports it as protected.
    const real = realDataBase || persistenceEnvironment === 'production';
    const label = real ? 'Base real' : 'Demo';
    badge.textContent = `${label} · v${stateVersion ?? '-'}`;
    badge.className = `badge ${real ? 'warn' : 'neutral'}`;
    const sampleBadge = document.getElementById('panelSampleDataBadge');
    if (sampleBadge) sampleBadge.classList.toggle('hidden', real);
  }

  function setupDates() {
    const today = Core.todayIso();
    document.querySelectorAll('.instrument-row').forEach((row, index) => {
      row.querySelector('[data-field="scheduledDate"]').value = Core.addDays(today, index * 30);
    });
    document.getElementById('panelDateFrom').value = '';
    document.getElementById('panelDateTo').value = '';
    document.getElementById('flowStartMonth').value = today.slice(0, 7);
    document.getElementById('taxMonth').value = today.slice(0, 7);
    document.getElementById('taxYear').value = today.slice(0, 4);
    document.getElementById('docIssueDate').value = today;
    document.getElementById('docDueDate').value = Core.addDays(today, 15);
    document.getElementById('orderDate').value = today;
    const reconcileDate = document.getElementById('reconcileDate');
    if (reconcileDate) reconcileDate.value = today;
  }

  function syncInstrumentStatusOptions(row) {
    const type = row.querySelector('[data-field="type"]').value;
    const status = row.querySelector('[data-field="status"]');
    const current = status.value;
    const options = {
      transfer: [['scheduled', 'Programada'], ['executed', 'Realizada'], ['cancelled', 'Cancelada']],
      account_debit: [['scheduled', 'Pendiente'], ['executed', 'Realizado'], ['cancelled', 'Cancelado']],
      cash: [['executed', 'Realizada']],
      vep: [['scheduled', 'Programada'], ['executed', 'Realizada'], ['cancelled', 'Cancelada']],
      compensation: [['executed', 'Compensada'], ['cancelled', 'Anulada']],
      grain_barter: [['executed', 'Compensado por canje'], ['cancelled', 'Anulado']],
      card_financing: [['scheduled', 'Programada'], ['executed', 'Realizada'], ['cancelled', 'Cancelada']],
      bank_loan: [['scheduled', 'Programada'], ['executed', 'Realizada'], ['cancelled', 'Cancelada']],
      own_check: [['issued', 'Cheque emitido'], ['delivered', 'Cheque entregado'], ['debited', 'Debitado'], ['cancelled', 'Cancelado']],
      received_check: [['received', 'Recibido'], ['inPortfolio', 'En cartera'], ['deposited', 'Depositado'], ['endorsed', 'Endosado'], ['accredited', 'Acreditado'], ['rejected', 'Rechazado']]
    };
    status.innerHTML = (options[type] || []).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    if ((options[type] || []).some(([value]) => value === current)) status.value = current;
    syncInstrumentAccountOptions(row);
    syncInstrumentOperationalFields(row);
  }

  function syncInstrumentOperationalFields(row) {
    const type = row.querySelector('[data-field="type"]')?.value;
    const isCheck = type === 'own_check' || type === 'received_check';
    const isReceivedCheck = type === 'received_check';
    const checkNumber = row.querySelector('[data-field="checkNumber"]');
    const bankName = row.querySelector('[data-field="bankName"]');
    if (checkNumber) {
      checkNumber.classList.toggle('hidden', !isCheck);
      checkNumber.required = isCheck;
    }
    if (bankName) {
      bankName.classList.toggle('hidden', !isReceivedCheck);
      bankName.required = isReceivedCheck;
    }
  }

  function syncInstrumentAccountOptions(row) {
    const select = row.querySelector('[data-field="financialAccountId"]');
    if (!select) return;
    const current = select.value;
    const type = row.querySelector('[data-field="type"]')?.value || 'transfer';
    const currencyControl = row.querySelector('[data-field="currency"]');
    if (currencyControl && !row.dataset.currencyTouched) currencyControl.value = selectedOrderCurrency();
    const currency = currencyControl?.value || selectedOrderCurrency();
    const accounts = financialAccountsForInstrument(type, currency);
    const fallback = selectedFinancialAccount(currency);
    const fallbackAccounts = (state?.financialAccounts || []).filter((account) => account.currency === currency);
    const rows = accounts.length ? accounts : (type === 'own_check' ? [] : fallbackAccounts);
    if (type === 'bank_loan') {
      select.innerHTML = '<option value="">Circuito de préstamos pendiente de configuración</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    if (!rows.length) {
      select.innerHTML = '<option value="">Sin cuenta compatible habilitada</option>';
      return;
    }
    select.innerHTML = rows.map((account) => `<option value="${account.id}">${state ? Core.accountName(state, account.id) : account.name || account.id} (${financialProductTypeLabel(account.productType)} · ${account.currency}${account.checkEnabled ? ' · emite cheques' : ''})</option>`).join('');
    if (current && rows.some((account) => account.id === current)) select.value = current;
    else if (rows.some((account) => account.id === fallback)) select.value = fallback;
  }

  function addInstrumentRow() {
    const remaining = renderOrderSummary();
    if (remaining <= 0) return;
    const active = Array.from(document.querySelectorAll('.instrument-row:not(.hidden)'));
    active.forEach((item) => { delete item.querySelector('[data-field="scheduledDate"]').dataset.dateProposed; });
    const previousType = active.at(-1)?.querySelector('[data-field="type"]')?.value || 'transfer';
    const hidden = document.querySelector('.instrument-row.hidden');
    const row = hidden || instrumentRowTemplate?.cloneNode(true);
    if (!row) return;
    if (!hidden) {
      row.dataset.dynamicInstrument = 'true';
      document.getElementById('addInstrumentRow').before(row);
      wireInstrumentRow(row);
    }
    row.classList.remove('hidden');
    row.querySelector('[data-field="type"]').value = previousType;
    const amountInput = row.querySelector('[data-field="amount"]');
    if (amountInput) {
      amountInput.value = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining);
      amountInput.dataset.autoProposed = 'true';
      delete amountInput.dataset.amountTouched;
    }
    row.querySelector('[data-field="scheduledDate"]').value = valueFromInput('orderDate') || Core.todayIso();
    delete row.querySelector('[data-field="scheduledDate"]').dataset.dateProposed;
    row.querySelector('[data-field="reference"]').value = '';
    row.querySelector('[data-field="notes"]').value = '';
    row.querySelector('[data-field="checkNumber"]').value = '';
    row.querySelector('[data-field="bankName"]').value = '';
    resetInstrumentApplicationFields(row);
    syncInstrumentStatusOptions(row);
    syncInstrumentFields(row);
    syncInstrumentAccountOptions(row);
    renderOrderSummary();
  }

  function wireInstrumentRow(row) {
    ensureInstrumentApplicationFields(row);
    if (!row.querySelector('[data-field="deliveredDate"]')) {
      const details = document.createElement('details');
      details.dataset.instrumentField = 'deliveredDate';
      const summary = document.createElement('summary'); summary.textContent = 'Entrega comercial (opcional)';
      const label = document.createElement('label');
      label.textContent = 'Fecha entrega (opcional)';
      const input = document.createElement('input');
      input.type = 'date';
      input.dataset.field = 'deliveredDate';
      label.appendChild(input);
      details.append(summary, label); row.appendChild(details);
    }
    const labels = { type: 'Medio', amount: 'Importe nominal', currency: 'Moneda del instrumento', commercialAmount: 'Imputacion comercial', exchangeRate: 'Tipo de cambio', exchangeRateDate: 'Fecha del TC', exchangeRateReference: 'Referencia del TC', financialAccountId: 'Banco / cuenta', checkNumber: 'N.º cheque', bankName: 'Banco emisor', scheduledDate: 'Fecha / vencimiento', status: 'Estado', reference: 'Referencia', notes: 'Observaciones' };
    if (!row.classList.contains('instrument-fields')) {
      row.classList.add('instrument-fields');
      Array.from(row.children).forEach((control) => {
        const field = control.dataset.field;
        if (!field || !labels[field]) return;
        const label = document.createElement('label');
        label.dataset.instrumentField = field;
        label.append(document.createTextNode(labels[field]), control);
        row.appendChild(label);
      });
    }
    if (!row.querySelector('[data-remove-instrument]')) {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'secondary'; remove.dataset.removeInstrument = 'true'; remove.textContent = 'Quitar';
      remove.addEventListener('click', () => { row.classList.add('hidden'); row.querySelector('[data-field="amount"]').value = ''; renderOrderSummary(); });
      row.appendChild(remove);
    }
    wireMoneyInput(row.querySelector('[data-field="amount"]'));
    wireMoneyInput(row.querySelector('[data-field="commercialAmount"]'));
    wireDecimalNumberInput(row.querySelector('[data-field="exchangeRate"]'));
    for (const field of ['commercialAmount', 'exchangeRate']) row.querySelector(`[data-field="${field}"]`)?.addEventListener('input', () => syncInstrumentApplicationFields(row, field));
    // Selects emit input before change; preserve the choice before the summary rerenders.
    row.querySelector('[data-field="currency"]')?.addEventListener('input', () => { row.dataset.currencyTouched = 'true'; });
    row.querySelector('[data-field="currency"]')?.addEventListener('change', () => {
      row.dataset.currencyTouched = 'true';
      const amount = row.querySelector('[data-field="amount"]');
      if (amount.dataset.autoProposed) amount.value = '';
      delete amount.dataset.autoProposed;
      for (const field of ['commercialAmount', 'exchangeRate']) row.querySelector(`[data-field="${field}"]`).value = '';
      delete row.dataset.exchangeRateSource;
      delete row.dataset.exchangePrincipal; delete row.dataset.exchangeSuggestionContext; delete row.dataset.exchangeRateSuggestion;
      syncInstrumentApplicationFields(row); syncInstrumentAccountOptions(row); renderOrderSummary();
    });
    row.querySelector('[data-field="amount"]').addEventListener('input', (event) => {
      delete event.currentTarget.dataset.autoProposed;
      event.currentTarget.dataset.amountTouched = 'true';
      syncInstrumentApplicationFields(row, 'amount');
    });
    row.querySelector('[data-field="scheduledDate"]').addEventListener('input', (event) => {
      delete event.currentTarget.dataset.dateProposed;
    });
    row.querySelector('[data-field="type"]').addEventListener('change', () => {
      syncInstrumentStatusOptions(row);
      syncInstrumentFields(row);
      renderOrderSummary();
    });
    row.querySelector('[data-field="status"]').addEventListener('change', () => syncInstrumentFields(row));
    row.querySelectorAll('input, select').forEach((input) => input.addEventListener('input', renderOrderSummary));
    row.querySelectorAll('input, select').forEach((input) => input.addEventListener('change', renderOrderSummary));
    syncInstrumentFields(row);
  }

  function syncInstrumentFields(row) {
    const type = row.querySelector('[data-field="type"]')?.value;
    const check = type === 'own_check' || type === 'received_check';
    row.querySelector('[data-instrument-field="checkNumber"]')?.classList.toggle('hidden', !check);
    const delivery = row.querySelector('[data-instrument-field="deliveredDate"]');
    const requiresDelivery = type === 'own_check' && row.querySelector('[data-field="status"]')?.value === 'delivered';
    delivery?.classList.toggle('hidden', !requiresDelivery);
    if (delivery) delivery.querySelector('input').required = false;
    row.querySelector('[data-instrument-field="bankName"]')?.classList.toggle('hidden', type !== 'received_check');
    const accountLabel = row.querySelector('[data-instrument-field="financialAccountId"]');
    if (accountLabel?.firstChild) accountLabel.firstChild.textContent = type === 'cash' ? 'Caja' : 'Banco / cuenta';
  }

  function setupEvents() {
    document.getElementById('verifyDocumentSave')?.addEventListener('click', verifyUncertainDocumentSave);
    document.getElementById('documentFlowAuditPanel')?.addEventListener('toggle', (event) => { if (event.currentTarget.open) renderDocumentFlowAudit(); });
    document.getElementById('refreshDocumentFlowAudit')?.addEventListener('click', renderDocumentFlowAudit);
    ['documentFlowAuditResult', 'documentFlowAuditCurrency', 'documentFlowAuditEntity', 'documentFlowAuditDateField', 'documentFlowAuditFrom', 'documentFlowAuditTo'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', renderDocumentFlowAudit);
    });
    document.getElementById('newAgriculturalProjection')?.addEventListener('click', () => openAgriculturalProjection());
    document.getElementById('closeAgriculturalProjection')?.addEventListener('click', () => document.getElementById('agriculturalProjectionPanel').classList.add('hidden'));
    document.getElementById('agriculturalProjectionPrecision')?.addEventListener('change', changeAgriculturalProjectionPrecision);
    document.getElementById('agriculturalProjectionForm')?.addEventListener('submit', (event) => { event.preventDefault(); saveAgriculturalProjection(); });
    document.getElementById('deleteAgriculturalProjection')?.addEventListener('click', () => saveAgriculturalProjection('delete'));
    document.getElementById('replaceAgriculturalProjection')?.addEventListener('click', () => saveAgriculturalProjection('replace'));
    setupOperationsLists();
    const financialChartButton = document.createElement('button'); financialChartButton.type = 'button'; financialChartButton.id = 'completeFinancialChart'; financialChartButton.className = 'secondary hidden'; financialChartButton.textContent = 'Completar cuentas financieras';
    document.getElementById('docChartAccount')?.parentElement?.appendChild(financialChartButton);
    financialChartButton.addEventListener('click', async () => {
      await requestEditAction({ title: 'Completar cuentas de Financiero', description: 'Agrega solamente cuentas faltantes. Reutiliza Intereses Pagados cuando existe y conserva las clasificaciones anteriores.', fields: [
        { name: 'confirm', label: 'Escribi CONFIRMAR', required: true }
      ], submitLabel: 'Completar catalogo', onSubmit: async (input) => {
        if (String(input.confirm).trim().toUpperCase() !== 'CONFIRMAR') throw new Error('Confirmacion requerida');
        await postTransaction({ action: 'ensureFinancialChart' }); refreshDocumentChartOptions();
      } });
    });
    document.getElementById('generalMovementsSearch')?.addEventListener('input', () => { generalMovementsUi.page = 0; renderGeneralMovements(); });
    document.getElementById('cancelEntityForm')?.addEventListener('click', () => { document.getElementById('entityForm').reset(); document.getElementById('entityFormPanel').open = false; });
    document.getElementById('prepareArcaPlans')?.addEventListener('click', prepareArcaPlans);
    document.getElementById('newTaxPaymentPlan')?.addEventListener('click', async () => { try { await openTaxPaymentPlanForm(); } catch (error) { alert(error.message); } });
    setupFieldHelp();
    setupTaxActionHelp();
    setupAuthEvents();
    wireMoneyInputs();
    document.getElementById('editActionCancel')?.addEventListener('click', () => closeEditActionModal(null));
    document.getElementById('editActionForm')?.addEventListener('submit', submitEditAction);
    document.getElementById('entityMergeSource')?.addEventListener('change', renderEntityMergePreview);
    document.getElementById('entityMergeTarget')?.addEventListener('change', renderEntityMergePreview);
    bindPersistentSubmit('entityMergeForm', mergeEntitiesFromForm);
    document.querySelectorAll('.tab').forEach((button) => {
      button.addEventListener('click', () => {
        ['recordDetailPanel', 'orderDetailPanel', 'instrumentDetailPanel'].forEach((id) => {
          document.getElementById(id)?.classList.add('hidden');
        });
        document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
        document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.view).classList.add('active');
        if (button.dataset.view === 'flujo' && typeof requestAnimationFrame === 'function') requestAnimationFrame(scrollFlowToStartMonth);
      });
    });
    document.querySelectorAll('[data-help-view]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelector(`.tab[data-view="${button.dataset.helpView}"]`)?.click();
      });
    });
    ['flowActivityFilter', 'flowKindFilter', 'flowCurrencyFilter', 'flowChartFilter', 'flowEntityFilter', 'flowStartMonth', 'flowExercise', 'monthlyHorizon'].forEach((id) => {
      document.getElementById(id).addEventListener('change', renderFlow);
    });
    ['flowViewMode', 'flowPastMonths'].forEach((id) => document.getElementById(id)?.addEventListener('change', renderFlow));
    document.getElementById('noteForm')?.addEventListener('submit', (event) => { event.preventDefault(); saveNoteFromForm(); });
    document.getElementById('cancelNoteEdit')?.addEventListener('click', resetNoteForm);
    bindPersistentClick('saveFxEstimates', async () => {
      try { await saveFxEstimates(); } catch (error) { alert(error.message); }
    }, { label: 'Guardando...' });
    document.getElementById('resetFlowFilters')?.addEventListener('click', resetFlowFilters);
    document.getElementById('backFromInstrumentDetail')?.addEventListener('click', backFromInstrumentDetail);
    document.getElementById('dateActionCancel')?.addEventListener('click', () => closeDateActionModal(null));
    document.getElementById('verifyInstrumentTransition')?.addEventListener('click', verifyUncertainInstrumentTransition);
    document.getElementById('dateActionForm')?.addEventListener('submit', submitDateAction);
    document.getElementById('dateActionModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'dateActionModal') closeDateActionModal(null);
    });
    ['detailStatusFilter', 'detailActivityFilter', 'detailChartFilter', 'detailEntityFilter', 'detailCurrencyFilter', 'detailDateFrom', 'detailDateTo'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => {
        if (monthDetail) monthDetail.sourceId = '';
        renderMonthDetail();
      });
    });
    ['panelDateFrom', 'panelDateTo', 'panelCurrency', 'panelReading', 'panelExercise'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => {
        if (id === 'panelExercise') {
          document.getElementById('panelDateFrom').value = '';
          document.getElementById('panelDateTo').value = '';
        }
        renderPanel();
      });
    });
    document.getElementById('backFromPanelUpcoming')?.addEventListener('click', closePanelUpcomingDetail);
    document.getElementById('panelUpcomingDetailMode')?.addEventListener('change', (event) => {
      panelUpcomingDetailMode = event.target.value === 'all' ? 'all' : 'pending';
      renderPanelUpcomingDetail();
    });
    ['taxMode', 'taxMonth', 'taxYear', 'taxExercise', 'taxReading', 'taxActivity', 'taxCurrency'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', renderTaxes);
    });
    document.getElementById('showTaxReimbursementForm')?.addEventListener('click', openTaxReimbursementForm);
    document.getElementById('showTaxPaymentForm')?.addEventListener('click', openTaxPaymentForm);
    document.getElementById('closeTaxPaymentForm')?.addEventListener('click', () => document.getElementById('taxPaymentFormPanel').classList.add('hidden'));
    document.getElementById('taxPaymentAccount')?.addEventListener('change', renderTaxPaymentPending);
    document.getElementById('taxPaymentPending')?.addEventListener('change', (event) => { if (event.target.matches('[data-tax-id]')) syncTaxPaymentConcept(); });
    bindPersistentSubmit('taxPaymentForm', async (event) => {
      event.preventDefault();
      const errorBox = document.getElementById('taxPaymentError');
      const allocations = [...document.querySelectorAll('#taxPaymentPending [data-tax-id]:checked')].map((input) => ({ withholdingId: input.dataset.taxId, amount: Number(document.querySelector(`#taxPaymentPending [data-tax-amount="${input.dataset.taxId}"]`)?.value || 0) }));
      try {
        if (!allocations.length) throw new Error('Seleccioná al menos una retención pendiente.');
        errorBox.classList.add('hidden');
        await postTransaction({ action: 'createTaxPayment', payload: { entityId: valueFromInput('taxPaymentEntity'), financialAccountId: valueFromInput('taxPaymentAccount'), date: valueFromInput('taxPaymentDate'), concept: valueFromInput('taxPaymentConcept'), reference: valueFromInput('taxPaymentReference'), notes: valueFromInput('taxPaymentNotes'), allocations } });
        finishNewForm(event.currentTarget, 'taxPaymentFormPanel');
      } catch (error) { errorBox.textContent = error.message; errorBox.classList.remove('hidden'); }
    });
    bindPersistentSubmit('internalTransferForm', async (event) => {
      event.preventDefault();
      const errorBox = document.getElementById('internalTransferError');
      try {
        errorBox.classList.add('hidden');
        await postTransaction({ action: 'createInternalTransfer', payload: { fromAccountId: valueFromInput('internalTransferFrom'), toAccountId: valueFromInput('internalTransferTo'), amount: numberFromInput('internalTransferAmount'), date: valueFromInput('internalTransferDate'), reference: valueFromInput('internalTransferReference') } });
        finishNewForm(event.currentTarget, 'internalTransferPanel');
      } catch (error) { errorBox.textContent = error.message; errorBox.classList.remove('hidden'); }
    });
    document.getElementById('closeTaxReimbursementForm')?.addEventListener('click', () => document.getElementById('taxReimbursementFormPanel')?.classList.add('hidden'));
    document.getElementById('taxReimbursementCurrency')?.addEventListener('change', refreshTaxReimbursementAccounts);
    bindPersistentSubmit('taxReimbursementForm', async (event) => {
      event.preventDefault();
      const errorBox = document.getElementById('taxReimbursementError');
      const successBox = document.getElementById('taxReimbursementSuccess');
      try {
        errorBox.classList.add('hidden'); successBox?.classList.add('hidden');
        selectedTrace = null;
        await postTransaction({ action: 'createTaxReimbursement', payload: { taxType: 'reimbursement_vat', entityId: valueFromInput('taxReimbursementEntity'), date: valueFromInput('taxReimbursementDate'), amount: numberFromInput('taxReimbursementAmount'), currency: valueFromInput('taxReimbursementCurrency'), financialAccountId: valueFromInput('taxReimbursementAccount'), reference: valueFromInput('taxReimbursementReference'), notes: valueFromInput('taxReimbursementNotes'), status: 'reimbursed', description: 'Reintegro IVA ARCA', reason: 'Reintegro IVA acreditado en banco' } });
        document.querySelector('[data-view="impuestos"]')?.click();
        finishNewForm(event.currentTarget, 'taxReimbursementFormPanel');
        if (successBox) { successBox.textContent = 'Reintegro registrado. El movimiento bancario vinculado quedó disponible en Flujo y Tesorería.'; successBox.classList.remove('hidden'); }
      } catch (error) { errorBox.textContent = error.message; errorBox.classList.remove('hidden'); }
    });
    ['closingExercise', 'closingReading', 'closingCurrency', 'closingDateFrom', 'closingDateTo'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', renderClosing);
    });
    ['grainCerealFilter', 'grainCampaignFilter', 'grainLocationFilter'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', renderCereals);
    });
    ['livestockCategoryFilter', 'livestockHerdFilter', 'livestockLocationFilter'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', renderLivestock);
    });
    document.getElementById('newGrainMovement')?.addEventListener('click', () => createGrainMovement('harvest'));
    document.getElementById('newGrainAdjustment')?.addEventListener('click', () => createGrainMovement('adjustment'));
    document.getElementById('newGrainTransfer')?.addEventListener('click', createGrainTransfer);
    document.getElementById('newGrainLiquidation')?.addEventListener('click', createGrainLiquidation);
    document.getElementById('newGrainForward')?.addEventListener('click', () => showGrainOperation('forward'));
    document.getElementById('closeGrainOperation')?.addEventListener('click', closeGrainOperation);
    bindPersistentSubmit('grainOperationForm', submitGrainOperation);
    document.getElementById('grainQuickEntity')?.addEventListener('click', () => quickCreateEntity('grainOpEntity', 'entitySearch'));
    document.getElementById('grainOpEntity')?.addEventListener('change', () => { grainEntityTouched = true; });
    document.getElementById('grainOpLocation')?.addEventListener('change', () => suggestEntityFromGrainLocation());
    document.getElementById('newLivestockPurchase')?.addEventListener('click', () => createLivestockTrade('purchase'));
    document.getElementById('newLivestockSale')?.addEventListener('click', () => createLivestockTrade('sale'));
    document.getElementById('newLivestockDeath')?.addEventListener('click', createLivestockDeath);
    document.getElementById('newLivestockTransfer')?.addEventListener('click', createLivestockTransfer);
    document.getElementById('newLivestockCategoryChange')?.addEventListener('click', () => showLivestockOperation('category_change'));
    document.getElementById('newLivestockWeighing')?.addEventListener('click', createLivestockWeighing);
    document.getElementById('closeLivestockOperation')?.addEventListener('click', closeLivestockOperation);
    bindPersistentSubmit('livestockOperationForm', submitLivestockOperation);
    document.getElementById('livestockQuickEntity')?.addEventListener('click', () => quickCreateEntity('livestockOpEntity', 'entitySearch'));
    document.getElementById('livestockQuickHerd')?.addEventListener('click', () => quickCreateLivestockHerd());
    document.getElementById('livestockQuickDestinationHerd')?.addEventListener('click', () => quickCreateLivestockHerd(true));
    document.getElementById('livestockOpDestinationHerd')?.addEventListener('change', (event) => { event.target.dataset.manualSelection = 'true'; });
    document.getElementById('livestockOpHerd')?.addEventListener('change', () => updateLivestockCategoryChangeForm({ herdChanged: true }));
    ['livestockOpCategory', 'livestockOpLocation', 'livestockOpDate'].forEach((id) => document.getElementById(id)?.addEventListener('change', () => updateLivestockCategoryChangeForm()));
    document.getElementById('livestockRenameHerd')?.addEventListener('click', renameSelectedLivestockHerd);
    document.getElementById('livestockOpWeights')?.addEventListener('input', updateLivestockWeightsSummary);
    ['entitySearch', 'entityRoleFilter'].forEach((id) => {
      document.getElementById(id).addEventListener('input', renderEntities);
      document.getElementById(id).addEventListener('change', renderEntities);
    });
    const docSearch = document.getElementById('docEntitySearch');
    docSearch.addEventListener('input', () => { document.getElementById('docEntity').value = ''; renderDocumentEntitySuggestions(true); });
    docSearch.addEventListener('focus', () => renderDocumentEntitySuggestions(true));
    docSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { renderDocumentEntitySuggestions(); docSearch.blur(); }
      if (event.key === 'Enter' && !document.getElementById('docEntity').value) {
        const first = document.getElementById('docEntityMatches').querySelector('button');
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('.entity-picker')) renderDocumentEntitySuggestions();
    });
    document.getElementById('orderEntitySearch').addEventListener('input', () => {
      const selected = document.getElementById('orderEntity').value;
      document.getElementById('orderEntity').innerHTML = `<option value="">Todas las contrapartes</option>${entityOptionsFor('orderEntitySearch', selected)}`;
      renderOrderDocumentsList();
    });
    ['checkTypeFilter', 'checkStatusFilter', 'checkBankFilter', 'checkEntityFilter', 'checkDateFrom', 'checkDateTo', 'checkDueFilter', 'checkCurrencyFilter'].forEach((id) => {
      document.getElementById(id).addEventListener('input', renderChecksPortfolio);
      document.getElementById(id).addEventListener('change', renderChecksPortfolio);
    });
    ['treasuryInstrumentTypeFilter', 'treasuryInstrumentStatusFilter', 'treasuryInstrumentAccountFilter', 'treasuryInstrumentEntityFilter', 'treasuryInstrumentDateFrom', 'treasuryInstrumentDateTo', 'treasuryInstrumentCheckSearch', 'treasuryInstrumentTextSearch'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', renderTreasury);
      document.getElementById(id)?.addEventListener('change', renderTreasury);
    });
    ['ccEntityFilter', 'ccCurrencyFilter', 'ccStatusFilter', 'ccDateFrom', 'ccDateTo'].forEach((id) => {
      document.getElementById(id).addEventListener('change', renderCurrentAccount);
    });
    ['reconcileAccount', 'reconcileDate', 'reconcileReported'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', renderReconciliation);
      document.getElementById(id)?.addEventListener('change', renderReconciliation);
    });
    document.getElementById('calculateReconciliation')?.addEventListener('click', renderReconciliation);
    bindPersistentClick('createReconciliationAdjustment', createReconciliationAdjustment);
    bindPersistentSubmit('financialInstitutionForm', async () => {
      try {
        await postTransaction({
          action: 'createFinancialInstitution',
          payload: {
            name: valueFromInput('financialInstitutionName'),
            active: valueFromInput('financialInstitutionActive') !== 'false',
            notes: valueFromInput('financialInstitutionNotes'),
            reason: 'Alta desde Tesoreria'
          }
        });
        finishNewForm('financialInstitutionForm', 'financialInstitutionPanel');
      } catch (error) {
        alert(error.message);
      }
    });
    bindPersistentSubmit('financialProductForm', async () => {
      try {
        await postTransaction({
          action: 'createFinancialAccount',
          payload: {
            institutionId: valueFromInput('financialProductInstitution'),
            productType: valueFromInput('financialProductType'),
            name: valueFromInput('financialProductName'),
            accountType: valueFromInput('financialProductAccountType'),
            currency: valueFromInput('financialProductCurrency') || 'ARS',
            cbu: valueFromInput('financialProductCbu'),
            alias: valueFromInput('financialProductAlias'),
            checkEnabled: valueFromInput('financialProductCheckEnabled') === 'true',
            openingBalance: numberFromInput('financialProductOpeningBalance') || 0,
            openingBalanceDate: valueFromInput('financialProductOpeningDate'),
            creditLimit: numberFromInput('financialProductLimit'),
            active: valueFromInput('financialProductActive') !== 'false',
            notes: valueFromInput('financialProductNotes'),
            reason: 'Alta desde Tesoreria'
          }
        });
        ['financialProductName', 'financialProductAccountType', 'financialProductCbu', 'financialProductAlias', 'financialProductOpeningBalance', 'financialProductOpeningDate', 'financialProductLimit', 'financialProductNotes'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
        const checkEnabled = document.getElementById('financialProductCheckEnabled');
        if (checkEnabled) checkEnabled.value = 'false';
        finishNewForm('financialProductForm', 'financialProductPanel');
      } catch (error) {
        alert(error.message);
      }
    });
    document.getElementById('orderType').addEventListener('change', () => {
      const collection = valueFromInput('orderType') === 'collection';
      document.getElementById('orderWithholdingsPanel')?.classList.toggle('hidden', !collection);
      document.getElementById('orderPracticedPanel')?.classList.toggle('hidden', collection);
      if (!collection) ['orderWithholdingIncome', 'orderWithholdingVat', 'orderWithholdingIibb'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
      if (collection) ['orderPracticedIncome', 'orderPracticedVat', 'orderPracticedIibb'].forEach((id) => { const input = document.getElementById(id); if (input) input.value = ''; });
      renderOrderDocumentsList();
    });
    document.getElementById('orderEntity').addEventListener('change', renderOrderDocumentsList);
    document.getElementById('orderDate').addEventListener('change', () => {
      const proposed = document.querySelector('.instrument-row:not(.hidden) [data-field="scheduledDate"][data-date-proposed="true"]');
      if (proposed) proposed.value = valueFromInput('orderDate');
      renderOrderSummary();
    });
    document.getElementById('quickCreateDocEntity').addEventListener('click', () => quickCreateEntity('docEntity', 'docEntitySearch'));
    document.getElementById('quickCreateOrderEntity').addEventListener('click', () => quickCreateEntity('orderEntity', 'orderEntitySearch'));
    document.getElementById('showDocumentForm')?.addEventListener('click', () => showDocumentFormPanel());
    document.getElementById('showOrderForm')?.addEventListener('click', () => showOrderFormPanel());
    document.getElementById('closeDocumentForm')?.addEventListener('click', () => hideDocumentFormPanel());
    document.getElementById('closeOrderForm')?.addEventListener('click', () => hideOrderFormPanel());
    document.getElementById('newCleanOrder').addEventListener('click', () => showOrderFormPanel());
    document.getElementById('addInstrumentRow')?.addEventListener('click', addInstrumentRow);
    document.getElementById('addOrderRetentionRow')?.addEventListener('click', addOrderRetentionRow);
    document.getElementById('docNetTaxed')?.addEventListener('input', () => {
      documentPrincipalInputChanged('net');
    });
    ['docPerceptionVat', 'docPerceptionIibb', 'docOtherPerceptions', 'docWithholdingVat', 'docWithholdingIncome', 'docWithholdingIibb', 'docOtherDeductions'].forEach((id) => document.getElementById(id)?.addEventListener('input', updateDocumentCalculatedFields));
    document.getElementById('docVatRate')?.addEventListener('change', () => {
      documentVatManualOverride = false;
      updateDocumentCalculatedFields();
    });
    document.getElementById('docVatAmount')?.addEventListener('input', () => {
      documentVatManualOverride = true;
      documentCalculationSource = 'net';
      updateDocumentCalculatedFields();
    });
    document.getElementById('docTotalAmount')?.addEventListener('input', () => {
      documentPrincipalInputChanged('total');
    });
    document.getElementById('docCurrency')?.addEventListener('change', updateDocumentCalculatedFields);
    document.getElementById('docCommercialSide')?.addEventListener('change', () => {
      updateDocumentFiscalLabels();
      updateDocumentCalculatedFields();
    });
    document.getElementById('docFiscalStatus')?.addEventListener('change', applyDocumentBackingDefault);
    document.getElementById('docType')?.addEventListener('change', () => {
      if (valueFromInput('docType') === 'no_receipt') {
        document.getElementById('docFiscalStatus').value = 'no_receipt';
        applyDocumentBackingDefault();
      }
      syncDocumentCommercialSide();
      document.getElementById('docChartAccount').value = '';
      updateDocumentFiscalLabels();
      updateDocumentCalculatedFields();
    });
    document.getElementById('docActivity')?.addEventListener('change', () => {
      refreshDocumentChartOptions();
      updateDocumentCalculatedFields();
    });
    instrumentRowTemplate = document.querySelector('.instrument-row')?.cloneNode(true);
    document.querySelectorAll('.instrument-row').forEach((row) => {
      syncInstrumentStatusOptions(row);
      wireInstrumentRow(row);
    });
    ['orderWithholdingIncome', 'orderWithholdingVat', 'orderWithholdingIibb', 'orderWithholdingDate', 'orderWithholdingReference'].forEach((id) => document.getElementById(id)?.addEventListener('input', renderOrderSummary));
    ['orderPracticedIncome', 'orderPracticedVat', 'orderPracticedIibb', 'orderPracticedDate', 'orderPracticedReference'].forEach((id) => document.getElementById(id)?.addEventListener('input', renderOrderSummary));
    document.getElementById('resetMonthFilters').addEventListener('click', resetDetailToMonth);
    document.getElementById('closeMonthDetail').addEventListener('click', () => {
      monthDetail = null;
      document.getElementById('monthDetailPanel').classList.add('hidden');
    });
    document.getElementById('backToMonthDetail')?.addEventListener('click', backToMonthDetail);
    ['grainOpKg', 'grainOpPrice'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => updateGrainCalculatedFields({ writeNetTaxed: true, economicInputChanged: true })));
    ['grainOpWithholdingVat', 'grainOpWithholdingIncome', 'grainOpWithholdingIibb', 'grainOpOtherDeductions'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => updateGrainCalculatedFields()));
    document.getElementById('grainOpNetTaxed')?.addEventListener('input', () => {
      grainNetManualOverride = true;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpVatRate')?.addEventListener('change', () => {
      grainVatManualOverride = false;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpVatAmount')?.addEventListener('input', () => {
      grainVatManualOverride = true;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpCommissionPercent')?.addEventListener('input', () => {
      grainCommissionManualOverride = false;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpCommissions')?.addEventListener('input', () => {
      grainCommissionManualOverride = true;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpCommissionVat')?.addEventListener('input', () => {
      grainCommissionVatManualOverride = true;
      updateGrainCalculatedFields();
    });
    document.getElementById('grainOpTotalAmount')?.addEventListener('input', () => {
      grainTotalManualOverride = true;
      renderMoneySummary('grainOp', valueFromInput('grainOpCurrency') || 'ARS', valueFromInput('grainOperationMode') === 'barter' ? 'TOTAL A CANCELAR' : 'TOTAL A COBRAR');
    });
    document.getElementById('grainOpCurrency')?.addEventListener('change', () => updateGrainCalculatedFields());
    document.getElementById('livestockOpHeads')?.addEventListener('input', () => updateLivestockCalculatedFields());
    document.getElementById('livestockOpTotalKg')?.addEventListener('input', () => updateLivestockCalculatedFields({ writeNetTaxed: true, economicInputChanged: true, source: 'kg' }));
    document.getElementById('livestockOpPriceKg')?.addEventListener('input', () => updateLivestockCalculatedFields({ writeNetTaxed: true, economicInputChanged: true, source: 'price' }));
    ['livestockOpGuides', 'livestockOpHandling', 'livestockOpWithholdingVat', 'livestockOpWithholdingIncome', 'livestockOpWithholdingIibb', 'livestockOpOtherExpenses', 'livestockOpOtherDeductions'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => updateLivestockCalculatedFields()));
    document.getElementById('livestockOpNetTaxed')?.addEventListener('input', () => {
      updateLivestockCalculatedFields({ writeNetTaxed: true, economicInputChanged: true, source: 'net' });
    });
    document.getElementById('livestockOpVatRate')?.addEventListener('change', () => {
      livestockVatManualOverride = false;
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpVatAmount')?.addEventListener('input', () => {
      livestockVatManualOverride = true;
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpCommissionPercent')?.addEventListener('input', () => {
      livestockCommissionManualOverride = false;
      livestockCommissionVatManualOverride = false;
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpCommissions')?.addEventListener('input', () => {
      livestockCommissionManualOverride = true;
      livestockCommissionVatManualOverride = false;
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpCommissionVat')?.addEventListener('input', () => {
      livestockCommissionVatManualOverride = true;
      document.getElementById('livestockOpCommissionVatRate').value = 'manual';
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpCommissionVatRate')?.addEventListener('change', () => {
      livestockCommissionVatManualOverride = valueFromInput('livestockOpCommissionVatRate') === 'manual';
      updateLivestockCalculatedFields();
    });
    document.getElementById('livestockOpTotalAmount')?.addEventListener('input', () => {
      livestockTotalManualOverride = true;
      renderMoneySummary('livestockOp', valueFromInput('livestockOpCurrency') || 'ARS', valueFromInput('livestockOperationMode') === 'purchase' ? 'TOTAL A PAGAR' : 'TOTAL A COBRAR');
    });
    document.getElementById('livestockOpCurrency')?.addEventListener('change', () => updateLivestockCalculatedFields());
    document.getElementById('livestockQuickLocation')?.addEventListener('click', quickCreateLivestockLocation);
    document.getElementById('livestockRenameLocation')?.addEventListener('click', renameSelectedLivestockLocation);
    bindPersistentClick('createBackup', async () => {
      try {
        await createBackup();
      } catch (error) {
        alert(error.message);
      }
    });
    document.getElementById('restoreBackup')?.addEventListener('click', async () => {
      try {
        await restoreBackup();
      } catch (error) {
        alert(error.message);
      }
    });
    bindPersistentClick('resetDemo', async () => {
      if (!confirm('Restaurar base demo central?')) return;
      try {
        await postTransaction({ action: 'resetDemo' });
        setupDates();
      } catch (error) {
        alert(error.message);
      }
    }, { label: 'Restableciendo...' });
    bindPersistentSubmit('documentForm', async (event) => {
      event.preventDefault();
      const formStartedAt = Date.now();
      const feedback = document.getElementById('documentSaveFeedback');
      if (documentSaveUncertain) { showDocumentSaveUncertain(); return; }
      if (feedback) {
        feedback.textContent = '';
        feedback.classList.add('hidden');
      }
      updateDocumentCalculatedFields();
      const total = numericInputValue('docTotalAmount') || numericInputValue('docAmount');
      const netTaxed = numericInputValue('docNetTaxed');
      const commercialSide = documentCommercialSide();
      const breakdownPayload = taxPayload('doc', commercialSide);
      const payload = {
        id: documentSubmissionId || (documentSubmissionId = `DOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
        type: document.getElementById('docType').value,
        entityId: document.getElementById('docEntity').value,
        number: document.getElementById('docNumber').value,
        amount: total,
        currency: document.getElementById('docCurrency').value,
        commercialSide,
        fiscalStatus: document.getElementById('docFiscalStatus').value,
        economicAmount: netTaxed || null,
        ...breakdownPayload,
        issueDate: document.getElementById('docFiscalStatus').value === 'documented' ? document.getElementById('docIssueDate').value : '',
        recordDate: document.getElementById('docIssueDate').value,
        dueDate: document.getElementById('docDueDate').value,
        activity: document.getElementById('docActivity').value,
        chartAccountId: document.getElementById('docChartAccount').value,
        description: document.getElementById('docDescription').value,
        reason: 'Alta desde formulario'
      };
      try {
        Object.assign(payload, documentInvoiceRatePayload(payload.currency, document.getElementById('docInvoiceRate')?.value));
        console.info('[sagro-save-performance]', JSON.stringify({ action: 'createDocument', formPrepareMs: Date.now() - formStartedAt }));
        selectedTrace = null;
        // Preserve the request identity before dispatch, including a reload during the request.
        sessionStorage.setItem(UNCERTAIN_DOCUMENT_KEY, documentSubmissionId);
        const saved = await postTransaction({
          action: 'createDocument',
          payload
        });
        const createdId = saved.createdIds?.documents?.[0];
        documentSubmissionId = '';
        sessionStorage.removeItem(UNCERTAIN_DOCUMENT_KEY);
        document.getElementById('verifyDocumentSave')?.classList.add('hidden');
        documentFormMode = { mode: 'create', lastSavedDocumentId: createdId || '' };
        cleanDocumentForm({ keepConfirmation: true });
        if (createdId) showDocumentAfterSaveActions(createdId);
        else hideDocumentFormPanel();
      } catch (error) {
        if (documentSubmissionId && state.documents.some((item) => item.id === documentSubmissionId)) {
          const id = documentSubmissionId;
          documentSubmissionId = '';
          documentSaveUncertain = false;
          uncertainWrite = false;
          sessionStorage.removeItem(UNCERTAIN_DOCUMENT_KEY);
          document.getElementById('verifyDocumentSave')?.classList.add('hidden');
          cleanDocumentForm({ keepConfirmation: true });
          showDocumentAfterSaveActions(id);
          return;
        }
        if (error.uncertainWrite || error.saved) {
          documentSaveUncertain = true;
          uncertainWrite = true;
          showDocumentSaveUncertain(error.message);
          return;
        }
        try { sessionStorage.removeItem(UNCERTAIN_DOCUMENT_KEY); } catch (_) { /* Keep the visible error if browser storage is unavailable. */ }
        if (feedback) {
          feedback.textContent = error.message;
          feedback.classList.remove('hidden');
          feedback.focus();
        }
      }
    });
    bindPersistentSubmit('entityForm', async (event) => {
      event.preventDefault();
      try {
        await postTransaction({
          action: 'createEntity',
          payload: {
            name: document.getElementById('entityName').value,
            cuit: document.getElementById('entityCuit').value,
            role: document.getElementById('entityRole').value,
            suggestedActivity: document.getElementById('entitySuggestedActivity').value,
            suggestedChartAccountId: document.getElementById('entitySuggestedChart').value,
            reason: 'Alta desde vista Contrapartes'
          }
        });
        document.getElementById('entityName').value = '';
        document.getElementById('entityCuit').value = '';
        finishNewForm(event.currentTarget, 'entityFormPanel');
      } catch (error) {
        alert(error.message);
      }
    });
    bindPersistentSubmit('orderForm', async (event) => {
      event.preventDefault();
      const feedback = document.getElementById('orderSaveFeedback');
      const showOrderError = (message, field) => {
        if (feedback) { feedback.textContent = message; feedback.classList.remove('hidden'); feedback.focus(); }
        field?.focus();
      };
      feedback?.classList.add('hidden');
      const invalidField = Array.from(event.currentTarget.querySelectorAll('input, select'))
        .find((field) => !field.disabled && !field.closest('.instrument-row.hidden') && !field.checkValidity());
      if (invalidField) { showOrderError(`Revisá ${invalidField.closest('label')?.textContent?.trim() || 'el campo indicado'}: ${invalidField.validationMessage}`, invalidField); return; }
      const documents = selectedOrderDocuments();
      const instruments = formInstruments();
      const withholdings = formOrderWithholdings();
      const practicedWithholdings = formPracticedWithholdings();
      const totalDocuments = documents.reduce((sum, item) => sum + item.amountApplied, 0);
      const totalInstrumented = instruments.reduce((sum, item) => sum + (item.commercialCurrency && item.currency !== item.commercialCurrency ? Number(item.commercialAmount || 0) : item.amount), 0);
      const totalWithheld = [...withholdings, ...practicedWithholdings].reduce((sum, item) => sum + item.amount, 0);
      const existingOrderBreakdown = orderFormMode.mode === 'instrumentExisting' ? Core.orderBreakdown(state, orderFormMode.orderId) : null;
      const instrumentLimit = existingOrderBreakdown?.notCoveredByInstrument ?? totalDocuments;
      if (!documents.length) {
        showOrderError('Seleccioná al menos un documento con saldo aplicable.', document.getElementById('orderDocumentsList'));
        return;
      }
      if (instruments.some((instrument) => instrument.type === 'bank_loan')) {
        showOrderError('Circuito de préstamos pendiente de configuración', document.querySelector('.instrument-row:not(.hidden) [data-field="type"]'));
        return;
      }
      if (totalInstrumented + totalWithheld > instrumentLimit + 0.01) {
        showOrderError('Los medios financieros y retenciones no pueden superar el saldo de la orden.', document.querySelector('.instrument-row:not(.hidden) [data-field="amount"]'));
        return;
      }
      try {
        instruments.forEach((item) => Core.normalizeInstrumentApplication(item, selectedOrderCurrency()));
        selectedTrace = null;
        if (orderFormMode.mode === 'instrumentExisting') {
          const orderId = orderFormMode.orderId;
          await postTransaction({ action: 'addOrderInstruments', id: orderId, payload: { instruments, withholdings, practicedWithholdings, reason: 'Instrumentacion desde orden existente' } });
          cleanOrderForm();
          hideOrderFormPanel();
          openOrderDetail(orderId);
        } else {
          const saved = await postTransaction({
            action: 'createOrder',
            payload: {
            type: document.getElementById('orderType').value === 'collection' ? 'collection' : 'payment',
            date: document.getElementById('orderDate').value,
            documents,
            financialAccountId: document.getElementById('orderAccount').value,
            description: document.getElementById('orderDescription').value,
            instruments,
            withholdings,
            practicedWithholdings,
            reason: 'Alta desde formulario V1.1'
            }
          });
          cleanOrderForm();
          hideOrderFormPanel();
          const createdId = saved.createdIds?.orders?.[0];
          if (createdId) openOrderDetail(createdId);
        }
        alert('Operación guardada.');
      } catch (error) {
        showOrderError(`No se pudo guardar la operación: ${error.message}`);
      }
    });
  }

  if (window.SAGRO_APP_TEST_HOOKS) {
    window.SagroApp = {
      metricCard,
      formInstruments,
      prepareArcaPlans,
      parseTaxPlanSchedule,
      renderTaxPaymentPlans,
      setupTableScroll,
      actionHelp,
      syncTaxPaymentAvailability,
      openTaxPaymentPlanDetail,
      reviewTaxPlanOperation,
      closeEditActionModal,
      taxPlanAdvanceLabel,
      taxPlanInstallmentSummary,
      taxPlanReviewRows,
      documentEditForm,
      renderPanel,
      renderClosing,
      openIndicatorDetail,
      indicatorAmountNode,
      filterIndicatorRows,
      panelPositionDetail,
      renderFlow,
      agriculturalIncomeKind,
      openAgriculturalProjection,
      agriculturalProjectionPayload,
      changeAgriculturalProjectionPrecision,
      saveAgriculturalProjection,
      runPersistentAction,
      bindPersistentSubmit,
      finishNewForm,
      requestEditAction,
      submitEditAction,
      requestDateAction,
      submitDateAction,
      transitionInstrumentTo,
      verifyUncertainInstrumentTransition,
      setCriticalActionsDisabled,
      continueAgriculturalRealIncome,
      setupDates,
      setupEvents,
      renderMonthly,
      openMonthDetail,
      renderMonthDetail,
      openOrderDetail,
      openInstrumentDetail,
      openGrainLocationDetail,
      resetFlowFilters,
      renderCereals,
      flowVisualCategory,
      parseWeightList,
      showGrainOperation,
      submitGrainOperation,
      showLivestockOperation,
      updateLivestockCategoryChangeForm,
      livestockMovementReferenceLink,
      correctLivestockPurchaseCategory,
      submitLivestockOperation,
      backToMonthDetail,
      showTrace,
      navigateTarget,
      panelUpcomingDetailRows,
      openPanelUpcomingDetail,
      closePanelUpcomingDetail,
      monthlyMatrix,
      flowCurrencyTotals,
      flowMonthlyCurrencyGroups,
      matrixAmountClass,
      flowRowTraceTarget,
      flowOriginLabel,
      orderDocumentAvailableToApply,
      orderFormFinancialTotals,
      calculateInstrumentCurrencyFields,
      documentExchangeRateSuggestion,
      instrumentApplicationPayload,
      syncInstrumentApplicationFields,
      wireInstrumentRow,
      financialAccountsForInstrument,
      expandPracticedWithholdingsIfNeeded,
      documentOrderApplicationContext,
      existingOrderLinkChoices,
      existingOrderLinkPayload,
      existingOrderLinkPreviewPanel,
      existingOrderExchangeRateDate,
      existingOrderLinksPreviewPanel,
      offerArtificialDocumentCleanup,
      reviewDocumentRemoval,
      linkMultipleExistingOrders,
      linkExistingOrderFromDocument,
      documentFinancialDiagnostics,
      documentFinancialDiagnosticPanel,
      reconcileDocumentsFlow,
      filterDocumentFlowAuditRows,
      renderDocumentFlowAudit,
      renderControl,
      prepareOrderFromDocument,
      startInstrumentingOrder,
      parseLocaleNumber,
      formatArgentineMoneyInput,
      flowOriginLabel,
      wireMoneyInput,
      wireDecimalNumberInput,
      documentPrincipalInputChanged,
      applyDocumentBackingDefault,
      updateDocumentCalculatedFields,
      invoiceRateInputValue,
      documentInvoiceRatePayload,
      syncDocumentInvoiceRateField,
      formatMoney,
      formatFlowMoney,
      formatDecimal,
      historicalInstrumentEffectiveDate,
      nextInstrumentAction,
      flowInstrumentAction,
      flowMediumLabel,
      flowStatusBadge,
      flowIncomeAmount,
      flowExpenseAmount,
      livestockTradeFinancialPayload,
      updateLivestockCalculatedFields,
      setupFiscalDisclosures,
      syncFiscalDisclosure,
      syncFiscalDisclosures,
      taxPayload,
      currentAccountLabel,
      currentAccountConcept,
      currentAccountTarget,
      renderEntityCurrentAccount,
      renderGeneralMovements,
      generalMovementsUi,
      generalMovementActions,
      chartOptionsForActivity,
      instrumentRelations,
      renderOperations,
      operationRows,
      operationPage,
      accountEconomicSummary,
      filteredTableRows,
      monetaryTotals,
      renderTable,
      tableFilters,
      apiPost,
      postTransaction,
      verifyUncertainDocumentSave,
      cleanDocumentForm,
      configureAuth,
      getTestState() { return state; },
      render,
      load,
      setTestState(nextState, nextValidation) {
        state = nextState;
        validation = nextValidation || [];
      },
      getSelectedTrace() {
        return selectedTrace;
      },
      getExpandedTreeKeys() {
        return [...expandedTreeKeys];
      }
    };
    return;
  }

  setupDates();
  setupEvents();
  configureAuth().then((ready) => {
    if (ready) return load();
    return null;
  }).catch((error) => {
    if (error.auth) {
      showAuthPanel(error.message);
      return;
    }
    const panel = document.createElement('div');
    panel.className = 'fatal startup-error';
    panel.setAttribute('role', 'alert');
    const message = document.createElement('span');
    message.textContent = error.message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'secondary';
    retry.textContent = 'Reintentar carga';
    retry.addEventListener('click', () => window.location.reload());
    panel.append(message, retry);
    document.body.prepend(panel);
  });
})();
