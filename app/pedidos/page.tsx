"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const STATUS_OPTIONS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "PREPARANDO", label: "Preparando" },
  { value: "SAIU_PARA_ENTREGA", label: "Saiu para Entrega" },
  { value: "CONCLUIDO", label: "Concluido" },
];

type OrderItem = {
  id: string;
  recipeId: string;
  recipeName: string;
  unitPrice: number;
  quantity: number;
};

type Order = {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  contactEmail: string;
  cpf: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    const res = await fetch("/api/pedidos");
    const data = (await res.json()) as Order[];
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    setMessage("");
    const res = await fetch(`/api/pedidos/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Nao foi possivel atualizar o pedido.");
      return;
    }

    setMessage("Status atualizado.");
    await loadOrders();
  };

  return (
    <AppShell>
      <section>
        <h1 className="page-title" style={{ fontSize: 36 }}>Gerenciar Pedidos</h1>
        <p className="page-subtitle">Acompanhe e atualize o status dos pedidos.</p>
      </section>

      {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}

      {loading ? (
        <section className="panel section" style={{ marginTop: 16 }}>Carregando pedidos...</section>
      ) : orders.length === 0 ? (
        <section className="panel section" style={{ marginTop: 16 }}>Nenhum pedido registrado.</section>
      ) : (
        <section className="grid" style={{ marginTop: 16 }}>
          {orders.map((order) => {
            const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            return (
              <article key={order.id} className="panel section">
                <div className="list-row" style={{ alignItems: "start" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{order.customerName}</h2>
                    <p className="muted" style={{ margin: "6px 0 0" }}>{order.address}</p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>Telefone: {order.phone}</p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>Email: {order.contactEmail}</p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>CPF: {order.cpf}</p>
                    <p className="muted" style={{ margin: "4px 0 0" }}>Pagamento: {order.paymentMethod}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="muted" style={{ fontSize: 12 }}>Total</div>
                    <strong style={{ fontSize: 18 }}>{formatMoney(total)}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  {order.items.map((item) => (
                    <div key={item.id} className="list-row">
                      <span>{item.recipeName}</span>
                      <span>{item.quantity} x {formatMoney(item.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label className="muted">Status</label>
                  <select
                    className="input"
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="muted" style={{ fontSize: 12 }}>#{order.id.slice(0, 8)}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}