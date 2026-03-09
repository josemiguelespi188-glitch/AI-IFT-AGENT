# Axiskey IR Agent — Industry FinTech (IFT)

AI-powered **Investor Relations Agent** that automatically resolves investor inquiries arriving via **Zendesk**, **email**, and the **Tribexa investor portal**. Built with [Claude Opus 4.6](https://anthropic.com) and FastAPI.

---

## What It Does

| Feature | Detail |
|---|---|
| **Multi-channel** | Zendesk tickets, IMAP email, Tribexa portal messages |
| **Auto-classify** | Distributions · Tax Docs · Accreditation · Banking · Redemptions · Technical · Other |
| **Client rules** | Per-sponsor logic (PAH, Rastegar…) loaded from JSON configs |
| **Respond or escalate** | Answers confidently; escalates with full context when unsure |
| **Continuous learning** | Human-approved responses are stored and reused automatically |
| **Secure** | Never confirms sensitive actions (banking, redemptions) without human review |

---

## Project Structure

```
axiskey-ir-agent/
├── main.py                      # FastAPI entry point
├── config/settings.py           # All env-var configuration
├── agent/
│   ├── ir_agent.py              # Core agent pipeline (Claude Opus 4.6)
│   └── prompts.py               # System prompts
├── channels/
│   ├── zendesk_handler.py       # Zendesk API integration
│   ├── email_handler.py         # IMAP/SMTP email integration
│   └── portal_handler.py        # Tribexa portal integration
├── knowledge/
│   ├── client_rules.py          # Client-specific rules loader
│   └── vector_store.py          # In-memory TF-IDF knowledge retrieval
├── models/                      # Pydantic data models
├── services/
│   ├── investor_lookup.py       # Tribexa investor lookup
│   ├── escalation.py            # Escalation email to IR team
│   └── learning.py              # Continuous learning service
├── api/routes.py                # REST API endpoints
└── data/
    ├── clients/                 # Per-client JSON configs
    └── knowledge_base/          # General Q&A knowledge base
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_ORG/axiskey-ir-agent.git
cd axiskey-ir-agent
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `ZENDESK_*` — Zendesk subdomain + API token
- `EMAIL_*` — IMAP/SMTP credentials
- `TRIBEXA_*` — Portal API URL + key
- `ESCALATION_EMAIL` — Where to send escalations

### 3. Run

```bash
python main.py
# or
uvicorn main:app --reload
```

API docs at **http://localhost:8000/docs**

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/clients` | List configured clients |
| `POST` | `/api/v1/inquiries` | Submit one inquiry for processing |
| `POST` | `/api/v1/inquiries/batch` | Poll all channels and process |
| `POST` | `/api/v1/learn` | Record a human-approved response |

### Example: Submit an inquiry

```bash
curl -X POST http://localhost:8000/api/v1/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "sender_email": "investor@example.com",
    "sender_name": "John Smith",
    "subject": "Where is my K-1?",
    "body": "Hi, I invested in Rastegar last year and still have not received my K-1 tax form.",
    "client_name": "Rastegar"
  }'
```

### Example: Record approved response

```bash
curl -X POST http://localhost:8000/api/v1/learn \
  -H "Content-Type: application/json" \
  -d '{
    "client": "Rastegar",
    "deal": "Rastegar Opportunity Fund",
    "category": "tax_documents",
    "question": "Where is my K-1?",
    "approved_answer": "K-1s for Rastegar Opportunity Fund are available by March 15 in your portal under Documents > Tax.",
    "approved_by": "sarah@industryfintech.com"
  }'
```

---

## Adding a New Client

Create a JSON file in `data/clients/your_client.json`:

```json
{
  "client_name": "Your Client Name",
  "portal_url": "https://portal.tribexa.com/your-client",
  "deals": [
    {
      "deal_name": "Fund I",
      "tax_document_type": "K-1",
      "distribution_schedule": "Quarterly",
      "reinvestment_policy": "...",
      "redemption_rules": "...",
      "sponsor_contact": {
        "name": "Contact Name",
        "email": "contact@sponsor.com",
        "role": "Investor Relations"
      }
    }
  ],
  "general_notes": ["..."]
}
```

The agent will load it automatically on next restart.

---

## Security Notes

- The agent **never confirms** banking changes, redemptions, or accreditation without human verification.
- All escalations include investor identity, original message, information gaps, and a draft response for human review.
- Sensitive actions require explicit human approval before execution.

---

## Tech Stack

- **AI**: [Anthropic Claude Opus 4.6](https://anthropic.com) with adaptive thinking
- **API**: [FastAPI](https://fastapi.tiangolo.com)
- **Integrations**: Zendesk REST API · IMAP/SMTP · Tribexa portal API
- **Knowledge retrieval**: In-memory TF-IDF (swap for Pinecone/Chroma for scale)

---

*Industry FinTech (IFT) — Axiskey Platform*
