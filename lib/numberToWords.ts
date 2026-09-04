/**
 * Converts a numeric amount into formal Spanish words
 * e.g. 7850.25 -> "SIETE MIL OCHOCIENTOS CINCUENTA LEMPIRAS CON 25/100"
 */

const UNIDADES = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DECENAS = [
  "",
  "DIEZ",
  "VEINTE",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];
const DIEZ_A_DIECINUEVE = [
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
];
const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function convertGroup(n: number): string {
  let output = "";

  if (n === 100) return "CIEN";

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (c > 0) output += CENTENAS[c] + " ";

  if (d === 1) {
    output += DIEZ_A_DIECINUEVE[u] + " ";
  } else if (d === 2) {
    if (u === 0) output += "VEINTE ";
    else output += "VEINTI" + UNIDADES[u] + " ";
  } else if (d > 2) {
    output += DECENAS[d];
    if (u > 0) output += " Y " + UNIDADES[u];
    output += " ";
  } else if (u > 0) {
    output += UNIDADES[u] + " ";
  }

  return output.trim();
}

export function numberToSpanishWords(amount: number, currency: string = "HNL"): string {
  if (isNaN(amount) || amount === 0) {
    const curName = currency === "USD" ? "DÓLARES" : "LEMPIRAS";
    return `CERO ${curName} CON 00/100`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const cents = Math.round((absAmount - integerPart) * 100);
  const centsStr = String(cents).padStart(2, "0");

  if (integerPart === 0) {
    const curName = currency === "USD" ? "DÓLARES" : "LEMPIRAS";
    return `CERO ${curName} CON ${centsStr}/100`;
  }

  let words = "";

  // Millions
  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions === 1) {
    words += "UN MILLÓN ";
  } else if (millions > 1) {
    words += convertGroup(millions) + " MILLONES ";
  }

  // Thousands
  if (thousands === 1) {
    words += "MIL ";
  } else if (thousands > 1) {
    words += convertGroup(thousands) + " MIL ";
  }

  // Units/Hundreds
  if (remainder > 0) {
    words += convertGroup(remainder) + " ";
  }

  words = words.trim();

  let currencyName = "LEMPIRAS";
  if (currency === "USD") {
    currencyName = integerPart === 1 ? "DÓLAR" : "DÓLARES";
  } else {
    currencyName = integerPart === 1 ? "LEMPIRA" : "LEMPIRAS";
  }

  const result = `${isNegative ? "MENOS " : ""}${words} ${currencyName} CON ${centsStr}/100`;
  return result.toUpperCase();
}
