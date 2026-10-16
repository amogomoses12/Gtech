import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { db, one, run, activity } from "./db.mjs";
import { config, production } from "./config.mjs";
import { HttpError, requireUser } from "./security.mjs";
import { z } from "zod";

export const stripe = config.stripeSecret
  ? new Stripe(config.stripeSecret, { maxNetworkRetries: 2, timeout: 15000 })
  : null;
export const paymentConfig = () => ({
  provider: stripe
    ? "stripe"
    : config.devPayments
      ? "development"
      : "unavailable",
  mode: stripe
    ? config.stripeSecret.startsWith("sk_live_")
      ? "live"
      : "test"
    : "test",
  currency: "USD",
});

// The price and ownership are always verified against our immutable order, never the browser.
export function fulfillSession(session) {
  if (session.payment_status !== "paid") return;
  db.transaction(() => {
    const order = one(
      "SELECT * FROM orders WHERE id=?",
      session.metadata?.orderId || "",
    );
    if (
      !order ||
      order.provider !== "stripe" ||
      order.stripe_session_id !== session.id ||
      String(order.user_id) !== session.metadata?.userId ||
      String(order.course_id) !== session.metadata?.courseId ||
      order.amount_cents !== session.amount_total ||
      order.currency !== session.currency ||
      (order.payment_mode === "live") !== Boolean(session.livemode)
    )
      throw new HttpError(400, "Payment does not match its order.");
    if (["paid", "test_paid", "refunded"].includes(order.status)) return;
    const status = session.livemode ? "paid" : "test_paid";
    run(
      "UPDATE orders SET status=?,paid_at=datetime('now'),payment_intent_id=? WHERE id=?",
      status,
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null,
      order.id,
    );
    run(
      "INSERT OR IGNORE INTO enrollments(user_id,course_id,source) VALUES (?,?,?)",
      order.user_id,
      order.course_id,
      session.livemode ? "stripe" : "stripe_test",
    );
    activity(
      order.user_id,
      session.livemode ? "purchased" : "completed a test purchase of",
      order.course_title,
    );
  })();
}

export async function webhook(req, res, next) {
  if (!stripe || !config.stripeWebhook)
    return res
      .status(503)
      .json({ error: "Stripe webhooks are not configured." });
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      config.stripeWebhook,
    );
  } catch {
    return res.status(400).json({ error: "Invalid webhook signature." });
  }
  try {
    if (one("SELECT 1 FROM payment_events WHERE id=?", event.id))
      return res.json({ received: true });
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    ) {
      const session = await stripe.checkout.sessions.retrieve(
        event.data.object.id,
      );
      fulfillSession(session);
    } else if (
      [
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
      ].includes(event.type)
    ) {
      run(
        "UPDATE orders SET status=? WHERE stripe_session_id=? AND status='pending'",
        event.type.endsWith("expired") ? "cancelled" : "failed",
        event.data.object.id,
      );
    } else if (event.type === "charge.refunded" && event.data.object.refunded) {
      db.transaction(() => {
        const order = one(
          "SELECT * FROM orders WHERE payment_intent_id=?",
          event.data.object.payment_intent,
        );
        if (!order) return;
        run("UPDATE orders SET status='refunded' WHERE id=?", order.id);
        const other = one(
          "SELECT 1 FROM orders WHERE user_id=? AND course_id=? AND status IN ('paid','test_paid') AND id<>?",
          order.user_id,
          order.course_id,
          order.id,
        );
        if (!other)
          run(
            "DELETE FROM enrollments WHERE user_id=? AND course_id=? AND source IN ('stripe','stripe_test')",
            order.user_id,
            order.course_id,
          );
        activity(
          order.user_id,
          "received a full refund for",
          order.course_title,
        );
      })();
    }
    run(
      "INSERT OR IGNORE INTO payment_events(id,type) VALUES (?,?)",
      event.id,
      event.type,
    );
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}

export function paymentRoutes(app) {
  app.post("/api/checkout", requireUser, async (req, res) => {
    const { course_id } = z
      .object({ course_id: z.number().int().positive() })
      .parse(req.body);
    const course = one(
      "SELECT * FROM courses WHERE id=? AND published=1",
      course_id,
    );
    if (!course) throw new HttpError(404, "Course not found.");
    if (
      one(
        "SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?",
        req.user.id,
        course.id,
      )
    )
      throw new HttpError(409, "You already have access to this course.");
    if (!course.price_cents)
      throw new HttpError(
        400,
        "This course is free. Use the enrollment button.",
      );
    if (!stripe && !config.devPayments)
      throw new HttpError(
        503,
        "Paid enrollments are not available yet. Please contact Gtech.",
      );
    const provider = paymentConfig();
    let order = one(
      "SELECT * FROM orders WHERE user_id=? AND course_id=? AND status='pending' AND provider=? AND amount_cents=? AND created_at>datetime('now','-30 minutes') ORDER BY created_at DESC LIMIT 1",
      req.user.id,
      course.id,
      provider.provider,
      course.price_cents,
    );
    if (!order) {
      const id = randomUUID();
      run(
        "INSERT INTO orders(id,user_id,course_id,course_title,amount_cents,provider,payment_mode) VALUES (?,?,?,?,?,?,?)",
        id,
        req.user.id,
        course.id,
        course.title,
        course.price_cents,
        provider.provider,
        provider.mode,
      );
      order = one("SELECT * FROM orders WHERE id=?", id);
    }
    if (!stripe)
      return res.json({
        url: `/checkout/development/${order.id}`,
        order_id: order.id,
        provider: "development",
      });
    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: req.user.email,
          client_reference_id: String(req.user.id),
          line_items: [
            {
              price_data: {
                currency: "usd",
                unit_amount: order.amount_cents,
                product_data: {
                  name: course.title,
                  description: course.summary,
                },
              },
              quantity: 1,
            },
          ],
          metadata: {
            orderId: order.id,
            userId: String(req.user.id),
            courseId: String(course.id),
          },
          payment_intent_data: { metadata: { orderId: order.id } },
          success_url: `${config.publicUrl}/checkout/success?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.publicUrl}/checkout/cancel?order_id=${order.id}`,
        },
        { idempotencyKey: `gtech-${order.id}` },
      );
      run(
        "UPDATE orders SET stripe_session_id=? WHERE id=?",
        session.id,
        order.id,
      );
      res.json({ url: session.url, order_id: order.id, provider: "stripe" });
    } catch (error) {
      console.error("Stripe session creation failed:", error.message);
      throw new HttpError(
        502,
        "Checkout could not be started. Please try again shortly.",
      );
    }
  });
  app.get("/api/orders/:id", requireUser, async (req, res) => {
    let order = one(
      "SELECT o.*,c.slug FROM orders o JOIN courses c ON c.id=o.course_id WHERE o.id=? AND o.user_id=?",
      req.params.id,
      req.user.id,
    );
    if (!order) throw new HttpError(404, "Order not found.");
    if (
      req.query.verify === "1" &&
      order.stripe_session_id &&
      stripe &&
      order.status === "pending"
    ) {
      try {
        fulfillSession(
          await stripe.checkout.sessions.retrieve(order.stripe_session_id),
        );
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(
          502,
          "Payment verification is temporarily unavailable. Please try again.",
        );
      }
      order = one(
        "SELECT o.*,c.slug FROM orders o JOIN courses c ON c.id=o.course_id WHERE o.id=?",
        order.id,
      );
    }
    res.json(order);
  });
  app.post("/api/orders/:id/development-pay", requireUser, (req, res) => {
    if (production || !config.devPayments)
      throw new HttpError(403, "Development payments are disabled.");
    const order = one(
      "SELECT * FROM orders WHERE id=? AND user_id=?",
      req.params.id,
      req.user.id,
    );
    if (!order || order.provider !== "development")
      throw new HttpError(404, "Development order not found.");
    if (!["pending", "test_paid"].includes(order.status))
      throw new HttpError(409, "This order cannot be completed.");
    db.transaction(() => {
      if (order.status === "test_paid") return;
      run(
        "UPDATE orders SET status='test_paid',paid_at=datetime('now') WHERE id=?",
        order.id,
      );
      run(
        "INSERT OR IGNORE INTO enrollments(user_id,course_id,source) VALUES (?,?,?)",
        req.user.id,
        order.course_id,
        "development",
      );
      activity(
        req.user.id,
        "completed a development purchase of",
        order.course_title,
      );
    })();
    res.json({ success: true, order_id: order.id });
  });
  app.post("/api/orders/:id/cancel", requireUser, async (req, res) => {
    const order = one(
      "SELECT * FROM orders WHERE id=? AND user_id=?",
      req.params.id,
      req.user.id,
    );
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.status !== "pending")
      throw new HttpError(409, "This order is no longer pending.");
    if (order.provider === "stripe" && stripe && order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        order.stripe_session_id,
      );
      if (session.payment_status === "paid") {
        fulfillSession(session);
        return res.json({ status: "paid" });
      }
      if (session.status === "open")
        await stripe.checkout.sessions.expire(session.id);
      else if (session.status === "complete")
        throw new HttpError(409, "Your payment is still processing.");
    }
    run(
      "UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'",
      order.id,
    );
    res.json({ status: "cancelled" });
  });
}
