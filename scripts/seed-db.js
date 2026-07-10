#!/usr/bin/env node

import Database from 'better-sqlite3';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'ducs-contacts.db');
const CSV_PATH = '/Users/justinfagan/.openclaw/workspace/ducs-ai/data/ducs_enriched_chicagoland/ducs_contact_targets_enriched.csv';

console.log('Creating database...');
const db = new Database(DB_PATH);

// Create schema
db.exec(`
  DROP TABLE IF EXISTS contacts;
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade TEXT,
    score INTEGER,
    target_type TEXT,
    contact_label TEXT,
    person_name TEXT,
    role_title TEXT,
    company TEXT,
    trade_name TEXT,
    city TEXT,
    state TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    profile_url TEXT,
    contact_page_url TEXT,
    street_address TEXT,
    entity_name TEXT,
    entity_type TEXT,
    registered_agent TEXT,
    principal_office TEXT,
    source_1 TEXT,
    source_2 TEXT,
    confidence TEXT,
    usefulness_note TEXT,
    next_action TEXT,
    retrieved_at TEXT,
    postal_code TEXT,
    county TEXT,
    latitude TEXT,
    longitude TEXT,
    linkedin_url TEXT,
    x_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    social_profile_links_found TEXT,
    public_site_enriched_at TEXT,
    inspection_date TEXT,
    inspection_score TEXT,
    inspection_type TEXT,
    facility_type TEXT,
    facility_category TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX idx_grade ON contacts(grade);
  CREATE INDEX idx_state ON contacts(state);
  CREATE INDEX idx_company ON contacts(company);
  CREATE INDEX idx_trade_name ON contacts(trade_name);
  CREATE INDEX idx_person_name ON contacts(person_name);
  CREATE INDEX idx_email ON contacts(email);
  CREATE INDEX idx_phone ON contacts(phone);
  CREATE INDEX idx_city_state ON contacts(city, state);
  
  CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
    person_name, role_title, company, trade_name, email, phone, city, state, county, linkedin_url, x_url,
    content='contacts', content_rowid='id'
  );
  
  CREATE TRIGGER IF NOT EXISTS contacts_ai AFTER INSERT ON contacts BEGIN
    INSERT INTO contacts_fts(rowid, person_name, role_title, company, trade_name, email, phone, city, state, county, linkedin_url, x_url)
    VALUES (new.id, new.person_name, new.role_title, new.company, new.trade_name, new.email, new.phone, new.city, new.state, new.county, new.linkedin_url, new.x_url);
  END;
  
  CREATE TRIGGER IF NOT EXISTS contacts_ad AFTER DELETE ON contacts BEGIN
    INSERT INTO contacts_fts(contacts_fts, rowid, person_name, role_title, company, trade_name, email, phone, city, state, county, linkedin_url, x_url)
    VALUES('delete', old.id, old.person_name, old.role_title, old.company, old.trade_name, old.email, old.phone, old.city, old.state, old.county, old.linkedin_url, old.x_url);
  END;
  
  CREATE TRIGGER IF NOT EXISTS contacts_au AFTER UPDATE ON contacts BEGIN
    INSERT INTO contacts_fts(contacts_fts, rowid, person_name, role_title, company, trade_name, email, phone, city, state, county, linkedin_url, x_url)
    VALUES('delete', old.id, old.person_name, old.role_title, old.company, old.trade_name, old.email, old.phone, old.city, old.state, old.county, old.linkedin_url, old.x_url);
    INSERT INTO contacts_fts(rowid, person_name, role_title, company, trade_name, email, phone, city, state, county, linkedin_url, x_url)
    VALUES (new.id, new.person_name, new.role_title, new.company, new.trade_name, new.email, new.phone, new.city, new.state, new.county, new.linkedin_url, new.x_url);
  END;
`);

console.log('Seeding from CSV...');

const insert = db.prepare(`
  INSERT INTO contacts (
    grade, score, target_type, contact_label, person_name, role_title, company, trade_name,
    city, state, email, phone, website, profile_url, contact_page_url, street_address,
    entity_name, entity_type, registered_agent, principal_office, source_1, source_2,
    confidence, usefulness_note, next_action, retrieved_at, postal_code, county, latitude, longitude,
    linkedin_url, x_url, facebook_url, instagram_url, social_profile_links_found,
    public_site_enriched_at, inspection_date, inspection_score, inspection_type,
    facility_type, facility_category
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(
      row.grade, row.score, row.target_type, row.contact_label, row.person_name, row.role_title,
      row.company, row.trade_name, row.city, row.state, row.email, row.phone, row.website,
      row.profile_url, row.contact_page_url, row.street_address, row.entity_name, row.entity_type,
      row.registered_agent, row.principal_office, row.source_1, row.source_2, row.confidence,
      row.usefulness_note, row.next_action, row.retrieved_at, row.postal_code, row.county,
      row.latitude, row.longitude, row.linkedin_url, row.x_url, row.facebook_url, row.instagram_url,
      row.social_profile_links_found, row.public_site_enriched_at, row.inspection_date,
      row.inspection_score, row.inspection_type, row.facility_type, row.facility_category
    );
  }
});

const rows = [];
let count = 0;

createReadStream(CSV_PATH)
  .pipe(csv())
  .on('data', (row) => {
    rows.push(row);
    if (rows.length >= 1000) {
      insertMany(rows);
      count += rows.length;
      console.log(`Inserted ${count} rows...`);
      rows.length = 0;
    }
  })
  .on('end', () => {
    if (rows.length > 0) {
      insertMany(rows);
      count += rows.length;
    }
    console.log(`✅ Seeded ${count} contacts`);
    
    // Stats
    const stats = db.prepare('SELECT grade, COUNT(*) as count FROM contacts GROUP BY grade').all();
    console.log('\nGrade distribution:');
    stats.forEach(s => console.log(`  ${s.grade}: ${s.count}`));
    
    const withEmail = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE email != ''").get();
    const withPhone = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE phone != ''").get();
    console.log(`\nWith email: ${withEmail.count}`);
    console.log(`With phone: ${withPhone.count}`);
    
    db.close();
    console.log('\nDatabase created at:', DB_PATH);
  });