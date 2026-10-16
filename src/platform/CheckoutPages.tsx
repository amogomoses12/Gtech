import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FlaskConical,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useResource } from "./context";
import { post } from "./api";
import type { Order } from "./types";
import { money } from "./types";
import { ErrorState, FormError, Loading } from "./shared";

export function DevelopmentCheckout() {
  const { id } = useParams();
  const {
    data: order,
    loading,
    error,
    refresh,
  } = useResource<Order>(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const navigate = useNavigate();
  if (loading) return <Loading />;
  if (error || !order)
    return (
      <div className="public-container">
        <ErrorState message={error || "Order not found."} retry={refresh} />
      </div>
    );
  return (
    <div className="public-container checkout-page">
      <Link className="back-link" to={`/courses/${order.slug}`}>
        <ArrowLeft size={15} />
        Back to the course
      </Link>
      <div className="checkout-layout">
        <div>
          <span className="section-eyebrow">YOUR NEXT CHAPTER</span>
          <h1>
            A little investment
            <br />
            in what comes next.
          </h1>
          <p>You&apos;re one step away from your next lightbulb moment.</p>
          <ul className="checkout-benefits">
            <li>
              <Check size={17} />
              All course lessons and included materials
            </li>
            <li>
              <Check size={17} />
              Saved progress, at your own pace
            </li>
            <li>
              <Check size={17} />
              One payment. No subscription.
            </li>
          </ul>
          <div className="development-notice">
            <FlaskConical size={24} />
            <div>
              <strong>Development checkout</strong>
              <p>
                This is a local test purchase. No card details are requested and
                no money is charged. This checkout is disabled in production.
                Configure Stripe to test the real payment gateway.
              </p>
            </div>
          </div>
        </div>
        <section className="checkout-summary">
          <h2>Your course</h2>
          <span className="checkout-course-name">{order.course_title}</span>
          <div className="checkout-line">
            <span>Course access</span>
            <strong>{money(order.amount_cents)}</strong>
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <strong>
              {money(order.amount_cents)}
              <small>USD</small>
            </strong>
          </div>
          <FormError message={actionError} />
          {["paid", "test_paid"].includes(order.status) ? (
            <Link
              className="site-button primary"
              to={`/checkout/success?order_id=${order.id}`}
            >
              View completed order <ArrowRight size={15} />
            </Link>
          ) : order.status !== "pending" ? (
            <p>
              This order is {order.status}. Return to the course to start again.
            </p>
          ) : (
            <button
              className="site-button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setActionError("");
                try {
                  await post(`/orders/${order.id}/development-pay`);
                  navigate(`/checkout/success?order_id=${order.id}`, {
                    replace: true,
                  });
                } catch (err) {
                  setActionError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Completing test purchase..." : "Complete test purchase"}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="checkout-security">
            <LockKeyhole size={14} />
            Test mode only. No real payment.
          </p>
          <Link
            className="checkout-cancel"
            to={`/checkout/cancel?order_id=${order.id}`}
          >
            Cancel this order
          </Link>
        </section>
      </div>
    </div>
  );
}

export function CheckoutResult({ cancelled = false }: { cancelled?: boolean }) {
  const [params] = useSearchParams();
  const id = params.get("order_id");
  const {
    data: order,
    loading,
    error,
    refresh,
  } = useResource<Order>(`/orders/${id || "missing"}?verify=1`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const navigate = useNavigate();
  if (loading) return <Loading text="Checking your order securely..." />;
  if (error || !order)
    return (
      <div className="public-container">
        <ErrorState message={error || "Order not found."} retry={refresh} />
      </div>
    );
  const paid = ["paid", "test_paid"].includes(order.status);
  return (
    <div className="public-container checkout-result">
      <span className={`checkout-result-icon ${paid ? "is-paid" : ""}`}>
        {paid ? (
          <CheckCircle2 size={38} strokeWidth={1.5} />
        ) : (
          <ShieldCheck size={38} strokeWidth={1.5} />
        )}
      </span>
      <span className="section-eyebrow">
        {paid ? "A NEW CHAPTER IS OPEN" : "YOUR ORDER"}
      </span>
      <h1>
        {paid
          ? "Good things are ahead."
          : cancelled || order.status === "cancelled"
            ? "No rush. We will be here."
            : order.status === "pending"
              ? "Waiting for payment confirmation."
              : "Let's take another look."}
      </h1>
      <p>
        {paid
          ? `${order.course_title} is now in your learning space.`
          : order.status === "pending"
            ? "Access is granted only after the server verifies your payment. You can check again or return to the course."
            : `This order is ${order.status}. You can return to the course to start a new checkout.`}
      </p>
      {order.status === "test_paid" && (
        <div className="result-test-note">
          <FlaskConical size={17} />
          This was a test purchase. No money was charged.
        </div>
      )}
      <div className="order-reference">
        <span>Order reference</span>
        <strong>{order.id.slice(0, 8).toUpperCase()}</strong>
        <span>{money(order.amount_cents)}</span>
      </div>
      <FormError message={actionError} />
      <div className="result-actions">
        {paid ? (
          <>
            <Link to={`/courses/${order.slug}`} className="site-button primary">
              Start learning <ArrowRight size={17} />
            </Link>
            <Link
              to="/my-learning?tab=orders"
              className="site-button secondary"
            >
              View my purchases
            </Link>
          </>
        ) : (
          <>
            <Link to={`/courses/${order.slug}`} className="site-button primary">
              Back to the course <ArrowRight size={17} />
            </Link>
            {order.status === "pending" && (
              <button className="site-button secondary" onClick={refresh}>
                <RefreshCw size={15} />
                Check payment
              </button>
            )}
          </>
        )}
      </div>
      {cancelled && order.status === "pending" && (
        <button
          className="text-button cancel-confirm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await post(`/orders/${order.id}/cancel`);
              navigate(`/checkout/success?order_id=${order.id}`, {
                replace: true,
              });
              refresh();
            } catch (err) {
              setActionError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Cancelling..." : "Confirm cancellation"}
        </button>
      )}
    </div>
  );
}
