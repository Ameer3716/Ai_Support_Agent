# AI Support Agent

A multi-tenant AI customer-support chatbot you host once and sell to many small businesses. Each client gets:

- A **website chat widget** (one `<script>` tag to embed)
- **WhatsApp support** (via Twilio) — optional per client
- **Instagram DM support** (via Meta) — optional per client, one shared webhook
- A knowledge base built from their own FAQs/docs/website (retrieval-augmented generation, so it never invents answers)
- Automatic **lead capture** when the bot can't answer or a visitor asks for a human, exportable as CSV
- Usage quotas so one client's traffic can't blow your API budget

You run **one deployment** of this app; every client is just a row in the database, isolated by their own `client_key` and `admin_secret`. You manage all of them from a single admin dashboard.

## Stack

Node.js + Express + SQLite (`better-sqlite3`) for the backend and the widget/admin dashboard — no build step needed for those. The **marketing landing page** now lives separately in [`frontend/`](./frontend) as a Next.js + Tailwind CSS app (see [`frontend/README.md`](./frontend/README.md)) — everything else (widget, admin, webhooks, API) is unchanged and still served directly by Express. Chat replies and embeddings both support **five provider options** — pick paid (Anthropic/OpenAI) or free (Groq/Gemini/Ollama) independently for each, see below.

## 0. Running it for free (no paid API keys)

Both the chat model and the embeddings model are pluggable via `LLM_PROVIDER` / `EMBEDDINGS_PROVIDER` in `.env`. Anthropic and OpenAI still work exactly as before if you have keys for them — nothing about them was removed, they're just no longer the only option. For a $0 demo, use any combination below:

| Provider | Use for | Cost | Setup |
|---|---|---|---|
| **Groq** | chat (`LLM_PROVIDER=groq`) | Free, no card | Free key at [console.groq.com/keys](https://console.groq.com/keys) — fast Llama 3.3 |
| **Gemini** | chat and/or embeddings (`LLM_PROVIDER=gemini` / `EMBEDDINGS_PROVIDER=gemini`) | Free tier, no card | Free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Ollama** | chat and/or embeddings (`LLM_PROVIDER=ollama` / `EMBEDDINGS_PROVIDER=ollama`) | 100% free forever, no API key at all | Install [ollama.com](https://ollama.com), then `ollama pull llama3.2` and `ollama pull nomic-embed-text` |
| Anthropic / OpenAI | chat and/or embeddings | Paid | Unchanged — set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` and switch the provider back when you're ready |

The `.env.example` file already defaults to **Groq for chat + Gemini for embeddings** — the easiest zero-install, zero-cost combo for a demo (just two free signups, no local software). If you'd rather run fully offline with no API keys anywhere, install Ollama and set both providers to `ollama` instead.

⚠️ If you ingest documents under one embeddings provider and later switch to another, re-run ingestion for existing clients — embeddings from different providers/models aren't compatible with each other (similarity search will return garbage otherwise).

## 1. Local setup

```bash
npm install
cp .env.example .env
# edit .env — at minimum set ADMIN_PASSWORD, ADMIN_JWT_SECRET, and an
# API key for whichever LLM_PROVIDER / EMBEDDINGS_PROVIDER you chose (see
# section 0 above for free options — Groq/Gemini/Ollama — or use your own
# ANTHROPIC_API_KEY / OPENAI_API_KEY).

npm run init-db
npm start
```

Then open `http://localhost:3000/admin` and log in with your `ADMIN_PASSWORD`.

Want something to click around immediately? `npm run seed-demo` creates a demo dental-clinic client with a sample FAQ already indexed.

## 1a. Running the marketing landing page (Next.js frontend)

The public marketing page (the one a visitor lands on at `/`) is a separate Next.js + Tailwind CSS app in [`frontend/`](./frontend), so it can be styled and deployed independently of the API/widget/admin backend above. Run it alongside the backend:

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points it at the backend, defaults to http://localhost:3000
npm run dev                        # http://localhost:3001
```

With both running, the backend's `/` redirects to the frontend, and the frontend's "Talk to the demo bot" button loads the real widget from the backend (`/api/chat/demo-key` + `/widget/embed.js`) — same as before, just cross-origin. See [`frontend/README.md`](./frontend/README.md) for details, and set `FRONTEND_URL` in the backend's `.env` if you deploy the frontend somewhere other than `localhost:3001`.

## 2. Onboarding your first real client

Either use the admin dashboard (**+ New** → fill in the name → *Embed & Channels* tab for the snippet), or from the command line:

```bash
npm run create-client -- "Sunrise Dental Clinic" "owner@sunrisedental.com"
```

This prints the embed snippet, the WhatsApp webhook URL, and the client's private admin secret.

Then add their knowledge: paste their FAQ text, upload a PDF/TXT file, or point it at a URL — either from the dashboard's **Knowledge Base** tab, or via API (handy for wiring into n8n/Make/Zapier so their content stays in sync automatically):

```bash
curl -X POST http://localhost:3000/api/ingest/<clientKey>/text \
  -H "X-Admin-Secret: <adminSecret>" -H "Content-Type: application/json" \
  -d '{"title":"FAQ","text":"Q: What are your hours?\nA: 9am-6pm Mon-Sat."}'
```

## 3. Embedding the widget on the client's site

Give the client this one line to paste before `</body>`:

```html
<script src="https://your-domain.com/widget/embed.js" data-client="THEIR_CLIENT_KEY" async></script>
```

That's it — no npm install, no iframe wrangling on their end. The widget floats a chat bubble in the corner and expands into a full chat window on click.

## 4. Connecting WhatsApp (optional, per client)

1. Set up a WhatsApp sender in Twilio and put its credentials in `.env` (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`).
2. In the Twilio console, set the sender's "when a message comes in" webhook to the URL shown in the client's **Embed & Channels** tab: `https://your-domain.com/webhook/whatsapp/<clientKey>`.

Once `TWILIO_AUTH_TOKEN` is set, incoming webhook calls are verified against Twilio's signature automatically — no extra setup needed to keep the endpoint from being spoofed.

## 5. Connecting Instagram DMs (optional, one-time app setup + per client)

Unlike WhatsApp, Instagram messaging is set up **once per deployment** (one Meta App), then connected **per client**:

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com), add the Messenger product, and set its webhook URL to `https://your-domain.com/webhook/instagram`.
2. Pick any long random string, set it as both `INSTAGRAM_VERIFY_TOKEN` in `.env` and the "Verify Token" in Meta's webhook setup screen.
3. For each client: connect their Instagram professional account to your Meta App, generate a Page Access Token, and paste the Page ID + token into that client's **Settings** tab in the admin dashboard.
4. Request the `instagram_manage_messages` permission via Meta's App Review before promising a client a *live* bot — until reviewed, it only works for accounts added as test users on your app.

## 6. Deploying

### Render / Railway / Fly.io (easiest)
Push this repo, set the environment variables from `.env.example` in the platform's dashboard, and set the start command to `npm start`. Attach a persistent disk mounted at `/app/data` (or the platform's default working directory) so the SQLite file survives restarts — on Render this is a "Disk" attached at the path where you run the app.

### Docker / VPS
```bash
docker compose up -d --build
```
This builds the image, runs the container, and persists `./data` on the host so the database survives container restarts.

## Project layout

```
server/
  index.js           entry point
  config.js          env var loading
  db.js              SQLite connection + migration runner
  db/schema.sql       table definitions
  routes/            HTTP route handlers (widget, whatsapp, instagram, admin, ingestApi)
  middleware/        auth, rate limiting, error handling
  services/          chat engine, retrieval, embeddings, LLM calls, ingestion, notifications
  utils/             chunker, logger, URL-safety (SSRF guard)
scripts/             init-db, create-client, seed-demo CLI helpers
public/
  widget/            embed.js (loader) + chat.html (the widget UI, runs in an iframe)
  admin/             the operator dashboard (login, clients, knowledge base, conversations, leads, settings)
data/                SQLite database + uploads live here at runtime (gitignored)
```

## Notes on cost & scaling

- Embeddings and chat replies both cost API tokens per conversation — the `daily_message_quota` field per client (editable in Settings) is your safety net against a runaway bill.
- In-memory cosine similarity search (no vector DB) comfortably handles a knowledge base of a few thousand chunks per client, which covers the realistic size of an SMB's FAQ/policy docs.
- SQLite with WAL mode handles the traffic of dozens of small-business clients on a single small server; if you ever outgrow it, the `db.js`/`schema.sql` layer is the only place that would need to change.

## Testing

```bash
npm test
```

Runs a small `node --test` suite covering the text chunker (including hard-wrapping
pathological input like a long URL or base64 blob with no sentence punctuation),
cosine similarity, and the SSRF guard on URL ingestion. It's a smoke test, not
full coverage — the ingestion/chat/webhook flows are best verified by running the
server locally against a real client (see `npm run seed-demo`).

## Security notes

- The widget's origin check (`allowed_origins` per client) is a soft restriction, not a hard security boundary — it stops casual copy-pasting of someone else's snippet, not a determined attacker who has the public client key. Don't put anything in a client's knowledge base that would be sensitive if scraped by someone who obtains their client key.
- Each client's `admin_secret` scopes ingestion API access to that one client only — safe to hand to an automation tool without exposing your own operator login.
- Rotate a client's secret any time from the **Embed & Channels** tab if you suspect it's leaked.
- The WhatsApp webhook verifies Twilio's request signature once `TWILIO_AUTH_TOKEN` is set, so only genuine Twilio requests are accepted.
- URL ingestion (the "add a URL" knowledge-base source) resolves and rejects any hostname that points at localhost, a private network range, or a cloud metadata endpoint (e.g. `169.254.169.254`) — including on redirects — so it can't be used to make this server probe your internal network.

# Ai_Support_Agent
