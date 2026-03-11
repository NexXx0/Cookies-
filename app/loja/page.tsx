"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const fallbackProducts: Product[] = [
  { id: "cookie-01", name: "Cookie Choco Chunk", priceSell: 12.9, image: "https://images.unsplash.com/photo-1509460913899-515f1df34fea?auto=format&fit=crop&w=800&q=80" },
  { id: "cookie-02", name: "Doce de Leite com Flor de Sal", priceSell: 13.5, image: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=800&q=80" },
  { id: "cookie-03", name: "Red Velvet Cream", priceSell: 14.0, image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=800&q=80" },
  { id: "cookie-04", name: "Pistache Framboesa", priceSell: 14.9, image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80" },
  { id: "cookie-05", name: "Nutella Lava", priceSell: 15.5, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80" },
  { id: "cookie-06", name: "Zero Açúcar 70%", priceSell: 13.9, image: "https://images.unsplash.com/photo-1603052875333-0211c93b5395?auto=format&fit=crop&w=800&q=80" },
];

export default function LojaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewed, setViewed] = useState<string[]>([]);
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
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openUserMenu, setOpenUserMenu] = useState(false);

  const heroTiles = [
    {
      title: "Box Degustação",
      description: "6 cookies quentinhos, massa de baunilha e recheios cremosos.",
      image: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1600&q=80",
    },
    {
      title: "Linha Zero Açúcar",
      description: "Eritritol + chocolate 70%. Doce leve e sem culpa.",
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1600&q=80",
    },
    {
      title: "Cookie Shot",
      description: "Copo de cookie + ganache quente. Presente certeiro.",
      image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1600&q=80",
    },
  ];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        setIsLogged(!!data?.user);
        if (data?.user?.name) setUserName(data.user.name.split(" ")[0]);
      })
      .catch(() => setIsLogged(false));

    setLoading(true);
    fetch("/api/loja/products")
      .then((res) => res.json())
      .then((data: Product[]) => {
        const list = data && data.length ? data : fallbackProducts;
        setProducts(list);
        setCart(list.map((item) => ({ productId: item.id, quantity: 0 })));
      })
      .catch(() => {
        setProducts(fallbackProducts);
        setCart(fallbackProducts.map((item) => ({ productId: item.id, quantity: 0 })));
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
    try {
      const seen = localStorage.getItem("cookie:viewed");
      if (seen) setViewed(JSON.parse(seen));
    } catch {
      setViewed([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cookie:favorites", JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem("cookie:viewed", JSON.stringify(viewed));
    } catch {
      /* ignore */
    }
  }, [viewed]);

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

  const markViewed = (productId: string) => {
    setViewed((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)];
      return next.slice(0, 6);
    });
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
          <button type="button" onClick={scrollToMenu}>Catálogo</button>
          <a href="#destaques">Destaques</a>
          <a href="#cardapio">Sabores</a>
        </nav>
        <div className="store-actions">
          <button className="store-icon-btn" aria-label="Buscar">??</button>
          <Link href="/minha-conta" className="store-icon-btn" aria-label="Favoritos">?</Link>
          <button className="store-icon-btn" aria-label="Carrinho" onClick={proceedToCart}>???</button>
          <div
            className="store-user"
            onMouseEnter={() => setOpenUserMenu(true)}
            onMouseLeave={() => setOpenUserMenu(false)}
          >
            {isLogged ? (
              <>
                <span className="store-user-name">Olá, {userName || "cliente"}</span>
                <span className="store-user-icon">??</span>
                {openUserMenu ? (
                  <div className="store-user-menu">
                    <Link href="/minha-conta">Minha conta</Link>
                    <Link href="/minha-conta#pedidos">Meus pedidos</Link>
                    <Link href="/minha-conta#favoritos">Meus favoritos</Link>
                    <Link href="/minha-conta#recentes">Vistos recentemente</Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch("/api/auth/logout", { method: "POST" });
                        window.location.href = "/login";
                      }}
                    >
                      Sair
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <Link href="/login" className="store-login-link">Entrar</Link>
            )}
          </div>
        </div>
      </div>

      {/* Catálogo primeiro para já ver os cookies */}
      <main id="cardapio" className="store-shell">
        <section className="store-products">
          <div className="store-products-header">
            <div>
              <p className="store-kicker">Catálogo</p>
              <h2>Cookies artesanais prontos para pedir</h2>
              <p className="store-muted">Escolha sabores, favorite, veja recentes e finalize no carrinho.</p>
            </div>
          </div>
          {loading ? (
            <p className="store-muted">Buscando cookies...</p>
          ) : (
            <div className="store-grid">
              {products.map((product) => {
                const row = cart.find((item) => item.productId === product.id);
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
                    <div
                      className="store-card-image"
                      style={{ backgroundImage: `url(${product.image || fallbackProducts[0].image})` }}
                      onClick={() => markViewed(product.id)}
                    />
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
      </main>

      <header className="store-hero" id="destaques">
        <div className="store-hero-content">
          <div className="store-badges">
            <span className="store-badge">Semana do Cookie</span>
            <span className="store-badge ghost">Sem corantes</span>
          </div>
          <h1>Cookies artesanais, assados sob medida</h1>
          <p>Visual inspirado na vitrine Nike, mas só com cookies. Escolha, favorite, veja recentes e finalize com PIX.</p>
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

      <section className="store-feature-grid">
        <article className="feature-card">
          <div className="feature-copy">
            <p className="feature-kicker">Coleção Limitada</p>
            <h2>Cookie Caramelo queimado</h2>
            <p>Com flor de sal e miolo puxando. Fotos grandes como a vitrine Nike.</p>
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
            <p>Curadoria de sabores, embalados a vácuo e entregues frescos. Personalize quantidades.</p>
            <button type="button" className="store-ghost dark" onClick={proceedToCart}>
              Ver carrinho
            </button>
          </div>
          <div className="feature-image" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80)" }} />
        </article>
      </section>

      {stage === "checkout" && (
        <section className="store-checkout" style={{ maxWidth: 900, margin: "0 auto 40px", padding: 22 }}>
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
    </div>
  );
}
