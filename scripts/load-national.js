#!/usr/bin/env node

import Database from 'better-sqlite3';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'ducs-contacts.db');
const CSV_PATH = '/Users/justinfagan/.openclaw/workspace/ducs-ai/data/ducs_national_expansion/national_feed_with_social_profile_links.csv';

console.log('Loading national expansion data...');
const db = new Database(DB_PATH);

const insert = db.prepare(`
  INSERT OR REPLACE INTO contacts (
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
let skipped = 0;

createReadStream(CSV_PATH)
  .pipe(csv())
  .on('data', (row) => {
    // Skip if already exists (from corridor data)
    rows.push(row);
    if (rows.length >= 1000) {
      try {
        insertMany(rows);
        count += rows.length;
      } catch (e) {
        skipped += rows.length;
      }
      console.log(`Processed ${count + skipped} rows...`);
      rows.length = 0;
    }
  })
  .on('end', () => {
    if (rows.length > 0) {
      try {
        insertMany(rows);
        count += rows.length;
      } catch (e) {
        skipped += rows.length;
      }
    }
    
    const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    console.log(`\n✅ National data loaded`);
    console.log(`Total contacts in DB: ${total.count.toLocaleString()}`);
    
    const stats = db.prepare('SELECT grade, COUNT(*) as count FROM contacts GROUP BY grade').all();
    console.log('\nGrade distribution:');
    stats.forEach(s => console.log(`  ${s.grade}: ${s.count.toLocaleString()}`));
    
    const withEmail = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE email != ''").get();
    const withPhone = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE phone != ''").get();
    console.log(`\nWith email: ${withEmail.count.toLocaleString()}`);
    console.log(`With phone: ${withPhone.count.toLocaleString()}`);
    
    db.close();
  });