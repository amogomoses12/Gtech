import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const temp = await mkdtemp(path.join(tmpdir(), "gtech-stripe-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = path.join(temp, "stripe.sqlite");
process.env.UPLOAD_DIR = path.join(temp, "uploads");
process.env.STRIPE_SECRET_KEY = "sk_test_local_mock_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_mock_signing_secret";
const { createApp } = await import("./index.mjs");
const { db, run, one } = await import("./db.mjs");
const { hashPassword } = await import("./security.mjs");
const { stripe } = await import("./payments.mjs");
const password = "Stripe-Integration-Test-194!";
run(
  "INSERT INTO users(name,email,password_hash) VALUES (?,?,?)",
  "Test Learner",
  "stripe@test.example",
  await hashPassword(password),
);
const providerSessions = new Map();
let checkoutParameters;

// Provider network calls are mocked. The real Stripe SDK verifies signed webhook payloads.
stripe.checkout.sessions.create = async (parameters, options) => {
  checkoutParameters = parameters;
  assert.ok(options.idempotencyKey.startsWith("gtech-"));
  const session = {
    id: `cs_test_${parameters.metadata.orderId}`,
    url: "https://checkout.stripe.com/mock-test",
    payment_status: "unpaid",
    status: "open",
    metadata: parameters.metadata,
    amount_total: parameters.line_items[0].price_data.unit_amount,
    currency: "usd",
    livemode: false,
    payment_intent: `pi_${parameters.metadata.orderId}`,
  };
  providerSessions.set(session.id, session);
  return session;
};
stripe.checkout.sessions.retrieve = async (id) => {
  const session = providerSessions.get(id);
  if (!session) throw new Error("Unknown test session");
  return session;
};
stripe.checkout.sessions.expire = async (id) => {
  const session = providerSessions.get(id);
  session.status = "expired";
  return session;
};
const server = await new Promise((resolve) => {
  const instance = createApp().listen(0, "127.0.0.1", () => resolve(instance));
});
const base = `http://127.0.0.1:${server.address().port}/api`;
let cookie, csrf, order, session;
async function request(route, method = "GET", body) {
  const response = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Gtech-Request": "1",
      ...(cookie ? { Cookie: cookie, "X-CSRF-Token": csrf } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (data.csrfToken) {
    csrf = data.csrfToken;
    cookie = response.headers.get("set-cookie").split(";")[0];
  }
  return { response, data };
}
async function sendEvent(
  id,
  type,
  object,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  const response = await fetch(base + "/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
  return { response, data: await response.json() };
}
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(temp, { recursive: true, force: true });
});

test("Stripe checkout is created using authoritative order data", async () => {
  await request("/auth/login", "POST", {
    email: "stripe@test.example",
    password,
  });
  const result = await request("/checkout", "POST", {
    course_id: 2,
    amount_cents: 1,
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.provider, "stripe");
  order = one("SELECT * FROM orders WHERE id=?", result.data.order_id);
  session = providerSessions.get(order.stripe_session_id);
  assert.equal(order.amount_cents, 1900);
  assert.equal(checkoutParameters.line_items[0].price_data.unit_amount, 1900);
  assert.equal(checkoutParameters.metadata.userId, "1");
});
test("webhook signature tampering is rejected without fulfillment", async () => {
  const result = await sendEvent(
    "evt_invalid",
    "checkout.session.completed",
    { id: session.id },
    "whsec_wrong_secret",
  );
  assert.equal(result.response.status, 400);
  assert.equal(
    one("SELECT status FROM orders WHERE id=?", order.id).status,
    "pending",
  );
});
test("a signed completed but unpaid session cannot unlock a course", async () => {
  const result = await sendEvent("evt_unpaid", "checkout.session.completed", {
    id: session.id,
  });
  assert.equal(result.response.status, 200);
  assert.equal(
    one("SELECT status FROM orders WHERE id=?", order.id).status,
    "pending",
  );
  assert.equal(
    one("SELECT 1 FROM enrollments WHERE user_id=1 AND course_id=2"),
    undefined,
  );
});
test("delayed signed payment success fulfills exactly once", async () => {
  session.payment_status = "paid";
  session.status = "complete";
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await sendEvent(
          "evt_paid",
          "checkout.session.async_payment_succeeded",
          { id: session.id },
        )
      ).response.status,
      200,
    );
  assert.equal(
    one("SELECT status FROM orders WHERE id=?", order.id).status,
    "test_paid",
  );
  assert.equal(
    one("SELECT COUNT(*) AS n FROM enrollments WHERE user_id=1 AND course_id=2")
      .n,
    1,
  );
  assert.equal(
    one("SELECT COUNT(*) AS n FROM payment_events WHERE id='evt_paid'").n,
    1,
  );
});
test("a verified full refund revokes paid access and preserves records", async () => {
  const result = await sendEvent("evt_refund", "charge.refunded", {
    payment_intent: session.payment_intent,
    refunded: true,
  });
  assert.equal(result.response.status, 200);
  assert.equal(
    one("SELECT status FROM orders WHERE id=?", order.id).status,
    "refunded",
  );
  assert.equal(
    one("SELECT 1 FROM enrollments WHERE user_id=1 AND course_id=2"),
    undefined,
  );
  await sendEvent("evt_paid_after_refund", "checkout.session.completed", {
    id: session.id,
  });
  assert.equal(
    one("SELECT status FROM orders WHERE id=?", order.id).status,
    "refunded",
  );
});
test("production configuration always disables simulated payments", async () => {
  const execute = promisify(execFile);
  const result = await execute(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import { config } from './server/config.mjs'; console.log(JSON.stringify({devPayments:config.devPayments,secure:config.secureCookie}));",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        PUBLIC_URL: "https://gtech.example",
        ENABLE_DEV_CHECKOUT: "true",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      },
    },
  );
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    devPayments: false,
    secure: true,
  });
});
