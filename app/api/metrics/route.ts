/**
 * SOFIA Metrics Dashboard API
 * GET /api/metrics
 * 
 * Retorna estatísticas agregadas do sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStats, getDashboard, getRecentSessions } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || '7'
  const view = searchParams.get('view') || 'stats'
  
  try {
    switch (view) {
      case 'dashboard':
        const dashboardData = await getDashboard(parseInt(period))
        return NextResponse.json({
          success: true,
          data: dashboardData
        })
      
      case 'sessions':
        const sessions = await getRecentSessions(20)
        return NextResponse.json({
          success: true,
          data: sessions
        })
      
      case 'stats':
      default:
        const stats = await getStats(parseInt(period))
        return NextResponse.json({
          success: true,
          period: `${period} days`,
          data: stats
        })
    }
  } catch (error) {
    console.error('Metrics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics' 
      },
      { status: 500 }
    )
  }
}
