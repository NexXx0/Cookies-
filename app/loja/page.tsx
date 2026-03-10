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

type CustomerForm = {
  name: string;
  contactEmail: string;
  cpf: string;
  address: string;
  phone: string;
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
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    contactEmail: "",
    cpf: "",
    address: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [stage, setStage] = useState<"browse" | "cart" | "checkout">("browse");
  const [isLogged, setIsLogged] = useState(false);
  const [message, setMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
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

  const cartItems = cart.filter((row) => row.quantity > 0);

  const total = useMemo(() => {
    return cartItems.reduce((sum, row) => {
      const product = products.find((p) => p.id === row.productId);
      if (!product) return sum;
      return sum + product.priceSell * row.quantity;
    }, 0);
  }, [cartItems, products]);

  const addProduct = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((row) =>
        row.productId === productId ? { ...row, quantity: Math.max(0, row.quantity + delta) } : row,
      ),
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!isLogged) {
      setMessage("Faça login para continuar.");
      return;
    }

    if (!form.name || !form.address || !form.phone || !form.contactEmail || !form.cpf) {
      setMessage("Complete todos os campos do formulário.");
      return;
    }

    if (!cartItems.length) {
      setMessage("Adicione ao menos um cookie ao carrinho.");
      return;
    }

    const items = cartItems.map((row) => ({
      recipeId: row.productId,
      quantity: row.quantity,
    }));

    const res = await fetch("/api/loja/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: form.name,
        address: form.address,
        phone: form.phone,
        contactEmail: form.contactEmail,
        cpf: form.cpf,
        paymentMethod,
        items,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Não foi possível finalizar o pedido.");
      return;
    }

    setMessage("Pedido finalizado com sucesso!");
    setCart((prev) => prev.map((row) => ({ ...row, quantity: 0 })));
    setForm({ name: "", contactEmail: "", cpf: "", address: "", phone: "" });
    setPaymentMethod("PIX");
    setStage("browse");
  };

  const proceedToCart = () => {
    if (!cartItems.length) {
      setCartMessage("Adicione algum produto antes de continuar.");
      return;
    }
    setCartMessage("");
    setStage("cart");
  };

  const proceedToCheckout = () => {
    if (!isLogged) {
      setCartMessage("Faça login para continuar.");
      setStage("cart");
      return;
    }
    setStage("checkout");
  };

  return (
    <div className="store-page">
      <header className="store-hero">
        <div className="store-hero-content">
          <span className="store-badge">DuetoCookies</span>
          <h1>Cookies artesanais para deixar o dia mais doce</h1>
          <p>Escolha seu sabor, adicione ao carrinho e finalize em poucos passos.</p>
        </div>
      </header>

      <main className="store-shell">
        <section className="store-products">
          <h2>Cardápio</h2>
          {loading ? (
            <p className="store-muted">Buscando cookies...</p>
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
                        <button type="button" onClick={() => addProduct(product.id, -1)}>
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={row?.quantity ?? 0}
                          onChange={(e) => addProduct(product.id, Number(e.target.value) - (row?.quantity ?? 0))}
                        />
                        <button type="button" onClick={() => addProduct(product.id, 1)}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ marginTop: 14 }}
                        onClick={() => {
                          if ((row?.quantity ?? 0) <= 0) addProduct(product.id, 1);
                          setCartMessage("Cookie adicionado ao carrinho.");
                        }}
                      >
                        Adicionar ao carrinho
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="store-cart">
          <h2>Carrinho</h2>
          {cartItems.length === 0 ? (
            <p className="store-muted">Nada no carrinho ainda.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {cartItems.map((row) => {
                const product = products.find((p) => p.id === row.productId);
                if (!product) return null;
                return (
                  <div key={row.productId} className="list-row">
                    <div>
                      <strong>{product.name}</strong>
                      <div className="muted">{row.quantity} x {formatMoney(product.priceSell)}</div>
                    </div>
                    <span>{formatMoney(product.priceSell * row.quantity)}</span>
                  </div>
                );
              })}
              <div className="store-summary">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={proceedToCart}>
            Ver carrinho
          </button>
          {cartMessage ? <p className="store-message">{cartMessage}</p> : null}
          {stage === "cart" && (
            <button type="button" className="btn" style={{ marginTop: 12 }} onClick={proceedToCheckout}>
              Continuar para o pagamento
            </button>
          )}
        </aside>

        {stage === "cart" && (
          <section className="store-checkout">
            <h2>Resumo do pedido</h2>
            <p className="muted">Confirme os itens e clique em continuar para o pagamento.</p>
            <div style={{ display: "grid", gap: 8 }}>
              {cartItems.map((row) => {
                const product = products.find((p) => p.id === row.productId);
                if (!product) return null;
                return (
                  <div key={row.productId} className="list-row">
                    <span>{product.name}</span>
                    <span>{row.quantity} x {formatMoney(product.priceSell)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {stage === "checkout" && (
          <section className="store-checkout">
            <h2>Dados do pedido</h2>
            <form onSubmit={onSubmit} className="store-form">
              <input
                placeholder="Nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                placeholder="Email para contato"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                required
              />
              <input
                placeholder="CPF"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                required
              />
              <input
                placeholder="Endereço"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
              <input
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="PIX">PIX</option>
              </select>
              <div className="store-summary">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              {message ? <div className="store-message">{message}</div> : null}
              <button type="submit" className="btn btn-primary">
                Finalizar pedido
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

