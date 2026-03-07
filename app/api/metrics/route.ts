/**
 * SOFIA Metrics Dashboard API
 * GET /api/metrics
 *
 * Redirects to dedicated metric routes for backward compatibility
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const allowedViews = ['stats', 'dashboard', 'sessions'] as const
  const view = searchParams.get('view') || 'stats'

  // Validate view parameter to prevent open redirect
  if (!allowedViews.includes(view as typeof allowedViews[number])) {
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
  }

  // Redirect to new dedicated route (HTTP 307 - temporary redirect)
  const targetUrl = new URL(`/api/metrics/${view}`, request.url)
  searchParams.delete('view')
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value))

  return NextResponse.redirect(targetUrl, 307)
}
