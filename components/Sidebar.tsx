import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="panel section" style={{ minWidth: 220 }}>
      <h2 style={{ marginTop: 0 }}>Menu</h2>
      <nav style={{ display: "grid", gap: 8 }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/ingredientes">Ingredientes</Link>
        <Link href="/receitas">Receitas</Link>
        <Link href="/vendas">Vendas</Link>
      </nav>
    </aside>
  );
}
