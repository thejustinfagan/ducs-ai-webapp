export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { searchContacts, getFilters, getStats, advancedSearchContacts, updateContactTags, updateContactNotes, markAsContacted, exportContactsToCsv } from '@/lib/db';

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const grade = searchParams.get('grade') || undefined;
  const state = searchParams.get('state') || undefined;
  const hasEmail = searchParams.get('hasEmail') === 'true';
  const hasPhone = searchParams.get('hasPhone') === 'true';
  const action = searchParams.get('action');
  
  try {
    // Advanced search
    if (action === 'advanced') {
      const filters = {
        grade: searchParams.get('grade') || undefined,
        state: searchParams.get('state') || undefined,
        hasEmail: searchParams.get('hasEmail') === 'true',
        hasPhone: searchParams.get('hasPhone') === 'true',
        scoreMin: searchParams.get('scoreMin') ? parseInt(searchParams.get('scoreMin')!) : undefined,
        scoreMax: searchParams.get('scoreMax') ? parseInt(searchParams.get('scoreMax')!) : undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        brandKeywords: searchParams.get('brandKeywords') || undefined,
        tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',').filter(t => t) : undefined,
        category: searchParams.get('category') as 'direct_outreach' | 'location_verification' | undefined,
      };
      const results = advancedSearchContacts(filters);
      return NextResponse.json({ results });
    }
    
    // Get contact by ID
    if (action === 'getContact') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });
      }
      const { getContactById } = await import('@/lib/db');
      const contact = getContactById(parseInt(id));
      return NextResponse.json({ contact });
    }
    
    // CSV export
    if (action === 'export') {
      const ids = searchParams.get('ids');
      const contactIds = ids ? ids.split(',').map(id => parseInt(id)) : undefined;
      const csv = exportContactsToCsv(contactIds);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="contacts-export.csv"',
        },
      });
    }
    
    // Regular search
    const results = searchContacts(query, { grade, state, hasEmail, hasPhone });
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 });
  }
}

export const POST = async (request: NextRequest) => {
  const action = request.nextUrl.searchParams.get('action');
  
  try {
    if (action === 'filters') {
      const filters = getFilters();
      return NextResponse.json(filters);
    }
    
    if (action === 'stats') {
      const stats = getStats();
      return NextResponse.json(stats);
    }
    
    if (action === 'updateTags') {
      const body = await request.json();
      const { id, tags } = body;
      if (!id || !Array.isArray(tags)) {
        return NextResponse.json({ error: 'ID and tags array required' }, { status: 400 });
      }
      updateContactTags(id, tags);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'updateNotes') {
      const body = await request.json();
      const { id, notes } = body;
      if (id === undefined || notes === undefined) {
        return NextResponse.json({ error: 'ID and notes required' }, { status: 400 });
      }
      updateContactNotes(id, notes);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'markContacted') {
      const body = await request.json();
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
      }
      markAsContacted(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Request failed', details: String(error) }, { status: 500 });
  }
}