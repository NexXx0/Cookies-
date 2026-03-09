"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ingredientes", label: "Ingredientes" },
  { href: "/receitas", label: "Receitas" },
  { href: "/vendas", label: "Vendas" },
];

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (data.user) setUserName(data.user.name);
      })
      .catch(() => {
        setUserName("");
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="topbar">
          <div className="brand">
            <span className="brand-badge">CK</span>
            <span>DuetoCookies</span>
          </div>

          <nav className="topnav">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={isActive ? "active" : ""}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="muted">{userName || "Conta"}</div>
            <button type="button" className="btn" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}

