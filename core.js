(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SagroCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  const ACTIVITIES = ['Agricultura', 'Ganaderia', 'Estructura/Admin', 'Compartido', 'Financiero'];
  const CURRENCIES = ['ARS', 'USD'];
  const OWN_CHECK_STATES = ['issued', 'delivered', 'debited', 'rejected', 'cancelled', 'voided'];
  const RECEIVED_CHECK_STATES = ['received', 'inPortfolio', 'deposited', 'endorsed', 'accredited', 'rejected', 'voided'];
  const TRANSFER_STATES = ['scheduled', 'executed', 'cancelled', 'voided'];
  const CASH_STATES = ['executed', 'voided'];
  const VEP_STATES = ['scheduled', 'executed', 'cancelled', 'voided'];
  const COMPENSATION_STATES = ['executed', 'cancelled', 'voided'];
  const ENTITY_ROLES = ['Proveedor', 'Cliente', 'Ambos', 'Banco', 'Organismo'];
  const GRAIN_TYPES = ['Soja', 'Maiz', 'Trigo', 'Girasol', 'Sorgo'];
  const GRAIN_LOCATION_TYPES = ['field', 'elevator', 'storage'];
  const LIVESTOCK_CATEGORIES = ['Ternero', 'Ternera', 'Novillito', 'Novillo', 'Vaquillona', 'Vaca', 'Toro'];
  const LIVESTOCK_MOVEMENT_TYPES = ['purchase', 'sale', 'birth', 'death', 'transfer', 'category_change', 'adjustment'];
  const FINANCIAL_PRODUCT_TYPES = ['bank_account', 'card_financing', 'credit_line', 'loan'];
  const MANAGEMENT_YEAR_START_MONTH = 5;
  const DOCUMENT_READINGS = ['total', 'documented', 'pending_receipt', 'no_receipt'];
  const ARCA_PLAN_SCHEDULES = Object.freeze([
    { number: 'W761122', count: 18, amount: 128269.45, advance: 94843.56, description: 'SICORE - Impuesto a las Ganancias' },
    { number: 'W761123', count: 9, amount: 68815.93, advance: 50000, description: 'Aportes a la Seguridad Social' },
    { number: 'W760582', count: 8, amount: 184814.80, advance: 0, description: 'Contribuciones a la Seguridad Social' }
  ].map((plan) => Object.freeze(plan)));
  const TAX_COMPONENT_TYPES = ['net_taxed', 'vat', 'exempt', 'not_taxed', 'withholding_vat', 'perception_vat', 'withholding_income_tax', 'perception_income_tax', 'withholding_iibb', 'perception_iibb', 'perception_other', 'commission', 'commission_vat', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee', 'bank_debit_credit_tax', 'reimbursement_vat', 'other'];
  const TYPE_LABELS = {
    purchase_invoice: 'Factura de compra',
    sale_invoice: 'Factura de venta',
    credit_note: 'Nota de credito',
    debit_note: 'Nota de debito',
    settlement: 'Liquidacion',
    liability: 'Obligacion sin resultado economico',
    no_receipt: 'Sin comprobante',
    own_check: 'Cheque propio',
    received_check: 'Cheque recibido',
    transfer: 'Transferencia',
    account_debit: 'Debito en cuenta',
    cash: 'Efectivo',
    vep: 'VEP',
    compensation: 'Compensacion',
    card_financing: 'Tarjeta / financiacion',
    bank_loan: 'Credito / prestamo bancario',
    grain_barter: 'Canje de cereal',
    payment: 'Orden de Pago',
    collection: 'Orden de Cobro',
    document: 'Documento',
    order: 'Orden',
    instrument: 'Instrumento',
    entity: 'Contraparte',
    grain_transfer: 'Traslado de cereal',
    grain_forward: 'Contrato FWD',
    grain_liquidation: 'Liquidacion de cereal',
    grain_price: 'Precio de referencia',
    livestock_purchase: 'Compra de hacienda',
    livestock_sale: 'Venta de hacienda',
    livestock_birth: 'Nacimiento',
    livestock_death: 'Muerte/baja',
    livestock_transfer: 'Traslado',
    livestock_category_change: 'Cambio de categoria',
    livestock_adjustment: 'Ajuste justificado',
    livestock_movement: 'Movimiento de hacienda',
    livestock_weighing: 'Pesada de hacienda',
    livestock_price: 'Precio de referencia hacienda',
    financial_adjustment: 'Ajuste de conciliacion',
    bank_account: 'Cuenta bancaria',
    card_financing: 'Tarjeta / financiacion',
    credit_line: 'Linea de financiacion',
    loan: 'Prestamo',
    harvest: 'Ingreso fisico',
    adjustment: 'Ajuste fisico'
  };
  const GRAIN_LOCATION_LABELS = {
    field: 'Campo',
    elevator: 'Acopio',
    storage: 'Deposito propio'
  };
  const TAX_TYPE_LABELS = {
    net_taxed: 'Neto gravado',
    vat: 'IVA',
    exempt: 'Exento',
    not_taxed: 'No gravado',
    withholding_vat: 'Retencion IVA',
    perception_vat: 'Percepcion IVA',
    withholding_income_tax: 'Retencion Ganancias',
    perception_income_tax: 'Percepcion Ganancias',
    withholding_iibb: 'Retencion IIBB',
    perception_iibb: 'Percepcion IIBB',
    perception_other: 'Otras percepciones fiscales',
    commission: 'Comision',
    commission_vat: 'IVA sobre comision',
    admin_expense: 'Gasto administrativo',
    stamp_tax: 'Sellados',
    laboratory_fee: 'Laboratorio',
    guide_fee: 'Guias',
    senasa_fee: 'SENASA',
    control_delivery: 'Control/entrega',
    bath_fee: 'Baño',
    bank_debit_credit_tax: 'Impuesto debitos/creditos bancarios',
    reimbursement_vat: 'Reintegro IVA',
    other: 'Otros'
  };
  const STATUS_LABELS = {
    issued: 'Emitido',
    delivered: 'Entregado',
    debited: 'Debitado',
    received: 'Recibido',
    inPortfolio: 'En cartera',
    deposited: 'Depositado',
    endorsed: 'Endosado',
    accredited: 'Acreditado',
    rejected: 'Rechazado',
    voided: 'Anulado',
    cancelled: 'Anulado',
    pending: 'Pendiente',
    scheduled: 'Programada',
    executed: 'Realizada'
  };

  function labelForType(value) {
    return TYPE_LABELS[value] || value || '';
  }

  function labelForStatus(value) {
    return STATUS_LABELS[value] || value || '';
  }

  function labelForTaxType(value) {
    return TAX_TYPE_LABELS[value] || value || '';
  }

  function orderDisplayCode(state, orderOrId) {
    const order = typeof orderOrId === 'string' ? state.orders.find((item) => item.id === orderOrId) : orderOrId;
    if (!order) return '';
    const prefix = order.type === 'collection' ? 'OC' : 'OP';
    const sameType = state.orders.filter((item) => item.type === order.type);
    const index = sameType.findIndex((item) => item.id === order.id);
    return `${prefix}-${String(index + 1).padStart(5, '0')}`;
  }

  function instrumentDisplayName(state, instrumentOrId) {
    const instrument = typeof instrumentOrId === 'string' ? state.instruments.find((item) => item.id === instrumentOrId) : instrumentOrId;
    if (!instrument) return '';
    if (instrument.type === 'own_check' || instrument.type === 'received_check') return `Cheque N.º ${instrument.checkNumber || instrument.reference || instrument.id}`;
    return `${labelForType(instrument.type)} ${instrument.reference || ''}`.trim();
  }

  // Business date in Argentina. UTC would turn 21:00-23:59 into the next day, both in the browser and on the server (Render runs in UTC).
  const BUSINESS_TIME_ZONE = 'America/Argentina/Buenos_Aires';
  function todayIso(now = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const get = (type) => parts.find((part) => part.type === type)?.value;
      const value = `${get('year')}-${get('month')}-${get('day')}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    } catch (error) { /* Without time zone data, fall back to Argentina's fixed UTC-3 offset. */ }
    return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function parseIsoDate(iso) {
    const [year, month, day] = String(iso || todayIso()).slice(0, 10).split('-').map(Number);
    return { year, month, day };
  }

  function managementExerciseForDate(iso) {
    const { year, month } = parseIsoDate(iso);
    const start = month >= MANAGEMENT_YEAR_START_MONTH ? year : year - 1;
    return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
  }

  function exerciseBounds(exercise) {
    const startYear = Number(String(exercise || managementExerciseForDate(todayIso())).slice(0, 4));
    return {
      dateFrom: `${startYear}-05-01`,
      dateTo: `${startYear + 1}-04-30`
    };
  }

  function calendarYearBounds(year) {
    const y = Number(year || parseIsoDate(todayIso()).year);
    return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function entityName(state, id) {
    return state.entities.find((e) => e.id === id)?.name || id || '';
  }

  function accountName(state, id) {
    const account = state.financialAccounts.find((a) => a.id === id);
    if (!account) return id || '';
    const institution = (state.financialInstitutions || []).find((item) => item.id === account.institutionId);
    return [institution?.name || account.bankName, account.name].filter(Boolean).join(' - ') || id || '';
  }

  function chartAccount(state, id) {
    return state.chartAccounts.find((a) => a.id === id) || null;
  }

  function chartPath(state, id) {
    const parts = [];
    let current = chartAccount(state, id);
    const guard = new Set();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      parts.unshift(current.name);
      current = current.parentId ? chartAccount(state, current.parentId) : null;
    }
    return parts.join(' > ');
  }

  function validStatesForInstrument(type) {
    if (type === 'own_check') return OWN_CHECK_STATES;
    if (type === 'received_check') return RECEIVED_CHECK_STATES;
    if (type === 'transfer' || type === 'account_debit') return TRANSFER_STATES;
    if (type === 'cash') return CASH_STATES;
    if (type === 'vep') return VEP_STATES;
    if (type === 'card_financing' || type === 'bank_loan') return TRANSFER_STATES;
    if (type === 'compensation' || type === 'grain_barter') return COMPENSATION_STATES;
    return [];
  }

  function instrumentIsBankRealized(instrument) {
    if (!instrument || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) return false;
    if (instrument.type === 'compensation' || instrument.type === 'grain_barter') return false;
    if (instrument.type === 'own_check') return instrument.status === 'debited';
    if (instrument.type === 'received_check') return instrument.status === 'accredited';
    return instrument.status === 'executed';
  }

  function instrumentCancelsDocument(instrument) {
    if (!instrument || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) return false;
    if (instrument.type === 'compensation' || instrument.type === 'grain_barter') return instrument.status === 'executed';
    if (instrument.type === 'own_check') return instrument.status === 'delivered' || instrument.status === 'debited';
    if (instrument.type === 'received_check') return ['received', 'inPortfolio', 'deposited', 'endorsed', 'accredited'].includes(instrument.status);
    return instrument.status === 'executed';
  }

  function instrumentCommerciallyCancelsNow(instrument) {
    if (!instrument || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) return false;
    if (instrument.type === 'compensation' || instrument.type === 'grain_barter') return instrument.status === 'executed';
    if (instrument.type === 'received_check') return ['received', 'inPortfolio', 'deposited', 'endorsed', 'accredited'].includes(instrument.status);
    if (instrument.type === 'own_check') return instrument.status === 'delivered' || instrument.status === 'debited';
    return instrumentIsBankRealized(instrument);
  }

  function instrumentIsPending(instrument) {
    if (!instrument || instrument.voidedAt || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) return false;
    if (instrument.type === 'compensation' || instrument.type === 'grain_barter') return false;
    return !instrumentIsBankRealized(instrument);
  }

  function instrumentAffectsFinancialFlow(instrument) {
    if (!instrument || instrument.voidedAt || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) return false;
    if (instrument.type === 'compensation' || instrument.type === 'grain_barter') return false;
    if (instrument.type === 'received_check' && instrument.status === 'endorsed') return false;
    return true;
  }

  function instrumentLinkedOnlyToInactiveOrders(state, instrumentId) {
    const links = state.orderInstruments.filter((link) => link.instrumentId === instrumentId);
    return links.length > 0 && !links.some((link) => !link.voidedAt && state.orders.some((order) => order.id === link.orderId && !order.voidedAt));
  }

  function instrumentLinkedOnlyToVoidedOrders(state, instrumentId) {
    const links = state.orderInstruments.filter((link) => link.instrumentId === instrumentId);
    return links.length > 0 && links.every((link) => state.orders.some((order) => order.id === link.orderId && order.voidedAt));
  }

  function userFlowState(row) {
    if (row.estimated) return 'Estimado';
    if (row.direction === 'in') return row.realized ? 'Cobrado' : 'Pendiente';
    return row.realized ? 'Pagado' : 'Pendiente';
  }

  function signed(direction, amount) {
    return direction === 'in' ? amount : -amount;
  }

  function noteCommercialSide(state, doc) {
    const side = doc?.commercialSide || doc?.side || doc?.appliesToSide;
    if (['supplier', 'purchase', 'payable', 'out'].includes(side)) return 'purchase';
    if (['customer', 'sale', 'receivable', 'in'].includes(side)) return 'sale';
    const entity = state?.entities?.find((item) => item.id === doc?.entityId);
    if (entity?.role === 'Cliente' || entity?.type === 'customer') return 'sale';
    return 'purchase';
  }

  function inferredCommercialSide(type) {
    if (type === 'purchase_invoice') return 'purchase';
    if (type === 'sale_invoice' || type === 'settlement') return 'sale';
    return '';
  }

  function documentDirection(doc, state) {
    if (doc.commercialSideOverride) return noteCommercialSide(state, doc) === 'sale' ? 'in' : 'out';
    if (doc.type === 'sale_invoice' || doc.type === 'settlement') return 'in';
    if (doc.type === 'no_receipt') return noteCommercialSide(state, doc) === 'sale' ? 'in' : 'out';
    if (doc.type === 'credit_note') return noteCommercialSide(state, doc) === 'sale' ? 'out' : 'in';
    if (doc.type === 'debit_note') return noteCommercialSide(state, doc) === 'sale' ? 'in' : 'out';
    return 'out';
  }

  function documentReading(doc) {
    if (doc.fiscalStatus === 'pending_receipt' || doc.documentaryStatus === 'pending_receipt') return 'pending_receipt';
    return doc.fiscalStatus === 'no_receipt' || doc.documentaryStatus === 'no_receipt' || doc.type === 'no_receipt' ? 'no_receipt' : 'documented';
  }

  function documentOperationalDate(doc) {
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (validDate(doc.dueDate)) return doc.dueDate;
    if (validDate(doc.issueDate)) return doc.issueDate;
    return validDate(doc.recordDate) ? doc.recordDate : todayIso();
  }

  function readingMatches(doc, reading) {
    const selected = reading || 'total';
    if (selected === 'total') return true;
    return documentReading(doc) === selected;
  }

  function taxComponentAmount(component) {
    return Number(component?.amount || 0);
  }

  function taxComponentEffectOnTotal(component) {
    const amount = taxComponentAmount(component);
    const type = component?.taxType || component?.type;
    if (String(type || '').startsWith('withholding_')) return -amount;
    if (['commission', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee'].includes(type)) return component?.effect === 'subtract' ? -amount : amount;
    if (['commission_vat', 'other'].includes(type)) return component?.effect === 'add' ? amount : -amount;
    if (component?.effect === 'subtract') return -amount;
    return amount;
  }

  function economicAmountForDocument(doc) {
    if (doc.economicTreatment === 'liability_only') return 0;
    if (doc.economicAmount != null) return Number(doc.economicAmount || 0);
    const components = doc.taxComponents || [];
    const economic = components
      .filter((component) => ['net_taxed', 'exempt', 'not_taxed'].includes(component.taxType || component.type) || component.category === 'economic')
      .reduce((total, component) => total + taxComponentAmount(component), 0);
    return economic || Number(doc.amount || 0);
  }

  function normalizeTaxComponents(components, doc) {
    return (components || []).map((component, index) => ({
      id: component.id || `${doc.id}-TAX-${index + 1}`,
      taxType: component.taxType || component.type || 'other',
      rate: component.rate == null ? null : Number(component.rate),
      taxableBase: component.taxableBase == null ? null : Number(component.taxableBase),
      amount: Number(component.amount || 0),
      direction: component.direction || documentDirection(doc),
      status: component.status || 'registered',
      relatedId: component.relatedId || '',
      category: component.category || '',
      effect: component.effect || '',
      notes: component.notes || ''
    }));
  }

  function documentTotalFromBreakdown(payload, fallbackAmount) {
    const netTaxedAmount = payload.netTaxedAmount == null || payload.netTaxedAmount === '' ? null : Number(payload.netTaxedAmount || 0);
    const exemptAmount = Number(payload.exemptAmount || 0);
    const notTaxedAmount = Number(payload.notTaxedAmount || 0);
    const vatRate = payload.vatRate == null || payload.vatRate === '' ? null : Number(payload.vatRate || 0);
    const vatAmount = payload.vatAmount == null || payload.vatAmount === '' ? (netTaxedAmount != null && vatRate != null ? netTaxedAmount * vatRate / 100 : 0) : Number(payload.vatAmount || 0);
    const commissions = Number(payload.commissions || 0);
    const commissionVat = Number(payload.commissionVat || 0);
    const adminExpenses = Number(payload.adminExpenses || 0);
    const stampTax = Number(payload.stampTax || 0);
    const laboratoryFees = Number(payload.laboratoryFees || 0);
    const guides = Number(payload.guides || 0);
    const senasa = Number(payload.senasa || 0);
    const controlDelivery = Number(payload.controlDelivery || 0);
    const bath = Number(payload.bath || 0);
    const commercialSide = payload.commercialSide || '';
    const perceptionVat = Number(payload.perceptionVat || 0);
    const perceptionIibb = Number(payload.perceptionIibb || 0);
    const otherPerceptions = Number(payload.otherPerceptions || 0);
    const perceptions = Number(payload.perceptions || 0) || perceptionVat + perceptionIibb + otherPerceptions;
    const withholdingVat = Number(payload.withholdingVat || 0);
    const withholdingIncomeTax = Number(payload.withholdingIncomeTax || 0);
    const withholdingIibb = Number(payload.withholdingIibb || 0);
    const otherDeductions = Number(payload.otherDeductions || 0);
    const otherExpenses = Number(payload.otherExpenses || 0);
    const explicitEconomic = (payload.taxComponents || []).filter((component) => ['net_taxed', 'exempt', 'not_taxed'].includes(component.taxType || component.type) || component.category === 'economic').reduce((sum, component) => sum + Number(component.amount || 0), 0);
    const economicAmount = payload.economicAmount == null || payload.economicAmount === ''
      ? (netTaxedAmount != null ? netTaxedAmount + exemptAmount + notTaxedAmount : explicitEconomic || fallbackAmount)
      : Number(payload.economicAmount || 0);
    const hasBreakdown = [netTaxedAmount, exemptAmount, notTaxedAmount, vatAmount, commissions, commissionVat, adminExpenses, stampTax, laboratoryFees, guides, senasa, controlDelivery, bath, perceptions, withholdingVat, withholdingIncomeTax, withholdingIibb, otherDeductions, otherExpenses].some((value) => Number(value || 0) !== 0);
    const amount = payload.amount == null || payload.amount === ''
      ? (hasBreakdown ? economicAmount + vatAmount + perceptions + otherExpenses - commissions - commissionVat - adminExpenses - stampTax - laboratoryFees - guides - senasa - controlDelivery - bath - withholdingVat - withholdingIncomeTax - withholdingIibb - otherDeductions : fallbackAmount)
      : Number(payload.amount || 0);
    const taxComponents = [];
    if (netTaxedAmount != null && netTaxedAmount) taxComponents.push({ taxType: 'net_taxed', taxableBase: netTaxedAmount, amount: netTaxedAmount, category: 'economic' });
    if (exemptAmount) taxComponents.push({ taxType: 'exempt', amount: exemptAmount, category: 'economic' });
    if (notTaxedAmount) taxComponents.push({ taxType: 'not_taxed', amount: notTaxedAmount, category: 'economic' });
    if (vatAmount) taxComponents.push({ taxType: 'vat', rate: vatRate, taxableBase: netTaxedAmount, amount: vatAmount });
    if (commissions) taxComponents.push({ taxType: 'commission', amount: commissions, effect: 'subtract', notes: 'Comision' });
    if (commissionVat) taxComponents.push({ taxType: 'commission_vat', amount: commissionVat, effect: 'subtract', notes: 'IVA sobre comision' });
    if (adminExpenses) taxComponents.push({ taxType: 'admin_expense', amount: adminExpenses, effect: 'subtract', notes: 'Gasto administrativo' });
    if (stampTax) taxComponents.push({ taxType: 'stamp_tax', amount: stampTax, effect: 'subtract', notes: 'Sellados' });
    if (laboratoryFees) taxComponents.push({ taxType: 'laboratory_fee', amount: laboratoryFees, effect: 'subtract', notes: 'Laboratorio' });
    if (guides) taxComponents.push({ taxType: 'guide_fee', amount: guides, effect: 'subtract', notes: 'Guias' });
    if (senasa) taxComponents.push({ taxType: 'senasa_fee', amount: senasa, effect: 'subtract', notes: 'SENASA' });
    if (controlDelivery) taxComponents.push({ taxType: 'control_delivery', amount: controlDelivery, effect: 'subtract', notes: 'Control/entrega' });
    if (bath) taxComponents.push({ taxType: 'bath_fee', amount: bath, effect: 'subtract', notes: 'Baño' });
    if (perceptionVat) taxComponents.push({ taxType: 'perception_vat', amount: perceptionVat, effect: 'add' });
    if (perceptionIibb) taxComponents.push({ taxType: 'perception_iibb', amount: perceptionIibb, effect: 'add' });
    if (otherPerceptions) taxComponents.push({ taxType: 'perception_other', amount: otherPerceptions, effect: 'add' });
    if (!perceptionVat && !perceptionIibb && !otherPerceptions && perceptions) taxComponents.push({ taxType: 'perception_vat', amount: perceptions, effect: 'add' });
    if (withholdingVat) taxComponents.push({ taxType: 'withholding_vat', amount: withholdingVat, effect: 'subtract', status: 'withheld' });
    if (withholdingIncomeTax) taxComponents.push({ taxType: 'withholding_income_tax', amount: withholdingIncomeTax, effect: 'subtract', status: 'withheld' });
    if (withholdingIibb) taxComponents.push({ taxType: 'withholding_iibb', amount: withholdingIibb, effect: 'subtract', status: 'withheld' });
    if (otherExpenses) taxComponents.push({ taxType: 'other', amount: otherExpenses, effect: 'add', notes: commercialSide === 'purchase' ? 'Otros cargos' : 'Otros ingresos/cargos' });
    if (otherDeductions) taxComponents.push({ taxType: 'other', amount: otherDeductions, effect: 'subtract', notes: 'Otras deducciones' });
    return { amount, economicAmount, taxComponents: [...taxComponents, ...(payload.taxComponents || [])] };
  }

  function calculateLivestockTradeBreakdown(payload) {
    const fallbackAmount = Number(payload.totalKg || 0) * Number(payload.pricePerKg || 0);
    const normalized = { ...payload, amount: null };
    if (normalized.netTaxedAmount == null && !Number(normalized.exemptAmount || 0) && !Number(normalized.notTaxedAmount || 0)) normalized.netTaxedAmount = fallbackAmount;
    if (normalized.vatAmount == null && normalized.vatRate != null) normalized.vatAmount = Math.round(Number(normalized.netTaxedAmount || 0) * Number(normalized.vatRate || 0)) / 100;
    const breakdown = documentTotalFromBreakdown(normalized, fallbackAmount);
    const purchaseCharges = new Set(['commission', 'commission_vat', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee']);
    const taxComponents = breakdown.taxComponents.map((component) => ({
      ...component,
      amount: Math.round(Number(component.amount || 0) * 100) / 100,
      effect: payload.type === 'purchase' && purchaseCharges.has(component.taxType || component.type) ? 'add' : component.effect
    }));
    const amount = Math.round(taxComponents.reduce((sum, component) => sum + taxComponentEffectOnTotal(component), 0) * 100) / 100;
    return { amount, economicAmount: breakdown.economicAmount, taxComponents };
  }

  function calculateSimpleDocumentTax({ mode = 'net', netTaxedAmount = 0, totalAmount = 0, vatRate = 0, exemptAmount = 0, notTaxedAmount = 0, perceptions = 0, otherCharges = 0, otherDeductions = 0 } = {}) {
    const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
    const rate = Number(vatRate || 0);
    const exempt = round(exemptAmount);
    const notTaxed = round(notTaxedAmount);
    const additions = round(Number(perceptions || 0) + Number(otherCharges || 0));
    const deductions = round(otherDeductions);
    if (rate < 0) throw new Error('Alicuota IVA invalida');
    if (mode === 'total') {
      const total = round(totalAmount);
      const taxableGross = round(total - exempt - notTaxed - additions + deductions);
      if (total <= 0 || taxableGross < 0) throw new Error('Total fiscal invalido');
      const net = round(taxableGross / (1 + rate / 100));
      const vat = round(taxableGross - net);
      return { netTaxedAmount: net, vatAmount: vat, totalAmount: total };
    }
    const net = round(netTaxedAmount);
    const vat = round(net * rate / 100);
    return { netTaxedAmount: net, vatAmount: vat, totalAmount: round(net + vat + exempt + notTaxed + additions - deductions) };
  }

  function minimalDemoState(baseDate) {
    const today = baseDate || todayIso();
    return {
      version: '1.1-demo',
      managementYearStartMonth: MANAGEMENT_YEAR_START_MONTH,
      entities: [
        { id: 'ENT-PROV-AGRI', name: 'Proveedor Agricultura Demo', type: 'supplier', role: 'Proveedor', cuit: '30000000001', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI-INS' },
        { id: 'ENT-CLIENTE-DEMO', name: 'Cliente Demo', type: 'customer', role: 'Cliente', cuit: '30000000002', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI' },
        { id: 'ENT-BANCO-GALICIA', name: 'Banco Galicia', type: 'bank', role: 'Banco', cuit: '', active: true, suggestedActivity: '', suggestedChartAccountId: '' },
        { id: 'ENT-BANCO-NACION', name: 'Banco Nacion', type: 'bank', role: 'Banco', cuit: '', active: true, suggestedActivity: '', suggestedChartAccountId: '' }
      ],
      financialInstitutions: [
        { id: 'FI-GALICIA', name: 'Banco Galicia', active: true, notes: '' },
        { id: 'FI-NACION', name: 'Banco Nacion', active: true, notes: '' },
        { id: 'FI-CAJA', name: 'Caja', active: true, notes: '' }
      ],
      financialAccounts: [
        { id: 'ACC-GALICIA-ARS', institutionId: 'FI-GALICIA', name: 'Cuenta corriente ARS', type: 'bank', productType: 'bank_account', accountType: 'Cuenta corriente', currency: 'ARS', bankName: 'Banco Galicia', cbu: '', alias: '', openingBalance: 25000000, openingBalanceDate: today, checkEnabled: true, active: true, notes: '' },
        { id: 'ACC-NACION-ARS', institutionId: 'FI-NACION', name: 'Cuenta corriente ARS', type: 'bank', productType: 'bank_account', accountType: 'Cuenta corriente', currency: 'ARS', bankName: 'Banco Nacion', cbu: '', alias: '', openingBalance: 7000000, openingBalanceDate: today, checkEnabled: true, active: true, notes: '' },
        { id: 'ACC-CAJA-ARS', institutionId: 'FI-CAJA', name: 'Caja ARS', type: 'cash', productType: 'bank_account', accountType: 'Caja', currency: 'ARS', bankName: '', cbu: '', alias: '', openingBalance: 1200000, openingBalanceDate: today, checkEnabled: false, active: true, notes: '' }
      ],
      chartAccounts: [
        { id: 'CA-AGRI', name: 'Agricultura', parentId: null, activity: 'Agricultura', active: true },
        { id: 'CA-AGRI-INS', name: 'Insumos', parentId: 'CA-AGRI', activity: 'Agricultura', active: true },
        { id: 'CA-AGRI-INS-FERT', name: 'Fertilizantes', parentId: 'CA-AGRI-INS', activity: 'Agricultura', active: true },
        { id: 'CA-GAN', name: 'Ganaderia', parentId: null, activity: 'Ganaderia', active: true },
        { id: 'CA-GAN-COMPRA-HACIENDA', name: 'Compra de hacienda', parentId: 'CA-GAN', activity: 'Ganaderia', active: true },
        { id: 'CA-ADM', name: 'Estructura/Admin', parentId: null, activity: 'Estructura/Admin', active: true },
        ...['Intereses comerciales', 'Intereses bancarios', 'Gastos financieros', 'Diferencias de cambio', 'Intereses ganados'].map((name, index) => ({ id: `CA-FIN-${index + 1}`, name, parentId: null, activity: 'Financiero', active: true }))
      ],
      documents: [
        { id: 'DOC-FACT-10M', type: 'purchase_invoice', commercialSide: 'purchase', fiscalStatus: 'documented', taxComponents: [], entityId: 'ENT-PROV-AGRI', issueDate: today, dueDate: addDays(today, 15), number: 'FAC-DEMO-10M', amount: 10000000, economicAmount: 10000000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-INS-FERT', description: 'Factura agricultura $10M', voidedAt: null },
        { id: 'DOC-VENCIDO', type: 'purchase_invoice', commercialSide: 'purchase', fiscalStatus: 'documented', taxComponents: [], entityId: 'ENT-PROV-AGRI', issueDate: addDays(today, -50), dueDate: addDays(today, -5), number: 'FAC-VENCIDA', amount: 1250000, economicAmount: 1250000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-INS', description: 'Factura vencida sin medio de pago', voidedAt: null }
      ],
      orders: [
        { id: 'OP-DEMO-001', type: 'payment', entityId: 'ENT-PROV-AGRI', date: today, description: 'Transferencia + dos cheques + saldo pendiente', activity: 'Agricultura', currency: 'ARS', voidedAt: null }
      ],
      orderDocuments: [
        { id: 'OD-DEMO-001', orderId: 'OP-DEMO-001', documentId: 'DOC-FACT-10M', amountApplied: 8000000, currency: 'ARS', voidedAt: null }
      ],
      instruments: [
        { id: 'INS-TR-2M', type: 'transfer', direction: 'out', entityId: 'ENT-PROV-AGRI', financialAccountId: 'ACC-GALICIA-ARS', amount: 2000000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'TR-2M', notes: '' },
        { id: 'INS-CH-30', type: 'own_check', direction: 'out', entityId: 'ENT-PROV-AGRI', financialAccountId: 'ACC-GALICIA-ARS', amount: 3000000, currency: 'ARS', scheduledDate: addDays(today, 30), executedDate: null, status: 'delivered', reference: 'CH-30', checkNumber: '000030', bankName: 'Banco Galicia', notes: '' },
        { id: 'INS-CH-60', type: 'own_check', direction: 'out', entityId: 'ENT-PROV-AGRI', financialAccountId: 'ACC-GALICIA-ARS', amount: 3000000, currency: 'ARS', scheduledDate: addDays(today, 60), executedDate: null, status: 'delivered', reference: 'CH-60', checkNumber: '000060', bankName: 'Banco Galicia', notes: '' }
      ],
      orderInstruments: [
        { id: 'OI-DEMO-TR', orderId: 'OP-DEMO-001', instrumentId: 'INS-TR-2M', amount: 2000000, currency: 'ARS', voidedAt: null },
        { id: 'OI-DEMO-CH30', orderId: 'OP-DEMO-001', instrumentId: 'INS-CH-30', amount: 3000000, currency: 'ARS', voidedAt: null },
        { id: 'OI-DEMO-CH60', orderId: 'OP-DEMO-001', instrumentId: 'INS-CH-60', amount: 3000000, currency: 'ARS', voidedAt: null }
      ],
      orderDocumentSettlements: [
        { id: 'ODS-DEMO-TR', orderDocumentId: 'OD-DEMO-001', orderInstrumentId: 'OI-DEMO-TR', amount: 2000000, currency: 'ARS', voidedAt: null },
        { id: 'ODS-DEMO-CH30', orderDocumentId: 'OD-DEMO-001', orderInstrumentId: 'OI-DEMO-CH30', amount: 3000000, currency: 'ARS', voidedAt: null },
        { id: 'ODS-DEMO-CH60', orderDocumentId: 'OD-DEMO-001', orderInstrumentId: 'OI-DEMO-CH60', amount: 3000000, currency: 'ARS', voidedAt: null }
      ],
      documentCompensations: [],
      taxPaymentPlans: [],
      agriculturalIncomeProjections: [],
      estimates: [
        { id: 'EST-AGRI-001', direction: 'out', date: addDays(today, 45), amount: 900000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-INS', entityId: 'ENT-PROV-AGRI', description: 'Prevision demo de insumos', active: true }
      ],
      grainLocations: [],
      grainMovements: [],
      grainTransfers: [],
      grainForwards: [],
      grainLiquidations: [],
      grainReferencePrices: [],
      livestockLocations: [],
      livestockHerds: [],
      livestockMovements: [],
      livestockTrades: [],
      livestockWeighings: [],
      livestockReferencePrices: [],
      bankCharges: [],
      financialAdjustments: [],
      taxReimbursements: [],
      orderTaxWithholdings: [],
      orderPracticedWithholdings: [],
      taxPayments: [],
      internalTransfers: [],
      auditLog: [
        { id: 'AUD-SEED', entityType: 'database', entityId: 'demo', action: 'seed', changes: [{ field: 'version', from: null, to: '1.1-demo' }], createdAt: new Date().toISOString(), reason: 'Datos ficticios V1.1', user: 'demo' }
      ]
    };
  }

  function demoState(baseDate) {
    const state = minimalDemoState(baseDate);
    const today = baseDate || todayIso();
    state.version = '1.1-demo-agro';
    state.entities.push(
      { id: 'ENT-AGROINSUMOS-DEMO', name: 'DEMO Agroinsumos Demo', type: 'supplier', role: 'Proveedor', cuit: '30900000001', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI-INS-FERT' },
      { id: 'ENT-CONTRATISTA-DEMO', name: 'DEMO Contratista Demo', type: 'supplier', role: 'Proveedor', cuit: '30900000002', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI-SERV-COSECHA' },
      { id: 'ENT-CLIENTE-COBRO-DEMO', name: 'DEMO Cliente Demo Cobros', type: 'customer', role: 'Cliente', cuit: '30900000003', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI' },
      { id: 'ENT-PROVEEDOR-ENDOSO-DEMO', name: 'DEMO Proveedor Endoso', type: 'supplier', role: 'Proveedor', cuit: '30900000004', active: true, suggestedActivity: 'Agricultura', suggestedChartAccountId: 'CA-AGRI-SERV' },
      { id: 'ENT-GANADERIA-PROV-DEMO', name: 'DEMO Proveedor Ganaderia', type: 'supplier', role: 'Proveedor', cuit: '30900000005', active: true, suggestedActivity: 'Ganaderia', suggestedChartAccountId: 'CA-GAN-ALIM' },
      { id: 'ENT-GANADERIA-CLIENTE-DEMO', name: 'DEMO Cliente Ganaderia', type: 'customer', role: 'Cliente', cuit: '30900000006', active: true, suggestedActivity: 'Ganaderia', suggestedChartAccountId: 'CA-GAN-VENTAS' }
    );
    state.chartAccounts.push(
      { id: 'CA-AGRI-SERV', name: 'Servicios', parentId: 'CA-AGRI', activity: 'Agricultura', active: true },
      { id: 'CA-AGRI-SERV-COSECHA', name: 'Cosecha', parentId: 'CA-AGRI-SERV', activity: 'Agricultura', active: true },
      { id: 'CA-AGRI-CEREALES', name: 'Cereales', parentId: 'CA-AGRI', activity: 'Agricultura', active: true },
      { id: 'CA-AGRI-CEREALES-SOJA', name: 'Soja', parentId: 'CA-AGRI-CEREALES', activity: 'Agricultura', active: true },
      { id: 'CA-GAN-ALIM', name: 'Alimentacion', parentId: 'CA-GAN', activity: 'Ganaderia', active: true },
      { id: 'CA-GAN-VENTAS', name: 'Ventas hacienda', parentId: 'CA-GAN', activity: 'Ganaderia', active: true }
    );
    state.documents.push(
      { id: 'DEMO-C1-FAC-INSUMOS', type: 'purchase_invoice', entityId: 'ENT-AGROINSUMOS-DEMO', issueDate: today, dueDate: addDays(today, 20), number: 'DEMO-C1-FAC-INSUMOS', amount: 12000000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-INS-FERT', description: 'DEMO compra fertilizantes pago mixto', voidedAt: null },
      { id: 'DEMO-C2-FAC-COSECHA-A', type: 'purchase_invoice', entityId: 'ENT-CONTRATISTA-DEMO', issueDate: today, dueDate: addDays(today, 25), number: 'DEMO-C2-FAC-A', amount: 3500000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-SERV-COSECHA', description: 'DEMO servicio cosecha lote A', voidedAt: null },
      { id: 'DEMO-C2-FAC-COSECHA-B', type: 'purchase_invoice', entityId: 'ENT-CONTRATISTA-DEMO', issueDate: today, dueDate: addDays(today, 25), number: 'DEMO-C2-FAC-B', amount: 2500000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-SERV-COSECHA', description: 'DEMO servicio cosecha lote B', voidedAt: null },
      { id: 'DEMO-C3-FAC-VENTA', type: 'sale_invoice', entityId: 'ENT-CLIENTE-COBRO-DEMO', issueDate: today, dueDate: addDays(today, 18), number: 'DEMO-C3-VENTA', amount: 15000000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI', description: 'DEMO cuenta a cobrar parcial', voidedAt: null },
      { id: 'DEMO-C4-FAC-PROV-ENDOSO', type: 'purchase_invoice', entityId: 'ENT-PROVEEDOR-ENDOSO-DEMO', issueDate: today, dueDate: addDays(today, 30), number: 'DEMO-C4-FAC-PROV', amount: 4000000, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-AGRI-SERV', description: 'DEMO pago con cheque recibido endosado', voidedAt: null },
      { id: 'DEMO-C5-FAC-GAN-GASTO', type: 'purchase_invoice', entityId: 'ENT-GANADERIA-PROV-DEMO', issueDate: today, dueDate: addDays(today, 10), number: 'DEMO-C5-GASTO-GAN', amount: 1800000, currency: 'ARS', activity: 'Ganaderia', chartAccountId: 'CA-GAN-ALIM', description: 'DEMO gasto ganaderia', voidedAt: null },
      { id: 'DEMO-C5-FAC-GAN-VENTA', type: 'sale_invoice', entityId: 'ENT-GANADERIA-CLIENTE-DEMO', issueDate: today, dueDate: addDays(today, 12), number: 'DEMO-C5-INGRESO-GAN', amount: 2600000, currency: 'ARS', activity: 'Ganaderia', chartAccountId: 'CA-GAN-VENTAS', description: 'DEMO ingreso ganaderia', voidedAt: null }
    );
    state.grainLocations.push(
      { id: 'GL-CAMPO-DEMO', name: 'DEMO Campo propio', type: 'field', entityId: '', active: true },
      { id: 'GL-ACOPIO-DEMO', name: 'DEMO Acopio La Agricola', type: 'elevator', entityId: 'ENT-PROV-AGRI', active: true }
    );
    state.grainMovements.push(
      { id: 'GM-DEMO-COSECHA', date: today, cereal: 'Soja', campaign: '2026/27', locationId: 'GL-CAMPO-DEMO', direction: 'in', kg: 100000, movementType: 'harvest', referenceType: 'demo', referenceId: 'DEMO-COSECHA-SOJA', description: 'DEMO cosecha soja' },
      { id: 'GM-DEMO-TR-OUT', date: addDays(today, 1), cereal: 'Soja', campaign: '2026/27', locationId: 'GL-CAMPO-DEMO', direction: 'out', kg: 40000, movementType: 'transfer', referenceType: 'grain_transfer', referenceId: 'GT-DEMO-001', description: 'DEMO envio a acopio' },
      { id: 'GM-DEMO-TR-IN', date: addDays(today, 1), cereal: 'Soja', campaign: '2026/27', locationId: 'GL-ACOPIO-DEMO', direction: 'in', kg: 39600, movementType: 'transfer', referenceType: 'grain_transfer', referenceId: 'GT-DEMO-001', description: 'DEMO recepcion neta acopio' },
      { id: 'GM-DEMO-LIQ-OUT', date: addDays(today, 65), cereal: 'Soja', campaign: '2026/27', locationId: 'GL-ACOPIO-DEMO', direction: 'out', kg: 15000, movementType: 'liquidation', referenceType: 'document', referenceId: 'DEMO-GRAIN-LIQ-DOC', description: 'DEMO liquidacion parcial FWD' }
    );
    state.grainTransfers.push(
      { id: 'GT-DEMO-001', date: addDays(today, 1), cereal: 'Soja', campaign: '2026/27', originLocationId: 'GL-CAMPO-DEMO', destinationLocationId: 'GL-ACOPIO-DEMO', kgSent: 40000, kgNetRecognized: 39600, differenceKg: 400, description: 'DEMO traslado campo a acopio' }
    );
    state.grainForwards.push(
      { id: 'GF-DEMO-001', cereal: 'Soja', campaign: '2026/27', buyerEntityId: 'ENT-CLIENTE-DEMO', contractedKg: 50000, price: 300, currency: 'USD', plannedDeliveryDate: addDays(today, 35), plannedLiquidationDate: addDays(today, 45), chartAccountId: 'CA-AGRI-CEREALES-SOJA', status: 'active', description: 'DEMO FWD soja precio fijo' }
    );
    state.grainReferencePrices.push(
      { id: 'GRP-DEMO-SOJA', cereal: 'Soja', campaign: '2026/27', date: today, price: 300, currency: 'USD', unit: 'tn', notes: 'DEMO precio manual' }
    );
    state.grainLiquidations.push(
      { id: 'GLIQ-DEMO-001', documentId: 'DEMO-GRAIN-LIQ-DOC', forwardId: 'GF-DEMO-001', cereal: 'Soja', campaign: '2026/27', locationId: 'GL-ACOPIO-DEMO', counterpartyEntityId: 'ENT-CLIENTE-DEMO', kg: 15000, price: 300, currency: 'USD', exchangeRate: 1000, financialAmount: 4500000, financialCurrency: 'ARS', date: addDays(today, 65), description: 'DEMO liquidacion parcial soja' }
    );
    state.documents.push(
      { id: 'DEMO-GRAIN-LIQ-DOC', type: 'settlement', commercialSide: 'sale', fiscalStatus: 'documented', taxComponents: [], entityId: 'ENT-CLIENTE-DEMO', issueDate: addDays(today, 65), dueDate: addDays(today, 68), number: 'DEMO-LIQ-SOJA-001', amount: 4500, economicAmount: 4500, currency: 'USD', financialAmount: 4500000, financialCurrency: 'ARS', exchangeRate: 1000, activity: 'Agricultura', chartAccountId: 'CA-AGRI-CEREALES-SOJA', description: 'DEMO liquidacion cereal Soja 15.000 kg', cereal: 'Soja', campaign: '2026/27', grainLocationId: 'GL-ACOPIO-DEMO', grainLiquidationId: 'GLIQ-DEMO-001', voidedAt: null }
    );
    const livestockDemoDate = '2028-05-01';
    state.livestockLocations.push(
      { id: 'LL-DEMO-CAMPO', name: 'DEMO Campo ganadero', active: true, notes: 'DEMO' },
      { id: 'LL-DEMO-CORRAL', name: 'DEMO Corral terminacion', active: true, notes: 'DEMO' }
    );
    state.livestockHerds.push(
      { id: 'LH-DEMO-TERNEROS', name: 'DEMO Tropa terneros', category: 'Ternero', locationId: 'LL-DEMO-CAMPO', startDate: livestockDemoDate, status: 'active', notes: 'DEMO' },
      { id: 'LH-DEMO-NOVILLOS', name: 'DEMO Tropa novillos', category: 'Novillo', locationId: 'LL-DEMO-CORRAL', startDate: livestockDemoDate, status: 'active', notes: 'DEMO' }
    );
    state.livestockMovements.push(
      { id: 'LMOV-DEMO-NAC', date: addDays(livestockDemoDate, 5), movementType: 'birth', herdId: 'LH-DEMO-TERNEROS', locationId: 'LL-DEMO-CAMPO', category: 'Ternero', direction: 'in', heads: 23, referenceType: 'birth', referenceId: 'LMOV-DEMO-NAC', description: 'DEMO stock inicial/nacimientos' },
      { id: 'LMOVE-DEMO-CAT-OUT', date: addDays(livestockDemoDate, 20), movementType: 'category_change', herdId: 'LH-DEMO-TERNEROS', locationId: 'LL-DEMO-CAMPO', category: 'Ternero', direction: 'out', heads: 10, referenceType: 'category_change', referenceId: 'LMOVE-DEMO-CAT', description: 'DEMO paso a novillo' },
      { id: 'LMOVE-DEMO-CAT-IN', date: addDays(livestockDemoDate, 20), movementType: 'category_change', herdId: 'LH-DEMO-NOVILLOS', locationId: 'LL-DEMO-CORRAL', category: 'Novillo', direction: 'in', heads: 10, referenceType: 'category_change', referenceId: 'LMOVE-DEMO-CAT', description: 'DEMO paso a novillo' }
    );
    state.livestockWeighings.push(
      { id: 'LWG-DEMO-TERNEROS', date: addDays(livestockDemoDate, 10), herdId: 'LH-DEMO-TERNEROS', category: 'Ternero', heads: 20, totalKg: 4500, averageWeightKg: 225, condition: 'DEMO pesada lote completo', notes: 'DEMO' },
      { id: 'LWG-DEMO-NOVILLOS', date: addDays(livestockDemoDate, 35), herdId: 'LH-DEMO-NOVILLOS', category: 'Novillo', heads: 10, totalKg: 4200, averageWeightKg: 420, condition: 'DEMO pesada venta', notes: 'DEMO' }
    );
    state.livestockReferencePrices.push(
      { id: 'LPRICE-DEMO-TERNERO', category: 'Ternero', date: livestockDemoDate, pricePerKg: 2300, currency: 'ARS', notes: 'DEMO precio referencia' },
      { id: 'LPRICE-DEMO-NOVILLO', category: 'Novillo', date: livestockDemoDate, pricePerKg: 2600, currency: 'ARS', notes: 'DEMO precio referencia' }
    );
    state.orders.push(
      { id: 'DEMO-C1-OP', type: 'payment', entityId: 'ENT-AGROINSUMOS-DEMO', date: today, description: 'DEMO OP insumos pago mixto', activity: 'Agricultura', currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OP', type: 'payment', entityId: 'ENT-CONTRATISTA-DEMO', date: today, description: 'DEMO OP cosecha dos facturas', activity: 'Agricultura', currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-OC', type: 'collection', entityId: 'ENT-CLIENTE-COBRO-DEMO', date: today, description: 'DEMO OC cobro parcial', activity: 'Agricultura', currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C4-OP-ENDOSO', type: 'payment', entityId: 'ENT-PROVEEDOR-ENDOSO-DEMO', date: today, description: 'DEMO OP pagada con cheque recibido endosado', activity: 'Agricultura', currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OP-GAN', type: 'payment', entityId: 'ENT-GANADERIA-PROV-DEMO', date: today, description: 'DEMO OP ganaderia', activity: 'Ganaderia', currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OC-GAN', type: 'collection', entityId: 'ENT-GANADERIA-CLIENTE-DEMO', date: today, description: 'DEMO OC ganaderia', activity: 'Ganaderia', currency: 'ARS', voidedAt: null }
    );
    state.orderDocuments.push(
      { id: 'DEMO-C1-OD', orderId: 'DEMO-C1-OP', documentId: 'DEMO-C1-FAC-INSUMOS', amountApplied: 10000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OD-A', orderId: 'DEMO-C2-OP', documentId: 'DEMO-C2-FAC-COSECHA-A', amountApplied: 3500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OD-B', orderId: 'DEMO-C2-OP', documentId: 'DEMO-C2-FAC-COSECHA-B', amountApplied: 2500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-OD', orderId: 'DEMO-C3-OC', documentId: 'DEMO-C3-FAC-VENTA', amountApplied: 9000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C4-OD', orderId: 'DEMO-C4-OP-ENDOSO', documentId: 'DEMO-C4-FAC-PROV-ENDOSO', amountApplied: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OD-GASTO', orderId: 'DEMO-C5-OP-GAN', documentId: 'DEMO-C5-FAC-GAN-GASTO', amountApplied: 1800000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OD-INGRESO', orderId: 'DEMO-C5-OC-GAN', documentId: 'DEMO-C5-FAC-GAN-VENTA', amountApplied: 2600000, currency: 'ARS', voidedAt: null }
    );
    state.instruments.push(
      { id: 'DEMO-C1-TR-2M', type: 'transfer', direction: 'out', entityId: 'ENT-AGROINSUMOS-DEMO', financialAccountId: 'ACC-GALICIA-ARS', amount: 2000000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'DEMO-C1-TR', notes: 'DEMO' },
      { id: 'DEMO-C1-CH-30', type: 'own_check', direction: 'out', entityId: 'ENT-AGROINSUMOS-DEMO', financialAccountId: 'ACC-GALICIA-ARS', amount: 4000000, currency: 'ARS', scheduledDate: addDays(today, 30), executedDate: null, status: 'delivered', reference: 'DEMO-C1-CH30', checkNumber: 'DEMO100030', bankName: 'Banco Galicia', notes: 'DEMO' },
      { id: 'DEMO-C1-CH-60', type: 'own_check', direction: 'out', entityId: 'ENT-AGROINSUMOS-DEMO', financialAccountId: 'ACC-GALICIA-ARS', amount: 4000000, currency: 'ARS', scheduledDate: addDays(today, 60), executedDate: null, status: 'delivered', reference: 'DEMO-C1-CH60', checkNumber: 'DEMO100060', bankName: 'Banco Galicia', notes: 'DEMO' },
      { id: 'DEMO-C2-TR', type: 'transfer', direction: 'out', entityId: 'ENT-CONTRATISTA-DEMO', financialAccountId: 'ACC-NACION-ARS', amount: 1500000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'DEMO-C2-TR', notes: 'DEMO' },
      { id: 'DEMO-C2-CH-A', type: 'own_check', direction: 'out', entityId: 'ENT-CONTRATISTA-DEMO', financialAccountId: 'ACC-NACION-ARS', amount: 2500000, currency: 'ARS', scheduledDate: addDays(today, 30), executedDate: null, status: 'delivered', reference: 'DEMO-C2-CHA', checkNumber: 'DEMO200030', bankName: 'Banco Nacion', notes: 'DEMO' },
      { id: 'DEMO-C2-CH-B', type: 'own_check', direction: 'out', entityId: 'ENT-CONTRATISTA-DEMO', financialAccountId: 'ACC-NACION-ARS', amount: 2000000, currency: 'ARS', scheduledDate: addDays(today, 60), executedDate: null, status: 'delivered', reference: 'DEMO-C2-CHB', checkNumber: 'DEMO200060', bankName: 'Banco Nacion', notes: 'DEMO' },
      { id: 'DEMO-C3-TR-5M', type: 'transfer', direction: 'in', entityId: 'ENT-CLIENTE-COBRO-DEMO', financialAccountId: 'ACC-GALICIA-ARS', amount: 5000000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'DEMO-C3-TR', notes: 'DEMO' },
      { id: 'DEMO-C3-CHK-4M', type: 'received_check', direction: 'in', entityId: 'ENT-CLIENTE-COBRO-DEMO', financialAccountId: 'ACC-GALICIA-ARS', amount: 4000000, currency: 'ARS', scheduledDate: addDays(today, 20), executedDate: null, status: 'endorsed', reference: 'DEMO-C3-CHK', checkNumber: 'DEMO-R-4000', bankName: 'Banco Demo', deliveredToEntityId: 'ENT-PROVEEDOR-ENDOSO-DEMO', notes: 'DEMO cheque recibido y endosado' },
      { id: 'DEMO-C5-TR-GASTO', type: 'transfer', direction: 'out', entityId: 'ENT-GANADERIA-PROV-DEMO', financialAccountId: 'ACC-NACION-ARS', amount: 1800000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'DEMO-C5-GASTO', notes: 'DEMO' },
      { id: 'DEMO-C5-TR-INGRESO', type: 'transfer', direction: 'in', entityId: 'ENT-GANADERIA-CLIENTE-DEMO', financialAccountId: 'ACC-NACION-ARS', amount: 2600000, currency: 'ARS', scheduledDate: today, executedDate: today, status: 'executed', reference: 'DEMO-C5-INGRESO', notes: 'DEMO' }
    );
    state.orderInstruments.push(
      { id: 'DEMO-C1-OI-TR', orderId: 'DEMO-C1-OP', instrumentId: 'DEMO-C1-TR-2M', amount: 2000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C1-OI-CH30', orderId: 'DEMO-C1-OP', instrumentId: 'DEMO-C1-CH-30', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C1-OI-CH60', orderId: 'DEMO-C1-OP', instrumentId: 'DEMO-C1-CH-60', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OI-TR', orderId: 'DEMO-C2-OP', instrumentId: 'DEMO-C2-TR', amount: 1500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OI-CHA', orderId: 'DEMO-C2-OP', instrumentId: 'DEMO-C2-CH-A', amount: 2500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-OI-CHB', orderId: 'DEMO-C2-OP', instrumentId: 'DEMO-C2-CH-B', amount: 2000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-OI-TR', orderId: 'DEMO-C3-OC', instrumentId: 'DEMO-C3-TR-5M', amount: 5000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-OI-CHK', orderId: 'DEMO-C3-OC', instrumentId: 'DEMO-C3-CHK-4M', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C4-OI-ENDOSO', orderId: 'DEMO-C4-OP-ENDOSO', instrumentId: 'DEMO-C3-CHK-4M', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OI-GASTO', orderId: 'DEMO-C5-OP-GAN', instrumentId: 'DEMO-C5-TR-GASTO', amount: 1800000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-OI-INGRESO', orderId: 'DEMO-C5-OC-GAN', instrumentId: 'DEMO-C5-TR-INGRESO', amount: 2600000, currency: 'ARS', voidedAt: null }
    );
    state.orderDocumentSettlements.push(
      { id: 'DEMO-C1-ODS-TR', orderDocumentId: 'DEMO-C1-OD', orderInstrumentId: 'DEMO-C1-OI-TR', amount: 2000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C1-ODS-CH30', orderDocumentId: 'DEMO-C1-OD', orderInstrumentId: 'DEMO-C1-OI-CH30', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C1-ODS-CH60', orderDocumentId: 'DEMO-C1-OD', orderInstrumentId: 'DEMO-C1-OI-CH60', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-ODS-A-TR', orderDocumentId: 'DEMO-C2-OD-A', orderInstrumentId: 'DEMO-C2-OI-TR', amount: 1500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-ODS-A-CHA', orderDocumentId: 'DEMO-C2-OD-A', orderInstrumentId: 'DEMO-C2-OI-CHA', amount: 2000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-ODS-B-CHA', orderDocumentId: 'DEMO-C2-OD-B', orderInstrumentId: 'DEMO-C2-OI-CHA', amount: 500000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C2-ODS-B-CHB', orderDocumentId: 'DEMO-C2-OD-B', orderInstrumentId: 'DEMO-C2-OI-CHB', amount: 2000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-ODS-TR', orderDocumentId: 'DEMO-C3-OD', orderInstrumentId: 'DEMO-C3-OI-TR', amount: 5000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C3-ODS-CHK', orderDocumentId: 'DEMO-C3-OD', orderInstrumentId: 'DEMO-C3-OI-CHK', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C4-ODS-ENDOSO', orderDocumentId: 'DEMO-C4-OD', orderInstrumentId: 'DEMO-C4-OI-ENDOSO', amount: 4000000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-ODS-GASTO', orderDocumentId: 'DEMO-C5-OD-GASTO', orderInstrumentId: 'DEMO-C5-OI-GASTO', amount: 1800000, currency: 'ARS', voidedAt: null },
      { id: 'DEMO-C5-ODS-INGRESO', orderDocumentId: 'DEMO-C5-OD-INGRESO', orderInstrumentId: 'DEMO-C5-OI-INGRESO', amount: 2600000, currency: 'ARS', voidedAt: null }
    );
    state.auditLog.unshift({ id: 'AUD-DEMO-AGRO', entityType: 'database', entityId: 'demo-agro', action: 'seed-agro-validation', changes: [{ field: 'cases', from: null, to: 5 }], createdAt: new Date().toISOString(), reason: 'Casos agropecuarios DEMO antes de Cereales', user: 'demo' });
    return state;
  }

  function indexes(state) {
    return {
      documents: new Map(state.documents.map((x) => [x.id, x])),
      orders: new Map(state.orders.map((x) => [x.id, x])),
      instruments: new Map(state.instruments.map((x) => [x.id, x])),
      orderDocuments: new Map(state.orderDocuments.map((x) => [x.id, x])),
      orderInstruments: new Map(state.orderInstruments.map((x) => [x.id, x])),
      accounts: new Map(state.financialAccounts.map((x) => [x.id, x]))
    };
  }

  function documentBreakdown(state, documentId, asOfDate, limitSettlementsToDate) {
    const idx = indexes(state);
    const doc = idx.documents.get(documentId);
    if (!doc || doc.voidedAt) return null;
    let assigned = 0;
    let commercialCancelled = 0;
    let financialRealized = 0;
    let instrumentedFinancialPending = 0;
    let committedPending = 0;
    const details = [];

    state.orderDocuments.filter((link) => link.documentId === documentId && !link.voidedAt && idx.orders.has(link.orderId) && !idx.orders.get(link.orderId).voidedAt).forEach((od) => {
      assigned += od.amountApplied;
      state.orderDocumentSettlements.filter((s) => s.orderDocumentId === od.id && !s.voidedAt).forEach((s) => {
        const oi = idx.orderInstruments.get(s.orderInstrumentId);
        const instrument = oi ? idx.instruments.get(oi.instrumentId) : null;
        if (!oi || oi.voidedAt || oi.orderId !== od.orderId || !instrument || instrument.voidedAt) return;
        const settlementDate = instrument.type === 'own_check' && instrumentCommerciallyCancelsNow(instrument)
          ? instrument.deliveredDate || ''
          : instrument.executedDate || instrument.scheduledDate;
        if (limitSettlementsToDate && asOfDate && (!settlementDate || settlementDate > asOfDate)) return;
        const bankRealized = instrumentIsBankRealized(instrument) && (!limitSettlementsToDate || !asOfDate || (instrument.executedDate || instrument.scheduledDate) <= asOfDate);
        const commercialRealized = instrumentCommerciallyCancelsNow(instrument);
        if (commercialRealized) commercialCancelled += s.amount;
        if (bankRealized) financialRealized += s.amount;
        else {
          if (instrumentAffectsFinancialFlow(instrument)) instrumentedFinancialPending += s.amount;
          if (!commercialRealized && (instrumentCancelsDocument(instrument) || instrumentIsPending(instrument))) committedPending += s.amount;
        }
        details.push({
          orderDocumentId: od.id,
          orderInstrumentId: oi?.id,
          instrumentId: instrument.id,
          amount: s.amount,
          instrumentAmount: settlementInstrumentAmount(s),
          instrumentCurrency: s.instrumentCurrency || s.currency,
          exchangeRate: s.exchangeRate || null,
          exchangeRateDate: s.exchangeRateDate || '',
          exchangeRateReference: s.exchangeRateReference || '',
          realized: bankRealized,
          commercialCancelled: commercialRealized,
          financialRealized: bankRealized,
          status: instrument.status
        });
      });
      (state.orderTaxWithholdings || []).filter((item) => item.orderDocumentId === od.id && !item.voidedAt && (!limitSettlementsToDate || !asOfDate || (item.date || idx.orders.get(od.orderId).date) <= asOfDate)).forEach((item) => {
        commercialCancelled += Number(item.amount || 0);
        details.push({ orderDocumentId: od.id, withholdingId: item.id, amount: item.amount, realized: false, commercialCancelled: true, financialRealized: false, status: 'withheld', taxType: item.taxType });
      });
      (state.orderPracticedWithholdings || []).filter((item) => item.orderDocumentId === od.id && !item.voidedAt && (!limitSettlementsToDate || !asOfDate || (item.date || idx.orders.get(od.orderId).date) <= asOfDate)).forEach((item) => {
        commercialCancelled += Number(item.amount || 0);
        details.push({ orderDocumentId: od.id, practicedWithholdingId: item.id, amount: item.amount, realized: false, commercialCancelled: true, financialRealized: false, status: 'withheld', taxType: item.taxType });
      });
    });

    (state.documentCompensations || []).filter((item) => compensationIsConfirmed(item) && (!limitSettlementsToDate || !asOfDate || item.date <= asOfDate) && (item.creditDocumentId === documentId || item.debtDocumentId === documentId)).forEach((item) => {
      const amount = compensationDocumentAmount(item, documentId);
      commercialCancelled += amount;
      details.push({ compensationId: item.id, amount, realized: false, commercialCancelled: true, financialRealized: false, status: 'compensated' });
    });

    const nonInstrumented = Math.max(doc.amount - commercialCancelled - committedPending, 0);
    let status = 'Pendiente';
    if (commercialCancelled >= doc.amount - 0.01) status = documentDirection(doc, state) === 'in' ? 'Cobrado' : 'Pagado';
    else if (nonInstrumented > 0.01 && doc.dueDate && doc.dueDate < (asOfDate || todayIso())) status = 'Pendiente vencido';
    return {
      doc,
      assigned,
      cancelled: commercialCancelled,
      commercialCancelled,
      financialRealized,
      instrumentedFinancialPending,
      committedPending,
      nonInstrumented,
      control: commercialCancelled + committedPending + nonInstrumented,
      status,
      details
    };
  }

  function orderInstrumentCommercialAmount(link) {
    return Number(link.commercialAmount ?? link.amount ?? 0);
  }

  function settlementInstrumentAmount(settlement) {
    return Number(settlement.instrumentAmount ?? settlement.amount ?? 0);
  }

  function normalizeInstrumentApplication(item, commercialCurrency) {
    const amount = Number(item.amount || 0);
    const currency = item.currency || commercialCurrency;
    if (!Number.isFinite(amount) || amount <= 0 || !CURRENCIES.includes(currency)) throw new Error('Importe o moneda de instrumento invalido');
    if (item.commercialCurrency && item.commercialCurrency !== commercialCurrency) throw new Error('Moneda comercial incompatible con la orden');
    if (currency === commercialCurrency) {
      if (item.commercialAmount != null && Math.abs(Number(item.commercialAmount) - amount) > 0.001) throw new Error('La imputacion de la misma moneda debe coincidir con el nominal');
      return { currency, amount, commercialAmount: amount, commercialCurrency };
    }
    if (!['own_check', 'transfer', 'account_debit', 'cash', 'received_check'].includes(item.type)) throw new Error('Este medio no admite imputacion multimoneda');
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) throw new Error('Importe nominal invalido: usar centavos');
    const explicit = item.commercialAmount != null && item.commercialAmount !== '';
    const explicitRate = item.exchangeRate != null && item.exchangeRate !== '';
    const rate = Number(explicitRate ? item.exchangeRate : explicit ? amount / Number(item.commercialAmount) : 0);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Tipo de cambio explicito o importe comercial obligatorio');
    const commercialAmount = explicit ? Number(item.commercialAmount) : Math.round(amount / rate * 100) / 100;
    if (!Number.isFinite(commercialAmount) || commercialAmount <= 0 || Math.abs(commercialAmount * 100 - Math.round(commercialAmount * 100)) > 0.0001) throw new Error('Importe comercial invalido: usar centavos');
    const roundingDifference = Math.round((amount - commercialAmount * rate) * 100) / 100;
    if (Math.abs(amount - commercialAmount * rate) > rate * 0.005 + 0.005001) throw new Error('Importe comercial y tipo de cambio incompatibles');
    const exchangeRateDate = item.exchangeRateDate || item.scheduledDate;
    assertCorrectionDate(exchangeRateDate || '');
    return { currency, amount, commercialAmount, commercialCurrency, exchangeRate: rate,
      exchangeRateDate, exchangeRateReference: String(item.exchangeRateReference || item.reference || ''),
      exchangeRateSource: item.exchangeRateSource === 'exchangeRate' || !explicit ? 'exchangeRate' : 'commercialAmount', roundingDifference };
  }

  function applicationLinkFields(application) {
    if (application.currency === application.commercialCurrency) return {};
    const { commercialAmount, commercialCurrency, exchangeRate, exchangeRateDate, exchangeRateReference, exchangeRateSource, roundingDifference } = application;
    return { commercialAmount, commercialCurrency, exchangeRate, exchangeRateDate, exchangeRateReference, exchangeRateSource, roundingDifference };
  }

  function createApplicationSettlement(oi, orderDocumentId, amount, currency, instrumentAmount) {
    const cross = oi.currency !== currency;
    return { id: uid('ODS'), orderDocumentId, orderInstrumentId: oi.id, amount, currency, voidedAt: null,
      ...(cross ? { instrumentAmount, instrumentCurrency: oi.currency, exchangeRate: oi.exchangeRate,
        exchangeRateDate: oi.exchangeRateDate, exchangeRateReference: oi.exchangeRateReference,
        roundingDifference: Math.round((instrumentAmount - amount * oi.exchangeRate) * 100) / 100 } : {}) };
  }

  function orderBreakdown(state, orderId) {
    const idx = indexes(state);
    const order = idx.orders.get(orderId);
    if (!order || order.voidedAt) return null;
    const applied = state.orderDocuments.filter((x) => x.orderId === orderId && !x.voidedAt).reduce((sum, x) => sum + x.amountApplied, 0);
    let paidOrCollected = 0;
    let commercialCancelled = 0;
    let pending = 0;
    let financialPending = 0;
    state.orderInstruments.filter((x) => x.orderId === orderId && !x.voidedAt).forEach((oi) => {
      const instrument = idx.instruments.get(oi.instrumentId);
      const commercialAmount = orderInstrumentCommercialAmount(oi);
      if (instrumentIsBankRealized(instrument)) paidOrCollected += commercialAmount;
      if (instrumentCommerciallyCancelsNow(instrument)) commercialCancelled += commercialAmount;
      else if (instrumentIsPending(instrument)) pending += commercialAmount;
      if (instrumentAffectsFinancialFlow(instrument) && !instrumentIsBankRealized(instrument)) financialPending += commercialAmount;
    });
    const taxWithheld = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].filter((item) => item.orderId === orderId && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    commercialCancelled += taxWithheld;
    const compensated = (state.documentCompensations || []).filter(compensationIsConfirmed).reduce((sum, item) => sum + state.orderDocuments.filter((link) => link.orderId === orderId && !link.voidedAt && [item.creditOrderDocumentId, item.debtOrderDocumentId].includes(link.id)).reduce((subtotal, link) => subtotal + compensationDocumentAmount(item, link.documentId), 0), 0);
    commercialCancelled += compensated;
    const status = order.voidedAt ? 'Anulada' : commercialCancelled >= applied - 0.01 ? (order.type === 'collection' ? 'Cobrada' : 'Pagada') : 'Pendiente';
    return { order, applied, paidOrCollected, commercialCancelled, taxWithheld, compensated, pending, financialPending, notCoveredByInstrument: Math.max(applied - commercialCancelled - pending, 0), status };
  }

  function flowRows(state, options) {
    const asOfDate = options?.asOfDate || todayIso();
    const rows = [];
    state.instruments.forEach((instrument) => {
      if (!instrumentAffectsFinancialFlow(instrument)) return;
      if (instrumentIsPending(instrument) && instrumentLinkedOnlyToInactiveOrders(state, instrument.id)) return;
      const allocatedRows = allocatedInstrumentFlowRows(state, instrument);
      if (allocatedRows.length) rows.push(...allocatedRows);
      else rows.push(unallocatedInstrumentFlowRow(state, instrument));
    });

    // Every executed bank charge leaves the bank once, whether it was generated automatically (impuesto al cheque) or loaded by hand.
    (state.bankCharges || []).filter((charge) => charge.status === 'executed' && !charge.voidedAt).forEach((charge) => {
      rows.push({ id: charge.id, date: charge.date, direction: 'out', userStatus: 'Pagado', detail: labelForTaxType(charge.taxType || 'bank_debit_credit_tax'), activity: charge.activity || 'Estructura/Admin', chartAccountId: charge.chartAccountId || 'CA-ADM', chartPath: chartPath(state, charge.chartAccountId || 'CA-ADM'), entityId: charge.entityId || '', entityName: entityName(state, charge.entityId), orderId: '', instrumentId: charge.instrumentId || '', documentId: '', concept: charge.description || 'Cargo bancario', amount: -Number(charge.amount || 0), currency: charge.currency, realized: true, estimated: false, source: 'bankCharge', financialAccountId: charge.financialAccountId });
    });

    (state.financialAdjustments || []).forEach((adjustment) => {
      const amount = Number(adjustment.amount || 0);
      rows.push({
        id: adjustment.id,
        date: adjustment.date,
        direction: amount >= 0 ? 'in' : 'out',
        userStatus: amount >= 0 ? 'Cobrado' : 'Pagado',
        detail: 'Ajuste de conciliacion',
        activity: '',
        chartAccountId: '',
        chartPath: '',
        entityId: '',
        entityName: '',
        orderId: '',
        instrumentId: '',
        documentId: '',
        concept: adjustment.reason,
        amount,
        currency: adjustment.currency,
        realized: true,
        estimated: false,
        source: 'financialAdjustment',
        financialAccountId: adjustment.financialAccountId
      });
    });

    state.documents.forEach((doc) => {
      if (!readingMatches(doc, options?.reading)) return;
      const b = documentBreakdown(state, doc.id, asOfDate);
      if (!b || b.nonInstrumented < 0.005 || !documentPlanProjectionEnabled(state, doc.id)) return;
      const direction = documentDirection(doc, state);
      rows.push({
        id: `UNINSTR-${doc.id}`,
        date: documentOperationalDate(doc),
        direction,
        userStatus: 'Pendiente',
        detail: doc.dueDate && doc.dueDate < asOfDate ? 'sin medio definido vencido' : 'sin medio definido',
        activity: doc.activity,
        chartAccountId: doc.chartAccountId,
        chartPath: chartPath(state, doc.chartAccountId),
        entityId: doc.entityId,
        entityName: entityName(state, doc.entityId),
        orderId: '',
        instrumentId: '',
        documentId: doc.id,
        concept: `${doc.number} - ${doc.description}`,
        amount: signed(direction, b.nonInstrumented),
        currency: doc.currency,
        cereal: doc.cereal || '',
        campaign: doc.campaign || '',
        realized: false,
        estimated: false,
        source: 'document-balance'
      });
    });

    state.estimates.filter((x) => x.active).forEach((estimate) => {
      rows.push({
        id: estimate.id,
        date: estimate.date,
        direction: estimate.direction,
        userStatus: 'Estimado',
        detail: 'prevision',
        activity: estimate.activity,
        chartAccountId: estimate.chartAccountId,
        chartPath: chartPath(state, estimate.chartAccountId),
        entityId: estimate.entityId,
        entityName: entityName(state, estimate.entityId),
        orderId: '',
        instrumentId: '',
        documentId: '',
        concept: estimate.description,
        amount: signed(estimate.direction, estimate.amount),
        currency: estimate.currency,
        realized: false,
        estimated: true,
        source: 'estimate'
      });
    });

    rows.push(...grainForwardEstimatedFlowRows(state, options));
    (state.agriculturalIncomeProjections || []).filter((item) => item.status === 'estimated').forEach((item) => {
      rows.push({ id: item.id, projectionId: item.id, date: item.plannedDate, datePrecision: item.datePrecision, direction: 'in', userStatus: 'Estimado', detail: 'Cosecha estimada', activity: 'Agricultura', chartAccountId: '', chartPath: '', entityId: '', entityName: '', orderId: '', instrumentId: '', documentId: '', cereal: item.crop, campaign: item.campaign, concept: item.concept, amount: item.amount, currency: item.currency, realized: false, estimated: true, source: 'agricultural-income-projection' });
    });

    return rows.sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));
  }

  function instrumentFlowDate(instrument) {
    return instrumentIsBankRealized(instrument)
      ? (instrument.executedDate || instrument.scheduledDate)
      : (instrument.scheduledDate || instrument.executedDate);
  }

  function allocatedInstrumentFlowRows(state, instrument) {
    const idx = indexes(state);
    return state.orderInstruments
      .filter((oi) => oi.instrumentId === instrument.id && !oi.voidedAt && state.orders.some((order) => order.id === oi.orderId && !order.voidedAt))
      .flatMap((oi) => state.orderDocumentSettlements
        .filter((settlement) => settlement.orderInstrumentId === oi.id && !settlement.voidedAt)
        .map((settlement) => {
          const od = idx.orderDocuments.get(settlement.orderDocumentId);
          const order = idx.orders.get(oi.orderId);
          const doc = od ? idx.documents.get(od.documentId) : null;
          if (!od || od.voidedAt || !order || order.voidedAt || !doc || doc.voidedAt) return null;
          const direction = documentDirection(doc, state);
          return {
            id: `${instrument.id}:${settlement.id}`,
            date: instrumentFlowDate(instrument),
            direction,
            userStatus: userFlowState({ direction, realized: instrumentIsBankRealized(instrument) }),
            detail: instrumentIsBankRealized(instrument) ? 'hecho confirmado' : instrumentLabel(instrument),
            activity: doc.activity,
            chartAccountId: doc.chartAccountId,
            chartPath: chartPath(state, doc.chartAccountId),
            entityId: doc.entityId,
            entityName: entityName(state, doc.entityId),
            orderId: order.id,
            instrumentId: instrument.id,
            documentId: doc.id,
            concept: `${doc.number} - ${doc.description}`,
            amount: signed(direction, settlementInstrumentAmount(settlement)),
            currency: settlement.instrumentCurrency || settlement.currency,
            commercialAmount: settlement.amount,
            commercialCurrency: settlement.currency,
            exchangeRate: settlement.exchangeRate || null,
            cereal: doc.cereal || '',
            campaign: doc.campaign || '',
            realized: instrumentIsBankRealized(instrument),
            estimated: false,
            source: 'instrument'
          };
        })
        .filter(Boolean));
  }

  function unallocatedInstrumentFlowRow(state, instrument) {
    const taxPayment = instrument.type === 'vep' ? (state.taxPayments || []).find((item) => item.instrumentId === instrument.id) : null;
    return {
      id: instrument.id,
      date: instrumentFlowDate(instrument),
      direction: instrument.direction,
      userStatus: userFlowState({ direction: instrument.direction, realized: instrumentIsBankRealized(instrument) }),
      detail: instrumentIsBankRealized(instrument) ? 'hecho confirmado' : instrumentLabel(instrument),
      activity: '',
      chartAccountId: '',
      chartPath: '',
      entityId: instrument.entityId,
      entityName: entityName(state, instrument.entityId),
      orderId: '',
      instrumentId: instrument.id,
      documentId: '',
      concept: taxPayment ? (taxPayment.concept || taxPaymentSuggestedConcept(state, (taxPayment.allocations || []).map((item) => item.withholdingId)) || instrument.reference) : instrument.reference,
      amount: signed(instrument.direction, instrument.amount),
      currency: instrument.currency,
      realized: instrumentIsBankRealized(instrument),
      estimated: false,
      source: 'instrument'
    };
  }

  function instrumentLabel(instrument) {
    if (instrument.type === 'own_check') return `${instrument.status === 'issued' ? 'cheque emitido' : 'cheque entregado'} ${instrument.scheduledDate}`;
    if (instrument.type === 'received_check') return `cheque recibido ${instrument.scheduledDate}`;
    if (instrument.type === 'compensation') return `compensacion ${instrument.scheduledDate}`;
    if (instrument.type === 'transfer') return `transferencia programada ${instrument.scheduledDate}`;
    return `${instrument.type} pendiente`;
  }

  function grainLocationName(state, id) {
    return (state.grainLocations || []).find((location) => location.id === id)?.name || id || '';
  }

  function grainLocationTypeLabel(value) {
    return GRAIN_LOCATION_LABELS[value] || value || '';
  }

  function grainSignedKg(movement) {
    return movement.direction === 'in' ? Number(movement.kg || 0) : -Number(movement.kg || 0);
  }

  function grainStockRows(state, filters) {
    const f = filters || {};
    const map = new Map();
    (state.grainMovements || [])
      .filter((movement) => !f.cereal || movement.cereal === f.cereal)
      .filter((movement) => !f.campaign || movement.campaign === f.campaign)
      .filter((movement) => !f.locationId || movement.locationId === f.locationId)
      .forEach((movement) => {
        const location = (state.grainLocations || []).find((item) => item.id === movement.locationId) || {};
        const key = `${movement.cereal}|${movement.campaign}|${movement.locationId}`;
        if (!map.has(key)) {
          map.set(key, {
            cereal: movement.cereal,
            campaign: movement.campaign,
            locationId: movement.locationId,
            locationName: grainLocationName(state, movement.locationId),
            locationType: location.type || '',
            locationTypeLabel: grainLocationTypeLabel(location.type),
            kgIn: 0,
            kgOut: 0,
            balanceKg: 0
          });
        }
        const row = map.get(key);
        if (movement.direction === 'in') row.kgIn += Number(movement.kg || 0);
        else row.kgOut += Number(movement.kg || 0);
        row.balanceKg += grainSignedKg(movement);
      });
    return Array.from(map.values()).sort((a, b) => `${a.cereal}-${a.campaign}-${a.locationName}`.localeCompare(`${b.cereal}-${b.campaign}-${b.locationName}`));
  }

  function grainStockAt(state, filters) {
    return grainStockRows(state, filters).reduce((total, row) => total + row.balanceKg, 0);
  }

  function latestGrainReferencePrice(state, filters) {
    const f = filters || {};
    return (state.grainReferencePrices || [])
      .filter((price) => !f.cereal || price.cereal === f.cereal)
      .filter((price) => !f.campaign || price.campaign === f.campaign)
      .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`))[0] || null;
  }

  function grainForwardLiquidatedKg(state, forwardId) {
    return (state.grainLiquidations || [])
      .filter((liquidation) => !forwardId || liquidation.forwardId === forwardId)
      .reduce((total, liquidation) => total + Number(liquidation.kg || 0), 0);
  }

  function grainForwardPendingKg(state, forwardId) {
    const forward = (state.grainForwards || []).find((item) => item.id === forwardId);
    if (!forward || forward.status === 'voided' || forward.status === 'cancelled') return 0;
    return Math.max(Number(forward.contractedKg || 0) - grainForwardLiquidatedKg(state, forwardId), 0);
  }

  function grainStockSummary(state, filters) {
    const f = filters || {};
    const rows = grainStockRows(state, f);
    const totalKg = rows.reduce((total, row) => total + row.balanceKg, 0);
    const fieldKg = rows.filter((row) => row.locationType === 'field').reduce((total, row) => total + row.balanceKg, 0);
    const elevatorKg = rows.filter((row) => row.locationType === 'elevator').reduce((total, row) => total + row.balanceKg, 0);
    const storageKg = rows.filter((row) => row.locationType === 'storage').reduce((total, row) => total + row.balanceKg, 0);
    const pendingForwardKg = (state.grainForwards || [])
      .filter((forward) => !f.cereal || forward.cereal === f.cereal)
      .filter((forward) => !f.campaign || forward.campaign === f.campaign)
      .reduce((total, forward) => total + grainForwardPendingKg(state, forward.id), 0);
    const referencePrice = latestGrainReferencePrice(state, f);
    const priceUnitDivisor = referencePrice?.unit === 'kg' ? 1 : 1000;
    const estimatedValuation = referencePrice ? (totalKg / priceUnitDivisor) * Number(referencePrice.price || 0) : 0;
    return { totalKg, fieldKg, elevatorKg, storageKg, pendingForwardKg, referencePrice, estimatedValuation, valuationCurrency: referencePrice?.currency || '', rows };
  }

  function grainLocationHistory(state, filters) {
    const f = filters || {};
    let balanceKg = 0;
    return (state.grainMovements || [])
      .filter((movement) => !f.cereal || movement.cereal === f.cereal)
      .filter((movement) => !f.campaign || movement.campaign === f.campaign)
      .filter((movement) => !f.locationId || movement.locationId === f.locationId)
      .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`))
      .map((movement) => {
        const kgIn = movement.direction === 'in' ? Number(movement.kg || 0) : 0;
        const kgOut = movement.direction === 'out' ? Number(movement.kg || 0) : 0;
        balanceKg += kgIn - kgOut;
        return {
          ...movement,
          locationName: grainLocationName(state, movement.locationId),
          kgIn,
          kgOut,
          balanceKg,
          referenceLabel: grainReferenceLabel(state, movement)
        };
      });
  }

  function grainReferenceLabel(state, movement) {
    if (movement.referenceType === 'document') {
      const doc = state.documents.find((item) => item.id === movement.referenceId);
      return doc ? doc.number : movement.referenceId;
    }
    if (movement.referenceType === 'grain_transfer') return movement.referenceId;
    if (movement.referenceType === 'grain_forward') return movement.referenceId;
    return movement.referenceId || movement.description || '';
  }

  function agriculturalProjectionErrors(item) {
    const errors = [];
    if (!String(item.id || '').trim()) errors.push('Proyeccion sin ID');
    if (!String(item.campaign || '').trim()) errors.push('Campana requerida');
    if (!GRAIN_TYPES.includes(item.crop)) errors.push('Cultivo invalido');
    if (!CURRENCIES.includes(item.currency)) errors.push('Moneda invalida');
    if (!Number.isFinite(item.amount) || item.amount <= 0 || Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 0.0001) errors.push('Importe positivo con hasta dos decimales requerido');
    if (!String(item.concept || '').trim()) errors.push('Concepto requerido');
    if (item.activity !== 'Agricultura') errors.push('Actividad de proyeccion debe ser Agricultura');
    if (!['estimated', 'replaced', 'voided'].includes(item.status)) errors.push('Estado de proyeccion invalido');
    if (!['day', 'month'].includes(item.datePrecision)) errors.push('Precision de fecha invalida');
    const date = new Date(`${item.plannedDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.plannedDate || '') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.plannedDate || (item.datePrecision === 'month' && !item.plannedDate.endsWith('-01'))) errors.push('Fecha o mes previsto invalido');
    if (item.status === 'replaced' && !['forward', 'liquidation', 'sale'].includes(item.replacementCircuit)) errors.push('Circuito de reemplazo invalido');
    return errors;
  }

  function changeAgriculturalIncomeProjection(state, id, payload, action, user) {
    const draft = clone(state);
    draft.agriculturalIncomeProjections ||= [];
    const existing = draft.agriculturalIncomeProjections.find((item) => item.id === id);
    if (action === 'create' && existing) throw new Error('ID de proyeccion duplicado');
    if (action !== 'create' && (!existing || existing.status !== 'estimated')) throw new Error('La proyeccion no existe o ya no esta estimada');
    const editable = ['campaign', 'crop', 'plannedDate', 'datePrecision', 'currency', 'amount', 'concept', 'notes'];
    const allowed = action === 'create' ? [...editable, 'id'] : action === 'update' ? editable : action === 'replace' ? ['replacementCircuit'] : [];
    if (Object.keys(payload || {}).some((key) => !allowed.includes(key))) throw new Error('Campo de proyeccion no editable');
    const before = existing ? clone(existing) : null;
    const now = new Date().toISOString();
    const item = existing || { id: id || uid('AIP'), activity: 'Agricultura', status: 'estimated', datePrecision: 'day', notes: '', createdAt: now };
    if (action === 'create' || action === 'update') {
      editable.forEach((field) => {
        if (payload[field] !== undefined) item[field] = field === 'amount' ? Number(payload[field]) : String(payload[field]).trim();
      });
    } else if (action === 'replace') {
      item.status = 'replaced'; item.replacementCircuit = payload.replacementCircuit; item.replacedAt = now;
    } else {
      item.status = 'voided'; item.voidedAt = now;
    }
    item.updatedAt = now;
    const itemErrors = agriculturalProjectionErrors(item);
    if (itemErrors.length) throw new Error(itemErrors.join('; '));
    if (!existing) draft.agriculturalIncomeProjections.push(item);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'agriculturalIncomeProjection', entityId: item.id, action: `${action}-agricultural-income-projection`, changes: Object.keys(item).filter((field) => JSON.stringify(before?.[field]) !== JSON.stringify(item[field])).map((field) => ({ field, from: before?.[field] ?? null, to: item[field] })), createdAt: now, user: user || 'local', reason: action === 'replace' ? 'Reemplazo explicito por circuito de ingreso real' : action === 'delete' ? 'Eliminacion de estimacion presupuestaria' : 'Proyeccion presupuestaria de cosecha' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createAgriculturalIncomeProjectionTransaction(state, payload, user) {
    return changeAgriculturalIncomeProjection(state, payload?.id, payload || {}, 'create', user);
  }

  function updateAgriculturalIncomeProjectionTransaction(state, id, changes, user) {
    return changeAgriculturalIncomeProjection(state, id, changes || {}, 'update', user);
  }

  function deleteAgriculturalIncomeProjectionTransaction(state, id, user) {
    return changeAgriculturalIncomeProjection(state, id, {}, 'delete', user);
  }

  function replaceAgriculturalIncomeProjectionTransaction(state, id, payload, user) {
    return changeAgriculturalIncomeProjection(state, id, payload || {}, 'replace', user);
  }

  function grainForwardEstimatedFlowRows(state, options) {
    const rows = [];
    (state.grainForwards || []).forEach((forward) => {
      if (['voided', 'cancelled'].includes(forward.status)) return;
      const pendingKg = grainForwardPendingKg(state, forward.id);
      if (pendingKg <= 0.001) return;
      const estimatedContractAmount = Number(forward.estimatedAmount || 0);
      const amount = estimatedContractAmount > 0 && Number(forward.contractedKg || 0) > 0
        ? estimatedContractAmount * (pendingKg / Number(forward.contractedKg || 0))
        : (pendingKg / 1000) * Number(forward.price || 0);
      const baseRow = {
        id: `FWD-${forward.id}`,
        date: forward.plannedLiquidationDate || forward.plannedDeliveryDate,
        direction: 'in',
        userStatus: 'Estimado',
        detail: 'FWD pendiente de liquidacion',
        activity: 'Agricultura',
        chartAccountId: forward.chartAccountId || 'CA-AGRI',
        chartPath: chartPath(state, forward.chartAccountId || 'CA-AGRI'),
        entityId: forward.buyerEntityId,
        entityName: entityName(state, forward.buyerEntityId),
        orderId: '',
        instrumentId: '',
        documentId: '',
        forwardId: forward.id,
        reference: forward.reference || '',
        concept: forward.description || `${forward.cereal} ${forward.campaign} FWD ${pendingKg} kg`,
        amount,
        currency: forward.currency,
        realized: false,
        estimated: true,
        source: 'grain-forward'
      };
      rows.push(baseRow);
    });
    return rows.filter((row) => !options?.currency || row.currency === options.currency);
  }

  // Estimated ARS per USD for a month: the month's own rate, else the latest earlier one, else the earliest later one.
  function fxRateForMonth(state, monthKey) {
    const rates = (state.fxEstimates || []).filter((item) => Number(item.rate) > 0).sort((a, b) => a.month.localeCompare(b.month));
    if (!rates.length) return null;
    const exact = rates.find((item) => item.month === monthKey);
    if (exact) return Number(exact.rate);
    const earlier = rates.filter((item) => item.month < monthKey).at(-1);
    return Number((earlier || rates[0]).rate);
  }

  // Display-only conversion: USD rows are expressed in ARS with the month's estimated rate. Stored amounts never change.
  function consolidatedArsFlowRows(state, options) {
    return filterFlowRows(state, { ...options, currency: '' }).flatMap((row) => {
      if (row.currency === 'ARS') return [row];
      if (row.currency !== 'USD') return [];
      const rate = fxRateForMonth(state, String(row.date || '').slice(0, 7));
      if (!rate) return [];
      return [{ ...row, currency: 'ARS', amount: Math.round(row.amount * rate * 100) / 100, originalCurrency: 'USD', originalAmount: row.amount, fxRate: rate }];
    });
  }

  function monthlyFlow(state, options) {
    const horizon = options?.horizon || 12;
    const consolidated = options?.currency === 'ARS_TOTAL';
    const currency = consolidated ? 'ARS' : options?.currency || 'ARS';
    const activity = options?.activity || '';
    const status = options?.status || '';
    const selectedFrom = options?.exercise ? exerciseBounds(options.exercise).dateFrom : options?.from || todayIso();
    const start = new Date(`${selectedFrom}T00:00:00Z`);
    start.setUTCDate(1);
    const startKey = start.toISOString().slice(0, 10);
    const openingAsOf = addDays(startKey, -1);
    const openingRate = consolidated ? fxRateForMonth(state, openingAsOf.slice(0, 7)) || 0 : 1;
    const baseBalance = accountBalancesAsOf(state, openingAsOf)
      .filter((account) => (consolidated ? ['ARS', 'USD'].includes(account.currency) : account.currency === currency) && (!options?.financialAccountId || account.id === options.financialAccountId))
      .reduce((total, account) => total + account.realBalance * (consolidated && account.currency === 'USD' ? openingRate : 1), 0);
    const filteredRows = consolidated ? consolidatedArsFlowRows(state, { ...options, activity, status }) : filterFlowRows(state, { ...options, currency, activity, status });
    let accumulated = baseBalance;
    return Array.from({ length: horizon }, (_, i) => {
      const month = new Date(start);
      month.setUTCMonth(start.getUTCMonth() + i);
      const key = month.toISOString().slice(0, 7);
      const monthRows = filteredRows.filter((row) => row.date?.slice(0, 7) === key);
      const incomes = sum(monthRows.filter((row) => row.amount > 0));
      const expenses = Math.abs(sum(monthRows.filter((row) => row.amount < 0)));
      const paid = Math.abs(sum(monthRows.filter((row) => row.direction === 'out' && row.userStatus === 'Pagado')));
      const collected = sum(monthRows.filter((row) => row.direction === 'in' && row.userStatus === 'Cobrado'));
      const pendingIn = sum(monthRows.filter((row) => row.direction === 'in' && row.userStatus === 'Pendiente'));
      const pendingOut = Math.abs(sum(monthRows.filter((row) => row.direction === 'out' && row.userStatus === 'Pendiente')));
      const estimatedIn = sum(monthRows.filter((row) => row.direction === 'in' && row.userStatus === 'Estimado'));
      const estimatedOut = Math.abs(sum(monthRows.filter((row) => row.direction === 'out' && row.userStatus === 'Estimado')));
      const net = incomes - expenses;
      const openingBalance = accumulated;
      accumulated += net;
      return { month: key, openingBalance, incomes, expenses, net, accumulated, paid, collected, pendingIn, pendingOut, estimatedIn, estimatedOut, rows: monthRows };
    });
  }

  function monthlyHierarchy(state, options) {
    return monthlyFlow(state, options).map((month) => {
      const groups = {};
      month.rows.forEach((row) => {
        const direction = row.direction === 'in' ? 'Ingresos' : 'Egresos';
        groups[direction] ||= { total: 0, children: {} };
        groups[direction].total += Math.abs(row.amount);
        const activity = row.activity || 'Sin actividad';
        groups[direction].children[activity] ||= { total: 0, children: {} };
        groups[direction].children[activity].total += Math.abs(row.amount);
        const account = row.chartPath || 'Sin cuenta';
        groups[direction].children[activity].children[account] ||= { total: 0, children: {} };
        groups[direction].children[activity].children[account].total += Math.abs(row.amount);
        const entity = row.entityName || 'Sin contraparte';
        groups[direction].children[activity].children[account].children[entity] ||= { total: 0, rows: [] };
        groups[direction].children[activity].children[account].children[entity].total += Math.abs(row.amount);
        groups[direction].children[activity].children[account].children[entity].rows.push(row);
      });
      return { ...month, groups };
    });
  }

  function statusMatches(row, status) {
    if (!status) return true;
    if (status === 'settled') return row.userStatus === 'Pagado' || row.userStatus === 'Cobrado';
    return row.userStatus === status;
  }

  function chartIncludes(state, rowChartId, selectedChartId) {
    if (!selectedChartId) return true;
    if (rowChartId === selectedChartId) return true;
    const selectedPath = chartPath(state, selectedChartId);
    const rowPath = chartPath(state, rowChartId);
    return rowPath.startsWith(`${selectedPath} > `);
  }

  function filterFlowRows(state, filters) {
    const f = filters || {};
    return flowRows(state, { asOfDate: f.asOfDate, reading: f.reading })
      .filter((row) => !f.currency || row.currency === f.currency)
      .filter((row) => statusMatches(row, f.status))
      .filter((row) => !f.activity || row.activity === f.activity)
      .filter((row) => !f.chartAccountId || chartIncludes(state, row.chartAccountId, f.chartAccountId))
      .filter((row) => !f.entityId || row.entityId === f.entityId)
      .filter((row) => !f.direction || row.direction === f.direction)
      .filter((row) => !f.sourceId || row.id === f.sourceId)
      .filter((row) => !f.dateFrom || row.date >= f.dateFrom)
      .filter((row) => !f.dateTo || row.date <= f.dateTo);
  }

  function flowTotals(rows) {
    const incomes = rows.filter((row) => row.amount > 0).reduce((total, row) => total + row.amount, 0);
    const expenses = Math.abs(rows.filter((row) => row.amount < 0).reduce((total, row) => total + row.amount, 0));
    return { incomes, expenses, net: incomes - expenses };
  }

  function isOpenFlowRow(row) {
    return row.userStatus === 'Pendiente' || row.userStatus === 'Estimado';
  }

  function openFlowRows(state, filters) {
    return filterFlowRows(state, filters).filter(isOpenFlowRow);
  }

  function flowDrilldownRows(state, filters) {
    return filterFlowRows(state, filters || {});
  }

  function dateRangeForPeriod(options) {
    if (options?.mode === 'exercise' || options?.exercise) return exerciseBounds(options.exercise);
    if (options?.mode === 'calendar' || options?.year) return calendarYearBounds(options.year);
    return { dateFrom: options?.dateFrom || '', dateTo: options?.dateTo || '' };
  }

  function monthKeysBetween(dateFrom, dateTo) {
    const start = new Date(`${dateFrom}T00:00:00Z`);
    start.setUTCDate(1);
    const end = new Date(`${dateTo}T00:00:00Z`);
    end.setUTCDate(1);
    const months = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      months.push(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return months;
  }

  function fiscalDocuments(state, filters) {
    const f = filters || {};
    const range = dateRangeForPeriod(f);
    return state.documents
      .filter((doc) => !doc.voidedAt)
      .filter((doc) => !f.currency || doc.currency === f.currency)
      .filter((doc) => !f.activity || doc.activity === f.activity)
      .filter((doc) => !f.reading || readingMatches(doc, f.reading))
      .filter((doc) => !range.dateFrom || (doc.issueDate || doc.recordDate || '') >= range.dateFrom)
      .filter((doc) => !range.dateTo || (doc.issueDate || doc.recordDate || '') <= range.dateTo);
  }

  function economicPeriod(filters) {
    const range = dateRangeForPeriod(filters);
    return {
      dateFrom: [range.dateFrom, filters?.dateFrom].filter(Boolean).sort().at(-1) || '',
      dateTo: [range.dateTo, filters?.dateTo, filters?.asOfDate].filter(Boolean).sort()[0] || ''
    };
  }

  function economicDocumentRows(state, filters, warnings = []) {
    const range = economicPeriod(filters);
    return fiscalDocuments(state, { ...filters, ...range, exercise: '', year: '', mode: 'custom' }).flatMap((doc) => {
      if (doc.economicTreatment === 'liability_only') return [];
      const direction = documentDirection(doc, state);
      let amount = economicAmountForDocument(doc);
      const liquidations = (state.grainLiquidations || []).filter((item) => item.documentId === doc.id);
      const isGrain = Boolean(doc.grainLiquidationId || liquidations.length);
      const components = doc.taxComponents || [];
      const bases = components.filter((item) => ['net_taxed', 'exempt', 'not_taxed'].includes(item.taxType || item.type));
      if (isGrain && bases.length) amount = bases.reduce((sum, item) => sum + taxComponentAmount(item), 0);
      if (isGrain && !bases.length) warnings.push(`${doc.number || doc.id}: sin desglose fiscal suficiente; se conserva el importe económico registrado.`);
      const explicitSide = doc.commercialSide || doc.side || doc.appliesToSide;
      const creditNote = doc.type === 'credit_note' && !doc.commercialSideOverride;
      const knownSide = ['supplier', 'purchase', 'payable', 'out', 'customer', 'sale', 'receivable', 'in'].includes(explicitSide);
      if (creditNote && !knownSide) warnings.push(`${doc.number || doc.id}: nota de crédito sin lado explícito; interpretación histórica conservada.`);
      const purchaseCredit = creditNote && knownSide && noteCommercialSide(state, doc) === 'purchase';
      const saleCredit = creditNote && knownSide && noteCommercialSide(state, doc) === 'sale';
      const row = {
        id: doc.id,
        date: doc.issueDate || doc.recordDate,
        documentId: doc.id,
        entityId: doc.entityId,
        entityName: entityName(state, doc.entityId),
        activity: doc.activity,
        chartAccountId: doc.chartAccountId,
        chartPath: chartPath(state, doc.chartAccountId),
        reading: documentReading(doc),
        direction,
        income: purchaseCredit ? 0 : saleCredit ? -amount : direction === 'in' ? amount : 0,
        expense: saleCredit ? 0 : purchaseCredit ? -amount : direction === 'out' ? amount : 0,
        amount: signed(direction, amount),
        currency: doc.currency,
        description: `${doc.number} - ${doc.description}`
      };
      if (!isGrain && doc.livestockTradeId) {
        // Livestock: consignee charges are deducted on a sale and added on a purchase; either way they are an expense of the trade.
        const purchase = direction === 'out';
        const chargeTypes = ['commission', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee'];
        const extra = components.filter((item) => chargeTypes.includes(item.taxType || item.type) && taxComponentAmount(item) > 0
          && (purchase ? item.effect === 'add' : item.effect !== 'add'))
          .map((item, index) => ({ ...row, id: `${doc.id}-livestock-cost-${index}`, source: 'livestock-commercial-cost', chartAccountId: '',
            chartPath: purchase ? 'Gastos de compra de hacienda' : 'Gastos de comercialización', direction: 'out', income: 0,
            expense: taxComponentAmount(item), amount: -taxComponentAmount(item), description: `${doc.number || doc.id} - ${labelForTaxType(item.taxType || item.type)}` }));
        return [row, ...extra];
      }
      if (!isGrain) return [row];
      if (liquidations.length !== 1 || (doc.grainLiquidationId && liquidations[0].id !== doc.grainLiquidationId)) {
        warnings.push(`${doc.number || doc.id}: vínculo de liquidación ambiguo; gastos adicionales pendientes de revisión.`);
        return [row];
      }
      // Tax components are authoritative; scalar fields are only a legacy fallback.
      const costs = ['commission', 'admin_expense', 'stamp_tax', 'laboratory_fee', 'guide_fee', 'senasa_fee', 'control_delivery', 'bath_fee'];
      const fields = ['commissions', 'adminExpenses', 'stampTax', 'laboratoryFees', 'guides', 'senasa', 'controlDelivery', 'bath'];
      const costComponents = costs.flatMap((type, index) => {
        const stored = components.filter((item) => (item.taxType || item.type) === type);
        return stored.length ? stored : Number(liquidations[0][fields[index]] || 0) > 0
          ? [{ taxType: type, amount: Number(liquidations[0][fields[index]]), effect: 'subtract' }] : [];
      });
      const additional = [];
      costComponents.forEach((component, index) => {
        const cost = taxComponentAmount(component);
        if (!cost) return;
        // Stamp tax only counts when the liquidation explicitly deducts it; a bare stamp_tax component is ambiguous.
        if (!bases.length || cost < 0 || (component.effect && component.effect !== 'subtract') || ((component.taxType || component.type) === 'stamp_tax' && component.effect !== 'subtract')) {
          warnings.push(`${doc.number || doc.id}: gasto ${component.taxType} sin base o sentido inequívoco; no se agrega automáticamente.`);
          return;
        }
        if (component.relatedId) {
          const related = state.documents.find((item) => item.id === component.relatedId && !item.voidedAt);
          const linkedCost = costComponents.filter((item) => item.relatedId === component.relatedId).reduce((sum, item) => sum + taxComponentAmount(item), 0);
          if (!related || related.id === doc.id || related.entityId !== doc.entityId || related.currency !== doc.currency || documentDirection(related, state) !== 'out' || Math.abs(economicAmountForDocument(related) - linkedCost) > 0.005) {
            warnings.push(`${doc.number || doc.id}: vínculo de gasto ${component.relatedId} no conciliable; no se agrega para evitar duplicación.`);
          }
          // A linked independent document supplies its own economic row and date.
          return;
        }
        additional.push({ ...row, id: `${doc.id}-economic-cost-${index}`, source: 'grain-commercial-cost',
          chartAccountId: '', chartPath: 'Gastos de comercialización', direction: 'out', income: 0, expense: cost, amount: -cost,
          description: `${doc.number || doc.id} - ${labelForTaxType(component.taxType || component.type)}` });
      });
      if (additional.length) warnings.push(`${doc.number || doc.id}: gastos incluidos desde la liquidación; sin vínculo explícito no se puede descartar un comprobante independiente duplicado.`);
      return [row, ...additional];
    });
  }

  function economicSummary(state, filters) {
    const warnings = [];
    const range = economicPeriod(filters);
    const rows = economicDocumentRows(state, filters, warnings);
    // Bank charges are expenses whether generated automatically or loaded by hand.
    (state.bankCharges || []).filter((charge) => charge.status === 'executed' && !charge.voidedAt)
      .filter((charge) => !filters?.currency || charge.currency === filters.currency)
      .filter((charge) => !filters?.activity || charge.activity === filters.activity)
      .filter((charge) => !filters?.reading || readingMatches(charge, filters.reading))
      .filter((charge) => !range.dateFrom || charge.date >= range.dateFrom)
      .filter((charge) => !range.dateTo || charge.date <= range.dateTo)
      .forEach((charge) => {
        const activity = charge.activity || 'Sin actividad informada';
        if (!charge.activity) warnings.push(`${charge.id}: cargo bancario sin actividad informada; incluido sólo en el total sin asignación productiva.`);
        rows.push({ id: charge.id, date: charge.date, documentId: '', entityId: '', entityName: '', activity, chartAccountId: charge.chartAccountId || '', chartPath: charge.chartAccountId ? chartPath(state, charge.chartAccountId) : '', reading: documentReading(charge), direction: 'out', income: 0, expense: Number(charge.amount), amount: -Number(charge.amount), currency: charge.currency, description: charge.description });
      });
    const byActivity = [...new Set([...ACTIVITIES, ...rows.map((row) => row.activity)])].map((activity) => {
      const activityRows = rows.filter((row) => row.activity === activity);
      const income = activityRows.reduce((total, row) => total + row.income, 0);
      const expense = activityRows.reduce((total, row) => total + row.expense, 0);
      return { activity, income, expense, result: income - expense, rows: activityRows };
    });
    const income = rows.reduce((total, row) => total + row.income, 0);
    const expense = rows.reduce((total, row) => total + row.expense, 0);
    const legacyRows = rows.filter((row) => row.reading === 'pending_receipt');
    const legacyIncome = legacyRows.reduce((sum, row) => sum + row.income, 0);
    const legacyExpense = legacyRows.reduce((sum, row) => sum + row.expense, 0);
    return { income, expense, result: income - expense, byActivity, rows, range, warnings: [...new Set(warnings)],
      legacyUnclassified: { count: new Set(legacyRows.map((row) => row.documentId || row.id)).size, income: legacyIncome, expense: legacyExpense, result: legacyIncome - legacyExpense } };
  }

  function taxRows(state, filters) {
    const f = filters || {};
    const range = dateRangeForPeriod(f);
    const rows = [];
    fiscalDocuments(state, f).forEach((doc) => {
      (doc.taxComponents || []).forEach((component) => {
        const taxType = component.taxType || component.type || 'other';
        if (['net_taxed', 'exempt', 'not_taxed'].includes(taxType)) return;
        if (f.taxType && taxType !== f.taxType) return;
        rows.push({
          id: component.id || `${doc.id}-${taxType}`,
          source: 'document',
          date: doc.issueDate,
          documentId: doc.id,
          documentType: doc.type,
          commercialSide: noteCommercialSide(state, doc),
          entityId: doc.entityId,
          entityName: entityName(state, doc.entityId),
          activity: doc.activity,
          chartAccountId: doc.chartAccountId,
          taxType,
          label: labelForTaxType(taxType),
          amount: taxComponentAmount(component),
          direction: component.direction || documentDirection(doc, state),
          status: component.status || 'registered',
          currency: doc.currency,
          reading: documentReading(doc),
          description: `${doc.number} - ${doc.description}`
        });
      });
    });
    (state.taxReimbursements || []).forEach((item) => {
      if (f.currency && item.currency !== f.currency) return;
      if (f.activity && item.activity !== f.activity) return;
      if (f.taxType && item.taxType !== f.taxType) return;
      if (range.dateFrom && item.date < range.dateFrom) return;
      if (range.dateTo && item.date > range.dateTo) return;
      rows.push({
        id: item.id,
        source: 'taxReimbursement',
        date: item.date,
        documentId: item.documentId || '',
        entityId: item.entityId || '',
        entityName: entityName(state, item.entityId),
        activity: item.activity || '',
        chartAccountId: item.chartAccountId || '',
        taxType: item.taxType || 'reimbursement_vat',
        label: labelForTaxType(item.taxType || 'reimbursement_vat'),
        amount: Number(item.amount || 0),
        direction: 'in',
        status: item.status || 'pending',
        currency: item.currency,
        reading: 'documented',
        description: item.description || 'Reintegro'
      });
    });
    (state.orderTaxWithholdings || []).filter((item) => !item.voidedAt).forEach((item) => {
      const order = state.orders.find((candidate) => candidate.id === item.orderId);
      if (f.currency && item.currency !== f.currency) return;
      if (f.taxType && item.taxType !== f.taxType) return;
      if (range.dateFrom && item.date < range.dateFrom) return;
      if (range.dateTo && item.date > range.dateTo) return;
      rows.push({ id: item.id, source: 'orderTaxWithholding', date: item.date, documentId: state.orderDocuments.find((link) => link.id === item.orderDocumentId)?.documentId || '', entityId: order?.entityId || '', entityName: entityName(state, order?.entityId), activity: order?.activity || '', chartAccountId: '', taxType: item.taxType, label: labelForTaxType(item.taxType), amount: Number(item.amount || 0), direction: 'out', status: 'withheld', currency: item.currency, reading: 'documented', description: item.reference || order?.description || 'Retencion sufrida' });
    });
    (state.orderPracticedWithholdings || []).filter((item) => !item.voidedAt).forEach((item) => {
      const order = state.orders.find((candidate) => candidate.id === item.orderId);
      if (f.currency && item.currency !== f.currency) return;
      if (f.taxType && item.taxType !== f.taxType) return;
      if (range.dateFrom && item.date < range.dateFrom) return;
      if (range.dateTo && item.date > range.dateTo) return;
      rows.push({ id: item.id, source: 'orderPracticedWithholding', date: item.date, documentId: state.orderDocuments.find((link) => link.id === item.orderDocumentId)?.documentId || '', entityId: order?.entityId || '', entityName: entityName(state, order?.entityId), activity: order?.activity || '', chartAccountId: '', taxType: item.taxType, label: labelForTaxType(item.taxType), amount: Number(item.amount || 0), direction: 'out', status: practicedWithholdingBalance(state, item.id) > 0.01 ? 'pending' : 'paid', currency: item.currency, reading: 'documented', description: `Retencion practicada · ${item.reference || order?.description || ''}` });
    });
    (state.taxPayments || []).forEach((item) => {
      const instrument = state.instruments.find((candidate) => candidate.id === item.instrumentId);
      if (f.currency && item.currency !== f.currency) return;
      if (range.dateFrom && item.date < range.dateFrom) return;
      if (range.dateTo && item.date > range.dateTo) return;
      rows.push({ id: item.id, source: 'taxPayment', date: item.date, documentId: '', instrumentId: item.instrumentId, entityId: item.entityId, entityName: entityName(state, item.entityId), activity: '', chartAccountId: '', taxType: 'tax_payment', label: 'VEP de retenciones practicadas', amount: Number(instrument?.amount || 0), direction: 'out', status: 'paid', currency: item.currency, reading: 'documented', description: item.concept || taxPaymentSuggestedConcept(state, (item.allocations || []).map((allocation) => allocation.withholdingId)) || item.reference || 'VEP' });
    });
    (state.bankCharges || []).forEach((charge) => {
      if (f.currency && charge.currency !== f.currency) return;
      if (f.taxType && charge.taxType !== f.taxType) return;
      if (range.dateFrom && charge.date < range.dateFrom) return;
      if (range.dateTo && charge.date > range.dateTo) return;
      rows.push({
        id: charge.id,
        source: 'bankCharge',
        instrumentId: charge.instrumentId,
        date: charge.date,
        documentId: '',
        entityId: charge.entityId || '',
        entityName: entityName(state, charge.entityId),
        activity: charge.activity || '',
        chartAccountId: charge.chartAccountId || '',
        taxType: charge.taxType || 'bank_debit_credit_tax',
        label: charge.bankSide === 'debit' ? 'Impuesto al debito bancario' : charge.bankSide === 'credit' ? 'Impuesto al credito bancario' : labelForTaxType(charge.taxType || 'bank_debit_credit_tax'),
        amount: Number(charge.amount || 0),
        direction: 'out',
        status: charge.status || 'executed',
        currency: charge.currency,
        reading: 'documented',
        description: charge.description || 'Cargo bancario'
      });
    });

    return rows.sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));
  }

  function taxTotals(state, filters) {
    const rows = taxRows(state, filters);
    const totals = {
      vatDebit: 0,
      vatCredit: 0,
      vatWithholdings: 0,
      vatPerceptions: 0,
      vatReimbursements: 0,
      bankDebitCreditTax: 0,
      practicedPending: 0,
      practicedPaid: 0,
      incomeTaxWithholdings: 0,
      iibbWithholdings: 0,
      other: 0,
      vatDifference: 0,
      technicalVatBalance: 0,
      rows
    };
    rows.forEach((row) => {
      if (row.source === 'orderPracticedWithholding') {
        const balance = practicedWithholdingBalance(state, row.id);
        totals.practicedPending += balance;
        totals.practicedPaid += row.amount - balance;
        return;
      }
      if (row.source === 'taxPayment') return;
      if (row.taxType === 'vat') {
        const saleSide = row.commercialSide === 'sale';
        const purchaseSide = row.commercialSide === 'purchase';
        const creditNote = row.documentType === 'credit_note';
        const signValue = creditNote ? -row.amount : row.amount;
        if (saleSide) totals.vatDebit += signValue;
        else if (purchaseSide) totals.vatCredit += signValue;
        else if (row.direction === 'in') totals.vatDebit += row.amount;
        else totals.vatCredit += row.amount;
      }
      else if (row.taxType === 'commission_vat') totals.vatCredit += row.amount; // VAT invoiced on a commission is always Sagro's tax credit.
      else if (row.taxType === 'withholding_vat') totals.vatWithholdings += row.amount;
      else if (row.taxType === 'perception_vat') totals.vatPerceptions += row.amount;
      else if (row.taxType === 'reimbursement_vat') totals.vatReimbursements += row.amount;
      else if (row.taxType === 'bank_debit_credit_tax') totals.bankDebitCreditTax += row.amount;
      else if (row.taxType === 'withholding_income_tax') totals.incomeTaxWithholdings += row.amount;
      else if (row.taxType === 'withholding_iibb') totals.iibbWithholdings += row.amount;
      else totals.other += row.amount;
    });
    totals.vatDifference = totals.vatDebit - totals.vatCredit;
    totals.technicalVatBalance = totals.vatDifference;
    return totals;
  }

  function taxMatrix(state, options) {
    const range = options?.mode === 'exercise' || options?.exercise ? exerciseBounds(options.exercise) : calendarYearBounds(options?.year);
    const months = monthKeysBetween(range.dateFrom, range.dateTo);
    const definitions = [
      ['vatDebit', 'IVA debito'],
      ['vatCredit', 'IVA credito'],
      ['vatDifference', 'Diferencia IVA debito - IVA credito'],
      ['vatWithholdings', 'Retenciones IVA sufridas'],
      ['vatPerceptions', 'Percepciones IVA sufridas'],
      ['vatReimbursements', 'Reintegros recibidos'],
      ['bankDebitCreditTax', 'Debitos/creditos bancarios'],
      ['other', 'Otros']
    ];
    return definitions.map(([key, label]) => {
      const values = months.map((month) => {
        const bounds = monthBounds(month);
        const totals = taxTotals(state, { ...options, dateFrom: bounds.from, dateTo: bounds.to, mode: 'custom', exercise: '', year: '' });
        return { month, amount: totals[key] || 0 };
      });
      return { key, label, values, total: values.reduce((sumValue, item) => sumValue + item.amount, 0) };
    });
  }

  function closingSummary(state, options) {
    const range = exerciseBounds(options?.exercise);
    const economicRange = economicPeriod({ ...options, exercise: options?.exercise || managementExerciseForDate(todayIso()) });
    const reading = options?.reading || 'total';
    const currency = options?.currency || 'ARS';
    const economic = economicSummary(state, { ...economicRange, activity: options?.activity, reading, currency });
    const taxes = taxTotals(state, { dateFrom: range.dateFrom, dateTo: range.dateTo, reading, currency });
    const financialAccounts = accountBalancesAsOf(state, range.dateTo).filter((account) => account.currency === currency);
    const documentsAtClose = state.documents
      .filter((doc) => !doc.voidedAt)
      .filter((doc) => doc.currency === currency)
      .filter((doc) => readingMatches(doc, reading))
      .filter((doc) => doc.issueDate <= range.dateTo);
    const receivableBreakdowns = documentsAtClose
      .map((doc) => documentDirection(doc, state) === 'in' ? documentBreakdown(state, doc.id, range.dateTo, true) : null)
      .filter(Boolean);
    const receivable = receivableBreakdowns.reduce((total, breakdown) => total + breakdown.nonInstrumented + breakdown.committedPending, 0);
    const payableBreakdowns = documentsAtClose
      .map((doc) => documentDirection(doc, state) === 'out' ? documentBreakdown(state, doc.id, range.dateTo, true) : null)
      .filter(Boolean);
    const payable = payableBreakdowns.reduce((total, breakdown) => total + breakdown.nonInstrumented + breakdown.committedPending, 0);
    // Checks that already settled the document but have not hit the bank yet. Scheduled transfers and undelivered checks are not here:
    // they are still part of receivable/payable through committedPending, so listing them again would count them twice.
    const pendingCheckLinks = (direction) => state.orderInstruments
      .filter((link) => !link.voidedAt)
      .filter((link) => {
        const order = state.orders.find((item) => item.id === link.orderId);
        const instrument = state.instruments.find((item) => item.id === link.instrumentId);
        if (!order || order.voidedAt || !instrument || order.date > range.dateTo || instrument.currency !== currency) return false;
        if (instrument.direction !== direction || !instrumentAffectsFinancialFlow(instrument)) return false;
        if (!instrumentCommerciallyCancelsNow(instrument)) return false;
        if (instrumentIsBankRealized(instrument) && (instrument.executedDate || instrument.scheduledDate) <= range.dateTo) return false;
        return true;
      });
    const pendingValueLinks = pendingCheckLinks('out');
    const pendingReceivableValueLinks = pendingCheckLinks('in');
    const pendingValues = pendingValueLinks.reduce((total, link) => total + Math.abs(Number(link.amount || 0)), 0);
    const pendingReceivableValues = pendingReceivableValueLinks.reduce((total, link) => total + Math.abs(Number(link.amount || 0)), 0);
    return {
      exercise: options?.exercise || managementExerciseForDate(todayIso()),
      reading,
      currency,
      range,
      economic,
      economicRange,
      taxes,
      financialComponents: { accounts: financialAccounts, receivable: receivableBreakdowns, payable: payableBreakdowns, pendingValues: pendingValueLinks, pendingReceivableValues: pendingReceivableValueLinks },
      financial: {
        bankCash: financialAccounts.reduce((total, account) => total + account.realBalance, 0),
        receivable,
        payable,
        pendingValues,
        pendingReceivableValues
      }
    };
  }

  // Read-only provenance: reject unexplained differences instead of synthesizing balancing rows.
  function reconcileIndicatorDetail(state, descriptor) {
    const rows = descriptor.rows.map((item) => {
      const doc = state.documents.find((record) => record.id === item.documentId);
      const charge = item.source === 'bankCharge' ? (state.bankCharges || []).find((record) => record.id === item.id) : null;
      const taxSource = { taxReimbursement: 'taxReimbursements', orderTaxWithholding: 'orderTaxWithholdings', orderPracticedWithholding: 'orderPracticedWithholdings' }[item.source];
      const taxRecord = taxSource ? (state[taxSource] || []).find((record) => record.id === item.id) : null;
      const instrumentId = item.instrumentId || charge?.instrumentId || taxRecord?.instrumentId;
      const instrument = state.instruments.find((record) => record.id === instrumentId);
      const account = item.financialAccountId && state.financialAccounts.find((record) => record.id === item.financialAccountId);
      const entityId = item.entityId || doc?.entityId || instrument?.entityId;
      const target = doc ? { type: 'document', id: doc.id } : instrument ? { type: 'instrument', id: instrument.id }
        : account ? { type: 'financialAccount', id: account.id }
          : taxRecord?.orderId && state.orders.some((record) => record.id === taxRecord.orderId) ? { type: 'order', id: taxRecord.orderId } : null;
      return { ...item, amount: Number(item.amount), currency: item.currency || doc?.currency || instrument?.currency || account?.currency,
        activity: item.activity || doc?.activity || '', entityName: item.entityName || entityName(state, entityId),
        documentType: doc ? labelForType(doc.type) : item.documentType || (charge ? 'Cargo bancario' : instrument ? labelForType(instrument.type) : 'Componente sin documento'),
        number: item.number || doc?.number || instrument?.reference || account?.name || item.id,
        description: item.description || doc?.description || charge?.description || '', target };
    });
    const exactCents = (amount) => Number.isFinite(amount) && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.0001;
    const valid = exactCents(descriptor.amount) && rows.every((row) => exactCents(row.amount) && row.currency === descriptor.currency);
    const cents = valid ? rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) : NaN;
    const reconciled = valid && cents === Math.round(descriptor.amount * 100);
    return { ...descriptor, rows, total: cents / 100, reconciled,
      limitation: reconciled ? '' : 'Detalle no disponible: las contribuciones no concilian en centavos o tienen moneda/importe incompleto. No se generaron ajustes.' };
  }

  function economicIndicatorDetail(state, summary, metric, filters) {
    const labels = { income: 'Ingresos económicos', expense: 'Costos económicos', result: 'Resultado económico' };
    const rows = summary.rows.map((row) => ({ ...row, source: row.documentId ? row.source || 'document' : 'bankCharge',
      amount: metric === 'result' ? row.income - row.expense : row[metric] })).filter((row) => row.amount !== 0);
    return reconcileIndicatorDetail(state, { title: labels[metric], amount: summary[metric], currency: filters.currency,
      filters: { ...filters, ...summary.range }, rows });
  }

  function taxIndicatorDetail(state, totals, metric, filters) {
    const simpleTypes = { vatWithholdings: 'withholding_vat', vatPerceptions: 'perception_vat', vatReimbursements: 'reimbursement_vat' };
    const rows = totals.rows.flatMap((row) => {
      if (['orderPracticedWithholding', 'taxPayment'].includes(row.source)) return [];
      let amount = 0;
      if (row.taxType === 'commission_vat' && ['vatCredit', 'vatDifference'].includes(metric)) amount = metric === 'vatDifference' ? -row.amount : row.amount;
      else if (row.taxType === 'vat' && ['vatDebit', 'vatCredit', 'vatDifference'].includes(metric)) {
        const sale = row.commercialSide === 'sale' || (!['sale', 'purchase'].includes(row.commercialSide) && row.direction === 'in');
        const signedAmount = ['sale', 'purchase'].includes(row.commercialSide) && row.documentType === 'credit_note' ? -row.amount : row.amount;
        if (metric === 'vatDifference') amount = sale ? signedAmount : -signedAmount;
        else if ((metric === 'vatDebit') === sale) amount = signedAmount;
      } else if (row.taxType === simpleTypes[metric] || (metric === 'vatRelated' && Object.values(simpleTypes).includes(row.taxType))) amount = row.amount;
      return amount ? [{ ...row, amount, documentType: row.label, description: `${row.label} · ${row.description}` }] : [];
    });
    return reconcileIndicatorDetail(state, { title: metric === 'vatRelated' ? 'Retenciones IVA, percepciones IVA y reintegros' : 'Componentes fiscales',
      amount: metric === 'vatRelated' ? totals.vatWithholdings + totals.vatPerceptions + totals.vatReimbursements : totals[metric],
      currency: filters.currency, filters, rows });
  }

  function closingIndicatorDetail(state, summary, metric) {
    const filters = { exercise: summary.exercise, ...summary.range, reading: summary.reading, currency: summary.currency };
    if (['vatDifference', 'vatRelated'].includes(metric)) return taxIndicatorDetail(state, summary.taxes, metric, filters);
    let rows = [];
    if (metric === 'bankCash') rows = summary.financialComponents.accounts.map((account) => ({ id: account.id, financialAccountId: account.id,
      date: summary.range.dateTo, currency: account.currency, amount: account.realBalance, documentType: 'Saldo de cuenta al cierre',
      description: `Saldo actual al corte; incluye apertura registrada: ${account.openingBalance} ${account.currency}. No es un movimiento.` }));
    if (['receivable', 'payable'].includes(metric)) rows = summary.financialComponents[metric].map((breakdown) => ({
      id: breakdown.doc.id, documentId: breakdown.doc.id, date: breakdown.doc.issueDate || breakdown.doc.recordDate,
      currency: breakdown.doc.currency, amount: breakdown.nonInstrumented + breakdown.committedPending,
      description: `${breakdown.doc.description || ''} · Saldo pendiente al ${summary.range.dateTo}` }));
    if (['pendingValues', 'pendingReceivableValues'].includes(metric)) rows = summary.financialComponents[metric].map((link) => {
      const instrument = state.instruments.find((item) => item.id === link.instrumentId);
      const order = state.orders.find((item) => item.id === link.orderId);
      return { id: link.id, instrumentId: link.instrumentId, date: instrument?.scheduledDate, currency: instrument?.currency,
        amount: Math.abs(Number(link.amount || 0)), description: `Valor pendiente · ${order ? orderDisplayCode(state, order) : ''} · ${instrument?.reference || ''}` };
    });
    return reconcileIndicatorDetail(state, { title: metric, amount: summary.financial[metric], currency: summary.currency,
      filters: { ...filters, dateFrom: '', reading: ['bankCash', 'pendingValues', 'pendingReceivableValues'].includes(metric) ? '' : summary.reading }, rows: rows.filter((row) => row.amount !== 0) });
  }

  function monthBounds(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }

  function pendingWindows(state, options) {
    const baseDate = options?.baseDate || todayIso();
    const currency = options?.currency || 'ARS';
    return [7, 15, 30].map((days) => {
      const to = addDays(baseDate, days);
      const rows = filterFlowRows(state, { currency, status: 'Pendiente', dateFrom: baseDate, dateTo: to });
      const incoming = rows.filter((row) => row.direction === 'in');
      const outgoing = rows.filter((row) => row.direction === 'out');
      return {
        days,
        dateFrom: baseDate,
        dateTo: to,
        income: flowTotals(incoming).incomes,
        expense: flowTotals(outgoing).expenses,
        incomeRows: incoming,
        expenseRows: outgoing
      };
    });
  }

  function activityDistribution(state, filters) {
    const rows = filterFlowRows(state, filters);
    const totals = new Map();
    rows.forEach((row) => {
      const amount = Math.abs(row.amount);
      totals.set(row.activity || 'Sin actividad', (totals.get(row.activity || 'Sin actividad') || 0) + amount);
    });
    const total = Array.from(totals.values()).reduce((sumValue, value) => sumValue + value, 0);
    return Array.from(totals.entries()).map(([activity, amount]) => ({
      activity,
      amount,
      percent: total ? amount / total : 0,
      rows: rows.filter((row) => (row.activity || 'Sin actividad') === activity)
    }));
  }

  function periodSummaryByActivity(state, filters) {
    const currency = filters?.currency || 'ARS';
    return ACTIVITIES.map((activity) => {
      const rows = filterFlowRows(state, { ...filters, currency, activity, status: 'settled' });
      const paid = rows.filter((row) => row.direction === 'out' && row.userStatus === 'Pagado');
      const collected = rows.filter((row) => row.direction === 'in' && row.userStatus === 'Cobrado');
      return {
        activity,
        income: flowTotals(collected).incomes,
        expense: flowTotals(paid).expenses,
        net: flowTotals(collected).incomes - flowTotals(paid).expenses,
        rows
      };
    });
  }

  function sum(rows) {
    return rows.reduce((total, row) => total + row.amount, 0);
  }

  function accountBalances(state) {
    return state.financialAccounts.map((account) => {
      const bankReal = state.instruments
        .filter((instrument) => instrument.financialAccountId === account.id && instrument.currency === account.currency && instrumentIsBankRealized(instrument))
        .reduce((total, instrument) => total + signed(instrument.direction, instrument.amount), 0);
      const realCharges = (state.bankCharges || [])
        .filter((charge) => charge.financialAccountId === account.id && charge.currency === account.currency && charge.status === 'executed')
        .reduce((total, charge) => total - Number(charge.amount || 0), 0);
      const realAdjustments = (state.financialAdjustments || [])
        .filter((adjustment) => adjustment.financialAccountId === account.id && adjustment.currency === account.currency)
        .reduce((total, adjustment) => total + Number(adjustment.amount || 0), 0);
      const projectedByAccount = state.instruments
        .filter((instrument) => instrument.financialAccountId === account.id && instrument.currency === account.currency)
        .filter(instrumentAffectsFinancialFlow)
        .filter((instrument) => !instrumentIsPending(instrument) || !instrumentLinkedOnlyToInactiveOrders(state, instrument.id))
        .reduce((total, instrument) => total + signed(instrument.direction, instrument.amount), 0);
      const projectedCharges = (state.bankCharges || [])
        .filter((charge) => charge.financialAccountId === account.id && charge.currency === account.currency)
        .reduce((total, charge) => total - Number(charge.amount || 0), 0);
      return { ...account, realBalance: account.openingBalance + bankReal + realCharges + realAdjustments, projectedBalance: account.openingBalance + projectedByAccount + projectedCharges + realAdjustments };
    });
  }

  function accountBalancesAsOf(state, dateTo) {
    return state.financialAccounts.map((account) => {
      const bankReal = state.instruments
        .filter((instrument) => instrument.financialAccountId === account.id && instrument.currency === account.currency && instrumentIsBankRealized(instrument))
        .filter((instrument) => !dateTo || (instrument.executedDate || instrument.scheduledDate) <= dateTo)
        .reduce((total, instrument) => total + signed(instrument.direction, instrument.amount), 0);
      const realCharges = (state.bankCharges || [])
        .filter((charge) => charge.financialAccountId === account.id && charge.currency === account.currency && charge.status === 'executed')
        .filter((charge) => !dateTo || charge.date <= dateTo)
        .reduce((total, charge) => total - Number(charge.amount || 0), 0);
      const realAdjustments = (state.financialAdjustments || [])
        .filter((adjustment) => adjustment.financialAccountId === account.id && adjustment.currency === account.currency)
        .filter((adjustment) => !dateTo || adjustment.date <= dateTo)
        .reduce((total, adjustment) => total + Number(adjustment.amount || 0), 0);
      return { ...account, realBalance: account.openingBalance + bankReal + realCharges + realAdjustments };
    });
  }

  function financialMovementRows(state, filters) {
    const f = filters || {};
    const rows = [];
    state.instruments
      .filter(instrumentIsBankRealized)
      .forEach((instrument) => rows.push({
        id: instrument.id,
        source: 'instrument',
        date: instrument.executedDate || instrument.scheduledDate,
        financialAccountId: instrument.financialAccountId,
        accountName: accountName(state, instrument.financialAccountId),
        entityId: instrument.entityId,
        entityName: entityName(state, instrument.entityId),
        description: instrumentDisplayName(state, instrument),
        income: instrument.direction === 'in' ? Number(instrument.amount || 0) : 0,
        expense: instrument.direction === 'out' ? Number(instrument.amount || 0) : 0,
        amount: signed(instrument.direction, Number(instrument.amount || 0)),
        currency: instrument.currency
      }));
    (state.bankCharges || [])
      .filter((charge) => charge.status === 'executed')
      .forEach((charge) => rows.push({
        id: charge.id,
        source: 'bankCharge',
        date: charge.date,
        financialAccountId: charge.financialAccountId,
        accountName: accountName(state, charge.financialAccountId),
        entityId: charge.entityId || '',
        entityName: entityName(state, charge.entityId),
        description: charge.description || labelForTaxType(charge.taxType),
        income: 0,
        expense: Number(charge.amount || 0),
        amount: -Number(charge.amount || 0),
        currency: charge.currency
      }));
    (state.financialAdjustments || []).forEach((adjustment) => {
      const amount = Number(adjustment.amount || 0);
      rows.push({
        id: adjustment.id,
        source: 'financialAdjustment',
        date: adjustment.date,
        financialAccountId: adjustment.financialAccountId,
        accountName: accountName(state, adjustment.financialAccountId),
        entityId: '',
        entityName: '',
        description: `Ajuste de conciliacion - ${adjustment.reason}`,
        income: amount > 0 ? amount : 0,
        expense: amount < 0 ? Math.abs(amount) : 0,
        amount,
        currency: adjustment.currency
      });
    });
    return rows
      .filter((row) => !f.currency || row.currency === f.currency)
      .filter((row) => !f.financialAccountId || row.financialAccountId === f.financialAccountId)
      .filter((row) => !f.dateFrom || row.date >= f.dateFrom)
      .filter((row) => !f.dateTo || row.date <= f.dateTo)
      .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));
  }

  function financialReconciliation(state, options) {
    const accountId = options?.financialAccountId || options?.accountId;
    const date = options?.date || todayIso();
    const reportedBalance = Number(options?.reportedBalance || 0);
    const account = accountBalancesAsOf(state, date).find((item) => item.id === accountId);
    if (!account) throw new Error('Cuenta financiera inexistente');
    const difference = reportedBalance - account.realBalance;
    return {
      financialAccountId: account.id,
      accountName: account.name,
      currency: account.currency,
      date,
      systemBalance: account.realBalance,
      reportedBalance,
      difference,
      reconciled: Math.abs(difference) <= 0.01
    };
  }

  function receivedCheckPortfolio(state, filters) {
    const f = filters || {};
    return state.instruments
      .filter((instrument) => instrument.type === 'received_check')
      .filter((instrument) => !['endorsed', 'accredited', 'rejected', 'voided', 'cancelled'].includes(instrument.status))
      .filter((instrument) => !instrument.voidedAt && !instrumentLinkedOnlyToInactiveOrders(state, instrument.id))
      .filter((instrument) => !f.currency || instrument.currency === f.currency)
      .filter((instrument) => !f.entityId || instrument.entityId === f.entityId)
      .filter((instrument) => !f.dateTo || instrument.scheduledDate <= f.dateTo)
      .filter((instrument) => !f.dateFrom || instrument.scheduledDate >= f.dateFrom);
  }

  function receivedCheckPortfolioAmount(state, filters) {
    return receivedCheckPortfolio(state, filters).reduce((total, instrument) => total + Number(instrument.amount || 0), 0);
  }

  function ensureGrainCollections(draft) {
    draft.grainLocations ||= [];
    draft.grainMovements ||= [];
    draft.grainTransfers ||= [];
    draft.grainForwards ||= [];
    draft.grainLiquidations ||= [];
    draft.grainReferencePrices ||= [];
  }

  function createGrainLocationTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre de ubicacion obligatorio');
    if (!GRAIN_LOCATION_TYPES.includes(payload.type)) throw new Error('Tipo de ubicacion de cereal invalido');
    const id = payload.id || uid('GLOC');
    draft.grainLocations.push({ id, name, type: payload.type, entityId: payload.entityId || '', active: payload.active !== false });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainLocation', entityId: id, action: 'create-grain-location', changes: [{ field: 'name', from: null, to: name }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta ubicacion cereal', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainTransferTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const kgSent = Number(payload.kgSent || 0);
    const kgNetRecognized = Number(payload.kgNetRecognized ?? kgSent);
    if (kgSent <= 0 || kgNetRecognized < 0) throw new Error('Kilos invalidos en traslado');
    if (payload.originLocationId === payload.destinationLocationId) throw new Error('Origen y destino no pueden ser iguales');
    if (grainStockAt(draft, { cereal: payload.cereal, campaign: payload.campaign, locationId: payload.originLocationId }) + 0.001 < kgSent) throw new Error('Stock insuficiente en origen');
    const id = payload.id || uid('GTR');
    const date = payload.date || todayIso();
    draft.grainTransfers.push({
      id,
      date,
      cereal: payload.cereal,
      campaign: payload.campaign,
      originLocationId: payload.originLocationId,
      destinationLocationId: payload.destinationLocationId,
      kgSent,
      kgNetRecognized,
      differenceKg: kgSent - kgNetRecognized,
      description: payload.description || ''
    });
    draft.grainMovements.push(
      { id: payload.outMovementId || uid('GM'), date, cereal: payload.cereal, campaign: payload.campaign, locationId: payload.originLocationId, direction: 'out', kg: kgSent, movementType: 'transfer', referenceType: 'grain_transfer', referenceId: id, description: payload.description || 'Traslado cereal' },
      { id: payload.inMovementId || uid('GM'), date, cereal: payload.cereal, campaign: payload.campaign, locationId: payload.destinationLocationId, direction: 'in', kg: kgNetRecognized, movementType: 'transfer', referenceType: 'grain_transfer', referenceId: id, description: payload.description || 'Recepcion cereal' }
    );
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainTransfer', entityId: id, action: 'create-grain-transfer', changes: [{ field: 'kgSent', from: null, to: kgSent }, { field: 'kgNetRecognized', from: null, to: kgNetRecognized }], createdAt: new Date().toISOString(), reason: payload.reason || 'Traslado fisico de cereal', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainForwardTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const contractedKg = Number(payload.contractedKg || 0);
    const price = Number(payload.price || 0);
    const estimatedAmount = payload.estimatedAmount == null || payload.estimatedAmount === '' ? (contractedKg / 1000) * price : Number(payload.estimatedAmount || 0);
    if (contractedKg <= 0 || price <= 0) throw new Error('FWD requiere kilos y precio');
    if (estimatedAmount <= 0) throw new Error('Importe estimado FWD invalido');
    const id = payload.id || uid('GFWD');
    draft.grainForwards.push({
      id,
      cereal: payload.cereal,
      campaign: payload.campaign,
      buyerEntityId: payload.buyerEntityId,
      contractedKg,
      price,
      estimatedAmount,
      currency: payload.currency || 'USD',
      plannedDeliveryDate: payload.plannedDeliveryDate || payload.plannedLiquidationDate || todayIso(),
      plannedLiquidationDate: payload.plannedLiquidationDate || payload.plannedDeliveryDate || todayIso(),
      estimatedExchangeRate: payload.estimatedExchangeRate == null || payload.estimatedExchangeRate === '' ? null : Number(payload.estimatedExchangeRate),
      chartAccountId: payload.chartAccountId || 'CA-AGRI',
      status: payload.status || 'active',
      description: payload.description || '',
      reference: payload.reference || ''
    });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainForward', entityId: id, action: 'create-grain-forward', changes: [{ field: 'contractedKg', from: null, to: contractedKg }, { field: 'price', from: null, to: price }, { field: 'estimatedAmount', from: null, to: estimatedAmount }], createdAt: new Date().toISOString(), reason: payload.reason || 'Contrato FWD cereal', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainReferencePriceTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const price = Number(payload.price || 0);
    if (price <= 0) throw new Error('Precio de referencia invalido');
    const id = payload.id || uid('GPRICE');
    draft.grainReferencePrices.push({
      id,
      cereal: payload.cereal,
      campaign: payload.campaign,
      date: payload.date || todayIso(),
      price,
      currency: payload.currency || 'USD',
      unit: payload.unit || 'tn',
      notes: payload.notes || ''
    });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainReferencePrice', entityId: id, action: 'create-grain-reference-price', changes: [{ field: 'price', from: null, to: price }], createdAt: new Date().toISOString(), reason: payload.reason || 'Precio manual de cereal', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainMovementTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const kg = Number(payload.kg || 0);
    const direction = payload.direction;
    const movementType = payload.movementType || 'adjustment';
    if (!GRAIN_TYPES.includes(payload.cereal)) throw new Error('Cereal invalido');
    if (!payload.campaign) throw new Error('Campana obligatoria');
    if (!draft.grainLocations.some((location) => location.id === payload.locationId)) throw new Error('Ubicacion cereal inexistente');
    if (direction !== 'in' && direction !== 'out') throw new Error('Direccion de cereal invalida');
    if (kg <= 0) throw new Error('Kilos invalidos');
    const liquidationReferenceId = payload.referenceId || payload.id;
    if (movementType === 'liquidation' && liquidationReferenceId && draft.grainMovements.some((movement) => !movement.voidedAt && movement.movementType === 'liquidation' && movement.referenceId === liquidationReferenceId)) {
      throw new Error('La salida fisica de esta liquidacion ya existe');
    }
    if (direction === 'out' && grainStockAt(draft, { cereal: payload.cereal, campaign: payload.campaign, locationId: payload.locationId }) + 0.001 < kg) {
      throw new Error('Stock insuficiente para salida/ajuste');
    }
    const id = payload.id || uid('GM');
    draft.grainMovements.push({
      id,
      date: payload.date || todayIso(),
      cereal: payload.cereal,
      campaign: payload.campaign,
      locationId: payload.locationId,
      direction,
      kg,
      movementType,
      referenceType: payload.referenceType || movementType,
      referenceId: payload.referenceId || id,
      description: payload.description || payload.notes || ''
    });
    draft.auditLog.unshift({
      id: uid('AUD'),
      entityType: 'grainMovement',
      entityId: id,
      action: 'create-grain-movement',
      changes: [{ field: 'kg', from: null, to: kg }, { field: 'direction', from: null, to: direction }],
      createdAt: new Date().toISOString(),
      reason: payload.reason || 'Movimiento fisico de cereal',
      user: user || 'local'
    });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function compensationStatus(item) {
    return item.voidedAt ? 'cancelled' : item.status || 'confirmed';
  }

  function compensationIsConfirmed(item) {
    return compensationStatus(item) === 'confirmed';
  }

  function compensationDocumentAmount(item, documentId) {
    return Number(documentId === item.debtDocumentId ? item.debtAmount ?? item.amount : item.amount);
  }

  function compensationAmounts(payload, credit, debt) {
    const amount = Number(payload.amount);
    const cents = (value) => Number.isFinite(value) && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 0.0001;
    if (!cents(amount)) throw new Error('Importe de compensación inválido');
    if (credit.currency === debt.currency) {
      if (payload.debtAmount != null || payload.debtCurrency != null || payload.exchangeRate != null) throw new Error('Conversión innecesaria en compensación de la misma moneda');
      return { amount };
    }
    if (credit.currency !== 'ARS' || debt.currency !== 'USD') throw new Error('Compensación multimoneda sólo admite crédito ARS y deuda USD');
    const debtAmount = Number(payload.debtAmount), exchangeRate = Number(payload.exchangeRate);
    if (!cents(debtAmount) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new Error('Importe USD y TC ARS/USD explícitos obligatorios');
    if (payload.debtCurrency != null && payload.debtCurrency !== 'USD') throw new Error('Moneda de deuda incompatible');
    const equivalent = debtAmount * exchangeRate;
    if (!Number.isFinite(equivalent) || Math.round(equivalent * 100) !== Math.round(amount * 100)) throw new Error('Importe ARS no coincide con USD por TC, redondeado a centavos');
    return { amount, debtAmount, debtCurrency: 'USD', exchangeRate, roundingDifference: Math.round((amount - equivalent) * 1e8) / 1e8 };
  }

  function createDocumentCompensationTransaction(state, payload, user) {
    const draft = clone(state);
    const status = payload.status || 'confirmed';
    if (!['requested', 'confirmed'].includes(status)) throw new Error('Estado de compensación inválido');
    draft.documentCompensations ||= [];
    const credit = draft.documents.find((doc) => doc.id === payload.creditDocumentId && !doc.voidedAt);
    const debt = draft.documents.find((doc) => doc.id === payload.debtDocumentId && !doc.voidedAt);
    if (!credit || !debt || credit.id === debt.id || documentDirection(credit, draft) !== 'in' || documentDirection(debt, draft) !== 'out') throw new Error('Seleccioná un crédito y una deuda existentes de sentido opuesto');
    if (credit.entityId !== debt.entityId) throw new Error('La compensación requiere misma contraparte');
    const amounts = compensationAmounts(payload, credit, debt);
    const { amount } = amounts;
    const debtAmount = amounts.debtAmount ?? amount;
    const date = String(payload.date || '');
    assertCorrectionDate(date);
    if (date < (credit.issueDate || credit.recordDate || '') || date < (debt.issueDate || debt.recordDate || '')) throw new Error('La fecha de compensación no puede preceder a los documentos');
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para compensar documentos');
    const linksFor = (doc) => draft.orderDocuments.filter((link) => link.documentId === doc.id && !link.voidedAt);
    const eligibleLink = (doc) => {
      const links = linksFor(doc);
      if (links.length > 1) throw new Error(`El documento ${doc.number || doc.id} tiene múltiples órdenes: compensación ambigua`);
      const link = links[0];
      if (!link) return '';
      const order = draft.orders.find((item) => item.id === link.orderId);
      const instrumentLinks = draft.orderInstruments.filter((item) => item.orderId === link.orderId && !item.voidedAt);
      const orderLabel = order ? orderDisplayCode(draft, order.id) : link.orderId;
      const fail = (message) => { throw new Error(`${doc.number || doc.id} · ${orderLabel}: ${message}`); };
      if (!order || order.voidedAt || order.entityId !== doc.entityId || order.currency !== doc.currency || link.currency !== doc.currency || order.type !== (documentDirection(doc, draft) === 'in' ? 'collection' : 'payment')) fail('orden o imputación documental incompatible');
      const fiscal = [...(draft.orderTaxWithholdings || []), ...(draft.orderPracticedWithholdings || [])].filter((item) => item.orderId === order.id && !item.voidedAt);
      if (fiscal.length) fail(`efectos o relaciones fiscales requieren revisión manual: ${fiscal.map((item) => item.id).join(', ')}`);
      const cents = (value, label) => {
        if (!Number.isFinite(value) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) fail(`importe incoherente en ${label}`);
        return Math.round(value * 100);
      };
      const applied = cents(link.amountApplied, link.id);
      const settlements = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt);
      if (instrumentLinks.length || settlements.length) {
        if (draft.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt).length !== 1) fail('varios documentos en la orden con medios asociados: distribución ambigua');
        if (new Set(settlements.map((item) => item.id)).size !== settlements.length || new Set(instrumentLinks.map((item) => item.id)).size !== instrumentLinks.length) fail('IDs de imputación duplicados');
        for (const settlement of settlements) {
          if (!instrumentLinks.some((item) => item.id === settlement.orderInstrumentId) || settlement.currency !== doc.currency || cents(settlement.amount, settlement.id) <= 0) fail(`settlement incompatible ${settlement.id}`);
        }
        for (const oi of instrumentLinks) {
          const instrument = draft.instruments.find((item) => item.id === oi.instrumentId);
          if (!instrument || instrument.voidedAt || !['transfer', 'account_debit', 'cash', 'own_check', 'received_check', 'vep', 'card_financing'].includes(instrument.type)
            || instrument.status === 'endorsed' || (!instrumentCommerciallyCancelsNow(instrument) && !instrumentIsPending(instrument))) fail(`instrumento incompatible o inactivo ${oi.instrumentId}`);
          if (instrument.entityId !== doc.entityId || instrument.direction !== documentDirection(doc, draft) || oi.currency !== instrument.currency
            || cents(oi.amount, oi.id) !== cents(instrument.amount, instrument.id)) fail(`datos nominales/sentido incompatibles ${instrument.id}`);
          if (draft.orderInstruments.filter((item) => item.instrumentId === instrument.id && !item.voidedAt).length !== 1) fail(`instrumento utilizado por otra orden ${instrument.id}`);
          const allocated = draft.orderDocumentSettlements.filter((item) => item.orderInstrumentId === oi.id && !item.voidedAt);
          if (!allocated.length || allocated.some((item) => item.orderDocumentId !== link.id)
            || allocated.reduce((sum, item) => sum + cents(item.amount, item.id), 0) !== cents(orderInstrumentCommercialAmount(oi), oi.id)
            || allocated.reduce((sum, item) => sum + cents(settlementInstrumentAmount(item), item.id), 0) !== cents(oi.amount, oi.id)) fail(`imputación incompleta o inconsistente del instrumento ${instrument.id}`);
        }
      }
      const alreadyCompensated = draft.documentCompensations.filter((item) => compensationIsConfirmed(item) && [item.creditOrderDocumentId, item.debtOrderDocumentId].includes(link.id)).reduce((sum, item) => sum + Math.round(compensationDocumentAmount(item, doc.id) * 100), 0);
      const covered = settlements.reduce((sum, item) => sum + cents(item.amount, item.id), 0) + alreadyCompensated;
      const available = applied - covered;
      if (available < 0) fail('imputaciones y compensaciones superan lo aplicado en la orden');
      const requested = Math.round((doc.id === debt.id ? debtAmount : amount) * 100);
      // An exhausted order must not receive a new cancellation of debt outside that order.
      if (!available && applied < cents(doc.amount, doc.id)) {
        const standalone = draft.documentCompensations.filter((item) => compensationIsConfirmed(item)
          && (item.creditDocumentId === doc.id || item.debtDocumentId === doc.id)
          && !(item.creditDocumentId === doc.id ? item.creditOrderDocumentId : item.debtOrderDocumentId))
          .reduce((sum, item) => sum + cents(compensationDocumentAmount(item, doc.id), item.id), 0);
        if (requested <= cents(doc.amount, doc.id) - applied - standalone) return '';
      }
      if (requested > available) fail(`saldo libre de la imputación insuficiente (${available / 100} ${doc.currency}); no se redistribuye entre orden y saldo documental`);
      return link.id;
    };
    const creditBalance = documentBreakdown(draft, credit.id);
    const debtBalance = documentBreakdown(draft, debt.id);
    if (Math.round(amount * 100) > Math.round(creditBalance.nonInstrumented * 100) || Math.round(debtAmount * 100) > Math.round(debtBalance.nonInstrumented * 100)) throw new Error(`Saldo libre insuficiente: crédito ${credit.number || credit.id} ${creditBalance.nonInstrumented} ${credit.currency}; deuda ${debt.number || debt.id} ${debtBalance.nonInstrumented} ${debt.currency}`);
    const creditOrderDocumentId = status === 'confirmed' ? eligibleLink(credit) : '';
    const debtOrderDocumentId = status === 'confirmed' ? eligibleLink(debt) : '';
    const id = uid('COMP');
    draft.documentCompensations.push({ id, status, createdAt: new Date().toISOString(), ...(status === 'requested' ? { requestedDate: date } : {}), creditDocumentId: credit.id, debtDocumentId: debt.id, creditOrderDocumentId, debtOrderDocumentId, entityId: credit.entityId, currency: credit.currency, ...amounts, date, reference: String(payload.reference || ''), notes: String(payload.notes || ''), voidedAt: null });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'documentCompensation', entityId: id, action: 'compensate-documents', changes: [{ field: 'creditDocumentId', from: null, to: credit.id }, { field: 'debtDocumentId', from: null, to: debt.id }, { field: 'amount', from: null, to: amount }], createdAt: new Date().toISOString(), reason, user: user || 'local' });
    if (status === 'requested') draft.auditLog[0].action = 'request-document-compensation';
    draft.auditLog[0].changes.push({ field: 'status', from: null, to: status }, { field: 'date', from: null, to: date }, { field: 'reference', from: null, to: String(payload.reference || '') });
    for (const field of ['currency', 'debtAmount', 'debtCurrency', 'exchangeRate', 'roundingDifference']) {
      const value = draft.documentCompensations.at(-1)[field];
      if (value != null) draft.auditLog[0].changes.push({ field, from: null, to: value });
    }
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainReconciliationTransaction(state, payload, user) {
    const liquidation = (state.grainLiquidations || []).find((item) => item.id === payload.liquidationId && !item.voidedAt);
    const credit = liquidation && state.documents.find((doc) => doc.id === liquidation.documentId && !doc.voidedAt);
    if (!credit || credit.currency !== 'ARS' || documentDirection(credit, state) !== 'in') throw new Error('La conciliación requiere una liquidación activa con crédito ARS');
    const allocations = payload.allocations;
    if (!Array.isArray(allocations) || !allocations.length || new Set(allocations.map((item) => item.debtDocumentId)).size !== allocations.length) throw new Error('Seleccione facturas sin duplicados');
    let totalCents = 0;
    for (const allocation of allocations) {
      const debt = state.documents.find((doc) => doc.id === allocation.debtDocumentId && !doc.voidedAt);
      if (!debt || debt.currency !== 'ARS' || debt.entityId !== credit.entityId || documentDirection(debt, state) !== 'out') throw new Error('Factura incompatible: misma contraparte, deuda y moneda ARS requeridas');
      if (!Number.isFinite(allocation.amount) || allocation.amount <= 0 || Math.abs(allocation.amount * 100 - Math.round(allocation.amount * 100)) > 0.0001) throw new Error('Importe de imputación inválido');
      totalCents += Math.round(allocation.amount * 100);
    }
    if (totalCents > Math.round(documentBreakdown(state, credit.id).nonInstrumented * 100)) throw new Error('Saldo libre insuficiente en la liquidación para toda la distribución');
    let draft = clone(state);
    const reconciliationId = uid('REC');
    const ids = [];
    for (const allocation of allocations) {
      draft = createDocumentCompensationTransaction(draft, {
        creditDocumentId: credit.id, debtDocumentId: allocation.debtDocumentId, amount: allocation.amount,
        status: 'requested', date: payload.date, reference: payload.reference, notes: payload.notes, reason: payload.reason
      }, user);
      ids.push(draft.documentCompensations.at(-1).id);
    }
    for (const item of draft.documentCompensations.filter((item) => ids.includes(item.id))) {
      Object.assign(item, { reconciliationId, reconciliationSize: ids.length, grainLiquidationId: liquidation.id });
    }
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainReconciliation', entityId: reconciliationId,
      action: 'request-grain-reconciliation', changes: [{ field: 'allocations', from: null, to: ids.map((id) => clone(draft.documentCompensations.find((item) => item.id === id))) }],
      createdAt: new Date().toISOString(), reason: payload.reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function transitionGrainReconciliationTransaction(state, id, payload, user) {
    const members = (state.documentCompensations || []).filter((item) => item.reconciliationId === id);
    if (!members.length || members.some((item) => compensationStatus(item) !== 'requested')) throw new Error('Sólo una conciliación solicitada completa puede confirmarse o anularse');
    const errors = validateState(state);
    if (errors.length) throw new Error(errors.join('\n'));
    let draft = clone(state);
    // Work only on a private draft; the individual transitions revalidate each remaining balance.
    for (const item of draft.documentCompensations.filter((item) => item.reconciliationId === id)) {
      delete item.reconciliationId;
      delete item.reconciliationSize;
      delete item.grainLiquidationId;
    }
    for (const member of members) draft = transitionDocumentCompensationTransaction(draft, member.id, payload, user);
    for (const member of members) Object.assign(draft.documentCompensations.find((item) => item.id === member.id), {
      reconciliationId: id, reconciliationSize: members.length, grainLiquidationId: member.grainLiquidationId
    });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainReconciliation', entityId: id,
      action: payload.status === 'confirmed' ? 'confirm-grain-reconciliation' : 'cancel-grain-reconciliation',
      changes: [{ field: 'status', from: 'requested', to: payload.status }, { field: 'allocations', from: members, to: draft.documentCompensations.filter((item) => item.reconciliationId === id) }],
      createdAt: new Date().toISOString(), reason: payload.reason, user: user || 'local' });
    const finalErrors = validateState(draft);
    if (finalErrors.length) throw new Error(finalErrors.join('\n'));
    return draft;
  }

  function editDocumentCompensationTransaction(state, id, changes, user) {
    const current = (state.documentCompensations || []).find((item) => item.id === id && !item.voidedAt);
    if (!current || compensationStatus(current) === 'cancelled') throw new Error('Compensación inexistente o anulada');
    if (current.reconciliationId) throw new Error('Imputación de conciliación múltiple: no se edita individualmente');
    const allowed = ['creditDocumentId', 'debtDocumentId', 'amount', 'debtAmount', 'exchangeRate', 'date', 'reference', 'notes', 'reason'];
    if (Object.keys(changes || {}).some((field) => !allowed.includes(field))) throw new Error('Campo de compensación no editable');
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para corregir la compensación');
    const creditDocumentId = changes.creditDocumentId ?? current.creditDocumentId;
    const debtDocumentId = changes.debtDocumentId ?? current.debtDocumentId;
    if ((creditDocumentId !== current.creditDocumentId && current.creditOrderDocumentId)
      || (debtDocumentId !== current.debtDocumentId && current.debtOrderDocumentId)) {
      throw new Error('La compensación tiene una OP/OC vinculada al documento anterior; la reasignación requiere revisión específica');
    }
    const withoutCurrent = clone(state);
    withoutCurrent.documentCompensations = (withoutCurrent.documentCompensations || []).filter((item) => item.id !== id);
    const candidate = createDocumentCompensationTransaction(withoutCurrent, {
      status: compensationStatus(current),
      creditDocumentId, debtDocumentId,
      amount: changes.amount ?? current.amount,
      ...(current.debtCurrency || changes.debtAmount != null || changes.exchangeRate != null ? { debtAmount: changes.debtAmount ?? current.debtAmount, exchangeRate: changes.exchangeRate ?? current.exchangeRate } : {}),
      date: changes.date ?? current.date,
      reference: changes.reference ?? current.reference,
      notes: changes.notes ?? current.notes,
      reason
    }, user);
    const replacement = candidate.documentCompensations.at(-1);
    const fields = ['creditDocumentId', 'debtDocumentId', 'creditOrderDocumentId', 'debtOrderDocumentId', 'entityId', 'currency', 'amount', 'debtAmount', 'debtCurrency', 'exchangeRate', 'roundingDifference', 'date', 'reference', 'notes'];
    const auditChanges = fields.filter((field) => current[field] !== replacement[field])
      .map((field) => ({ field, from: current[field] ?? null, to: replacement[field] ?? null }));
    candidate.documentCompensations[candidate.documentCompensations.length - 1] = { ...current, ...replacement, id, createdAt: current.createdAt || replacement.createdAt, ...(current.requestedDate ? { requestedDate: current.requestedDate } : {}) };
    candidate.auditLog[0] = { id: uid('AUD'), entityType: 'documentCompensation', entityId: id,
      action: 'edit-document-compensation', changes: auditChanges, createdAt: new Date().toISOString(), reason, user: user || 'local' };
    const errors = validateState(candidate);
    if (errors.length) throw new Error(errors.join('\n'));
    return candidate;
  }

  function transitionDocumentCompensationTransaction(state, id, payload, user) {
    const current = (state.documentCompensations || []).find((item) => item.id === id);
    if (current?.reconciliationId) throw new Error('Confirme o anule la conciliación completa, no una imputación individual');
    if (!current || compensationStatus(current) !== 'requested') throw new Error('Sólo una solicitud pendiente puede confirmarse o anularse');
    const status = payload.status;
    if (!['confirmed', 'cancelled'].includes(status)) throw new Error('Transición de compensación inválida');
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio');
    assertCorrectionDate(payload.date || '');
    if (payload.date < (current.requestedDate || current.date)) throw new Error('La fecha no puede preceder a la solicitud');
    const draft = clone(state);
    let result = draft;
    let replacement;
    if (status === 'confirmed') {
      draft.documentCompensations = draft.documentCompensations.filter((item) => item.id !== id);
      result = createDocumentCompensationTransaction(draft, { ...current, status, date: payload.date, reference: payload.reference || '', reason }, user);
      replacement = result.documentCompensations.at(-1);
      result.auditLog.shift();
      result.documentCompensations[result.documentCompensations.length - 1] = { ...current, ...replacement, id, createdAt: current.createdAt || replacement.createdAt, requestedDate: current.requestedDate || current.date, requestedReference: current.reference || '', confirmedAt: new Date().toISOString() };
    } else {
      replacement = result.documentCompensations.find((item) => item.id === id);
      Object.assign(replacement, { status, voidedAt: new Date().toISOString(), cancelledDate: payload.date, cancellationReference: payload.reference || '' });
    }
    result.auditLog.unshift({ id: uid('AUD'), entityType: 'documentCompensation', entityId: id,
      action: status === 'confirmed' ? 'confirm-document-compensation' : 'cancel-document-compensation-request',
      changes: [{ field: 'status', from: 'requested', to: status }, { field: status === 'confirmed' ? 'date' : 'cancelledDate', from: status === 'confirmed' ? current.date : null, to: payload.date }, { field: 'reference', from: current.reference || '', to: payload.reference || '' }],
      reason, user: user || 'local', createdAt: new Date().toISOString() });
    if (status === 'confirmed' && current.debtCurrency) result.auditLog[0].changes.push({ field: 'conversionConfirmed', from: null, to: { amount: current.amount, currency: current.currency, debtAmount: current.debtAmount, debtCurrency: current.debtCurrency, exchangeRate: current.exchangeRate } });
    const errors = validateState(result);
    if (errors.length) throw new Error(errors.join('\n'));
    return result;
  }

  function correctCollectionAndCompensateTransaction(state, payload, user) {
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para corregir el cobro');
    const credit = state.documents.find((doc) => doc.id === payload.creditDocumentId && !doc.voidedAt);
    const debt = state.documents.find((doc) => doc.id === payload.debtDocumentId && !doc.voidedAt);
    const instrument = state.instruments.find((item) => item.id === payload.instrumentId && !item.voidedAt);
    if (!credit || !debt || documentDirection(credit, state) !== 'in' || documentDirection(debt, state) !== 'out') throw new Error('Seleccione un ingreso y un egreso activos');
    if (credit.entityId !== debt.entityId || credit.currency !== debt.currency) throw new Error('Los documentos deben tener la misma contraparte y moneda');
    if (!instrument || instrument.type !== 'transfer' || instrument.direction !== 'in' || !instrumentIsBankRealized(instrument) || instrument.entityId !== credit.entityId || instrument.currency !== credit.currency) throw new Error('El cobro debe ser una transferencia realizada de la misma contraparte y moneda');
    const links = state.orderInstruments.filter((item) => item.instrumentId === instrument.id && !item.voidedAt);
    const settlement = links.length === 1 ? state.orderDocumentSettlements.filter((item) => item.orderInstrumentId === links[0].id && !item.voidedAt) : [];
    const order = links.length === 1 ? state.orders.find((item) => item.id === links[0].orderId && !item.voidedAt) : null;
    const orderDocuments = order ? state.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt) : [];
    if (!order || order.type !== 'collection' || order.entityId !== credit.entityId || order.currency !== credit.currency || links.length !== 1 || settlement.length !== 1 || orderDocuments.length !== 1 || settlement[0].orderDocumentId !== orderDocuments[0].id || orderDocuments[0].documentId !== credit.id || state.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt).length !== 1 || Math.round(settlement[0].amount * 100) !== Math.round(instrument.amount * 100)) throw new Error('La transferencia tiene una imputación múltiple, parcial o ajena al documento; requiere revisión específica');
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001 || Math.round(amount * 100) > Math.round(instrument.amount * 100)) throw new Error('El importe a compensar debe ser positivo y no superar el cobro revertido');
    const reversed = reverseRealizedInstrumentTransaction(state, instrument.id, reason, user);
    const voided = voidScheduledInstrumentTransaction(reversed, instrument.id, reason, user);
    const draft = createDocumentCompensationTransaction(voided, { creditDocumentId: credit.id, debtDocumentId: debt.id, amount, date: payload.date, reference: payload.reference, notes: payload.notes, reason }, user);
    const now = new Date().toISOString();
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'documentCompensation', entityId: draft.documentCompensations.at(-1).id, action: 'correct-collection-and-compensate', changes: [
      { field: 'instrumentId', from: instrument.id, to: instrument.id },
      { field: 'bankCollection', from: { amount: instrument.amount, currency: instrument.currency, date: instrument.executedDate || instrument.scheduledDate, accountId: instrument.financialAccountId }, to: null },
      { field: 'autoBankCharges', from: bankChargeReversalDetails(state, instrument.id).charges, to: [] },
      { field: 'documents', from: null, to: { creditDocumentId: credit.id, debtDocumentId: debt.id, amount } }
    ], createdAt: now, reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainBarterPaymentTransaction(state, payload, user) {
    const document = (state.documents || []).find((doc) => doc.id === payload.documentId && !doc.voidedAt);
    if (!document) throw new Error('Documento a cancelar inexistente');
    if (documentDirection(document, state) !== 'out') throw new Error('El canje de cereal desde proveedor requiere una deuda a pagar');
    const amountApplied = Number(payload.amountApplied || payload.amount || 0);
    if (amountApplied <= 0) throw new Error('Importe de canje invalido');
    if (pendingAmountForDocument(state, document.id) + 0.01 < amountApplied) throw new Error('Documento sin saldo suficiente para canje');
    const kg = Number(payload.kg || 0);
    if (kg <= 0) throw new Error('Kilos de canje invalidos');
    const financialAccountId = payload.financialAccountId || (state.financialAccounts || []).find((account) => account.currency === document.currency)?.id;
    if (!financialAccountId) throw new Error('Cuenta financiera de referencia inexistente');
    let draft = createOrderTransaction(state, {
      type: 'payment',
      documentId: document.id,
      amountApplied,
      financialAccountId,
      date: payload.date || todayIso(),
      description: payload.description || `Canje cereal contra ${document.number}`,
      instruments: [{
        type: 'compensation',
        amount: amountApplied,
        scheduledDate: payload.date || todayIso(),
        status: 'executed',
        reference: payload.reference || 'Canje de cereal',
        notes: payload.notes || ''
      }]
    }, user);
    const order = draft.orders[draft.orders.length - 1];
    draft = createGrainMovementTransaction(draft, {
      id: payload.movementId,
      date: payload.date || todayIso(),
      cereal: payload.cereal,
      campaign: payload.campaign,
      locationId: payload.locationId,
      direction: 'out',
      kg,
      movementType: 'grain_barter',
      referenceType: 'order',
      referenceId: order.id,
      description: payload.description || `Canje cereal contra ${document.number}`,
      reason: payload.reason || 'Cancelacion comercial con cereal'
    }, user);
    const instrument = draft.instruments[draft.instruments.length - 1];
    if (instrument) instrument.grainMovementId = draft.grainMovements[draft.grainMovements.length - 1]?.id || '';
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createGrainLiquidationTransaction(state, payload, user) {
    const draft = clone(state);
    ensureGrainCollections(draft);
    const kg = Number(payload.kg || 0);
    const forward = payload.forwardId ? draft.grainForwards.find((item) => item.id === payload.forwardId) : null;
    if (payload.forwardId && !forward) throw new Error('FWD inexistente para liquidacion');
    const contractPrice = forward ? Number(forward.price || 0) : Number(payload.contractPrice ?? payload.price ?? 0);
    const settlementPrice = Number(payload.settlementPrice ?? payload.price ?? contractPrice);
    const currency = forward ? forward.currency : (payload.currency || 'USD');
    const priceDifferenceReason = String(payload.priceDifferenceReason || '').trim();
    if (forward && payload.currency && payload.currency !== forward.currency) throw new Error('La moneda de liquidacion vinculada debe respetar la moneda contractual del FWD');
    if (forward && Math.abs(settlementPrice - contractPrice) > 0.000001 && !priceDifferenceReason) throw new Error('Motivo obligatorio para diferenciar precio liquidado del precio contractual FWD');
    const exchangeRate = payload.exchangeRate == null ? null : Number(payload.exchangeRate || 0);
    const fallbackAmount = (kg / 1000) * settlementPrice;
    const breakdown = documentTotalFromBreakdown(payload, fallbackAmount);
    const amount = Number(breakdown.amount || 0);
    const financialAmount = payload.financialAmount == null ? (exchangeRate ? amount * exchangeRate : null) : Number(payload.financialAmount || 0);
    if (kg <= 0 || amount <= 0) throw new Error('Liquidacion requiere kilos e importe');
    if (grainStockAt(draft, { cereal: payload.cereal, campaign: payload.campaign, locationId: payload.locationId }) + 0.001 < kg) throw new Error('No se puede liquidar mas kilos que el stock disponible');
    if (payload.forwardId && grainForwardPendingKg(draft, payload.forwardId) + 0.001 < kg) throw new Error('Liquidacion excede kilos pendientes del FWD');
    const liquidationId = payload.id || uid('GLIQ');
    const documentId = payload.documentId || uid('DOC');
    const date = payload.date || todayIso();
    const doc = {
      id: documentId,
      type: 'settlement',
      commercialSide: 'sale',
      fiscalStatus: 'documented',
      taxComponents: normalizeTaxComponents(breakdown.taxComponents, { id: documentId, type: 'settlement', commercialSide: 'sale' }),
      entityId: payload.counterpartyEntityId,
      issueDate: date,
      dueDate: payload.dueDate || date,
      number: payload.number || liquidationId,
      amount,
      economicAmount: breakdown.economicAmount,
      currency,
      contractPrice,
      settlementPrice,
      priceDifferenceReason,
      financialAmount,
      financialCurrency: payload.financialCurrency || (financialAmount == null ? '' : 'ARS'),
      exchangeRate,
      activity: 'Agricultura',
      chartAccountId: payload.chartAccountId || 'CA-AGRI',
      description: payload.description || `Liquidacion cereal ${payload.cereal} ${payload.campaign}`,
      cereal: payload.cereal,
      campaign: payload.campaign,
      grainLocationId: payload.locationId,
      grainLiquidationId: liquidationId,
      voidedAt: null
    };
    draft.documents.push(doc);
    draft.grainLiquidations.push({
      id: liquidationId,
      documentId,
      forwardId: payload.forwardId || '',
      cereal: payload.cereal,
      campaign: payload.campaign,
      locationId: payload.locationId,
      counterpartyEntityId: payload.counterpartyEntityId,
      kg,
      price: settlementPrice,
      contractPrice,
      settlementPrice,
      priceDifferenceReason,
      currency,
      netTaxedAmount: payload.netTaxedAmount == null || payload.netTaxedAmount === '' ? null : Number(payload.netTaxedAmount || 0),
      vatRate: payload.vatRate == null || payload.vatRate === '' ? null : Number(payload.vatRate || 0),
      vatAmount: payload.vatAmount == null || payload.vatAmount === '' ? null : Number(payload.vatAmount || 0),
      commissionPercent: payload.commissionPercent == null || payload.commissionPercent === '' ? null : Number(payload.commissionPercent || 0),
      commissions: Number(payload.commissions || 0),
      commissionVat: Number(payload.commissionVat || 0),
      withholdingVat: Number(payload.withholdingVat || 0),
      withholdingIncomeTax: Number(payload.withholdingIncomeTax || 0),
      withholdingIibb: Number(payload.withholdingIibb || 0),
      otherDeductions: Number(payload.otherDeductions || payload.otherExpenses || 0),
      totalAmount: amount,
      paymentMethodPlanned: payload.paymentMethodPlanned || '',
      financialCondition: payload.financialCondition || 'pending',
      exchangeRate,
      financialAmount,
      financialCurrency: doc.financialCurrency,
      date,
      description: payload.description || ''
    });
    draft.grainMovements.push({ id: payload.movementId || uid('GM'), date, cereal: payload.cereal, campaign: payload.campaign, locationId: payload.locationId, direction: 'out', kg, movementType: 'liquidation', referenceType: 'document', referenceId: documentId, description: doc.description });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainLiquidation', entityId: liquidationId, action: 'create-grain-liquidation', changes: [{ field: 'kg', from: null, to: kg }, { field: 'amount', from: null, to: amount }], createdAt: new Date().toISOString(), reason: payload.reason || 'Liquidacion de cereal', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function correctHistoricalGrainLiquidationTransaction(state, id, changes, user) {
    const draft = clone(state);
    const liquidation = (draft.grainLiquidations || []).find((item) => item.id === id);
    const doc = liquidation && draft.documents.find((item) => item.id === liquidation.documentId);
    if (!liquidation || !doc || doc.voidedAt || doc.type !== 'settlement' || doc.grainLiquidationId !== id || liquidation.counterpartyEntityId !== doc.entityId || liquidation.currency !== doc.currency) {
      throw new Error('Liquidacion y documento origen no tienen una relacion univoca');
    }
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para corregir la liquidacion');
    const fields = ['netTaxedAmount', 'vatAmount', 'commissionPercent', 'commissions', 'commissionVat', 'adminExpenses', 'stampTax', 'laboratoryFees', 'guides', 'senasa', 'controlDelivery', 'bath', 'withholdingVat', 'withholdingIncomeTax', 'withholdingIibb', 'otherDeductions', 'otherExpenses', 'perceptionVat', 'perceptionIibb'];
    if (Object.keys(changes).some((field) => ![...fields, 'vatCondition', 'totalAmount', 'reason'].includes(field))) throw new Error('Campo economico de liquidacion no editable');
    const cents = (value) => {
      const number = Number(value ?? 0);
      if (!Number.isFinite(number) || number < 0 || Math.abs(number * 100 - Math.round(number * 100)) > 0.0001) throw new Error('Componentes de liquidacion invalidos: usar importes positivos con centavos');
      return Math.round(number * 100);
    };
    const oldAmount = cents(doc.amount);
    if (liquidation.totalAmount != null && cents(liquidation.totalAmount) !== oldAmount) throw new Error('Total de liquidacion y documento no coincide; requiere revision manual');
    for (const record of [doc, liquidation]) {
      if (record.financialAmount != null && (record.financialCurrency || record.currency) !== doc.currency) throw new Error('Equivalente financiero en otra moneda: correccion ambigua');
      if (record.financialAmount != null && cents(record.financialAmount) !== oldAmount) throw new Error('Equivalente financiero historico distinto: correccion ambigua');
    }
    const links = draft.orderDocuments.filter((item) => item.documentId === doc.id);
    if (links.length > 1 || links.some((item) => item.voidedAt)) throw new Error('Liquidacion aplicada a multiples ordenes o con historia anulada: correccion ambigua');
    const link = links[0];
    if (link) {
      const order = draft.orders.find((item) => item.id === link.orderId);
      if (!order || order.voidedAt || order.type !== 'collection' || order.entityId !== doc.entityId || order.currency !== doc.currency || cents(link.amountApplied) !== oldAmount || draft.orderDocuments.some((item) => item.orderId === order.id && item.id !== link.id)) {
        throw new Error('La OC no aplica exclusivamente el total original de esta liquidacion');
      }
      if (draft.orderInstruments.some((item) => item.orderId === order.id) || draft.orderDocumentSettlements.some((item) => item.orderDocumentId === link.id) || [...(draft.orderTaxWithholdings || []), ...(draft.orderPracticedWithholdings || [])].some((item) => item.orderId === order.id || item.orderDocumentId === link.id)) {
        throw new Error('La OC tiene instrumentos, settlements o retenciones historicas; correccion bloqueada');
      }
    }
    const condition = changes.vatCondition ?? (liquidation.vatRate == null ? '' : String(liquidation.vatRate));
    if (!['', '0', '10.5', '21', 'exempt', 'not_taxed'].includes(String(condition))) throw new Error('Condicion de IVA no admitida');
    const values = Object.fromEntries(fields.map((field) => [field, cents(changes[field] ?? (field === 'netTaxedAmount' ? liquidation[field] ?? doc.economicAmount : liquidation[field])) / 100]));
    if (values.netTaxedAmount <= 0) throw new Error('Neto de liquidacion invalido');
    if (values.commissionPercent > 100) throw new Error('Porcentaje de comision invalido');
    const vatRate = condition === '' || condition === 'exempt' || condition === 'not_taxed' ? null : Number(condition);
    const expectedVat = vatRate == null ? 0 : Math.round(values.netTaxedAmount * vatRate + Number.EPSILON) / 100;
    const vatAmount = changes.vatAmount == null ? expectedVat : values.vatAmount;
    if ((vatRate != null && Math.abs(cents(vatAmount) - cents(expectedVat)) > 1) || ((condition === 'exempt' || condition === 'not_taxed') && cents(vatAmount) !== 0)) throw new Error('El IVA no coincide con la alicuota/condicion seleccionada');
    values.vatAmount = vatAmount;
    const breakdown = documentTotalFromBreakdown({
      ...values,
      netTaxedAmount: condition === 'exempt' || condition === 'not_taxed' ? 0 : values.netTaxedAmount,
      exemptAmount: condition === 'exempt' ? values.netTaxedAmount : 0,
      notTaxedAmount: condition === 'not_taxed' ? values.netTaxedAmount : 0,
      vatRate
    }, values.netTaxedAmount);
    const amount = Math.round(breakdown.amount * 100) / 100;
    if (amount <= 0 || Math.abs(breakdown.amount - amount) > 0.0001) throw new Error('El total a cobrar no reconcilia con sus componentes');
    if (changes.totalAmount != null && cents(changes.totalAmount) !== cents(amount)) throw new Error('El total indicado no coincide con el desglose de la liquidacion');
    const auditChanges = [];
    const update = (record, field, value) => {
      if (JSON.stringify(record[field] ?? null) === JSON.stringify(value ?? null)) return;
      auditChanges.push({ recordId: record.id, field, from: record[field] ?? null, to: value });
      record[field] = value;
    };
    fields.forEach((field) => update(liquidation, field, values[field]));
    update(liquidation, 'vatRate', vatRate);
    update(liquidation, 'totalAmount', amount);
    if (liquidation.financialAmount != null) update(liquidation, 'financialAmount', amount);
    update(doc, 'amount', amount);
    update(doc, 'economicAmount', Math.round(breakdown.economicAmount * 100) / 100);
    const previousComponents = [...(doc.taxComponents || [])];
    const usedIds = new Set();
    const components = normalizeTaxComponents(breakdown.taxComponents, doc).map((component) => {
      const match = previousComponents.find((item) => item.taxType === component.taxType && !usedIds.has(item.id));
      component.id = match?.id || uid('TAX');
      usedIds.add(component.id);
      return component;
    });
    update(doc, 'taxComponents', components);
    if (doc.financialAmount != null) update(doc, 'financialAmount', amount);
    if (link) update(link, 'amountApplied', amount);
    if (!auditChanges.length) throw new Error('La correccion no contiene cambios');
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'grainLiquidation', entityId: id, action: 'correct-historical-grain-liquidation', changes: auditChanges, createdAt: new Date().toISOString(), reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function ensureLivestockCollections(draft) {
    draft.livestockLocations ||= [];
    draft.livestockHerds ||= [];
    draft.livestockMovements ||= [];
    draft.livestockTrades ||= [];
    draft.livestockWeighings ||= [];
    draft.livestockReferencePrices ||= [];
  }

  function livestockLocationName(state, id) {
    return (state.livestockLocations || []).find((location) => location.id === id)?.name || id || '';
  }

  function livestockHerdName(state, id) {
    return (state.livestockHerds || []).find((herd) => herd.id === id)?.name || id || '';
  }

  function livestockSignedHeads(movement) {
    return movement.direction === 'in' ? Number(movement.heads || 0) : -Number(movement.heads || 0);
  }

  function livestockStockRows(state, filters) {
    const f = filters || {};
    const map = new Map();
    (state.livestockMovements || [])
      .filter((movement) => !movement.voidedAt)
      .filter((movement) => !f.date || movement.date <= f.date)
      .filter((movement) => !f.category || movement.category === f.category)
      .filter((movement) => !f.herdId || movement.herdId === f.herdId)
      .filter((movement) => !f.locationId || movement.locationId === f.locationId)
      .forEach((movement) => {
        const key = `${movement.category}|${movement.herdId}|${movement.locationId}`;
        if (!map.has(key)) {
          map.set(key, {
            category: movement.category,
            herdId: movement.herdId,
            herdName: livestockHerdName(state, movement.herdId),
            locationId: movement.locationId,
            locationName: livestockLocationName(state, movement.locationId),
            headsIn: 0,
            headsOut: 0,
            balanceHeads: 0
          });
        }
        const row = map.get(key);
        if (movement.direction === 'in') row.headsIn += Number(movement.heads || 0);
        else row.headsOut += Number(movement.heads || 0);
        row.balanceHeads += livestockSignedHeads(movement);
      });
    return Array.from(map.values()).sort((a, b) => `${a.category}-${a.herdName}-${a.locationName}`.localeCompare(`${b.category}-${b.herdName}-${b.locationName}`));
  }

  function livestockStockAt(state, filters) {
    return livestockStockRows(state, filters).reduce((total, row) => total + row.balanceHeads, 0);
  }

  function livestockMovementHistory(state, filters) {
    const f = filters || {};
    let balanceHeads = 0;
    return (state.livestockMovements || [])
      .filter((movement) => !f.herdId || movement.herdId === f.herdId)
      .filter((movement) => !f.category || movement.category === f.category)
      .filter((movement) => !f.locationId || movement.locationId === f.locationId)
      .sort((a, b) => {
        const key = (row) => `${row.date}-${row.movementType === 'category_change' ? `${row.referenceId}-${row.direction === 'out' ? 0 : 1}` : row.id}`;
        return key(a).localeCompare(key(b));
      })
      .map((movement) => {
        const headsIn = !movement.voidedAt && movement.direction === 'in' ? Number(movement.heads || 0) : 0;
        const headsOut = !movement.voidedAt && movement.direction === 'out' ? Number(movement.heads || 0) : 0;
        balanceHeads += headsIn - headsOut;
        return { ...movement, headsIn, headsOut, balanceHeads, herdName: livestockHerdName(state, movement.herdId), locationName: livestockLocationName(state, movement.locationId), referenceLabel: livestockReferenceLabel(state, movement) };
      });
  }

  function livestockReferenceLabel(state, movement) {
    if (movement.referenceType === 'document') {
      const doc = state.documents.find((item) => item.id === movement.referenceId);
      return doc ? doc.number : movement.referenceId;
    }
    return movement.referenceId || movement.description || '';
  }

  function livestockWeighingRows(state, filters) {
    const f = filters || {};
    return (state.livestockWeighings || [])
      .filter((weighing) => !f.date || weighing.date <= f.date)
      .filter((weighing) => !f.herdId || weighing.herdId === f.herdId)
      .filter((weighing) => !f.category || weighing.category === f.category)
      .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`))
      .map((weighing) => ({
        ...weighing,
        averageWeightKg: weighing.averageWeightKg == null ? Number(weighing.totalKg || 0) / Number(weighing.heads || 1) : Number(weighing.averageWeightKg || 0)
      }));
  }

  function latestLivestockWeighing(state, filters) {
    const f = filters || {};
    const inherited = (state.livestockMovements || [])
      .filter((movement) => !movement.voidedAt && movement.direction === 'in' && movement.weightSourceWeighingId)
      .filter((movement) => (!f.herdId || movement.herdId === f.herdId) && (!f.category || movement.category === f.category) && (!f.date || movement.date <= f.date))
      .map((movement) => ({ weighing: (state.livestockWeighings || []).find((weighing) => weighing.id === movement.weightSourceWeighingId), effectiveDate: movement.date }))
      .filter((item) => item.weighing);
    const measured = livestockWeighingRows(state, f).map((weighing) => ({ weighing, effectiveDate: weighing.date }));
    return [...measured, ...inherited].sort((a, b) => `${b.effectiveDate}-${b.weighing.id}`.localeCompare(`${a.effectiveDate}-${a.weighing.id}`))[0]?.weighing || null;
  }

  function livestockGmd(state, herdId, fromWeighingId, toWeighingId) {
    const rows = livestockWeighingRows(state, { herdId });
    const from = rows.find((row) => row.id === fromWeighingId);
    const to = rows.find((row) => row.id === toWeighingId);
    const notComparable = (reason) => ({ calculable: false, reason: reason || 'Pesadas no comparables automaticamente', gmd: null });
    if (!from || !to) return notComparable('Pesada inexistente');
    if (from.herdId !== to.herdId) return notComparable('Pesadas no comparables automaticamente');
    if (from.category !== to.category) return notComparable('Pesadas de categorias distintas no comparables automaticamente');
    if (from.date >= to.date) return notComparable('La fecha final debe ser posterior');
    if (Number(from.heads || 0) !== Number(to.heads || 0)) return notComparable('Pesadas no comparables automaticamente');
    if (from.condition && to.condition && from.condition !== to.condition) return notComparable('Pesadas no comparables automaticamente');
    const days = Math.max((new Date(`${to.date}T00:00:00Z`) - new Date(`${from.date}T00:00:00Z`)) / 86400000, 0);
    if (!days) return notComparable('La fecha final debe ser posterior');
    return { calculable: true, reason: '', herdId, fromDate: from.date, toDate: to.date, fromHeads: from.heads, toHeads: to.heads, condition: from.condition || to.condition || '', fromAverageWeightKg: from.averageWeightKg, toAverageWeightKg: to.averageWeightKg, days, gmd: (to.averageWeightKg - from.averageWeightKg) / days };
  }

  function latestLivestockReferencePrice(state, category) {
    return (state.livestockReferencePrices || [])
      .filter((price) => !category || price.category === category)
      .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`))[0] || null;
  }

  function livestockSummary(state, filters) {
    const rows = livestockStockRows(state, filters).map((row) => {
      const weighing = latestLivestockWeighing(state, { herdId: row.herdId, category: row.category });
      const price = latestLivestockReferencePrice(state, row.category);
      const liveWeightKg = weighing ? row.balanceHeads * weighing.averageWeightKg : null;
      const estimatedValuation = liveWeightKg != null && price ? liveWeightKg * Number(price.pricePerKg || 0) : null;
      return { ...row, lastAverageWeightKg: weighing?.averageWeightKg ?? null, lastWeighingDate: weighing?.date || '', liveWeightKg, estimatedValuation, valuationCurrency: price?.currency || '' };
    });
    const totalHeads = rows.reduce((total, row) => total + row.balanceHeads, 0);
    const liveWeightKg = rows.reduce((total, row) => total + Number(row.liveWeightKg || 0), 0);
    const valuationByCurrency = {};
    rows.forEach((row) => {
      if (row.estimatedValuation != null && row.valuationCurrency) valuationByCurrency[row.valuationCurrency] = (valuationByCurrency[row.valuationCurrency] || 0) + row.estimatedValuation;
    });
    const byCategory = LIVESTOCK_CATEGORIES.map((category) => ({ category, heads: rows.filter((row) => row.category === category).reduce((total, row) => total + row.balanceHeads, 0) })).filter((row) => row.heads);
    return { rows, totalHeads, liveWeightKg, valuationByCurrency, byCategory };
  }

  function createLivestockLocationTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre de ubicacion obligatorio');
    const id = payload.id || uid('LLOC');
    draft.livestockLocations.push({ id, name, active: payload.active !== false, notes: payload.notes || '' });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockLocation', entityId: id, action: 'create-livestock-location', changes: [{ field: 'name', from: null, to: name }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta ubicacion hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateLivestockLocationTransaction(state, id, changes, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const location = draft.livestockLocations.find((item) => item.id === id);
    if (!location) throw new Error('Ubicacion de hacienda inexistente');
    const auditChanges = [];
    ['name', 'notes', 'active'].forEach((field) => {
      if (changes[field] == null) return;
      const next = field === 'active' ? changes[field] !== false : String(changes[field]).trim();
      if (field === 'name' && !next) throw new Error('Nombre de ubicacion obligatorio');
      if (location[field] !== next) {
        auditChanges.push({ field, from: location[field] ?? '', to: next });
        location[field] = next;
      }
    });
    if (!auditChanges.length) return state;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockLocation', entityId: id, action: 'update-livestock-location', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason || 'Actualizacion de ubicacion hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockHerdTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre de tropa obligatorio');
    if (!LIVESTOCK_CATEGORIES.includes(payload.category)) throw new Error('Categoria de hacienda invalida');
    if (!draft.livestockLocations.some((location) => location.id === payload.locationId)) throw new Error('Ubicacion de hacienda inexistente');
    const id = payload.id || uid('LHERD');
    draft.livestockHerds.push({ id, name, category: payload.category, locationId: payload.locationId, startDate: payload.startDate || todayIso(), status: payload.status || 'active', notes: payload.notes || '' });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockHerd', entityId: id, action: 'create-livestock-herd', changes: [{ field: 'name', from: null, to: name }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta tropa hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateLivestockHerdTransaction(state, id, changes, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const herd = draft.livestockHerds.find((item) => item.id === id);
    if (!herd) throw new Error('Tropa inexistente');
    const allowed = ['name', 'locationId', 'notes', 'status'];
    const auditChanges = [];
    allowed.forEach((field) => {
      if (changes[field] == null) return;
      const next = String(changes[field]).trim();
      if (field === 'name' && !next) throw new Error('Nombre de tropa obligatorio');
      if (field === 'locationId' && next && !draft.livestockLocations.some((location) => location.id === next)) throw new Error('Ubicacion de hacienda inexistente');
      if (field === 'status' && next && !['active', 'inactive'].includes(next)) throw new Error('Estado de tropa invalido');
      if (herd[field] !== next) {
        auditChanges.push({ field, from: herd[field] || '', to: next });
        herd[field] = next;
      }
    });
    if (!auditChanges.length) return state;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockHerd', entityId: id, action: 'update-livestock-herd', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason || 'Actualizacion de tropa', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockTradeTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const type = payload.type;
    if (!['purchase', 'sale'].includes(type)) throw new Error('Operacion de hacienda invalida');
    const heads = Number(payload.heads || 0);
    const totalKg = Number(payload.totalKg || 0);
    const pricePerKg = Number(payload.pricePerKg || 0);
    if (heads <= 0 || totalKg <= 0 || pricePerKg <= 0) throw new Error('Compra/venta requiere cabezas, kilos y precio por kg');
    const fallbackAmount = totalKg * pricePerKg;
    const breakdown = calculateLivestockTradeBreakdown(payload);
    const amount = Number(breakdown.amount || 0);
    const statedTotal = payload.amount ?? payload.totalAmount;
    if (statedTotal != null && statedTotal !== '' && Math.abs(amount - Number(statedTotal)) > 0.01) throw new Error('Total de hacienda no reconcilia con sus componentes');
    if (type === 'sale' && livestockStockAt(draft, { herdId: payload.herdId, category: payload.category, locationId: payload.locationId }) + 0.001 < heads) throw new Error('No se puede vender mas cabezas que el stock disponible');
    const tradeId = payload.id || uid('LTR');
    const documentId = payload.documentId || uid('DOC');
    const date = payload.date || todayIso();
    const direction = type === 'purchase' ? 'in' : 'out';
    const doc = {
      id: documentId,
      type: type === 'purchase' ? 'purchase_invoice' : 'settlement',
      commercialSide: type === 'purchase' ? 'purchase' : 'sale',
      fiscalStatus: 'documented',
      taxComponents: normalizeTaxComponents(breakdown.taxComponents, { id: documentId, type: type === 'purchase' ? 'purchase_invoice' : 'settlement', commercialSide: type === 'purchase' ? 'purchase' : 'sale' }),
      entityId: payload.counterpartyEntityId,
      issueDate: date,
      dueDate: payload.dueDate || date,
      number: payload.number || tradeId,
      amount,
      economicAmount: breakdown.economicAmount,
      currency: payload.currency || 'ARS',
      activity: 'Ganaderia',
      chartAccountId: payload.chartAccountId || (type === 'sale' ? 'CA-GAN-VENTAS' : 'CA-GAN-COMPRA-HACIENDA'),
      description: payload.description || `${type === 'purchase' ? 'Compra' : 'Venta'} hacienda ${payload.category}`,
      livestockTradeId: tradeId,
      herdId: payload.herdId,
      livestockCategory: payload.category,
      livestockLocationId: payload.locationId,
      heads,
      totalKg,
      pricePerKg,
      voidedAt: null
    };
    draft.documents.push(doc);
    draft.livestockTrades.push({
      id: tradeId,
      documentId,
      type,
      date,
      herdId: payload.herdId,
      locationId: payload.locationId,
      category: payload.category,
      heads,
      totalKg,
      pricePerKg,
      amount,
      economicAmount: breakdown.economicAmount,
      currency: doc.currency,
      counterpartyEntityId: payload.counterpartyEntityId,
      netTaxedAmount: payload.netTaxedAmount == null || payload.netTaxedAmount === '' ? null : Number(payload.netTaxedAmount || 0),
      vatRate: payload.vatRate == null || payload.vatRate === '' ? null : Number(payload.vatRate || 0),
      vatAmount: payload.vatAmount == null || payload.vatAmount === '' ? null : Number(payload.vatAmount || 0),
      commissionPercent: payload.commissionPercent == null || payload.commissionPercent === '' ? null : Number(payload.commissionPercent || 0),
      commissions: Number(payload.commissions || 0),
      commissionVat: Number(payload.commissionVat || 0),
      guides: Number(payload.guides || 0),
      senasa: Number(payload.senasa || 0),
      controlDelivery: Number(payload.controlDelivery || 0),
      bath: Number(payload.bath || 0),
      adminExpenses: Number(payload.adminExpenses || 0),
      stampTax: Number(payload.stampTax || 0),
      laboratoryFees: Number(payload.laboratoryFees || 0),
      withholdingVat: Number(payload.withholdingVat || 0),
      withholdingIncomeTax: Number(payload.withholdingIncomeTax || 0),
      withholdingIibb: Number(payload.withholdingIibb || 0),
      otherExpenses: Number(payload.otherExpenses || 0),
      otherDeductions: Number(payload.otherDeductions || 0),
      totalAmount: amount,
      paymentMethodPlanned: payload.paymentMethodPlanned || '',
      financialCondition: payload.financialCondition || 'pending',
      description: payload.description || ''
    });
    draft.livestockMovements.push({ id: payload.movementId || uid('LMOV'), date, movementType: type, herdId: payload.herdId, locationId: payload.locationId, category: payload.category, direction, heads, referenceType: 'document', referenceId: documentId, description: doc.description });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockTrade', entityId: tradeId, action: `create-livestock-${type}`, changes: [{ field: 'heads', from: null, to: heads }, { field: 'amount', from: null, to: amount }], createdAt: new Date().toISOString(), reason: payload.reason || 'Operacion hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function livestockPurchaseCategoryCorrectionInfo(state, id) {
    const trade = (state.livestockTrades || []).find((item) => item.id === id);
    if (!trade || trade.type !== 'purchase') throw new Error('Compra de hacienda inexistente');
    const doc = state.documents.find((item) => item.id === trade.documentId);
    if (!doc || doc.voidedAt || trade.voidedAt) throw new Error('Compra o documento inexistente/anulado');
    const owners = (state.livestockTrades || []).filter((item) => item.documentId === doc.id);
    const rows = (state.livestockMovements || []).filter((row) => row.referenceType === 'document' && row.referenceId === doc.id);
    if (owners.length !== 1 || (doc.livestockTradeId && doc.livestockTradeId !== id)
      || (doc.livestockCategory && doc.livestockCategory !== trade.category)
      || (doc.herdId && doc.herdId !== trade.herdId)
      || (doc.livestockLocationId && doc.livestockLocationId !== trade.locationId)
      || (doc.heads != null && Number(doc.heads) !== Number(trade.heads))
      || !rows.length || rows.some((row) => row.voidedAt || row.movementType !== 'purchase' || row.direction !== 'in'
        || row.category !== trade.category || row.herdId !== trade.herdId || row.locationId !== trade.locationId || row.date !== trade.date)
      || rows.reduce((sum, row) => sum + Number(row.heads), 0) !== Number(trade.heads)) {
      throw new Error('Relacion compra/documento/movimientos ambigua; no se reasigna automaticamente');
    }
    assertCorrectionDate(trade.date);
    const ownIds = new Set(rows.map((row) => row.id));
    const mayFollowPurchase = (row) => {
      try { assertCorrectionDate(row.date); } catch { return true; }
      return row.date >= trade.date;
    };
    // There are no individual animal IDs: a later outflow cannot be assigned to another purchase safely.
    const dependents = (state.livestockMovements || []).filter((row) => !row.voidedAt && !ownIds.has(row.id)
      && mayFollowPurchase(row) && row.herdId === trade.herdId && row.category === trade.category
      && (row.direction === 'out' || ['transfer', 'category_change'].includes(row.movementType)));
    const blockers = dependents.map((row) => {
      const relatedDoc = row.referenceType === 'document' ? state.documents.find((item) => item.id === row.referenceId) : null;
      return `Movimiento ${row.id} (${labelForType(`livestock_${row.movementType}`)}, ${row.date || 'sin fecha comprobable'}, ${row.heads} cabezas${relatedDoc ? `, ${relatedDoc.number || relatedDoc.id}` : ''})`;
    });
    (state.livestockTrades || []).filter((item) => !item.voidedAt && item.type === 'sale' && mayFollowPurchase(item)
      && item.herdId === trade.herdId && item.category === trade.category
      && !dependents.some((row) => row.referenceType === 'document' && row.referenceId === item.documentId))
      .forEach((item) => blockers.push(`Venta ${item.id} (${item.date}, ${item.heads} cabezas)`));
    (state.livestockWeighings || []).filter((row) => !row.voidedAt && row.herdId === trade.herdId && mayFollowPurchase(row))
      .forEach((row) => blockers.push(`Pesada ${row.id} (${row.date}, ${row.category || 'categoria no identificada'})`));
    return { trade, document: doc, movements: rows, blockers };
  }

  function correctHistoricalLivestockPurchaseCategoryTransaction(state, id, changes, user) {
    if (Object.keys(changes || {}).some((field) => !['category', 'reason'].includes(field))) throw new Error('Solo se permite corregir categoria y motivo de la compra');
    const reason = String(changes?.reason || '').trim();
    if (!reason) throw new Error('Motivo de la correccion obligatorio');
    if (!LIVESTOCK_CATEGORIES.includes(changes.category)) throw new Error('Categoria de hacienda invalida');
    const draft = clone(state);
    const { trade, document: doc, movements, blockers } = livestockPurchaseCategoryCorrectionInfo(draft, id);
    if (changes.category === trade.category) throw new Error('La categoria indicada no contiene cambios');
    if (blockers.length) throw new Error(`No se puede corregir la categoria historica: ${blockers.join('; ')}. No se reasignan movimientos posteriores automaticamente.`);
    const before = clone(movements);
    const auditChanges = [
      { recordId: trade.id, field: 'category', from: trade.category, to: changes.category },
      { recordId: doc.id, field: 'livestockCategory', from: doc.livestockCategory ?? null, to: changes.category },
      ...movements.map((row) => ({ recordId: row.id, field: 'category', from: row.category, to: changes.category }))
    ];
    trade.category = doc.livestockCategory = changes.category;
    movements.forEach((row) => { row.category = changes.category; });
    assertLivestockPhysicalStock(draft, [...before, ...movements]);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockTrade', entityId: id,
      action: 'correct-historical-livestock-purchase-category', changes: auditChanges,
      reason, user: user || 'local', createdAt: new Date().toISOString() });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockBirthTransaction(state, payload, user) {
    return createLivestockPhysicalMovement(state, { ...payload, movementType: 'birth', direction: 'in' }, user);
  }

  function createLivestockDeathTransaction(state, payload, user) {
    if (!String(payload.cause || '').trim()) throw new Error('Causa de muerte/baja obligatoria');
    return createLivestockPhysicalMovement(state, { ...payload, movementType: 'death', direction: 'out' }, user);
  }

  function createLivestockPhysicalMovement(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const heads = Number(payload.heads || 0);
    if (heads <= 0) throw new Error('Cabezas invalidas');
    if (payload.direction === 'out' && livestockStockAt(draft, { herdId: payload.herdId, category: payload.category, locationId: payload.locationId }) + 0.001 < heads) throw new Error('No hay stock suficiente de hacienda');
    const id = payload.id || uid('LMOV');
    draft.livestockMovements.push({ id, date: payload.date || todayIso(), movementType: payload.movementType, herdId: payload.herdId, locationId: payload.locationId, category: payload.category, direction: payload.direction, heads, cause: payload.cause || '', referenceType: payload.referenceType || payload.movementType, referenceId: payload.referenceId || id, description: payload.description || payload.notes || '' });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockMovement', entityId: id, action: `create-livestock-${payload.movementType}`, changes: [{ field: 'heads', from: null, to: heads }], createdAt: new Date().toISOString(), reason: payload.reason || 'Movimiento fisico hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockTransferTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const heads = Number(payload.heads || 0);
    if (heads <= 0) throw new Error('Cabezas invalidas en traslado');
    if (livestockStockAt(draft, { herdId: payload.originHerdId, category: payload.originCategory, locationId: payload.originLocationId }) + 0.001 < heads) throw new Error('No hay stock suficiente para traslado');
    const id = payload.id || uid('LMOVE');
    const date = payload.date || todayIso();
    draft.livestockMovements.push(
      { id: `${id}-OUT`, date, movementType: payload.movementType || 'transfer', herdId: payload.originHerdId, locationId: payload.originLocationId, category: payload.originCategory, direction: 'out', heads, referenceType: payload.movementType || 'transfer', referenceId: id, description: payload.description || '' },
      { id: `${id}-IN`, date, movementType: payload.movementType || 'transfer', herdId: payload.destinationHerdId || payload.originHerdId, locationId: payload.destinationLocationId || payload.originLocationId, category: payload.destinationCategory || payload.originCategory, direction: 'in', heads, referenceType: payload.movementType || 'transfer', referenceId: id, description: payload.description || '' }
    );
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockMovement', entityId: id, action: `create-livestock-${payload.movementType || 'transfer'}`, changes: [{ field: 'heads', from: null, to: heads }], createdAt: new Date().toISOString(), reason: payload.reason || 'Traslado/cambio categoria hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function livestockCategoryChange(state, id) {
    const rows = (state.livestockMovements || []).filter((row) => row.movementType === 'category_change' && row.referenceId === id);
    const origin = rows.find((row) => row.direction === 'out'), destination = rows.find((row) => row.direction === 'in');
    if (rows.length !== 2 || !origin || !destination || origin.heads !== destination.heads || origin.date !== destination.date || origin.category === destination.category || Boolean(origin.voidedAt) !== Boolean(destination.voidedAt)) throw new Error('Cambio de categoria inexistente o ambiguo');
    return { id, origin, destination, voidedAt: origin.voidedAt || null };
  }

  function assertLivestockPhysicalStock(state, affected) {
    const keys = new Set(affected.map((row) => `${row.herdId}|${row.category}|${row.locationId}`));
    for (const key of keys) {
      const daily = new Map();
      (state.livestockMovements || []).filter((row) => !row.voidedAt && `${row.herdId}|${row.category}|${row.locationId}` === key).forEach((row) => {
        daily.set(row.date, (daily.get(row.date) || 0) + livestockSignedHeads(row));
      });
      let balance = 0;
      // The physical model stores days, not times: reconcile each day's closing stock.
      for (const [date, heads] of [...daily].sort(([a], [b]) => a.localeCompare(b))) {
        balance += heads;
        if (balance < -0.001) throw new Error(`El cambio deja stock negativo: ${key} al ${date}`);
      }
    }
  }

  function livestockCategoryChangePayload(state, payload) {
    const date = payload.date || todayIso();
    assertCorrectionDate(date);
    const heads = Number(payload.heads);
    if (!Number.isSafeInteger(heads) || heads <= 0) throw new Error('Cabezas invalidas: ingrese una cantidad entera positiva');
    const destinationHerdId = payload.destinationHerdId || payload.originHerdId;
    for (const id of [payload.originHerdId, destinationHerdId]) {
      if (!(state.livestockHerds || []).some((herd) => herd.id === id && herd.status !== 'inactive')) throw new Error('Tropa inexistente o inactiva');
    }
    const locationId = payload.locationId;
    if (!(state.livestockLocations || []).some((location) => location.id === locationId && location.active !== false)) throw new Error('Ubicacion de hacienda inexistente o inactiva');
    if (![payload.originCategory, payload.destinationCategory].every((category) => LIVESTOCK_CATEGORIES.includes(category))) throw new Error('Categoria de hacienda invalida');
    if (payload.originCategory === payload.destinationCategory) throw new Error('La categoria destino debe ser distinta del origen');
    const stock = livestockStockAt(state, { herdId: payload.originHerdId, category: payload.originCategory, locationId, date });
    if (heads > stock) throw new Error('No hay stock suficiente para cambio de categoria en esa fecha');
    return { date, heads, originHerdId: payload.originHerdId, destinationHerdId, locationId, originCategory: payload.originCategory, destinationCategory: payload.destinationCategory, description: String(payload.description || '').trim() };
  }

  function applyLivestockCategoryChange(state, id, payload, rows) {
    const normalized = livestockCategoryChangePayload(state, payload);
    const { date, heads, originHerdId, destinationHerdId, locationId, originCategory, destinationCategory, description } = normalized;
    const available = livestockStockAt(state, { herdId: originHerdId, category: originCategory, locationId, date });
    const destinationStock = livestockStockAt(state, { herdId: destinationHerdId, category: destinationCategory, locationId, date });
    const weighing = latestLivestockWeighing(state, { herdId: originHerdId, category: originCategory, date });
    const sameAnimals = heads === available && heads === livestockStockAt(state, { herdId: originHerdId, date }) && heads === weighing?.heads && destinationStock === 0;
    const common = { date, heads, movementType: 'category_change', referenceType: 'category_change', referenceId: id, description, locationId };
    const next = [
      { ...common, id: rows?.origin.id || `${id}-OUT`, direction: 'out', herdId: originHerdId, category: originCategory },
      { ...common, id: rows?.destination.id || `${id}-IN`, direction: 'in', herdId: destinationHerdId, category: destinationCategory,
        ...(sameAnimals ? { weightSourceWeighingId: weighing.id } : {}) }
    ];
    if (rows) {
      // Both old legs are temporarily inactive only on the private draft while checking availability.
      [rows.origin, rows.destination].forEach((row) => { delete row.voidedAt; delete row.weightSourceWeighingId; });
      Object.assign(rows.origin, next[0]); Object.assign(rows.destination, next[1]);
    } else state.livestockMovements.push(...next);
    return rows ? [rows.origin, rows.destination] : next;
  }

  function finishLivestockCategoryChange(draft, id, before, after, affected, action, reason, user) {
    assertLivestockPhysicalStock(draft, affected);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockCategoryChange', entityId: id, action,
      changes: [{ field: 'movements', from: before, to: clone(after) }], reason, user: user || 'local', createdAt: new Date().toISOString() });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockCategoryChangeTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const id = payload.id || uid('LCAT');
    if (draft.livestockMovements.some((row) => row.referenceId === id || [`${id}-IN`, `${id}-OUT`].includes(row.id))) throw new Error('Cambio de categoria ya registrado');
    const rows = applyLivestockCategoryChange(draft, id, payload);
    return finishLivestockCategoryChange(draft, id, null, rows, rows, 'create-livestock-category-change', payload.reason || 'Recategorizacion fisica de hacienda', user);
  }

  function updateLivestockCategoryChangeTransaction(state, id, changes, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const pair = livestockCategoryChange(draft, id);
    if (pair.voidedAt) throw new Error('No se corrige un cambio de categoria anulado');
    if (pair.origin.locationId !== pair.destination.locationId) throw new Error('Cambio legado combina ubicacion y categoria; requiere correccion especifica');
    if (!String(changes.reason || '').trim()) throw new Error('Motivo de correccion obligatorio');
    const allowed = ['date', 'heads', 'originHerdId', 'destinationHerdId', 'locationId', 'originCategory', 'destinationCategory', 'description', 'reason'];
    if (Object.keys(changes).some((key) => !allowed.includes(key))) throw new Error('Campo no permitido en cambio de categoria');
    const before = clone([pair.origin, pair.destination]);
    pair.origin.voidedAt = pair.destination.voidedAt = new Date().toISOString();
    const rows = applyLivestockCategoryChange(draft, id, {
      date: before[0].date, heads: before[0].heads, originHerdId: before[0].herdId, destinationHerdId: before[1].herdId,
      locationId: before[0].locationId, originCategory: before[0].category, destinationCategory: before[1].category,
      description: before[0].description, ...changes
    }, pair);
    return finishLivestockCategoryChange(draft, id, before, rows, [...before, ...rows], 'update-livestock-category-change', changes.reason, user);
  }

  function voidLivestockCategoryChangeTransaction(state, id, reason, user) {
    if (!String(reason || '').trim()) throw new Error('Motivo de anulacion obligatorio');
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const pair = livestockCategoryChange(draft, id);
    if (pair.voidedAt) throw new Error('Cambio de categoria ya anulado');
    const before = clone([pair.origin, pair.destination]);
    pair.origin.voidedAt = pair.destination.voidedAt = new Date().toISOString();
    pair.origin.voidReason = pair.destination.voidReason = String(reason).trim();
    return finishLivestockCategoryChange(draft, id, before, [pair.origin, pair.destination], before, 'void-livestock-category-change', reason, user);
  }

  function createLivestockWeighingTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const heads = Number(payload.heads || 0);
    const totalKg = payload.totalKg == null ? null : Number(payload.totalKg || 0);
    const averageWeightKg = payload.averageWeightKg == null ? (totalKg && heads ? totalKg / heads : null) : Number(payload.averageWeightKg || 0);
    if (heads <= 0 || !averageWeightKg || averageWeightKg <= 0) throw new Error('Pesada requiere cabezas y kg totales o peso promedio');
    const id = payload.id || uid('LWG');
    const herd = draft.livestockHerds.find((item) => item.id === payload.herdId);
    draft.livestockWeighings.push({ id, date: payload.date || todayIso(), herdId: payload.herdId, category: payload.category || herd?.category || '', heads, totalKg: totalKg || heads * averageWeightKg, averageWeightKg, condition: payload.condition || '', notes: payload.notes || '' });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockWeighing', entityId: id, action: 'create-livestock-weighing', changes: [{ field: 'averageWeightKg', from: null, to: averageWeightKg }], createdAt: new Date().toISOString(), reason: payload.reason || 'Pesada hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createLivestockReferencePriceTransaction(state, payload, user) {
    const draft = clone(state);
    ensureLivestockCollections(draft);
    const pricePerKg = Number(payload.pricePerKg || 0);
    if (!LIVESTOCK_CATEGORIES.includes(payload.category)) throw new Error('Categoria invalida para precio de referencia');
    if (pricePerKg <= 0) throw new Error('Precio por kg invalido');
    const id = payload.id || uid('LPRICE');
    draft.livestockReferencePrices.push({ id, category: payload.category, date: payload.date || todayIso(), pricePerKg, currency: payload.currency || 'ARS', notes: payload.notes || '' });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'livestockReferencePrice', entityId: id, action: 'create-livestock-reference-price', changes: [{ field: 'pricePerKg', from: null, to: pricePerKg }], createdAt: new Date().toISOString(), reason: payload.reason || 'Precio manual hacienda', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function consolidatedFlow(state, currency) {
    const rows = flowRows(state).filter((row) => row.currency === currency);
    return { currency, total: sum(rows), income: sum(rows.filter((row) => row.amount > 0)), expense: Math.abs(sum(rows.filter((row) => row.amount < 0))) };
  }

  function currenciesInUse(state) {
    return Array.from(new Set([
      ...CURRENCIES,
      ...(state.documents || []).map((item) => item.currency),
      ...(state.instruments || []).map((item) => item.currency),
      ...(state.financialAccounts || []).map((item) => item.currency),
      ...(state.bankCharges || []).map((item) => item.currency),
      ...(state.financialAdjustments || []).map((item) => item.currency)
    ].filter(Boolean)));
  }

  function openDocumentRows(state, filters) {
    const f = filters || {};
    return (state.documents || [])
      .filter((doc) => !doc.voidedAt)
      .filter((doc) => !f.currency || doc.currency === f.currency)
      .filter((doc) => !f.direction || documentDirection(doc, state) === f.direction)
      .filter((doc) => !f.activity || doc.activity === f.activity)
      .map((doc) => {
        const breakdown = documentBreakdown(state, doc.id, f.asOfDate);
        const openAmount = breakdown ? breakdown.nonInstrumented + breakdown.committedPending : 0;
        return { doc, breakdown, openAmount, direction: documentDirection(doc, state) };
      })
      .filter((row) => row.openAmount > 0.01)
      .map((row) => ({
        id: row.doc.id,
        documentId: row.doc.id,
        date: row.doc.dueDate,
        entityId: row.doc.entityId,
        entityName: entityName(state, row.doc.entityId),
        number: row.doc.number,
        description: row.doc.description,
        direction: row.direction,
        activity: row.doc.activity,
        chartAccountId: row.doc.chartAccountId,
        chartPath: chartPath(state, row.doc.chartAccountId),
        amount: row.openAmount,
        currency: row.doc.currency,
        status: row.breakdown?.status || 'Pendiente'
      }));
  }

  function amountByCurrency(rows, amountField) {
    return rows.reduce((totals, row) => {
      const currency = row.currency || '';
      if (!currency) return totals;
      totals[currency] = (totals[currency] || 0) + Number(row[amountField] || 0);
      return totals;
    }, {});
  }

  function panelPositionSummary(state) {
    const accounts = accountBalances(state);
    const receivables = openDocumentRows(state, { direction: 'in' });
    const payables = openDocumentRows(state, { direction: 'out' });
    const portfolio = receivedCheckPortfolio(state);
    const bankCash = accounts.reduce((totals, account) => {
      totals[account.currency] = (totals[account.currency] || 0) + Number(account.realBalance || 0);
      return totals;
    }, {});
    return {
      bankCash,
      receivable: amountByCurrency(receivables, 'amount'),
      payable: amountByCurrency(payables, 'amount'),
      receivedChecks: amountByCurrency(portfolio, 'amount'),
      accounts,
      receivables,
      payables,
      portfolio
    };
  }

  function panelUpcomingWindows(state, options) {
    const baseDate = options?.baseDate || todayIso();
    const currencies = options?.currency ? [options.currency] : currenciesInUse(state);
    const allRows = filterFlowRows(state, {});
    const openRows = allRows.filter(isOpenFlowRow);
    return currencies.flatMap((currency) => [7, 15, 30].map((days) => {
      const dateTo = addDays(baseDate, days - 1);
      const overdueRows = openRows.filter((row) => row.currency === currency && row.date && row.date < baseDate);
      const horizonRows = openRows.filter((row) => row.currency === currency && row.date >= baseDate && row.date <= dateTo);
      const rows = [...overdueRows, ...horizonRows];
      const displayRows = [...rows, ...allRows.filter((row) => row.currency === currency && row.date >= baseDate && row.date <= dateTo && !openRows.includes(row))]
        .sort((a, b) => a.date.localeCompare(b.date));
      const pending = rows.filter((row) => row.userStatus === 'Pendiente');
      const estimated = rows.filter((row) => row.userStatus === 'Estimado');
      const incomeRows = rows.filter((row) => row.direction === 'in');
      const expenseRows = rows.filter((row) => row.direction === 'out');
      return {
        currency,
        days,
        dateFrom: baseDate,
        dateTo,
        income: flowTotals(incomeRows).incomes,
        expense: flowTotals(expenseRows).expenses,
        overdueIncome: flowTotals(overdueRows.filter((row) => row.direction === 'in')).incomes,
        overdueExpense: flowTotals(overdueRows.filter((row) => row.direction === 'out')).expenses,
        horizonIncome: flowTotals(horizonRows.filter((row) => row.direction === 'in')).incomes,
        horizonExpense: flowTotals(horizonRows.filter((row) => row.direction === 'out')).expenses,
        pendingIncome: flowTotals(pending.filter((row) => row.direction === 'in')).incomes,
        pendingExpense: flowTotals(pending.filter((row) => row.direction === 'out')).expenses,
        estimatedIncome: flowTotals(estimated.filter((row) => row.direction === 'in')).incomes,
        estimatedExpense: flowTotals(estimated.filter((row) => row.direction === 'out')).expenses,
        rows,
        overdueRows,
        horizonRows,
        displayRows
      };
    }));
  }

  function panelControls(state, options) {
    const asOfDate = options?.asOfDate || todayIso();
    const overdueDocuments = openDocumentRows(state, {}).filter((row) => row.date && row.date < asOfDate);
    const pendingChecks = (state.instruments || []).filter((instrument) => instrument.type === 'received_check' && !['accredited', 'endorsed', 'rejected', 'voided', 'cancelled'].includes(instrument.status));
    const pendingForwards = (state.grainForwards || []).filter((forward) => grainForwardPendingKg(state, forward.id) > 0.001);
    const pendingGrainCollections = (state.grainLiquidations || [])
      .map((liquidation) => {
        const doc = state.documents.find((item) => item.id === liquidation.documentId);
        return doc ? documentBreakdown(state, doc.id) : null;
      })
      .filter((breakdown) => breakdown && breakdown.status !== 'Cobrado');
    const stockWithoutPrice = grainStockRows(state, {})
      .filter((row) => row.balanceKg > 0.001)
      .filter((row) => !latestGrainReferencePrice(state, { cereal: row.cereal, campaign: row.campaign }));
    return [
      { key: 'overdueDocuments', label: 'Documentos vencidos pendientes', count: overdueDocuments.length, rows: overdueDocuments },
      { key: 'pendingChecks', label: 'Cheques pendientes de acreditar', count: pendingChecks.length, rows: pendingChecks },
      { key: 'pendingForwards', label: 'FWD pendientes', count: pendingForwards.length, rows: pendingForwards },
      { key: 'pendingGrainCollections', label: 'Liquidaciones pendientes de cobro', count: pendingGrainCollections.length, rows: pendingGrainCollections },
      { key: 'stockWithoutPrice', label: 'Stock de cereal sin precio manual', count: stockWithoutPrice.length, rows: stockWithoutPrice }
    ];
  }

  function panelGeneralSummary(state, options) {
    const exercise = options?.exercise || managementExerciseForDate(todayIso());
    const reading = options?.reading || 'total';
    const range = economicPeriod({ ...options, exercise, asOfDate: options?.asOfDate || options?.dateTo || todayIso() });
    const currency = options?.currency || '';
    const currencyList = currency ? [currency] : currenciesInUse(state);
    const economicByCurrency = currencyList.map((item) => ({
      currency: item,
      summary: economicSummary(state, { dateFrom: range.dateFrom, dateTo: range.dateTo, activity: options?.activity, reading, currency: item })
    }));
    const grainGroups = {};
    grainStockRows(state, {}).forEach((row) => {
      const key = `${row.cereal}|${row.campaign}`;
      grainGroups[key] ||= { cereal: row.cereal, campaign: row.campaign, totalKg: 0, elevatorKg: 0, fieldStorageKg: 0, pendingForwardKg: 0, estimatedValuation: 0, valuationCurrency: '', rows: [] };
      const group = grainGroups[key];
      group.totalKg += row.balanceKg;
      if (row.locationType === 'elevator') group.elevatorKg += row.balanceKg;
      else group.fieldStorageKg += row.balanceKg;
      group.rows.push(row);
    });
    Object.values(grainGroups).forEach((group) => {
      const summary = grainStockSummary(state, { cereal: group.cereal, campaign: group.campaign });
      group.pendingForwardKg = summary.pendingForwardKg;
      group.estimatedValuation = summary.estimatedValuation;
      group.valuationCurrency = summary.valuationCurrency;
      group.referencePrice = summary.referencePrice;
    });
    return {
      exercise,
      reading,
      range,
      currencies: currencyList,
      position: panelPositionSummary(state),
      upcoming: panelUpcomingWindows(state, { baseDate: options?.baseDate || todayIso(), currency }),
      economicByCurrency,
      agriculture: {
        economicByCurrency: economicByCurrency.map((row) => ({ currency: row.currency, summary: economicSummary(state, { dateFrom: range.dateFrom, dateTo: range.dateTo, reading, currency: row.currency, activity: 'Agricultura' }) })),
        grain: Object.values(grainGroups)
      },
      livestock: {
        economicByCurrency: economicByCurrency.map((row) => ({ currency: row.currency, summary: economicSummary(state, { dateFrom: range.dateFrom, dateTo: range.dateTo, reading, currency: row.currency, activity: 'Ganaderia' }) })),
        summary: livestockSummary(state, {})
      },
      taxesByCurrency: currencyList.map((item) => ({ currency: item, totals: taxTotals(state, { mode: 'exercise', exercise, reading, currency: item }) })),
      controls: panelControls(state, { asOfDate: options?.baseDate || todayIso() })
    };
  }

  function validateState(state, asOfDate) {
    const extraErrors = [];
    (state.fxEstimates || []).forEach((item) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(item?.month || '') || !(Number(item?.rate) > 0)) extraErrors.push(`Tipo de cambio estimado invalido ${item?.month || ''}`);
    });
    if (new Set((state.fxEstimates || []).map((item) => item.month)).size !== (state.fxEstimates || []).length) extraErrors.push('Tipo de cambio estimado duplicado para un mes');
    (state.notes || []).forEach((item) => {
      if (!item?.id || !String(item.title || '').trim() || !['note', 'task'].includes(item.kind)) extraErrors.push(`Nota invalida ${item?.id || ''}`);
    });
    if (new Set((state.notes || []).map((item) => item.id)).size !== (state.notes || []).length) extraErrors.push('Nota con ID duplicado');
    if (extraErrors.length) return extraErrors;
    const errors = [];
    const idx = indexes(state);
    const allIds = new Set();
    ['entities', 'financialInstitutions', 'financialAccounts', 'chartAccounts', 'documents', 'orders', 'instruments', 'documentCompensations', 'taxReimbursements', 'orderTaxWithholdings', 'orderPracticedWithholdings', 'taxPayments', 'internalTransfers', 'grainLocations', 'grainMovements', 'grainTransfers', 'grainForwards', 'grainLiquidations', 'grainReferencePrices', 'livestockLocations', 'livestockHerds', 'livestockMovements', 'livestockTrades', 'livestockWeighings', 'livestockReferencePrices', 'financialAdjustments'].forEach((collection) => {
      (state[collection] || []).forEach((item) => {
        if (allIds.has(item.id)) errors.push(`ID duplicado: ${item.id}`);
        allIds.add(item.id);
      });
    });

    (state.agriculturalIncomeProjections || []).forEach((item) => {
      if (allIds.has(item.id)) errors.push(`ID duplicado: ${item.id}`);
      allIds.add(item.id);
      agriculturalProjectionErrors(item).forEach((error) => errors.push(`${error} (${item.id})`));
    });

    (state.taxPaymentPlans || []).forEach((item) => {
      if (allIds.has(item.id)) errors.push(`ID duplicado: ${item.id}`);
      allIds.add(item.id);
    });

    (state.currentAccountClosings || []).forEach((item) => {
      if (allIds.has(item.id)) errors.push(`ID duplicado: ${item.id}`);
      allIds.add(item.id);
      if (!state.entities.some((entity) => entity.id === item.entityId) || !CURRENCIES.includes(item.currency)
        || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || !String(item.notes || '').trim()
        || ![item.debt, item.receivable, item.confirmedDebt, item.confirmedReceivable].every(Number.isFinite)) errors.push(`Cierre de cuenta corriente invalido ${item.id}`);
    });

    state.entities.forEach((entity) => {
      if (!entity.name || !entity.name.trim()) errors.push(`Contraparte sin nombre ${entity.id}`);
      if (entity.role && !ENTITY_ROLES.includes(entity.role)) errors.push(`Rol invalido en contraparte ${entity.id}`);
      if (entity.suggestedChartAccountId && !chartAccount(state, entity.suggestedChartAccountId)) errors.push(`Sugerencia de cuenta invalida ${entity.id}`);
      if (entity.suggestedActivity && !ACTIVITIES.includes(entity.suggestedActivity)) errors.push(`Sugerencia de actividad invalida ${entity.id}`);
    });

    (state.financialInstitutions || []).forEach((institution) => {
      if (!String(institution.name || '').trim()) errors.push(`Institucion financiera sin nombre ${institution.id}`);
    });

    state.financialAccounts.forEach((account) => {
      if (!String(account.name || '').trim()) errors.push(`Cuenta/producto financiero sin nombre ${account.id}`);
      if (!CURRENCIES.includes(account.currency)) errors.push(`Moneda invalida en cuenta financiera ${account.id}`);
      if (account.productType && !FINANCIAL_PRODUCT_TYPES.includes(account.productType)) errors.push(`Tipo de producto financiero invalido ${account.id}`);
      if (account.institutionId && !(state.financialInstitutions || []).some((institution) => institution.id === account.institutionId)) errors.push(`Producto financiero con institucion inexistente ${account.id}`);
      if (account.openingBalanceDate && !/^\d{4}-\d{2}-\d{2}$/.test(account.openingBalanceDate)) errors.push(`Fecha de saldo inicial invalida ${account.id}`);
      if (account.checkEnabled != null && typeof account.checkEnabled !== 'boolean') errors.push(`Emite cheques invalido ${account.id}`);
      if (account.bankTaxTreatment && !['exempt', 'taxable', 'differential'].includes(account.bankTaxTreatment)) errors.push(`Tratamiento de impuesto bancario invalido ${account.id}`);
      ['bankTaxDebitRate', 'bankTaxCreditRate'].forEach((field) => { if (account[field] != null && (!Number.isFinite(Number(account[field])) || Number(account[field]) < 0 || Number(account[field]) > 100)) errors.push(`Alicuota bancaria invalida ${account.id}`); });
    });

    state.documents.forEach((doc) => {
      if (!ACTIVITIES.includes(doc.activity)) errors.push(`Actividad invalida en documento ${doc.id}`);
      if (!CURRENCIES.includes(doc.currency)) errors.push(`Moneda invalida en documento ${doc.id}`);
      if (doc.tcInvoice != null && (typeof doc.tcInvoice !== 'number' || !Number.isFinite(doc.tcInvoice) || doc.tcInvoice <= 0)) errors.push(`TC de factura invalido en documento ${doc.id}`);
      if (doc.relatedInvoiceIds != null) {
        try { validateDebitNoteInvoiceLinks(state, doc, doc.relatedInvoiceIds); }
        catch (error) { errors.push(`${doc.number || doc.id}: ${error.message}`); }
      }
      if (!idx.documents.has(doc.id)) errors.push(`Documento invalido ${doc.id}`);
      if (doc.economicTreatment != null && doc.economicTreatment !== 'liability_only') errors.push(`Tratamiento economico invalido ${doc.id}`);
      const liabilityOnly = doc.economicTreatment === 'liability_only';
      if (liabilityOnly || doc.type === 'liability') {
        if (!liabilityOnly || doc.type !== 'liability' || doc.commercialSide !== 'purchase' || doc.economicAmount !== 0 || !Number.isFinite(doc.amount) || doc.amount <= 0 || Math.abs(doc.amount * 100 - Math.round(doc.amount * 100)) > 0.0001 || doc.chartAccountId || (doc.taxComponents || []).length || doc.grainLiquidationId || doc.livestockTradeId) errors.push(`Obligacion sin resultado incompatible ${doc.id}`);
      } else if (!chartAccount(state, doc.chartAccountId)) errors.push(`Documento sin cuenta jerarquica ${doc.id}`);
      if (doc.liabilityPlanNumber && (!liabilityOnly || typeof doc.liabilityPlanNumber !== 'string')) errors.push(`Plan de obligacion incompatible ${doc.id}`);
      if (doc.fiscalStatus && !['documented', 'pending_receipt', 'no_receipt'].includes(doc.fiscalStatus)) errors.push(`Respaldo documental invalido ${doc.id}`);
      if (documentReading(doc) === 'documented' && !String(doc.number || '').trim()) errors.push(`Documento documentado sin numero ${doc.id}`);
      if (documentReading(doc) === 'documented' && !String(doc.issueDate || '').trim()) errors.push(`Documento documentado sin fecha de emision ${doc.id}`);
      if (doc.issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate)) errors.push(`Fecha de emision invalida ${doc.id}`);
      if (doc.recordDate && !/^\d{4}-\d{2}-\d{2}$/.test(doc.recordDate)) errors.push(`Fecha operativa invalida ${doc.id}`);
      if (doc.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(doc.dueDate)) errors.push(`Vencimiento invalido ${doc.id}`);
      if (doc.commercialSide && !['purchase', 'sale', 'supplier', 'customer'].includes(doc.commercialSide)) errors.push(`Lado comercial invalido ${doc.id}`);
      (doc.taxComponents || []).forEach((component) => {
        if (!TAX_COMPONENT_TYPES.includes(component.taxType || component.type)) errors.push(`Componente impositivo invalido ${component.taxType || component.type} en ${doc.id}`);
        if (taxComponentAmount(component) < 0) errors.push(`Componente impositivo negativo ${doc.id}`);
      });
      if (documentReading(doc) === 'documented' && (doc.taxComponents || []).length) {
        const taxTotal = doc.taxComponents.reduce((total, component) => total + taxComponentEffectOnTotal(component), 0);
        if (Math.abs(Number(doc.amount || 0) - taxTotal) > 0.01) errors.push(`Apertura impositiva no reconcilia ${doc.number}`);
      }
      const b = documentBreakdown(state, doc.id, asOfDate);
      if (b && Math.abs(doc.amount - b.control) > 0.01) errors.push(`Documento no reconcilia ${doc.number}`);
      const applied = state.orderDocuments.filter((x) => x.documentId === doc.id && !x.voidedAt).reduce((t, x) => t + x.amountApplied, 0);
      if (applied > doc.amount + 0.01) errors.push(`Documento sobreaplicado ${doc.number}`);
      const hasCrossApplication = state.orderDocuments.some((od) => od.documentId === doc.id && !od.voidedAt && state.orderInstruments.some((oi) => oi.orderId === od.orderId && !oi.voidedAt && oi.commercialCurrency && oi.currency !== oi.commercialCurrency));
      if (hasCrossApplication && Math.round(applied * 100) > Math.round(doc.amount * 100)) errors.push(`Documento sobreaplicado en moneda comercial ${doc.number}`);
    });

    state.orders.forEach((order) => {
      if (!idx.documents) return;
      if (!ACTIVITIES.includes(order.activity)) errors.push(`Actividad invalida en orden ${order.id}`);
      if (!CURRENCIES.includes(order.currency)) errors.push(`Moneda invalida en orden ${order.id}`);
      const applied = state.orderDocuments.filter((x) => x.orderId === order.id && !x.voidedAt).reduce((t, x) => t + x.amountApplied, 0);
      const instruments = state.orderInstruments.filter((x) => x.orderId === order.id && !x.voidedAt).reduce((t, x) => t + orderInstrumentCommercialAmount(x), 0);
      const withheld = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].filter((x) => x.orderId === order.id && !x.voidedAt).reduce((t, x) => t + Number(x.amount || 0), 0);
      if (instruments + withheld > applied + 0.01) errors.push(`Orden desbalanceada ${order.id}: instrumentos y retenciones mayores al aplicado`);
      const compensated = (state.documentCompensations || []).filter(compensationIsConfirmed).reduce((sum, item) => sum + state.orderDocuments.filter((link) => link.orderId === order.id && !link.voidedAt && [item.creditOrderDocumentId, item.debtOrderDocumentId].includes(link.id)).reduce((total, link) => total + compensationDocumentAmount(item, link.documentId), 0), 0);
      if (compensated > 0 && Math.round((instruments + withheld + compensated) * 100) > Math.round(applied * 100)) errors.push(`Orden desbalanceada ${order.id}: medios, retenciones y compensaciones superan lo aplicado`);
      if (state.orderInstruments.some((link) => link.orderId === order.id && !link.voidedAt && link.commercialCurrency && link.commercialCurrency !== link.currency) && Math.round((instruments + withheld) * 100) > Math.round(applied * 100)) errors.push(`Imputacion comercial excede la orden ${order.id}`);
    });

    const reconciliationGroups = new Map();
    (state.documentCompensations || []).filter((item) => item.reconciliationId).forEach((item) => {
      if (!reconciliationGroups.has(item.reconciliationId)) reconciliationGroups.set(item.reconciliationId, []);
      reconciliationGroups.get(item.reconciliationId).push(item);
    });
    for (const [id, members] of reconciliationGroups) {
      const first = members[0];
      const liquidation = (state.grainLiquidations || []).find((item) => item.id === first.grainLiquidationId);
      if (!liquidation || liquidation.documentId !== first.creditDocumentId
        || new Set(members.map((item) => item.debtDocumentId)).size !== members.length
        || members.some((item) => item.reconciliationSize !== members.length || item.grainLiquidationId !== first.grainLiquidationId
          || item.creditDocumentId !== first.creditDocumentId || item.entityId !== first.entityId || item.currency !== 'ARS' || item.debtCurrency
          || compensationStatus(item) !== compensationStatus(first) || item.date !== first.date || item.reference !== first.reference)) {
        errors.push(`Conciliación múltiple incompleta o incoherente ${id}`);
      }
    }
    (state.documentCompensations || []).forEach((item) => {
      if (item.status != null && !['requested', 'confirmed', 'cancelled'].includes(item.status)) errors.push(`Estado de compensación inválido ${item.id}`);
      if (item.status === 'cancelled' && !item.voidedAt) errors.push(`Anulación de compensación sin auditoría temporal ${item.id}`);
    });
    (state.documentCompensations || []).filter((item) => !item.voidedAt).forEach((item) => {
      if (compensationStatus(item) === 'requested' && (item.creditOrderDocumentId || item.debtOrderDocumentId)) errors.push(`Solicitud no puede reservar una imputación de orden ${item.id}`);
      const credit = idx.documents.get(item.creditDocumentId);
      const debt = idx.documents.get(item.debtDocumentId);
      if (!credit || !debt || credit.voidedAt || debt.voidedAt || documentDirection(credit, state) !== 'in' || documentDirection(debt, state) !== 'out' || credit.entityId !== debt.entityId || item.entityId !== credit.entityId || item.currency !== credit.currency) errors.push(`Compensación con documentos incompatibles ${item.id}`);
      if (credit && debt) {
        try {
          const normalized = compensationAmounts(item, credit, debt);
          if (credit.currency !== debt.currency && (item.debtCurrency !== debt.currency || item.roundingDifference !== normalized.roundingDifference)) throw new Error('Conversión incompleta');
        } catch (error) { errors.push(`Compensación ${item.id}: ${error.message}`); }
      }
      if (!Number.isFinite(Number(item.amount)) || item.amount <= 0 || Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 0.0001 || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) errors.push(`Importe o fecha de compensación inválidos ${item.id}`);
      for (const [documentId, linkId] of [[item.creditDocumentId, item.creditOrderDocumentId], [item.debtDocumentId, item.debtOrderDocumentId]]) {
        if (!linkId) continue;
        const link = idx.orderDocuments.get(linkId);
        if (!link || link.voidedAt || link.documentId !== documentId) errors.push(`Orden de compensación incoherente ${item.id}`);
      }
    });

    (state.orderTaxWithholdings || []).forEach((item) => {
      const order = idx.orders.get(item.orderId);
      const orderDocument = idx.orderDocuments.get(item.orderDocumentId);
      if (!order || !orderDocument || orderDocument.orderId !== item.orderId) errors.push(`Retencion de orden huerfana ${item.id}`);
      if (order && order.type !== 'collection') errors.push(`Retencion sufrida en orden que no es cobro ${item.id}`);
      if (!['withholding_income_tax', 'withholding_vat', 'withholding_iibb'].includes(item.taxType)) errors.push(`Tipo de retencion invalido ${item.id}`);
      if (!CURRENCIES.includes(item.currency) || Number(item.amount || 0) <= 0) errors.push(`Importe o moneda invalida en retencion ${item.id}`);
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) errors.push(`Fecha invalida en retencion ${item.id}`);
    });

    (state.orderPracticedWithholdings || []).forEach((item) => {
      const order = idx.orders.get(item.orderId);
      const link = idx.orderDocuments.get(item.orderDocumentId);
      if (!order || !link || link.orderId !== item.orderId || order.type !== 'payment') errors.push(`Retencion practicada sin OP/documento valido ${item.id}`);
      if (!['withholding_income_tax', 'withholding_vat', 'withholding_iibb'].includes(item.taxType) || !CURRENCIES.includes(item.currency) || Number(item.amount || 0) <= 0) errors.push(`Retencion practicada invalida ${item.id}`);
    });
    (state.taxPayments || []).forEach((payment) => {
      const instrument = idx.instruments.get(payment.instrumentId);
      if (!instrument || instrument.type !== 'vep' || instrument.direction !== 'out' || instrument.entityId !== payment.entityId || !instrumentIsBankRealized(instrument) || instrument.currency !== payment.currency) errors.push(`VEP fiscal incoherente ${payment.id}`);
      const allocated = (payment.allocations || []).reduce((sum, allocation) => {
        const withholding = (state.orderPracticedWithholdings || []).find((item) => item.id === allocation.withholdingId && !item.voidedAt);
        if (!withholding || withholding.currency !== payment.currency || Number(allocation.amount || 0) <= 0) errors.push(`Aplicacion fiscal invalida ${payment.id}`);
        return sum + Number(allocation.amount || 0);
      }, 0);
      if (!instrument || Math.abs(allocated - Number(instrument.amount || 0)) > 0.01) errors.push(`VEP fiscal desbalanceado ${payment.id}`);
    });
    (state.orderPracticedWithholdings || []).forEach((item) => {
      const paid = (state.taxPayments || []).flatMap((payment) => payment.allocations || []).filter((allocation) => allocation.withholdingId === item.id).reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
      if (paid > Number(item.amount || 0) + 0.01) errors.push(`Retencion practicada sobrepagada ${item.id}`);
    });

    state.orderInstruments.filter((x) => !x.voidedAt).forEach((oi) => {
      const instrument = idx.instruments.get(oi.instrumentId);
      if (!instrument) return;
      const settlements = state.orderDocumentSettlements.filter((settlement) => settlement.orderInstrumentId === oi.id && !settlement.voidedAt);
      if (!settlements.length) return;
      const byDirection = settlements.reduce((totals, settlement) => {
        const od = idx.orderDocuments.get(settlement.orderDocumentId);
        const doc = od ? idx.documents.get(od.documentId) : null;
        if (!doc) return totals;
        const direction = documentDirection(doc, state);
        totals[direction] += settlementInstrumentAmount(settlement);
        return totals;
      }, { in: 0, out: 0 });
      if (instrument.type === 'compensation') {
        const economicAmount = Math.max(byDirection.in, byDirection.out);
        if (byDirection.in > 0.01 && byDirection.out > 0.01 && Math.abs(byDirection.in - byDirection.out) > 0.01) errors.push(`Compensacion bilateral desbalanceada ${instrument.id}`);
        if (economicAmount > oi.amount + 0.01) errors.push(`Compensacion excede monto economico ${instrument.id}`);
      } else {
        const totalSettled = byDirection.in + byDirection.out;
        if (totalSettled > oi.amount + 0.01) errors.push(`Instrumento sobreaplicado ${instrument.id}`);
        if (oi.commercialCurrency && oi.commercialCurrency !== oi.currency) {
          const commercialSettled = settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0);
          if (Math.abs(totalSettled - oi.amount) > 0.001 || Math.abs(commercialSettled - oi.commercialAmount) > 0.001) errors.push(`Imputacion multimoneda incompleta ${oi.id}`);
        }
      }
    });

    state.orderDocuments.forEach((link) => {
      const order = idx.orders.get(link.orderId);
      const doc = idx.documents.get(link.documentId);
      if (!order) errors.push(`Vinculo documento-orden huerfano ${link.id}`);
      if (!doc) errors.push(`Vinculo documento sin documento ${link.id}`);
      if (order && doc && order.currency !== doc.currency) errors.push(`Moneda incoherente orden/documento ${link.id}`);
      if (doc && link.currency !== doc.currency) errors.push(`Moneda de imputacion documental incoherente ${link.id}`);
      if (order && doc && order.entityId !== doc.entityId) errors.push(`Contraparte incoherente orden/documento ${link.id}`);
      const compensated = (state.documentCompensations || []).filter((item) => compensationIsConfirmed(item) && [item.creditOrderDocumentId, item.debtOrderDocumentId].includes(link.id)).reduce((sum, item) => sum + compensationDocumentAmount(item, link.documentId), 0);
      if (compensated > 0) {
        const settled = state.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const withheld = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
        if (Math.round((settled + withheld + compensated) * 100) > Math.round(link.amountApplied * 100)) errors.push(`Imputacion sobrecancelada ${link.id}: pagos, retenciones y compensaciones superan lo aplicado`);
      }
    });

    state.orderInstruments.forEach((link) => {
      const order = idx.orders.get(link.orderId);
      const instrument = idx.instruments.get(link.instrumentId);
      if (!order) errors.push(`Vinculo instrumento-orden huerfano ${link.id}`);
      if (!instrument) errors.push(`Vinculo instrumento sin instrumento ${link.id}`);
      if (order && instrument && order.currency !== instrument.currency) {
        try {
          if (link.currency !== instrument.currency || link.commercialCurrency !== order.currency || !Number.isFinite(instrument.amount) || instrument.amount <= 0 || Math.abs(link.amount - instrument.amount) > 0.001) throw new Error('Monedas/importes inconsistentes');
          if (!Number.isFinite(link.exchangeRate) || link.exchangeRate <= 0 || !Number.isFinite(link.roundingDifference) || !['commercialAmount', 'exchangeRate'].includes(link.exchangeRateSource) || !link.exchangeRateDate || typeof link.exchangeRateReference !== 'string') throw new Error('Conversion explicita incompleta');
          const application = normalizeInstrumentApplication({ ...link, type: instrument.type, scheduledDate: instrument.scheduledDate }, order.currency);
          if (Math.abs(application.roundingDifference - link.roundingDifference) > 0.001) throw new Error('Diferencia de redondeo inconsistente');
        } catch (error) { errors.push(`Moneda incoherente orden/instrumento ${link.id}: ${error.message}`); }
      } else if (order && link.commercialAmount != null && (link.commercialCurrency !== order.currency || Math.abs(link.commercialAmount - link.amount) > 0.001)) errors.push(`Imputacion comercial incoherente ${link.id}`);
      const validEndorsedUse = order && instrument && instrument.type === 'received_check' && instrument.status === 'endorsed' && instrument.deliveredToEntityId === order.entityId;
      if (order && instrument && order.entityId !== instrument.entityId && !validEndorsedUse) errors.push(`Contraparte incoherente orden/instrumento ${link.id}`);
      const uses = state.orderInstruments.filter((x) => x.instrumentId === link.instrumentId && !x.voidedAt);
      if (uses.length > 1) {
        const orders = uses.map((use) => idx.orders.get(use.orderId)).filter(Boolean);
        const validEndorsementChain = instrument && instrument.type === 'received_check' && instrument.status === 'endorsed' && uses.length === 2 && orders.some((x) => x.type === 'collection') && orders.some((x) => x.type === 'payment');
        if (!validEndorsementChain) errors.push(`Instrumento usado en mas de una orden ${link.instrumentId}`);
      }
    });

    state.orderDocumentSettlements.forEach((link) => {
      const od = idx.orderDocuments.get(link.orderDocumentId);
      const oi = idx.orderInstruments.get(link.orderInstrumentId);
      if (!od || !oi) errors.push(`Aplicacion documento-instrumento huerfana ${link.id}`);
      if (od && oi && od.orderId !== oi.orderId) errors.push(`Aplicacion cruza ordenes distintas ${link.id}`);
      if (od && link.currency !== od.currency) errors.push(`Moneda comercial de settlement incoherente ${link.id}`);
      if (od && oi && oi.currency !== od.currency) {
        if (link.currency !== od.currency || link.instrumentCurrency !== oi.currency || !Number.isFinite(link.instrumentAmount) || link.instrumentAmount <= 0 || !Number.isFinite(link.amount) || link.amount <= 0 || !Number.isFinite(link.roundingDifference) || Math.abs(link.amount * 100 - Math.round(link.amount * 100)) > 0.0001 || Math.abs(link.instrumentAmount * 100 - Math.round(link.instrumentAmount * 100)) > 0.0001 || link.exchangeRate !== oi.exchangeRate || link.exchangeRateDate !== oi.exchangeRateDate || link.exchangeRateReference !== oi.exchangeRateReference || Math.abs((link.instrumentAmount - link.amount * link.exchangeRate) - link.roundingDifference) > 0.005001) errors.push(`Settlement multimoneda incoherente ${link.id}`);
      } else if (link.instrumentCurrency && (link.instrumentCurrency !== link.currency || Math.abs(link.instrumentAmount - link.amount) > 0.001)) errors.push(`Settlement nominal incoherente ${link.id}`);
    });

    state.instruments.forEach((instrument) => {
      const valid = validStatesForInstrument(instrument.type);
      if (!valid.includes(instrument.status)) errors.push(`Estado invalido ${instrument.status} para ${instrument.type} ${instrument.id}`);
      if (!CURRENCIES.includes(instrument.currency)) errors.push(`Moneda invalida en instrumento ${instrument.id}`);
      const account = idx.accounts.get(instrument.financialAccountId);
      if (!account) errors.push(`Instrumento sin cuenta financiera ${instrument.id}`);
      if (account && account.currency !== instrument.currency) errors.push(`Cuenta incompatible con moneda ${instrument.id}`);
      if (instrument.type === 'account_debit' && account && ((account.productType || 'bank_account') !== 'bank_account' || account.type === 'cash')) errors.push(`Debito en cuenta sin cuenta bancaria ${instrument.id}`);
      if (instrumentIsBankRealized(instrument) && !instrument.executedDate) errors.push(`Instrumento realizado sin fecha efectiva ${instrument.id}`);
      if (instrumentIsPending(instrument) && !instrument.scheduledDate) errors.push(`Instrumento pendiente sin fecha ${instrument.id}`);
      if (instrument.deliveredDate && (instrument.type !== 'own_check' || !/^\d{4}-\d{2}-\d{2}$/.test(instrument.deliveredDate) || (instrument.executedDate && instrument.deliveredDate > instrument.executedDate))) errors.push(`Fecha de entrega incoherente ${instrument.id}`);
      if ((instrument.type === 'own_check' || instrument.type === 'received_check') && instrument.checkNumber) {
        const dupes = state.instruments.filter((x) => x.id !== instrument.id && x.type === instrument.type && x.checkNumber === instrument.checkNumber && x.bankName === instrument.bankName && !['voided', 'cancelled', 'rejected'].includes(x.status));
        if (dupes.length) errors.push(`Numero de cheque duplicado ${instrument.checkNumber}`);
      }
    });

    (state.internalTransfers || []).forEach((transfer) => {
      const outgoing = idx.instruments.get(transfer.outInstrumentId);
      const incoming = idx.instruments.get(transfer.inInstrumentId);
      if (!outgoing || !incoming || outgoing.internalTransferId !== transfer.id || incoming.internalTransferId !== transfer.id || outgoing.direction !== 'out' || incoming.direction !== 'in' || outgoing.financialAccountId !== transfer.fromAccountId || incoming.financialAccountId !== transfer.toAccountId || outgoing.amount !== transfer.amount || incoming.amount !== transfer.amount || outgoing.currency !== transfer.currency || incoming.currency !== transfer.currency || outgoing.status !== 'executed' || incoming.status !== 'executed') errors.push(`Transferencia interna inconsistente ${transfer.id}`);
    });
    state.instruments.filter((item) => item.internalTransferId).forEach((item) => {
      if (!(state.internalTransfers || []).some((transfer) => transfer.id === item.internalTransferId)) errors.push(`Instrumento interno huerfano ${item.id}`);
    });

    (state.bankCharges || []).forEach((charge) => {
      if (!idx.instruments.get(charge.instrumentId)) errors.push(`Cargo bancario sin movimiento principal ${charge.id}`);
      if (!CURRENCIES.includes(charge.currency)) errors.push(`Moneda invalida en cargo bancario ${charge.id}`);
      if (!TAX_COMPONENT_TYPES.includes(charge.taxType || 'bank_debit_credit_tax')) errors.push(`Tipo invalido en cargo bancario ${charge.id}`);
      if (Number(charge.amount || 0) <= 0) errors.push(`Importe invalido en cargo bancario ${charge.id}`);
      if (charge.autoGenerated) {
        const instrument = idx.instruments.get(charge.instrumentId);
        if (!instrument?.bankTaxEligible || !instrumentIsBankRealized(instrument) || instrument.financialAccountId !== charge.financialAccountId || instrument.currency !== charge.currency || (instrument.direction === 'in' ? 'credit' : 'debit') !== charge.bankSide) errors.push(`Impuesto bancario derivado incoherente ${charge.id}`);
        if ((state.bankCharges || []).filter((item) => item.autoGenerated && item.instrumentId === charge.instrumentId).length > 1) errors.push(`Impuesto bancario automatico duplicado ${charge.instrumentId}`);
      }
    });

    (state.taxReimbursements || []).forEach((item) => {
      if (!TAX_COMPONENT_TYPES.includes(item.taxType || 'reimbursement_vat')) errors.push(`Tipo invalido en reintegro ${item.id}`);
      if (!CURRENCIES.includes(item.currency) || Number(item.amount || 0) <= 0) errors.push(`Importe o moneda invalida en reintegro ${item.id}`);
      if (item.entityId && !state.entities.some((entity) => entity.id === item.entityId)) errors.push(`Reintegro con entidad inexistente ${item.id}`);
      if (item.instrumentId) {
        const instrument = idx.instruments.get(item.instrumentId);
        if (!instrument || instrument.type !== 'transfer' || instrument.direction !== 'in' || instrument.status !== 'executed' || Math.abs(Number(instrument.amount || 0) - Number(item.amount || 0)) > 0.01 || instrument.currency !== item.currency) errors.push(`Instrumento incoherente en reintegro ${item.id}`);
      }
    });

    (state.financialAdjustments || []).forEach((adjustment) => {
      const account = idx.accounts.get(adjustment.financialAccountId);
      if (!account) errors.push(`Ajuste de conciliacion sin cuenta ${adjustment.id}`);
      if (!CURRENCIES.includes(adjustment.currency)) errors.push(`Moneda invalida en ajuste ${adjustment.id}`);
      if (account && account.currency !== adjustment.currency) errors.push(`Ajuste incompatible con moneda de cuenta ${adjustment.id}`);
      if (Math.abs(Number(adjustment.amount || 0)) <= 0.01) errors.push(`Importe invalido en ajuste ${adjustment.id}`);
      if (!String(adjustment.reason || '').trim()) errors.push(`Ajuste sin motivo ${adjustment.id}`);
    });

    (state.grainLocations || []).forEach((location) => {
      if (!location.name) errors.push(`Ubicacion de cereal sin nombre ${location.id}`);
      if (!GRAIN_LOCATION_TYPES.includes(location.type)) errors.push(`Tipo de ubicacion de cereal invalido ${location.id}`);
      if (location.entityId && !state.entities.some((entity) => entity.id === location.entityId)) errors.push(`Ubicacion cereal con contraparte inexistente ${location.id}`);
    });

    (state.grainMovements || []).forEach((movement) => {
      if (!GRAIN_TYPES.includes(movement.cereal)) errors.push(`Cereal invalido ${movement.id}`);
      if (!movement.campaign) errors.push(`Campana faltante en movimiento cereal ${movement.id}`);
      if (!['in', 'out'].includes(movement.direction)) errors.push(`Direccion invalida en movimiento cereal ${movement.id}`);
      if (Number(movement.kg || 0) <= 0) errors.push(`Kilos invalidos en movimiento cereal ${movement.id}`);
      if (!(state.grainLocations || []).some((location) => location.id === movement.locationId)) errors.push(`Movimiento cereal sin ubicacion ${movement.id}`);
    });

    (state.grainTransfers || []).forEach((transfer) => {
      if (Number(transfer.kgSent || 0) <= 0) errors.push(`Traslado cereal sin kilos enviados ${transfer.id}`);
      if (Number(transfer.kgNetRecognized || 0) < 0) errors.push(`Traslado cereal con kilos netos invalidos ${transfer.id}`);
      if (!(state.grainLocations || []).some((location) => location.id === transfer.originLocationId)) errors.push(`Traslado cereal sin origen ${transfer.id}`);
      if (!(state.grainLocations || []).some((location) => location.id === transfer.destinationLocationId)) errors.push(`Traslado cereal sin destino ${transfer.id}`);
    });

    (state.grainForwards || []).forEach((forward) => {
      if (!GRAIN_TYPES.includes(forward.cereal)) errors.push(`Cereal invalido en FWD ${forward.id}`);
      if (!state.entities.some((entity) => entity.id === forward.buyerEntityId)) errors.push(`FWD sin comprador valido ${forward.id}`);
      if (!CURRENCIES.includes(forward.currency)) errors.push(`Moneda invalida en FWD ${forward.id}`);
      if (Number(forward.contractedKg || 0) <= 0 || Number(forward.price || 0) <= 0) errors.push(`FWD con kilos/precio invalidos ${forward.id}`);
      if (forward.estimatedAmount != null && Number(forward.estimatedAmount || 0) <= 0) errors.push(`FWD con importe estimado invalido ${forward.id}`);
      if (forward.estimatedExchangeRate != null && Number(forward.estimatedExchangeRate || 0) <= 0) errors.push(`Tipo de cambio estimado invalido en FWD ${forward.id}`);
      if (grainForwardLiquidatedKg(state, forward.id) > Number(forward.contractedKg || 0) + 0.001) errors.push(`FWD sobreliquidado ${forward.id}`);
    });

    (state.grainLiquidations || []).forEach((liquidation) => {
      const doc = idx.documents.get(liquidation.documentId);
      if (!doc) errors.push(`Liquidacion cereal sin documento ${liquidation.id}`);
      if (doc && doc.grainLiquidationId !== liquidation.id) errors.push(`Documento de liquidacion cereal no trazable ${liquidation.id}`);
      if (!(state.grainLocations || []).some((location) => location.id === liquidation.locationId)) errors.push(`Liquidacion cereal sin ubicacion ${liquidation.id}`);
      if (!state.entities.some((entity) => entity.id === liquidation.counterpartyEntityId)) errors.push(`Liquidacion cereal sin contraparte ${liquidation.id}`);
      if (Number(liquidation.kg || 0) <= 0) errors.push(`Liquidacion cereal sin kilos ${liquidation.id}`);
      if (!CURRENCIES.includes(liquidation.currency)) errors.push(`Moneda invalida en liquidacion cereal ${liquidation.id}`);
    });

    (state.grainReferencePrices || []).forEach((price) => {
      if (!GRAIN_TYPES.includes(price.cereal)) errors.push(`Cereal invalido en precio ${price.id}`);
      if (!CURRENCIES.includes(price.currency)) errors.push(`Moneda invalida en precio cereal ${price.id}`);
      if (!['kg', 'tn'].includes(price.unit || 'tn')) errors.push(`Unidad invalida en precio cereal ${price.id}`);
      if (Number(price.price || 0) <= 0) errors.push(`Precio cereal invalido ${price.id}`);
    });

    (state.livestockLocations || []).forEach((location) => {
      if (!location.name) errors.push(`Ubicacion de hacienda sin nombre ${location.id}`);
    });

    (state.livestockHerds || []).forEach((herd) => {
      if (!herd.name) errors.push(`Tropa sin nombre ${herd.id}`);
      if (!LIVESTOCK_CATEGORIES.includes(herd.category)) errors.push(`Categoria invalida en tropa ${herd.id}`);
      if (!(state.livestockLocations || []).some((location) => location.id === herd.locationId)) errors.push(`Tropa sin ubicacion valida ${herd.id}`);
    });

    (state.livestockMovements || []).forEach((movement) => {
      if (!LIVESTOCK_MOVEMENT_TYPES.includes(movement.movementType)) errors.push(`Movimiento hacienda invalido ${movement.id}`);
      if (!LIVESTOCK_CATEGORIES.includes(movement.category)) errors.push(`Categoria invalida en movimiento hacienda ${movement.id}`);
      if (!['in', 'out'].includes(movement.direction)) errors.push(`Direccion invalida en movimiento hacienda ${movement.id}`);
      if (Number(movement.heads || 0) <= 0) errors.push(`Cabezas invalidas en movimiento hacienda ${movement.id}`);
      if (!(state.livestockHerds || []).some((herd) => herd.id === movement.herdId)) errors.push(`Movimiento hacienda sin tropa ${movement.id}`);
      if (!(state.livestockLocations || []).some((location) => location.id === movement.locationId)) errors.push(`Movimiento hacienda sin ubicacion ${movement.id}`);
      if (movement.movementType === 'death' && !String(movement.cause || '').trim()) errors.push(`Baja/muerte sin causa ${movement.id}`);
      if (movement.weightSourceWeighingId && !(state.livestockWeighings || []).some((weighing) => weighing.id === movement.weightSourceWeighingId)) errors.push(`Movimiento hacienda sin pesada de origen ${movement.id}`);
    });
    const categoryChanges = new Set((state.livestockMovements || []).filter((row) => row.movementType === 'category_change').map((row) => row.referenceId));
    categoryChanges.forEach((id) => {
      try { livestockCategoryChange(state, id); } catch (error) { errors.push(`${error.message}: ${id}`); }
    });

    (state.livestockTrades || []).forEach((trade) => {
      if (!['purchase', 'sale'].includes(trade.type)) errors.push(`Operacion hacienda invalida ${trade.id}`);
      if (!idx.documents.get(trade.documentId)) errors.push(`Operacion hacienda sin documento ${trade.id}`);
      if (!state.entities.some((entity) => entity.id === trade.counterpartyEntityId)) errors.push(`Operacion hacienda sin contraparte ${trade.id}`);
      if (Math.abs(Number(trade.economicAmount ?? trade.amount ?? 0) - Number(trade.totalKg || 0) * Number(trade.pricePerKg || 0)) > 0.01) errors.push(`Operacion hacienda no reconcilia kg x precio ${trade.id}`);
      const doc = idx.documents.get(trade.documentId);
      if (doc && doc.activity !== 'Ganaderia') errors.push(`Documento hacienda fuera de Ganaderia ${trade.documentId}`);
    });

    (state.livestockWeighings || []).forEach((weighing) => {
      if (!(state.livestockHerds || []).some((herd) => herd.id === weighing.herdId)) errors.push(`Pesada sin tropa ${weighing.id}`);
      if (Number(weighing.heads || 0) <= 0) errors.push(`Pesada sin cabezas ${weighing.id}`);
      if (Number(weighing.averageWeightKg || 0) <= 0) errors.push(`Pesada sin peso promedio ${weighing.id}`);
      if (weighing.totalKg && Math.abs(Number(weighing.averageWeightKg || 0) - Number(weighing.totalKg || 0) / Number(weighing.heads || 1)) > 0.0001) errors.push(`Pesada no reconcilia kg/cabezas ${weighing.id}`);
    });

    (state.livestockReferencePrices || []).forEach((price) => {
      if (!LIVESTOCK_CATEGORIES.includes(price.category)) errors.push(`Categoria invalida en precio hacienda ${price.id}`);
      if (!CURRENCIES.includes(price.currency)) errors.push(`Moneda invalida en precio hacienda ${price.id}`);
      if (Number(price.pricePerKg || 0) <= 0) errors.push(`Precio hacienda invalido ${price.id}`);
    });

    errors.push(...taxPaymentPlanErrors(state));
    return errors;
  }

  function createEntityTransaction(state, payload, user) {
    const draft = clone(state);
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre/Razon social obligatorio');
    const cuit = String(payload.cuit || '').trim();
    const role = payload.role || 'Proveedor';
    if (!ENTITY_ROLES.includes(role)) throw new Error('Rol de contraparte invalido');
    const duplicate = draft.entities.find((entity) => entity.name.toLowerCase() === name.toLowerCase() || (cuit && entity.cuit === cuit));
    if (duplicate) return draft;
    const id = payload.id || uid('ENT');
    draft.entities.push({
      id,
      name,
      type: role === 'Banco' ? 'bank' : role === 'Organismo' ? 'agency' : role === 'Cliente' ? 'customer' : role === 'Ambos' ? 'both' : 'supplier',
      role,
      cuit,
      active: true,
      suggestedActivity: payload.suggestedActivity || '',
      suggestedChartAccountId: payload.suggestedChartAccountId || ''
    });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'entity', entityId: id, action: 'create-entity', changes: [{ field: 'name', from: null, to: name }, { field: 'role', from: null, to: role }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta rapida de contraparte', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateEntityTransaction(state, id, changes, user) {
    const draft = clone(state);
    const entity = draft.entities.find((x) => x.id === id);
    if (!entity) throw new Error('Contraparte inexistente');
    const allowed = ['name', 'cuit', 'role', 'suggestedActivity', 'suggestedChartAccountId', 'active'];
    const auditChanges = [];
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(changes, field) && entity[field] !== changes[field]) {
        auditChanges.push({ field, from: entity[field], to: changes[field] });
        entity[field] = changes[field];
      }
    });
    if (changes.role) entity.type = changes.role === 'Banco' ? 'bank' : changes.role === 'Organismo' ? 'agency' : changes.role === 'Cliente' ? 'customer' : changes.role === 'Ambos' ? 'both' : 'supplier';
    if (!auditChanges.length) return draft;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'entity', entityId: id, action: 'update-entity', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason || 'Edicion de contraparte', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  const ENTITY_REFERENCE_FIELDS = {
    taxPaymentPlans: ['entityId'],
    documents: ['entityId'],
    documentCompensations: ['entityId'],
    orders: ['entityId'],
    instruments: ['entityId', 'deliveredToEntityId', 'endorsedToEntityId'],
    estimates: ['entityId'],
    bankCharges: ['entityId'],
    taxReimbursements: ['entityId'],
    taxPayments: ['entityId'],
    grainLocations: ['entityId'],
    grainForwards: ['buyerEntityId'],
    grainLiquidations: ['counterpartyEntityId'],
    livestockTrades: ['counterpartyEntityId'],
    currentAccountClosings: ['entityId']
  };

  function entityMergePreview(state, sourceEntityId, targetEntityId) {
    if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) throw new Error('Selecciona contrapartes distintas');
    const source = state.entities.find((item) => item.id === sourceEntityId);
    const target = state.entities.find((item) => item.id === targetEntityId);
    if (!source || !target) throw new Error('Contraparte origen o destino inexistente');
    if (source.active === false || source.mergedIntoEntityId) throw new Error('La contraparte origen ya esta inactiva o fusionada');
    if (target.active === false || target.mergedIntoEntityId) throw new Error('La contraparte destino debe estar activa');
    const counts = {};
    const ambiguous = [];
    Object.entries(ENTITY_REFERENCE_FIELDS).forEach(([collection, fields]) => {
      (state[collection] || []).forEach((record) => {
        fields.forEach((field) => {
          if (record[field] === sourceEntityId) counts[`${collection}.${field}`] = (counts[`${collection}.${field}`] || 0) + 1;
        });
        Object.keys(record).filter((field) => (field === 'entityId' || field.endsWith('EntityId')) && record[field] === sourceEntityId && !fields.includes(field))
          .forEach((field) => ambiguous.push({ collection, recordId: record.id, field }));
      });
    });
    Object.entries(state).forEach(([collection, records]) => {
      if (!Array.isArray(records) || collection === 'entities' || collection === 'auditLog' || ENTITY_REFERENCE_FIELDS[collection]) return;
      records.forEach((record) => Object.keys(record || {})
        .filter((field) => (field === 'entityId' || field.endsWith('EntityId')) && record[field] === sourceEntityId)
        .forEach((field) => ambiguous.push({ collection, recordId: record.id, field })));
    });
    return { source, target, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0), ambiguous };
  }

  function mergeEntitiesTransaction(state, sourceEntityId, targetEntityId, reason, user) {
    const draft = clone(state);
    const preview = entityMergePreview(draft, sourceEntityId, targetEntityId);
    if (preview.ambiguous.length) throw new Error(`Fusion bloqueada: ${preview.ambiguous.length} referencias ambiguas`);
    Object.entries(ENTITY_REFERENCE_FIELDS).forEach(([collection, fields]) => {
      (draft[collection] || []).forEach((record) => fields.forEach((field) => {
        if (record[field] === sourceEntityId) record[field] = targetEntityId;
      }));
    });
    const source = draft.entities.find((item) => item.id === sourceEntityId);
    const mergedAt = new Date().toISOString();
    source.active = false;
    source.mergedIntoEntityId = targetEntityId;
    source.mergedAt = mergedAt;
    draft.auditLog.unshift({
      id: uid('AUD'), entityType: 'entity', entityId: sourceEntityId, action: 'merge-entities',
      changes: [{ field: 'mergedIntoEntityId', from: null, to: targetEntityId }, { field: 'references', from: null, to: preview.counts }],
      createdAt: mergedAt, reason: String(reason || '').trim() || 'Unificacion de contrapartes', user: user || 'local'
    });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createFinancialInstitutionTransaction(state, payload, user) {
    const draft = clone(state);
    draft.financialInstitutions ||= [];
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre de institucion obligatorio');
    const id = payload.id || uid('FI');
    if (draft.financialInstitutions.some((item) => item.id === id)) throw new Error('Institucion financiera duplicada');
    const institution = { id, name, active: payload.active !== false, notes: payload.notes || '' };
    draft.financialInstitutions.push(institution);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'financialInstitution', entityId: id, action: 'create-financial-institution', changes: [{ field: 'name', from: null, to: name }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta de institucion financiera', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createFinancialAccountTransaction(state, payload, user) {
    const draft = clone(state);
    draft.financialInstitutions ||= [];
    const name = String(payload.name || '').trim();
    if (!name) throw new Error('Nombre de cuenta/producto obligatorio');
    if (payload.institutionId && !draft.financialInstitutions.some((item) => item.id === payload.institutionId)) throw new Error('Institucion financiera inexistente');
    const id = payload.id || uid('ACC');
    if (draft.financialAccounts.some((item) => item.id === id)) throw new Error('Cuenta/producto financiero duplicado');
    const productType = payload.productType || (payload.type === 'loan' ? 'loan' : payload.type === 'credit_line' ? 'credit_line' : payload.type === 'card_financing' ? 'card_financing' : 'bank_account');
    if (!FINANCIAL_PRODUCT_TYPES.includes(productType)) throw new Error('Tipo de producto financiero invalido');
    const account = {
      id,
      institutionId: payload.institutionId || '',
      name,
      type: payload.type || (productType === 'bank_account' ? 'bank' : productType),
      productType,
      accountType: payload.accountType || '',
      currency: payload.currency || 'ARS',
      bankName: payload.bankName || '',
      cbu: payload.cbu || '',
      alias: payload.alias || '',
      openingBalance: Number(payload.openingBalance || 0),
      openingBalanceDate: payload.openingBalanceDate || '',
      creditLimit: payload.creditLimit == null || payload.creditLimit === '' ? null : Number(payload.creditLimit || 0),
      checkEnabled: payload.checkEnabled === true,
      active: payload.active !== false,
      notes: payload.notes || ''
    };
    draft.financialAccounts.push(account);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'financialAccount', entityId: id, action: 'create-financial-account', changes: [{ field: 'name', from: null, to: name }, { field: 'productType', from: null, to: productType }], createdAt: new Date().toISOString(), reason: payload.reason || 'Alta de cuenta/producto financiero', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateFinancialAccountTransaction(state, accountId, changes, user) {
    const draft = clone(state);
    const account = draft.financialAccounts.find((item) => item.id === accountId);
    if (!account) throw new Error('Cuenta financiera inexistente');
    const allowed = ['name', 'institutionId', 'bankName', 'alias', 'notes', 'bankTaxTreatment', 'bankTaxDebitRate', 'bankTaxCreditRate', 'bankTaxEffectiveFrom', 'bankTaxInternalTransferExempt', 'reason'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo estructural de cuenta no editable');
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio');
    if (changes.institutionId && !(draft.financialInstitutions || []).some((item) => item.id === changes.institutionId)) throw new Error('Institucion financiera inexistente');
    const auditChanges = [];
    ['name', 'institutionId', 'bankName', 'alias', 'notes'].forEach((field) => {
      if (changes[field] == null) return;
      const value = String(changes[field]).trim();
      if (field === 'name' && !value) throw new Error('Nombre de cuenta obligatorio');
      if ((account[field] || '') !== value) {
        auditChanges.push({ field, from: account[field] || '', to: value });
        account[field] = value;
      }
    });
    if (changes.bankTaxTreatment != null) {
      if (!['exempt', 'taxable', 'differential'].includes(changes.bankTaxTreatment)) throw new Error('Tratamiento bancario invalido');
      if (account.type === 'cash') throw new Error('Caja no admite impuesto bancario');
      if (account.bankTaxTreatment !== changes.bankTaxTreatment) { auditChanges.push({ field: 'bankTaxTreatment', from: account.bankTaxTreatment || '', to: changes.bankTaxTreatment }); account.bankTaxTreatment = changes.bankTaxTreatment; }
    }
    if (changes.bankTaxInternalTransferExempt != null) {
      const value = changes.bankTaxInternalTransferExempt === true || changes.bankTaxInternalTransferExempt === 'true';
      if (account.bankTaxInternalTransferExempt !== value) { auditChanges.push({ field: 'bankTaxInternalTransferExempt', from: account.bankTaxInternalTransferExempt ?? null, to: value }); account.bankTaxInternalTransferExempt = value; }
    }
    ['bankTaxDebitRate', 'bankTaxCreditRate'].forEach((field) => {
      if (changes[field] == null) return;
      const rate = Number(changes[field]);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Alicuota bancaria invalida');
      if (account[field] !== rate) { auditChanges.push({ field, from: account[field] ?? null, to: rate }); account[field] = rate; }
    });
    if (changes.bankTaxEffectiveFrom != null) {
      assertCorrectionDate(changes.bankTaxEffectiveFrom);
      if (account.bankTaxEffectiveFrom !== changes.bankTaxEffectiveFrom) { auditChanges.push({ field: 'bankTaxEffectiveFrom', from: account.bankTaxEffectiveFrom || '', to: changes.bankTaxEffectiveFrom }); account.bankTaxEffectiveFrom = changes.bankTaxEffectiveFrom; }
    }
    if (account.bankTaxTreatment && account.bankTaxTreatment !== 'exempt' && !account.bankTaxEffectiveFrom) throw new Error('Definí una fecha de vigencia para el impuesto bancario');
    if (auditChanges.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'financialAccount', entityId: accountId, action: 'update-financial-account', changes: auditChanges, createdAt: new Date().toISOString(), reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function documentInvoiceExchangeRate(value, currency) {
    if (value == null || (typeof value === 'string' && !value.trim())) return null;
    const rate = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    if (currency !== 'USD') throw new Error('TC de factura disponible solo para documentos USD');
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('TC de factura invalido: debe ser mayor que cero');
    return rate;
  }

  function createDocumentTransaction(state, payload, user) {
    const draft = clone(state);
    const id = payload.id || uid('DOC');
    const entity = draft.entities.find((x) => x.id === payload.entityId);
    if (!entity) throw new Error('Entidad inexistente');
    const inferredSide = inferredCommercialSide(payload.type);
    const liabilityOnly = payload.type === 'liability';
    const commercialSide = payload.commercialSide || (liabilityOnly ? 'purchase' : inferredSide);
    if (!commercialSide) throw new Error('Elegí Compra o Venta para este tipo de documento');
    const fiscalStatus = payload.fiscalStatus || payload.documentaryStatus || (payload.type === 'no_receipt' ? 'no_receipt' : 'documented');
    if (!['documented', 'pending_receipt', 'no_receipt'].includes(fiscalStatus)) throw new Error('Respaldo documental invalido');
    const number = String(payload.number || '').trim();
    const issueDate = String(payload.issueDate || '').trim();
    const recordDate = String(payload.recordDate || issueDate || todayIso()).trim();
    if (fiscalStatus === 'documented' && !number) throw new Error('Numero/referencia obligatorio para un documento documentado');
    if (fiscalStatus === 'documented' && !issueDate) throw new Error('Fecha de emision obligatoria para un documento documentado');
    const breakdown = documentTotalFromBreakdown({ ...payload, commercialSide }, Number(payload.amount || 0));
    if (liabilityOnly && (commercialSide !== 'purchase' || payload.chartAccountId || breakdown.taxComponents.length || !String(payload.description || '').trim())) throw new Error('La obligacion requiere concepto, lado Compra y no admite cuenta de gasto ni desglose fiscal');
    if (payload.economicTreatment != null && (!liabilityOnly || payload.economicTreatment !== 'liability_only')) throw new Error('No se reclasifican documentos comerciales como obligaciones');
    const doc = {
      id,
      type: payload.type,
      commercialSide,
      commercialSideOverride: Boolean(inferredSide && payload.commercialSide && payload.commercialSide !== inferredSide),
      fiscalStatus,
      entityId: payload.entityId,
      issueDate,
      recordDate,
      dueDate: String(payload.dueDate || '').trim(),
      number,
      amount: Number(breakdown.amount || 0),
      economicAmount: liabilityOnly ? 0 : Number(breakdown.economicAmount || 0),
      ...(liabilityOnly ? { economicTreatment: 'liability_only' } : {}),
      ...(liabilityOnly && payload.liabilityPlanNumber ? { liabilityPlanNumber: payload.liabilityPlanNumber } : {}),
      currency: payload.currency || 'ARS',
      activity: payload.activity,
      chartAccountId: payload.chartAccountId,
      description: payload.description || '',
      ...(liabilityOnly ? { notes: String(payload.notes || '') } : {}),
      voidedAt: null
    };
    const invoiceRate = documentInvoiceExchangeRate(payload.tcInvoice, doc.currency);
    if (invoiceRate != null) doc.tcInvoice = invoiceRate;
    doc.taxComponents = normalizeTaxComponents(breakdown.taxComponents || [], doc);
    if (!doc.economicAmount) doc.economicAmount = economicAmountForDocument(doc);
    if (!doc.amount || doc.amount <= 0) throw new Error('Importe invalido');
    draft.documents.push(doc);
    draft.auditLog.unshift({
      id: uid('AUD'),
      entityType: 'document',
      entityId: id,
      action: 'create-document',
      changes: [
        { field: 'type', from: null, to: doc.type },
        { field: 'amount', from: null, to: doc.amount },
        { field: 'currency', from: null, to: doc.currency },
        ...(liabilityOnly ? [{ field: 'economicTreatment', from: null, to: 'liability_only' }, { field: 'notes', from: null, to: doc.notes }, { field: 'liabilityPlanNumber', from: null, to: doc.liabilityPlanNumber || null }] : []),
        ...(doc.tcInvoice != null ? [{ field: 'tcInvoice', from: null, to: doc.tcInvoice }] : [])
      ],
      createdAt: new Date().toISOString(),
      reason: payload.reason || 'Alta de documento',
      user: user || 'local'
    });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function validateDebitNoteInvoiceLinks(state, doc, ids) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error('Vínculos de facturas inválidos o duplicados');
    if (!ids.length) return;
    if (doc.type !== 'debit_note' || doc.currency !== 'ARS' || documentDirection(doc, state) !== 'out') throw new Error('El vínculo requiere una ND de compra ARS');
    for (const id of ids) {
      const invoice = state.documents.find((item) => item.id === id);
      if (!invoice || invoice.type !== 'purchase_invoice' || invoice.entityId !== doc.entityId) throw new Error('Factura origen inexistente o de otra contraparte');
    }
  }

  function updateDocumentTransaction(state, id, changes, user) {
    const draft = clone(state);
    const doc = draft.documents.find((x) => x.id === id);
    if (!doc) throw new Error('Documento inexistente');
    if (doc.voidedAt) throw new Error('No se edita un documento anulado');
    const allowed = ['number', 'issueDate', 'recordDate', 'dueDate', 'description', 'notes', 'chartAccountId', 'activity', 'fiscalStatus', 'tcInvoice', 'relatedInvoiceIds', 'reason'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo economico no editable mediante edicion administrativa');
    if (Object.prototype.hasOwnProperty.call(changes, 'relatedInvoiceIds')) {
      if (!String(changes.reason || '').trim()) throw new Error('Motivo obligatorio para vincular facturas');
      validateDebitNoteInvoiceLinks(draft, doc, changes.relatedInvoiceIds);
    }
    const linked = draft.orderDocuments.some((link) => link.documentId === id);
    if (linked && ['chartAccountId', 'activity'].some((field) => Object.prototype.hasOwnProperty.call(changes, field) && changes[field] !== doc[field])) throw new Error('Documento vinculado: la imputacion requiere una correccion especifica');
    const fiscalStatus = changes.fiscalStatus || doc.fiscalStatus || 'documented';
    const number = changes.number == null ? doc.number : String(changes.number).trim();
    const issueDate = changes.issueDate == null ? doc.issueDate : String(changes.issueDate).trim();
    const dueDate = changes.dueDate == null ? doc.dueDate : String(changes.dueDate).trim();
    if (fiscalStatus === 'documented' && !number) throw new Error('Numero/referencia obligatorio para un documento documentado');
    if (fiscalStatus === 'documented' && !issueDate) throw new Error('Fecha de emision obligatoria para un documento documentado');
    [issueDate, dueDate].filter(Boolean).forEach(assertCorrectionDate);
    if (dueDate && issueDate && issueDate > dueDate) throw new Error('Vencimiento anterior a la fecha del documento');
    if (issueDate && draft.orderDocuments.filter((link) => link.documentId === id && !link.voidedAt).some((link) => draft.orders.find((order) => order.id === link.orderId)?.date < issueDate)) throw new Error('Fecha del documento posterior a una orden vinculada');
    const auditChanges = [];
    allowed.forEach((field) => {
      if (field === 'reason') return;
      if (!Object.prototype.hasOwnProperty.call(changes, field)) return;
      const value = field === 'tcInvoice' ? documentInvoiceExchangeRate(changes[field], doc.currency) : changes[field];
      if (doc[field] !== value) {
        auditChanges.push({ field, from: doc[field] ?? null, to: value });
        doc[field] = value;
      }
    });
    if (!auditChanges.length) return draft;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: id, action: 'update-document', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason || 'Edicion controlada', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function correctHistoricalDocumentTransaction(state, id, changes, user) {
    const draft = clone(state);
    const doc = draft.documents.find((item) => item.id === id);
    if (!doc || doc.voidedAt) throw new Error('Documento inexistente o anulado');
    const allowed = ['amount', 'number', 'type', 'fiscalStatus', 'issueDate', 'dueDate', 'activity', 'chartAccountId', 'tcInvoice', 'calculationMode', 'netTaxedAmount', 'vatRate', 'vatAmount', 'exemptAmount', 'notTaxedAmount', 'perceptionVat', 'perceptionIibb', 'otherPerceptions', 'otherExpenses', 'otherDeductions', 'reason'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo historico no editable');
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio');
    const links = draft.orderDocuments.filter((item) => item.documentId === id && !item.voidedAt);
    const auditChanges = [];
    const update = (record, field, value) => {
      if (record[field] !== value) {
        auditChanges.push({ recordId: record.id, field, from: record[field] ?? null, to: value });
        record[field] = value;
      }
    };
    if (Object.prototype.hasOwnProperty.call(changes, 'tcInvoice')) update(doc, 'tcInvoice', documentInvoiceExchangeRate(changes.tcInvoice, doc.currency));
    const specialized = Boolean(doc.grainLiquidationId || doc.livestockTradeId || ['grainLiquidations', 'livestockTrades', 'taxReimbursements'].some((key) => (draft[key] || []).some((item) => item.documentId === id)));
    const fiscalFields = ['calculationMode', 'netTaxedAmount', 'vatRate', 'vatAmount', 'exemptAmount', 'notTaxedAmount', 'perceptionVat', 'perceptionIibb', 'otherPerceptions', 'otherExpenses', 'otherDeductions'];
    const liabilityOnly = doc.economicTreatment === 'liability_only';
    if (liabilityOnly && (fiscalFields.some((field) => changes[field] != null) || changes.type != null && changes.type !== doc.type || changes.chartAccountId)) throw new Error('La obligacion sin resultado no admite desglose fiscal, cuenta de gasto ni cambio de tipo');
    if (specialized && (changes.amount != null || fiscalFields.some((field) => changes[field] != null))) throw new Error('Correccion ambigua: documento con origen especializado');
    let correctedAmount = changes.amount == null ? Number(doc.amount || 0) : Number(changes.amount);
    if (fiscalFields.some((field) => changes[field] != null)) {
      const mode = changes.calculationMode || 'net';
      const calculated = calculateSimpleDocumentTax({ mode, netTaxedAmount: changes.netTaxedAmount, totalAmount: changes.amount, vatRate: changes.vatRate, exemptAmount: changes.exemptAmount, notTaxedAmount: changes.notTaxedAmount, perceptions: Number(changes.perceptionVat || 0) + Number(changes.perceptionIibb || 0) + Number(changes.otherPerceptions || 0), otherCharges: changes.otherExpenses, otherDeductions: changes.otherDeductions });
      const explicitVat = changes.vatAmount == null || changes.vatAmount === '' ? calculated.vatAmount : Math.round(Number(changes.vatAmount) * 100) / 100;
      correctedAmount = Math.round((calculated.netTaxedAmount + explicitVat + Number(changes.exemptAmount || 0) + Number(changes.notTaxedAmount || 0) + Number(changes.perceptionVat || 0) + Number(changes.perceptionIibb || 0) + Number(changes.otherPerceptions || 0) + Number(changes.otherExpenses || 0) - Number(changes.otherDeductions || 0)) * 100) / 100;
      if (mode === 'total' && Math.abs(correctedAmount - Number(changes.amount || 0)) > 0.01) throw new Error('El total no reconcilia con el desglose fiscal');
      const components = [];
      if (calculated.netTaxedAmount) components.push({ taxType: 'net_taxed', taxableBase: calculated.netTaxedAmount, amount: calculated.netTaxedAmount, category: 'economic' });
      if (explicitVat) components.push({ taxType: 'vat', rate: Number(changes.vatRate || 0), taxableBase: calculated.netTaxedAmount, amount: explicitVat });
      if (Number(changes.exemptAmount || 0)) components.push({ taxType: 'exempt', amount: Number(changes.exemptAmount), category: 'economic' });
      if (Number(changes.notTaxedAmount || 0)) components.push({ taxType: 'not_taxed', amount: Number(changes.notTaxedAmount), category: 'economic' });
      if (Number(changes.perceptionVat || 0)) components.push({ taxType: 'perception_vat', amount: Number(changes.perceptionVat), effect: 'add' });
      if (Number(changes.perceptionIibb || 0)) components.push({ taxType: 'perception_iibb', amount: Number(changes.perceptionIibb), effect: 'add' });
      if (Number(changes.otherPerceptions || 0)) components.push({ taxType: 'perception_other', amount: Number(changes.otherPerceptions), effect: 'add' });
      if (Number(changes.otherExpenses || 0)) components.push({ taxType: 'other', amount: Number(changes.otherExpenses), effect: 'add', notes: 'Otros cargos' });
      if (Number(changes.otherDeductions || 0)) components.push({ taxType: 'other', amount: Number(changes.otherDeductions), effect: 'subtract', notes: 'Otras deducciones' });
      update(doc, 'taxComponents', normalizeTaxComponents(components, doc));
      update(doc, 'economicAmount', Math.round((calculated.netTaxedAmount + Number(changes.exemptAmount || 0) + Number(changes.notTaxedAmount || 0)) * 100) / 100);
    } else if (!liabilityOnly && changes.amount != null && Number(changes.amount) !== doc.amount && ((doc.taxComponents || []).length || doc.financialAmount != null || Math.abs(economicAmountForDocument(doc) - doc.amount) > 0.001)) {
      throw new Error('Correccion ambigua: requiere desglose economico/fiscal');
    }
    if (changes.amount != null || fiscalFields.some((field) => changes[field] != null)) {
      if (!Number.isFinite(correctedAmount) || correctedAmount <= 0 || Math.abs(correctedAmount * 100 - Math.round(correctedAmount * 100)) > 0.0001) throw new Error('Importe invalido: usar centavos');
      const assigned = links.reduce((sum, item) => sum + Math.round(item.amountApplied * 100), 0);
      if (Math.round(correctedAmount * 100) < assigned) throw new Error('Documento sobreaplicado: importe inferior al ya asignado');
      update(doc, 'amount', correctedAmount);
      if (!fiscalFields.some((field) => changes[field] != null)) update(doc, 'economicAmount', liabilityOnly ? 0 : correctedAmount);
    }
    ['number', 'fiscalStatus', 'issueDate', 'dueDate'].forEach((field) => {
      if (changes[field] == null) return;
      const value = String(changes[field]).trim();
      if (['issueDate', 'dueDate'].includes(field) && value) assertCorrectionDate(value);
      update(doc, field, value);
    });
    if (changes.type != null && changes.type !== doc.type) {
      const expected = noteCommercialSide(draft, doc) === 'sale' ? 'sale_invoice' : 'purchase_invoice';
      if (doc.type !== 'no_receipt' || changes.type !== expected || specialized) throw new Error('Tipo historico ambiguo: solo se convierte sin comprobante a factura del mismo sentido comercial');
      if ((changes.fiscalStatus || doc.fiscalStatus) !== 'documented' || !String(changes.number ?? doc.number ?? '').trim()) throw new Error('Factura documentada requiere respaldo y numero');
      update(doc, 'type', changes.type);
      if (doc.documentaryStatus === 'no_receipt') update(doc, 'documentaryStatus', 'documented');
    }
    if ((changes.fiscalStatus || doc.fiscalStatus) === 'documented' && !String((changes.number ?? doc.number) || '').trim()) throw new Error('Numero obligatorio para documento documentado');
    if (doc.issueDate && doc.dueDate && doc.issueDate > doc.dueDate) throw new Error('Vencimiento anterior a la emision');
    const activity = changes.activity ?? doc.activity;
    const accountId = changes.chartAccountId ?? doc.chartAccountId;
    if (activity !== doc.activity || accountId !== doc.chartAccountId) {
      const account = chartAccount(draft, accountId);
      if (!ACTIVITIES.includes(activity) || (!liabilityOnly && (!account || account.active === false || !chartAccountSupportsActivity(account, activity)))) throw new Error('Imputacion invalida');
      const orders = [...new Set(links.map((item) => item.orderId))].map((orderId) => draft.orders.find((item) => item.id === orderId));
      if (orders.some((order) => !order || order.voidedAt || draft.orderDocuments.some((item) => item.orderId === order.id && item.documentId !== id))) throw new Error('Correccion ambigua: orden compartida o historica');
      update(doc, 'activity', activity);
      update(doc, 'chartAccountId', accountId);
      orders.forEach((order) => update(order, 'activity', activity));
    }
    if (auditChanges.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: id, action: 'correct-historical-document', changes: auditChanges, createdAt: new Date().toISOString(), reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function editDocumentTransaction(state, id, changes, user) {
    const simpleFields = ['description', 'notes', 'recordDate'];
    const simple = Object.fromEntries(Object.entries(changes).filter(([field]) => simpleFields.includes(field)));
    const historical = Object.fromEntries(Object.entries(changes).filter(([field]) => !simpleFields.includes(field) && field !== 'reason'));
    if (!Object.keys(simple).length && !Object.keys(historical).length) return clone(state);
    if (!Object.keys(historical).length) return updateDocumentTransaction(state, id, { ...simple, reason: changes.reason || 'Edición administrativa' }, user);
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para modificar datos sensibles del documento');
    const corrected = correctHistoricalDocumentTransaction(state, id, { ...historical, reason }, user);
    return Object.keys(simple).length ? updateDocumentTransaction(corrected, id, { ...simple, reason }, user) : corrected;
  }

  function voidRecordTransaction(state, entityType, id, reason, user) {
    const draft = clone(state);
    const now = new Date().toISOString();
    const map = {
      document: draft.documents,
      order: draft.orders,
      instrument: draft.instruments
    };
    const collection = map[entityType];
    if (!collection) throw new Error('Tipo no anulable');
    const record = collection.find((x) => x.id === id);
    if (!record) throw new Error('Registro inexistente');
    if (record.voidedAt) return draft;
    if (entityType === 'instrument' && record.internalTransferId) throw new Error('La transferencia interna requiere una reversa conjunta de ambas cuentas');
    if (entityType === 'order') {
      const practicedIds = new Set((draft.orderPracticedWithholdings || []).filter((item) => item.orderId === id && !item.voidedAt).map((item) => item.id));
      if ((draft.taxPayments || []).some((payment) => (payment.allocations || []).some((allocation) => practicedIds.has(allocation.withholdingId)))) throw new Error('No se puede anular la OP: existen retenciones practicadas ingresadas con VEP');
    }
    const instrumentChanges = [];
    if (entityType === 'order') {
      const linked = draft.orderInstruments.filter((link) => link.orderId === id && !link.voidedAt);
      linked.forEach((link) => {
        const instrument = draft.instruments.find((item) => item.id === link.instrumentId);
        if (!instrument) throw new Error(`Instrumento inexistente ${link.instrumentId}`);
        if (draft.orderInstruments.some((other) => other.instrumentId === instrument.id && other.id !== link.id && !other.voidedAt && !draft.orders.find((order) => order.id === other.orderId)?.voidedAt)) throw new Error(`El instrumento ${instrument.id} también pertenece a otra orden activa`);
        if (instrumentIsBankRealized(instrument) || instrument.executedDate || instrument.internalTransferId || instrument.deliveredToEntityId || instrument.endorsedToEntityId || !['scheduled', 'issued', 'voided', 'cancelled', 'rejected'].includes(instrument.status)) throw new Error(`El instrumento ${instrument.reference || instrument.id} tiene efectos o uso posterior; requiere reversión específica antes de anular la orden`);
        if (instrumentDependentRecords(draft, instrument.id).length || (draft.bankCharges || []).some((charge) => charge.instrumentId === instrument.id)) throw new Error(`El instrumento ${instrument.reference || instrument.id} conserva relaciones financieras; requiere revisión antes de anular la orden`);
      });
      linked.forEach((link) => {
        const instrument = draft.instruments.find((item) => item.id === link.instrumentId);
        if (['scheduled', 'issued'].includes(instrument.status)) {
          instrumentChanges.push({ field: `instruments.${instrument.id}.status`, from: instrument.status, to: 'voided' });
          instrumentChanges.push({ field: `instruments.${instrument.id}.voidedAt`, from: instrument.voidedAt || null, to: now });
          instrument.status = 'voided';
          instrument.voidedAt = now;
        }
      });
    }
    record.voidedAt = now;
    if (entityType === 'instrument') { record.status = 'voided'; syncBankTaxForInstrument(draft, record); }
    if (entityType === 'order') {
      draft.orderDocuments.filter((x) => x.orderId === id).forEach((x) => { x.voidedAt = now; });
      draft.orderInstruments.filter((x) => x.orderId === id).forEach((x) => { x.voidedAt = now; });
      const odIds = new Set(draft.orderDocuments.filter((x) => x.orderId === id).map((x) => x.id));
      const oiIds = new Set(draft.orderInstruments.filter((x) => x.orderId === id).map((x) => x.id));
      draft.orderDocumentSettlements.filter((x) => odIds.has(x.orderDocumentId) || oiIds.has(x.orderInstrumentId)).forEach((x) => { x.voidedAt = now; });
      (draft.orderTaxWithholdings || []).filter((x) => x.orderId === id).forEach((x) => { x.voidedAt = now; });
      (draft.orderPracticedWithholdings || []).filter((x) => x.orderId === id).forEach((x) => { x.voidedAt = now; });
    }
    draft.auditLog.unshift({ id: uid('AUD'), entityType, entityId: id, action: 'void-record', changes: [{ field: 'voidedAt', from: null, to: now }, ...instrumentChanges], createdAt: now, reason: reason || 'Anulacion/reversa', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function documentDeletionPreview(state, documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) throw new Error('Documento inexistente');
    const blockers = [];
    if ((state.documentCompensations || []).some((item) => !item.voidedAt && [item.creditDocumentId, item.debtDocumentId].includes(documentId))) blockers.push('El documento participa en una compensación vigente');
    if (state.documents.some((item) => item.relatedInvoiceIds?.includes(documentId))) blockers.push('La factura tiene una ND con vínculo informativo; revisar ese vínculo antes de eliminar');
    const links = state.orderDocuments.filter((item) => item.documentId === documentId);
    const orders = links.map((link) => state.orders.find((item) => item.id === link.orderId)).filter(Boolean);
    const orderIds = new Set(orders.map((item) => item.id));
    const linkIds = new Set(links.map((item) => item.id));
    const instrumentLinks = state.orderInstruments.filter((item) => orderIds.has(item.orderId));
    const instrumentLinkIds = new Set(instrumentLinks.map((item) => item.id));
    const instruments = state.instruments.filter((item) => instrumentLinks.some((link) => link.instrumentId === item.id));
    const settlements = state.orderDocumentSettlements.filter((item) => linkIds.has(item.orderDocumentId) || instrumentLinkIds.has(item.orderInstrumentId));
    const displayOrder = (id) => orderDisplayCode(state, id) || id;
    if (links.length > 1 || new Set(orders.map((item) => item.id)).size !== orders.length) blockers.push('Existen varias OP/OC vinculadas');
    links.forEach((link) => {
      const order = state.orders.find((item) => item.id === link.orderId);
      if (!order || state.orderDocuments.some((item) => item.orderId === link.orderId && item.id !== link.id)) blockers.push(`La OP/OC ${displayOrder(link.orderId)} tiene otras relaciones documentales`);
      if ((state.orderTaxWithholdings || []).some((item) => item.orderDocumentId === link.id) || (state.orderPracticedWithholdings || []).some((item) => item.orderDocumentId === link.id)) blockers.push(`La OP/OC ${displayOrder(link.orderId)} tiene retenciones asociadas`);
    });
    instrumentLinks.forEach((link) => {
      const instrument = state.instruments.find((item) => item.id === link.instrumentId);
      if (!instrument || !link.voidedAt || !instrument.voidedAt || instrument.status !== 'voided') blockers.push(`La OP/OC ${displayOrder(link.orderId)} conserva el instrumento activo o ambiguo ${instrument?.reference || instrument?.checkNumber || link.instrumentId}`);
      const historicallyUsed = instrument && (state.auditLog || []).some((entry) =>
        entry.entityType === 'instrument' && entry.entityId === instrument.id &&
        (entry.action === 'reverse-realized-instrument' || (entry.action === 'transition-instrument' &&
          (entry.changes || []).some((change) => change.field === 'status' && ['executed', 'debited', 'accredited', 'endorsed'].includes(change.to))))
      );
      if (instrument && (instrument.executedDate || instrument.endorsedToEntityId || instrument.deliveredToEntityId || instrument.internalTransferId || historicallyUsed)) blockers.push(`El instrumento ${instrument.reference || instrument.checkNumber || instrument.id} tiene realizacion o uso historico`);
      if ((state.bankCharges || []).some((charge) => charge.instrumentId === link.instrumentId)) blockers.push(`El instrumento ${instrument?.reference || link.instrumentId} conserva un cargo bancario`);
    });
    settlements.forEach((item) => {
      if (!linkIds.has(item.orderDocumentId) || !instrumentLinkIds.has(item.orderInstrumentId) || !item.voidedAt) blockers.push(`Settlement ${item.id} conserva efecto o relacion externa (importe ${item.amount})`);
    });
    const references = (value) => {
      if (!value || typeof value !== 'object') return false;
      if (Array.isArray(value)) return value.some(references);
      return Object.entries(value).some(([key, nested]) => (typeof nested === 'string' && nested === documentId && /document|source|reference|origin/i.test(key)) || references(nested));
    };
    const records = { documents: [doc.id], orders: orders.map((item) => item.id), orderDocuments: links.map((item) => item.id), instruments: instruments.map((item) => item.id), orderInstruments: instrumentLinks.map((item) => item.id), orderDocumentSettlements: settlements.map((item) => item.id) };
    const removedIds = new Set(Object.values(records).flat());
    const refersToRemoved = (value) => value && typeof value === 'object' && Object.entries(value).some(([key, nested]) =>
      (key !== 'id' && typeof nested === 'string' && removedIds.has(nested)) ||
      (nested && typeof nested === 'object' && refersToRemoved(nested))
    );
    Object.entries(state).forEach(([collection, items]) => {
      if (!Array.isArray(items) || collection === 'auditLog') return;
      items.forEach((record) => {
        if (removedIds.has(record.id)) return;
        if (references(record)) blockers.push(`Existe referencia en ${collection}: ${record.id || 'sin ID'}`);
        if (refersToRemoved(record)) blockers.push(`Existe relacion externa en ${collection}: ${record.id || 'sin ID'}`);
      });
    });
    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], document: { id: doc.id, number: doc.number, date: doc.issueDate || doc.recordDate || '', amount: doc.amount, currency: doc.currency, entityId: doc.entityId }, records };
  }

  function deleteDocumentTransaction(state, documentId, reason, user) {
    const preview = documentDeletionPreview(state, documentId);
    if (!preview.allowed) throw new Error(`No se puede eliminar: ${preview.blockers.join('; ')}`);
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio para eliminar documento');
    const draft = clone(state);
    const snapshot = {};
    Object.entries(preview.records).forEach(([collection, ids]) => {
      const removed = new Set(ids);
      snapshot[collection] = draft[collection].filter((item) => removed.has(item.id));
      draft[collection] = draft[collection].filter((item) => !removed.has(item.id));
    });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: documentId, action: 'delete-document', changes: [{ field: 'deletedRecords', from: snapshot, to: null }], createdAt: new Date().toISOString(), reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function artificialDocumentCleanupPreview(state, documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) return { allowed: false, blockers: [`Documento inexistente ${documentId}`] };
    const blockers = [];
    const migration = doc.migration || {};
    if (doc.voidedAt) blockers.push('El documento ya está inactivo');
    if (doc.type !== 'no_receipt' || migration.inferred !== true || migration.sourceCollection !== 'orders' || !migration.sourceId || !String(migration.reason || '').startsWith('Documento referido incompatible;')) {
      blockers.push('La procedencia no demuestra que sea un documento operativo inferido por una factura referida incompatible');
    }
    if (migration.accountingReviewRequired) blockers.push('El documento conserva revisión contable manual');
    if ((doc.taxComponents || []).length) blockers.push('El documento conserva componentes económicos/fiscales propios');
    const ownChanges = (state.auditLog || []).filter((entry) => entry.entityType === 'document' && entry.entityId === documentId);
    if (ownChanges.length) blockers.push(`El documento tuvo cambios propios (${ownChanges.map((entry) => entry.action).join(', ')}); requiere revisión específica`);
    const proofs = (state.auditLog || []).filter((entry) => entry.action === 'link-existing-order' && entry.entityType === 'order').flatMap((entry) => {
      const change = (entry.changes || []).find((item) => item.field === 'documentApplications');
      const previous = change?.from, next = change?.to;
      if (!previous || !next || previous.order.id !== entry.entityId || next.order.id !== entry.entityId) return [];
      const order = state.orders.find((item) => item.id === entry.entityId);
      if (!order || order.voidedAt || order.migration?.sourceCollection !== 'orders' || order.migration.sourceId !== migration.sourceId) return [];
      return (previous.orderDocuments || []).filter((link) => link.documentId === documentId).flatMap((link) =>
        (next.orderDocuments || []).filter((moved) => moved.id === link.id && moved.documentId !== documentId &&
          state.orderDocuments.some((current) => current.id === moved.id && current.orderId === order.id && current.documentId === moved.documentId && !current.voidedAt)).map((moved) => ({
          orderId: order.id, orderNumber: orderDisplayCode(state, order), orderDocumentId: moved.id, targetDocumentId: moved.documentId, auditId: entry.id
        })));
    });
    const verifiedProofs = proofs.filter((proof) => {
      const target = state.documents.find((item) => item.id === proof.targetDocumentId && !item.voidedAt);
      return target && target.migration?.inferred === false && ['invoices', 'settlements'].includes(target.migration.sourceCollection) && target.entityId === doc.entityId && documentDirection(target, state) === documentDirection(doc, state);
    });
    if (!verifiedProofs.length) blockers.push('Falta una reasignación auditada de su OP/OC hacia un comprobante migrado real de la misma contraparte y lado comercial');
    const references = (value) => {
      if (value === documentId) return true;
      if (!value || typeof value !== 'object') return false;
      return Object.values(value).some(references);
    };
    Object.entries(state).forEach(([collection, records]) => {
      if (!Array.isArray(records) || ['documents', 'auditLog'].includes(collection)) return;
      records.filter(references).forEach((record) => blockers.push(`Relación vigente o histórica en ${collection}: ${record.id || 'sin ID'}; requiere revisión específica`));
    });
    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], document: clone(doc), proofs: clone(verifiedProofs) };
  }

  function cleanupArtificialDocumentTransaction(state, documentId, reason, user) {
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio para limpiar el documento artificial');
    const initialErrors = validateState(state);
    if (initialErrors.length) throw new Error(`Estado inicial invalido: ${initialErrors.join('; ')}`);
    const preview = artificialDocumentCleanupPreview(state, documentId);
    if (!preview.allowed) throw new Error(`No se puede limpiar el documento artificial: ${preview.blockers.join('; ')}`);
    const draft = clone(state);
    const doc = draft.documents.find((item) => item.id === documentId);
    const before = clone(doc);
    const now = new Date().toISOString();
    doc.voidedAt = now;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: documentId, action: 'cleanup-inferred-document',
      changes: [{ field: 'document', from: before, to: clone(doc) }, { field: 'reassignmentProofs', from: null, to: preview.proofs }],
      createdAt: now, reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function reassignedMigratedDocumentPreview(state, documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) return { allowed: false, blockers: [`Documento inexistente ${documentId}`] };
    const migration = doc.migration || {};
    const blockers = [];
    if (doc.voidedAt) blockers.push('El documento ya está inactivo');
    if (doc.type !== 'no_receipt' || migration.inferred !== true || migration.sourceCollection !== 'orders' ||
        !migration.sourceId || !migration.sourceOrderNumber || doc.number !== migration.sourceOrderNumber) {
      blockers.push('Falta procedencia inequívoca de documento operativo inferido desde una orden migrada');
    }
    if (migration.accountingReviewRequired) blockers.push('El documento requiere revisión contable manual');
    if ((doc.taxComponents || []).length) blockers.push('El documento tiene componentes fiscales propios');
    if (Math.abs(Number(doc.economicAmount ?? doc.amount) - Number(doc.amount)) > 0.001) blockers.push('El documento tiene un importe económico propio diferente del importe migrado');
    const ownChanges = (state.auditLog || []).filter((entry) => entry.entityType === 'document' && entry.entityId === documentId);
    if (ownChanges.length) blockers.push(`El documento tuvo cambios propios (${ownChanges.map((entry) => entry.action).join(', ')})`);
    const orders = state.orders.filter((item) => item.migration?.sourceCollection === 'orders' && item.migration.sourceId === migration.sourceId);
    if (orders.length !== 1 || orders[0].voidedAt || orders[0].migration.sourceOrderNumber !== migration.sourceOrderNumber) {
      blockers.push('No hay una única OP/OC migrada activa que coincida con migration.sourceId y su número de origen');
    }
    const order = orders.length === 1 ? orders[0] : null;
    const proofs = (state.auditLog || []).filter((entry) => entry.action === 'link-existing-order' && entry.entityType === 'order' && entry.entityId === order?.id).flatMap((entry) => {
      const change = (entry.changes || []).find((item) => item.field === 'documentApplications');
      const previous = change?.from, next = change?.to;
      if (!previous || !next || previous.order?.id !== order.id || next.order?.id !== order.id) return [];
      return (previous.orderDocuments || []).filter((link) => link.documentId === documentId && link.orderId === order.id).flatMap((link) =>
        (next.orderDocuments || []).filter((moved) => moved.id === link.id && moved.orderId === order.id && moved.documentId !== documentId).map((moved) => {
          const current = state.orderDocuments.find((item) => item.id === moved.id);
          const target = state.documents.find((item) => item.id === moved.documentId);
          const issues = [];
          if (!target || target.voidedAt) issues.push(`Documento destino ${moved.documentId} inexistente o anulado`);
          else {
            if (target.migration?.inferred === true || !['purchase_invoice', 'sale_invoice', 'settlement'].includes(target.type)) issues.push(`Documento destino ${target.number || target.id} no es un comprobante real`);
            if (target.entityId !== doc.entityId) issues.push(`Documento destino ${target.number || target.id} tiene otra contraparte`);
            if (documentDirection(target, state) !== documentDirection(doc, state)) issues.push(`Documento destino ${target.number || target.id} tiene otro lado comercial`);
          }
          if (Number(link.amountApplied) !== Number(moved.amountApplied) || link.currency !== moved.currency) issues.push(`La OP/OC ${orderDisplayCode(state, order)} cambió importe o moneda al reasignarse`);
          if (current?.orderId !== order.id || current.documentId !== moved.documentId || current.voidedAt ||
              Number(current.amountApplied) !== Number(moved.amountApplied) || current.currency !== moved.currency) issues.push(`Vínculo actual ${moved.id} no coincide con la reasignación auditada`);
          return { auditId: entry.id, orderId: order.id, orderNumber: orderDisplayCode(state, order),
            orderDocumentId: moved.id, targetDocumentId: moved.documentId, targetNumber: target?.number || '',
            amount: Number(moved.amountApplied), currency: moved.currency, issues, valid: issues.length === 0
          };
        }));
    });
    if (proofs.length !== 1) blockers.push(`Se requiere una única reasignación auditada de la OP/OC al comprobante real; encontradas: ${proofs.length}`);
    else blockers.push(...proofs[0].issues);
    const proof = proofs.length === 1 && proofs[0].valid ? proofs[0] : null;
    if (proof && (Math.abs(Number(doc.amount) - proof.amount) > 0.001 || doc.currency !== proof.currency)) {
      blockers.push('El importe/moneda del documento origen no concilia íntegramente con la imputación reasignada');
    }
    const balance = documentBreakdown(state, documentId);
    if (!balance || Math.abs(Number(balance.assigned || 0)) > 0.001 || Math.abs(Number(balance.commercialCancelled || 0)) > 0.001 ||
        Math.abs(Number(balance.committedPending || 0)) > 0.001) blockers.push('El documento origen aún conserva saldo aplicado o instrumentado');
    const references = (value) => {
      if (value === documentId) return true;
      if (!value || typeof value !== 'object') return false;
      return Object.values(value).some(references);
    };
    Object.entries(state).forEach(([collection, records]) => {
      if (!Array.isArray(records) || ['documents', 'auditLog'].includes(collection)) return;
      records.filter(references).forEach((record) => blockers.push(`Relación vigente o histórica en ${collection}: ${record.id || 'sin ID'}; requiere revisión específica`));
    });
    return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], document: clone(doc), proof: proof ? clone(proof) : null };
  }

  function documentRemovalPreview(state, documentId) {
    const doc = state.documents.find((item) => item.id === documentId);
    if (!doc) return { allowed: false, kind: 'blocked', blockers: [`Documento inexistente ${documentId}`] };
    if (doc.migration?.inferred === true || doc.migration?.sourceCollection === 'orders') {
      const cleanup = artificialDocumentCleanupPreview(state, documentId);
      if (cleanup.allowed) return { ...cleanup, kind: 'artificial-cleanup' };
      const reassigned = reassignedMigratedDocumentPreview(state, documentId);
      if (reassigned.allowed) return { ...reassigned, kind: 'reassigned-source' };
      const cleanupCandidate = String(doc.migration?.reason || '').startsWith('Documento referido incompatible;');
      return { allowed: false, kind: 'blocked', blockers: [...new Set(cleanupCandidate ? [...cleanup.blockers, ...reassigned.blockers] : reassigned.blockers)] };
    }
    return { ...documentDeletionPreview(state, documentId), kind: 'normal-delete' };
  }

  function removeDocumentTransaction(state, documentId, reason, user) {
    const preview = documentRemovalPreview(state, documentId);
    if (!preview.allowed) throw new Error(`No se puede eliminar: ${preview.blockers.join('; ')}`);
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio para retirar el documento');
    if (preview.kind === 'normal-delete') return deleteDocumentTransaction(state, documentId, reason, user);
    if (preview.kind === 'artificial-cleanup') return cleanupArtificialDocumentTransaction(state, documentId, reason, user);
    const initialErrors = validateState(state);
    if (initialErrors.length) throw new Error(`Estado inicial invalido: ${initialErrors.join('; ')}`);
    const draft = clone(state);
    const doc = draft.documents.find((item) => item.id === documentId);
    const before = clone(doc);
    const now = new Date().toISOString();
    doc.voidedAt = now;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: documentId, action: 'reconcile-migrated-source-document',
      changes: [{ field: 'document', from: before, to: clone(doc) }, { field: 'reassignmentProof', from: null, to: preview.proof }],
      createdAt: now, reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function pendingAmountForDocument(state, documentId) {
    const b = documentBreakdown(state, documentId);
    return b ? b.nonInstrumented : 0;
  }

  function createOrderTransaction(state, payload, user) {
    const draft = clone(state);
    const selectedDocs = payload.documents || [{ documentId: payload.documentId, amountApplied: payload.amountApplied }];
    const docs = selectedDocs.map((item) => {
      const doc = draft.documents.find((d) => d.id === item.documentId);
      if (!doc) throw new Error(`Documento inexistente: ${item.documentId}`);
      return { doc, amountApplied: Number(item.amountApplied || 0) };
    }).filter((item) => item.amountApplied > 0);
    if (!docs.length) throw new Error('La orden necesita al menos un documento');
    const account = draft.financialAccounts.find((a) => a.id === payload.financialAccountId);
    if (!account && !(payload.instruments || []).some((item) => item.financialAccountId)) throw new Error('Cuenta inexistente');
    const firstDoc = docs[0].doc;
    docs.forEach(({ doc, amountApplied }) => {
      if (doc.entityId !== firstDoc.entityId) throw new Error('Todos los documentos deben ser de la misma entidad');
      if (doc.currency !== firstDoc.currency) throw new Error('Todos los documentos deben tener la misma moneda');
      if (pendingAmountForDocument(draft, doc.id) + 0.01 < amountApplied) throw new Error(`Documento sin saldo suficiente: ${doc.number}`);
    });
    const orderId = uid('OP');
    const orderDocuments = docs.map(({ doc, amountApplied }) => {
      const orderDocument = { id: uid('OD'), orderId, documentId: doc.id, amountApplied, currency: doc.currency, voidedAt: null };
      draft.orderDocuments.push(orderDocument);
      return orderDocument;
    });
    const totalApplied = orderDocuments.reduce((sum, item) => sum + item.amountApplied, 0);
    draft.orders.push({ id: orderId, type: payload.type || 'payment', entityId: firstDoc.entityId, date: payload.date || todayIso(), description: payload.description || firstDoc.description, activity: firstDoc.activity, currency: firstDoc.currency, voidedAt: null });
    const orderInstruments = (payload.instruments || []).map((item) => {
      if (item.type === 'bank_loan') throw new Error('Circuito de prestamos pendiente de configuracion');
      const application = normalizeInstrumentApplication(item, firstDoc.currency);
      const instrumentAccount = draft.financialAccounts.find((accountItem) => accountItem.id === (item.financialAccountId || account?.id));
      if (!instrumentAccount) throw new Error('Cuenta/producto financiero inexistente');
      if (instrumentAccount.currency !== application.currency) throw new Error('Cuenta/producto incompatible con moneda');
      if (item.type === 'own_check' && instrumentAccount.checkEnabled !== true) throw new Error('La cuenta seleccionada no emite cheques');
      if (item.type === 'account_debit' && ((instrumentAccount.productType || 'bank_account') !== 'bank_account' || instrumentAccount.type === 'cash')) throw new Error('Debito en cuenta requiere una cuenta bancaria');
      if (item.deliveredDate) assertCorrectionDate(item.deliveredDate);
      const instrumentId = uid('INS');
      const orderInstrumentId = uid('OI');
      const amount = Number(item.amount || 0);
      if (amount <= 0) throw new Error('Instrumento con importe invalido');
      draft.instruments.push({
        id: instrumentId,
        type: item.type,
        direction: payload.type === 'collection' ? 'in' : 'out',
        entityId: firstDoc.entityId,
        financialAccountId: instrumentAccount.id,
        amount,
        currency: application.currency,
        scheduledDate: item.scheduledDate,
        ...(item.type === 'own_check' && item.status === 'delivered' && item.deliveredDate ? { deliveredDate: item.deliveredDate } : {}),
        executedDate: instrumentIsBankRealized({ type: item.type, status: item.status }) ? item.executedDate || item.scheduledDate : null,
        status: item.status,
        reference: item.reference || '',
        checkNumber: item.checkNumber || item.reference || '',
        bankName: item.type === 'received_check' ? item.bankName || '' : instrumentAccount.bankName || accountName(draft, instrumentAccount.id),
        notes: item.notes || '',
        bankTaxEligible: true
      });
      const orderInstrument = { id: orderInstrumentId, orderId, instrumentId, amount, currency: application.currency, ...applicationLinkFields(application), voidedAt: null };
      draft.orderInstruments.push(orderInstrument);
      return orderInstrument;
    });
    const totalInstrumented = orderInstruments.reduce((sum, item) => sum + orderInstrumentCommercialAmount(item), 0);
    const withholdings = normalizeOrderWithholdings(payload.withholdings || []);
    const practicedWithholdings = normalizeOrderWithholdings(payload.practicedWithholdings || []);
    const totalWithheld = withholdings.reduce((sum, item) => sum + item.amount, 0);
    const totalPracticed = practicedWithholdings.reduce((sum, item) => sum + item.amount, 0);
    if (withholdings.length && (payload.type || 'payment') !== 'collection') throw new Error('Las retenciones sufridas solo corresponden a ordenes de cobro');
    if (practicedWithholdings.length && (payload.type || 'payment') !== 'payment') throw new Error('Las retenciones practicadas solo corresponden a ordenes de pago');
    if (totalInstrumented + totalWithheld + totalPracticed > totalApplied + 0.01) throw new Error('Total instrumentado y retenido mayor al total de documentos');
    if (orderInstruments.some((link) => link.currency !== firstDoc.currency) && Math.round((totalInstrumented + totalWithheld + totalPracticed) * 100) > Math.round(totalApplied * 100)) throw new Error('Importe comercial excede el saldo documental');
    allocateSettlements(draft, orderDocuments, orderInstruments, firstDoc.currency);
    allocateOrderWithholdings(draft, orderId, orderDocuments, withholdings, firstDoc.currency);
    allocateOrderWithholdings(draft, orderId, orderDocuments, practicedWithholdings, firstDoc.currency, null, 'practiced');
    orderInstruments.forEach((link) => syncBankTaxForInstrument(draft, draft.instruments.find((item) => item.id === link.instrumentId)));
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: orderId, action: 'create-order', changes: [{ field: 'order', from: null, to: orderId }, { field: 'amountApplied', from: null, to: totalApplied }, { field: 'amountInstrumented', from: null, to: totalInstrumented }, { field: 'amountWithheld', from: null, to: totalWithheld }], createdAt: new Date().toISOString(), reason: payload.reason || 'Operacion compuesta', user: user || 'local' });
    if (orderInstruments.some((link) => link.commercialCurrency)) draft.auditLog[0].changes.push({ field: 'currencyApplications', from: null, to: clone(orderInstruments) });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function planExistingOrderLink(state, payload) {
    const initialErrors = validateState(state);
    if (initialErrors.length) throw new Error(`Estado inicial invalido: ${initialErrors.join('; ')}`);
    const draft = clone(state);
    const order = draft.orders.find((item) => item.id === payload.orderId && !item.voidedAt);
    for (const collection of ['orderDocuments', 'orderInstruments', 'orderDocumentSettlements']) {
      if (new Set(draft[collection].map((item) => item.id)).size !== draft[collection].length) throw new Error(`IDs duplicados en ${collection}; requiere revision especifica`);
    }
    const source = draft.orderDocuments.find((item) => item.id === payload.sourceOrderDocumentId && !item.voidedAt);
    const target = draft.documents.find((item) => item.id === payload.documentId && !item.voidedAt);
    const original = source && draft.documents.find((item) => item.id === source.documentId && !item.voidedAt);
    if (!order || !source || source.orderId !== order.id || !target || !original) throw new Error('Orden, documento o vinculo inexistente/anulado');
    if (target.id === original.id) throw new Error('El documento ya tiene esta imputacion');
    if (payload.expectedSourceDocumentId !== source.documentId || Number(payload.expectedSourceAmount) !== source.amountApplied) throw new Error('El vinculo de origen cambio; revisar nuevamente');
    if (target.entityId !== order.entityId || documentDirection(target, draft) !== (order.type === 'payment' ? 'out' : 'in')) throw new Error('Contraparte o lado comercial incompatible con la orden');
    const cents = (value) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0 || Math.abs(number * 100 - Math.round(number * 100)) > 0.0001) throw new Error('Importe invalido: utilizar centavos positivos');
      return Math.round(number * 100);
    };
    const amount = cents(payload.amountApplied) / 100;
    cents(target.amount);
    cents(source.amountApplied);
    if (!['payment', 'collection'].includes(order.type)) throw new Error('Tipo de orden incompatible');
    const links = draft.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt);
    const sourceSettlements = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === source.id && !item.voidedAt);
    const oiLinks = draft.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt);
    if (links.filter((item) => item.documentId === target.id).length > 1) throw new Error('El destino tiene vinculos duplicados en la orden; requiere revision especifica');
    const relatedFiscal = [...(draft.orderTaxWithholdings || []), ...(draft.orderPracticedWithholdings || [])].filter((item) => item.orderId === order.id && !item.voidedAt);
    const compensated = (draft.documentCompensations || []).some((item) => !item.voidedAt && [item.creditDocumentId, item.debtDocumentId].some((id) => [original.id, target.id].includes(id)));
    if (relatedFiscal.length || compensated) throw new Error('Retenciones o compensaciones vinculadas: reasignacion ambigua; requiere revision especifica');
    // Specialized circuits may own these links; changing only a settlement would lose their meaning.
    const dependencies = Object.entries(draft).flatMap(([collection, records]) => {
      if (!Array.isArray(records) || ['auditLog', 'orders', 'orderDocuments', 'orderInstruments', 'orderDocumentSettlements'].includes(collection)) return [];
      return records.filter((item) => !item.voidedAt && (item.orderId === order.id || item.orderDocumentId === source.id || item.creditOrderDocumentId === source.id || item.debtOrderDocumentId === source.id)).map((item) => `${collection}:${item.id}`);
    });
    if (dependencies.length) throw new Error(`Circuito especializado incompatible: ${dependencies.join(', ')}`);
    for (const oi of oiLinks) {
      const instrument = draft.instruments.find((item) => item.id === oi.instrumentId);
      if (!instrument) throw new Error(`Vinculo ${oi.id}: instrumento ${oi.instrumentId} inexistente`);
      if (!['own_check', 'received_check', 'transfer', 'account_debit', 'cash', 'vep', 'card_financing'].includes(instrument.type)) throw new Error(`${instrumentDisplayName(draft, instrument)} (${instrument.id}, ${instrument.scheduledDate || 'sin fecha'}): medio ${instrument.type} pertenece a un circuito especializado; requiere revision especifica`);
      const instrumentName = instrumentDisplayName(draft, instrument);
      const instrumentDate = instrument.executedDate || instrument.scheduledDate || 'sin fecha';
      const deliveredOwnCheck = instrument.type === 'own_check' && instrument.status === 'delivered';
      if (instrument.voidedAt || ['voided', 'cancelled', 'rejected', 'endorsed'].includes(instrument.status) || (instrument.status === 'delivered' && !deliveredOwnCheck)) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): estado ${labelForStatus(instrument.status)} incompatible con la reasignacion; requiere revision especifica`);
      if (deliveredOwnCheck) {
        if (instrument.executedDate || instrument.internalTransferId || instrumentIsBankRealized(instrument)) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): cheque Entregado con realizacion o transferencia posterior; requiere revision especifica`);
        const charges = (draft.bankCharges || []).filter((item) => item.instrumentId === instrument.id && !item.voidedAt);
        if (charges.length) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): cargos bancarios vinculados ${charges.map((item) => `${item.id} (${item.date || 'sin fecha'})`).join(', ')}; requiere revision especifica`);
      }
      if (instrument.endorsedToEntityId || instrument.deliveredToEntityId) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): entrega/endoso posterior a ${instrument.deliveredToEntityId || instrument.endorsedToEntityId}; requiere revision especifica`);
      if (instrument.amount !== oi.amount || instrument.currency !== oi.currency) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): nominal ${instrument.amount} ${instrument.currency} distinto del vinculo ${oi.id} (${oi.amount} ${oi.currency}); requiere revision especifica`);
      if (instrument.direction !== (order.type === 'payment' ? 'out' : 'in')) throw new Error('Direccion del instrumento incompatible con la orden');
      const otherLinks = draft.orderInstruments.filter((item) => item.instrumentId === instrument.id && !item.voidedAt && item.id !== oi.id);
      if (otherLinks.length) throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): tambien vinculado a ${otherLinks.map((item) => `${orderDisplayCode(draft, item.orderId)} (${item.orderId})`).join(', ')}; requiere revision especifica`);
      const dependents = instrumentDependentRecords(draft, instrument.id);
      if (dependents.length) {
        const details = dependents.map((reference) => {
          const separator = reference.indexOf(':');
          const collection = reference.slice(0, separator), id = reference.slice(separator + 1);
          const record = draft[collection]?.find((item) => item.id === id);
          return `${collection}:${id}${record?.date || record?.effectiveDate || record?.createdAt ? ` (${record.date || record.effectiveDate || record.createdAt})` : ''}`;
        });
        throw new Error(`${instrumentName} (${instrument.id}, ${instrumentDate}): relaciones posteriores ${details.join(', ')}; requiere revision especifica`);
      }
      const settlements = draft.orderDocumentSettlements.filter((item) => item.orderInstrumentId === oi.id && !item.voidedAt);
      if (Math.abs(settlements.reduce((sum, item) => sum + settlementInstrumentAmount(item), 0) - oi.amount) > 0.001) throw new Error('Instrumento sin imputacion nominal completa; requiere revision especifica');
    }
    const targetBefore = documentBreakdown(state, target.id);
    const originalBefore = documentBreakdown(state, original.id);
    if (Math.round((target.amount - targetBefore.assigned) * 100) < Math.round(amount * 100)) throw new Error('Documento sobreaplicado: el importe supera el saldo libre para asignar');
    const cross = order.currency !== target.currency;
    const before = { order: clone(order), orderDocuments: clone(links), orderInstruments: clone(oiLinks), instruments: clone(oiLinks.map((item) => draft.instruments.find((instrument) => instrument.id === item.instrumentId))), settlements: clone(draft.orderDocumentSettlements.filter((item) => links.some((link) => link.id === item.orderDocumentId) && !item.voidedAt)) };
    const previousUninstrumented = orderBreakdown(state, order.id).notCoveredByInstrument;
    let targetLink = links.find((item) => item.documentId === target.id);
    if (cross) {
      if (links.length !== 1 || draft.orderDocuments.some((item) => item.orderId === order.id && item.id !== source.id) || draft.orderInstruments.some((item) => item.orderId === order.id && item.voidedAt) || draft.orderDocumentSettlements.some((item) => item.orderDocumentId === source.id && item.voidedAt)) throw new Error('Cambio de moneda: requiere reasignar una orden completa con un unico documento y sin vinculos historicos ambiguos');
      const applications = payload.instrumentApplications || [];
      if (applications.length !== oiLinks.length || new Set(applications.map((item) => item.orderInstrumentId)).size !== applications.length) throw new Error('Indicar la conversion explicita de cada instrumento');
      for (const oi of oiLinks) {
        const input = applications.find((item) => item.orderInstrumentId === oi.id);
        const instrument = draft.instruments.find((item) => item.id === oi.instrumentId);
        const settlements = sourceSettlements.filter((item) => item.orderInstrumentId === oi.id);
        if (!input || settlements.length !== 1) throw new Error('Conversion ambigua: requiere un settlement completo por instrumento');
        if (instrument.currency !== target.currency && (!input.exchangeRate || !input.exchangeRateDate || !String(input.exchangeRateReference || '').trim())) throw new Error('Tipo de cambio, fecha y referencia explicitos obligatorios');
        const application = normalizeInstrumentApplication({ ...input, type: instrument.type, amount: instrument.amount, currency: instrument.currency, commercialCurrency: target.currency }, target.currency);
        for (const field of ['commercialAmount', 'commercialCurrency', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'exchangeRateSource', 'roundingDifference']) delete oi[field];
        Object.assign(oi, applicationLinkFields(application));
        const settlement = settlements[0];
        const replacement = createApplicationSettlement(oi, source.id, application.commercialAmount, target.currency, instrument.amount);
        for (const field of ['instrumentAmount', 'instrumentCurrency', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'roundingDifference']) delete settlement[field];
        Object.assign(settlement, { ...replacement, id: settlement.id });
      }
      if (!oiLinks.length || Math.round(oiLinks.reduce((sum, item) => sum + orderInstrumentCommercialAmount(item), 0) * 100) !== Math.round(amount * 100)) throw new Error('Cambio de moneda: aplicar exactamente la suma comercial de los instrumentos existentes; no crear reservas sin conversion');
      order.currency = target.currency;
      source.documentId = target.id;
      source.amountApplied = amount;
      source.currency = target.currency;
      targetLink = source;
    } else {
      if (Math.round(amount * 100) > Math.round(source.amountApplied * 100)) throw new Error('El importe supera la asignacion disponible del vinculo de origen');
      const full = Math.round(amount * 100) === Math.round(source.amountApplied * 100);
      const allocations = payload.settlementAllocations || (full ? sourceSettlements.map((item) => ({ settlementId: item.id, amount: item.amount })) : []);
      if (new Set(allocations.map((item) => item.settlementId)).size !== allocations.length) throw new Error('Settlement repetido');
      let moved = 0;
      for (const allocation of allocations) {
        const settlement = sourceSettlements.find((item) => item.id === allocation.settlementId);
        const value = cents(allocation.amount) / 100;
        if (!settlement || Math.round(value * 100) > Math.round(settlement.amount * 100)) throw new Error('Settlement de origen invalido o importe excedido');
        moved += value;
      }
      const remainingSettled = sourceSettlements.reduce((sum, item) => sum + item.amount, 0) - moved;
      if (Math.round(moved * 100) > Math.round(amount * 100) || Math.round(remainingSettled * 100) > Math.round((source.amountApplied - amount) * 100)) throw new Error('La distribucion deja settlements sobreaplicados; indicar que imputaciones se trasladan');
      if (full && !targetLink) {
        source.documentId = target.id;
        targetLink = source;
      } else {
        if (targetLink) targetLink.amountApplied = Math.round((targetLink.amountApplied + amount) * 100) / 100;
        else {
          targetLink = { id: uid('OD'), orderId: order.id, documentId: target.id, amountApplied: amount, currency: target.currency, voidedAt: null };
          draft.orderDocuments.push(targetLink);
        }
        if (full) source.voidedAt = new Date().toISOString();
        else source.amountApplied = Math.round((source.amountApplied - amount) * 100) / 100;
        for (const allocation of allocations) {
          const settlement = sourceSettlements.find((item) => item.id === allocation.settlementId);
          const value = Number(allocation.amount);
          if (Math.round(value * 100) === Math.round(settlement.amount * 100)) settlement.orderDocumentId = targetLink.id;
          else {
            const oi = oiLinks.find((item) => item.id === settlement.orderInstrumentId);
            const nominal = settlementInstrumentAmount(settlement);
            const movedNominal = Math.round(nominal * value / settlement.amount * 100) / 100;
            if (movedNominal <= 0 || movedNominal >= nominal) throw new Error('No puede dividirse esta imputacion con precision de centavos');
            const partition = createApplicationSettlement(oi, targetLink.id, value, target.currency, movedNominal);
            partition.reassignedFromSettlementId = settlement.id;
            draft.orderDocumentSettlements.push(partition);
            settlement.amount = Math.round((settlement.amount - value) * 100) / 100;
            if (oi.currency !== target.currency) {
              settlement.instrumentAmount = Math.round((nominal - movedNominal) * 100) / 100;
              settlement.roundingDifference = Math.round((settlement.instrumentAmount - settlement.amount * oi.exchangeRate) * 100) / 100;
            } else if (settlement.instrumentAmount != null) settlement.instrumentAmount = settlement.amount;
          }
        }
      }
    }
    for (const link of draft.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt)) {
      const settled = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + item.amount, 0);
      if (Math.round(settled * 100) > Math.round(link.amountApplied * 100)) throw new Error('La imputacion excede el importe documental asignado');
    }
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    const afterLinks = draft.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt);
    const after = { order: clone(order), orderDocuments: clone(afterLinks), orderInstruments: clone(oiLinks), instruments: clone(oiLinks.map((item) => draft.instruments.find((instrument) => instrument.id === item.instrumentId))), settlements: clone(draft.orderDocumentSettlements.filter((item) => afterLinks.some((link) => link.id === item.orderDocumentId) && !item.voidedAt)) };
    return { draft, preview: clone({ allowed: true, blockers: [], orderId: order.id, orderNumber: orderDisplayCode(state, order.id), sourceDocumentId: original.id, targetDocumentId: target.id, targetLinkId: targetLink.id,
      currency: target.currency, amountApplied: amount, sourceAvailable: before.orderDocuments.find((item) => item.id === source.id).amountApplied,
      assignedElsewhere: before.orderDocuments.filter((item) => item.id !== source.id).reduce((sum, item) => sum + item.amountApplied, 0), previousCurrency: before.order.currency, previousUninstrumented,
      before, after, sourceBefore: originalBefore, sourceAfter: documentBreakdown(draft, original.id), targetBefore, targetAfter: documentBreakdown(draft, target.id),
      warning: 'El documento anterior no se elimina ni se anula. Su saldo vuelve a quedar disponible y debe revisarse por separado. Los pagos nominales, fechas y estados no cambian.' }) };
  }

  function existingOrderLinkPreview(state, payload) {
    try { return planExistingOrderLink(state, payload).preview; }
    catch (error) { return { allowed: false, blockers: [error.message] }; }
  }

  function linkExistingOrderTransaction(state, payload, user) {
    if (!String(payload.reason || '').trim()) throw new Error('Motivo obligatorio para reasignar el vinculo');
    const { draft, preview } = planExistingOrderLink(state, payload);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: payload.orderId, action: 'link-existing-order',
      changes: [{ field: 'documentApplications', from: preview.before, to: preview.after }, { field: 'documentBalances', from: { source: preview.sourceBefore, target: preview.targetBefore }, to: { source: preview.sourceAfter, target: preview.targetAfter } }],
      createdAt: new Date().toISOString(), user: user || 'local', reason: String(payload.reason).trim() });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function planExistingOrderLinks(state, payload) {
    const links = payload?.links;
    if (!Array.isArray(links) || !links.length) throw new Error('Seleccionar al menos una OP/OC');
    if (new Set(links.map((item) => item.orderId)).size !== links.length || new Set(links.map((item) => item.sourceOrderDocumentId)).size !== links.length) throw new Error('OP/OC o asignacion repetida');
    if (new Set(links.map((item) => item.documentId)).size !== 1) throw new Error('Todas las ordenes deben vincularse al mismo documento');
    const targetId = links[0].documentId;
    const target = state.documents.find((item) => item.id === targetId && !item.voidedAt);
    if (!target) throw new Error('Documento destino inexistente/anulado');
    const before = documentBreakdown(state, targetId);
    let draft = state;
    const previews = [];
    for (const link of links) {
      try {
        const planned = planExistingOrderLink(draft, link);
        previews.push(planned.preview);
        draft = planned.draft;
      } catch (error) {
        throw new Error(`${orderDisplayCode(state, link.orderId) || link.orderId}: ${error.message}`);
      }
    }
    const after = documentBreakdown(draft, targetId);
    return { draft, preview: clone({ allowed: true, blockers: [], targetDocumentId: targetId, currency: target.currency,
      previews, totalAmountApplied: Math.round(previews.reduce((sum, item) => sum + item.amountApplied, 0) * 100) / 100,
      targetBefore: before, targetAfter: after }) };
  }

  function existingOrderLinksPreview(state, payload) {
    try { return planExistingOrderLinks(state, payload).preview; }
    catch (error) { return { allowed: false, blockers: [error.message] }; }
  }

  function linkExistingOrdersTransaction(state, payload, user) {
    if (!String(payload?.reason || '').trim()) throw new Error('Motivo obligatorio para reasignar los vinculos');
    planExistingOrderLinks(state, payload);
    let draft = state;
    for (const link of payload.links) draft = linkExistingOrderTransaction(draft, { ...link, reason: payload.reason }, user);
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateOrderTransaction(state, orderId, changes, user) {
    const draft = clone(state);
    const order = draft.orders.find((item) => item.id === orderId);
    if (!order) throw new Error('Orden inexistente');
    if (order.voidedAt) throw new Error('No se edita una orden anulada');
    const now = new Date().toISOString();
    const auditChanges = [];
    const currentOrderDocuments = draft.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const currentOrderInstruments = draft.orderInstruments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const currentInstruments = currentOrderInstruments.map((link) => draft.instruments.find((item) => item.id === link.instrumentId)).filter(Boolean);
    const compositionRequested = Object.prototype.hasOwnProperty.call(changes, 'documents') || Object.prototype.hasOwnProperty.call(changes, 'instruments');

    if (Object.prototype.hasOwnProperty.call(changes, 'description') && order.description !== changes.description) {
      auditChanges.push({ field: 'description', from: order.description, to: changes.description || '' });
      order.description = changes.description || '';
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'date') && changes.date && order.date !== changes.date) {
      const linkedDocs = currentOrderDocuments.map((link) => draft.documents.find((doc) => doc.id === link.documentId)).filter(Boolean);
      const latestDocIssue = linkedDocs.reduce((latest, doc) => latest && latest > doc.issueDate ? latest : doc.issueDate, '');
      const earliestInstrumentDate = currentInstruments.reduce((earliest, instrument) => {
        const date = instrument.executedDate || instrument.scheduledDate || '';
        if (!date) return earliest;
        return !earliest || date < earliest ? date : earliest;
      }, '');
      if (latestDocIssue && changes.date < latestDocIssue) throw new Error('La fecha de orden no puede ser anterior al documento aplicado');
      if (earliestInstrumentDate && changes.date > earliestInstrumentDate) throw new Error('La fecha de orden no puede ser posterior al primer instrumento');
      auditChanges.push({ field: 'date', from: order.date, to: changes.date });
      order.date = changes.date;
    }

    if (compositionRequested) {
      if (currentInstruments.some((instrument) => instrumentCommerciallyCancelsNow(instrument) || instrumentIsBankRealized(instrument))) {
        throw new Error('No se puede recomponer una orden con instrumentos realizados o comercialmente cancelatorios');
      }
      const selectedDocs = (changes.documents || []).map((item) => {
        const doc = draft.documents.find((candidate) => candidate.id === item.documentId);
        if (!doc) throw new Error(`Documento inexistente: ${item.documentId}`);
        return { doc, amountApplied: Number(item.amountApplied || 0) };
      }).filter((item) => item.amountApplied > 0);
      if (!selectedDocs.length) throw new Error('La orden necesita al menos un documento');
      const firstDoc = selectedDocs[0].doc;
      selectedDocs.forEach(({ doc, amountApplied }) => {
        if (doc.entityId !== firstDoc.entityId) throw new Error('Todos los documentos deben ser de la misma entidad');
        if (doc.currency !== firstDoc.currency) throw new Error('Todos los documentos deben tener la misma moneda');
        const previousAmount = currentOrderDocuments.filter((link) => link.documentId === doc.id).reduce((sum, link) => sum + Number(link.amountApplied || 0), 0);
        if (pendingAmountForDocument(draft, doc.id) + previousAmount + 0.01 < amountApplied) throw new Error(`Documento sin saldo suficiente: ${doc.number}`);
      });
      if (order.entityId !== firstDoc.entityId) {
        auditChanges.push({ field: 'entityId', from: order.entityId, to: firstDoc.entityId });
        order.entityId = firstDoc.entityId;
      }
      if (order.currency !== firstDoc.currency) {
        auditChanges.push({ field: 'currency', from: order.currency, to: firstDoc.currency });
        order.currency = firstDoc.currency;
      }
      if (order.activity !== firstDoc.activity) {
        auditChanges.push({ field: 'activity', from: order.activity, to: firstDoc.activity });
        order.activity = firstDoc.activity;
      }

      currentOrderDocuments.forEach((link) => { link.voidedAt = now; });
      currentOrderInstruments.forEach((link) => { link.voidedAt = now; });
      const currentOdIds = new Set(currentOrderDocuments.map((link) => link.id));
      const currentOiIds = new Set(currentOrderInstruments.map((link) => link.id));
      draft.orderDocumentSettlements.filter((settlement) => currentOdIds.has(settlement.orderDocumentId) || currentOiIds.has(settlement.orderInstrumentId)).forEach((settlement) => { settlement.voidedAt = now; });
      currentInstruments.forEach((instrument) => { instrument.status = 'voided'; instrument.voidedAt = now; });

      const orderDocuments = selectedDocs.map(({ doc, amountApplied }) => {
        const orderDocument = { id: uid('OD'), orderId, documentId: doc.id, amountApplied, currency: doc.currency, voidedAt: null };
        draft.orderDocuments.push(orderDocument);
        return orderDocument;
      });
      const account = draft.financialAccounts.find((item) => item.id === changes.financialAccountId) || draft.financialAccounts.find((item) => item.id === currentInstruments[0]?.financialAccountId);
      const orderInstruments = (changes.instruments || []).map((item) => {
        const amount = Number(item.amount || 0);
        const application = normalizeInstrumentApplication(item, firstDoc.currency);
        if (amount <= 0) throw new Error('Instrumento con importe invalido');
        if (item.type === 'bank_loan') throw new Error('Circuito de prestamos pendiente de configuracion');
        const instrumentAccount = draft.financialAccounts.find((accountItem) => accountItem.id === (item.financialAccountId || account?.id));
        if (!instrumentAccount) throw new Error('Cuenta inexistente');
        if (instrumentAccount.currency !== application.currency) throw new Error('Cuenta/producto incompatible con moneda');
        if (item.type === 'own_check' && instrumentAccount.checkEnabled !== true) throw new Error('La cuenta seleccionada no emite cheques');
        if (item.type === 'account_debit' && ((instrumentAccount.productType || 'bank_account') !== 'bank_account' || instrumentAccount.type === 'cash')) throw new Error('Debito en cuenta requiere una cuenta bancaria');
        const instrument = {
          id: uid('INS'),
          type: item.type,
          direction: order.type === 'collection' ? 'in' : 'out',
          entityId: firstDoc.entityId,
          financialAccountId: instrumentAccount.id,
          amount,
          currency: application.currency,
          scheduledDate: item.scheduledDate,
          executedDate: instrumentIsBankRealized({ type: item.type, status: item.status }) ? item.executedDate || item.scheduledDate : null,
          status: item.status,
          reference: item.reference || '',
          checkNumber: item.checkNumber || item.reference || '',
          bankName: instrumentAccount.bankName || instrumentAccount.name,
          notes: item.notes || ''
        };
        draft.instruments.push(instrument);
        const orderInstrument = { id: uid('OI'), orderId, instrumentId: instrument.id, amount, currency: application.currency, ...applicationLinkFields(application), voidedAt: null };
        draft.orderInstruments.push(orderInstrument);
        return orderInstrument;
      });
      const totalApplied = orderDocuments.reduce((sum, item) => sum + item.amountApplied, 0);
      const totalInstrumented = orderInstruments.reduce((sum, item) => sum + orderInstrumentCommercialAmount(item), 0);
      if (totalInstrumented > totalApplied + 0.01) throw new Error('Total instrumentado mayor al total de documentos');
      if (orderInstruments.some((link) => link.currency !== firstDoc.currency) && Math.round(totalInstrumented * 100) > Math.round(totalApplied * 100)) throw new Error('Importe comercial excede el saldo documental');
      allocateSettlements(draft, orderDocuments, orderInstruments, firstDoc.currency);
      auditChanges.push({ field: 'composition', from: { documents: currentOrderDocuments.length, instruments: currentOrderInstruments.length }, to: { documents: orderDocuments.length, instruments: orderInstruments.length } });
      if (orderInstruments.some((link) => link.commercialCurrency)) auditChanges.push({ field: 'currencyApplications', from: clone(currentOrderInstruments), to: clone(orderInstruments) });
    }

    if (!auditChanges.length) return draft;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: orderId, action: 'update-order', changes: auditChanges, createdAt: now, reason: changes.reason || 'Edicion controlada de orden', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function correctHistoricalOrderTransaction(state, orderId, changes, user) {
    const draft = clone(state);
    const order = draft.orders.find((item) => item.id === orderId && !item.voidedAt);
    if (!order) throw new Error('Orden inexistente o anulada');
    const allowed = ['description', 'date', 'amountApplied', 'withholdings', 'reason'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo historico de orden no editable');
    const reason = String(changes.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio');
    const links = draft.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    if (links.length !== 1) throw new Error('Correccion ambigua: la orden debe tener un unico documento aplicado');
    const link = links[0];
    const doc = draft.documents.find((item) => item.id === link.documentId && !item.voidedAt);
    if (!doc) throw new Error('Documento vinculado inexistente');
    const instrumentLinks = draft.orderInstruments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const settlements = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt);
    if (settlements.some((item) => !instrumentLinks.some((instrumentLink) => instrumentLink.id === item.orderInstrumentId))) throw new Error('Correccion ambigua: settlement sin instrumento de la orden');
    const auditChanges = [];
    const update = (record, field, value, prefix = '') => {
      if (record[field] !== value) {
        auditChanges.push({ field: `${prefix}${field}`, from: record[field] ?? null, to: value });
        record[field] = value;
      }
    };
    if (changes.description != null) update(order, 'description', String(changes.description));
    if (changes.date != null) {
      assertCorrectionDate(changes.date);
      const earliestInstrumentDate = instrumentLinks.map((item) => draft.instruments.find((instrument) => instrument.id === item.instrumentId)).filter(Boolean).map((item) => item.executedDate || item.scheduledDate).filter(Boolean).sort()[0];
      if (doc.issueDate && changes.date < doc.issueDate) throw new Error('Fecha de orden anterior al documento');
      if (earliestInstrumentDate && changes.date > earliestInstrumentDate) throw new Error('Fecha de orden posterior al instrumento');
      update(order, 'date', changes.date);
    }
    const existingWithholdings = (draft.orderTaxWithholdings || []).filter((item) => item.orderId === orderId && !item.voidedAt);
    const requestedWithholdings = changes.withholdings == null ? existingWithholdings.map((item) => ({ ...item })) : normalizeOrderWithholdings(changes.withholdings);
    if (changes.withholdings != null && new Set(existingWithholdings.map((item) => item.taxType)).size !== existingWithholdings.length) throw new Error('Correccion ambigua: existen retenciones repetidas del mismo tipo');
    if (new Set(requestedWithholdings.map((item) => item.taxType)).size !== requestedWithholdings.length) throw new Error('Correccion ambigua: no se admite mas de una retencion por tipo');
    if (requestedWithholdings.length && order.type !== 'collection') throw new Error('Las retenciones sufridas solo corresponden a ordenes de cobro');
    const applied = changes.amountApplied == null ? Number(link.amountApplied || 0) : Math.round(Number(changes.amountApplied || 0) * 100) / 100;
    if (!Number.isFinite(applied) || applied <= 0) throw new Error('Importe aplicado invalido');
    const otherApplied = draft.orderDocuments.filter((item) => item.documentId === doc.id && item.id !== link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amountApplied || 0), 0);
    if (otherApplied + applied > Number(doc.amount || 0) + 0.01) throw new Error('Documento sobreaplicado');
    const instrumented = instrumentLinks.reduce((sum, item) => sum + orderInstrumentCommercialAmount(item), 0);
    const withheld = requestedWithholdings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (instrumented + withheld > applied + 0.01) throw new Error('Instrumentos y retenciones superan el importe aplicado');
    update(link, 'amountApplied', applied, `${link.id}.`);
    if (changes.withholdings != null) {
      draft.orderTaxWithholdings ||= [];
      const requestedIds = new Set();
      requestedWithholdings.forEach((item) => {
        const current = item.id ? existingWithholdings.find((candidate) => candidate.id === item.id) : null;
        if (item.id && !current) throw new Error('Retencion historica inexistente o ajena a la orden');
        if (current) {
          requestedIds.add(current.id);
          ['taxType', 'amount', 'date', 'reference', 'notes'].forEach((field) => update(current, field, field === 'amount' ? Number(item[field]) : String(item[field] || ''), `${current.id}.`));
        } else {
          const created = { id: uid('OTW'), orderId, orderDocumentId: link.id, taxType: item.taxType, amount: Number(item.amount), currency: order.currency, date: item.date || order.date, reference: item.reference || '', notes: item.notes || '', status: 'withheld', voidedAt: null };
          draft.orderTaxWithholdings.push(created);
          requestedIds.add(created.id);
          auditChanges.push({ field: `${created.id}.created`, from: null, to: created.amount });
        }
      });
      existingWithholdings.filter((item) => !requestedIds.has(item.id)).forEach((item) => update(item, 'voidedAt', new Date().toISOString(), `${item.id}.`));
    }
    if (auditChanges.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: orderId, action: 'correct-historical-order', changes: auditChanges, createdAt: new Date().toISOString(), reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function prepareArcaPlans(state, payload) {
    const entity = state.entities.find((item) => item.id === payload.entityId && item.active !== false && !item.mergedIntoEntityId);
    const account = state.financialAccounts.find((item) => item.id === payload.financialAccountId && item.active !== false);
    if (!entity) throw new Error('Seleccionar la contraparte ARCA existente');
    if (!account || account.currency !== 'ARS' || account.type === 'cash' || (account.productType || 'bank_account') !== 'bank_account') throw new Error('Seleccionar una cuenta bancaria ARS activa');
    assertCorrectionDate(payload.date);
    if (payload.date > '2026-11-16') throw new Error('La fecha de registro no puede ser posterior al primer vencimiento');
    const cents = (amount) => Math.round(Number(amount) * 100);
    if (payload.planNumbers && (!Array.isArray(payload.planNumbers) || !payload.planNumbers.length || payload.planNumbers.some((number) => !ARCA_PLAN_SCHEDULES.some((plan) => plan.number === number)))) throw new Error('Seleccionar planes ARCA validos');
    const plans = ARCA_PLAN_SCHEDULES.filter((plan) => !payload.planNumbers || payload.planNumbers.includes(plan.number)).map((plan) => {
      const total = cents(plan.amount) * plan.count / 100;
      const notes = `Concepto tributario identificado: ${plan.description}. Tratamiento economico provisional: origen de la deuda pendiente de conciliacion. Capital e intereses pendientes de desglose; no se reconoce gasto con esta obligacion.${plan.advance ? ` Pago a cuenta informado: ARS ${plan.advance.toFixed(2)}; excluido de las cuotas, pendiente de conciliacion; no se genera pago bancario.` : ''}`;
      const installments = Array.from({ length: plan.count }, (_,index) => ({ type: 'account_debit', amount: plan.amount, currency: 'ARS', status: 'scheduled', financialAccountId: account.id,
        scheduledDate: new Date(Date.UTC(2026, 10 + index, 16)).toISOString().slice(0, 10), reference: `${plan.number} cuota ${index + 1}/${plan.count}`, notes }));
      const blockers = [];
      // Identity is the plan, never just an equal amount or a counterparty name.
      const documents = state.documents.filter((doc) => doc.liabilityPlanNumber === plan.number || String(doc.number || '').trim().toUpperCase() === plan.number);
      const doc = documents.length === 1 ? documents[0] : null;
      if (documents.length > 1) blockers.push('Mas de un documento identifica el mismo plan');
      if (doc && (doc.voidedAt || doc.economicTreatment !== 'liability_only' || doc.entityId !== entity.id || doc.currency !== 'ARS' || doc.commercialSide !== 'purchase' || doc.activity !== 'Estructura/Admin' || cents(doc.amount) !== cents(total))) blockers.push('El documento existente requiere revision explicita de tratamiento economico, estado, contraparte o importe; no se reclasifica ni reemplaza automaticamente');
      const documentLinks = doc ? state.orderDocuments.filter((link) => link.documentId === doc.id) : [];
      const link = documentLinks.length === 1 ? documentLinks[0] : null;
      const order = link && state.orders.find((item) => item.id === link.orderId);
      if (documentLinks.length && (!link || link.voidedAt || !order || order.voidedAt || order.type !== 'payment' || order.entityId !== entity.id || order.currency !== 'ARS' || cents(link.amountApplied) !== cents(total) || state.orderDocuments.some((item) => item.orderId === order.id && item.id !== link.id))) blockers.push('Los vinculos existentes de la orden no son inequivocos');
      if (doc && (state.documentCompensations || []).some((item) => [item.creditDocumentId, item.debtDocumentId].includes(doc.id))) blockers.push('El documento tiene compensaciones que requieren revision');
      if (order && [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].some((item) => item.orderId === order.id)) blockers.push('La orden tiene relaciones fiscales');
      const links = order ? state.orderInstruments.filter((item) => item.orderId === order.id) : [];
      const instruments = links.map((oi) => state.instruments.find((item) => item.id === oi.instrumentId));
      if (links.some((oi, index) => oi.voidedAt || !instruments[index] || instruments[index].voidedAt || !['scheduled', 'executed'].includes(instruments[index].status))) blockers.push('Hay instrumentos anulados, inexistentes o incompatibles; no se recrean');
      if (order) blockers.push(...orderInstrumentationCapacity(state, order.id).blockers);
      const missing = installments.filter((expected) => {
        const matches = instruments.filter((item) => item && item.scheduledDate === expected.scheduledDate);
        if (!matches.length) return true;
        const instrument = matches[0];
        const oi = links.find((item) => item.instrumentId === instrument.id);
        const settlements = state.orderDocumentSettlements.filter((item) => item.orderInstrumentId === oi.id);
        if (matches.length !== 1 || instrument.type !== 'account_debit' || instrument.direction !== 'out' || instrument.currency !== 'ARS' || instrument.entityId !== entity.id || instrument.financialAccountId !== account.id || cents(instrument.amount) !== cents(expected.amount) || cents(oi.amount) !== cents(expected.amount) || settlements.length !== 1 || settlements[0].voidedAt || settlements[0].orderDocumentId !== link?.id || cents(settlements[0].amount) !== cents(expected.amount)) blockers.push(`Cuota ${expected.reference}: instrumento o imputacion incompatible`);
        return false;
      });
      if (instruments.some((item) => item && !installments.some((expected) => item.scheduledDate === expected.scheduledDate))) blockers.push('Hay vencimientos diferentes al cronograma; revisar sin duplicar ni sobrescribir');
      if (order && cents(missing.length * plan.amount) !== cents(orderInstrumentationCapacity(state, order.id).available)) blockers.push('El saldo libre no coincide con las cuotas faltantes');
      return { ...plan, total, notes, documentId: doc?.id || '', orderId: order?.id || '', installments, missing, existingCount: instruments.length, blockers: [...new Set(blockers)] };
    });
    return { plans, total: plans.reduce((sum, plan) => sum + cents(plan.total), 0) / 100, count: plans.reduce((sum, plan) => sum + plan.count, 0),
      blockers: plans.flatMap((plan) => plan.blockers.map((reason) => `${plan.number}: ${reason}`)) };
  }

  function importArcaPlansTransaction(state, payload, user) {
    if (payload.confirmed !== true || !String(payload.reason || '').trim()) throw new Error('Confirmacion explicita y motivo obligatorios');
    const errors = validateState(state);
    if (errors.length) throw new Error(errors.join('\n'));
    const preview = prepareArcaPlans(state, payload);
    if (preview.blockers.length) throw new Error(preview.blockers.join('\n'));
    let draft = clone(state);
    const records = [];
    preview.plans.forEach((plan) => {
      let documentId = plan.documentId;
      if (!documentId) {
        draft = createDocumentTransaction(draft, { type: 'liability', liabilityPlanNumber: plan.number, entityId: payload.entityId, number: plan.number,
          amount: plan.total, currency: 'ARS', issueDate: payload.date, dueDate: '2026-11-16', activity: 'Estructura/Admin', chartAccountId: '',
          description: `${plan.number} - ${plan.description}`, notes: plan.notes, reason: payload.reason }, user);
        documentId = draft.documents.at(-1).id;
      }
      let orderId = plan.orderId;
      if (!orderId) {
        draft = createOrderTransaction(draft, { type: 'payment', documentId, amountApplied: plan.total, date: payload.date, financialAccountId: payload.financialAccountId, description: `Plan ARCA ${plan.number}`, instruments: [] }, user);
        orderId = draft.orders.at(-1).id;
      }
      if (plan.missing.length) draft = addOrderInstrumentsTransaction(draft, orderId, { instruments: plan.missing, reason: payload.reason }, user);
      if (!(draft.taxPaymentPlans || []).some((item) => item.documentId === documentId)) {
        draft.taxPaymentPlans ||= [];
        draft.taxPaymentPlans.push({ id: uid('TPL'), agency: 'ARCA', number: plan.number, concept: plan.description, entityId: payload.entityId,
          adhesionDate: '', date: payload.date, status: 'active', currency: 'ARS', documentId, orderId,
          installments: plan.installments.map((item) => ({ date: item.scheduledDate, amount: item.amount })),
          advance: { amount: plan.advance, date: '', mode: 'informational' }, economicReview: 'pending', createdAt: new Date().toISOString() });
        if (plan.documentId && plan.orderId && !plan.missing.length) records.push({ plan: plan.number, documentId, orderId, addedInstallments: 0, metadataOnly: true });
      }
      if (!plan.documentId || !plan.orderId || plan.missing.length) records.push({ plan: plan.number, documentId, orderId, addedInstallments: plan.missing.length, advanceNotPosted: plan.advance });
    });
    if (records.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'document', entityId: records[0].documentId, action: 'import-arca-liabilities', records,
      createdAt: new Date().toISOString(), reason: payload.reason.trim(), user: user || 'local' });
    const finalErrors = validateState(draft);
    if (finalErrors.length) throw new Error(finalErrors.join('\n'));
    return draft;
  }

  // Plans own identification and schedule status, never a second commercial balance.
  function documentPlanProjectionEnabled(state, documentId) {
    const plans = (state.taxPaymentPlans || []).filter((item) => item.documentId === documentId);
    return !plans.length || plans.some((item) => item.status === 'active');
  }

  function taxPlanMoney(value, allowZero = false) {
    const number = Number(value);
    if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0) || Math.abs(number * 100 - Math.round(number * 100)) > 0.00001) throw new Error('Importe del plan invalido; usar hasta dos decimales');
    return Math.round(number * 100) / 100;
  }

  function normalizeTaxPlan(payload) {
    const agency = String(payload.agency || '').trim();
    const concept = String(payload.concept || '').trim();
    const number = String(payload.number || '').trim().toUpperCase();
    if (!agency || !concept) throw new Error('Organismo y concepto obligatorios');
    if (!['active', 'inactive', 'pending_verification'].includes(payload.status)) throw new Error('Estado inicial de plan invalido');
    assertCorrectionDate(payload.date);
    if (payload.adhesionDate) assertCorrectionDate(payload.adhesionDate);
    if (!Array.isArray(payload.installments) || !payload.installments.length || payload.installments.length > 120) throw new Error('Definir entre 1 y 120 cuotas');
    const installments = payload.installments.map((item) => {
      assertCorrectionDate(item.date);
      return { date: item.date, amount: taxPlanMoney(item.amount) };
    });
    if (installments.some((item, index) => index && item.date <= installments[index - 1].date)) throw new Error('Cuotas con fechas repetidas o fuera de orden');
    const advance = { amount: taxPlanMoney(payload.advance?.amount || 0, true), date: payload.advance?.date || '', mode: payload.advance?.mode || 'informational' };
    if (!['informational', 'scheduled'].includes(advance.mode)) throw new Error('Tratamiento del anticipo invalido');
    if (advance.date) assertCorrectionDate(advance.date);
    if (advance.mode === 'scheduled' && (!advance.date || !advance.amount)) throw new Error('Anticipo programado requiere fecha e importe');
    if (advance.mode === 'scheduled' && advance.date > installments[0].date) throw new Error('Anticipo posterior a la primera cuota');
    if (payload.date > (advance.mode === 'scheduled' ? advance.date : installments[0].date)) throw new Error('Fecha de registro posterior al primer vencimiento');
    return { agency, concept, number, entityId: payload.entityId, date: payload.date, adhesionDate: payload.adhesionDate || '', status: payload.status,
      currency: 'ARS', installments, advance, economicReview: 'pending', notes: String(payload.notes || '') };
  }

  function taxPaymentPlanRows(state) {
    const rows = (state.taxPaymentPlans || []).map((plan) => {
      const links = state.orderInstruments.filter((link) => link.orderId === plan.orderId);
      const instruments = links.map((link) => state.instruments.find((item) => item.id === link.instrumentId)).filter(Boolean);
      const installmentInstruments = instruments.filter((item) => item.id !== plan.advanceInstrumentId);
      const paid = installmentInstruments.filter((item) => !item.voidedAt && instrumentIsBankRealized(item));
      const pending = installmentInstruments.filter((item) => !item.voidedAt && instrumentIsPending(item));
      const sum = (items) => items.reduce((total, item) => total + Math.round(Number(item.amount) * 100), 0) / 100;
      const total = sum(plan.orderId ? installmentInstruments : plan.installments);
      const debt = plan.documentId ? documentBreakdown(state, plan.documentId) : null;
      return { ...plan, instruments, firstDate: (plan.orderId ? installmentInstruments.map((item) => item.scheduledDate) : plan.installments.map((item) => item.date)).sort()[0] || '',
        count: plan.orderId ? installmentInstruments.length : plan.installments.length, total, paidCount: paid.length, paidAmount: sum(paid),
        pendingCount: plan.orderId ? pending.length : plan.status === 'cancelled' ? 0 : plan.installments.length, pendingAmount: plan.orderId ? sum(pending) : plan.status === 'cancelled' ? 0 : total,
        commercialBalance: debt ? Math.round((state.documents.find((doc) => doc.id === plan.documentId).amount - debt.cancelled) * 100) / 100 : null,
        displayStatus: plan.status === 'active' && instruments.length && instruments.every((item) => !item.voidedAt && instrumentIsBankRealized(item)) ? 'completed' : plan.status };
    });
    // Recognize historical documents without modifying or reclassifying them.
    state.documents.filter((doc) => !doc.voidedAt && !rows.some((row) => row.documentId === doc.id) && ARCA_PLAN_SCHEDULES.some((plan) => plan.number === (doc.liabilityPlanNumber || String(doc.number).trim().toUpperCase()))).forEach((doc) => {
      const preset = ARCA_PLAN_SCHEDULES.find((plan) => plan.number === (doc.liabilityPlanNumber || String(doc.number).trim().toUpperCase()));
      const links = state.orderDocuments.filter((link) => link.documentId === doc.id && !link.voidedAt && state.orders.some((order) => order.id === link.orderId && !order.voidedAt));
      const instruments = state.orderInstruments.filter((link) => links.some((od) => od.orderId === link.orderId)).map((link) => state.instruments.find((item) => item.id === link.instrumentId)).filter(Boolean);
      const paid = instruments.filter((item) => !item.voidedAt && instrumentIsBankRealized(item));
      const pending = instruments.filter((item) => !item.voidedAt && instrumentIsPending(item));
      rows.push({ id: `legacy:${doc.id}`, legacy: true, documentId: doc.id, orderId: links.length === 1 ? links[0].orderId : '', agency: 'ARCA', number: preset.number,
        concept: preset.description, entityId: doc.entityId, currency: doc.currency, adhesionDate: '', total: doc.amount, count: instruments.length,
        firstDate: instruments.map((item) => item.scheduledDate).sort()[0] || '', paidCount: paid.length, paidAmount: paid.reduce((sum,item) => sum + item.amount,0),
        pendingCount: pending.length, pendingAmount: pending.reduce((sum,item) => sum + item.amount,0), instruments, displayStatus: 'pending_verification',
        economicReview: doc.economicTreatment === 'liability_only' ? 'pending' : 'existing_classification', advance: { amount: preset.advance, mode: 'informational', date: '' } });
    });
    return rows;
  }

  function taxPaymentPlanErrors(state) {
    const errors = [], keys = new Set(), ids = new Set(), activeDocs = new Set();
    (state.taxPaymentPlans || []).forEach((plan) => {
      const fail = (message) => errors.push(`Plan ${plan.number || plan.id}: ${message}`);
      if (!plan.id || ids.has(plan.id)) fail('ID duplicado o ausente');
      ids.add(plan.id);
      const key = `${String(plan.agency).toUpperCase()}|${plan.entityId}|${plan.number || 'SIN-NUMERO'}`;
      if (keys.has(key)) fail('identificacion duplicada');
      keys.add(key);
      try { normalizeTaxPlan({ ...plan, status: plan.status === 'cancelled' ? 'inactive' : plan.status }); } catch (error) { fail(error.message); }
      if (!state.entities.some((item) => item.id === plan.entityId) || plan.currency !== 'ARS') fail('contraparte o moneda incompatible');
      if (!!plan.documentId !== !!plan.orderId || (plan.status === 'active' && !plan.documentId)) fail('obligacion/orden faltante');
      if (plan.documentId) {
        const doc = state.documents.find((item) => item.id === plan.documentId && !item.voidedAt);
        const order = state.orders.find((item) => item.id === plan.orderId);
        if (!doc || doc.entityId !== plan.entityId || doc.currency !== 'ARS' || (doc.commercialSide || inferredCommercialSide(doc.type)) !== 'purchase' || !order || order.entityId !== plan.entityId || order.type !== 'payment' || order.currency !== 'ARS' || !state.orderDocuments.some((link) => link.documentId === plan.documentId && link.orderId === plan.orderId)) fail('relacion documental incompatible');
        if (plan.status === 'active' && activeDocs.has(plan.documentId)) fail('dos cronogramas activos para la misma deuda');
        if (plan.status === 'active') activeDocs.add(plan.documentId);
        if (['cancelled', 'inactive'].includes(plan.status) && state.orderInstruments.some((link) => link.orderId === plan.orderId && !link.voidedAt && state.instruments.some((item) => item.id === link.instrumentId && !item.voidedAt && instrumentIsPending(item)))) fail('cronograma inactivo con instrumentos pendientes');
      }
      if (plan.previousPlanId && !(state.taxPaymentPlans || []).some((item) => item.id === plan.previousPlanId && item.nextPlanId === plan.id && item.documentId === plan.documentId && item.status === 'cancelled')) fail('sustitucion no conciliada');
      if (plan.nextPlanId && !(state.taxPaymentPlans || []).some((item) => item.id === plan.nextPlanId && item.previousPlanId === plan.id)) fail('destino de sustitucion inexistente');
    });
    return errors;
  }

  function taxPaymentPlanCancellationPreview(state, planId) {
    const plan = (state.taxPaymentPlans || []).find((item) => item.id === planId);
    if (!plan) throw new Error('Registrar y verificar primero la identificacion del plan');
    if (plan.status === 'cancelled' || plan.nextPlanId) throw new Error('Plan ya anulado o sustituido');
    const row = taxPaymentPlanRows(state).find((item) => item.id === planId);
    const blockers = [];
    if (plan.documentId) {
      const doc = state.documents.find((item) => item.id === plan.documentId);
      const links = state.orderDocuments.filter((item) => item.orderId === plan.orderId && !item.voidedAt);
      if (!doc || doc.economicTreatment !== 'liability_only') blockers.push('Tratamiento economico historico sin conciliar; no se reclasifica automaticamente');
      if (links.length !== 1 || links[0].documentId !== plan.documentId) blockers.push('Orden compartida o vinculo documental ambiguo');
      const allowedOrders = (state.taxPaymentPlans || []).filter((item) => item.documentId === plan.documentId).map((item) => item.orderId);
      if (state.orderDocuments.some((item) => item.documentId === plan.documentId && !item.voidedAt && !allowedOrders.includes(item.orderId))) blockers.push('La deuda tiene otras ordenes ajenas al plan');
      if ((state.documentCompensations || []).some((item) => [item.debtDocumentId, item.creditDocumentId].includes(plan.documentId))) blockers.push('La deuda tiene compensaciones; requiere conciliacion');
      if ([...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].some((item) => item.orderId === plan.orderId)) blockers.push('La orden tiene relaciones fiscales');
      for (const instrument of row.instruments.filter((item) => !item.voidedAt)) {
        const oi = state.orderInstruments.filter((item) => item.instrumentId === instrument.id && !item.voidedAt);
        const settlements = state.orderDocumentSettlements.filter((item) => oi.some((link) => link.id === item.orderInstrumentId) && !item.voidedAt);
        if (instrument.type !== 'account_debit' || instrument.currency !== 'ARS' || instrument.direction !== 'out' || !['scheduled','executed'].includes(instrument.status) || oi.length !== 1 || oi[0].orderId !== plan.orderId || settlements.length !== 1 || settlements[0].orderDocumentId !== links[0]?.id || Math.round(settlements[0].amount * 100) !== Math.round(instrument.amount * 100)) blockers.push(`Cuota ${instrument.reference || instrument.id}: tipo, moneda o imputacion incompatible`);
        if (instrument.status === 'scheduled') {
          try { voidScheduledInstrumentTransaction(state, instrument.id, 'Validacion de anulacion de plan', 'preview'); }
          catch (error) { blockers.push(`${instrument.reference || instrument.id}: ${error.message}`); }
        }
      }
      blockers.push(...orderInstrumentationCapacity(state, plan.orderId).blockers);
    }
    return { ...row, blockers: [...new Set(blockers)], paid: row.instruments.filter((item) => !item.voidedAt && instrumentIsBankRealized(item)),
      pending: row.instruments.filter((item) => !item.voidedAt && instrumentIsPending(item)), removedProjection: row.instruments.filter((item) => !item.voidedAt && instrumentIsPending(item)).reduce((sum,item) => sum + Math.round(item.amount * 100),0) / 100 };
  }

  function taxPaymentPlanTransaction(state, payload, user) {
    if (payload.confirmed !== true || !String(payload.reason || '').trim()) throw new Error('Confirmacion explicita y motivo obligatorios');
    const initialErrors = validateState(state);
    if (initialErrors.length) throw new Error(initialErrors.join('\n'));
    let draft = clone(state);
    draft.taxPaymentPlans ||= [];
    const now = new Date().toISOString();
    let plan = draft.taxPaymentPlans.find((item) => item.id === payload.planId);
    const before = plan ? clone(plan) : null;
    const key = (item) => `${String(item.agency).toUpperCase()}|${item.entityId}|${item.number || 'SIN-NUMERO'}`;
    const cancel = (current) => {
      const preview = taxPaymentPlanCancellationPreview(draft, current.id);
      if (preview.blockers.length) throw new Error(preview.blockers.join('\n'));
      for (const instrument of preview.pending) draft = voidScheduledInstrumentTransaction(draft, instrument.id, payload.reason, user);
      current = draft.taxPaymentPlans.find((item) => item.id === current.id);
      if (current.orderId) {
        const link = draft.orderDocuments.find((item) => item.orderId === current.orderId && !item.voidedAt);
        const paid = preview.paid.reduce((sum,item) => sum + Math.round(item.amount * 100),0) / 100;
        if (paid) draft = correctHistoricalOrderTransaction(draft, current.orderId, { amountApplied: paid, reason: payload.reason }, user);
        else {
          const order = draft.orders.find((item) => item.id === current.orderId);
          order.voidedAt = now;
          link.voidedAt = now;
          draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: order.id, action: 'cancel-tax-plan-schedule', createdAt: now, user: user || 'local', reason: payload.reason, changes: [{ field: 'voidedAt', from: null, to: now }, { field: 'documentLink', from: clone(state.orderDocuments.find((item) => item.id === link.id)), to: clone(link) }] });
        }
      }
      current = draft.taxPaymentPlans.find((item) => item.id === current.id);
      current.status = 'cancelled'; current.cancelledAt = now;
      current.cancellation = { paidInstrumentIds: preview.paid.map((item) => item.id), cancelledInstrumentIds: preview.pending.map((item) => item.id), removedProjection: preview.removedProjection, debtPreserved: preview.commercialBalance };
      return current;
    };
    const activate = (current, existingDocumentId) => {
      if (!current.number) throw new Error('Identificar el numero real del plan antes de activarlo');
      const bank = draft.financialAccounts.find((item) => item.id === payload.financialAccountId && item.active !== false && item.currency === 'ARS' && item.type !== 'cash' && (item.productType || 'bank_account') === 'bank_account');
      if (!bank) throw new Error('Seleccionar cuenta bancaria ARS activa');
      const schedule = [...(current.advance.mode === 'scheduled' ? [{ date: current.advance.date, amount: current.advance.amount, advance: true }] : []), ...current.installments];
      const total = schedule.reduce((sum,item) => sum + Math.round(item.amount * 100),0) / 100;
      let documentId = existingDocumentId;
      if (!documentId) {
        if (draft.documents.some((doc) => String(doc.number).trim().toUpperCase() === current.number || doc.liabilityPlanNumber === current.number)) throw new Error('Existe un documento para este plan; verificar y vincular sin duplicar');
        draft = createDocumentTransaction(draft, { type: 'liability', liabilityPlanNumber: current.number, entityId: current.entityId, number: current.number,
          currency: 'ARS', amount: total, issueDate: current.date, dueDate: schedule[0].date, activity: 'Estructura/Admin', chartAccountId: '',
          description: `${current.agency} ${current.number} - ${current.concept}`, notes: 'Tratamiento economico provisional: capital, intereses y origen pendientes de conciliacion. Anticipos informativos no contabilizados.', reason: payload.reason }, user);
        documentId = draft.documents.at(-1).id;
      } else {
        const b = documentBreakdown(draft, documentId);
        if (Math.round(b.nonInstrumented * 100) !== Math.round(total * 100)) throw new Error('Nueva moratoria no concilia con la deuda libre. Capital, intereses y diferencias requieren conciliacion explicita; no se altera la deuda');
      }
      draft = createOrderTransaction(draft, { type: 'payment', documentId, amountApplied: total, date: current.date, financialAccountId: bank.id,
        description: `Plan ${current.agency} ${current.number}`, instruments: schedule.map((item,index) => ({ type: 'account_debit', amount: item.amount, currency: 'ARS', status: 'scheduled', financialAccountId: bank.id, scheduledDate: item.date, reference: `${current.number} ${item.advance ? 'anticipo' : `cuota ${index + 1 - (current.advance.mode === 'scheduled' ? 1 : 0)}/${current.installments.length}`}` })) }, user);
      const orderId = draft.orders.at(-1).id;
      const record = draft.taxPaymentPlans.find((item) => item.id === current.id);
      Object.assign(record, { documentId, orderId, status: 'active', activatedAt: now });
      if (current.advance.mode === 'scheduled') record.advanceInstrumentId = draft.orderInstruments.find((item) => item.orderId === orderId).instrumentId;
      return record;
    };
    if (payload.operation === 'create' || payload.operation === 'replace') {
      const normalized = normalizeTaxPlan(payload);
      if (!draft.entities.some((item) => item.id === normalized.entityId && item.active !== false && !item.mergedIntoEntityId)) throw new Error('Seleccionar contraparte activa');
      const existing = draft.taxPaymentPlans.find((item) => key(item) === key(normalized));
      if (existing) {
        if (payload.operation === 'create' && existing.creationRequest && JSON.stringify(existing.creationRequest) === JSON.stringify(normalized)) return draft;
        throw new Error('Plan ya registrado; consultar el existente, no duplicarlo');
      }
      let previous;
      if (payload.operation === 'replace') {
        if (!plan?.documentId || plan.entityId !== normalized.entityId || normalized.status !== 'active' || !String(payload.reconciliationReference || '').trim()) throw new Error('Sustitucion requiere deuda identificada, misma contraparte, plan activo y referencia de conciliacion');
        previous = plan.status === 'cancelled' ? plan : cancel(plan);
        if (previous.nextPlanId) throw new Error('Plan ya sustituido');
      }
      plan = { id: uid('TPL'), ...normalized, status: normalized.status === 'active' ? 'pending_verification' : normalized.status, creationRequest: clone(normalized), createdAt: now };
      draft.taxPaymentPlans.push(plan);
      if (normalized.status === 'active') plan = activate(plan, previous?.documentId);
      if (previous) {
        plan.previousPlanId = previous.id; plan.reconciliationReference = payload.reconciliationReference.trim();
        const prior = draft.taxPaymentPlans.find((item) => item.id === previous.id);
        prior.nextPlanId = plan.id; prior.updatedAt = now;
        draft.auditLog.unshift({ id: uid('AUD'), entityType: 'taxPaymentPlan', entityId: prior.id, action: 'tax-plan-replaced', createdAt: now, user: user || 'local', reason: payload.reason.trim(), before, after: clone(prior) });
      }
    } else if (payload.operation === 'adopt') {
      const legacy = taxPaymentPlanRows(draft).find((item) => item.id === payload.planId && item.legacy);
      if (!legacy?.orderId) throw new Error('No existe una orden inequivoca para identificar el plan');
      const doc = draft.documents.find((item) => item.id === legacy.documentId);
      const links = draft.orderDocuments.filter((item) => item.orderId === legacy.orderId);
      if (links.length !== 1 || !legacy.instruments.length || legacy.instruments.some((item) => item.type !== 'account_debit' || item.currency !== 'ARS')) throw new Error('Cronograma historico ambiguo; no se modifica');
      plan = { id: uid('TPL'), agency: legacy.agency, number: legacy.number, concept: legacy.concept, entityId: doc.entityId, currency: 'ARS',
        date: doc.issueDate, adhesionDate: '', status: 'active', documentId: doc.id, orderId: legacy.orderId, advance: legacy.advance,
        installments: legacy.instruments.map((item) => ({ date: item.scheduledDate, amount: item.amount })).sort((a,b) => a.date.localeCompare(b.date)), economicReview: 'pending', createdAt: now };
      draft.taxPaymentPlans.push(plan);
    } else {
      if (!plan) throw new Error('Plan inexistente');
      if (payload.operation === 'edit') {
        if (!String(payload.concept || '').trim()) throw new Error('Concepto obligatorio');
        plan.concept = payload.concept.trim();
        if (!plan.number && payload.number && !plan.documentId) plan.number = String(payload.number).trim().toUpperCase();
      } else if (payload.operation === 'cancel') plan = cancel(plan);
      else if (payload.operation === 'activate') {
        if (plan.documentId || !['inactive', 'pending_verification'].includes(plan.status)) throw new Error('Reactivacion de deuda existente requiere sustitucion conciliada');
        plan = activate(plan);
      } else throw new Error('Operacion de plan desconocida');
    }
    plan = draft.taxPaymentPlans.find((item) => item.id === plan.id);
    plan.updatedAt = now;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'taxPaymentPlan', entityId: plan.id, action: `tax-plan-${payload.operation}`, createdAt: now, user: user || 'local', reason: payload.reason.trim(), before, after: clone(plan) });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function orderInstrumentationCapacity(state, orderId) {
    const links = state.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const blockers = [];
    const byDocument = links.map((link) => {
      const settlements = state.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt);
      settlements.forEach((settlement) => {
        const oi = state.orderInstruments.find((item) => item.id === settlement.orderInstrumentId);
        const instrument = state.instruments.find((item) => item.id === oi?.instrumentId);
        if (!oi || oi.voidedAt || !instrument || instrument.voidedAt || ['voided', 'cancelled', 'rejected'].includes(instrument.status)) blockers.push(`Settlement ${settlement.id} ligado a instrumento inactivo`);
      });
      const withheld = [...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const available = Math.max(Number(link.amountApplied || 0) - settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0) - withheld, 0);
      return { orderDocumentId: link.id, documentId: link.documentId, available };
    });
    const available = byDocument.reduce((sum, item) => sum + item.available, 0);
    const orderAvailable = orderBreakdown(state, orderId)?.notCoveredByInstrument || 0;
    if (Math.abs(available - orderAvailable) > 0.01) blockers.push(`Saldo de orden ${orderAvailable.toFixed(2)} distinto del saldo de vinculos documentales ${available.toFixed(2)}`);
    return { available, byDocument, blockers };
  }

  function addOrderInstrumentsTransaction(state, orderId, payload, user) {
    const draft = clone(state);
    const order = draft.orders.find((item) => item.id === orderId);
    if (!order) throw new Error('Orden inexistente');
    if (order.voidedAt) throw new Error('No se puede instrumentar una orden anulada');
    const orderDocuments = draft.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    if (!orderDocuments.length) throw new Error('La orden no tiene documentos aplicados');
    const capacity = orderInstrumentationCapacity(draft, orderId);
    if (capacity.blockers.length) throw new Error(`No se puede instrumentar: ${capacity.blockers.join('; ')}`);
    const beforeBreakdown = orderBreakdown(draft, orderId);
    const available = beforeBreakdown?.notCoveredByInstrument || 0;
    const requested = payload.instruments || [];
    const requestedWithholdings = normalizeOrderWithholdings(payload.withholdings || []);
    const requestedPracticed = normalizeOrderWithholdings(payload.practicedWithholdings || []);
    if (!requested.length && !requestedWithholdings.length && !requestedPracticed.length) throw new Error('Debe definir al menos un medio o retencion');
    if (requestedWithholdings.length && order.type !== 'collection') throw new Error('Las retenciones sufridas solo corresponden a ordenes de cobro');
    if (requestedPracticed.length && order.type !== 'payment') throw new Error('Las retenciones practicadas solo corresponden a ordenes de pago');
    const requestedTotal = requested.reduce((sum, item) => sum + normalizeInstrumentApplication(item, order.currency).commercialAmount, 0);
    const withheldTotal = requestedWithholdings.reduce((sum, item) => sum + item.amount, 0);
    const practicedTotal = requestedPracticed.reduce((sum, item) => sum + item.amount, 0);
    if (requestedTotal + withheldTotal + practicedTotal <= 0) throw new Error('Importe de cancelacion invalido');
    if (requestedTotal + withheldTotal + practicedTotal > available + 0.01) throw new Error('Total instrumentado y retenido mayor al saldo sin instrumentar de la orden');
    if (requested.some((item) => item.currency && item.currency !== order.currency) && Math.round((requestedTotal + withheldTotal + practicedTotal) * 100) > Math.round(available * 100)) throw new Error('Importe comercial excede el saldo sin instrumentar');

    const newOrderInstruments = requested.map((item) => {
      if (item.type === 'bank_loan') throw new Error('Circuito de prestamos pendiente de configuracion');
      const application = normalizeInstrumentApplication(item, order.currency);
      const amount = Number(item.amount || 0);
      if (amount <= 0) throw new Error('Instrumento con importe invalido');
      const account = draft.financialAccounts.find((candidate) => candidate.id === item.financialAccountId);
      if (!account) throw new Error('Cuenta/producto financiero inexistente');
      if (account.currency !== application.currency) throw new Error('Cuenta/producto incompatible con moneda');
      if (item.deliveredDate) assertCorrectionDate(item.deliveredDate);
      if (item.type === 'own_check' && account.checkEnabled !== true) throw new Error('La cuenta seleccionada no emite cheques');
      if (item.type === 'account_debit' && ((account.productType || 'bank_account') !== 'bank_account' || account.type === 'cash')) throw new Error('Debito en cuenta requiere una cuenta bancaria');
      const instrument = {
        id: uid('INS'),
        type: item.type,
        direction: order.type === 'collection' ? 'in' : 'out',
        entityId: order.entityId,
        financialAccountId: account.id,
        amount,
        currency: application.currency,
        scheduledDate: item.scheduledDate,
        ...(item.type === 'own_check' && item.status === 'delivered' && item.deliveredDate ? { deliveredDate: item.deliveredDate } : {}),
        executedDate: instrumentIsBankRealized({ type: item.type, status: item.status }) ? item.executedDate || item.scheduledDate : null,
        status: item.status,
        reference: item.reference || '',
        checkNumber: item.checkNumber || item.reference || '',
        bankName: item.type === 'received_check' ? item.bankName || '' : account.bankName || accountName(draft, account.id),
        notes: item.notes || '',
        bankTaxEligible: true
      };
      draft.instruments.push(instrument);
      const link = { id: uid('OI'), orderId, instrumentId: instrument.id, amount, currency: application.currency, ...applicationLinkFields(application), voidedAt: null };
      draft.orderInstruments.push(link);
      return link;
    });

    const activeLinks = new Set(draft.orderInstruments.filter((item) => !item.voidedAt).map((item) => item.id));
    const activeSettlements = draft.orderDocumentSettlements.filter((item) => !item.voidedAt);
    const inconsistent = activeSettlements.find((item) => orderDocuments.some((link) => link.id === item.orderDocumentId) && !activeLinks.has(item.orderInstrumentId));
    if (inconsistent) throw new Error(`La orden conserva un settlement historico sin instrumento activo (${inconsistent.id}); revisa esa relacion antes de instrumentar`);
    const remainingByDocument = new Map(orderDocuments.map((link) => [
      link.id,
      Math.max(Number(link.amountApplied || 0) - activeSettlements.filter((item) => item.orderDocumentId === link.id).reduce((sum, item) => sum + Number(item.amount || 0), 0)
        - [...(draft.orderTaxWithholdings || []), ...(draft.orderPracticedWithholdings || [])].filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0), 0)
    ]));
    const documentaryAvailable = [...remainingByDocument.values()].reduce((sum, amount) => sum + amount, 0);
    if (requestedTotal + withheldTotal + practicedTotal > documentaryAvailable + 0.01) throw new Error(`Saldo documental insuficiente en los vinculos de la orden: disponible ${documentaryAvailable.toFixed(2)}, solicitado ${(requestedTotal + withheldTotal + practicedTotal).toFixed(2)}`);
    let documentIndex = 0;
    newOrderInstruments.forEach((instrumentLink) => {
      const commercialTotal = orderInstrumentCommercialAmount(instrumentLink);
      let remaining = commercialTotal;
      let nominalAllocated = 0;
      while (remaining > 0.005 && documentIndex < orderDocuments.length) {
        const documentLink = orderDocuments[documentIndex];
        const documentRemaining = remainingByDocument.get(documentLink.id) || 0;
        if (documentRemaining <= 0.005) {
          documentIndex += 1;
          continue;
        }
        const amount = Math.min(remaining, documentRemaining);
        const nominalCumulative = Math.round(instrumentLink.amount * (commercialTotal - remaining + amount) / commercialTotal * 100) / 100;
        draft.orderDocumentSettlements.push(createApplicationSettlement(instrumentLink, documentLink.id, amount, order.currency, nominalCumulative - nominalAllocated));
        nominalAllocated = nominalCumulative;
        remaining -= amount;
        remainingByDocument.set(documentLink.id, documentRemaining - amount);
      }
      if (remaining > 0.005) throw new Error(`No existe saldo documental suficiente para instrumentar la orden: disponible inicial ${documentaryAvailable.toFixed(2)} ${order.currency}, solicitado ${requestedTotal.toFixed(2)} (${requested.length} instrumentos nuevos), faltan ${remaining.toFixed(2)} para el instrumento ${instrumentLink.instrumentId}. Revise importes e imputaciones; no se guardo ningun instrumento nuevo`);
    });
    allocateOrderWithholdings(draft, orderId, orderDocuments, requestedWithholdings, order.currency, remainingByDocument);
    allocateOrderWithholdings(draft, orderId, orderDocuments, requestedPracticed, order.currency, remainingByDocument, 'practiced');
    newOrderInstruments.forEach((link) => syncBankTaxForInstrument(draft, draft.instruments.find((item) => item.id === link.instrumentId)));

    draft.auditLog.unshift({
      id: uid('AUD'), entityType: 'order', entityId: orderId, action: 'add-order-instruments',
      changes: [{ field: 'amountInstrumented', from: beforeBreakdown.applied - available, to: beforeBreakdown.applied - available + requestedTotal }, { field: 'amountWithheld', from: beforeBreakdown.taxWithheld || 0, to: (beforeBreakdown.taxWithheld || 0) + withheldTotal }],
      createdAt: new Date().toISOString(), reason: payload.reason || 'Instrumentacion de orden existente', user: user || 'local'
    });
    if (newOrderInstruments.some((link) => link.commercialCurrency)) draft.auditLog[0].changes.push({ field: 'currencyApplications', from: null, to: clone(newOrderInstruments) });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function allocateSettlements(draft, orderDocuments, orderInstruments, currency) {
    let docIndex = 0;
    let docRemaining = orderDocuments[0]?.amountApplied || 0;
    orderInstruments.forEach((oi) => {
      const commercialTotal = orderInstrumentCommercialAmount(oi);
      let remaining = commercialTotal;
      let nominalAllocated = 0;
      while (remaining > 0.005 && docIndex < orderDocuments.length) {
        const amount = Math.min(remaining, docRemaining);
        const nominalCumulative = Math.round(oi.amount * (commercialTotal - remaining + amount) / commercialTotal * 100) / 100;
        draft.orderDocumentSettlements.push(createApplicationSettlement(oi, orderDocuments[docIndex].id, amount, currency, nominalCumulative - nominalAllocated));
        nominalAllocated = nominalCumulative;
        remaining -= amount;
        docRemaining -= amount;
        if (docRemaining <= 0.005) {
          docIndex += 1;
          docRemaining = orderDocuments[docIndex]?.amountApplied || 0;
        }
      }
    });
  }

  function normalizeOrderWithholdings(items) {
    const allowed = new Set(['withholding_income_tax', 'withholding_vat', 'withholding_iibb']);
    return (items || []).filter((item) => Number(item.amount || 0) > 0).map((item) => {
      const amount = Math.round(Number(item.amount || 0) * 100) / 100;
      if (!allowed.has(item.taxType)) throw new Error('Tipo de retencion sufrida invalido');
      if (amount <= 0) throw new Error('Importe de retencion invalido');
      if (item.date) assertCorrectionDate(item.date);
      return { ...item, amount };
    });
  }

  function allocateOrderWithholdings(draft, orderId, orderDocuments, withholdings, currency, availableByDocument, kind = 'suffered') {
    const remainingByDocument = availableByDocument || new Map(orderDocuments.map((link) => {
      const settled = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const withheld = (draft.orderTaxWithholdings || []).filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const practiced = (draft.orderPracticedWithholdings || []).filter((item) => item.orderDocumentId === link.id && !item.voidedAt).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return [link.id, Math.max(Number(link.amountApplied || 0) - settled - withheld - practiced, 0)];
    }));
    let documentIndex = 0;
    withholdings.forEach((item) => {
      let remaining = item.amount;
      while (remaining > 0.01 && documentIndex < orderDocuments.length) {
        const link = orderDocuments[documentIndex];
        const available = remainingByDocument.get(link.id) || 0;
        if (available <= 0.01) { documentIndex += 1; continue; }
        const amount = Math.min(remaining, available);
        const collection = kind === 'practiced' ? 'orderPracticedWithholdings' : 'orderTaxWithholdings';
        draft[collection] ||= [];
        draft[collection].push({ id: uid(kind === 'practiced' ? 'OPW' : 'OTW'), orderId, orderDocumentId: link.id, taxType: item.taxType, amount, currency, date: item.date || todayIso(), reference: item.reference || '', notes: item.notes || '', status: 'withheld', voidedAt: null });
        remaining -= amount;
        remainingByDocument.set(link.id, available - amount);
      }
      if (remaining > 0.01) throw new Error('No existe saldo documental suficiente para la retencion');
    });
  }

  function transitionInstrument(state, instrumentId, status, date, user) {
    const draft = clone(state);
    const instrument = draft.instruments.find((x) => x.id === instrumentId);
    if (!instrument) throw new Error('Instrumento inexistente');
    if (instrument.voidedAt || instrumentLinkedOnlyToInactiveOrders(draft, instrumentId)) throw new Error('Instrumento inactivo por orden anulada; no puede marcarse pagado/cobrado');
    if (instrument.internalTransferId) throw new Error('La transferencia interna no se cambia por un solo instrumento');
    const valid = validStatesForInstrument(instrument.type);
    const currentIndex = valid.indexOf(instrument.status);
    const nextIndex = valid.indexOf(status);
    if (nextIndex < 0) throw new Error('Estado destino invalido');
    if (instrument.type === 'own_check' && status === 'rejected' && !['issued', 'delivered'].includes(instrument.status)) throw new Error('El rechazo requiere un cheque no debitado; revisar la reversa bancaria protegida');
    if (!['cancelled', 'voided', 'rejected'].includes(status) && nextIndex < currentIndex) throw new Error('Transicion regresiva no permitida');
    const before = instrument.status;
    instrument.status = status;
    if (instrument.type === 'own_check' && status === 'delivered' && date) {
      assertCorrectionDate(date);
      instrument.deliveredDate = date;
    }
    if (instrumentIsBankRealized(instrument)) instrument.executedDate = date || todayIso();
    syncBankTaxForInstrument(draft, instrument);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'transition-instrument', changes: [{ field: 'status', from: before, to: status }, ...(status === 'delivered' && instrument.deliveredDate ? [{ field: 'deliveredDate', from: null, to: instrument.deliveredDate }] : [])], createdAt: new Date().toISOString(), reason: 'Cambio trazable de estado', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function instrumentDependentRecords(state, instrumentId) {
    return Object.entries(state).flatMap(([collection, records]) => {
      if (!Array.isArray(records) || ['auditLog', 'instruments', 'orderInstruments', 'orderDocumentSettlements', 'bankCharges'].includes(collection)) return [];
      return records.filter((record) => record.instrumentId === instrumentId || record.outInstrumentId === instrumentId || record.inInstrumentId === instrumentId).map((record) => `${collection}:${record.id}`);
    });
  }

  function repairInactiveOrderInstrumentTransaction(state, instrumentId, reason, user) {
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio para sanear el instrumento');
    const draft = clone(state);
    const instrument = draft.instruments.find((item) => item.id === instrumentId && !item.voidedAt);
    const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId);
    if (!instrument || !instrumentLinkedOnlyToVoidedOrders(draft, instrumentId)) throw new Error('El instrumento no pertenece exclusivamente a órdenes anuladas');
    if (!['scheduled', 'issued'].includes(instrument.status) || instrument.executedDate || instrument.internalTransferId || instrument.deliveredToEntityId || instrument.endorsedToEntityId || instrumentIsBankRealized(instrument)) throw new Error('El instrumento tiene realización o uso posterior; requiere revisión manual');
    if (instrumentDependentRecords(draft, instrumentId).length || (draft.bankCharges || []).some((charge) => charge.instrumentId === instrumentId)) throw new Error('El instrumento tiene relaciones financieras; requiere revisión manual');
    const orderIds = new Set(links.map((link) => link.orderId));
    const documentLinks = draft.orderDocuments.filter((link) => orderIds.has(link.orderId));
    const documentLinkIds = new Set(documentLinks.map((link) => link.id));
    if ([...(draft.orderTaxWithholdings || []), ...(draft.orderPracticedWithholdings || [])].some((item) => orderIds.has(item.orderId) && !item.voidedAt) || (draft.documentCompensations || []).some((item) => !item.voidedAt && [item.creditOrderDocumentId, item.debtOrderDocumentId].some((id) => documentLinkIds.has(id)))) throw new Error('La orden anulada conserva efectos comerciales; requiere revisión manual');
    const orderInstrumentIds = new Set(links.map((link) => link.id));
    const settlements = draft.orderDocumentSettlements.filter((item) => orderInstrumentIds.has(item.orderInstrumentId));
    if (settlements.some((item) => !documentLinkIds.has(item.orderDocumentId))) throw new Error('Settlement vinculado a otra orden; requiere revisión manual');
    const now = new Date().toISOString();
    const previousStatus = instrument.status;
    instrument.status = 'voided';
    instrument.voidedAt = now;
    links.forEach((link) => { link.voidedAt ||= now; });
    documentLinks.forEach((link) => { link.voidedAt ||= now; });
    settlements.forEach((item) => { item.voidedAt ||= now; });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'repair-inactive-order-instrument', changes: [{ field: 'status', from: previousStatus, to: 'voided' }, { field: 'inactiveLinks', from: null, to: { orderInstruments: links.map((link) => link.id), orderDocuments: documentLinks.map((link) => link.id), settlements: settlements.map((item) => item.id) } }], createdAt: now, reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function voidScheduledInstrumentTransaction(state, instrumentId, reason, user) {
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio');
    const draft = clone(state);
    const instrument = draft.instruments.find((item) => item.id === instrumentId && !item.voidedAt);
    if (!instrument) throw new Error('Instrumento inexistente o anulado');
    if (instrument.internalTransferId || !['scheduled', 'issued'].includes(instrument.status) || instrumentIsBankRealized(instrument)) throw new Error('Solo se anulan instrumentos programados/no realizados');
    const dependents = instrumentDependentRecords(draft, instrumentId);
    if (dependents.length || instrument.endorsedToEntityId || instrument.deliveredToEntityId) throw new Error(`Instrumento con relacion posterior: ${dependents.join(', ') || 'endoso/entrega'}`);
    if ((draft.bankCharges || []).some((charge) => charge.instrumentId === instrumentId)) throw new Error('Instrumento con cargo bancario vinculado');
    const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId && !link.voidedAt);
    if (links.length !== 1) throw new Error('Instrumento con vinculos ambiguos');
    const settlements = draft.orderDocumentSettlements.filter((item) => item.orderInstrumentId === links[0].id && !item.voidedAt);
    if (!settlements.length) throw new Error('Instrumento sin settlement trazable');
    const now = new Date().toISOString();
    instrument.voidedAt = now;
    instrument.status = 'voided';
    instrument.executedDate = null;
    links[0].voidedAt = now;
    settlements.forEach((item) => { item.voidedAt = now; });
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'void-scheduled-instrument', changes: [{ field: 'status', from: state.instruments.find((item) => item.id === instrumentId).status, to: 'voided' }, { field: 'voidedLinks', from: null, to: [links[0].id, ...settlements.map((item) => item.id)] }], createdAt: now, reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function bankChargeReversalDetails(state, instrumentId) {
    const instrument = (state.instruments || []).find((item) => item.id === instrumentId && !item.voidedAt);
    if (!instrument || !instrumentIsBankRealized(instrument)) throw new Error('No se puede verificar el cargo: instrumento no realizado');
    const linked = (state.bankCharges || []).filter((charge) => charge.instrumentId === instrumentId);
    if (linked.some((charge) => charge.autoGenerated !== true)) {
      throw new Error(`No se puede revertir: cargo bancario manual o de origen no verificable vinculado al instrumento ${instrument.reference || instrument.id}`);
    }
    if (linked.length > 1) throw new Error(`No se puede revertir: múltiples cargos automáticos vinculados al instrumento ${instrument.reference || instrument.id}`);
    const account = (state.financialAccounts || []).find((item) => item.id === instrument.financialAccountId);
    const charge = linked[0];
    if (charge) {
      const expectedDate = instrument.executedDate || instrument.scheduledDate;
      const expectedSide = instrument.direction === 'in' ? 'credit' : 'debit';
      const rate = Number(instrument.direction === 'in' ? account?.bankTaxCreditRate : account?.bankTaxDebitRate);
      const applicable = instrument.bankTaxEligible === true && account && account.type !== 'cash' &&
        (account.productType || 'bank_account') === 'bank_account' &&
        ['taxable', 'differential'].includes(account.bankTaxTreatment) &&
        account.bankTaxEffectiveFrom && expectedDate >= account.bankTaxEffectiveFrom &&
        Number.isFinite(rate) && rate > 0;
      const expectedAmount = applicable ? Math.round(Number(instrument.amount || 0) * rate) / 100 : 0;
      const label = `Cargo ${charge.id} del instrumento ${instrument.reference || instrument.id}`;
      if (charge.autoGenerated !== true || !charge.id || !applicable || expectedAmount <= 0) {
        throw new Error(`${label}: la configuración actual no permite verificar su generación automática; requiere revisión histórica`);
      }
      if (charge.date !== expectedDate) throw new Error(`${label}: fecha ${charge.date || 'sin fecha'} distinta de la fecha efectiva ${expectedDate || 'sin fecha'}; vínculo histórico no verificable`);
      if (charge.currency !== instrument.currency || charge.financialAccountId !== instrument.financialAccountId || charge.bankSide !== expectedSide || charge.taxType !== 'bank_debit_credit_tax' || charge.status !== 'executed') {
        throw new Error(`${label}: moneda, cuenta, lado, tipo o estado no concuerda con la transferencia`);
      }
      if (Math.round(Number(charge.amount) * 100) !== Math.round(expectedAmount * 100)) {
        throw new Error(`${label}: importe ${charge.amount} distinto del calculado ${expectedAmount} con la alícuota configurada (${rate} %); requiere revisión histórica`);
      }
    }
    return { instrumentId, charges: linked.map((charge) => clone(charge)), accountId: instrument.financialAccountId };
  }

  function reverseRealizedInstrumentTransaction(state, instrumentId, reason, user) {
    if (!String(reason || '').trim()) throw new Error('Motivo obligatorio');
    const draft = clone(state);
    const instrument = draft.instruments.find((item) => item.id === instrumentId && !item.voidedAt);
    if (!instrument || !instrumentIsBankRealized(instrument)) throw new Error('Solo se revierte un instrumento realizado');
    if (instrument.internalTransferId || !['transfer', 'account_debit', 'own_check'].includes(instrument.type)) throw new Error('El medio requiere una reversa especifica');
    const dependents = instrumentDependentRecords(draft, instrumentId);
    if (dependents.length || instrument.endorsedToEntityId || instrument.deliveredToEntityId) throw new Error(`No se puede revertir: relacion posterior ${dependents.join(', ') || 'endoso/entrega'}`);
    const bankChargeDetails = bankChargeReversalDetails(draft, instrumentId);
    const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId && !link.voidedAt);
    if (links.length !== 1 || !draft.orderDocumentSettlements.some((item) => item.orderInstrumentId === links[0].id && !item.voidedAt)) throw new Error('No se puede revertir: imputacion ambigua');
    const previousStatus = instrument.status;
    const previousDate = instrument.executedDate || null;
    instrument.status = instrument.type === 'own_check' ? 'issued' : 'scheduled';
    instrument.executedDate = null;
    const removedIds = new Set(bankChargeDetails.charges.map((charge) => charge.id));
    draft.bankCharges = (draft.bankCharges || []).filter((charge) => charge.instrumentId !== instrumentId || !removedIds.has(charge.id));
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'reverse-realized-instrument', changes: [{ field: 'status', from: previousStatus, to: instrument.status }, { field: 'executedDate', from: previousDate, to: null }, { field: 'autoBankCharges', from: bankChargeDetails.charges, to: [] }], createdAt: new Date().toISOString(), reason: String(reason).trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function updateMulticurrencyApplication(draft, instrument, changes, auditChanges) {
    const links = draft.orderInstruments.filter((item) => item.instrumentId === instrument.id && !item.voidedAt);
    const settlements = draft.orderDocumentSettlements.filter((item) => links.some((link) => link.id === item.orderInstrumentId) && !item.voidedAt);
    if (links.length !== 1 || settlements.length !== 1) throw new Error('Correccion multimoneda ambigua: requiere una imputacion unica');
    const link = links[0], settlement = settlements[0];
    const order = draft.orders.find((item) => item.id === link.orderId && !item.voidedAt);
    if (!order || link.commercialCurrency !== order.currency) throw new Error('Imputacion comercial inexistente');
    const hasCommercial = Object.prototype.hasOwnProperty.call(changes, 'commercialAmount');
    const hasRate = Object.prototype.hasOwnProperty.call(changes, 'exchangeRate');
    if (changes.amount != null && Number(changes.amount) !== instrument.amount && !hasCommercial && !hasRate) throw new Error('Indique importe comercial o tipo de cambio para corregir el nominal');
    const application = normalizeInstrumentApplication({ type: instrument.type, currency: instrument.currency,
      amount: changes.amount ?? instrument.amount,
      commercialAmount: hasCommercial ? changes.commercialAmount : hasRate ? undefined : link.commercialAmount,
      exchangeRate: hasRate ? changes.exchangeRate : hasCommercial ? undefined : link.exchangeRate,
      exchangeRateSource: changes.exchangeRateSource || (hasCommercial ? 'commercialAmount' : hasRate ? 'exchangeRate' : link.exchangeRateSource),
      exchangeRateDate: changes.exchangeRateDate || link.exchangeRateDate,
      exchangeRateReference: changes.exchangeRateReference ?? link.exchangeRateReference }, order.currency);
    const update = (record, key, value) => {
      if (record[key] !== value) { auditChanges.push({ field: `${record.id}.${key}`, from: record[key] ?? null, to: value }); record[key] = value; }
    };
    update(instrument, 'amount', application.amount);
    update(link, 'amount', application.amount);
    Object.entries(applicationLinkFields(application)).forEach(([key, value]) => update(link, key, value));
    update(settlement, 'amount', application.commercialAmount);
    update(settlement, 'instrumentAmount', application.amount);
    for (const key of ['exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'roundingDifference']) update(settlement, key, application[key]);
  }

  function updateInstrumentTransaction(state, instrumentId, changes, user) {
    const draft = clone(state);
    const instrument = draft.instruments.find((x) => x.id === instrumentId);
    if (!instrument) throw new Error('Instrumento inexistente');
    if (instrument.internalTransferId) throw new Error('La transferencia interna requiere corregir ambos lados');
    if (instrument.voidedAt) throw new Error('No se edita un instrumento anulado');
    const allowed = ['amount', 'scheduledDate', 'checkNumber', 'reference', 'notes', 'reason', 'commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'exchangeRateSource'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo de instrumento no editable');
    const auditChanges = [];
    const editable = {};
    const cross = draft.orderInstruments.some((item) => item.instrumentId === instrumentId && !item.voidedAt && item.commercialCurrency && item.commercialCurrency !== instrument.currency);
    const applicationChanged = Object.keys(changes).some((key) => ['commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'exchangeRateSource'].includes(key));
    if (!cross && applicationChanged) throw new Error('No se cambia la moneda de una imputacion existente');
    if (cross && (applicationChanged || changes.amount != null && Number(changes.amount) !== instrument.amount)) {
      if (instrumentIsBankRealized(instrument) || ['endorsed', 'rejected', 'cancelled', 'voided'].includes(instrument.status)) throw new Error('La imputacion requiere una correccion/reversion especifica');
      updateMulticurrencyApplication(draft, instrument, changes, auditChanges);
    }
    if (!cross && Object.prototype.hasOwnProperty.call(changes, 'amount') && Number(changes.amount) !== instrument.amount) {
      if (instrumentIsBankRealized(instrument) || ['executed', 'endorsed', 'rejected', 'cancelled', 'voided'].includes(instrument.status)) throw new Error('El importe requiere una correccion/reversion especifica');
      const amount = Number(changes.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Importe invalido');
      const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId && !link.voidedAt);
      const settlements = draft.orderDocumentSettlements.filter((item) => links.some((link) => link.id === item.orderInstrumentId) && !item.voidedAt);
      if (instrument.type === 'compensation' || links.length !== 1 || settlements.length !== 1 || Math.abs(links[0].amount - instrument.amount) > 0.01 || Math.abs(settlements[0].amount - instrument.amount) > 0.01) throw new Error('El cambio de importe requiere una imputacion explicita: multiples vinculos o imputacion parcial');
      [links[0], settlements[0]].forEach((record) => {
        auditChanges.push({ field: `${record.id}.amount`, from: record.amount, to: amount });
        record.amount = amount;
      });
      editable.amount = amount;
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'checkNumber')) {
      if (!['own_check', 'received_check'].includes(instrument.type)) throw new Error('El instrumento no es un cheque');
      if (instrumentIsBankRealized(instrument)) throw new Error('No se modifica el numero de un cheque realizado');
      editable.checkNumber = String(changes.checkNumber || '').trim();
      if (!editable.checkNumber) throw new Error('Numero de cheque obligatorio');
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'scheduledDate')) {
      if (instrumentIsBankRealized(instrument)) throw new Error('No se modifica el vencimiento de un instrumento ya realizado');
      editable.scheduledDate = changes.scheduledDate || '';
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'reference')) editable.reference = changes.reference || '';
    if (Object.prototype.hasOwnProperty.call(changes, 'notes')) editable.notes = changes.notes || '';
    Object.entries(editable).forEach(([field, value]) => {
      if ((instrument[field] || '') !== value) {
        auditChanges.push({ field, from: instrument[field] || '', to: value });
        instrument[field] = value;
      }
    });
    if (!auditChanges.length) return draft;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'update-instrument', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason || 'Edicion operativa de instrumento', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function assertCorrectionDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Fecha invalida');
  }

  function correctHistoricalInstrumentTransaction(state, instrumentId, changes, user, options = {}) {
    const draft = clone(state);
    const instrument = draft.instruments.find((item) => item.id === instrumentId);
    if (!instrument || instrument.voidedAt) throw new Error('Instrumento inexistente o anulado');
    if (instrument.internalTransferId) throw new Error('La transferencia interna requiere corregir ambos lados');
    const allowed = ['amount', 'scheduledDate', 'executedDate', 'checkNumber', 'bankName', 'reference', 'notes', 'financialAccountId', 'entityId', 'type', 'reason', 'commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'exchangeRateSource'];
    if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error('Campo historico no editable');
    if (!String(changes.reason || '').trim()) throw new Error('Motivo obligatorio para correccion historica');
    const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId);
    const settlements = draft.orderDocumentSettlements.filter((item) => links.some((link) => link.id === item.orderInstrumentId));
    const link = links[0];
    const settlement = settlements[0];
    if (!['own_check', 'received_check', 'transfer', 'account_debit', 'cash', ...(options.allowVep ? ['vep'] : [])].includes(instrument.type) || ['endorsed', 'rejected', 'cancelled', 'voided'].includes(instrument.status) || instrument.endorsedToEntityId || links.length !== 1 || settlements.length !== 1 || link?.voidedAt || settlement?.voidedAt || Math.abs(link.amount - instrument.amount) > 0.001 || Math.abs(settlementInstrumentAmount(settlement) - instrument.amount) > 0.001) throw new Error('Correccion ambigua: multiples vinculos, endoso, compensacion o imputacion parcial');
    const orderDocument = draft.orderDocuments.find((item) => item.id === settlement.orderDocumentId);
    const order = draft.orders.find((item) => item.id === link.orderId);
    if (!orderDocument || orderDocument.voidedAt || !order || order.voidedAt || orderDocument.orderId !== order.id) throw new Error('Relacion historica inconsistente');
    const auditChanges = [];
    const cross = order.currency !== instrument.currency;
    const applicationChanged = Object.keys(changes).some((key) => ['commercialAmount', 'exchangeRate', 'exchangeRateDate', 'exchangeRateReference', 'exchangeRateSource'].includes(key));
    if (!cross && applicationChanged) throw new Error('No se cambia la moneda de una imputacion existente');
    if (cross && (applicationChanged || changes.amount != null && Number(changes.amount) !== instrument.amount)) updateMulticurrencyApplication(draft, instrument, changes, auditChanges);
    const update = (record, field, value, prefix = '') => {
      if (record[field] !== value) {
        auditChanges.push({ field: prefix + field, from: record[field] ?? null, to: value });
        record[field] = value;
      }
    };
    if (changes.type != null && changes.type !== instrument.type) {
      if (!['transfer', 'account_debit'].includes(instrument.type) || !['transfer', 'account_debit'].includes(changes.type) || instrument.direction !== 'out') throw new Error('Conversión de medio incompatible: requiere un circuito específico');
      const account = draft.financialAccounts.find((item) => item.id === (changes.financialAccountId || instrument.financialAccountId));
      if (!account || (account.productType || 'bank_account') !== 'bank_account' || account.type === 'cash') throw new Error('Débito en cuenta requiere una cuenta bancaria');
      update(instrument, 'type', changes.type);
    }
    if (!cross && changes.amount != null) {
      const amount = Number(changes.amount);
      if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) throw new Error('Importe invalido: usar centavos');
      const assigned = draft.orderDocuments.filter((item) => item.orderId === order.id && !item.voidedAt).reduce((sum, item) => sum + Math.round(item.amountApplied * 100), 0);
      const instrumented = draft.orderInstruments.filter((item) => item.orderId === order.id && !item.voidedAt && item.id !== link.id).reduce((sum, item) => sum + Math.round(orderInstrumentCommercialAmount(item) * 100), 0);
      const settled = draft.orderDocumentSettlements.filter((item) => item.orderDocumentId === orderDocument.id && !item.voidedAt && item.id !== settlement.id).reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
      if (instrumented + Math.round(amount * 100) > assigned || settled + Math.round(amount * 100) > Math.round(orderDocument.amountApplied * 100)) throw new Error('Correccion sobreinstrumenta la orden/documento');
      update(instrument, 'amount', amount);
      update(link, 'amount', amount, `${link.id}.`);
      update(settlement, 'amount', amount, `${settlement.id}.`);
    }
    if (changes.checkNumber != null) {
      if (!['own_check', 'received_check'].includes(instrument.type) || !String(changes.checkNumber).trim()) throw new Error('Numero de cheque invalido');
      update(instrument, 'checkNumber', String(changes.checkNumber).trim());
    }
    if (changes.bankName != null) {
      if (instrument.type !== 'received_check') throw new Error('Banco emisor solo disponible para cheque recibido');
      update(instrument, 'bankName', String(changes.bankName).trim());
    }
    const scheduledDate = changes.scheduledDate ?? instrument.scheduledDate;
    const executedDate = changes.executedDate ?? instrument.executedDate;
    if (changes.scheduledDate != null) assertCorrectionDate(changes.scheduledDate);
    if (changes.executedDate != null) {
      if (!instrumentIsBankRealized(instrument)) throw new Error('Fecha efectiva solo disponible para instrumentos realizados');
      assertCorrectionDate(changes.executedDate);
    }
    if (changes.scheduledDate != null && scheduledDate && scheduledDate < order.date) throw new Error('Vencimiento anterior a la orden');
    if (changes.executedDate != null && executedDate && executedDate < order.date) throw new Error('Fecha efectiva anterior a la orden');
    if ((changes.scheduledDate != null || changes.executedDate != null) && scheduledDate && executedDate && scheduledDate > executedDate) throw new Error('Vencimiento posterior a la fecha realizada');
    if (changes.scheduledDate != null) update(instrument, 'scheduledDate', scheduledDate);
    if (changes.executedDate != null) update(instrument, 'executedDate', executedDate);
    if (changes.financialAccountId != null && changes.financialAccountId !== instrument.financialAccountId) {
      const account = draft.financialAccounts.find((item) => item.id === changes.financialAccountId && item.active !== false);
      if (!account || account.currency !== instrument.currency) throw new Error('Cuenta financiera inexistente o incompatible');
      if (instrument.type === 'cash' && account.type !== 'cash') throw new Error('Efectivo requiere una cuenta de caja');
      if (['transfer', 'account_debit', 'vep', 'own_check'].includes(instrument.type) && (account.productType || 'bank_account') !== 'bank_account') throw new Error('El instrumento requiere una cuenta bancaria');
      if (instrument.type === 'own_check' && account.checkEnabled !== true) throw new Error('La cuenta seleccionada no emite cheques');
      update(instrument, 'financialAccountId', account.id);
      if (instrument.type !== 'received_check') update(instrument, 'bankName', account.bankName || account.name);
    }
    if (changes.entityId != null && changes.entityId !== instrument.entityId) {
      if (changes.entityId !== order.entityId) throw new Error('La contraparte del instrumento debe coincidir con la orden');
      update(instrument, 'entityId', changes.entityId);
    }
    ['reference', 'notes'].forEach((field) => { if (changes[field] != null) update(instrument, field, String(changes[field])); });
    if ((draft.bankCharges || []).some((charge) => charge.instrumentId === instrumentId && charge.autoGenerated)) syncBankTaxForInstrument(draft, instrument);
    if (auditChanges.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'instrument', entityId: instrumentId, action: 'correct-historical-instrument', changes: auditChanges, createdAt: new Date().toISOString(), reason: changes.reason.trim(), user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function orderInstrumentEditBlockers(state, orderId, options = {}) {
    const order = state.orders.find((item) => item.id === orderId && !item.voidedAt);
    if (!order) return ['Orden inexistente o anulada'];
    const documents = state.orderDocuments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const links = state.orderInstruments.filter((item) => item.orderId === orderId && !item.voidedAt);
    const blockers = [];
    if (documents.length !== 1) blockers.push(`La orden tiene ${documents.length} documentos aplicados; requiere distribución explícita`);
    if (links.length > 1) blockers.push(`La orden tiene ${links.length} instrumentos; requiere distribución explícita`);
    if ([...(state.orderTaxWithholdings || []), ...(state.orderPracticedWithholdings || [])].some((item) => item.orderId === orderId && !item.voidedAt)) blockers.push('La orden tiene retenciones fiscales');
    if ((state.documentCompensations || []).some((item) => !item.voidedAt && documents.some((doc) => [item.creditOrderDocumentId, item.debtOrderDocumentId].includes(doc.id)))) blockers.push('La orden tiene compensaciones');
    if (links.length === 1 && documents.length === 1) {
      const link = links[0];
      const instrument = state.instruments.find((item) => item.id === link.instrumentId && !item.voidedAt);
      const settlements = state.orderDocumentSettlements.filter((item) => item.orderInstrumentId === link.id && !item.voidedAt);
      if (!instrument) blockers.push(`Instrumento ${link.instrumentId} inexistente o anulado`);
      if (instrument && !['own_check', 'received_check', 'transfer', 'account_debit', 'vep'].includes(instrument.type)) blockers.push(`Medio ${instrument.type} requiere un circuito de corrección específico`);
      if (instrument && ['endorsed', 'rejected', 'cancelled', 'voided'].includes(instrument.status)) blockers.push(`Estado ${instrument.status} del instrumento no corregible conjuntamente`);
      if (instrument && state.orderInstruments.filter((item) => item.instrumentId === instrument.id).length !== 1) blockers.push(`Instrumento ${instrument.id} vinculado a más de una orden`);
      if (instrument && state.orderDocumentSettlements.filter((item) => item.orderInstrumentId === link.id).length !== 1) blockers.push(`Instrumento ${instrument.id} con settlements históricos adicionales`);
      if (settlements.length !== 1 || settlements[0]?.orderDocumentId !== documents[0].id) blockers.push(`Instrumento ${link.instrumentId}: ${settlements.length} settlements activos o documento incompatible`);
      if (instrument && (link.currency !== order.currency || instrument.currency !== order.currency || settlements[0]?.currency !== order.currency)) blockers.push('Imputación multimoneda: requiere corrección explícita de TC y nominal');
      if (instrument && (Math.abs(Number(link.amount) - Number(instrument.amount)) > 0.001 || Math.abs(settlementInstrumentAmount(settlements[0] || {}) - Number(instrument.amount)) > 0.001 || Math.abs(Number(settlements[0]?.amount) - Number(instrument.amount)) > 0.001)) blockers.push('Imputación parcial o nominal inconsistente');
      if (instrument && Math.abs(Number(documents[0].amountApplied) - Number(instrument.amount)) > 0.01 && !options.reconcilePartialInstrument) blockers.push('Pago parcial: el importe aplicado y el instrumento difieren; confirme explícitamente una corrección histórica del único medio');
      if (instrument && (instrument.internalTransferId || instrument.deliveredToEntityId || instrument.endorsedToEntityId || instrumentDependentRecords(state, instrument.id).length)) blockers.push(`Instrumento ${instrument.id} con uso posterior o relación fiscal`);
      if (instrument && (state.bankCharges || []).some((charge) => charge.instrumentId === instrument.id && !charge.autoGenerated)) blockers.push(`Instrumento ${instrument.id} con cargo bancario manual`);
    }
    return blockers;
  }

  function editOrderWithInstrumentTransaction(state, orderId, payload, user) {
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio');
    const blockers = orderInstrumentEditBlockers(state, orderId, { reconcilePartialInstrument: payload.reconcilePartialInstrument === true });
    if (blockers.length) throw new Error(`No se puede editar conjuntamente: ${blockers.join('; ')}`);
    const order = state.orders.find((item) => item.id === orderId);
    const documentLink = state.orderDocuments.find((item) => item.orderId === orderId && !item.voidedAt);
    const oldLink = state.orderInstruments.find((item) => item.orderId === orderId && !item.voidedAt);
    const oldInstrument = oldLink && state.instruments.find((item) => item.id === oldLink.instrumentId);
    const nextOrder = payload.order || {};
    const nextInstrument = payload.instrument || null;
    if (!nextInstrument && oldInstrument) throw new Error('No se puede quitar el medio desde esta edición; use la anulación protegida');
    if (nextOrder.currency != null || nextOrder.entityId != null || nextOrder.documentId != null || nextOrder.type != null) throw new Error('La identidad económica de la orden no es editable');
    const applied = nextOrder.amountApplied == null ? Number(documentLink.amountApplied) : Number(nextOrder.amountApplied);
    if (!Number.isFinite(applied) || applied <= 0) throw new Error('Importe aplicado inválido');
    if (nextInstrument) {
      const allowedTypes = order.type === 'payment' ? ['transfer', 'account_debit', 'own_check', 'vep'] : ['transfer', 'received_check'];
      if (!allowedTypes.includes(nextInstrument.type)) throw new Error('Medio incompatible con el tipo de orden');
      if (nextInstrument.currency && nextInstrument.currency !== order.currency) throw new Error('Imputación multimoneda requiere corrección explícita');
      if (Math.abs(Number(nextInstrument.amount) - applied) > 0.001) throw new Error('El importe nominal y aplicado deben coincidir en esta edición');
      if (!nextInstrument.scheduledDate) throw new Error('Fecha/vencimiento del medio obligatorio');
      const account = state.financialAccounts.find((item) => item.id === nextInstrument.financialAccountId && (item.active !== false || item.id === oldInstrument?.financialAccountId));
      if (!account || account.currency !== order.currency) throw new Error('Cuenta financiera inexistente o incompatible');
      if (nextInstrument.type !== 'received_check' && ((account.productType || 'bank_account') !== 'bank_account' || account.type === 'cash')) throw new Error('El medio requiere una cuenta bancaria');
      if (nextInstrument.type === 'own_check' && account.checkEnabled !== true) throw new Error('La cuenta no emite cheques');
      if (['own_check', 'received_check'].includes(nextInstrument.type) && !String(nextInstrument.checkNumber || '').trim()) throw new Error('Número de cheque obligatorio');
    }
    if (oldInstrument && nextInstrument && nextInstrument.type !== oldInstrument.type && instrumentIsBankRealized(oldInstrument)) throw new Error(`El instrumento realizado ${oldInstrument.id} no puede cambiar de tipo; requiere una corrección/reversión específica`);
    const orderChanged = Math.abs(applied - Number(documentLink.amountApplied)) > 0.001 || nextOrder.date != null && nextOrder.date !== order.date || nextOrder.description != null && nextOrder.description !== order.description;
    const instrumentChanged = !oldInstrument ? !!nextInstrument : nextInstrument && ['type', 'amount', 'scheduledDate', 'executedDate', 'financialAccountId', 'checkNumber', 'bankName', 'reference', 'notes'].some((field) => nextInstrument[field] != null && nextInstrument[field] !== oldInstrument[field]);
    if (!orderChanged && !instrumentChanged) throw new Error('No hay cambios para guardar');
    const inPlaceTypeChange = oldInstrument && nextInstrument && order.type === 'payment' && ['transfer', 'account_debit'].includes(oldInstrument.type) && ['transfer', 'account_debit'].includes(nextInstrument.type);
    const replacement = oldInstrument && nextInstrument && nextInstrument.type !== oldInstrument.type && !inPlaceTypeChange;
    let draft = state;
    const orderChanges = { reason };
    if (nextOrder.description != null && nextOrder.description !== order.description) orderChanges.description = nextOrder.description;
    if (nextOrder.date != null && nextOrder.date !== order.date) orderChanges.date = nextOrder.date;
    if (Math.abs(applied - Number(documentLink.amountApplied)) > 0.001) orderChanges.amountApplied = applied;
    if (replacement) {
      draft = voidScheduledInstrumentTransaction(draft, oldInstrument.id, reason, user);
      draft = correctHistoricalOrderTransaction(draft, orderId, orderChanges, user);
    } else if (oldInstrument && nextInstrument) {
      const changes = { reason };
      if (nextInstrument.type !== oldInstrument.type) changes.type = nextInstrument.type;
      for (const field of ['amount', 'scheduledDate', 'financialAccountId', 'reference', 'notes']) {
        if (nextInstrument[field] != null && nextInstrument[field] !== oldInstrument[field]) changes[field] = nextInstrument[field];
      }
      if (instrumentIsBankRealized(oldInstrument) && nextInstrument.executedDate && nextInstrument.executedDate !== oldInstrument.executedDate) changes.executedDate = nextInstrument.executedDate;
      if (['own_check', 'received_check'].includes(oldInstrument.type) && nextInstrument.checkNumber && nextInstrument.checkNumber !== oldInstrument.checkNumber) changes.checkNumber = nextInstrument.checkNumber;
      if (oldInstrument.type === 'received_check' && nextInstrument.bankName != null && nextInstrument.bankName !== oldInstrument.bankName) changes.bankName = nextInstrument.bankName;
      const instrumentFirst = applied < Number(documentLink.amountApplied) || (orderChanges.date > order.date && nextInstrument.scheduledDate > oldInstrument.scheduledDate);
      if (instrumentFirst) {
        draft = correctHistoricalInstrumentTransaction(draft, oldInstrument.id, changes, user, { allowVep: true });
        draft = correctHistoricalOrderTransaction(draft, orderId, orderChanges, user);
      } else {
        draft = correctHistoricalOrderTransaction(draft, orderId, orderChanges, user);
        draft = correctHistoricalInstrumentTransaction(draft, oldInstrument.id, changes, user, { allowVep: true });
      }
    } else {
      draft = correctHistoricalOrderTransaction(draft, orderId, orderChanges, user);
    }
    if (nextInstrument && (!oldInstrument || replacement)) {
      draft = addOrderInstrumentsTransaction(draft, orderId, { instruments: [{ ...nextInstrument, amount: Number(nextInstrument.amount), currency: order.currency,
        status: nextInstrument.type === 'own_check' ? 'issued' : nextInstrument.type === 'received_check' ? 'received' : 'scheduled' }], reason }, user);
    }
    const beforeBank = oldInstrument && instrumentIsBankRealized(oldInstrument) ? { id: oldInstrument.id, accountId: oldInstrument.financialAccountId, amount: oldInstrument.amount, date: oldInstrument.executedDate } : null;
    const afterInstrument = oldInstrument && !replacement ? draft.instruments.find((item) => item.id === oldInstrument.id) : nextInstrument ? draft.instruments.at(-1) : null;
    const afterBank = afterInstrument && instrumentIsBankRealized(afterInstrument) ? { id: afterInstrument.id, accountId: afterInstrument.financialAccountId, amount: afterInstrument.amount, date: afterInstrument.executedDate } : null;
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'order', entityId: orderId, action: 'edit-order-with-instrument',
      changes: [{ field: 'applied', from: documentLink.amountApplied, to: applied }, { field: 'instrument', from: oldInstrument ? { id: oldInstrument.id, type: oldInstrument.type, amount: oldInstrument.amount, accountId: oldInstrument.financialAccountId } : null, to: afterInstrument ? { id: afterInstrument.id, type: afterInstrument.type, amount: afterInstrument.amount, accountId: afterInstrument.financialAccountId } : null }, { field: 'bankEffect', from: beforeBank, to: afterBank }], createdAt: new Date().toISOString(), reason, user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function syncBankTaxForInstrument(draft, instrument) {
    if (!instrument?.bankTaxEligible) return;
    draft.bankCharges ||= [];
    const charge = draft.bankCharges.find((item) => item.instrumentId === instrument.id && item.autoGenerated === true);
    const account = draft.financialAccounts.find((item) => item.id === instrument.financialAccountId);
    const date = instrument.executedDate || instrument.scheduledDate;
    const bankAccount = account && account.type !== 'cash' && (account.productType || 'bank_account') === 'bank_account';
    const eligible = bankAccount && instrumentIsBankRealized(instrument) && account.bankTaxTreatment && account.bankTaxTreatment !== 'exempt' && account.bankTaxEffectiveFrom && date >= account.bankTaxEffectiveFrom;
    const rate = eligible ? Number(instrument.direction === 'in' ? account.bankTaxCreditRate : account.bankTaxDebitRate) : 0;
    const amount = Math.round(Number(instrument.amount || 0) * rate) / 100;
    if (!eligible || rate <= 0 || amount <= 0) {
      if (charge) draft.bankCharges = draft.bankCharges.filter((item) => item.id !== charge.id);
      return;
    }
    const bankSide = instrument.direction === 'in' ? 'credit' : 'debit';
    const taxAccounts = (draft.chartAccounts || []).filter((item) => /impuestos?.*(d[eé]bitos?.*cr[eé]ditos?|cr[eé]ditos?.*d[eé]bitos?)/i.test(item.name || ''));
    const values = { financialAccountId: account.id, entityId: '', date, amount, currency: instrument.currency, bankSide, taxType: 'bank_debit_credit_tax', activity: 'Estructura/Admin', chartAccountId: taxAccounts.length === 1 ? taxAccounts[0].id : '', status: 'executed', description: bankSide === 'credit' ? 'Impuesto al credito bancario' : 'Impuesto al debito bancario' };
    if (charge) Object.assign(charge, values);
    else draft.bankCharges.push({ id: uid('BCH'), instrumentId: instrument.id, autoGenerated: true, ...values });
  }

  function createBankChargeTransaction(state, payload, user) {
    const draft = clone(state);
    draft.bankCharges ||= [];
    const instrument = draft.instruments.find((item) => item.id === payload.instrumentId);
    if (!instrument) throw new Error('Movimiento principal inexistente');
    const charge = {
      id: payload.id || uid('BCH'),
      instrumentId: instrument.id,
      financialAccountId: instrument.financialAccountId,
      entityId: instrument.entityId,
      date: payload.date || instrument.executedDate || instrument.scheduledDate || todayIso(),
      amount: Number(payload.amount || 0),
      currency: payload.currency || instrument.currency,
      taxType: payload.taxType || 'bank_debit_credit_tax',
      activity: payload.activity || '',
      chartAccountId: payload.chartAccountId || '',
      status: payload.status || 'executed',
      description: payload.description || 'Cargo bancario'
    };
    draft.bankCharges.push(charge);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'bankCharge', entityId: charge.id, action: 'create-bank-charge', changes: [{ field: 'amount', from: null, to: charge.amount }], createdAt: new Date().toISOString(), reason: payload.reason || 'Cargo bancario separado', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createFinancialAdjustmentTransaction(state, payload, user) {
    const draft = clone(state);
    draft.financialAdjustments ||= [];
    const account = draft.financialAccounts.find((item) => item.id === payload.financialAccountId);
    if (!account) throw new Error('Cuenta financiera inexistente');
    const amount = Number(payload.amount || 0);
    if (Math.abs(amount) <= 0.01) throw new Error('Importe de ajuste invalido');
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new Error('Motivo obligatorio para ajuste de conciliacion');
    if (/(comisi[oó]n|impuesto|inter[eé]s|d[eé]bito autom[aá]tico|gasto bancario)/i.test(reason)) {
      throw new Error('Movimiento identificable: registrar con su concepto especifico, no como ajuste generico');
    }
    const adjustment = {
      id: payload.id || uid('FADJ'),
      financialAccountId: account.id,
      date: payload.date || todayIso(),
      amount,
      currency: payload.currency || account.currency,
      reason,
      notes: payload.notes || '',
      createdAt: new Date().toISOString(),
      createdBy: user || 'local'
    };
    if (adjustment.currency !== account.currency) throw new Error('Moneda incompatible con la cuenta financiera');
    draft.financialAdjustments.push(adjustment);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'financialAdjustment', entityId: adjustment.id, action: 'create-financial-adjustment', changes: [{ field: 'amount', from: null, to: adjustment.amount }], createdAt: adjustment.createdAt, reason: adjustment.reason, user: adjustment.createdBy });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createTaxReimbursementTransaction(state, payload, user) {
    const draft = clone(state);
    draft.taxReimbursements ||= [];
    const amount = Math.round(Number(payload.amount || 0) * 100) / 100;
    if (amount <= 0) throw new Error('Importe de reintegro invalido');
    let instrumentId = payload.instrumentId || '';
    if (payload.financialAccountId) {
      const account = draft.financialAccounts.find((item) => item.id === payload.financialAccountId);
      if (!account || account.active === false) throw new Error('Cuenta bancaria receptora inexistente o inactiva');
      if ((account.productType || 'bank_account') !== 'bank_account' || account.type === 'cash') throw new Error('El reintegro requiere una cuenta bancaria');
      if (account.currency !== (payload.currency || 'ARS')) throw new Error('Cuenta bancaria incompatible con moneda');
      if (!draft.entities.some((item) => item.id === payload.entityId)) throw new Error('Entidad del reintegro inexistente');
      instrumentId = uid('INS');
      const instrument = { id: instrumentId, type: 'transfer', direction: 'in', entityId: payload.entityId, financialAccountId: account.id, amount, currency: payload.currency || 'ARS', scheduledDate: payload.date || todayIso(), executedDate: payload.date || todayIso(), status: 'executed', reference: payload.reference || '', checkNumber: '', bankName: account.bankName || account.name, notes: payload.notes || '', bankTaxEligible: true };
      draft.instruments.push(instrument);
      syncBankTaxForInstrument(draft, instrument);
    }
    const reimbursement = {
      id: payload.id || uid('TAXR'),
      taxType: payload.taxType || 'reimbursement_vat',
      documentId: payload.documentId || '',
      taxComponentId: payload.taxComponentId || '',
      instrumentId,
      entityId: payload.entityId || '',
      date: payload.date || todayIso(),
      amount,
      currency: payload.currency || 'ARS',
      activity: payload.activity || '',
      chartAccountId: payload.chartAccountId || '',
      status: payload.status || 'pending',
      description: payload.description || 'Reintegro',
      reference: payload.reference || '',
      notes: payload.notes || ''
    };
    draft.taxReimbursements.push(reimbursement);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'taxReimbursement', entityId: reimbursement.id, action: 'create-tax-reimbursement', changes: [{ field: 'amount', from: null, to: reimbursement.amount }, { field: 'instrumentId', from: null, to: instrumentId }], createdAt: new Date().toISOString(), reason: payload.reason || 'Reintegro vinculado', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function practicedWithholdingBalance(state, withholdingId) {
    const withholding = (state.orderPracticedWithholdings || []).find((item) => item.id === withholdingId && !item.voidedAt);
    if (!withholding) return 0;
    const paid = (state.taxPayments || []).flatMap((item) => item.allocations || []).filter((item) => item.withholdingId === withholdingId).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return Math.max(Math.round((Number(withholding.amount) - paid) * 100) / 100, 0);
  }

  function taxPaymentSuggestedConcept(state, withholdingIds) {
    const descriptions = (withholdingIds || []).map((id) => {
      const withholding = (state.orderPracticedWithholdings || []).find((item) => item.id === id && !item.voidedAt);
      if (!withholding) return '';
      const order = state.orders.find((item) => item.id === withholding.orderId);
      const link = state.orderDocuments.find((item) => item.id === withholding.orderDocumentId);
      const document = state.documents.find((item) => item.id === link?.documentId);
      const account = state.chartAccounts.find((item) => item.id === document?.chartAccountId);
      const tax = labelForTaxType(withholding.taxType).replace(/^Retencion /, 'Ret. ');
      return [tax, account?.name || document?.description, entityName(state, order?.entityId)].filter(Boolean).join(' - ');
    }).filter(Boolean);
    return [...new Set(descriptions)].join('; ');
  }

  function createTaxPaymentTransaction(state, payload, user) {
    const draft = clone(state);
    const account = draft.financialAccounts.find((item) => item.id === payload.financialAccountId && item.active !== false);
    const authority = draft.entities.find((item) => item.id === payload.entityId && item.active !== false);
    if (!account || account.type === 'cash' || (account.productType || 'bank_account') !== 'bank_account') throw new Error('VEP requiere una cuenta bancaria activa');
    if (!authority || !/ARCA|AFIP/i.test(authority.name || '')) throw new Error('Seleccioná la contraparte fiscal ARCA');
    const allocations = (payload.allocations || []).map((item) => ({ withholdingId: item.withholdingId, amount: Math.round(Number(item.amount || 0) * 100) / 100 }));
    if (!allocations.length || new Set(allocations.map((item) => item.withholdingId)).size !== allocations.length) throw new Error('Seleccioná retenciones distintas para el VEP');
    const currency = account.currency;
    allocations.forEach((allocation) => {
      const withholding = (draft.orderPracticedWithholdings || []).find((item) => item.id === allocation.withholdingId && !item.voidedAt);
      if (!withholding || withholding.currency !== currency || allocation.amount <= 0 || allocation.amount > practicedWithholdingBalance(draft, allocation.withholdingId) + 0.01) throw new Error('Retencion inexistente, incompatible o excedida');
    });
    const amount = Math.round(allocations.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    if (!payload.date) throw new Error('Fecha VEP obligatoria');
    assertCorrectionDate(payload.date);
    const concept = String(payload.concept || '').trim() || taxPaymentSuggestedConcept(draft, allocations.map((item) => item.withholdingId));
    if (!concept) throw new Error('Concepto VEP obligatorio');
    const reference = String(payload.reference || '').trim();
    const instrument = { id: uid('INS'), type: 'vep', direction: 'out', entityId: authority.id, financialAccountId: account.id, amount, currency, scheduledDate: payload.date, executedDate: payload.date, status: 'executed', reference, checkNumber: '', bankName: account.bankName || account.name, notes: payload.notes || '', bankTaxEligible: true };
    draft.instruments.push(instrument);
    draft.taxPayments ||= [];
    const payment = { id: uid('TXP'), entityId: authority.id, instrumentId: instrument.id, currency, date: payload.date, concept, reference, allocations };
    draft.taxPayments.push(payment);
    syncBankTaxForInstrument(draft, instrument);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'taxPayment', entityId: payment.id, action: 'pay-practiced-withholdings', changes: [{ field: 'allocations', from: null, to: allocations }, { field: 'instrumentId', from: null, to: instrument.id }], createdAt: new Date().toISOString(), reason: payload.reason || 'VEP de retenciones practicadas', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function createInternalTransferTransaction(state, payload, user) {
    const draft = clone(state);
    const from = draft.financialAccounts.find((item) => item.id === payload.fromAccountId && item.active !== false);
    const to = draft.financialAccounts.find((item) => item.id === payload.toAccountId && item.active !== false);
    if (!from || !to || from.id === to.id || from.type === 'cash' || to.type === 'cash' || (from.productType || 'bank_account') !== 'bank_account' || (to.productType || 'bank_account') !== 'bank_account' || from.currency !== to.currency) throw new Error('Seleccioná dos cuentas bancarias propias, distintas y de la misma moneda');
    const amount = Math.round(Number(payload.amount || 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || !payload.date || !String(payload.reference || '').trim()) throw new Error('Importe, fecha y referencia obligatorios');
    assertCorrectionDate(payload.date);
    const id = uid('ITR');
    const makeInstrument = (account, direction) => ({ id: uid('INS'), internalTransferId: id, type: 'transfer', direction, entityId: '', financialAccountId: account.id, amount, currency: from.currency, scheduledDate: payload.date, executedDate: payload.date, status: 'executed', reference: payload.reference.trim(), notes: payload.notes || '', bankTaxEligible: account.bankTaxInternalTransferExempt === false });
    const outgoing = makeInstrument(from, 'out');
    const incoming = makeInstrument(to, 'in');
    draft.instruments.push(outgoing, incoming);
    draft.internalTransfers ||= [];
    draft.internalTransfers.push({ id, fromAccountId: from.id, toAccountId: to.id, outInstrumentId: outgoing.id, inInstrumentId: incoming.id, amount, currency: from.currency, date: payload.date, reference: payload.reference.trim() });
    syncBankTaxForInstrument(draft, outgoing);
    syncBankTaxForInstrument(draft, incoming);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'internalTransfer', entityId: id, action: 'create-internal-transfer', changes: [{ field: 'accounts', from: from.id, to: to.id }, { field: 'amount', from: null, to: amount }], createdAt: new Date().toISOString(), reason: payload.reason || 'Transferencia entre cuentas propias', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function setFxEstimatesTransaction(state, payload, user) {
    const draft = clone(state);
    draft.fxEstimates ||= [];
    const changes = [];
    (payload?.rates || []).forEach((item) => {
      const month = String(item.month || '');
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`Mes invalido para tipo de cambio: ${month}`);
      const raw = item.rate === '' || item.rate == null ? null : Number(item.rate);
      if (raw != null && (!Number.isFinite(raw) || raw <= 0)) throw new Error(`Tipo de cambio invalido para ${month}`);
      const existing = draft.fxEstimates.find((row) => row.month === month);
      if (raw == null) {
        if (existing) { draft.fxEstimates = draft.fxEstimates.filter((row) => row.month !== month); changes.push({ field: month, from: existing.rate, to: null }); }
        return;
      }
      const rate = Math.round(raw * 100) / 100;
      if (existing && existing.rate === rate) return;
      changes.push({ field: month, from: existing?.rate ?? null, to: rate });
      if (existing) Object.assign(existing, { rate, updatedAt: new Date().toISOString() });
      else draft.fxEstimates.push({ id: `FX-${month}`, month, rate, updatedAt: new Date().toISOString() });
    });
    draft.fxEstimates.sort((a, b) => a.month.localeCompare(b.month));
    if (changes.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'fxEstimate', entityId: 'fx', action: 'set-fx-estimates', changes, createdAt: new Date().toISOString(), reason: 'Tipo de cambio estimado para flujo', user: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  // Notes and to-dos: free text for the administration. No economic or financial effect.
  function saveNoteTransaction(state, payload, user) {
    const draft = clone(state);
    draft.notes ||= [];
    const title = String(payload?.title || '').trim();
    if (!title) throw new Error('Escribí un título para la nota');
    if (title.length > 200) throw new Error('El título es demasiado largo (máximo 200 caracteres)');
    const kind = payload.kind === 'task' ? 'task' : 'note';
    const dueDate = payload.dueDate ? String(payload.dueDate) : '';
    if (dueDate) assertCorrectionDate(dueDate);
    const now = new Date().toISOString();
    const existing = payload.id ? draft.notes.find((item) => item.id === payload.id) : null;
    if (payload.id && !existing) throw new Error('La nota ya no existe');
    const values = { kind, title, body: String(payload.body || '').slice(0, 5000), dueDate, done: kind === 'task' ? Boolean(payload.done) : false, updatedAt: now, updatedBy: user || 'local' };
    if (existing) {
      if (values.done && !existing.done) values.doneAt = now;
      if (!values.done) values.doneAt = '';
      Object.assign(existing, values);
    } else draft.notes.unshift({ id: payload.newId || uid('NOTE'), ...values, doneAt: values.done ? now : '', createdAt: now, createdBy: user || 'local' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function deleteNoteTransaction(state, id, user) {
    const draft = clone(state);
    const note = (draft.notes || []).find((item) => item.id === id);
    if (!note) throw new Error('La nota ya no existe');
    draft.notes = draft.notes.filter((item) => item.id !== id);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'note', entityId: id, action: 'delete-note', changes: [{ field: 'title', from: note.title, to: null }], createdAt: new Date().toISOString(), reason: 'Nota eliminada', user: user || 'local' });
    return draft;
  }

  function currentAccountRows(state, filters) {
    const f = filters || {};
    const rows = [];
    const commercialEffect = (doc, amount, cancelling = false) => {
      const sign = (doc.type === 'credit_note' ? -1 : 1) * (cancelling ? -1 : 1);
      return (inferredCommercialSide(doc.type) || noteCommercialSide(state, doc)) === 'sale'
        ? { debtChange: 0, receivableChange: sign * amount }
        : { debtChange: sign * amount, receivableChange: 0 };
    };
    const add = (row, effect) => {
      const net = effect.debtChange - effect.receivableChange;
      rows.push({ ...row, userStatus: row.userStatus || row.status, ...effect, debit: Math.max(net, 0), credit: Math.max(-net, 0) });
    };
    state.documents.filter((doc) => !doc.voidedAt && (!f.entityId || doc.entityId === f.entityId)).forEach((doc) => {
      add({ date: doc.issueDate || doc.recordDate || '', id: doc.id, source: 'document', entityId: doc.entityId,
        description: doc.number, currency: doc.currency, status: documentBreakdown(state, doc.id)?.status || 'Pendiente' }, commercialEffect(doc, doc.amount));
    });
    state.orderDocumentSettlements.filter((x) => !x.voidedAt).forEach((settlement) => {
      const od = state.orderDocuments.find((x) => x.id === settlement.orderDocumentId);
      const oi = state.orderInstruments.find((x) => x.id === settlement.orderInstrumentId);
      const instrument = state.instruments.find((x) => x.id === oi?.instrumentId);
      const order = state.orders.find((x) => x.id === od?.orderId);
      const doc = state.documents.find((x) => x.id === od?.documentId);
      if (!od || od.voidedAt || !oi || oi.voidedAt || !instrument || instrument.voidedAt || !order || order.voidedAt || !doc || doc.voidedAt) return;
      if (f.entityId && order.entityId !== f.entityId) return;
      const direction = documentDirection(doc, state);
      const commerciallyCancels = instrumentCommerciallyCancelsNow(instrument);
      const dateUnknown = commerciallyCancels && instrument.type === 'own_check' && !instrument.deliveredDate;
      add({
        date: instrument.type === 'own_check' && commerciallyCancels ? instrument.deliveredDate || '' : instrument.executedDate || instrument.scheduledDate || order.date,
        dateUnknown,
        id: instrument.id,
        source: 'instrument',
        entityId: order.entityId,
        orderId: order.id,
        documentId: doc.id,
        description: `${order.number || order.id} ${instrument.reference || instrument.type}`,
        informationalAmount: commerciallyCancels ? 0 : settlement.amount,
        currency: settlement.currency,
        status: userFlowState({ direction, realized: commerciallyCancels })
      }, commerciallyCancels ? commercialEffect(doc, settlement.amount, true) : { debtChange: 0, receivableChange: 0 });
    });
    (state.documentCompensations || []).filter(compensationIsConfirmed).forEach((item) => {
      if (f.entityId && item.entityId !== f.entityId) return;
      const credit = state.documents.find((doc) => doc.id === item.creditDocumentId && !doc.voidedAt);
      const debt = state.documents.find((doc) => doc.id === item.debtDocumentId && !doc.voidedAt);
      if (!credit || !debt) return;
      add({ date: item.date, id: item.id, source: 'documentCompensation', documentId: credit.id, counterpartDocumentId: debt.id, entityId: item.entityId, description: `Compensación ${credit.number || credit.id} con ${debt.number || debt.id}`, currency: item.currency, status: 'Compensado', userStatus: 'Cobrado' }, commercialEffect(credit, item.amount, true));
      add({ date: item.date, id: item.id, source: 'documentCompensation', documentId: debt.id, counterpartDocumentId: credit.id, entityId: item.entityId, description: `Compensación ${debt.number || debt.id} con ${credit.number || credit.id}`, currency: debt.currency, status: 'Compensado', userStatus: 'Pagado' }, commercialEffect(debt, compensationDocumentAmount(item, debt.id), true));
    });
    (state.orderTaxWithholdings || []).filter((item) => !item.voidedAt).forEach((item) => {
      const od = state.orderDocuments.find((link) => link.id === item.orderDocumentId && !link.voidedAt);
      const order = state.orders.find((candidate) => candidate.id === item.orderId && !candidate.voidedAt);
      const doc = state.documents.find((candidate) => candidate.id === od?.documentId && !candidate.voidedAt);
      if (!od || !order || !doc || (f.entityId && order.entityId !== f.entityId)) return;
      const direction = documentDirection(doc, state);
      add({ date: item.date || order.date, id: item.id, source: 'orderTaxWithholding', entityId: order.entityId, description: `${order.number || order.id} ${labelForTaxType(item.taxType)}`, currency: item.currency, status: direction === 'in' ? 'Cobrado' : 'Pagado' }, commercialEffect(doc, item.amount, true));
    });
    (state.orderPracticedWithholdings || []).filter((item) => !item.voidedAt).forEach((item) => {
      const link = state.orderDocuments.find((candidate) => candidate.id === item.orderDocumentId && !candidate.voidedAt);
      const order = state.orders.find((candidate) => candidate.id === item.orderId && !candidate.voidedAt);
      const doc = state.documents.find((candidate) => candidate.id === link?.documentId && !candidate.voidedAt);
      if (!link || !order || !doc || (f.entityId && order.entityId !== f.entityId)) return;
      add({ date: item.date || order.date, id: item.id, source: 'orderPracticedWithholding', entityId: order.entityId, description: `${order.number || order.id} retencion practicada ${labelForTaxType(item.taxType)}`, currency: item.currency, status: 'Pagado' }, commercialEffect(doc, item.amount, true));
    });
    const balances = new Map();
    return rows
      .sort((a, b) => `${a.date || '9999-12-31'}-${a.id}`.localeCompare(`${b.date || '9999-12-31'}-${b.id}`))
      .map((row) => {
        const key = `${row.entityId}:${row.currency}`;
        const balance = balances.get(key) || { debt: 0, receivable: 0 };
        balance.debt += row.debtChange;
        balance.receivable += row.receivableChange;
        balances.set(key, balance);
        return { ...row, debtBalance: balance.debt, receivableBalance: balance.receivable, balance: balance.debt - balance.receivable };
      })
      .filter((row) => !f.currency || row.currency === f.currency)
      .filter((row) => statusMatches(row, f.status))
      .filter((row) => !f.dateFrom || (row.date && row.date >= f.dateFrom))
      .filter((row) => !f.dateTo || (row.date && row.date <= f.dateTo));
  }

  function generalMovementRows(state) {
    const documents = new Map(state.documents.map((item) => [item.id, item]));
    const instruments = new Map(state.instruments.map((item) => [item.id, item]));
    const charges = new Map((state.bankCharges || []).map((item) => [item.id, item]));
    const adjustments = new Map((state.financialAdjustments || []).map((item) => [item.id, item]));
    const orders = new Map(state.orders.map((item) => [item.id, item]));
    const context = (instrumentId) => {
      const links = state.orderInstruments.filter((link) => !link.voidedAt && link.instrumentId === instrumentId);
      const orderIds = [...new Set(links.map((link) => link.orderId))];
      const appliedIds = new Set(state.orderDocumentSettlements.filter((item) => !item.voidedAt && links.some((link) => link.id === item.orderInstrumentId)).map((item) => item.orderDocumentId));
      const documentIds = [...new Set(state.orderDocuments.filter((link) => !link.voidedAt && appliedIds.has(link.id)).map((link) => link.documentId))];
      const docs = documentIds.map((id) => documents.get(id)).filter(Boolean);
      const unique = (key) => [...new Set(docs.map((doc) => doc[key]).filter(Boolean))];
      return { orderIds, documentIds, activity: unique('activity').length === 1 ? unique('activity')[0] : '',
        chartAccountId: unique('chartAccountId').length === 1 ? unique('chartAccountId')[0] : '',
        concept: [...new Set(docs.map((doc) => doc.description).filter(Boolean))].join(' / ')
          || orderIds.map((id) => orders.get(id)?.description).filter(Boolean).join(' / ') };
    };
    // One row per actual financial source, independent of how many documents it settles.
    const rows = financialMovementRows(state).map((movement) => {
      const instrument = movement.source === 'instrument' ? instruments.get(movement.id) : null;
      const item = instrument || charges.get(movement.id) || adjustments.get(movement.id);
      const links = context(instrument?.id || item?.instrumentId);
      const date = instrument ? instrument.executedDate || '' : movement.date || '';
      return { ...movement, ...links, id: `${movement.source}:${movement.id}`, sourceId: movement.id,
        date, dateUnknown: !date, issueDate: instrument?.issueDate || '', dueDate: instrument?.scheduledDate || '',
        executedDate: date, type: instrument ? labelForType(instrument.type) : movement.source === 'bankCharge' ? 'Cargo bancario' : 'Ajuste bancario',
        reference: instrument ? instrumentDisplayName(state, instrument) : item?.reference || movement.description,
        concept: instrument ? instrument.concept || links.concept || instrument.notes || instrument.reference || '' : movement.description,
        activity: movement.source === 'bankCharge' ? item.activity || 'Estructura/Admin' : links.activity,
        chartAccountId: movement.source === 'bankCharge' ? item.chartAccountId || '' : links.chartAccountId,
        amount: Math.abs(movement.amount), financialAmount: movement.amount, affectsFunds: true,
        status: movement.amount >= 0 ? 'Cobrado' : 'Pagado',
        target: instrument ? { type: 'instrument', id: instrument.id } : { type: 'financialAccount', id: movement.financialAccountId }
      };
    });
    // Confirmed commercial offsets are visible, but never become cash income/expense.
    (state.documentCompensations || []).filter(compensationIsConfirmed).forEach((item) => {
      const docs = [documents.get(item.creditDocumentId), documents.get(item.debtDocumentId)].filter(Boolean);
      rows.push({ id: `documentCompensation:${item.id}`, sourceId: item.id, date: item.date || '', type: 'Compensacion',
        reference: item.reference || docs.map((doc) => doc.number).join(' / '),
        ...(item.reconciliationId ? { reconciliationId: item.reconciliationId, grainLiquidationId: item.grainLiquidationId } : {}),
        entityId: item.entityId, concept: docs.map((doc) => doc.description || doc.number).join(' / '),
        currency: item.currency, amount: item.amount, financialAmount: 0, income: 0, expense: 0, affectsFunds: false,
        ...(item.debtCurrency ? { debtAmount: item.debtAmount, debtCurrency: item.debtCurrency, exchangeRate: item.exchangeRate } : {}),
        activity: [...new Set(docs.map((doc) => doc.activity))].join(' / '), chartAccountId: '',
        documentIds: docs.map((doc) => doc.id), status: 'Confirmada sin fondos',
        target: { type: 'documentCompensation', id: item.id } });
    });
    state.instruments.filter((item) => !item.voidedAt && ['compensation', 'grain_barter'].includes(item.type) && item.status === 'executed').forEach((item) => {
      rows.push({ ...context(item.id), id: `instrument:${item.id}`, sourceId: item.id,
        date: item.executedDate || '', dateUnknown: !item.executedDate, type: labelForType(item.type),
        reference: item.reference || labelForType(item.type), entityId: item.entityId,
        currency: item.currency, amount: item.amount, financialAmount: 0, income: 0, expense: 0, affectsFunds: false,
        status: 'Confirmada sin fondos', target: { type: 'instrument', id: item.id } });
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }

  function chartAccountSupportsActivity(account, activity) {
    if (!account) return false;
    if (!account.activity || account.activity === activity) return true;
    return activity === 'Financiero' && /interes|financier|diferenci.*cambio/i.test(account.name || '');
  }

  function ensureFinancialChartTransaction(state, user) {
    const draft = clone(state);
    const names = ['Intereses comerciales', 'Intereses bancarios', 'Gastos financieros', 'Diferencias de cambio', 'Intereses ganados'];
    const aliases = { 'Intereses comerciales': ['intereses pagados'], 'Intereses ganados': ['intereses cobrados'] };
    const normalizedName = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const added = [];
    names.forEach((name) => {
      if (draft.chartAccounts.some((account) => account.active !== false && [normalizedName(name), ...(aliases[name] || [])].includes(normalizedName(account.name)))) return;
      const account = { id: uid('CA'), name, parentId: null, activity: 'Financiero', active: true };
      draft.chartAccounts.push(account);
      added.push(account);
    });
    if (added.length) draft.auditLog.unshift({ id: uid('AUD'), entityType: 'chartAccount', entityId: added[0].id,
      action: 'complete-financial-chart', changes: [{ field: 'accounts', from: [], to: added }],
      createdAt: new Date().toISOString(), user: user || 'local', reason: 'Alta explicita de cuentas de actividad Financiero' });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function currentAccountClosingSummary(state, entityId, currency, date) {
    assertCorrectionDate(date);
    const rows = currentAccountRows(state, { entityId, currency });
    const dated = rows.filter((row) => row.date && row.date <= date);
    const last = dated.at(-1);
    const unknown = rows.filter((row) => row.dateUnknown);
    return { entityId, currency, date, debt: last?.debtBalance || 0, receivable: last?.receivableBalance || 0,
      unknownDeliveryIds: [...new Set(unknown.map((row) => row.id))],
      pendingDocuments: state.documents.filter((doc) => !doc.voidedAt && doc.entityId === entityId && doc.currency === currency
        && (doc.issueDate || doc.recordDate || '') <= date).map((doc) => ({ documentId: doc.id,
          balance: Math.max(doc.amount - documentBreakdown(state, doc.id, date, true).commercialCancelled, 0) })).filter((item) => item.balance > 0) };
  }

  function createCurrentAccountClosingTransaction(state, payload, user) {
    const draft = clone(state);
    if (!draft.entities.some((item) => item.id === payload.entityId && item.active !== false)) throw new Error('Contraparte invalida');
    if (!CURRENCIES.includes(payload.currency)) throw new Error('Moneda invalida');
    const summary = currentAccountClosingSummary(draft, payload.entityId, payload.currency, payload.date);
    if (summary.unknownDeliveryIds.length) throw new Error('No se puede fechar el cierre: existen cheques entregados sin fecha de entrega registrada');
    if (![payload.confirmedDebt, payload.confirmedReceivable].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) throw new Error('Saldos confirmados invalidos');
    if (!String(payload.notes || '').trim()) throw new Error('Observaciones obligatorias');
    draft.currentAccountClosings ||= [];
    if (draft.currentAccountClosings.some((item) => item.entityId === payload.entityId && item.currency === payload.currency && item.date === payload.date)) throw new Error('Ya existe un cierre para esta fecha y moneda');
    const item = { id: uid('CCLOSE'), ...summary, confirmedDebt: payload.confirmedDebt,
      confirmedReceivable: payload.confirmedReceivable, notes: payload.notes.trim(), createdAt: new Date().toISOString(), user: user || 'local' };
    draft.currentAccountClosings.push(item);
    draft.auditLog.unshift({ id: uid('AUD'), entityType: 'currentAccountClosing', entityId: item.id,
      action: 'create-current-account-closing', createdAt: item.createdAt, user: item.user, reason: item.notes,
      changes: [{ field: 'closing', from: null, to: clone(item) }] });
    const errors = validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  return {
    ACTIVITIES,
    generalMovementRows,
    chartAccountSupportsActivity,
    ensureFinancialChartTransaction,
    currentAccountClosingSummary,
    createCurrentAccountClosingTransaction,
    pendingAmountForDocument,
    CURRENCIES,
    ENTITY_ROLES,
    FINANCIAL_PRODUCT_TYPES,
    GRAIN_TYPES,
    GRAIN_LOCATION_TYPES,
    GRAIN_LOCATION_LABELS,
    LIVESTOCK_CATEGORIES,
    LIVESTOCK_MOVEMENT_TYPES,
    MANAGEMENT_YEAR_START_MONTH,
    DOCUMENT_READINGS,
    TAX_COMPONENT_TYPES,
    TYPE_LABELS,
    STATUS_LABELS,
    todayIso,
    addDays,
    uid,
    clone,
    minimalDemoState,
    demoState,
    entityName,
    accountName,
    chartPath,
    labelForType,
    labelForStatus,
    labelForTaxType,
    orderDisplayCode,
    instrumentDisplayName,
    grainLocationName,
    grainLocationTypeLabel,
    grainStockRows,
    grainStockAt,
    grainStockSummary,
    grainLocationHistory,
    latestGrainReferencePrice,
    grainForwardLiquidatedKg,
    grainForwardPendingKg,
    grainForwardEstimatedFlowRows,
    livestockLocationName,
    livestockHerdName,
    livestockStockRows,
    livestockStockAt,
    livestockMovementHistory,
    livestockWeighingRows,
    latestLivestockWeighing,
    livestockGmd,
    latestLivestockReferencePrice,
    livestockSummary,
    managementExerciseForDate,
    exerciseBounds,
    calendarYearBounds,
    monthKeysBetween,
    documentReading,
    readingMatches,
    economicAmountForDocument,
    calculateSimpleDocumentTax,
    validStatesForInstrument,
    instrumentIsBankRealized,
    instrumentCancelsDocument,
    instrumentCommerciallyCancelsNow,
    instrumentIsPending,
    documentDirection,
    inferredCommercialSide,
    userFlowState,
    documentBreakdown,
    orderBreakdown,
    normalizeInstrumentApplication,
    orderInstrumentCommercialAmount,
    settlementInstrumentAmount,
    flowRows,
    filterFlowRows,
    openFlowRows,
    flowDrilldownRows,
    flowTotals,
    economicDocumentRows,
    economicSummary,
    reconcileIndicatorDetail,
    economicIndicatorDetail,
    taxIndicatorDetail,
    closingIndicatorDetail,
    taxRows,
    taxTotals,
    taxMatrix,
    closingSummary,
    accountBalancesAsOf,
    financialMovementRows,
    financialReconciliation,
    panelGeneralSummary,
    panelPositionSummary,
    panelUpcomingWindows,
    panelControls,
    receivedCheckPortfolio,
    receivedCheckPortfolioAmount,
    monthBounds,
    monthlyFlow,
    monthlyHierarchy,
    pendingWindows,
    activityDistribution,
    periodSummaryByActivity,
    accountBalances,
    consolidatedFlow,
    validateState,
    createEntityTransaction,
    updateEntityTransaction,
    entityMergePreview,
    mergeEntitiesTransaction,
    createFinancialInstitutionTransaction,
    createFinancialAccountTransaction,
    updateFinancialAccountTransaction,
    createDocumentTransaction,
    updateDocumentTransaction,
    correctHistoricalDocumentTransaction,
    editDocumentTransaction,
    voidRecordTransaction,
    documentDeletionPreview,
    deleteDocumentTransaction,
    artificialDocumentCleanupPreview,
    cleanupArtificialDocumentTransaction,
    reassignedMigratedDocumentPreview,
    documentRemovalPreview,
    removeDocumentTransaction,
    createOrderTransaction,
    existingOrderLinkPreview,
    linkExistingOrderTransaction,
    existingOrderLinksPreview,
    linkExistingOrdersTransaction,
    updateOrderTransaction,
    correctHistoricalOrderTransaction,
    orderInstrumentEditBlockers,
    editOrderWithInstrumentTransaction,
    addOrderInstrumentsTransaction,
    ARCA_PLAN_SCHEDULES,
    prepareArcaPlans,
    importArcaPlansTransaction,
    taxPaymentPlanRows,
    taxPaymentPlanCancellationPreview,
    taxPaymentPlanTransaction,
    documentPlanProjectionEnabled,
    orderInstrumentationCapacity,
    instrumentLinkedOnlyToInactiveOrders,
    instrumentLinkedOnlyToVoidedOrders,
    transitionInstrument,
    repairInactiveOrderInstrumentTransaction,
    voidScheduledInstrumentTransaction,
    reverseRealizedInstrumentTransaction,
    bankChargeReversalDetails,
    updateInstrumentTransaction,
    correctHistoricalInstrumentTransaction,
    createBankChargeTransaction,
    createFinancialAdjustmentTransaction,
    createTaxReimbursementTransaction,
    createTaxPaymentTransaction,
    createInternalTransferTransaction,
    practicedWithholdingBalance,
    taxPaymentSuggestedConcept,
    createGrainLocationTransaction,
    createGrainTransferTransaction,
    createGrainForwardTransaction,
    createAgriculturalIncomeProjectionTransaction,
    updateAgriculturalIncomeProjectionTransaction,
    deleteAgriculturalIncomeProjectionTransaction,
    replaceAgriculturalIncomeProjectionTransaction,
    createGrainReferencePriceTransaction,
    createGrainMovementTransaction,
    createGrainBarterPaymentTransaction,
    createDocumentCompensationTransaction,
    createGrainReconciliationTransaction,
    transitionGrainReconciliationTransaction,
    editDocumentCompensationTransaction,
    transitionDocumentCompensationTransaction,
    compensationStatus,
    compensationDocumentAmount,
    correctCollectionAndCompensateTransaction,
    createGrainLiquidationTransaction,
    correctHistoricalGrainLiquidationTransaction,
    createLivestockLocationTransaction,
    updateLivestockLocationTransaction,
    createLivestockHerdTransaction,
    updateLivestockHerdTransaction,
    createLivestockTradeTransaction,
    livestockPurchaseCategoryCorrectionInfo,
    correctHistoricalLivestockPurchaseCategoryTransaction,
    calculateLivestockTradeBreakdown,
    createLivestockBirthTransaction,
    createLivestockDeathTransaction,
    createLivestockTransferTransaction,
    livestockCategoryChange,
    createLivestockCategoryChangeTransaction,
    updateLivestockCategoryChangeTransaction,
    voidLivestockCategoryChangeTransaction,
    createLivestockWeighingTransaction,
    createLivestockReferencePriceTransaction,
    currentAccountRows,
    fxRateForMonth,
    setFxEstimatesTransaction,
    saveNoteTransaction,
    deleteNoteTransaction
  };
});
