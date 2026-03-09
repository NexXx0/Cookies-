"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Unit = "g" | "kg";

type Ingredient = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: Unit;
};

type EditRow = {
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
};

export default function IngredientesPage() {
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
  const [edits, setEdits] = useState<Record<string, EditRow>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("g");
  const [message, setMessage] = useState("");

  const loadIngredientes = async () => {
    setLoading(true);
    const res = await fetch("/api/ingredientes");
    const data = (await res.json()) as Ingredient[];
    setIngredientes(data);

    const nextEdits: Record<string, EditRow> = {};
    for (const ing of data) {
      nextEdits[ing.id] = {
        name: ing.name,
        price: String(ing.price),
        quantity: String(ing.quantity),
        unit: ing.unit || "g",
      };
    }
    setEdits(nextEdits);
    setLoading(false);
  };

  useEffect(() => {
    loadIngredientes();
  }, []);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const parsedPrice = price.trim();
    const parsedQuantity = quantity.trim();

    const res = await fetch("/api/ingredientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: parsedPrice, quantity: parsedQuantity, unit }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Nao foi possivel cadastrar ingrediente.");
      return;
    }

    setName("");
    setPrice("");
    setQuantity("");
    setUnit("g");
    setMessage("Ingrediente cadastrado com sucesso.");
    await loadIngredientes();
  };

  const updateEdit = (id: string, patch: Partial<EditRow>) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const salvarLinha = async (id: string) => {
    const row = edits[id];
    if (!row) return;

    const parsedPrice = row.price.trim();
    const parsedQuantity = row.quantity.trim();

    const res = await fetch(`/api/ingredientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: row.name, price: parsedPrice, quantity: parsedQuantity, unit: row.unit }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Nao foi possivel atualizar ingrediente.");
      return;
    }

    setMessage("Ingrediente atualizado.");
    await loadIngredientes();
  };

  const deletarLinha = async (id: string) => {
    const ok = confirm("Deseja realmente deletar este ingrediente?");
    if (!ok) return;

    const res = await fetch(`/api/ingredientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Nao foi possivel deletar ingrediente.");
      return;
    }

    setMessage("Ingrediente deletado.");
    await loadIngredientes();
  };

  return (
    <AppShell>
      <section className="panel section">
        <h1 className="page-title" style={{ fontSize: 36 }}>Ingredientes</h1>
        <p className="page-subtitle">Cadastre, edite e delete ingredientes com preco e peso.</p>

        <form onSubmit={onCreate} className="grid cards-3" style={{ marginTop: 16 }}>
          <input className="input" placeholder="Nome do ingrediente" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" type="text" inputMode="decimal" placeholder="Preco (ex: 12,50)" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" type="text" inputMode="decimal" placeholder="Peso (ex: 1 ou 0,5)" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ flex: 1 }} />
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" style={{ gridColumn: "1 / -1" }}>Adicionar ingrediente</button>
        </form>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}

        {loading ? (
          <p style={{ marginTop: 16 }}>Carregando ingredientes...</p>
        ) : (
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Preco</th>
                  <th>Peso</th>
                  <th>Unidade</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {ingredientes.map((ing) => {
                  const row = edits[ing.id];
                  return (
                    <tr key={ing.id}>
                      <td>
                        <input className="input" value={row?.name ?? ""} onChange={(e) => updateEdit(ing.id, { name: e.target.value })} />
                      </td>
                      <td>
                        <input className="input" type="text" inputMode="decimal" value={row?.price ?? ""} onChange={(e) => updateEdit(ing.id, { price: e.target.value })} />
                      </td>
                      <td>
                        <input className="input" type="text" inputMode="decimal" value={row?.quantity ?? ""} onChange={(e) => updateEdit(ing.id, { quantity: e.target.value })} />
                      </td>
                      <td>
                        <select className="input" value={row?.unit ?? "g"} onChange={(e) => updateEdit(ing.id, { unit: e.target.value as Unit })}>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                        </select>
                      </td>
                      <td style={{ display: "flex", gap: 8 }}>
                        <button className="btn" type="button" onClick={() => salvarLinha(ing.id)}>Salvar</button>
                        <button className="btn" type="button" onClick={() => deletarLinha(ing.id)}>Deletar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
