import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Helper to parse CSV lines into key-value objects
function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV regex to handle commas inside quotes
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ""));

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

// Load records from either JSON or CSV file
function loadRecords(filePath: string): Record<string, unknown>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  if (filePath.endsWith(".json")) {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [data];
  } else if (filePath.endsWith(".csv")) {
    return parseCsv(raw);
  } else {
    throw new Error("Supported file formats are .json and .csv");
  }
}

// Helper to extract value checking common key variations
function getField(row: Record<string, unknown>, ...aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const key = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return undefined;
}

// Import Accounts
export async function importAccounts(filePath: string) {
  console.log(`\nStarting Accounts import from: ${filePath}`);
  const records = loadRecords(filePath);
  let upserted = 0;
  let skipped = 0;

  for (const record of records) {
    const code = getField(record, "code", "accountcode", "acc_code", "id");
    const name = getField(record, "name", "accountname", "description", "title");
    const type = getField(record, "type", "accounttype", "category") || "Expense";
    const currency = getField(record, "currency", "curr") || "USD";
    const isActiveStr = getField(record, "isactive", "active", "status");
    const isActive = isActiveStr === undefined ? true : isActiveStr.toLowerCase() === "true" || isActiveStr === "1";

    if (!code || !name) {
      console.warn(`Skipping account record without code or name:`, record);
      skipped++;
      continue;
    }

    await prisma.account.upsert({
      where: { code },
      update: { name, type, currency, isActive },
      create: { code, name, type, currency, isActive },
    });
    upserted++;
  }

  console.log(`Accounts import complete. Upserted: ${upserted}, Skipped: ${skipped}`);
}

// Import Customers
export async function importCustomers(filePath: string) {
  console.log(`\nStarting Customers import from: ${filePath}`);
  const records = loadRecords(filePath);
  let upserted = 0;
  let skipped = 0;

  for (const record of records) {
    const macolaCode = getField(record, "macolacode", "macola_code", "customerno", "cus_no", "code");
    const name = getField(record, "name", "customername", "cus_name", "company");
    const email = getField(record, "email", "mail", "contact_email");
    const phone = getField(record, "phone", "telephone", "tel");
    const address = getField(record, "address", "addr", "shipping_address");
    const currency = getField(record, "currency", "curr") || "USD";

    if (!name) {
      console.warn(`Skipping customer record without name:`, record);
      skipped++;
      continue;
    }

    if (macolaCode) {
      await prisma.customer.upsert({
        where: { macolaCode },
        update: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
        create: {
          name,
          macolaCode,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
      });
    } else {
      await prisma.customer.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
      });
    }
    upserted++;
  }

  console.log(`Customers import complete. Upserted/Created: ${upserted}, Skipped: ${skipped}`);
}

// Import Vendors
export async function importVendors(filePath: string) {
  console.log(`\nStarting Vendors import from: ${filePath}`);
  const records = loadRecords(filePath);
  let upserted = 0;
  let skipped = 0;

  for (const record of records) {
    const macolaCode = getField(record, "macolacode", "macola_code", "vendorno", "vend_no", "code");
    const name = getField(record, "name", "vendorname", "vend_name", "company");
    const email = getField(record, "email", "mail", "contact_email");
    const phone = getField(record, "phone", "telephone", "tel");
    const address = getField(record, "address", "addr");
    const currency = getField(record, "currency", "curr") || "USD";

    if (!name) {
      console.warn(`Skipping vendor record without name:`, record);
      skipped++;
      continue;
    }

    if (macolaCode) {
      await prisma.vendor.upsert({
        where: { macolaCode },
        update: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
        create: {
          name,
          macolaCode,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
      });
    } else {
      await prisma.vendor.create({
        data: {
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          currency,
        },
      });
    }
    upserted++;
  }

  console.log(`Vendors import complete. Upserted/Created: ${upserted}, Skipped: ${skipped}`);
}

// Import Inventory Items
export async function importInventory(filePath: string) {
  console.log(`\nStarting Inventory import from: ${filePath}`);
  const records = loadRecords(filePath);
  let upserted = 0;
  let skipped = 0;

  for (const record of records) {
    const sku = getField(record, "sku", "itemno", "item_no", "partno", "code");
    const description = getField(record, "description", "desc", "item_desc", "name") || "No Description";
    const quantityStr = getField(record, "quantity", "qty", "qty_on_hand", "stock");
    const costStr = getField(record, "cost", "unit_cost", "avg_cost");
    const priceStr = getField(record, "price", "unit_price", "selling_price");

    if (!sku) {
      console.warn(`Skipping inventory record without SKU:`, record);
      skipped++;
      continue;
    }

    const quantity = quantityStr ? parseFloat(quantityStr) || 0 : 0;
    const cost = costStr ? parseFloat(costStr) || 0 : 0;
    const price = priceStr ? parseFloat(priceStr) || 0 : 0;

    await prisma.inventoryItem.upsert({
      where: { sku },
      update: { description, quantity, cost, price },
      create: { sku, description, quantity, cost, price },
    });
    upserted++;
  }

  console.log(`Inventory import complete. Upserted: ${upserted}, Skipped: ${skipped}`);
}

// CLI Entrypoint
async function main() {
  const args = process.argv.slice(2);
  const type = args[0]?.toLowerCase();
  const filePath = args[1];

  if (!type || !filePath) {
    console.log(`
Usage:
  npx tsx scripts/import-data.ts <type> <path-to-file>

Types:
  customers   - Import customers (CSV or JSON)
  vendors     - Import vendors (CSV or JSON)
  inventory   - Import inventory items (CSV or JSON)
  accounts    - Import chart of accounts (CSV or JSON)

Examples:
  npx tsx scripts/import-data.ts customers ./data/customers.csv
  npx tsx scripts/import-data.ts inventory ./data/inventory.json
    `);
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);

  try {
    switch (type) {
      case "customers":
        await importCustomers(resolvedPath);
        break;
      case "vendors":
        await importVendors(resolvedPath);
        break;
      case "inventory":
        await importInventory(resolvedPath);
        break;
      case "accounts":
        await importAccounts(resolvedPath);
        break;
      default:
        console.error(`Unknown type: ${type}. Expected: customers, vendors, inventory, accounts`);
        process.exit(1);
    }
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
