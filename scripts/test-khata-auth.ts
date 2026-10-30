/* End-to-end API tests for Khata ledger + permanent customer IDs.
 * Run: node --import tsx scripts/test-khata-auth.ts  (server must be on :3001)
 */
const BASE = 'http://localhost:3001';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name} ${detail}`);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

interface Client {
  cookie: string;
  user: { id: number; email: string; customerCode: string; name: string; role: string } | null;
}

async function req(
  c: Client,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(c.cookie ? { Cookie: c.cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/pashufeed_session=([^;]+)/);
  if (match) c.cookie = `pashufeed_session=${match[1]}`;
  let json: any = {};
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function register(
  c: Client,
  input: { email?: string; password: string; name: string; village?: string }
): Promise<number> {
  const r = await req(c, 'POST', '/api/auth/register', input);
  if (r.json.user) c.user = r.json.user;
  return r.status;
}

async function login(c: Client, identifier: string, password: string): Promise<number> {
  const r = await req(c, 'POST', '/api/auth/login', { identifier, password });
  if (r.json.user) c.user = r.json.user;
  return r.status;
}

async function main(): Promise<void> {
  console.log('\n== 1. Permanent customer IDs ==');
  const stamp = Date.now();

  const alice = { cookie: '', user: null } as Client;
  const s1 = await register(alice, { password: 'Test@1234', name: `Alice Test ${stamp}`, village: 'Pachani' });
  ok('register without email succeeds', s1 === 200 && !!alice.user, `status=${s1}`);
  ok('customer code generated (HT-CUS-*)', /^HT-CUS-\d+$/.test(alice.user?.customerCode ?? ''), alice.user?.customerCode);

  const aliceCode = alice.user!.customerCode;

  const alice2 = { cookie: '', user: null } as Client;
  const s2 = await login(alice2, aliceCode, 'Test@1234');
  ok('login with permanent customer ID', s2 === 200 && alice2.user?.customerCode === aliceCode, `status=${s2}`);

  const alice3 = { cookie: '', user: null } as Client;
  const s2b = await login(alice3, aliceCode.toLowerCase(), 'Test@1234');
  ok('login is case-insensitive on the ID', s2b === 200, `status=${s2b}`);

  const bob = { cookie: '', user: null } as Client;
  const s3 = await register(bob, { email: `bob${stamp}@test.dev`, password: 'Test@1234', name: `Bob Test ${stamp}` });
  ok('register WITH email succeeds', s3 === 200 && !!bob.user?.email, `status=${s3}`);
  ok('bob got a different code', bob.user?.customerCode !== aliceCode);

  const dupEmail = { cookie: '', user: null } as Client;
  const s4 = await register(dupEmail, { email: `bob${stamp}@test.dev`, password: 'Test@1234', name: 'Dup' });
  ok('duplicate email rejected 409', s4 === 409, `status=${s4}`);

  const badLogin = { cookie: '', user: null } as Client;
  const s5 = await login(badLogin, aliceCode, 'wrong-password');
  ok('wrong password rejected 401', s5 === 401, `status=${s5}`);

  // Admin seeded account
  const admin = { cookie: '', user: null } as Client;
  const s6 = await login(admin, 'admin@pashufeed.test', 'Admin@12345');
  ok('admin login by email still works', s6 === 200 && admin.user?.role === 'admin', `status=${s6}`);
  ok('admin also has a customer code', /^HT-CUS-\d+$/.test(admin.user?.customerCode ?? ''));

  const adminCode = admin.user!.customerCode;
  const admin2 = { cookie: '', user: null } as Client;
  const s7 = await login(admin2, adminCode, 'Admin@12345');
  ok('admin can log in by customer ID too', s7 === 200, `status=${s7}`);

  console.log('\n== 2. Khata request + approval workflow ==');
  // Alice has no khata yet
  let r = await req(alice, 'GET', '/api/khata');
  ok('customer with no khata sees empty list', r.status === 200 && r.json.accounts.length === 0);

  r = await req(alice, 'POST', '/api/khata/request', { phone: '9876543210', requestedLimit: 0, consent: false });
  ok('request without consent rejected', r.status === 400, `status=${r.status}`);

  r = await req(alice, 'POST', '/api/khata/request', { phone: 'not-a-phone', requestedLimit: 0, consent: true });
  ok('request with bad phone rejected', r.status === 400, `status=${r.status}`);

  r = await req(alice, 'POST', '/api/khata/request', { phone: '9876543210', requestedLimit: 8000, consent: true });
  ok('valid khata request created (201)', r.status === 201, `status=${r.status} ${JSON.stringify(r.json)}`);
  const khtId = r.json.accountId as string;

  r = await req(alice, 'POST', '/api/khata/request', { phone: '9876543210', requestedLimit: 8000, consent: true });
  ok('duplicate request rejected 409', r.status === 409, `status=${r.status}`);

  // Customer cannot see the admin queue or approve
  r = await req(alice, 'GET', '/api/khata?status=Pending');
  ok('customer status filter ignored (own account only)', r.status === 200 && r.json.accounts.length === 1);

  r = await req(alice, 'POST', `/api/khata/${khtId}/decision`, { decision: 'approve', creditLimit: 5000 });
  ok('customer cannot approve own request (403)', r.status === 403, `status=${r.status}`);

  // Admin sees the pending request
  r = await req(admin, 'GET', '/api/khata?status=Pending');
  ok('admin pending queue contains the request', r.status === 200 && r.json.accounts.some((a: any) => a.id === khtId));
  ok('pending account shows requested limit', r.json.accounts.find((a: any) => a.id === khtId)?.requestedLimit === 8000);

  // Reject first, then re-request, then approve — full round trip
  r = await req(admin, 'POST', `/api/khata/${khtId}/decision`, { decision: 'reject' });
  ok('reject without reason rejected', r.status === 400, `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/decision`, { decision: 'reject', reason: 'No milk union record' });
  ok('admin can reject with reason', r.status === 200 && r.json.account.status === 'Rejected', `status=${r.status}`);

  r = await req(alice, 'GET', '/api/khata');
  ok('customer sees Rejected status + reason', r.json.accounts[0]?.status === 'Rejected' && r.json.accounts[0]?.rejectionReason === 'No milk union record');

  r = await req(alice, 'POST', '/api/khata/request', { phone: '9876543210', requestedLimit: 8000, consent: true });
  ok('rejected customer can re-request (same row flips to Pending)', r.status === 200 && r.json.accountId === khtId, `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/decision`, { decision: 'approve', creditLimit: 8000 });
  ok('admin approves with limit', r.status === 200 && r.json.account.status === 'Approved' && r.json.account.totalCreditLimit === 8000, JSON.stringify(r.json.account ?? r.json));

  r = await req(admin, 'POST', `/api/khata/${khtId}/decision`, { decision: 'approve' });
  ok('deciding twice rejected (not pending)', r.status === 409, `status=${r.status}`);

  // Now alice's account is Approved with limit 8000
  r = await req(alice, 'GET', '/api/khata');
  const aliceAcct = r.json.accounts[0];
  ok('customer sees approved account', aliceAcct?.status === 'Approved' && aliceAcct?.totalCreditLimit === 8000);
  ok('available credit = full limit initially', aliceAcct?.availableCredit === 8000, `got ${aliceAcct?.availableCredit}`);

  console.log('\n== 3. Credit purchases ==');
  // Get a product variant to buy
  const prodRes = await fetch(`${BASE}/api/products`);
  const prodJson = await prodRes.json();
  const product = prodJson.products.find((p: any) => (p.weightOptions ?? []).some((w: any) => w.stock > 10 && w.price < 2000));
  const variant = product.weightOptions.find((w: any) => w.stock > 10 && w.price < 2000);
  ok('found a test product variant', !!product && !!variant, JSON.stringify(product?.id));

  const addr = { fullName: 'Alice Test', phone: '9876543210', villageTown: 'Pachani', talukaDistrict: 'Kagal', state: 'Maharashtra', pincode: '416001', landmark: '' };

  // Pending-bypass: use a second customer with pending khata later. For now purchase.
  const qty = 1;
  const expectedLine = variant.price * qty;
  r = await req(alice, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: qty }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  const order1 = r.json.order;
  const total1 = order1?.totalAmount;
  ok('approved customer can buy on Khata Credit', r.status === 201, `status=${r.status} ${JSON.stringify(r.json)}`);
  ok('order marked Khata Due', order1?.paymentStatus === 'Khata Due');

  r = await req(alice, 'GET', '/api/khata');
  let acct = r.json.accounts[0];
  ok('balance increased by order total', acct?.totalOutstanding === total1, `outstanding=${acct?.totalOutstanding} total=${total1}`);
  ok('available credit decreased', acct?.availableCredit === Math.round((8000 - total1) * 100) / 100);
  ok('purchase total tracked', acct?.purchaseTotal === total1);

  r = await req(alice, 'GET', `/api/khata/${khtId}`);
  const txs = r.json.account.transactions;
  ok('ledger has the purchase entry', txs?.some((t: any) => t.type === 'Purchase' && t.amount === total1 && t.orderNumber === order1.orderNumber));
  ok('entry links the order number', txs?.[0]?.orderNumber === order1.orderNumber);

  // Over-limit purchase rejected
  const expensive = prodJson.products.flatMap((p: any) => (p.weightOptions ?? []).map((w: any) => ({ p, w }))).filter((x: any) => x.w.stock > 0).sort((a: any, b: any) => b.w.price - a.w.price)[0];
  const qtyForOverLimit = Math.min(expensive.w.stock, Math.ceil((8000 - total1 + 1) / expensive.w.price) + 1);
  r = await req(alice, 'POST', '/api/orders', {
    items: [{ productId: expensive.p.id, weightKg: expensive.w.weightKg, quantity: qtyForOverLimit }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  ok('over-limit purchase rejected 409', r.status === 409 && r.json.error === 'CREDIT_LIMIT_EXCEEDED', `status=${r.status} ${r.json.error}`);

  // Second small purchase
  r = await req(alice, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  const total2 = r.json.order?.totalAmount;
  ok('second credit purchase succeeds', r.status === 201);
  r = await req(alice, 'GET', '/api/khata');
  acct = r.json.accounts[0];
  ok('balance = total1 + total2', acct?.totalOutstanding === Math.round((total1 + total2) * 100) / 100, `got ${acct?.totalOutstanding}`);

  console.log('\n== 4. Payments ==');
  const payAmount = 1000;
  r = await req(alice, 'POST', `/api/khata/${khtId}/payment`, { amount: payAmount });
  ok('customer cannot record own payment (403)', r.status === 403, `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/payment`, { amount: 999999, paymentMethod: 'UPI' });
  ok('overpayment rejected 409', r.status === 409 && r.json.error === 'OVERPAYMENT', `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/payment`, { amount: payAmount, paymentMethod: 'UPI', notes: 'Milk payment' });
  ok('admin records payment', r.status === 200, `status=${r.status}`);
  r = await req(alice, 'GET', '/api/khata');
  acct = r.json.accounts[0];
  ok('balance reduced by payment', acct?.totalOutstanding === Math.round((total1 + total2 - payAmount) * 100) / 100, `got ${acct?.totalOutstanding}`);
  ok('payments total tracked', acct?.paidAmount === payAmount);

  r = await req(alice, 'GET', `/api/khata/${khtId}`);
  ok(
    'payment method stored on entry',
    r.json.account.transactions?.some((t: any) => t.type === 'Payment' && t.paymentMethod === 'UPI'),
    JSON.stringify(r.json.account.transactions?.slice(0, 3))
  );

  console.log('\n== 5. Reversal / adjustment ==');
  r = await req(alice, 'GET', `/api/khata/${khtId}`);
  const purchaseTx = r.json.account.transactions.find((t: any) => t.type === 'Purchase');
  const entryId = purchaseTx.id;

  r = await req(alice, 'POST', `/api/khata/${khtId}/entries/${entryId}/reverse`, { reason: 'test' });
  ok('customer cannot reverse entries (403)', r.status === 403, `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/entries/${entryId}/reverse`, { reason: '' });
  ok('reversal without reason rejected', r.status === 400, `status=${r.status}`);

  const beforeReverse = acct!.totalOutstanding;
  r = await req(admin, 'POST', `/api/khata/${khtId}/entries/${entryId}/reverse`, { reason: 'Wrong order charged' });
  ok('admin reverses a purchase entry', r.status === 200, `status=${r.status} ${JSON.stringify(r.json)}`);
  r = await req(alice, 'GET', '/api/khata');
  acct = r.json.accounts[0];
  ok('balance reduced by reversal', acct?.totalOutstanding === Math.round((beforeReverse - purchaseTx.amount) * 100) / 100, `got ${acct?.totalOutstanding} expected ${beforeReverse - purchaseTx.amount}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/entries/${entryId}/reverse`, { reason: 'again' });
  ok('double reversal blocked 409', r.status === 409 && r.json.error === 'ALREADY_REVERSED', `status=${r.status}`);

  r = await req(alice, 'GET', `/api/khata/${khtId}`);
  ok('adjustment links back to original', r.json.account.transactions.some((t: any) => t.type === 'Adjustment' && t.reversesEntryId === entryId));

  console.log('\n== 6. Order cancellation reverses the ledger ==');
  r = await req(alice, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  const cancelOrder = r.json.order;
  ok('third credit purchase succeeds', r.status === 201);
  r = await req(alice, 'GET', '/api/khata');
  const beforeCancel = r.json.accounts[0].totalOutstanding;

  r = await req(alice, 'PATCH', `/api/orders/${cancelOrder.id.replace('ord-', '')}/status`, { status: 'Cancelled' });
  ok('customer cannot cancel via API (403)', r.status === 403, `status=${r.status}`);

  r = await req(admin, 'PATCH', `/api/orders/${cancelOrder.id.replace('ord-', '')}/status`, { status: 'Cancelled' });
  ok('admin cancels order', r.status === 200 && r.json.order.status === 'Cancelled', `status=${r.status}`);

  r = await req(alice, 'GET', '/api/khata');
  acct = r.json.accounts[0];
  ok('cancellation wrote a reversing adjustment', acct?.totalOutstanding === Math.round((beforeCancel - cancelOrder.totalAmount) * 100) / 100, `got ${acct?.totalOutstanding} expected ${beforeCancel - cancelOrder.totalAmount}`);

  r = await req(admin, 'PATCH', `/api/orders/${cancelOrder.id.replace('ord-', '')}/status`, { status: 'Delivered' });
  ok('cancelled order cannot be reopened', r.status === 409 && r.json.error === 'ALREADY_CANCELLED', `status=${r.status}`);

  console.log('\n== 7. Suspend / reactivate / close ==');
  r = await req(admin, 'POST', `/api/khata/${khtId}/status`, { status: 'Suspended' });
  ok('suspend without reason rejected', r.status === 400, `status=${r.status}`);
  r = await req(admin, 'POST', `/api/khata/${khtId}/status`, { status: 'Suspended', reason: 'Late payment' });
  ok('admin suspends with reason', r.status === 200 && r.json.account.status === 'Suspended', `status=${r.status}`);

  r = await req(alice, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  ok('suspended account cannot buy on credit', r.status === 403 && r.json.error === 'KHATA_NOT_APPROVED', `status=${r.status} ${r.json.error}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/status`, { status: 'Closed' });
  ok('cannot close with balance due', r.status === 409 && r.json.error === 'BALANCE_DUE', `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/status`, { status: 'Approved' });
  ok('admin reactivates', r.status === 200 && r.json.account.status === 'Approved');

  // Settle the balance fully, then close
  r = await req(alice, 'GET', '/api/khata');
  const full = r.json.accounts[0].totalOutstanding;
  if (full > 0) {
    r = await req(admin, 'POST', `/api/khata/${khtId}/payment`, { amount: full, paymentMethod: 'Cash' });
    ok('full settlement accepted', r.status === 200, `status=${r.status}`);
  }
  r = await req(admin, 'POST', `/api/khata/${khtId}/status`, { status: 'Closed', reason: 'Account settled and closed at customer request' });
  ok('close allowed once settled', r.status === 200 && r.json.account.status === 'Closed', `status=${r.status}`);

  r = await req(admin, 'POST', `/api/khata/${khtId}/payment`, { amount: 100 });
  ok('payments blocked on closed account', r.status === 409 && r.json.error === 'ACCOUNT_NOT_ACTIVE', `status=${r.status}`);

  console.log('\n== 8. Admin-created Khata for existing customer ==');
  r = await req(admin, 'GET', `/api/khata/customers/search?q=${encodeURIComponent(`Bob Test ${stamp}`)}`);
  ok('customer search finds Bob', r.status === 200 && r.json.customers.some((c: any) => c.id === bob.user?.id), JSON.stringify(r.json));
  const bobId = r.json.customers.find((c: any) => c.id === bob.user?.id)?.id;

  r = await req(admin, 'POST', '/api/khata', { userId: bobId, phone: '9111111111', creditLimit: 15000 });
  ok('admin creates khata for Bob (Approved immediately)', r.status === 201 && r.json.account.status === 'Approved' && r.json.account.totalCreditLimit === 15000, `status=${r.status} ${JSON.stringify(r.json)}`);

  r = await req(admin, 'POST', '/api/khata', { userId: bobId, phone: '9111111111', creditLimit: 5000 });
  ok('duplicate khata for same customer rejected 409', r.status === 409 && r.json.error === 'ALREADY_LINKED', `status=${r.status}`);

  r = await req(bob, 'GET', '/api/khata');
  ok('Bob sees his admin-created account', r.json.accounts.length === 1 && r.json.accounts[0].status === 'Approved');

  // Bob buys on credit — POS-style with customerUserId from admin session
  r = await req(admin, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: { fullName: 'Bob Test', phone: '9111111111', villageTown: 'Testvillage', talukaDistrict: 'Kagal', state: 'Maharashtra', pincode: '', landmark: 'Counter' },
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
    customerUserId: bobId,
  });
  ok('staff can place a Khata order for a customer', r.status === 201, `status=${r.status} ${JSON.stringify(r.json.message ?? '')}`);
  const bobOrderTotal = r.json.order?.totalAmount;
  r = await req(bob, 'GET', '/api/khata');
  ok('charge landed on BOB ledger', r.json.accounts[0].totalOutstanding === bobOrderTotal, `got ${r.json.accounts[0].totalOutstanding} expected ${bobOrderTotal}`);

  // A customer cannot direct their order onto someone else's account
  const carol = { cookie: '', user: null } as Client;
  await register(carol, { password: 'Test@1234', name: `Carol ${stamp}` });
  r = await req(carol, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: addr,
    paymentMethod: 'Cash on Delivery',
    deliveryType: 'Store Pickup',
    customerUserId: bobId,
  });
  ok('customer cannot place order for another user (403)', r.status === 403, `status=${r.status}`);

  console.log('\n== 9. Cross-account access ==');
  const dave = { cookie: '', user: null } as Client;
  const daveReg = await register(dave, { password: 'Test@1234', name: `Dave ${stamp}` });
  if (!dave.user) {
    // Registration rate limit (10/hour/IP) — restart the API to reset it.
    ok('Dave registered', false, `status=${daveReg} (rate limited?)`);
    throw new Error('Cannot continue: Dave failed to register (likely rate-limited).');
  }
  r = await req(dave, 'GET', `/api/khata/${khtId}`);
  ok("customer cannot read another's ledger (404)", r.status === 404, `status=${r.status}`);
  r = await req(dave, 'GET', '/api/khata');
  ok('customer list contains only their own (empty)', r.json.accounts.length === 0);
  r = await req(dave, 'POST', '/api/khata', { userId: bobId, phone: '9999999999', creditLimit: 1 });
  ok('customer cannot create khata accounts (403)', r.status === 403, `status=${r.status}`);
  r = await req(dave, 'GET', '/api/khata/customers/search?q=bob');
  ok('customer search forbidden (403)', r.status === 403, `status=${r.status}`);

  console.log('\n== 10. Pending account cannot purchase ==');
  const eve = { cookie: '', user: null } as Client;
  await register(eve, { password: 'Test@1234', name: `Eve ${stamp}` });
  r = await req(eve, 'POST', '/api/khata/request', { phone: '9222222222', requestedLimit: 20000, consent: true });
  ok('Eve requests khata', r.status === 201);
  r = await req(eve, 'POST', '/api/orders', {
    items: [{ productId: product.id, weightKg: variant.weightKg, quantity: 1 }],
    shippingAddress: addr,
    paymentMethod: 'Khata Credit',
    deliveryType: 'Store Pickup',
  });
  ok('pending account cannot buy on credit', r.status === 403 && r.json.error === 'KHATA_NOT_APPROVED', `status=${r.status} ${r.json.error}`);

  console.log('\n== 11. Idempotent purchase entry ==');
  // Unique (order_id, entry_type) is enforced in the DB; simulate a retry by
  // checking there is exactly ONE purchase entry for each khata order.
  r = await req(alice, 'GET', `/api/khata/${khtId}`);
  const purchaseCount = r.json.account.transactions.filter((t: any) => t.type === 'Purchase').length;
  // 3 purchases, 1 reversed (the reversal is an Adjustment, not a Purchase)
  ok('exactly one Purchase entry per order (no duplicates)', purchaseCount === 3, `count=${purchaseCount}`);

  console.log(`\n===== ${passed} passed, ${failed} failed =====`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(` - ${f}`);
  }
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error('Test run crashed:', e);
  process.exitCode = 1;
});
