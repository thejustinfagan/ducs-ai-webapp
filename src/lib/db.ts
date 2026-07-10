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