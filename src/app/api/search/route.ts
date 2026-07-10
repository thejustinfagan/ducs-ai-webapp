export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { searchContacts, getFilters, getStats } from '@/lib/db';

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const grade = searchParams.get('grade') || undefined;
  const state = searchParams.get('state') || undefined;
  const hasEmail = searchParams.get('hasEmail') === 'true';
  const hasPhone = searchParams.get('hasPhone') === 'true';
  
  try {
    const results = searchContacts(query, { grade, state, hasEmail, hasPhone });
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 });
  }
}

export const POST = async (request: NextRequest) => {
  const action = request.nextUrl.searchParams.get('action');
  
  if (action === 'filters') {
    const filters = getFilters();
    return NextResponse.json(filters);
  }
  
  if (action === 'stats') {
    const stats = getStats();
    return NextResponse.json(stats);
  }
  
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}