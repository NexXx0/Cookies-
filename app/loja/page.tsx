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
  { id: "cookie-01", name: "Cookie Choco Chunk", priceSell: 12.9, image: "https://images.unsplash.com/photo-1509460913899-515f1df34fea?auto=format&fit=crop&w=900&q=80" },
  { id: "cookie-02", name: "Doce de Leite com Flor de Sal", priceSell: 13.5, image: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=900&q=80" },
  { id: "cookie-03", name: "Red Velvet Cream", priceSell: 14.0, image: "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=900&q=80" },
  { id: "cookie-04", name: "Pistache Framboesa", priceSell: 14.9, image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80" },
  { id: "cookie-05", name: "Nutella Lava", priceSell: 15.5, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80" },
  { id: "cookie-06", name: "Zero Açúcar 70%", priceSell: 13.9, image: "https://images.unsplash.com/photo-1603052875333-0211c93b5395?auto=format&fit=crop&w=900&q=80" },
];

const ICON_SIZE = 24;

const SearchIcon = () => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.65" y1="16.65" x2="21" y2="21" />
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill={filled ? "#ff7f50" : "none"} stroke="#202020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
  </svg>
);

const BagIcon = ({ count }: { count: number }) => (
  <div className="bag-icon-wrap">
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
    {count > 0 ? <span className="bag-badge">{count}</span> : null}
  </div>
);

function formatCpfMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const parts = [] as string[];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 9));
  const last = digits.slice(9, 11);
  return [parts.filter(Boolean).join("."), last ? `-${last}` : ""].join("" ).replace(/^\./, "");
}

function formatPhoneMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    try { localStorage.setItem("cookie:favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  useEffect(() => {
    try { localStorage.setItem("cookie:viewed", JSON.stringify(viewed)); } catch {}
  }, [viewed]);

  const cartItems = cart.filter((row) => row.quantity > 0);
  const cartCount = cartItems.reduce((sum, r) => sum + r.quantity, 0);

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

    if (!form.name.trim()) {
      setMessage("Nome é obrigatório e deve ser o mesmo do pagador.");
      return;
    }

    if (!isValidEmail(form.contactEmail)) {
      setMessage("Informe um email válido.");
      return;
    }

    if (form.cpf.replace(/\D/g, "").length !== 11) {
      setMessage("CPF deve ter 11 dígitos.");
      return;
    }

    if (form.phone.replace(/\D/g, "").length < 10) {
      setMessage("Telefone precisa de DDD + número.");
      return;
    }

    if (!form.address.trim()) {
      setMessage("Endereço é obrigatório.");
      return;
    }

    if (!cartItems.length) {
      setMessage("Adicione ao menos um cookie ao carrinho.");
      return;
    }

    const items = cartItems.map((row) => ({ recipeId: row.productId, quantity: row.quantity }));

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

  const goCart = () => {
    setStage("cart");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goCheckout = () => {
    if (!isLogged) {
      setCartMessage("Faça login para continuar.");
      setStage("cart");
      return;
    }
    setStage("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToMenu = () => {
    const el = document.getElementById("cardapio");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleAddAndGoCart = (productId: string, currentQty: number) => {
    if (currentQty <= 0) addProduct(productId, 1);
    setCartMessage("Cookie adicionado ao carrinho.");
    goCart();
  };

  const Stepper = () => (
    <div className="stepper">
      <div className={`step ${stage === "cart" || stage === "browse" ? "is-active" : ""}`}>
        <span>1</span> Carrinho
      </div>
      <div className={`step ${stage === "checkout" ? "is-active" : ""}`}>
        <span>2</span> Identificação
      </div>
      <div className={`step ${stage === "checkout" ? "is-active" : ""}`}>
        <span>3</span> Pagamento
      </div>
    </div>
  );

  return (
    <div className="store-page">
      <div className="store-topbar">
        <div className="store-brand">
          <span className="store-dot" />
          <span>DuetoCookies</span>
        </div>
        <nav className="store-nav">
          <button type="button" onClick={scrollToMenu}>Catálogo</button>
          <a href="#cardapio">Sabores</a>
          <button type="button" onClick={goCart}>Carrinho</button>
        </nav>
        <div className="store-actions">
          <button className="store-icon-btn" aria-label="Buscar"><SearchIcon /></button>
          <Link href="/minha-conta" className="store-icon-btn" aria-label="Favoritos"><HeartIcon /></Link>
          <button className="store-icon-btn" aria-label="Carrinho" onClick={goCart}>
            <BagIcon count={cartCount} />
          </button>
          <div className="store-user" onClick={() => setOpenUserMenu((v) => !v)}>
            {isLogged ? (
              <>
                <span className="store-user-name">Olá, {userName || "cliente"}</span>
                <span className="store-user-icon">👤</span>
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

      {/* Catálogo */}
      <main id="cardapio" className="store-shell" style={{ paddingTop: 10 }}>
        <section className="store-products">
          <div className="store-products-header">
            <div>
              <p className="store-kicker">Catálogo</p>
              <h2>Cookies artesanais prontos para pedir</h2>
              <p className="store-muted">Adicione e vá ao carrinho quando quiser.</p>
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
                      <HeartIcon filled={isFavorite} />
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={0}
                          value={row?.quantity ?? 0}
                          onChange={(e) => addProduct(product.id, Number(e.target.value.replace(/\D/g, "")) - (row?.quantity ?? 0))}
                        />
                        <button type="button" onClick={() => addProduct(product.id, 1)}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="store-cta block"
                        onClick={() => handleAddAndGoCart(product.id, row?.quantity ?? 0)}
                      >
                        Adicionar e ir para carrinho
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {stage === "cart" && (
        <section className="cart-page">
          <Stepper />
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <h2>Seu carrinho está vazio</h2>
              <p>Navegue pelos sabores e volte para adicionar cookies.</p>
              <button className="store-ghost" onClick={scrollToMenu}>Voltar para o catálogo</button>
            </div>
          ) : (
            <div className="cart-grid">
              <div className="cart-items">
                {cartItems.map((row) => {
                  const product = products.find((p) => p.id === row.productId);
                  if (!product) return null;
                  return (
                    <div key={row.productId} className="cart-line">
                      <div className="cart-line-info">
                        <div className="cart-thumb" style={{ backgroundImage: `url(${product.image || fallbackProducts[0].image})` }} />
                        <div>
                          <strong>{product.name}</strong>
                          <div className="muted">{formatMoney(product.priceSell)}</div>
                        </div>
                      </div>
                      <div className="cart-qty">
                        <button onClick={() => addProduct(product.id, -1)}>-</button>
                        <span>{row.quantity}</span>
                        <button onClick={() => addProduct(product.id, 1)}>+</button>
                      </div>
                      <div className="cart-price">{formatMoney(product.priceSell * row.quantity)}</div>
                    </div>
                  );
                })}
              </div>
              <aside className="cart-summary-panel">
                <h3>Resumo</h3>
                <div className="store-summary">
                  <span>Total</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                {cartMessage ? <p className="store-message">{cartMessage}</p> : null}
                <button className="store-cta block" onClick={goCheckout} disabled={cartItems.length === 0}>
                  Continuar para pagamento
                </button>
              </aside>
            </div>
          )}
        </section>
      )}

      {stage === "checkout" && (
        <section className="cart-page">
          <Stepper />
          <div className="checkout-grid">
            <div className="checkout-products">
              <h3>Produtos</h3>
              {cartItems.map((row) => {
                const product = products.find((p) => p.id === row.productId);
                if (!product) return null;
                return (
                  <div key={row.productId} className="cart-line">
                    <div className="cart-line-info">
                      <div className="cart-thumb" style={{ backgroundImage: `url(${product.image || fallbackProducts[0].image})` }} />
                      <div>
                        <strong>{product.name}</strong>
                        <div className="muted">{row.quantity} x {formatMoney(product.priceSell)}</div>
                      </div>
                    </div>
                    <div className="cart-price">{formatMoney(product.priceSell * row.quantity)}</div>
                  </div>
                );
              })}
            </div>
            <div className="checkout-form-panel">
              <h3>Identificação</h3>
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
                    onChange={(e) => setForm({ ...form, cpf: formatCpfMask(e.target.value) })}
                    required
                  />
                  <input
                    placeholder="Telefone (DD) 90000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhoneMask(e.target.value) })}
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
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
