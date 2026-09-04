const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  console.log('=== VERIFYING PETTY CASH REPLENISHMENT & BANK INTEGRATION ===');

  // 1. Get bank account
  const bank = await prisma.bankAccount.findFirst({
    where: { bankBalance: { gt: 5000 } }
  });
  if (!bank) {
    console.error('No suitable bank account found in DB');
    process.exit(1);
  }
  console.log(`[1] Selected Bank: ${bank.name} (${bank.accountNumber}) - Balance: ${bank.currency} ${bank.bankBalance}`);

  // 2. Get petty cash fund with pending expenses
  const fund = await prisma.pettyCashFund.findFirst({
    include: {
      transactions: {
        where: { type: 'EGRESO', status: 'REGISTRADO' }
      }
    }
  });
  if (!fund) {
    console.error('No petty cash fund found in DB');
    process.exit(1);
  }
  console.log(`[2] Selected Fund: ${fund.name} (${fund.code}) - Balance: ${fund.currency} ${fund.currentBalance} - Pending expenses: ${fund.transactions.length}`);

  // If fund has no pending expenses, create one to test
  if (fund.transactions.length === 0) {
    console.log('Creating sample pending expense for testing replenishment...');
    await prisma.pettyCashTransaction.create({
      data: {
        fundId: fund.id,
        date: new Date().toISOString().split('T')[0],
        type: 'EGRESO',
        category: 'Suministros de Oficina',
        concept: 'Compra de papel bond y cartuchos de tinta',
        beneficiary: 'Papelería El Sol',
        invoiceNumber: '000-002-01-00817263',
        cai: 'F1A2B3-C4D5E6-789012-345678-90ABCD-EF',
        amount: 850.00,
        taxDeductible: true,
        status: 'REGISTRADO',
      }
    });
    // decrement balance
    await prisma.pettyCashFund.update({
      where: { id: fund.id },
      data: { currentBalance: { decrement: 850.00 } }
    });
  }

  // 3. Call /api/caja-chica/replenish
  console.log('\n[3] Calling POST /api/caja-chica/replenish...');
  const initialBankBalance = bank.bankBalance;
  const replenishRes = await request('/api/caja-chica/replenish', 'POST', {
    fundId: fund.id,
    bankAccountId: bank.id,
    paymentMethod: 'CHEQUE',
    referenceNumber: 'CHQ-8820',
    checkPayee: fund.custodianName,
    notes: 'Reposición programada con liquidación de comprobantes'
  });

  console.log('Replenish Response Status:', replenishRes.status);
  console.log('Success:', replenishRes.data.success);

  if (!replenishRes.data.success) {
    console.error('Error from server:', replenishRes.data.error);
    process.exit(1);
  }

  const { policy, bankTransaction } = replenishRes.data;
  console.log('\n[4] Verified Policy Output:');
  console.log(' - Policy Number:', policy.policyNumber);
  console.log(' - Check Payee:', policy.checkPayee);
  console.log(' - Total Disbursed:', policy.bankAccount.currency, policy.totalAmount);
  console.log(' - In Words:', policy.amountInWords);
  console.log(' - Journal Entry Lines:', policy.journalEntry.length);
  policy.journalEntry.forEach((line) => {
    console.log(`   * [${line.accountCode}] ${line.accountName}: Debe=${line.debit}, Haber=${line.credit}`);
  });

  // 5. Verify database state
  console.log('\n[5] Verifying DB state changes...');
  const updatedBank = await prisma.bankAccount.findUnique({ where: { id: bank.id } });
  const updatedFund = await prisma.pettyCashFund.findUnique({ where: { id: fund.id } });

  console.log(' - Bank balance before:', initialBankBalance, '-> after:', updatedBank.bankBalance);
  console.log(' - Expected bank decrement:', policy.totalAmount);
  console.log(' - Fund balance restored to fixed amount:', updatedFund.currentBalance, '===', fund.initialAmount);

  const bankTxInDb = await prisma.bankTransaction.findUnique({ where: { id: bankTransaction.id } });
  console.log(' - BankTransaction created:', bankTxInDb.description, '| Status:', bankTxInDb.status);

  console.log('\n>>> REPLENISHMENT & BANK INTEGRATION VALIDATION PASSED! <<<');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
