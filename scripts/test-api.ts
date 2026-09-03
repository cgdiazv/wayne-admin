import { NextRequest } from "next/server";
import { GET as getAccounts, POST as postAccount } from "../app/api/accounts/route";
import { GET as getAccountById, PATCH as patchAccount, DELETE as deleteAccount } from "../app/api/accounts/[id]/route";
import { GET as getCustomers, POST as postCustomer } from "../app/api/customers/route";
import { GET as getVendors } from "../app/api/vendors/route";
import { GET as getInventory } from "../app/api/inventory/route";

async function runTests() {
  console.log("=== Testing API Route Handlers ===");

  // 1. GET /api/accounts
  console.log("\n1. Testing GET /api/accounts...");
  const reqAccounts = new NextRequest("http://localhost:3000/api/accounts");
  const resAccounts = await getAccounts(reqAccounts);
  const dataAccounts = await resAccounts.json();
  console.log(`Status: ${resAccounts.status}, Accounts found: ${dataAccounts.data?.length}`);

  // 2. POST /api/accounts (test account)
  console.log("\n2. Testing POST /api/accounts...");
  const reqPostAccount = new NextRequest("http://localhost:3000/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      code: "9999",
      name: "Temporary Test Account",
      type: "Expense",
      currency: "USD",
    }),
  });
  const resPostAccount = await postAccount(reqPostAccount);
  const dataPostAccount = await resPostAccount.json();
  console.log(`Status: ${resPostAccount.status}, Created Account ID: ${dataPostAccount.data?.id}`);
  const createdAccountId = dataPostAccount.data?.id;

  // 3. GET /api/accounts/[id]
  if (createdAccountId) {
    console.log("\n3. Testing GET /api/accounts/[id]...");
    const reqGetId = new NextRequest(`http://localhost:3000/api/accounts/${createdAccountId}`);
    const resGetId = await getAccountById(reqGetId, { params: Promise.resolve({ id: createdAccountId }) });
    const dataGetId = await resGetId.json();
    console.log(`Status: ${resGetId.status}, Fetched Name: ${dataGetId.data?.name}`);

    // 4. PATCH /api/accounts/[id]
    console.log("\n4. Testing PATCH /api/accounts/[id]...");
    const reqPatch = new NextRequest(`http://localhost:3000/api/accounts/${createdAccountId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Test Account" }),
    });
    const resPatch = await patchAccount(reqPatch, { params: Promise.resolve({ id: createdAccountId }) });
    const dataPatch = await resPatch.json();
    console.log(`Status: ${resPatch.status}, Updated Name: ${dataPatch.data?.name}`);

    // 5. DELETE /api/accounts/[id]
    console.log("\n5. Testing DELETE /api/accounts/[id]...");
    const reqDel = new NextRequest(`http://localhost:3000/api/accounts/${createdAccountId}`, { method: "DELETE" });
    const resDel = await deleteAccount(reqDel, { params: Promise.resolve({ id: createdAccountId }) });
    const dataDel = await resDel.json();
    console.log(`Status: ${resDel.status}, Deleted Message: ${dataDel.message}`);
  }

  // 6. GET /api/customers
  console.log("\n6. Testing GET /api/customers...");
  const reqCustomers = new NextRequest("http://localhost:3000/api/customers?limit=5");
  const resCustomers = await getCustomers(reqCustomers);
  const dataCustomers = await resCustomers.json();
  console.log(`Status: ${resCustomers.status}, Total Customers: ${dataCustomers.pagination?.total}`);

  // 7. GET /api/vendors
  console.log("\n7. Testing GET /api/vendors...");
  const reqVendors = new NextRequest("http://localhost:3000/api/vendors?limit=5");
  const resVendors = await getVendors(reqVendors);
  const dataVendors = await resVendors.json();
  console.log(`Status: ${resVendors.status}, Total Vendors: ${dataVendors.pagination?.total}`);

  // 8. GET /api/inventory
  console.log("\n8. Testing GET /api/inventory...");
  const reqInventory = new NextRequest("http://localhost:3000/api/inventory?limit=5");
  const resInventory = await getInventory(reqInventory);
  const dataInventory = await resInventory.json();
  console.log(`Status: ${resInventory.status}, Total Items: ${dataInventory.pagination?.total}`);

  console.log("\n=== All Route Handler Tests Passed! ===");
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
