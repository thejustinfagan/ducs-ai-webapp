# DUCs.ai - Contact Search Platform

Searchable franchise development contact database with 27K+ verified contacts.

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