# Telegram Messaging System - Setup Guide

Sistema completo per inviare messaggi automatici ai lead scrapati da Telegram con rate limiting e tracking delle risposte.

## 🚀 Features

- ✅ Autenticazione Telegram con account utente (MTProto)
- ✅ Rate limiting configurabile (conservativo/moderato/aggressivo)
- ✅ Tracking completo dei messaggi (inviati, errori, risposte)
- ✅ Filtri avanzati per targetizzare i lead
- ✅ Dashboard real-time con statistiche
- ✅ Retry automatico per errori temporanei
- ✅ Gestione FloodWait e altri errori Telegram
- ✅ Background worker per processare le code
- ✅ Listener automatico per le risposte

## 📋 Prerequisiti

1. **Account Telegram** con numero di telefono
2. **API Credentials** da [my.telegram.org](https://my.telegram.org)
3. **Supabase Database** configurato (per storage)

## 🔧 Setup

### 1. Ottenere API Credentials

1. Vai su [my.telegram.org](https://my.telegram.org)
2. Login con il tuo numero di telefono
3. Clicca su "API development tools"
4. Crea una nuova applicazione:
   - App title: `DemonOS Telegram`
   - Short name: `demonos`
   - Platform: `Other`
5. Copia `api_id` e `api_hash`

### 2. Configurare Environment Variables

Crea file `.env.local` nella root del progetto:

```env
# Telegram API (da my.telegram.org)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_ENCRYPTION_KEY=change_this_to_random_32_chars

# Optional - Rate Limiting
TELEGRAM_RATE_LIMIT_PER_HOUR=60
TELEGRAM_WORKER_ENABLED=true
```

**IMPORTANTE:** Genera una chiave encryption casuale di 32 caratteri per `TELEGRAM_ENCRYPTION_KEY`:
```bash
# Linux/Mac:
openssl rand -hex 16

# Oppure online:
# https://www.random.org/strings/?num=1&len=32&digits=on&loweralpha=on&unique=on&format=html&rnd=new
```

### 3. Eseguire Database Migration

Esegui il file SQL in Supabase:

```bash
# Copia il contenuto di src/lib/supabase/telegram-migrations.sql
# e eseguilo nel SQL Editor di Supabase
```

Oppure tramite CLI:
```bash
psql $DATABASE_URL -f src/lib/supabase/telegram-migrations.sql
```

### 4. Installare Dipendenze

```bash
npm install
```

Verifica che siano installate:
- `telegram` (^2.22.2)
- `p-queue` (^8.0.1)

### 5. Avviare l'applicazione

```bash
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`

## 📱 Primo Setup Telegram

1. Vai su `/telegram-campaigns`
2. Clicca su "Auth Settings"
3. Inserisci:
   - **Phone Number**: Il tuo numero (con prefisso internazionale, es: +39123456789)
   - **API ID**: Il tuo `api_id`
   - **API Hash**: Il tuo `api_hash`
4. Clicca "Send Verification Code"
5. Controlla Telegram sul tuo telefono
6. Inserisci il codice di verifica ricevuto
7. Se hai 2FA attivo, inserisci anche la password
8. Clicca "Verify & Authenticate"

✅ Autenticazione completata! Ora puoi creare campagne.

## 🎯 Creare una Campagna

1. Vai su "New Campaign"
2. Compila i campi:
   - **Nome**: Es. "Prima Campagna Test"
   - **Messaggio**: Usa variabili come `{name}`, `{first_name}`, `{username}`
   - **Filtri**: Seleziona gruppi di origine, premium only, verified, etc.
   - **Rate Limiting**: Scegli preset (conservativo/moderato/aggressivo)
3. Clicca "Create Campaign"
4. Nella lista campagne, clicca "Start" per avviarla

## 📊 Monitorare la Campagna

- **Stats**: Visualizza statistiche in tempo reale
  - Messaggi inviati/pending/failed
  - Risposte ricevute
  - Tasso di risposta (%)
  - Errori per tipo
  
- **Messages**: Vedi tutti i messaggi inviati
  - Filtra per status (sent/pending/failed/replied)
  - Cerca per username
  - Vedi chi ha risposto

## ⚙️ Rate Limiting Spiegato

### Preset Disponibili:

**Conservativo** (più sicuro):
- 20 messaggi/ora
- Delay: 160-200 secondi tra messaggi
- Pause: dopo 10 messaggi, pausa di 10 minuti
- Night mode: stop 23:00-08:00

**Moderato** (consigliato):
- 60 messaggi/ora
- Delay: 55-75 secondi tra messaggi
- Pause: dopo 20 messaggi, pausa di 5 minuti
- Night mode: stop 23:00-08:00

**Aggressivo** (più rischioso):
- 120 messaggi/ora
- Delay: 28-35 secondi tra messaggi
- Pause: dopo 30 messaggi, pausa di 3 minuti
- Night mode: disabilitato

### Come Evitare i Ban:

1. **Non superare i limiti**: Telegram permette ~40-60 msg/ora a nuovi utenti
2. **Randomizzare delays**: Il sistema aggiunge delay casuali
3. **Pause regolari**: Le pause simulate comportamento umano
4. **Gestire FloodWait**: Il sistema gestisce automaticamente errori FloodWait
5. **Verificare privacy**: Alcuni utenti bloccano messaggi da sconosciuti

## 🐛 Troubleshooting

### FloodWait Error
Il sistema pausa automaticamente e riprova dopo il tempo indicato da Telegram.

### UserPrivacyRestricted
L'utente ha impostazioni privacy che bloccano i messaggi. Il sistema marca come "failed" e non riprova.

### UserIsBlocked
L'utente ti ha bloccato. Il sistema marca come "failed" permanente.

### AuthenticationError
Ri-autentica andando su "Auth Settings" nella UI.

### Listener non riceve risposte
Il listener si avvia automaticamente. Verifica che non ci siano errori nei log del worker.

## 📝 API Endpoints

### Authentication
- `POST /api/telegram/auth` - Invia codice verifica
- `POST /api/telegram/auth/verify` - Verifica codice e completa auth
- `GET /api/telegram/auth/status` - Status autenticazione

### Campaigns
- `GET /api/telegram/campaigns` - Lista campagne
- `POST /api/telegram/campaigns` - Crea campagna
- `GET /api/telegram/campaigns/[id]` - Dettagli campagna
- `POST /api/telegram/campaigns/[id]/start` - Avvia campagna
- `POST /api/telegram/campaigns/[id]/pause` - Pausa campagna
- `POST /api/telegram/campaigns/[id]/resume` - Riprendi campagna
- `GET /api/telegram/campaigns/[id]/stats` - Statistiche campagna

### Messages
- `GET /api/telegram/messages?campaign_id=X` - Lista messaggi

### Worker
- `POST /api/telegram/worker` - Controlla worker (start/stop/status)
- `GET /api/telegram/worker` - Status worker

## 🔐 Sicurezza

- Le sessioni Telegram sono cifrate nel database con AES-256
- Cambia `TELEGRAM_ENCRYPTION_KEY` in produzione
- Non committare mai `.env.local` nel repository
- Usa Row Level Security in Supabase per proteggere i dati

## 📈 Best Practices

1. **Inizia con Conservativo**: Usa sempre il preset conservativo per le prime campagne
2. **Testa su pochi lead**: Crea una campagna test con max 10-20 targets
3. **Monitora gli errori**: Controlla la dashboard per FloodWait o altri errori
4. **Personalizza messaggi**: Usa variabili per rendere i messaggi più personali
5. **Rispetta le risposte**: Quando qualcuno risponde, fermati e gestisci manualmente

## 🚨 Limiti e Avvertenze

- **Telegram può bannare** account che inviano troppi messaggi
- **Usa a tuo rischio**: Questo sistema è per uso educativo/personale
- **Rispetta le policy** di Telegram sui messaggi automatici
- **Non fare spam**: Invia solo a persone interessate
- **Account principale**: Non usare il tuo account principale per testing

## 🔄 Aggiornamenti Futuri

Possibili miglioramenti:
- [ ] Schedulazione campagne (avvio automatico a orari specifici)
- [ ] Template multipli per A/B testing
- [ ] Export CSV delle risposte
- [ ] Blacklist globale (evita reinvio a chi ha già ricevuto)
- [ ] Analytics avanzati (conversion rate, tempi di risposta)
- [ ] Integrazione con CRM esterni

## 📞 Support

Per problemi o domande:
1. Controlla i log del browser (F12 → Console)
2. Controlla i log del server (`npm run dev`)
3. Verifica che le migrations SQL siano eseguite correttamente
4. Controlla che tutte le variabili d'ambiente siano configurate

---

**Buon messaging! 🚀**
