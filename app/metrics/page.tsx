/**
 * SOFIA Metrics Dashboard
 * Página para visualizar métricas do sistema
 */

'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  total_requests: number
  unique_sessions: number
  total_tokens: number
  total_cost: number
  avg_latency_ms: number
  total_chunks_retrieved: number
}

interface DailyMetric {
  date: string
  requests: number
  unique_sessions: number
  tokens: number
  cost: number
  avg_latency_ms: number
  chunks: number
}

export default function MetricsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  useEffect(() => {
    fetchMetrics()
  }, [period])

  async function fetchMetrics() {
    setLoading(true)
    try {
      const [statsRes, dashboardRes] = await Promise.all([
        fetch(`/api/metrics/stats?period=${period}`),
        fetch(`/api/metrics/dashboard?period=${period}`)
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setDailyMetrics(dashboardData.data || [])
      }
    } catch (error) {
      logger.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SOFIA Metrics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitoramento de uso e performance
          </p>
        </div>
        
        <select 
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={1}>Hoje</option>
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-2xl">
                {stats.total_requests?.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sessões Únicas</CardDescription>
              <CardTitle className="text-2xl">
                {stats.unique_sessions?.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tokens</CardDescription>
              <CardTitle className="text-2xl">
                {((stats.total_tokens || 0) / 1000).toFixed(1)}K
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Custo Total</CardDescription>
              <CardTitle className="text-2xl">
                ${(stats.total_cost || 0).toFixed(4)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latência Média</CardDescription>
              <CardTitle className="text-2xl">
                {stats.avg_latency_ms || 0}ms
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Chunks Recuperados</CardDescription>
              <CardTitle className="text-2xl">
                {stats.total_chunks_retrieved?.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Diárias</CardTitle>
          <CardDescription>
            Últimos {period} dias de atividade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Data</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Sessões</th>
                  <th className="text-right py-3 px-4">Tokens</th>
                  <th className="text-right py-3 px-4">Custo</th>
                  <th className="text-right py-3 px-4">Latência</th>
                  <th className="text-right py-3 px-4">Chunks</th>
                </tr>
              </thead>
              <tbody>
                {dailyMetrics.map((day, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">
                      {new Date(day.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="text-right py-3 px-4">
                      {day.requests?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-3 px-4">
                      {day.unique_sessions?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-3 px-4">
                      {((day.tokens || 0) / 1000).toFixed(1)}K
                    </td>
                    <td className="text-right py-3 px-4">
                      ${(day.cost || 0).toFixed(4)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {day.avg_latency_ms || 0}ms
                    </td>
                    <td className="text-right py-3 px-4">
                      {day.chunks?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Custo Estimado</CardTitle>
            <CardDescription>Baseado em GPT-4o-mini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input:</span>
                <span>$0.15 / 1M tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output:</span>
                <span>$0.60 / 1M tokens</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Custo total:</span>
                <span>${(stats?.total_cost || 0).toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Métricas de latência</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Média:</span>
                <span>{stats?.avg_latency_ms || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chunks/req:</span>
                <span>
                  {stats?.total_requests 
                    ? ((stats.total_chunks_retrieved || 0) / stats.total_requests).toFixed(1)
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
