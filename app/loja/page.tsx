"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  priceSell: number;
  image?: string | null;
};

type CartRow = {
  productId: string;
  quantity: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function LojaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [isLogged, setIsLogged] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setIsLogged(!!data?.user))
      .catch(() => setIsLogged(false));

    setLoading(true);
    fetch("/api/loja/products")
      .then((res) => res.json())
      .then((data: Product[]) => {
        setProducts(data || []);
        setCart((data || []).map((item) => ({ productId: item.id, quantity: 0 })));
      })
      .catch(() => {
        setProducts([]);
        setCart([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, row) => {
      const product = products.find((p) => p.id === row.productId);
      if (!product || row.quantity <= 0) return sum;
      return sum + product.priceSell * row.quantity;
    }, 0);
  }, [cart, products]);

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((row) => (row.productId === productId ? { ...row, quantity: Math.max(0, quantity) } : row)),
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const items = cart.filter((row) => row.quantity > 0).map((row) => ({
      recipeId: row.productId,
      quantity: row.quantity,
    }));

    if (!isLogged) {
      setMessage("Faca login para finalizar o pedido.");
      return;
    }

    if (!name.trim() || !address.trim() || !phone.trim() || !contactEmail.trim() || !cpf.trim()) {
      setMessage("Preencha todos os dados obrigatorios.");
      return;
    }

    if (items.length === 0) {
      setMessage("Selecione pelo menos um produto.");
      return;
    }

    const res = await fetch("/api/loja/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        address,
        phone,
        contactEmail,
        cpf,
        paymentMethod,
        items,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Nao foi possivel finalizar o pedido.");
      return;
    }

    setMessage("Pedido enviado com sucesso. Em breve entraremos em contato.");
    setCart((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
    setName("");
    setAddress("");
    setPhone("");
    setContactEmail("");
    setCpf("");
    setPaymentMethod("PIX");
  };

  return (
    <div className="store-page">
      <header className="store-hero">
        <div className="store-hero-content">
          <span className="store-badge">DuetoCookies</span>
          <h1>Cookies artesanais para deixar o dia mais doce</h1>
          <p>Escolha seus sabores favoritos e envie seu pedido em segundos.</p>
        </div>
      </header>

      <main className="store-shell">
        <section className="store-products">
          <h2>Cardapio</h2>
          {loading ? (
            <p className="store-muted">Carregando produtos...</p>
          ) : products.length === 0 ? (
            <p className="store-muted">Nenhum produto disponivel no momento.</p>
          ) : (
            <div className="store-grid">
              {products.map((product) => {
                const row = cart.find((item) => item.productId === product.id);
                return (
                  <article key={product.id} className="store-card">
                    <div className="store-card-body">
                      <h3>{product.name}</h3>
                      <p className="store-price">{formatMoney(product.priceSell)}</p>
                      <div className="store-qty">
                        <button type="button" onClick={() => updateQuantity(product.id, Math.max(0, (row?.quantity ?? 0) - 1))}>
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={row?.quantity ?? 0}
                          onChange={(e) => updateQuantity(product.id, Number(e.target.value))}
                        />
                        <button type="button" onClick={() => updateQuantity(product.id, (row?.quantity ?? 0) + 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="store-checkout">
          <h2>Finalizar pedido</h2>
          <form onSubmit={onSubmit} className="store-form">
            {!isLogged ? (
              <div className="store-message">
                Para comprar, faca login ou crie uma conta.
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <a className="store-link" href="/login">Entrar</a>
                </div>
              </div>
            ) : null}
            <input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required disabled={!isLogged} />
            <input placeholder="Email para contato" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required disabled={!isLogged} />
            <input placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} required disabled={!isLogged} />
            <input placeholder="Endereco" value={address} onChange={(e) => setAddress(e.target.value)} required disabled={!isLogged} />
            <input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={!isLogged} />
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={!isLogged}>
              <option value="PIX">PIX</option>
            </select>

            <div className="store-summary">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </div>

            {message ? <div className="store-message">{message}</div> : null}

            <button type="submit" disabled={!isLogged}>Finalizar pedido</button>
          </form>
        </section>
      </main>
    </div>
  );
}