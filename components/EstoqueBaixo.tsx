type Ingredient = {
  id: string;
  name: string;
  quantity: number;
};

export default function EstoqueBaixo({ ingredientes }: { ingredientes: Ingredient[] }) {
  if (!ingredientes.length) {
    return null;
  }

  return (
    <section className="grid cards-3">
      {ingredientes.slice(0, 3).map((item) => (
        <article className="panel section" key={item.id}>
          <div className="list-row">
            <div>
              <strong>{item.name}</strong>
              <div className="muted">{item.quantity.toFixed(0)}g restantes</div>
            </div>
            <span className="pill">Baixo</span>
          </div>
        </article>
      ))}
    </section>
  );
}
