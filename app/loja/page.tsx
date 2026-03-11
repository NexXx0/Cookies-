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
  const [favorites, setFavorites] = useState<string[]>([]);
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

  const heroTiles = [
    {
      title: "Box Degustação",
      description: "6 cookies quentinhos, massa de baunilha, gotas de chocolate e recheios cremosos.",
      image: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1600&q=80",
    },
    {
      title: "Linha Zero Açúcar",
      description: "Receitas com eritritol e chocolate 70%, pensadas para um doce leve e sem culpa.",
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1600&q=80",
    },
    {
      title: "Cookie Shot",
      description: "Copo de cookie + ganache quente. Perfeito para presentear.",
      image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1600&q=80",
    },
  ];

  const cookiePhotos = [
    "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603052875333-0211c93b5395?auto=format&fit=crop&w=900&q=80",
  ];

  const getProductImage = (product: Product, index: number) =>
    product.image && product.image.trim() ? product.image : cookiePhotos[index % cookiePhotos.length];

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cookie:favorites");
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cookie:favorites", JSON.stringify(favorites));
    } catch {
      // ignore persist errors
    }
  }, [favorites]);

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

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
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

  const scrollToMenu = () => {
    const el = document.getElementById("cardapio");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="store-page">
      <div className="store-topbar">
        <div className="store-brand">
          <span className="store-dot" />
          <span>DuetoCookies</span>
        </div>
        <nav className="store-nav">
          <button type="button" onClick={scrollToMenu}>Menu</button>
          <a href="#destaques">Destaques</a>
          <a href="#cardapio">Cardápio</a>
          <a href="/minha-conta">Minha conta</a>
        </nav>
        <div className="store-actions">
          <span className="store-pill">Entrega hoje</span>
          <button type="button" className="store-icon-btn" onClick={proceedToCart}>
            ??
          </button>
        </div>
      </div>

      <header className="store-hero">
        <div className="store-hero-content">
          <div className="store-badges">
            <span className="store-badge">Semana do Cookie</span>
            <span className="store-badge ghost">Sem corantes</span>
          </div>
          <h1>Cookies artesanais, assados sob medida</h1>
          <p>Escolha os sabores, acompanhe o carrinho em tempo real e finalize com PIX. Visual inspirado na vitrine Nike, mas só com cookies.</p>
          <div className="store-hero-actions">
            <button type="button" className="store-cta" onClick={scrollToMenu}>
              Ver sabores
            </button>
            <button type="button" className="store-ghost" onClick={() => setStage("cart")}>
              Ir para o resumo
            </button>
          </div>
          <div className="store-steps">
            <div className={`store-step ${stage === "browse" ? "is-active" : ""}`}>1. Escolher</div>
            <div className={`store-step ${stage === "cart" ? "is-active" : ""}`}>2. Carrinho</div>
            <div className={`store-step ${stage === "checkout" ? "is-active" : ""}`}>3. Dados</div>
          </div>
        </div>
        <div className="store-hero-tiles">
          {heroTiles.map((tile, index) => (
            <article key={tile.title} className="hero-card" style={{ backgroundImage: `url(${tile.image})` }}>
              <div className="hero-card-overlay">
                <p className="hero-card-kicker">Cookie drop #{index + 1}</p>
                <h3>{tile.title}</h3>
                <p>{tile.description}</p>
                <button type="button" className="store-cta small" onClick={scrollToMenu}>
                  Pedir agora
                </button>
              </div>
            </article>
          ))}
        </div>
      </header>

      <section id="destaques" className="store-feature-grid">
        <article className="feature-card">
          <div className="feature-copy">
            <p className="feature-kicker">Coleção Limitada</p>
            <h2>Cookie Caramelo queimado</h2>
            <p>Com flor de sal e miolo puxando. Inspirado na ideia de coleções com fotos grandes, igual à vitrine Nike.</p>
            <button type="button" className="store-cta" onClick={scrollToMenu}>
              Comprar
            </button>
          </div>
          <div className="feature-image" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1509460913899-515f1df34fea?auto=format&fit=crop&w=1400&q=80)" }} />
        </article>
        <article className="feature-card alt">
          <div className="feature-copy">
            <p className="feature-kicker">Box Presente</p>
            <h2>Assinatura semanal</h2>
            <p>Curadoria de sabores, embalados a vácuo e entregues frescos. Personalize quantidades antes de fechar.</p>
            <button type="button" className="store-ghost dark" onClick={proceedToCart}>
              Ver carrinho
            </button>
          </div>
          <div className="feature-image" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80)" }} />
        </article>
      </section>

      <main id="cardapio" className="store-shell">
        <section className="store-products">
          <div className="store-products-header">
            <div>
              <p className="store-kicker">Cardápio</p>
              <h2>Sabores em destaque</h2>
              <p className="store-muted">Adicione, ajuste quantidades ou favorite para ver depois em Minha conta.</p>
            </div>
            <div className="store-chips">
              <span className="store-chip">Chocolate</span>
              <span className="store-chip">Recheados</span>
              <span className="store-chip">Zero</span>
            </div>
          </div>
          {loading ? (
            <p className="store-muted">Buscando cookies...</p>
          ) : (
            <div className="store-grid">
              {products.map((product, index) => {
                const row = cart.find((item) => item.productId === product.id);
                const photo = getProductImage(product, index);
                const isFavorite = favorites.includes(product.id);
                return (
                  <article key={product.id} className="store-card">
                    <button
                      type="button"
                      className={`store-fav ${isFavorite ? "is-active" : ""}`}
                      onClick={() => toggleFavorite(product.id)}
                      aria-label="Favoritar cookie"
                    >
                      {isFavorite ? "?" : "?"}
                    </button>
                    <div className="store-card-image" style={{ backgroundImage: `url(${photo})` }} />
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
                        className="store-cta block"
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
          <div className="store-cart-header">
            <div>
              <p className="store-kicker">Carrinho</p>
              <h2>Resumo</h2>
            </div>
            <span className="store-pill dark">{cartItems.length} itens</span>
          </div>

          {cartItems.length === 0 ? (
            <p className="store-muted">Nada no carrinho ainda.</p>
          ) : (
            <div className="store-cart-list">
              {cartItems.map((row) => {
                const product = products.find((p) => p.id === row.productId);
                if (!product) return null;
                return (
                  <div key={row.productId} className="list-row">
                    <div>
                      <strong>{product.name}</strong>
                      <div className="muted">
                        {row.quantity} x {formatMoney(product.priceSell)}
                      </div>
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
          <button type="button" className="store-cta block" onClick={proceedToCart}>
            Ver carrinho
          </button>
          {cartMessage ? <p className="store-message">{cartMessage}</p> : null}
          {stage === "cart" && (
            <button type="button" className="store-ghost full" onClick={proceedToCheckout}>
              Continuar para pagamento
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
                    <span>
                      {row.quantity} x {formatMoney(product.priceSell)}
                    </span>
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
              <div className="store-form-grid">
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
              </div>
              <div className="store-form-grid">
                <input
                  placeholder="CPF"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  required
                />
                <input
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <input
                placeholder="Endereço completo"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
              <button type="submit" className="store-cta block">
                Finalizar pedido
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
