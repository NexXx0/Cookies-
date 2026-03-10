"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { pushAppNotifications } from "@/lib/clientNotifications";

type Unit = "g" | "kg" | "ml" | "l";
type RecipeInputMode = "manual" | "ready";

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

type ParsedReadyLine = {
  sourceLine: string;
  name: string;
  grams: number;
  baseUnit: "g" | "ml";
  ingredientId?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ingredientCostPerGram(ingredient: Ingredient) {
  const gramsInPack = ingredient.unit === "kg" || ingredient.unit === "l" ? ingredient.quantity * 1000 : ingredient.quantity;
  return gramsInPack > 0 ? ingredient.price / gramsInPack : 0;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmountToGrams(amountRaw: string, unitRaw: string) {
  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return NaN;

  const unit = unitRaw.toLowerCase();
  if (unit === "kg") return amount * 1000;
  if (unit === "l") return amount * 1000;
  if (unit === "g" || unit === "ml") return amount;
  return NaN;
}

function extractIngredientName(line: string, amountMatch: RegExpMatchArray & { index: number }) {
  let work = line
    .replace(/\([^)]*\)/g, " ")
    .replace(/≈.*$/g, " ")
    .replace(/[–—-].*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const deMatch = work.match(/\b(?:de|do|da|dos|das)\s+(.+)$/i);
  if (deMatch?.[1]) {
    return deMatch[1].replace(/\s+/g, " ").trim();
  }

  const amountToken = amountMatch[0];
  work = work.replace(amountToken, " ").replace(/\s+/g, " ").trim();
  work = work.replace(/^(?:de|do|da|dos|das)\s+/i, "");
  return work.replace(/\s+/g, " ").trim();
}

function isLikelyIngredientName(name: string) {
  const normalized = normalizeText(name);
  if (!normalized) return false;
  if (!/[a-z]/i.test(normalized)) return false;

  const stopwords = new Set(["g", "kg", "ml", "gr", "grama", "gramas", "quilo", "quilos", "un", "unidade"]);
  return !stopwords.has(normalized);
}

function isLikelyLiquidIngredient(name: string) {
  const n = normalizeText(name);
  if (!n) return false;
  const liquidKeywords = ["agua", "leite", "oleo", "ovo", "ovos", "iogurte", "suco", "sucos"];
  return liquidKeywords.some((keyword) => n.includes(keyword));
}

function displayBaseUnitForIngredient(ingredient?: Ingredient) {
  if (!ingredient) return "g";
  return ingredient.unit === "l" || ingredient.unit === "ml" ? "ml" : "g";
}
function tryMatchIngredientId(parsedName: string, ingredientes: Ingredient[]) {
  const n = normalizeText(parsedName);
  if (!n) return undefined;

  const exact = ingredientes.find((ing) => normalizeText(ing.name) === n);
  if (exact) return exact.id;

  const contains = ingredientes.find((ing) => {
    const ingName = normalizeText(ing.name);
    return ingName.includes(n) || n.includes(ingName);
  });

  return contains?.id;
}

function parseReadyText(text: string, ingredientes: Ingredient[]): ParsedReadyLine[] {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedReadyLine[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const amountMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i);
    if (!amountMatch || amountMatch.index === undefined) continue;

    const grams = parseAmountToGrams(amountMatch[1], amountMatch[2]);
    const rawUnit = amountMatch[2].toLowerCase();
    const baseUnit = rawUnit === "ml" || rawUnit === "l" ? "ml" : "g";
    if (!Number.isFinite(grams) || grams <= 0) continue;

    const name = extractIngredientName(line, amountMatch as RegExpMatchArray & { index: number });
    if (!isLikelyIngredientName(name)) continue;

    parsed.push({
      sourceLine: line,
      name,
      grams,
      baseUnit,
      ingredientId: tryMatchIngredientId(name, ingredientes),
    });
  }

  return parsed;
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
  const [recipeTargets, setRecipeTargets] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Array<{ ingredientId: string; grams: number }>>([]);
  const [message, setMessage] = useState("");
  const [inputMode, setInputMode] = useState<RecipeInputMode>("manual");
  const [readyText, setReadyText] = useState("");
  const [unitWeightGrams, setUnitWeightGrams] = useState("100");

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

  const parsedReadyLines = useMemo(() => parseReadyText(readyText, ingredientes), [readyText, ingredientes]);

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

  const applyReadyText = async () => {
    const grouped = new Map<string, number>();

    for (const line of parsedReadyLines.filter((x) => x.ingredientId)) {
      const id = line.ingredientId as string;
      grouped.set(id, (grouped.get(id) ?? 0) + line.grams);
    }

    const unresolvedLines = parsedReadyLines.filter((line) => !line.ingredientId);

    const unresolvedGrouped = new Map<string, { name: string; grams: number }>();
    for (const line of unresolvedLines) {
      const key = normalizeText(line.name);
      const current = unresolvedGrouped.get(key);
      if (current) {
        current.grams += line.grams;
        unresolvedGrouped.set(key, current);
      } else {
        unresolvedGrouped.set(key, { name: line.name, grams: line.grams });
      }
    }

    const createdNames: string[] = [];

    for (const [, unresolved] of unresolvedGrouped.entries()) {
      const res = await fetch("/api/ingredientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: unresolved.name,
          price: 0,
          quantity: 1,
          unit: isLikelyLiquidIngredient(unresolved.name) ? "l" : "kg",
        }),
      });

      if (!res.ok) {
        continue;
      }

      const created = (await res.json()) as Ingredient;
      createdNames.push(created.name);
      grouped.set(created.id, (grouped.get(created.id) ?? 0) + unresolved.grams);
    }

    const nextItems = Array.from(grouped.entries()).map(([ingredientId, totalGrams]) => ({
      ingredientId,
      grams: Number(totalGrams.toFixed(3)),
    }));

    if (nextItems.length === 0) {
      setMessage("Nao foi possivel identificar ingredientes cadastrados no texto colado.");
      return;
    }

    setItems(nextItems);

    if (createdNames.length > 0) {
      pushAppNotifications(
        createdNames.map((nameItem) => ({
          title: `Ingrediente novo: ${nameItem}`,
          message: "Defina preco e quantidade de compra em Ingredientes.",
          href: "/ingredientes",
        })),
      );

      setMessage(`Receita aplicada. Ingredientes criados automaticamente: ${createdNames.join(", ")}.`);
      await loadData();
      return;
    }

    setMessage("Receita pronta aplicada com sucesso nos ingredientes.");
  };

  const removeItem = (ingredientId: string) => {
    setItems(items.filter((x) => x.ingredientId !== ingredientId));
  };

  const getRecipeTarget = (recipe: Recipe) => {
    const raw = recipeTargets[recipe.id];
    const parsed = Number(raw);
    return Math.max(1, Number.isFinite(parsed) ? parsed : 1);
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
    setReadyText("");
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

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn" onClick={() => setInputMode("manual")}>Ingredientes manual</button>
            <button type="button" className="btn" onClick={() => setInputMode("ready")}>Receita pronta</button>
          </div>

          {inputMode === "manual" ? (
            <div className="grid cards-3">
              <select className="input" value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)}>
                {ingredientes.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
              <input className="input" type="number" placeholder="Gramas na receita" value={grams} onChange={(e) => setGrams(e.target.value)} min={0} step="0.1" />
              <button type="button" className="btn" onClick={addItem}>Adicionar ingrediente</button>
            </div>
          ) : (
            <div className="panel section" style={{ boxShadow: "none", padding: 12 }}>
              <div className="grid cards-2" style={{ marginBottom: 8 }}>
                <input
                  className="input"
                  type="number"
                  placeholder="Rende quantos cookies (ex: 30)"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  min={1}
                  step="1"
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Peso por cookie em gramas (ex: 100)"
                  value={unitWeightGrams}
                  onChange={(e) => setUnitWeightGrams(e.target.value)}
                  min={1}
                  step="0.1"
                />
              </div>
              <p className="muted" style={{ margin: "0 0 8px" }}>
                Esta receita colada rende {Math.max(1, Math.floor(Number(yieldQuantity) || 1))} cookies de {Math.max(1, Number(unitWeightGrams) || 1).toFixed(0)} g cada.
              </p>
              <p className="stat-label" style={{ marginBottom: 8 }}>Cole a receita completa aqui (ingredientes com g/kg/ml).</p>
              <textarea
                className="input"
                style={{ width: "100%", minHeight: 140, resize: "vertical" }}
                placeholder="Ex: 120 g de farinha de trigo"
                value={readyText}
                onChange={(e) => setReadyText(e.target.value)}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={applyReadyText}>Aplicar receita pronta</button>
                <div className="muted">Linhas lidas: {parsedReadyLines.length}</div>
              </div>
              {parsedReadyLines.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {parsedReadyLines.map((line, idx) => (
                    <div key={`${line.sourceLine}-${idx}`}>
                      {line.name}: {line.grams.toFixed(1)} {line.baseUnit} {line.ingredientId ? "" : "(nao encontrado)"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="panel section" style={{ boxShadow: "none" }}>
              <strong>Ingredientes da receita</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {items.map((item) => {
                  const ing = ingredientes.find((x) => x.id === item.ingredientId);
                  return (
                    <div key={item.ingredientId} className="list-row">
                      <span>{ing?.name ?? "Ingrediente"} - {item.grams.toFixed(1)} {displayBaseUnitForIngredient(ing)}</span>
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
                return <div key={item.ingredientId}>{ing?.name}: {needed.toFixed(1)} {displayBaseUnitForIngredient(ing)}</div>;
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
            const targetForRecipe = getRecipeTarget(receita);

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

                <div className="panel section" style={{ boxShadow: "none", marginTop: 12 }}>
                  <p className="stat-label">Ingredientes da receita (lote)</p>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {receita.ingredients.map((item) => (
                      <div key={item.id}>
                        {item.ingredient.name}: {item.grams.toFixed(1)} {displayBaseUnitForIngredient(item.ingredient)} (para {receita.yieldQuantity} unid.)
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel section" style={{ boxShadow: "none", marginTop: 12 }}>
                  <p className="stat-label">Calcular ingredientes para outra quantidade</p>
                  <div className="grid cards-2" style={{ marginTop: 8 }}>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      step="1"
                      value={recipeTargets[receita.id] ?? ""}
                      placeholder="Ex: 1, 5, 6, 30"
                      onChange={(e) =>
                        setRecipeTargets((prev) => ({
                          ...prev,
                          [receita.id]: e.target.value,
                        }))
                      }
                    />
                    <div className="muted">Unidades desejadas: {targetForRecipe}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    {receita.ingredients.map((item) => {
                      const needed = (item.grams * targetForRecipe) / Math.max(1, receita.yieldQuantity || 1);
                      return (
                        <div key={item.id}>
                          {item.ingredient.name}: {needed.toFixed(1)} {displayBaseUnitForIngredient(item.ingredient)}
                        </div>
                      );
                    })}
                    <div>
                      <strong>Custo estimado para {targetForRecipe} unid.: {formatMoney(costUnit * targetForRecipe)}</strong>
                    </div>
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


















