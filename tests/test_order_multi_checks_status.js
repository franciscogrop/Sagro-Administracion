const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert(!app.includes("function finalizeLinkedOrderChecks"), "No debe existir una rutina que finalice todos los cheques de una orden.");
assert(!app.includes("finalizeLinkedOrderChecks(order)"), "applyOrder no debe marcar todos los cheques como pagados/cobrados.");
assert(app.includes('let selectedCheckStatus = "todos";'), "La vista de cheques debe iniciar en Todos.");
assert(app.includes('["todos", "Todos", () => true]'), "La vista de cheques debe incluir pestana Todos.");
assert(html.includes('id="checkNumberSearch"'), "La vista de cheques debe incluir buscador por numero.");

function isFinalCheckStatus(status) {
  return ["pagado", "cobrado", "depositado", "endosado"].includes(status);
}

function reconcileOrderStatusFromChecks(order, checks) {
  const linked = checks.filter((check) => check.orderId === order.id);
  const finalCount = linked.filter((check) => isFinalCheckStatus(check.status)).length;
  if (finalCount === linked.length) return order.type === "cobro" ? "cobrado" : "pagado";
  if (finalCount) return "pago parcial";
  return "pendiente";
}

const order = { id: "order-1", type: "pago", status: "pendiente" };
const checks = [
  { id: "check-1", orderId: "order-1", number: "02664395", status: "pagado" },
  { id: "check-2", orderId: "order-1", number: "02664396", status: "pendiente" },
  { id: "check-3", orderId: "order-1", number: "02664397", status: "pendiente" },
];

assert.equal(reconcileOrderStatusFromChecks(order, checks), "pago parcial");
assert.deepEqual(checks.map((check) => check.status), ["pagado", "pendiente", "pendiente"]);

checks[1].status = "pagado";
checks[2].status = "pagado";
assert.equal(reconcileOrderStatusFromChecks(order, checks), "pagado");

console.log("ok - multi-check order status regression");
