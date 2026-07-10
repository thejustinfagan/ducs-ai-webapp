# DUCs.ai - Contact Search Platform

Searchable franchise development contact database with 27K+ verified contacts and powerful CRM features.

## Features

### Core Search
- **Full-text search** across names, companies, emails, phones, and locations
- **Filter by grade** (A/B/C), state, email/phone availability
- **Advanced filters**: score ranges, date ranges, brand keywords

### Contact Management
- **Tags system**: Tag contacts as `contacted`, `follow-up`, `converted`, or `do-not-contact`
  - Color-coded badges for quick visual identification
  - Click badges to remove tags
  - Dropdown menu to add tags
- **Notes per contact**: Add and edit detailed notes for each contact
  - Modal editor with auto-save
  - Preview notes directly in contact cards
- **Mark as contacted**: Quick action button updates last contacted date

### Bulk Operations
- **Multi-select**: Select individual contacts or all on page
- **CSV Export**: Export selected contacts (or all results) to CSV
  - Includes all fields plus tags, notes, and last contacted date

## Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up

# Set env vars (SQLite path)
railway variables set DATABASE_PATH=./ducs-contacts.db

# Open in browser
railway open
```

## Local Dev

```bash
npm install
npm run dev
# http://localhost:3000
```

## Data

- **27,709 contacts** total
- **16,248 Grade A** (high-confidence)
- **1,475 with email**
- **16,219 with phone**

Sources: WDFI franchise filings + MyeListing broker profiles (Chicagoland + National)

## Database Schema

The `contacts` table includes:
- Core fields: `grade`, `score`, `person_name`, `role_title`, `company`, `email`, `phone`
- Location: `city`, `state`, `street_address`, `postal_code`, `county`
- Social: `linkedin_url`, `x_url`, `facebook_url`, `instagram_url`
- CRM features: `tags` (comma-separated), `notes` (text), `last_contacted_at` (timestamp)
- Full-text search index via `contacts_fts`

## API Endpoints

### GET `/api/search`
- `?q=query` - Full-text search
- `?action=filters` - Get available filters
- `?action=stats` - Get database statistics
- `?action=advanced` - Advanced filtered search (score ranges, dates, brands)
- `?action=export` - Export to CSV (optionally with `?ids=1,2,3`)

### POST `/api/search`
- `?action=updateTags` - Update contact tags (`{ id, tags: string[] }`)
- `?action=updateNotes` - Update contact notes (`{ id, notes: string }`)
- `?action=markContacted` - Mark as contacted (`{ id }`)

## UI Components

### Search Bar
- Large text input with FTS5-powered search
- "Advanced Filters" toggle for refined searches

### Filters
- Basic: grade dropdown, state dropdown, has email/phone checkboxes
- Advanced: score min/max, date range pickers, brand keywords (comma-separated)

### Contact Cards
- Grade badge (color-coded)
- Contact name, role, company, location
- Email/phone (click to copy)
- Website link
- Tags with remove-on-click
- Add tag dropdown
- Edit notes button
- Mark as contacted button
- Profile/Contact page links

### Selection & Export
- Checkbox on each card
- "Select all on page" button
- Blue action bar when items selected
- Export CSV button (exports selection or all)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with better-sqlite3
- **Search**: FTS5 full-text search
- **Deployment**: Railway, Vercel