type Point = {
  label: string;
  value: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function GraficoLucro({ dados }: { dados: Point[] }) {
  if (!dados.length) {
    return (
      <article className="panel section">
        <h3 style={{ marginTop: 0 }}>Tendencia de Lucro</h3>
        <p className="muted">Sem dados de lucro para exibir.</p>
      </article>
    );
  }

  const maxValue = Math.max(...dados.map((d) => d.value), 1);

  return (
    <article className="panel section">
      <h3 style={{ marginTop: 0 }}>Tendencia de Lucro</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {dados.map((point) => (
          <div key={point.label}>
            <div className="list-row">
              <span>{point.label}</span>
              <strong>{formatCurrency(point.value)}</strong>
            </div>
            <div style={{ background: "#eee5dc", height: 9, borderRadius: 999, marginTop: 6 }}>
              <div
                style={{
                  width: `${(point.value / maxValue) * 100}%`,
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
