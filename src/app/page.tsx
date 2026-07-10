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
}

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

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedGrade) params.set('grade', selectedGrade);
    if (selectedState) params.set('state', selectedState);
    if (hasEmail) params.set('hasEmail', 'true');
    if (hasPhone) params.set('hasPhone', 'true');
    
    try {
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedGrade, selectedState, hasEmail, hasPhone]);

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
          </div>
          
          {/* Filters */}
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
        </div>
      </header>

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
          {results.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
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
                  </div>
                  
                  <div className="text-gray-700 mb-3">
                    <span className="font-medium">{contact.trade_name || contact.company}</span>
                    {contact.city && contact.state && (
                      <span className="text-gray-500 ml-2">• {contact.city}, {contact.state}</span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
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
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {contact.profile_url && (
                    <a
                      href={contact.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Profile →
                    </a>
                  )}
                  {contact.contact_page_url && (
                    <a
                      href={contact.contact_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Contact →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {!loading && results.length > 0 && (
          <div className="text-center mt-6 text-sm text-gray-500">
            Showing {results.length} of {stats?.total.toLocaleString()} contacts
          </div>
        )}
      </main>
    </div>
  );
}