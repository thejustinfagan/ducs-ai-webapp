import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Contact {
  id: number;
  grade: string;
  score: number;
  target_type: string;
  contact_label: string;
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
  street_address: string;
  entity_name: string;
  entity_type: string;
  registered_agent: string;
  principal_office: string;
  source_1: string;
  source_2: string;
  confidence: string;
  usefulness_note: string;
  next_action: string;
  retrieved_at: string;
  postal_code: string;
  county: string;
  latitude: string;
  longitude: string;
  linkedin_url: string;
  x_url: string;
  facebook_url: string;
  instagram_url: string;
  social_profile_links_found: string;
  public_site_enriched_at: string;
  inspection_date: string;
  inspection_score: string;
  inspection_type: string;
  facility_type: string;
  facility_category: string;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  grade?: string;
  state?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

export async function searchContacts(query: string, filters: SearchFilters = {}, limit = 100): Promise<Contact[]> {
  let builder = supabase
    .from('contacts')
    .select('*')
    .limit(limit);

  // Full-text search if query provided
  if (query) {
    builder = builder.or(
      `person_name.ilike.%${query}%,role_title.ilike.%${query}%,company.ilike.%${query}%,trade_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`
    );
  }

  // Apply filters
  if (filters.grade) {
    builder = builder.eq('grade', filters.grade);
  }
  if (filters.state) {
    builder = builder.eq('state', filters.state);
  }
  if (filters.hasEmail) {
    builder = builder.neq('email', '');
  }
  if (filters.hasPhone) {
    builder = builder.neq('phone', '');
  }

  const { data, error } = await builder;
  if (error) throw error;
  return data || [];
}

export async function getFilters() {
  // Get distinct grades and states
  const { data: grades } = await supabase.rpc('get_distinct_grades');
  const { data: states } = await supabase.rpc('get_distinct_states');
  
  return {
    grades: grades || [],
    states: states || [],
  };
}

export async function getStats() {
  const { count: total } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
  
  const { data: gradeData } = await supabase
    .from('contacts')
    .select('grade')
    .not('grade', 'is', null);
  
  const byGrade = gradeData?.reduce((acc, g) => {
    acc[g.grade] = (acc[g.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const { count: withEmail } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).not('email', 'is', null).neq('email', '');
  const { count: withPhone } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).not('phone', 'is', null).neq('phone', '');
  
  return {
    total: total || 0,
    byGrade,
    withEmail: withEmail || 0,
    withPhone: withPhone || 0,
  };
}