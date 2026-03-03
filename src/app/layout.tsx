import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOFIA - ASOF",
  description: "Agente de IA da ASOF - Suporte Orientado às Funções e Interesses dos Associados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
