"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppNotification,
  clearAllNotifications,
  markAllNotificationsRead,
  notificationEventName,
  readAppNotifications,
} from "@/lib/clientNotifications";

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

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [openNotifications, setOpenNotifications] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

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

  useEffect(() => {
    const load = () => setNotifications(readAppNotifications());
    load();

    window.addEventListener(notificationEventName, load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener(notificationEventName, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const openBell = () => {
    if (!openNotifications) {
      markAllNotificationsRead();
      setNotifications(readAppNotifications());
    }
    setOpenNotifications((prev) => !prev);
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
            <div className="notification-wrap">
              <button type="button" className="btn notification-btn" onClick={openBell}>
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
              </button>

              {openNotifications ? (
                <div className="notification-dropdown panel">
                  <div className="notification-header">
                    <strong>Notificacoes</strong>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        clearAllNotifications();
                        setNotifications([]);
                      }}
                    >
                      Limpar
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>Sem notificacoes.</div>
                  ) : (
                    <div className="notification-list">
                      {notifications.slice(0, 12).map((item) => (
                        <div key={item.id} className="notification-item">
                          <div><strong>{item.title}</strong></div>
                          <div className="muted" style={{ fontSize: 12 }}>{item.message}</div>
                          <div className="muted" style={{ fontSize: 11 }}>{formatWhen(item.createdAt)}</div>
                          {item.href ? (
                            <Link href={item.href} className="btn" onClick={() => setOpenNotifications(false)}>
                              Abrir
                            </Link>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

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
