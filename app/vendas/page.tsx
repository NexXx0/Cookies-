"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type Recipe = {
  id: string;
  name: string;
  priceSell: number;
  cost: number;
  yieldQuantity: number;
};

type Sale = {
  id: string;
  quantity: number;
  createdAt: string;
  recipe: Recipe;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function VendasPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [recipesRes, salesRes] = await Promise.all([fetch("/api/receitas", { cache: "no-store" }), fetch("/api/vendas", { cache: "no-store" })]);
    const recipesData = (await recipesRes.json()) as Recipe[];
    const salesData = (await salesRes.json()) as Sale[];
    setRecipes(recipesData);
    setSales(salesData);

    if (!recipesData.find((r) => r.id === recipeId)) {
      setRecipeId(recipesData[0]?.id ?? "");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, quantity }),
    });

    setQuantity(1);
    await loadData();
    setSaving(false);
  };

  const salesWithValues = useMemo(() => {
    return sales.map((sale) => {
      const unitCost = sale.recipe.cost / Math.max(1, sale.recipe.yieldQuantity || 1);
      const productionCost = unitCost * sale.quantity;
      const totalRevenue = sale.recipe.priceSell * sale.quantity;
      const profit = totalRevenue - productionCost;
      return { sale, productionCost, totalRevenue, profit };
    });
  }, [sales]);

  const topGraphItems = salesWithValues.slice(0, 5);
  const maxGraphValue = Math.max(1, ...topGraphItems.map((item) => Math.max(item.totalRevenue, item.productionCost)));

  return (
    <AppShell>
      <section className="panel section" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ fontSize: 36 }}>Vendas</h1>
        <p className="page-subtitle">Receitas atualizam automaticamente a cada 15s e ao voltar para esta aba.</p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.2fr) minmax(420px, 1fr)", gap: 16 }}>
        <article className="panel section" style={{ minHeight: 360 }}>
          <h2 style={{ marginTop: 0 }}>Registrar venda</h2>

          <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12, width: "100%" }}>
            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Receita</div>
              <select className="input" style={{ width: "100%", minHeight: 56, fontSize: 18 }} value={recipeId} onChange={(e) => setRecipeId(e.target.value)} required>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </label>

            <label>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Quantidade</div>
              <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={saving || !recipeId}>{saving ? "Salvando..." : "Registrar"}</button>
              <button className="btn" type="button" onClick={loadData}>Atualizar receitas</button>
            </div>
          </form>
        </article>

        <article className="panel section" style={{ minHeight: 360 }}>
          <h2 style={{ marginTop: 0 }}>Grafico de valor por producao</h2>
          {topGraphItems.length === 0 ? (
            <p className="muted">Registre vendas para visualizar o grafico.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {topGraphItems.map(({ sale, productionCost, totalRevenue }) => (
                <div key={sale.id}>
                  <div className="list-row" style={{ marginBottom: 6 }}>
                    <strong>{sale.recipe.name} ({sale.quantity} unid.)</strong>
                    <span>{formatMoney(totalRevenue)}</span>
                  </div>
                  <div style={{ background: "#eee5dc", borderRadius: 999, height: 8, marginBottom: 6 }}>
                    <div style={{ width: `${(totalRevenue / maxGraphValue) * 100}%`, background: "var(--success)", height: "100%", borderRadius: 999 }} />
                  </div>
                  <div style={{ background: "#eee5dc", borderRadius: 999, height: 8 }}>
                    <div style={{ width: `${(productionCost / maxGraphValue) * 100}%`, background: "var(--brand)", height: "100%", borderRadius: 999 }} />
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>verde = venda | marrom = custo de producao</div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel section" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ultimas vendas</h2>
        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Receita</th>
                <th>Qtd</th>
                <th>Custo producao</th>
                <th>Total venda</th>
                <th>Lucro</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {salesWithValues.map(({ sale, productionCost, totalRevenue, profit }) => (
                <tr key={sale.id}>
                  <td>{sale.recipe.name}</td>
                  <td>{sale.quantity}</td>
                  <td>{formatMoney(productionCost)}</td>
                  <td>{formatMoney(totalRevenue)}</td>
                  <td>{formatMoney(profit)}</td>
                  <td>{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

