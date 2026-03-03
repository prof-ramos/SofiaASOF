import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SOFIA — ASOF',
  description:
    'Suporte Orientado às Funções e Interesses dos Associados · Agente de IA da ASOF para orientação sobre a carreira de Oficial de Chancelaria do Serviço Exterior Brasileiro.',
  openGraph: {
    title: 'SOFIA — ASOF',
    description:
      'Agente de IA da ASOF para orientação sobre a carreira de Oficial de Chancelaria do Serviço Exterior Brasileiro.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
