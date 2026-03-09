type Flavor = {
  recipeId: string;
  name: string;
  quantity: number;
};

export default function GraficoVendas({ dados }: { dados: Flavor[] }) {
  if (!dados.length) {
    return (
      <article className="panel section">
        <h3 style={{ marginTop: 0 }}>Vendas por Sabor</h3>
        <p className="muted">Sem vendas no periodo selecionado.</p>
      </article>
    );
  }

  const maxValue = Math.max(...dados.map((d) => d.quantity), 1);

  return (
    <article className="panel section">
      <h3 style={{ marginTop: 0 }}>Vendas por Sabor</h3>
      <p className="muted">Distribuicao por receita vendida</p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {dados.slice(0, 5).map((d) => (
          <div key={d.recipeId}>
            <div className="list-row">
              <span>{d.name}</span>
              <strong>{d.quantity} unid.</strong>
            </div>
            <div style={{ background: "#eee5dc", height: 9, borderRadius: 999, marginTop: 6 }}>
              <div
                style={{
                  width: `${(d.quantity / maxValue) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "var(--brand)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
