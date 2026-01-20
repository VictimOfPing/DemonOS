# Backend Scraper Setup Guide

## Overview

Il backend dello scraper utilizza:
- **Apify** per eseguire l'actor `cheapget/telegram-group-member`
- **Supabase** per salvare i dati estratti
- **Next.js API Routes** per gestire le operazioni

## Setup Supabase Database

### 1. Crea le tabelle

Vai su Supabase Dashboard > SQL Editor ed esegui la migration:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table for scraper runs
CREATE TABLE IF NOT EXISTS scraper_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id VARCHAR(255) NOT NULL UNIQUE,
    actor_id VARCHAR(255) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    items_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    dataset_id VARCHAR(255),
    input_config JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for Telegram members
CREATE TABLE IF NOT EXISTS telegram_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    is_bot BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_restricted BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'unknown',
    last_online TIMESTAMPTZ,
    group_name VARCHAR(255) NOT NULL,
    group_id VARCHAR(255) NOT NULL,
    run_id UUID REFERENCES scraper_runs(id) ON DELETE CASCADE,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON scraper_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_members_group_id ON telegram_members(group_id);
CREATE INDEX IF NOT EXISTS idx_telegram_members_username ON telegram_members(username);

-- Enable RLS
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_members ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust for production)
CREATE POLICY "Allow all for scraper_runs" ON scraper_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for telegram_members" ON telegram_members FOR ALL USING (true) WITH CHECK (true);
```

### 2. Configura le variabili ambiente

Crea o aggiorna il file `.env.local`:

```env
# Apify
APIFY_API_TOKEN=your_apify_token

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## API Endpoints

### POST /api/scraper/run
Avvia un nuovo scraping job.

**Request:**
```json
{
  "scraperId": "telegram",
  "targetUrl": "https://t.me/groupname",
  "maxResults": 1000,
  "deepSearch": false
}
```

**Parametri:**
- `scraperId` (required): ID dello scraper (attualmente solo "telegram")
- `targetUrl` (required): URL del gruppo Telegram (es. `https://t.me/groupname` o `@groupname`)
- `maxResults` (optional, default: 1000): Numero massimo di membri da estrarre (1-10000)
- `deepSearch` (optional, default: false): Abilita ricerca profonda per membri nascosti + storici

**Response:**
```json
{
  "success": true,
  "data": {
    "runId": "abc123",
    "datasetId": "xyz789",
    "status": "RUNNING",
    "message": "Scraper started successfully"
  }
}
```

### GET /api/scraper/status
Recupera lo stato delle run attive.

**Query params:**
- `runId` (optional): ID specifico della run
- `limit` (default: 10): Numero massimo di run
- `offset` (default: 0): Offset per paginazione

### POST /api/scraper/abort
Interrompe una run attiva.

**Request:**
```json
{
  "runId": "abc123"
}
```

### GET /api/scraper/logs/[runId]
Recupera i log di una run specifica.

### GET /api/scraper/data
Recupera i dati estratti.

**Query params:**
- `source`: "apify" o "database"
- `runId` o `datasetId`: Per dati da Apify
- `groupId`: Filtra per gruppo (solo database)
- `limit`, `offset`: Paginazione

### POST /api/scraper/data
Salva i dati da Apify nel database.

**Request:**
```json
{
  "runId": "abc123"
}
```

## Frontend Usage

La pagina `/scraper` è stata aggiornata per:
1. Avviare nuovi scraping job inserendo URL del gruppo Telegram
2. Monitorare lo stato in tempo reale (polling ogni 5 secondi)
3. Visualizzare i log delle run
4. Salvare i dati nel database
5. Interrompere run attive

La pagina `/database` permette di:
1. Visualizzare i gruppi scrappati
2. Esplorare i membri per gruppo
3. Cercare e filtrare i dati
4. Esportare in CSV

## Actor Telegram

L'actor utilizzato è `cheapget/telegram-group-member`.

Riferimento: [Apify Console](https://console.apify.com/actors/8vxvc9BwwG34zvS5P)

**Input (parametri API Apify):**
```json
{
  "telegram_url": "https://t.me/groupname",
  "max_results": 1000,
  "deep_search": false
}
```

- `telegram_url` (required): URL o username del gruppo Telegram
- `max_results` (required): Numero massimo di membri da estrarre
- `deep_search` (required): Abilita per membri nascosti + storici

**Output:**
- `userId`: ID utente Telegram
- `username`: Username (può essere null)
- `firstName`, `lastName`: Nome dell'utente
- `phone`: Numero di telefono (se disponibile)
- `isBot`, `isPremium`, `isVerified`: Flag utente
- `status`: Stato utente nel gruppo
- `groupName`, `groupId`: Info del gruppo
