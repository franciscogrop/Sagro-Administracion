(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.SagroCorrections = factory(root.SagroCore);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';

  // One-time, reviewed data corrections. Each one checks that the data is exactly as it was
  // when the correction was designed; if anything differs it refuses to run.
  const cents = (value) => Math.round(Number(value || 0) * 100);
  const money = (value) => cents(value) / 100;
  const LAR = 'ENT-OLD-ENT-LAAGRICOLAREGIONAL';
  const BANK = 'MIG-BANK-ARS';
  const CORRECTION_ID = 'LAR-CC-PESOS-2026-10';

  function audit(draft, action, entityType, entityId, changes, reason, user) {
    draft.auditLog.unshift({ id: Core.uid('AUD'), entityType, entityId, action, changes, createdAt: new Date().toISOString(), reason, user: user || 'local' });
  }

  // Compensations and cancelled transfers have no bank effect, so they are retired directly.
  function retireNonBankInstrument(draft, instrumentId, reason, user) {
    const instrument = draft.instruments.find((item) => item.id === instrumentId);
    if (!instrument || instrument.voidedAt) throw new Error(`Instrumento ${instrumentId} inexistente o ya anulado`);
    if (!(instrument.type === 'compensation' || (instrument.type === 'transfer' && instrument.status === 'cancelled'))) throw new Error(`Instrumento ${instrumentId} no es una compensación ni una transferencia cancelada`);
    if (instrument.internalTransferId || instrument.endorsedToEntityId || instrument.deliveredToEntityId) throw new Error(`Instrumento ${instrumentId} con uso posterior`);
    if ((draft.bankCharges || []).some((charge) => charge.instrumentId === instrumentId)) throw new Error(`Instrumento ${instrumentId} con cargo bancario`);
    const now = new Date().toISOString();
    const links = draft.orderInstruments.filter((link) => link.instrumentId === instrumentId && !link.voidedAt);
    const settlements = draft.orderDocumentSettlements.filter((item) => links.some((link) => link.id === item.orderInstrumentId) && !item.voidedAt);
    const before = instrument.status;
    instrument.voidedAt = now;
    instrument.status = 'voided';
    instrument.executedDate = null;
    links.forEach((link) => { link.voidedAt = now; });
    settlements.forEach((item) => { item.voidedAt = now; });
    audit(draft, 'void-non-bank-instrument', 'instrument', instrumentId, [{ field: 'status', from: before, to: 'voided' }, { field: 'voidedLinks', from: null, to: [...links.map((l) => l.id), ...settlements.map((s) => s.id)] }], reason, user);
  }

  function expectDocument(state, id, amount, label) {
    const doc = state.documents.find((item) => item.id === id);
    if (!doc || doc.voidedAt) throw new Error(`Falta ${label}`);
    if (doc.entityId !== LAR || doc.currency !== 'ARS' || cents(doc.amount) !== cents(amount)) throw new Error(`${label} cambió desde que se preparó la corrección`);
    return doc;
  }

  function expectInstrument(state, id, amount, status, label) {
    const instrument = state.instruments.find((item) => item.id === id);
    if (!instrument || instrument.voidedAt || cents(instrument.amount) !== cents(amount) || instrument.status !== status) throw new Error(`${label} cambió desde que se preparó la corrección`);
    return instrument;
  }

  const WRONG_COLLECTIONS = [
    { id: 'INS-OLD-8FA0E943-210A-46F0-8B06-E5F6A6E79001', amount: 430943.63, label: 'Cobro por transferencia 25/05 $ 430.943,63' },
    { id: 'INS-OLD-926454F1-ED5E-4D9F-AA68-0B6D30846751', amount: 8003763.58, label: 'Cobro por transferencia 01/06 $ 8.003.763,58' },
    { id: 'INS-OLD-FEF714BF-71C4-4DF4-A6B0-6043990CC056', amount: 7947320.48, label: 'Cobro por transferencia 17/06 $ 7.947.320,48' },
    { id: 'INS-muzhhr1t-z363oa', amount: 4606641.76, label: 'Cobro por transferencia 19/06 $ 4.606.641,76' },
    { id: 'INS-OLD-E4F2C7C9-2649-4AED-BEFD-FEA79E233A61', amount: 5149327.16, label: 'Cobro por transferencia 21/07 $ 5.149.327,16' }
  ];

  const NON_BANK_INSTRUMENTS = [
    { id: 'INS-OLD-E0F0DFBB-0A48-4479-A807-41AC664B6D71-CONFIRMED-CANJE', amount: 3171299.26, status: 'executed', label: 'Canje de la liquidación de 6.972 kg con OP-2026-0018' },
    { id: 'INS-OLD-CB5DB61E-730C-44D8-9CA9-F3AB173D333D-CONFIRMED-CANJE', amount: 3171299.26, status: 'executed', label: 'Canje de OP-2026-0018' },
    { id: 'INS-OLD-6E27C6E7-545E-488D-B35E-164F7D3DEFA7-CONFIRMED-CANJE', amount: 1677529.23, status: 'executed', label: 'Canje de la liquidación de 3.606 kg con OP-2026-0044' },
    { id: 'INS-OLD-872DDD41-C600-49D4-88D3-807AF0AEE159-CONFIRMED-CANJE', amount: 1677529.23, status: 'executed', label: 'Canje de OP-2026-0044' },
    { id: 'INS-muzhe56o-kzqhdx', amount: 20128591.77, status: 'executed', label: 'Compensación sin contrapartida de la liquidación de soja 17/06' },
    { id: 'INS-muzhj7wl-yrimk3', amount: 449357.54, status: 'executed', label: 'Compensación sin contrapartida de la liquidación de maíz 20/07' },
    { id: 'INS-mue7r5mb-63aghb', amount: 97288.55, status: 'cancelled', label: 'Transferencia cancelada de 563-18196' }
  ];

  const DUPLICATES = [
    { id: 'DOC-OLD-ORDER-SOURCE-CB5DB61E-730C-44D8-9CA9-F3AB173D333D', amount: 3171299.26, label: 'OP-2026-0018 (semilla soja, duplicada de OP-2026-0017 / 317-10705)' },
    { id: 'DOC-OLD-ORDER-SOURCE-872DDD41-C600-49D4-88D3-807AF0AEE159', amount: 1677529.23, label: 'OP-2026-0044 (certificado, duplicada de 23-17000700)' },
    { id: 'DOC-OLD-ORDER-SOURCE-28EA865C-CF13-4B69-914D-7024EC7C19BC', amount: 296.96, label: 'OP-2026-0055 (electrificación cargada como $ 296,96; se reemplaza por 275-70578)' }
  ];

  // Real money received from LAR (BNA extracts), applied to the liquidation each payment came from.
  const REAL_COLLECTIONS = [
    { orderId: 'OC-OLD-926454F1-ED5E-4D9F-AA68-0B6D30846751', documentId: 'DOC-OLD-SETT-7189D2C1-FD28-431A-9D09-177887DF88BA', items: [{ date: '2026-06-01', amount: 4671000, reference: 'Interbanking LAR 1-42601' }, { date: '2026-06-01', amount: 300311.83, reference: 'Pago Ret. IVA RG 4250 LAR 1-42555' }] },
    { orderId: 'OC-OLD-FEF714BF-71C4-4DF4-A6B0-6043990CC056', documentId: 'DOC-OLD-SETT-0EE14924-ADAB-474A-812B-6001E6EB8337', items: [{ date: '2026-06-30', amount: 7527000, reference: 'Interbanking LAR 1-44703' }, { date: '2026-06-30', amount: 283982.73, reference: 'Pago Ret. IVA RG 4250 LAR 1-44704' }] },
    { orderId: 'OC-OLD-E4F2C7C9-2649-4AED-BEFD-FEA79E233A61', documentId: 'DOC-OLD-SETT-BC4B2FA6-FADC-449E-A9C7-D05CC202A04B', items: [{ date: '2026-07-29', amount: 177554.97, reference: 'Pago Ret. IVA RG 4250 LAR 1-46625' }, { date: '2026-07-30', amount: 4100000, reference: 'Interbanking LAR 1-46680' }] }
  ];

  const CHART = {
    interest: 'CA-OLD-D644C982-53EC-48F0-B452-255FFDC05095',
    power: 'CA-OLD-AB96F976-FB5D-4FC8-80C9-1C0F33E7BFD4',
    insurance: 'CA-OLD-9683527D-8846-444F-90CD-1D27258C3399',
    vehicleRepair: 'CA-OLD-9ED083D0-12EA-4A6F-B7A6-6C2520F43F45',
    improvements: 'CA-OLD-BF8C0270-B979-48B3-A6F8-724D3B98F10C',
    grainSelling: 'CA-OLD-2100E83F-C5F7-4425-B49E-94F80D21D646',
    agrochemicals: 'CA-OLD-C6D3FDC0-B049-4278-A7DB-8C390EC4F748'
  };

  // Comprobantes del resumen de cuenta de LAR que no estaban cargados.
  const MISSING_DEBTS = [
    { number: '531-25608', type: 'purchase_invoice', issueDate: '2026-04-20', dueDate: '2026-05-15', amount: 4588, chart: 'improvements', description: 'Factura LAR F.C.' },
    { number: '313-295197', type: 'debit_note', issueDate: '2026-05-08', dueDate: '2026-05-08', amount: 396589.77, chart: 'interest', description: 'Nota de débito LAR cuenta corriente' },
    { number: '563-17286', type: 'purchase_invoice', issueDate: '2026-05-09', dueDate: '2026-05-24', amount: 84969.09, chart: 'vehicleRepair', description: 'Factura LAR Agromovil' },
    { number: '275-70578 cuota 18-05', type: 'purchase_invoice', issueDate: '2026-05-15', dueDate: '2026-05-18', amount: 296959.52, chart: 'power', description: 'Movimiento electrificacion' },
    { number: '317-10704', type: 'purchase_invoice', issueDate: '2026-05-21', dueDate: '2026-05-31', amount: 142808.33, chart: 'grainSelling', activity: 'Agricultura', description: 'Factura LAR secado de soja' },
    { number: '1-68092098 cuota 25-05', type: 'purchase_invoice', issueDate: '2026-05-27', dueDate: '2026-05-27', amount: 11596, chart: 'insurance', description: 'Poliza automotor' },
    { number: '313-296042', type: 'debit_note', issueDate: '2026-06-09', dueDate: '2026-06-09', amount: 148213.94, chart: 'interest', description: 'Nota de débito LAR cuenta corriente' },
    { number: '275-70578 cuota 18-06', type: 'purchase_invoice', issueDate: '2026-05-15', dueDate: '2026-06-18', amount: 296959.52, chart: 'power', description: 'Movimiento electrificacion' },
    { number: '1-68092098 cuota 25-06', type: 'purchase_invoice', issueDate: '2026-06-18', dueDate: '2026-06-25', amount: 11596, chart: 'insurance', description: 'Poliza automotor' },
    { number: '313-297695', type: 'debit_note', issueDate: '2026-08-10', dueDate: '2026-08-10', amount: 11712.92, chart: 'interest', description: 'Nota de débito LAR cuenta corriente' },
    { number: '1-68670634 cuota 25-08', type: 'purchase_invoice', issueDate: '2026-08-28', dueDate: '2026-08-28', amount: 13241, chart: 'insurance', description: 'Poliza automotor' },
    { number: '275-72507 cuota 18-09', type: 'purchase_invoice', issueDate: '2026-09-18', dueDate: '2026-09-18', amount: 493866.23, chart: 'power', description: 'Movimiento electrificacion' },
    { number: '1-68670634 cuota 25-09', type: 'purchase_invoice', issueDate: '2026-09-23', dueDate: '2026-09-25', amount: 13241, chart: 'insurance', description: 'Poliza automotor' },
    { number: '275-72507 cuota 19-10', type: 'purchase_invoice', issueDate: '2026-09-18', dueDate: '2026-10-19', amount: 493866.22, chart: 'power', description: 'Movimiento electrificacion' },
    { number: '1-69258660', type: 'purchase_invoice', issueDate: '2026-10-23', dueDate: '2026-10-25', amount: 15105.3, chart: 'insurance', description: 'Poliza automotor' }
  ];

  const EXISTING_DEBTS = [
    ['DOC-OLD-INV-INV-LAR-17000700-MSYSL84B-0F0EA15Q', 1627437.3, '23-17000700'],
    ['DOC-OLD-ORDER-SOURCE-5D3EACC5-E7B6-4923-A774-A475720B0FC7', 3396333.35, 'OP-2026-0017 (317-10705)'],
    ['DOC-OLD-ORDER-SOURCE-1F44B483-E3F0-4504-A706-C65A75FB54E1', 24768909, 'OP-2026-0065'],
    ['DOC-OLD-INV-6F9FBC26-187E-4D5C-BA9B-BC2F2581B38A', 143117.14, '23-81003005'],
    ['DOC-OLD-INV-2771E2B3-80B3-4978-B90C-8481561E83FE', 236481.72, '531-26843'],
    ['DOC-OLD-INV-535F918A-25E8-40EE-B427-273194DA5E77', 438102.69, '275-71355 cuota 17-07'],
    ['DOC-OLD-INV-C309E092-132F-46D2-BD4D-90A1DBF0B202', 6554.36, '313-296881'],
    ['DOC-OLD-INV-15DFE9E3-AF74-4E26-B4B3-4AAEA5696E68', 13249.08, '1-68670634'],
    ['DOC-OLD-INV-360B11C8-895A-48B3-AF1A-640103568691', 97288.55, '563-18196'],
    ['DOC-OLD-INV-18E8C261-C07B-42E1-8746-82053EFC9D49', 2294561.59, '561-7734'],
    ['DOC-OLD-INV-C1C1C6C8-3D10-4821-B601-3D8A552FAE92', 449587.6, '23-17000823'],
    ['DOC-OLD-INV-A147652D-C231-461A-9816-C22E0993E603', 16664.37, '515-4753'],
    ['DOC-OLD-INV-EE39CA94-7E09-405C-8713-9D7BF5FEE292', 438102.69, '275-71355 cuota 18-08'],
    ['DOC-mv2ccf3h-pfnuej', 9057.43, '313-298473'],
    ['DOC-mv2f8ggp-axf2wv', 28601.31, '313-299254'],
    ['DOC-mvk0of04-lfr0ju', 1183962.45, '561-8029']
  ];

  const LIQUIDATIONS = [
    ['DOC-OLD-SETT-C49AC2B5-B7A6-476D-97F3-AF34220273DB', 3171299.26],
    ['DOC-OLD-SETT-88116D8E-8FEF-45A3-9945-2E2329BDE71E', 1677529.23],
    ['DOC-OLD-SETT-CF5EA20C-1A16-4488-93D9-72F803F6311E', 430943.63],
    ['DOC-OLD-SETT-7189D2C1-FD28-431A-9D09-177887DF88BA', 8003763.58],
    ['DOC-OLD-SETT-C4A689D7-74AF-4EB1-8262-E817666A2D58', 20128591.77],
    ['DOC-OLD-SETT-0EE14924-ADAB-474A-812B-6001E6EB8337', 7947320.48],
    ['DOC-OLD-SETT-1C70034E-A974-4C79-92B9-863333D499CA', 4606641.76],
    ['DOC-OLD-SETT-85952720-DE61-4ED5-BC8E-E79FDBCAA3C1', 449357.54],
    ['DOC-OLD-SETT-BC4B2FA6-FADC-449E-A9C7-D05CC202A04B', 5149327.16]
  ];

  const STATEMENT_BALANCE = 1527258.13;

  function alreadyApplied(state, id) {
    return (state.auditLog || []).some((item) => item.action === 'apply-correction' && item.entityId === id);
  }

  function checkLar(state) {
    if (alreadyApplied(state, CORRECTION_ID)) throw new Error('La corrección ya fue aplicada');
    if (!state.entities.some((item) => item.id === LAR)) throw new Error('No se encontró La Agricola Regional');
    if (!state.financialAccounts.some((item) => item.id === BANK && !item.voidedAt)) throw new Error('No se encontró la cuenta BNA');
    WRONG_COLLECTIONS.forEach((item) => expectInstrument(state, item.id, item.amount, 'executed', item.label));
    NON_BANK_INSTRUMENTS.forEach((item) => expectInstrument(state, item.id, item.amount, item.status, item.label));
    DUPLICATES.forEach((item) => expectDocument(state, item.id, item.amount, item.label));
    EXISTING_DEBTS.forEach(([id, amount, label]) => expectDocument(state, id, amount, label));
    LIQUIDATIONS.forEach(([id, amount]) => expectDocument(state, id, amount, `Liquidación ${id}`));
    MISSING_DEBTS.forEach((item) => {
      if (state.documents.some((doc) => !doc.voidedAt && doc.entityId === LAR && doc.number === item.number)) throw new Error(`El comprobante ${item.number} ya está cargado: hay que revisar la corrección`);
    });
  }

  function larDebtsAndCredits(state, ids) {
    const docs = ids.map((id) => state.documents.find((doc) => doc.id === id)).filter(Boolean);
    return docs.map((doc) => ({ doc, pending: money(Core.pendingAmountForDocument(state, doc.id)) })).filter((item) => item.pending > 0);
  }

  function buildLar(state, user) {
    checkLar(state);
    const reason = 'Corrección cuenta corriente LAR en pesos según resumen al 27/10/2026';
    let draft = Core.clone(state);

    // 1. Cobros por banco que no existieron.
    WRONG_COLLECTIONS.forEach((item) => {
      draft = Core.reverseRealizedInstrumentTransaction(draft, item.id, reason, user);
      draft = Core.voidScheduledInstrumentTransaction(draft, item.id, reason, user);
    });
    // 2. Canjes sin contrapartida, duplicados y una transferencia cancelada que quedó vinculada.
    NON_BANK_INSTRUMENTS.forEach((item) => retireNonBankInstrument(draft, item.id, reason, user));
    // 3. Documentos duplicados.
    DUPLICATES.forEach((item) => { draft = Core.deleteDocumentTransaction(draft, item.id, `${reason}: ${item.label}`, user); });
    // 4. Cobros reales en el BNA.
    REAL_COLLECTIONS.forEach((collection) => {
      draft = Core.addOrderInstrumentsTransaction(draft, collection.orderId, {
        instruments: collection.items.map((item) => ({ type: 'transfer', amount: item.amount, financialAccountId: BANK, scheduledDate: item.date, executedDate: item.date, status: 'executed', reference: item.reference, notes: 'Según resumen LAR y extracto BNA' }))
      }, user);
    });
    // 5. Comprobantes que faltaban, saldo inicial, nota de crédito y diferencia de liquidaciones.
    const createdDebts = [];
    MISSING_DEBTS.forEach((item) => {
      const id = Core.uid('DOC');
      draft = Core.createDocumentTransaction(draft, { id, type: item.type, commercialSide: 'purchase', fiscalStatus: 'documented', entityId: LAR, issueDate: item.issueDate, dueDate: item.dueDate, number: item.number, amount: item.amount, currency: 'ARS', activity: item.activity || 'Estructura/Admin', chartAccountId: CHART[item.chart], description: item.description }, user);
      createdDebts.push(id);
    });
    const openingId = Core.uid('DOC');
    draft = Core.createDocumentTransaction(draft, { id: openingId, type: 'liability', commercialSide: 'purchase', fiscalStatus: 'documented', entityId: LAR, issueDate: '2026-04-30', dueDate: '2026-04-30', number: 'LAR saldo inicial 30-04-2026', amount: 2374566.93, currency: 'ARS', activity: 'Estructura/Admin', description: 'Saldo inicial cuenta corriente LAR al 30/04/2026 (ejercicio anterior)', notes: 'Según resumen de cuenta LAR' }, user);
    const creditNoteId = Core.uid('DOC');
    draft = Core.createDocumentTransaction(draft, { id: creditNoteId, type: 'credit_note', commercialSide: 'purchase', fiscalStatus: 'documented', entityId: LAR, issueDate: '2026-06-18', dueDate: '2026-06-28', number: '317-10848', amount: 33090.97, currency: 'ARS', activity: 'Agricultura', chartAccountId: CHART.agrochemicals, description: 'N.C. diferencia de cotizacion insumos' }, user);
    const statementCredits = 55457382.04;
    const loadedCredits = LIQUIDATIONS.reduce((sum, [, amount]) => sum + cents(amount), 0) + cents(2294550.61) + cents(1183685.1);
    const differenceId = Core.uid('DOC');
    const difference = money((cents(statementCredits) - loadedCredits) / 100);
    if (difference > 0) {
      draft = Core.createDocumentTransaction(draft, { id: differenceId, type: 'debit_note', commercialSide: 'sale', fiscalStatus: 'documented', entityId: LAR, issueDate: '2026-06-30', dueDate: '2026-06-30', number: 'LAR dif. liquidaciones may-jun', amount: difference, currency: 'ARS', activity: 'Agricultura', chartAccountId: 'CA-OLD-5ECFD90D-7725-4D04-8044-DA7CB42BEA7C', economicAmount: 0, description: 'IVA RG 4310 de liquidaciones de mayo y junio que figura en el resumen LAR y no estaba en la carga migrada' }, user);
    }
    // 6. Cancelar deudas contra créditos, en orden de fecha (como lo aplica LAR).
    const debtIds = [openingId, ...EXISTING_DEBTS.map(([id]) => id), ...createdDebts];
    const creditIds = [...LIQUIDATIONS.map(([id]) => id), creditNoteId, ...(difference > 0 ? [differenceId] : [])];
    const byDate = (a, b) => (a.doc.dueDate || a.doc.issueDate).localeCompare(b.doc.dueDate || b.doc.issueDate) || a.doc.issueDate.localeCompare(b.doc.issueDate);
    const debts = larDebtsAndCredits(draft, debtIds).sort(byDate);
    const credits = larDebtsAndCredits(draft, creditIds).sort(byDate);
    let d = 0;
    for (const credit of credits) {
      let available = cents(credit.pending);
      while (available > 0 && d < debts.length) {
        const debt = debts[d];
        const amount = Math.min(available, cents(debt.pending));
        const date = [credit.doc.issueDate, debt.doc.issueDate].sort().at(-1);
        draft = Core.createDocumentCompensationTransaction(draft, { creditDocumentId: credit.doc.id, debtDocumentId: debt.doc.id, amount: amount / 100, date, reason, reference: 'Cuenta corriente LAR' }, user);
        available -= amount;
        debt.pending = money((cents(debt.pending) - amount) / 100);
        if (debt.pending <= 0) d += 1;
      }
      if (available > 0) throw new Error('Quedó crédito de LAR sin aplicar: revisar la corrección');
    }
    audit(draft, 'apply-correction', 'correction', CORRECTION_ID, [{ field: 'correction', from: null, to: CORRECTION_ID }], reason, user);
    const errors = Core.validateState(draft);
    if (errors.length) throw new Error(errors.join('\n'));
    return draft;
  }

  function larSummary(state) {
    const rows = Core.flowRows(state, {}).filter((row) => row.entityId === LAR && row.currency === 'ARS');
    const pendingDocs = new Set(EXISTING_DEBTS.map(([id]) => id));
    state.documents.filter((doc) => !doc.voidedAt && doc.entityId === LAR && (MISSING_DEBTS.some((item) => item.number === doc.number) || doc.number === 'LAR saldo inicial 30-04-2026')).forEach((doc) => pendingDocs.add(doc.id));
    const larPending = state.documents.filter((doc) => pendingDocs.has(doc.id) && !doc.voidedAt).reduce((sum, doc) => sum + cents(Core.pendingAmountForDocument(state, doc.id)), 0) / 100;
    const bank = (Core.accountBalances(state).find((account) => account.id === BANK) || {}).realBalance || 0;
    const exercise = Core.economicSummary(state, { exercise: '2026/27', currency: 'ARS' });
    return {
      larPending,
      larPendingFlow: rows.filter((row) => !row.realized && !row.estimated).reduce((sum, row) => sum - row.amount, 0),
      bank,
      result: exercise.result
    };
  }

  const CORRECTIONS = [{
    id: CORRECTION_ID,
    title: 'Cuenta corriente en pesos con La Agricola Regional',
    description: 'Rehace la cuenta en pesos con LAR según su resumen al 27/10/2026 y los extractos del BNA: anula 5 cobros por banco que no existieron ($ 26.137.996,61) y carga los 6 reales ($ 17.059.849,53), quita OP-2026-0018, OP-2026-0044 y OP-2026-0055 (duplicadas o mal cargadas), carga 15 comprobantes que faltaban, el saldo inicial al 30/04, la N.C. 317-10848 y la diferencia de IVA de liquidaciones, y cancela las deudas contra las liquidaciones de cereal en orden de fecha.',
    expected: { larPending: STATEMENT_BALANCE },
    check: checkLar,
    build: buildLar,
    summary: larSummary
  }];

  function available(state) {
    return CORRECTIONS.map((item) => {
      try { item.check(state); return { id: item.id, title: item.title, description: item.description, ready: true }; }
      catch (error) { return { id: item.id, title: item.title, description: item.description, ready: false, applied: alreadyApplied(state, item.id), reason: error.message }; }
    });
  }

  function preview(state, id, user) {
    const correction = CORRECTIONS.find((item) => item.id === id);
    if (!correction) throw new Error('Corrección inexistente');
    const after = correction.build(state, user);
    return { before: correction.summary(state), after: correction.summary(after), expected: correction.expected, state: after };
  }

  function applyCorrectionTransaction(state, id, user) {
    const correction = CORRECTIONS.find((item) => item.id === id);
    if (!correction) throw new Error('Corrección inexistente');
    return correction.build(state, user);
  }

  return { CORRECTIONS, available, preview, applyCorrectionTransaction };
});
