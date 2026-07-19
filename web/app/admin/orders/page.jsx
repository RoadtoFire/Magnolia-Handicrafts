"use client";

import { Fragment, useEffect, useState } from "react";
import { getOrders } from "@/lib/api";

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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
                          <span className="text-xs uppercase tracking-widest text-stone-600">
                            {order.status}
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
                          {/* TODO: wire up status update once PATCH /api/orders/<id>/ supports it */}
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
