'use client';

import { useState, useEffect, useCallback } from 'react';

interface Contact {
  id: number;
  grade: string;
  score: number;
  person_name: string;
  role_title: string;
  company: string;
  trade_name: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  website: string;
  profile_url: string;
  contact_page_url: string;
  confidence: string;
  tags: string;
  notes: string;
  last_contacted_at: string | null;
}

interface Filters {
  grades: string[];
  states: string[];
  companies: string[];
}

interface Stats {
  total: number;
  byGrade: Record<string, number>;
  withEmail: number;
  withPhone: number;
  byCategory?: Record<string, { count: number; avg_score: number }>;
}

interface AdvancedFilters {
  grade?: string;
  state?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  brandKeywords?: string;
  category?: 'direct_outreach' | 'location_verification' | 'all';
}

const TAG_OPTIONS = [
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'follow-up', label: 'Follow-up', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-800' },
  { value: 'do-not-contact', label: 'Do Not Contact', color: 'bg-red-100 text-red-800' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);
  
  // Notes modal
  const [editingNotes, setEditingNotes] = useState<{ id: number; notes: string; personName: string } | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);
  
  // Tag dropdown
  const [tagDropdown, setTagDropdown] = useState<{ id: number; x: number; y: number } | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    // Check if using advanced filters
    const hasAdvancedFilters = Object.values(advancedFilters).some(v => v !== undefined && v !== '');
    
    if (hasAdvancedFilters) {
      params.set('action', 'advanced');
      if (advancedFilters.grade) params.set('grade', advancedFilters.grade);
      if (advancedFilters.state) params.set('state', advancedFilters.state);
      if (advancedFilters.hasEmail) params.set('hasEmail', 'true');
      if (advancedFilters.hasPhone) params.set('hasPhone', 'true');
      if (advancedFilters.scoreMin !== undefined) params.set('scoreMin', String(advancedFilters.scoreMin));
      if (advancedFilters.scoreMax !== undefined) params.set('scoreMax', String(advancedFilters.scoreMax));
      if (advancedFilters.dateFrom) params.set('dateFrom', advancedFilters.dateFrom);
      if (advancedFilters.dateTo) params.set('dateTo', advancedFilters.dateTo);
      if (advancedFilters.brandKeywords) params.set('brandKeywords', advancedFilters.brandKeywords);
      if (advancedFilters.category && advancedFilters.category !== 'all') params.set('category', advancedFilters.category);
    } else {
      if (query) params.set('q', query);
      if (selectedGrade) params.set('grade', selectedGrade);
      if (selectedState) params.set('state', selectedState);
      if (hasEmail) params.set('hasEmail', 'true');
      if (hasPhone) params.set('hasPhone', 'true');
    }
    
    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedGrade, selectedState, hasEmail, hasPhone, advancedFilters]);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await fetch('/api/search?action=filters');
      const data = await res.json();
      setFilters(data);
    };
    
    const loadStats = async () => {
      const res = await fetch('/api/search?action=stats');
      const data = await res.json();
      setStats(data);
    };
    
    loadFilters();
    loadStats();
    search();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectAllMode) {
      setSelectedIds(new Set());
      setSelectAllMode(false);
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
      setSelectAllMode(true);
    }
  };

  const updateTags = async (id: number, currentTags: string) => {
    const tags = currentTags ? currentTags.split(',').filter(t => t) : [];
    const res = await fetch('/api/search?action=updateTags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tags }),
    });
    if (res.ok) {
      setResults(results.map(r => r.id === id ? { ...r, tags: tags.join(',') } : r));
    }
  };

  const addTag = (id: number, currentTags: string, tag: string) => {
    const tags = currentTags ? currentTags.split(',').filter(t => t) : [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      updateTags(id, tags.join(','));
    }
    setTagDropdown(null);
  };

  const removeTag = (id: number, currentTags: string, tagToRemove: string) => {
    const tags = currentTags ? currentTags.split(',').filter(t => t !== tagToRemove) : [];
    updateTags(id, tags.join(','));
  };

  const saveNotes = async () => {
    if (!editingNotes) return;
    setNotesSaving(true);
    const res = await fetch('/api/search?action=updateNotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingNotes.id, notes: editingNotes.notes }),
    });
    if (res.ok) {
      setResults(results.map(r => r.id === editingNotes.id ? { ...r, notes: editingNotes.notes } : r));
      setEditingNotes(null);
    }
    setNotesSaving(false);
  };

  const markAsContacted = async (id: number) => {
    const res = await fetch('/api/search?action=markContacted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setResults(results.map(r => r.id === id ? { ...r, last_contacted_at: new Date().toISOString(), tags: r.tags ? `${r.tags},contacted` : 'contacted' } : r));
    }
  };

  const exportCsv = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds).join(',') : null;
    const params = new URLSearchParams();
    params.set('action', 'export');
    if (ids) params.set('ids', ids);
    
    window.open(`/api/search?${params}`, '_blank');
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({});
  };

  const getTagColor = (tag: string) => {
    const option = TAG_OPTIONS.find(t => t.value === tag);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  const parseTags = (tagsStr: string): string[] => {
    if (!tagsStr) return [];
    return tagsStr.split(',').filter(t => t);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">DUCs.ai</h1>
            {stats && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{stats.total.toLocaleString()}</span> contacts
                {' • '}
                <span className="text-green-600">{stats.withEmail.toLocaleString()}</span> with email
                {' • '}
                <span className="text-blue-600">{stats.withPhone.toLocaleString()}</span> with phone
                {stats.byCategory && (
                  <>
                    {' • '}
                    <span className="text-purple-600 font-medium">{stats.byCategory.direct_outreach?.count.toLocaleString() || 0}</span> direct outreach
                    {' '}(avg score: {stats.byCategory.direct_outreach?.avg_score || 0})
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company, email, phone, location..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-3 border rounded-lg text-sm font-medium ${showAdvancedFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
            </button>
          </div>
          
          {/* Basic Filters */}
          <div className="flex flex-wrap gap-3 mt-4 items-center">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Grades</option>
              {filters?.grades.map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
            
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All States</option>
              {filters?.states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasEmail}
                onChange={(e) => setHasEmail(e.target.checked)}
                className="rounded border-gray-300"
              />
              Has email
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasPhone}
                onChange={(e) => setHasPhone(e.target.checked)}
                className="rounded border-gray-300"
              />
              Has phone
            </label>
            
            {stats && (
              <div className="ml-auto text-xs text-gray-500">
                {Object.entries(stats.byGrade).map(([grade, count]) => (
                  <span key={grade} className="mr-3">
                    <span className={`font-medium ${grade === 'A' ? 'text-green-600' : grade === 'B' ? 'text-yellow-600' : 'text-gray-600'}`}>
                      Grade {grade}: {count.toLocaleString()}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Advanced Filters</h3>
                <button onClick={clearAdvancedFilters} className="text-sm text-blue-600 hover:underline">Clear all</button>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-white border border-gray-200 rounded-md hover:border-purple-300">
                  <input
                    type="checkbox"
                    checked={advancedFilters.category === 'direct_outreach'}
                    onChange={(e) => setAdvancedFilters({ 
                      ...advancedFilters, 
                      category: e.target.checked ? 'direct_outreach' : undefined 
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">⭐ Direct Outreach Only</span>
                    <p className="text-xs text-gray-500">Show only high-value contacts with email/phone (brokers, franchise filing contacts)</p>
                  </div>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score Min</label>
                  <input
                    type="number"
                    value={advancedFilters.scoreMin ?? ''}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, scoreMin: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score Max</label>
                  <input
                    type="number"
                    value={advancedFilters.scoreMax ?? ''}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, scoreMax: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={advancedFilters.dateFrom ?? ''}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={advancedFilters.dateTo ?? ''}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={advancedFilters.brandKeywords ?? ''}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, brandKeywords: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g., McDonald's, Starbucks, Subway"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Category</label>
                  <select
                    value={advancedFilters.category ?? 'all'}
                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Contacts</option>
                    <option value="direct_outreach">⭐ Direct Outreach Only</option>
                    <option value="location_verification">📍 Location/Verification Only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Direct Outreach = brokers + franchise contacts with emails</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border-b sticky top-[140px] z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={exportCsv}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Export CSV
              </button>
            </div>
            <button
              onClick={() => { setSelectedIds(new Set()); setSelectAllMode(false); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-8 text-gray-500">Searching...</div>
        )}
        
        {!loading && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No contacts found</p>
            <p className="text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}
        
        <div className="grid gap-4">
          {results.map((contact) => {
            const contactTags = parseTags(contact.tags);
            const isSelected = selectedIds.has(contact.id);
            
            return (
              <div key={contact.id} className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(contact.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        contact.grade === 'A' ? 'bg-green-100 text-green-800' :
                        contact.grade === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        Grade {contact.grade}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{contact.person_name || 'Unnamed'}</h3>
                      {contact.role_title && (
                        <span className="text-gray-600">— {contact.role_title}</span>
                      )}
                      
                      {/* Tags */}
                      {contactTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-auto">
                          {contactTags.map(tag => {
                            const option = TAG_OPTIONS.find(t => t.value === tag);
                            return (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-75 ${option?.color || 'bg-gray-100 text-gray-800'}`}
                                onClick={() => removeTag(contact.id, contact.tags, tag)}
                                title="Click to remove"
                              >
                                {option?.label || tag} ×
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Add Tag Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTagDropdown({ id: contact.id, x: rect.left, y: rect.bottom });
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          + Tag ▼
                        </button>
                        
                        {tagDropdown?.id === contact.id && (
                          <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[200px]">
                            <div className="p-2">
                              {TAG_OPTIONS.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => addTag(contact.id, contact.tags, option.value)}
                                  className={`w-full text-left px-3 py-2 text-sm rounded ${option.color} mb-1 hover:opacity-75 ${contactTags.includes(option.value) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  disabled={contactTags.includes(option.value)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <div className="border-t p-2">
                              <button
                                onClick={() => setTagDropdown(null)}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-gray-700 mb-3">
                      <span className="font-medium">{contact.trade_name || contact.company}</span>
                      {contact.city && contact.state && (
                        <span className="text-gray-500 ml-2">• {contact.city}, {contact.state}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      {contact.email && (
                        <button
                          onClick={() => copyToClipboard(contact.email, 'Email')}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                          title="Click to copy"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {contact.email}
                        </button>
                      )}
                      
                      {contact.phone && (
                        <button
                          onClick={() => copyToClipboard(contact.phone, 'Phone')}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                          title="Click to copy"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {contact.phone}
                        </button>
                      )}
                      
                      {contact.website && (
                        <a
                          href={contact.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          Website
                        </a>
                      )}
                      
                      {contact.last_contacted_at && (
                        <span className="text-gray-500 text-xs">
                          Last contacted: {new Date(contact.last_contacted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {/* Notes preview */}
                    {contact.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3">
                        <span className="font-medium">Notes:</span> {contact.notes.substring(0, 200)}{contact.notes.length > 200 ? '...' : ''}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingNotes({ id: contact.id, notes: contact.notes || '', personName: contact.person_name || 'Contact' })}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        ✏️ Edit Notes
                      </button>
                      <button
                        onClick={() => markAsContacted(contact.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        ✓ Mark Contacted
                      </button>
                      {contact.profile_url && (
                        <a
                          href={contact.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                        >
                          Profile →
                        </a>
                      )}
                      {contact.contact_page_url && (
                        <a
                          href={contact.contact_page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                        >
                          Contact →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
            <div>
              Showing {results.length} result{results.length !== 1 ? 's' : ''}
              {selectAllMode && ` (all on page selected)`}
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-blue-600 hover:underline"
            >
              {selectAllMode ? 'Deselect all' : 'Select all on page'}
            </button>
          </div>
        )}
      </main>

      {/* Notes Modal */}
      {editingNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-semibold mb-4">Notes for {editingNotes.personName}</h3>
            <textarea
              value={editingNotes.notes}
              onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add notes about this contact..."
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingNotes(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={notesSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {notesSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close tag dropdown */}
      {tagDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setTagDropdown(null)}
        />
      )}
    </div>
  );
}