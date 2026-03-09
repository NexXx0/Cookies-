function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type Props = {
  receitaTotal: number;
  custoTotal: number;
  lucroTotal: number;
  vendasRealizadas: number;
};

export default function DashboardCards({ receitaTotal, custoTotal, lucroTotal, vendasRealizadas }: Props) {
  const cards = [
    { label: "Receita Total", value: formatCurrency(receitaTotal), note: "No periodo", color: "var(--text)" },
    { label: "Custo de Producao", value: formatCurrency(custoTotal), note: "No periodo", color: "var(--text)" },
    { label: "Lucro Liquido", value: formatCurrency(lucroTotal), note: "No periodo", color: "var(--success)" },
    { label: "Vendas Realizadas", value: String(vendasRealizadas), note: "Unidades", color: "var(--text)" },
  ];

  return (
    <section className="grid cards-4">
      {cards.map((card) => (
        <article key={card.label} className="panel stat-card">
          <p className="stat-label">{card.label}</p>
          <p className="stat-value" style={{ color: card.color }}>
            {card.value}
          </p>
          <p className="stat-note">{card.note}</p>
        </article>
      ))}
    </section>
  );
}
