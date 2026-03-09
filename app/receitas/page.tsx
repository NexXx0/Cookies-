"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type Unit = "g" | "kg";

type Ingredient = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
};

type RecipeItem = {
  id: string;
  grams: number;
  ingredient: Ingredient;
};

type Recipe = {
  id: string;
  name: string;
  cost: number;
  priceSell: number;
  yieldQuantity: number;
  ingredients: RecipeItem[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ingredientCostPerGram(ingredient: Ingredient) {
  const gramsInPack = ingredient.unit === "kg" ? ingredient.quantity * 1000 : ingredient.quantity;
  return gramsInPack > 0 ? ingredient.price / gramsInPack : 0;
}

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<Recipe[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("1");
  const [priceSell, setPriceSell] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [grams, setGrams] = useState("");
  const [targetUnits, setTargetUnits] = useState("20");
  const [items, setItems] = useState<Array<{ ingredientId: string; grams: number }>>([]);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [recipesRes, ingredientsRes] = await Promise.all([fetch("/api/receitas"), fetch("/api/ingredientes")]);
    setReceitas((await recipesRes.json()) as Recipe[]);
    const ingredientsData = (await ingredientsRes.json()) as Ingredient[];
    setIngredientes(ingredientsData);
    if (!selectedIngredientId && ingredientsData[0]?.id) {
      setSelectedIngredientId(ingredientsData[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estimatedCostBatch = useMemo(() => {
    return items.reduce((sum, item) => {
      const ing = ingredientes.find((i) => i.id === item.ingredientId);
      if (!ing) return sum;
      return sum + ingredientCostPerGram(ing) * item.grams;
    }, 0);
  }, [items, ingredientes]);

  const parsedYield = Math.max(1, Math.floor(Number(yieldQuantity) || 1));
  const costPerUnit = estimatedCostBatch / parsedYield;
  const suggestedPerUnitMin = costPerUnit * 2;
  const suggestedPerUnitMax = costPerUnit * 3;
  const parsedTargetUnits = Math.max(1, Number(targetUnits) || 1);

  const addItem = () => {
    const parsedGrams = Number(grams);
    if (!selectedIngredientId || !Number.isFinite(parsedGrams) || parsedGrams <= 0) return;

    const existing = items.find((x) => x.ingredientId === selectedIngredientId);
    if (existing) {
      setItems(items.map((x) => (x.ingredientId === selectedIngredientId ? { ...x, grams: x.grams + parsedGrams } : x)));
    } else {
      setItems([...items, { ingredientId: selectedIngredientId, grams: parsedGrams }]);
    }
    setGrams("");
  };

  const removeItem = (ingredientId: string) => {
    setItems(items.filter((x) => x.ingredientId !== ingredientId));
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (items.length === 0) {
      setMessage("Adicione pelo menos um ingrediente.");
      return;
    }

    const parsedPriceSell = Number(priceSell);
    if (!Number.isFinite(parsedPriceSell) || parsedPriceSell < 0) {
      setMessage("Informe um preco de venda valido.");
      return;
    }

    const res = await fetch("/api/receitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        priceSell: parsedPriceSell,
        yieldQuantity: parsedYield,
        ingredients: items,
      }),
    });

    if (!res.ok) {
      setMessage("Nao foi possivel cadastrar a receita.");
      return;
    }

    setName("");
    setPriceSell("");
    setYieldQuantity("1");
    setItems([]);
    setMessage("Receita cadastrada com sucesso.");
    await loadData();
  };

  return (
    <AppShell>
      <section>
        <h1 className="page-title" style={{ fontSize: 36 }}>Receitas</h1>
        <p className="page-subtitle">Defina ingredientes por receita e veja custo/projecao de lucro.</p>
      </section>

      <section className="panel section" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Nova receita</h2>
        <form onSubmit={onCreate} style={{ display: "grid", gap: 10 }}>
          <input className="input" placeholder="Nome da receita (ex: Cookie de Chocolate)" value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="grid cards-2">
            <input className="input" type="number" placeholder="Rende quantos cookies" value={yieldQuantity} onChange={(e) => setYieldQuantity(e.target.value)} min={1} step="1" required />
            <input className="input" type="number" placeholder="Preco de venda por unidade" value={priceSell} onChange={(e) => setPriceSell(e.target.value)} min={0} step="0.01" required />
          </div>

          <div className="grid cards-3">
            <select className="input" value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)}>
              {ingredientes.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
            <input className="input" type="number" placeholder="Gramas na receita" value={grams} onChange={(e) => setGrams(e.target.value)} min={0} step="0.1" />
            <button type="button" className="btn" onClick={addItem}>Adicionar ingrediente</button>
          </div>

          {items.length > 0 && (
            <div className="panel section" style={{ boxShadow: "none" }}>
              <strong>Ingredientes da receita</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {items.map((item) => {
                  const ing = ingredientes.find((x) => x.id === item.ingredientId);
                  return (
                    <div key={item.ingredientId} className="list-row">
                      <span>{ing?.name ?? "Ingrediente"} - {item.grams.toFixed(1)} g</span>
                      <button type="button" className="btn" onClick={() => removeItem(item.ingredientId)}>Remover</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid cards-2">
            <div className="panel section" style={{ boxShadow: "none" }}>
              <p className="stat-label">Custo total da receita (lote)</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{formatMoney(estimatedCostBatch)}</p>
            </div>
            <div className="panel section" style={{ boxShadow: "none" }}>
              <p className="stat-label">Preco sugerido por unidade (lucro)</p>
              <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>
                {formatMoney(suggestedPerUnitMin)} ate {formatMoney(suggestedPerUnitMax)}
              </p>
            </div>
          </div>

          <div className="panel section" style={{ boxShadow: "none" }}>
            <p className="stat-label">Calculo de producao</p>
            <div className="grid cards-2" style={{ marginTop: 8 }}>
              <input className="input" type="number" value={targetUnits} onChange={(e) => setTargetUnits(e.target.value)} min={1} step="1" />
              <div className="muted">Unidades desejadas: {parsedTargetUnits}</div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {items.map((item) => {
                const ing = ingredientes.find((x) => x.id === item.ingredientId);
                const needed = (item.grams * parsedTargetUnits) / parsedYield;
                return <div key={item.ingredientId}>{ing?.name}: {needed.toFixed(1)} g</div>;
              })}
              <div><strong>Custo estimado para {parsedTargetUnits} unid.: {formatMoney(costPerUnit * parsedTargetUnits)}</strong></div>
            </div>
          </div>

          {message && <p style={{ margin: 0 }}>{message}</p>}

          <button className="btn btn-primary" type="submit">Cadastrar receita</button>
        </form>
      </section>

      {loading ? (
        <section className="panel section" style={{ marginTop: 16 }}>Carregando receitas...</section>
      ) : (
        <section className="grid" style={{ marginTop: 16 }}>
          {receitas.map((receita) => {
            const costUnit = receita.cost / Math.max(1, receita.yieldQuantity || 1);
            const lucroUnit = receita.priceSell - costUnit;
            const margem = receita.priceSell > 0 ? (lucroUnit / receita.priceSell) * 100 : 0;
            return (
              <article key={receita.id} className="panel section">
                <div className="list-row" style={{ alignItems: "start" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{receita.name}</h2>
                    <p className="muted" style={{ margin: "4px 0 0" }}>Rendimento: {receita.yieldQuantity} unid.</p>
                  </div>
                  <span className="pill">Margem {margem.toFixed(0)}%</span>
                </div>

                <div className="grid cards-3" style={{ marginTop: 16 }}>
                  <div className="panel section" style={{ boxShadow: "none" }}>
                    <p className="stat-label">Custo do lote</p>
                    <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{formatMoney(receita.cost)}</p>
                  </div>
                  <div className="panel section" style={{ boxShadow: "none" }}>
                    <p className="stat-label">Custo por unidade</p>
                    <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{formatMoney(costUnit)}</p>
                  </div>
                  <div className="panel section" style={{ boxShadow: "none" }}>
                    <p className="stat-label">Preco de venda por unidade</p>
                    <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 700 }}>{formatMoney(receita.priceSell)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
