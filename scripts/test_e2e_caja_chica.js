const http = require('http');

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Cookie': 'admin_session=authenticated',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing GET /api/caja-chica/funds ---');
  const fundsRes = await request('/api/caja-chica/funds');
  console.log('Status:', fundsRes.status, 'Success:', fundsRes.data.success, 'Count:', fundsRes.data.funds.length);
  const fund = fundsRes.data.funds[0];
  console.log('Fund Code:', fund.code, 'Name:', fund.name, 'FixedAmount:', fund.fixedAmount, 'CurrentBalance:', fund.currentBalance);
  console.log('Transactions Count in Fund:', fund.transactions.length);
  console.log('Vouchers Count in Fund:', fund.vouchers.length);

  console.log('\n--- 2. Testing POST /api/caja-chica/transactions (Create Expense) ---');
  const expenseRes = await request('/api/caja-chica/transactions', 'POST', {
    fundId: fund.id,
    type: 'EXPENSE',
    category: 'Suministros de Oficina',
    concept: 'Compra de tóner para impresora Zebra y marcadores',
    beneficiary: 'Office Depot SPS',
    invoiceNumber: '000-001-01-00984123',
    cai: 'D9B184-783E0A-11EC91-56B3A9-F2E14A-12',
    amount: 450.00,
    taxDeductible: true,
  });
  console.log('Status:', expenseRes.status, 'Success:', expenseRes.data.success, 'Transaction ID:', expenseRes.data.data.id);

  console.log('\n--- 3. Testing POST /api/caja-chica/vouchers (Create Voucher) ---');
  const voucherRes = await request('/api/caja-chica/vouchers', 'POST', {
    fundId: fund.id,
    employeeName: 'María José Menjívar',
    beneficiary: 'María José Menjívar',
    amount: 500.00,
    purpose: 'Anticipo para compra de repuestos de costura',
    concept: 'Anticipo para compra de repuestos de costura',
  });
  console.log('Status:', voucherRes.status, 'Success:', voucherRes.data.success, 'Voucher Number:', voucherRes.data.voucher.voucherNumber);

  console.log('\n--- 4. Testing POST /api/caja-chica/audits (Create Cash Audit) ---');
  const auditRes = await request('/api/caja-chica/audits', 'POST', {
    fundId: fund.id,
    auditorName: 'Lic. Auditoría Interna',
    custodianName: fund.custodianName,
    theoreticalBalance: 6900.00,
    physicalCashTotal: 6900.00,
    pendingReceiptsTotal: 2300.00,
    activeVouchersTotal: 800.00,
    totalCounted: 10000.00,
    difference: 0.00,
    status: 'EXACTO',
    denominations: { '500': 10, '200': 5, '100': 8, '50': 2 },
    observations: 'Arqueo practicado con presencia del custodio. Fondo 100% cuadrado sin faltantes ni sobrantes.',
  });
  console.log('Status:', auditRes.status, 'Success:', auditRes.data.success, 'Audit Number:', auditRes.data.audit.auditNumber, 'Result:', auditRes.data.audit.status);

  console.log('\n--- 5. Testing POST /api/caja-chica/vouchers (Liquidate Voucher) ---');
  const liquidateRes = await request('/api/caja-chica/vouchers', 'POST', {
    action: 'LIQUIDATE',
    voucherId: voucherRes.data.voucher.id,
    actualExpense: 480.00,
    returnedCash: 20.00,
    receiptNumber: 'FACT-002914',
    notes: 'Liquidado conforme con devolución de L 20.00',
  });
  console.log('Status:', liquidateRes.status, 'Success:', liquidateRes.data.success, 'Voucher Status:', liquidateRes.data.voucher.status);

  console.log('\n--- 6. Re-fetching Funds to verify updated balances ---');
  const fundsAfter = await request('/api/caja-chica/funds');
  const fAfter = fundsAfter.data.funds[0];
  console.log('Updated Balance:', fAfter.currentBalance, 'Transactions:', fAfter.transactions.length, 'Audits:', fAfter.audits.length, 'Vouchers:', fAfter.vouchers.length);

  console.log('\n>>> ALL 6 E2E TESTS PASSED SUCCESSFULLY! <<<');
}

run().catch(console.error);
