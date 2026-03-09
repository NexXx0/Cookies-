"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import DashboardCards from "@/components/DashboardCards";
import EstoqueBaixo from "@/components/EstoqueBaixo";
import GraficoVendas from "@/components/GraficoVendas";
import GraficoLucro from "@/components/GraficoLucro";

type DashboardData = {
  receitaTotal: number;
  custoTotal: number;
  lucroTotal: number;
  vendasRealizadas: number;
  sabores: Array<{ recipeId: string; name: string; quantity: number }>;
  lucroTrend: Array<{ label: string; value: number }>;
  estoqueBaixo: Array<{ id: string; name: string; quantity: number }>;
};

function todayValue() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function Dashboard() {
  const [from, setFrom] = useState(todayValue);
  const [to, setTo] = useState(todayValue);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/dashboard?from=${from}&to=${to}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error((json as { error?: string })?.error ?? "Falha ao carregar dashboard.");
      }

      setData(json as DashboardData);
    } catch {
      setData(null);
      setError("Nao foi possivel carregar o dashboard. Verifique o terminal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Bom dia!</h1>
          <p className="page-subtitle">Aqui esta o resumo do seu negocio hoje.</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              De
            </div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Ate
            </div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={loadData}>
            Filtrar
          </button>
        </div>
      </section>

      {error ? (
        <section className="panel section" style={{ color: "#a6372f", marginBottom: 16 }}>
          {error}
        </section>
      ) : null}

      {loading || !data ? (
        <section className="panel section">Carregando painel...</section>
      ) : (
        <>
          <DashboardCards
            receitaTotal={data.receitaTotal}
            custoTotal={data.custoTotal}
            lucroTotal={data.lucroTotal}
            vendasRealizadas={data.vendasRealizadas}
          />

          {data.estoqueBaixo.length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div className="alert">
                <div>
                  <strong>Atencao: ingredientes com estoque baixo</strong>
                  <div>Alguns ingredientes estao abaixo do minimo. Confira abaixo.</div>
                </div>
                <a href="/ingredientes" className="btn btn-primary">
                  Ver ingredientes
                </a>
              </div>
            </section>
          )}

          <section style={{ marginTop: 16 }}>
            <EstoqueBaixo ingredientes={data.estoqueBaixo} />
          </section>

          <section className="grid cards-2" style={{ marginTop: 16 }}>
            <GraficoVendas dados={data.sabores} />
            <GraficoLucro dados={data.lucroTrend} />
          </section>
        </>
      )}
    </AppShell>
  );
}
