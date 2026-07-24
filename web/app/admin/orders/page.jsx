"use client";

import { Fragment, useEffect, useState } from "react";
import { getOrders, updateOrderStatus } from "@/lib/api";

// Color-coded payment status badge. `payment_status` is a field the
// concurrent Phase-2 payments backend work is adding to Order right now —
// render defensively so this page works whether that's landed yet or not.
const PAYMENT_BADGE_STYLES = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  unpaid: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-stone-200 text-stone-700",
};

function PaymentBadge({ status }) {
  if (!status) return <span className="text-stone-300">—</span>;
  const style = PAYMENT_BADGE_STYLES[status] || "bg-stone-200 text-stone-700";
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-[10px] uppercase tracking-widest ${style}`}>
      {status}
    </span>
  );
}

// The order's fulfillment pipeline, in sequence. "Cancelled" is deliberately
// not part of this list - it's a separate escape hatch handled on its own,
// not a stage you pass through on the way to somewhere else.
const ORDER_STAGES = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "review_received", label: "Review Received" },
];

const STAGE_LABELS = Object.fromEntries(ORDER_STAGES.map((s) => [s.value, s.label]));

/**
 * Clickable step-by-step tracker for a single order: click any stage to set
 * the order straight to it. A single ordered `status` field (rather than
 * independent checkboxes per stage) means the order can never end up in a
 * nonsensical combination like "delivered" without "dispatched" - clicking a
 * stage just sets that as the current one, and everything before it reads as
 * done.
 */
function OrderStatusStepper({ order, isUpdating, onChangeStatus }) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-block px-2 py-1 rounded-full text-[10px] uppercase tracking-widest bg-red-100 text-red-800">
          Cancelled
        </span>
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onChangeStatus("confirmed")}
          className="text-xs text-stone-500 underline hover:text-stone-800 disabled:opacity-50"
        >
          Reopen order
        </button>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.findIndex((s) => s.value === order.status);

  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {ORDER_STAGES.map((stage, index) => {
        const isDone = index <= currentIndex;
        return (
          <div key={stage.value} className="flex items-center">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onChangeStatus(stage.value)}
              aria-current={index === currentIndex}
              title={stage.label}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors disabled:opacity-50 ${
                isDone
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              <span aria-hidden="true">{isDone ? "✓" : "○"}</span>
              {stage.label}
            </button>
            {index < ORDER_STAGES.length - 1 && (
              <span className="w-4 h-px bg-stone-200 mx-1" aria-hidden="true" />
            )}
          </div>
        );
      })}
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => {
          if (window.confirm("Mark this order as cancelled?")) onChangeStatus("cancelled");
        }}
        className="ml-4 text-xs text-red-600 underline hover:text-red-800 disabled:opacity-50"
      >
        Cancel order
      </button>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusChange = async (order, newStatus) => {
    const previousStatus = order.status;
    // Optimistic update, same pattern as the in-stock toggle on the products
    // page - rolled back if the request fails.
    setOrders((current) =>
      current.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, newStatus);
    } catch (err) {
      console.error("Failed to update order status:", err);
      setOrders((current) =>
        current.map((o) => (o.id === order.id ? { ...o, status: previousStatus } : o))
      );
      alert("Could not update this order's status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrders();
        if (!cancelled) setOrders(Array.isArray(data) ? data : data?.results ?? []);
      } catch (err) {
        console.error("Failed to load orders:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <p className="text-sm text-stone-400">Loading orders…</p>;
  if (loadError) {
    return <p className="text-sm text-red-600">Could not load orders. Please refresh the page.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-serif text-stone-900 mb-6">Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-12 text-center text-stone-500">
          No orders yet.
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-widest text-stone-500">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">City</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                // Prefer public_id (added by the concurrent payments work)
                // once it exists; fall back to the plain numeric id.
                const displayId = order.public_id ?? order.id;
                const isExpanded = expandedId === order.id;

                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="border-t border-stone-100 cursor-pointer hover:bg-stone-50"
                    >
                      <td className="px-4 py-3 font-medium text-stone-900">#{displayId}</td>
                      <td className="px-4 py-3">{order.full_name}</td>
                      <td className="px-4 py-3">{order.city}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        PKR {Number(order.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={order.payment_status} />
                      </td>
                      <td className="px-4 py-3">
                        {order.status ? (
                          <span
                            className={`text-xs uppercase tracking-widest ${
                              order.status === "cancelled" ? "text-red-700" : "text-stone-600"
                            }`}
                          >
                            {STAGE_LABELS[order.status] ?? order.status}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-stone-100 bg-stone-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="text-xs text-stone-500 mb-3 space-y-1">
                            <div>Email: {order.email}</div>
                            <div>Phone: {order.phone}</div>
                            <div>Address: {order.address}</div>
                            {order.payment_method && (
                              <div>Payment method: {order.payment_method}</div>
                            )}
                          </div>
                          <table className="w-full text-xs">
                            <thead className="text-stone-400 uppercase tracking-widest">
                              <tr>
                                <th className="text-left py-1">Item</th>
                                <th className="text-left py-1">Qty</th>
                                <th className="text-left py-1">Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(order.items || []).map((item, i) => (
                                // No stable id on line items in the Phase-1
                                // baseline shape — index key is fine, this
                                // list is never reordered/filtered in place.
                                <tr key={i}>
                                  <td className="py-1">Product #{item.product}</td>
                                  <td className="py-1">{item.quantity}</td>
                                  <td className="py-1">
                                    PKR {Number(item.price).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {order.status && (
                            <div className="mt-4 pt-4 border-t border-stone-200">
                              <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-3">
                                Order Progress
                              </h3>
                              <OrderStatusStepper
                                order={order}
                                isUpdating={updatingId === order.id}
                                onChangeStatus={(newStatus) =>
                                  handleStatusChange(order, newStatus)
                                }
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
