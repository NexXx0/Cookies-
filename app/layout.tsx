import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DuetoCookies",
  description: "Gestao de vendas, receitas e ingredientes para confeitaria",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

