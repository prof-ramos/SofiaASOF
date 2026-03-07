import { NextRequest, NextResponse } from 'next/server'
import { getStats } from '@/lib/metrics'

export async function GET(request: NextRequest) {
  const period = parseInt(request.nextUrl.searchParams.get('period') || '7', 10)
  if (!Number.isInteger(period) || period < 1 || period > 365) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  try {
    const data = await getStats(period)
    return NextResponse.json({
      success: true,
      period: `${period} days`,
      data,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
