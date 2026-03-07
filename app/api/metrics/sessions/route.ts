import { NextResponse } from 'next/server'
import { getRecentSessions } from '@/lib/metrics'

export async function GET() {
  try {
    const data = await getRecentSessions(20)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Metrics/Sessions]', { route: 'metrics/sessions', error })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
