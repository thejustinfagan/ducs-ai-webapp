import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'ducs-contacts.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
  }
  return db;
}

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
  postal_code: string;
  confidence: string;
  tags: string;
  notes: string;
  last_contacted_at: string | null;
}

export function searchContacts(query: string, filters?: { grade?: string; state?: string; hasEmail?: boolean; hasPhone?: boolean }): Contact[] {
  const db = getDb();
  
  let sql = `
    SELECT c.* FROM contacts c
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filters?.grade) {
    conditions.push('c.grade = ?');
    params.push(filters.grade);
  }
  
  if (filters?.state) {
    conditions.push('c.state = ?');
    params.push(filters.state);
  }
  
  if (filters?.hasEmail) {
    conditions.push("c.email != ''");
  }
  
  if (filters?.hasPhone) {
    conditions.push("c.phone != ''");
  }
  
  if (query && query.trim()) {
    const searchQuery = query.split(' ').map(q => `${q}*`).join(' ');
    sql += `
      JOIN contacts_fts fts ON c.id = fts.rowid
      WHERE contacts_fts MATCH ?
    `;
    params.push(searchQuery);
    
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }
  } else if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY c.score DESC, c.person_name LIMIT 100';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Contact[];
}

export interface AdvancedFilters {
  grade?: string;
  state?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  scoreMin?: number;
  scoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  brandKeywords?: string;
  tags?: string[];
}

export function advancedSearchContacts(filters: AdvancedFilters = {}): Contact[] {
  const db = getDb();
  
  let sql = `SELECT c.* FROM contacts c`;
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (filters.grade) {
    conditions.push('c.grade = ?');
    params.push(filters.grade);
  }
  
  if (filters.state) {
    conditions.push('c.state = ?');
    params.push(filters.state);
  }
  
  if (filters.hasEmail) {
    conditions.push("c.email != ''");
  }
  
  if (filters.hasPhone) {
    conditions.push("c.phone != ''");
  }
  
  if (filters.scoreMin !== undefined) {
    conditions.push('c.score >= ?');
    params.push(filters.scoreMin);
  }
  
  if (filters.scoreMax !== undefined) {
    conditions.push('c.score <= ?');
    params.push(filters.scoreMax);
  }
  
  if (filters.dateFrom) {
    conditions.push('c.created_at >= ?');
    params.push(filters.dateFrom);
  }
  
  if (filters.dateTo) {
    conditions.push('c.created_at <= ?');
    params.push(filters.dateTo);
  }
  
  if (filters.brandKeywords) {
    const keywords = filters.brandKeywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length > 0) {
      const keywordConditions = keywords.map(() => '(c.company LIKE ? OR c.trade_name LIKE ?)');
      conditions.push(`(${keywordConditions.join(' OR ')})`);
      keywords.forEach(k => {
        params.push(`%${k}%`);
        params.push(`%${k}%`);
      });
    }
  }
  
  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => 'c.tags LIKE ?');
    conditions.push(`(${tagConditions.join(' OR ')})`);
    filters.tags.forEach(tag => {
      params.push(`%${tag}%`);
    });
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY c.score DESC, c.person_name LIMIT 500';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params) as Contact[];
}

export function getFilters() {
  const db = getDb();
  
  const grades = db.prepare('SELECT DISTINCT grade FROM contacts ORDER BY grade').all();
  const states = db.prepare('SELECT DISTINCT state FROM contacts ORDER BY state').all();
  const companies = db.prepare('SELECT DISTINCT trade_name, company FROM contacts WHERE trade_name != "" ORDER BY trade_name LIMIT 50').all();
  
  return {
    grades: grades.map((g: any) => g.grade),
    states: states.map((s: any) => s.state),
    companies: companies.map((c: any) => c.trade_name || c.company),
  };
}

export function getStats() {
  const db = getDb();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
  const byGrade = db.prepare('SELECT grade, COUNT(*) as count FROM contacts GROUP BY grade ORDER BY grade').all() as Array<{ grade: string; count: number }>;
  const withEmail = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE email != ''").get() as { count: number };
  const withPhone = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE phone != ''").get() as { count: number };
  
  return {
    total: total.count,
    byGrade: byGrade.reduce((acc, g) => ({ ...acc, [g.grade]: g.count }), {}),
    withEmail: withEmail.count,
    withPhone: withPhone.count,
  };
}

export function updateContactTags(id: number, tags: string[]): void {
  const db = getDb();
  const tagsStr = tags.join(',');
  const stmt = db.prepare('UPDATE contacts SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(tagsStr, id);
}

export function updateContactNotes(id: number, notes: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE contacts SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(notes, id);
}

export function markAsContacted(id: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE contacts SET last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);
}

export function getContactById(id: number): Contact | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
  return stmt.get(id) as Contact | null;
}

export function exportContactsToCsv(contactIds?: number[]): string {
  const db = getDb();
  
  let sql = 'SELECT * FROM contacts';
  if (contactIds && contactIds.length > 0) {
    const placeholders = contactIds.map(() => '?').join(',');
    sql += ` WHERE id IN (${placeholders})`;
  }
  sql += ' ORDER BY score DESC, person_name';
  
  const stmt = db.prepare(sql);
  const contacts = contactIds && contactIds.length > 0 
    ? stmt.all(...contactIds) 
    : stmt.all();
  
  // CSV header
  const headers = [
    'id', 'grade', 'score', 'target_type', 'contact_label', 'person_name', 'role_title',
    'company', 'trade_name', 'city', 'state', 'email', 'phone', 'website',
    'profile_url', 'contact_page_url', 'street_address', 'postal_code', 'confidence',
    'tags', 'notes', 'last_contacted_at'
  ];
  
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = (contacts as any[]).map(c => 
    headers.map(h => escapeCsv(c[h])).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}