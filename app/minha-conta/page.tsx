"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  priceSell: number;
  image?: string | null;
};

type OrderItem = {
  id: string;
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
  status: "PENDENTE" | "PREPARANDO" | "SAIU_PARA_ENTREGA" | "CONCLUIDO";
  createdAt: string;
  items: OrderItem[];
};

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt?: string | null;
  } | null;
};

const statusLabel: Record<Order["status"], string> = {
  PENDENTE: "Pendente",
  PREPARANDO: "Preparando",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  CONCLUIDO: "Concluído",
};

const statusClass: Record<Order["status"], string> = {
  PENDENTE: "pendente",
  PREPARANDO: "preparando",
  SAIU_PARA_ENTREGA: "entrega",
  CONCLUIDO: "concluido",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default function MinhaContaPage() {
  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersMessage, setOrdersMessage] = useState("");
  const [codeEmail, setCodeEmail] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [tab, setTab] = useState("perfil");

  const [verifyCode, setVerifyCode] = useState("");
  const [verifyInfo, setVerifyInfo] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetInfo, setResetInfo] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (data.user) {
          setMe(data.user);
          setCodeEmail(data.user.email);
        }
      })
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    fetch("/api/loja/products")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data || []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    try { const stored = localStorage.getItem("cookie:favorites"); if (stored) setFavorites(JSON.parse(stored)); } catch { setFavorites([]); }
    try { const seen = localStorage.getItem("cookie:viewed"); if (seen) setRecentIds(JSON.parse(seen)); } catch { setRecentIds([]); }
    const hash = window.location.hash.replace('#','');
    if (["perfil","pedidos","favoritos","recentes","seguranca"].includes(hash)) setTab(hash);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cookie:favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await fetch("/api/pedidos");
        if (!res.ok) {
          setOrdersMessage(res.status === 401 ? "Faça login para ver seus pedidos." : "Não foi possível carregar os pedidos.");
          return;
        }
        const data = (await res.json()) as Order[];
        setOrders(data || []);
      } catch (e) {
        const detail = e instanceof Error ? e.message : "Erro desconhecido";
        setOrdersMessage(detail);
      }
    };
    loadOrders();
  }, []);

  const favoriteProducts = useMemo(() => products.filter((p) => favorites.includes(p.id)), [favorites, products]);
  const recentProducts = useMemo(() => products.filter((p) => recentIds.includes(p.id)), [recentIds, products]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const requestVerifyCode = async () => {
    setVerifyInfo(""); setVerifyError(""); setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/request-verification-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: codeEmail }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setVerifyError((data as { error?: string })?.error || "Não foi possível enviar agora.");
        return;
      }
      setVerifyInfo("Código enviado para o seu email.");
    } catch (e) { setVerifyError(e instanceof Error ? e.message : "erro"); } finally { setVerifyLoading(false); }
  };

  const verifyEmail = async () => {
    setVerifyInfo(""); setVerifyError(""); setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: codeEmail, code: verifyCode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setVerifyError((data as { error?: string })?.error || "Código inválido."); return; }
      setVerifyInfo("Email verificado! Agora é só continuar comprando.");
      setVerifyCode("");
      setMe((prev) => prev ? { ...prev, emailVerifiedAt: new Date().toISOString() } : prev);
    } catch (e) { setVerifyError(e instanceof Error ? e.message : "erro"); } finally { setVerifyLoading(false); }
  };

  const requestResetCode = async () => {
    setResetInfo(""); setResetError(""); setResetLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: codeEmail }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResetError((data as { error?: string })?.error || "Falha ao solicitar código.");
        return;
      }
      setResetInfo("Código de reset enviado para o email.");
    } catch (e) { setResetError(e instanceof Error ? e.message : "erro"); } finally { setResetLoading(false); }
  };

  const resetPassword = async () => {
    setResetInfo(""); setResetError(""); setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: codeEmail, code: resetCode, newPassword }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setResetError((data as { error?: string })?.error || "Não foi possível redefinir agora."); return; }
      setResetInfo("Senha atualizada. Entre novamente na loja.");
      setResetCode(""); setNewPassword("");
    } catch (e) { setResetError(e instanceof Error ? e.message : "erro"); } finally { setResetLoading(false); }
  };

  const tabButton = (id: string, label: string) => (
    <button type="button" className={`tab-btn ${tab === id ? "is-active" : ""}`} onClick={() => setTab(id)}>
      {label}
    </button>
  );

  return (
    <div className="account-page">
      <header className="account-hero">
        <p className="store-kicker" style={{ color: "#9b612f" }}>Minha conta</p>
        <h1>Favoritos, pedidos e códigos</h1>
        <p>Escolha uma aba para ver só o que importa.</p>
        <div className="tab-row">
          {tabButton("perfil", "Perfil")}
          {tabButton("pedidos", "Pedidos")}
          {tabButton("favoritos", "Favoritos")}
          {tabButton("recentes", "Vistos recentemente")}
          {tabButton("seguranca", "Segurança")}
        </div>
      </header>

      <section className="account-grid">
        {tab === "perfil" && (
          <article className="account-card">
            <h3>Perfil</h3>
            <p className="account-sub">Dados rápidos da sua conta.</p>
            {me ? (
              <div className="favorite-list">
                <div><strong>Nome:</strong> {me.name}</div>
                <div><strong>Email:</strong> {me.email}</div>
                <div className="account-inline">
                  <Link className="account-link" href="/loja">Voltar para a loja</Link>
                  <Link className="account-link" href="/login">Trocar usuário</Link>
                </div>
              </div>
            ) : (
              <p className="account-sub">Faça login para ver detalhes.</p>
            )}
          </article>
        )}

        {tab === "favoritos" && (
          <article className="account-card" id="favoritos">
            <h3>Favoritos</h3>
            <p className="account-sub">Cookies que você marcou na vitrine.</p>
            {favoriteProducts.length === 0 ? (
              <p className="account-sub">Nenhum favorito ainda. Marque na loja com o coração.</p>
            ) : (
              <div className="favorite-list">
                {favoriteProducts.map((product) => (
                  <div key={product.id} className="favorite-card">
                    <div>
                      <strong>{product.name}</strong>
                      <div className="muted">{formatMoney(product.priceSell)}</div>
                    </div>
                    <button type="button" className="btn" onClick={() => toggleFavorite(product.id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === "pedidos" && (
          <article className="account-card" id="pedidos">
            <h3>Pedidos</h3>
            <p className="account-sub">Acompanhe o status.</p>
            {ordersMessage ? <p className="account-sub">{ordersMessage}</p> : null}
            {orders.length === 0 ? (
              <p className="account-sub">Nenhum pedido ainda.</p>
            ) : (
              <div className="order-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-row">
                    <div className="account-inline" style={{ justifyContent: "space-between" }}>
                      <div>
                        <strong>{order.customerName}</strong>
                        <div className="muted">{formatDate(order.createdAt)}</div>
                      </div>
                      <span className={`status-pill ${statusClass[order.status]}`}>
                        {statusLabel[order.status]}
                      </span>
                    </div>
                    <div className="muted">{order.address}</div>
                    <div className="favorite-list">
                      {order.items.map((item) => (
                        <div key={item.id} className="list-row" style={{ gap: 8 }}>
                          <span>{item.recipeName}</span>
                          <span>{item.quantity} x {formatMoney(item.unitPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === "recentes" && (
          <article className="account-card" id="recentes">
            <h3>Vistos recentemente</h3>
            <p className="account-sub">Últimos cookies que você abriu na vitrine.</p>
            {recentProducts.length === 0 ? (
              <p className="account-sub">Nada visto ainda. Clique em qualquer cookie na loja.</p>
            ) : (
              <div className="favorite-list">
                {recentProducts.map((product) => (
                  <div key={product.id} className="favorite-card">
                    <div>
                      <strong>{product.name}</strong>
                      <div className="muted">{formatMoney(product.priceSell)}</div>
                    </div>
                    <Link className="account-link" href="/loja">Ver na loja</Link>
                  </div>
                ))}
              </div>
            )}
          </article>
        )}

        {tab === "seguranca" && (
          <>
            {!me?.emailVerifiedAt && (
              <article className="account-card">
                <h3>Verificar email</h3>
                <p className="account-sub">Informe o código recebido para confirmar.</p>
                <div className="code-grid">
                  <input className="input" placeholder="seu@email.com" value={codeEmail} onChange={(e) => setCodeEmail(e.target.value)} />
                  <div className="account-inline">
                    <input className="input" placeholder="Código recebido" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
                    <button type="button" className="btn" onClick={requestVerifyCode} disabled={verifyLoading}>
                      {verifyLoading ? "Enviando..." : "Reenviar"}
                    </button>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={verifyEmail} disabled={verifyLoading}>
                    Validar código
                  </button>
                  {verifyInfo ? <p style={{ color: "#1a7f46" }}>{verifyInfo}</p> : null}
                  {verifyError ? <p style={{ color: "#a33939" }}>{verifyError}</p> : null}
                </div>
              </article>
            )}

            <article className="account-card">
              <h3>Redefinir senha</h3>
              <p className="account-sub">Use o código recebido por email para trocar a senha.</p>
              <div className="code-grid">
                <div className="account-inline">
                  <input className="input" placeholder="Código de reset" value={resetCode} onChange={(e) => setResetCode(e.target.value)} />
                  <button type="button" className="btn" onClick={requestResetCode} disabled={resetLoading}>
                    {resetLoading ? "Enviando..." : "Pedir código"}
                  </button>
                </div>
                <input className="input" type="password" placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
                <button type="button" className="btn btn-primary" onClick={resetPassword} disabled={resetLoading}>
                  Trocar senha
                </button>
                {resetInfo ? <p style={{ color: "#1a7f46" }}>{resetInfo}</p> : null}
                {resetError ? <p style={{ color: "#a33939" }}>{resetError}</p> : null}
              </div>
            </article>
          </>
        )}
      </section>
    </div>
  );
}
