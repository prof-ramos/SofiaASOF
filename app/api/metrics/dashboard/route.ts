import { NextRequest, NextResponse } from 'next/server'
import { getDashboard } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const period = parseInt(request.nextUrl.searchParams.get('period') || '30', 10)
  if (!Number.isInteger(period) || period < 1 || period > 365) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  try {
    const data = await getDashboard(period)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    )
  }
}
