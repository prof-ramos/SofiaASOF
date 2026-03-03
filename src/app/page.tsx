import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">SOFIA</h1>
        <p className="text-sm text-gray-600">
          Agente de IA da ASOF - Oficial de Chancelaria
        </p>
      </header>
      <Chat />
    </main>
  );
}
