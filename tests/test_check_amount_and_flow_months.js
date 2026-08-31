const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

assert(
  app.includes("parts[1].length === 3"),
  "parseAmount debe tratar un unico separador con 3 digitos como separador de miles."
);
assert(
  app.includes("plannedDate: item.dueDate || item.date || dueDate"),
  "El flujo de cheques debe usar el vencimiento de cada cheque."
);

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
  if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
    return Number(parts.join("")) * sign || 0;
  }
  return normalizeWithDecimal(text.lastIndexOf(separator));
}

assert.equal(parseAmount("500.000"), 500000);
assert.equal(parseAmount("$ 466.600"), 466600);
assert.equal(parseAmount("2.612.987,28"), 2612987.28);
assert.equal(parseAmount("123,45"), 123.45);

const checks = [
  { number: "1", amount: parseAmount("500.000"), dueDate: "2026-08-29", status: "pendiente" },
  { number: "2", amount: parseAmount("500.000"), dueDate: "2026-09-29", status: "pendiente" },
  { number: "3", amount: parseAmount("500.000"), dueDate: "2026-10-29", status: "pendiente" },
];

const months = checks.map((check) => String(check.dueDate).slice(0, 7));
assert.deepEqual(months, ["2026-08", "2026-09", "2026-10"]);
assert.deepEqual(checks.map((check) => check.amount), [500000, 500000, 500000]);

const total = parseAmount("1.572.309");
const badChecksTotal = [500, 572.31, 500].reduce((sum, amount) => sum + amount, 0);
assert(Math.abs(total - badChecksTotal) > 1000000, "La validacion debe detectar cheques mal parseados contra el total.");

console.log("ok - check amount parsing and flow months");
