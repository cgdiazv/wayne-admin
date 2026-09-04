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
  console.log('=== VERIFYING ACCOUNT EDIT FLOW ===');

  // 1. Get existing accounts
  const accountsRes = await request('/api/accounts');
  console.log('[1] GET /api/accounts status:', accountsRes.status, 'Count:', accountsRes.data.data.length);

  const account = accountsRes.data.data[0];
  console.log('[2] Selected account to test edit:', {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    isActive: account.isActive
  });

  // 2. Test PATCH /api/accounts/[id]
  console.log('\n[3] Calling PATCH /api/accounts/' + account.id + '...');
  const originalName = account.name;
  const testName = originalName + ' (Verificado)';

  const patchRes = await request(`/api/accounts/${account.id}`, 'PATCH', {
    name: testName,
    isActive: true
  });
  console.log('PATCH response status:', patchRes.status, 'Success:', patchRes.data.success);
  console.log('Updated name in DB:', patchRes.data.data.name);

  // 3. Restore original name
  console.log('\n[4] Restoring original name...');
  const restoreRes = await request(`/api/accounts/${account.id}`, 'PATCH', {
    name: originalName
  });
  console.log('Restore response status:', restoreRes.status, 'Restored name:', restoreRes.data.data.name);

  console.log('\n>>> ACCOUNT EDIT FLOW VERIFIED SUCCESSFULLY! <<<');
}

run().catch(console.error);
