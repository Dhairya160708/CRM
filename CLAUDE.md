# MedTrade CRM — Project Specification

#Efficiency Mode

- Be concise.
- Do not explain changes unless asked.
- Do not summarize completed work.
- Do not restate requirements.
- Read the minimum files necessary.
- Output code and actions only.
- Use bullet points instead of paragraphs.
- If task complete, say "Done".

## Project Overview

**MedTrade CRM** is a private, secure Customer Relationship Management system built for a **medical raw materials intermediary business** based in India. The business acts as a middleman between foreign clients (who source raw pharmaceutical ingredients) and Indian manufacturers/suppliers. The CRM's primary job is to **tame the chaos of high-volume email-driven operations** by centralising every order, conversation, client, and manufacturer into one structured system.

---

## Business Context

| Role | Description |
|---|---|
| **The User (Business Owner)** | Indian intermediary who receives inquiries from agents and sources raw pharma materials locally |
| **Agents/Clients** | Foreign-language speakers who represent overseas buyers needing raw pharma materials; they communicate in English on behalf of their buyers |
| **Manufacturers/Suppliers** | Indian manufacturers or suppliers who have or can procure the raw materials |
| **End Buyers** | Foreign companies that need raw materials to manufacture medicine (mostly invisible in the CRM) |

### Workflow
1. Agent emails the business with a raw material inquiry (product name, quantity, specs, delivery destination)
2. Business owner searches Indian manufacturers for the product
3. Price negotiation happens over multiple emails spanning days/weeks
4. Order is confirmed, manufactured/sourced, and shipped
5. One agent may have **multiple concurrent orders** at different stages

---

## Core Problem This CRM Solves

- Hundreds of email threads are impossible to manually track
- A single order's conversation can span 2–3 months
- Same client sends new inquiries while old orders are still in progress
- No unified view of order history, pricing, quantities, or status
- Client and manufacturer lists are **highly confidential** — if leaked, business collapses

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: PostgreSQL via Prisma ORM
- **Email Integration**: Google Gmail API (OAuth 2.0) or Microsoft Graph API (for Outlook)
- **Email Parsing**: LLM-assisted parsing using Anthropic Claude API (claude-sonnet-4-20250514) to extract structured data from raw email threads
- **Authentication**: NextAuth.js with email/password + 2FA (TOTP)
- **File Storage**: Local filesystem or AWS S3 for attachments
- **Charts & Analytics**: Recharts or Chart.js
- **UI Components**: shadcn/ui as the base component library
- **Deployment**: Docker-ready, self-hostable (no third-party cloud CRM)

---

## Security & Privacy Requirements

> ⚠️ **CRITICAL**: Client and manufacturer data is the business's most sensitive asset.

- **Authentication**: Single-user or small-team login; no public registration
- **Role-based access**: Admin, Manager, Viewer roles
- **Data encryption**: Sensitive fields (client names, manufacturer names, contact info) encrypted at rest using AES-256
- **No third-party analytics**: Zero tracking scripts, no Google Analytics, no external SDKs that leak data
- **Audit log**: Every login, data access, edit, and delete is logged with timestamp and user
- **Session security**: Short session expiry, secure cookies, CSRF protection
- **API security**: All API routes protected; no public endpoints
- **Export controls**: Exports (CSV/PDF) require admin role and are logged
- **Environment variables**: All secrets in `.env.local`, never committed
- **Database**: Never expose raw DB credentials; use connection pooling

---

## Pages & Modules

### 1. Dashboard (`/dashboard`)
- **Summary cards**: Total active orders, orders pending response, orders shipped this month, revenue this month
- **Activity feed**: Latest email events, status changes, new inquiries
- **Order pipeline**: Kanban-style or funnel showing orders by stage
- **Alerts**: Orders with no response in >48 hours, pending shipments overdue
- **Quick search**: Search any order, client, manufacturer, product by keyword

### 2. Orders (`/orders`)
- Full table of all orders with columns: Order ID, Client, Product, Quantity, Unit, Price, Status, Last Activity, Assigned To
- Filter by: Status, Client, Date range, Product
- Sort by any column
- Clicking an order opens the **Order Detail Page**

### 3. Order Detail Page (`/orders/[id]`)
- Order metadata: product name, quantity, unit (kg/g/L), specs/grade, target price, confirmed price, incoterms, delivery destination
- **Status timeline**: Visual step-by-step progress (Inquiry → Sourcing → Quoted → Negotiating → Confirmed → In Production → Shipped → Delivered → Closed)
- **Linked email thread viewer**: All emails related to this order displayed in chronological order, clearly showing sender/receiver, date, parsed highlights
- **Client card** (click to go to client page)
- **Manufacturer card** (click to go to manufacturer page)
- **Documents tab**: Attachments, proforma invoices, COAs (Certificate of Analysis), shipping docs
- **Notes tab**: Internal notes/comments by team members
- **Activity log**: Every change to the order with who made it and when

### 4. Clients (`/clients`)
> 🔒 Restricted to Admin and Manager roles only

- Table: Client/Agent Name, Company, Country, Language, Total Orders, Active Orders, Last Contact, Status (Active/Inactive)
- Clicking opens **Client Detail Page**

### 5. Client Detail Page (`/clients/[id]`)
- Contact info, timezone, preferred communication style
- All orders by this client in a table
- Full email history with this client (all threads)
- Notes
- Tags (e.g. "High Volume", "Reliable", "Price Sensitive")

### 6. Manufacturers (`/manufacturers`)
> 🔒 Restricted to Admin and Manager roles only

- Table: Manufacturer Name, Location (City/State), Products They Supply, Last Order, Reliability Rating, Status
- Clicking opens **Manufacturer Detail Page**

### 7. Manufacturer Detail Page (`/manufacturers/[id]`)
- Contact info, certifications (GMP, ISO, etc.), MOQ (minimum order quantity), lead times
- All orders fulfilled by them
- Price history for each product they've supplied
- Notes and internal ratings

### 8. Email Inbox (`/emails`)
- Connected email inbox view (Gmail/Outlook)
- All incoming emails listed with: Sender, Subject, Date, **AI-parsed summary**, Linked Order (if any)
- Unlinked emails (new inquiries) highlighted separately
- Button: "Create New Order from this Email"
- Button: "Link to Existing Order"
- AI auto-suggest: "This email looks like it belongs to Order #1042 — Link?"

### 9. Products/Catalogue (`/products`)
- Master list of all raw materials ever handled
- Product name, CAS number (if applicable), category, suppliers who've provided it, average historical price, last sourced date

### 10. Reports (`/reports`)
> 🔒 Admin only

- Revenue by month (bar chart)
- Orders by status (pie chart)
- Top clients by order volume
- Top manufacturers by orders fulfilled
- Average order-to-shipment time
- Export to CSV or PDF (logged action)

### 11. Settings (`/settings`)
- Email account connection (Gmail/Outlook OAuth)
- User management (add/remove team members, assign roles)
- Notification preferences
- Audit log viewer
- Data backup/export (admin only)
- Session management

---

## Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  role          Role     @default(VIEWER)
  name          String
  createdAt     DateTime @default(now())
  lastLogin     DateTime?
  auditLogs     AuditLog[]
  notes         Note[]
}

enum Role {
  ADMIN
  MANAGER
  VIEWER
}

model Client {
  id            String   @id @default(cuid())
  nameEncrypted String   // AES-256 encrypted
  company       String?
  country       String
  language      String?
  email         String   // encrypted
  phone         String?  // encrypted
  tags          String[]
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  orders        Order[]
  emails        EmailThread[]
  notes         Note[]
}

model Manufacturer {
  id              String   @id @default(cuid())
  nameEncrypted   String   // AES-256 encrypted
  location        String
  contactEncrypted String  // encrypted
  certifications  String[]
  products        ManufacturerProduct[]
  orders          Order[]
  notes           Note[]
  reliabilityScore Int     @default(0) // 0-5
  isActive        Boolean @default(true)
  createdAt       DateTime @default(now())
}

model Product {
  id          String   @id @default(cuid())
  name        String
  casNumber   String?
  category    String?
  unit        String   // kg, g, L, MT, etc.
  orders      Order[]
  manufacturers ManufacturerProduct[]
}

model ManufacturerProduct {
  id             String       @id @default(cuid())
  manufacturer   Manufacturer @relation(fields: [manufacturerId], references: [id])
  manufacturerId String
  product        Product      @relation(fields: [productId], references: [id])
  productId      String
  lastPrice      Float?
  moq            Float?
  leadTimeDays   Int?
  updatedAt      DateTime     @updatedAt
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique // e.g. ORD-2024-0042
  client          Client      @relation(fields: [clientId], references: [id])
  clientId        String
  manufacturer    Manufacturer? @relation(fields: [manufacturerId], references: [id])
  manufacturerId  String?
  product         Product     @relation(fields: [productId], references: [id])
  productId       String
  quantity        Float
  unit            String
  specs           String?
  targetPrice     Float?
  confirmedPrice  Float?
  currency        String      @default("USD")
  incoterms       String?
  deliveryCountry String?
  status          OrderStatus @default(INQUIRY)
  priority        Priority    @default(NORMAL)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  expectedShipDate DateTime?
  actualShipDate  DateTime?
  emailThreads    EmailThread[]
  documents       Document[]
  notes           Note[]
  statusHistory   StatusHistory[]
}

enum OrderStatus {
  INQUIRY
  SOURCING
  QUOTED
  NEGOTIATING
  CONFIRMED
  IN_PRODUCTION
  SHIPPED
  DELIVERED
  CLOSED
  CANCELLED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model EmailThread {
  id          String   @id @default(cuid())
  gmailThreadId String? @unique
  subject     String
  client      Client?  @relation(fields: [clientId], references: [id])
  clientId    String?
  order       Order?   @relation(fields: [orderId], references: [id])
  orderId     String?
  messages    EmailMessage[]
  aiSummary   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model EmailMessage {
  id          String      @id @default(cuid())
  thread      EmailThread @relation(fields: [threadId], references: [id])
  threadId    String
  gmailId     String?     @unique
  from        String
  to          String
  subject     String
  body        String      // plain text
  htmlBody    String?
  sentAt      DateTime
  isInbound   Boolean
  aiExtracted Json?       // structured data extracted by Claude
  attachments Document[]
}

model Document {
  id        String   @id @default(cuid())
  name      String
  type      String   // invoice, COA, shipping, other
  url       String
  order     Order?   @relation(fields: [orderId], references: [id])
  orderId   String?
  email     EmailMessage? @relation(fields: [emailId], references: [id])
  emailId   String?
  uploadedAt DateTime @default(now())
}

model Note {
  id        String   @id @default(cuid())
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  client    Client?  @relation(fields: [clientId], references: [id])
  clientId  String?
  order     Order?   @relation(fields: [orderId], references: [id])
  orderId   String?
  manufacturer Manufacturer? @relation(fields: [manufacturerId], references: [id])
  manufacturerId String?
  createdAt DateTime @default(now())
}

model StatusHistory {
  id        String      @id @default(cuid())
  order     Order       @relation(fields: [orderId], references: [id])
  orderId   String
  from      OrderStatus
  to        OrderStatus
  changedBy String
  changedAt DateTime    @default(now())
  note      String?
}

model AuditLog {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  action    String   // LOGIN, VIEW_CLIENT, EXPORT_DATA, etc.
  entity    String?
  entityId  String?
  details   Json?
  ip        String?
  createdAt DateTime @default(now())
}
```

---

## Email Parsing with Claude AI

When a new email arrives or is manually synced, the system calls the Anthropic API to extract structured data:

```typescript
// Prompt sent to Claude for each email/thread
const EXTRACTION_PROMPT = `
You are a data extraction assistant for a pharmaceutical raw materials trading company in India.

Analyze the following email and extract any relevant order/inquiry information.
Return a JSON object with these fields (use null if not found):
{
  "isInquiry": boolean,
  "productName": string | null,
  "quantity": number | null,
  "unit": string | null,  // kg, g, MT, L, etc.
  "specs": string | null,  // grade, purity, pharmacopeia (USP, BP, IP)
  "targetPrice": number | null,
  "currency": string | null,
  "deliveryCountry": string | null,
  "deliveryPort": string | null,
  "incoterms": string | null,  // FOB, CIF, EXW, etc.
  "requiredDocuments": string[],  // COA, MSDS, etc.
  "urgency": "low" | "normal" | "high" | "urgent",
  "summary": string,  // 1-2 sentence plain English summary
  "suggestedStatus": string | null  // if this email indicates a status change
}
`;
```

---

## UI Design Direction

**Aesthetic**: Clean, professional, data-dense but not cluttered. Medical/pharmaceutical industry gravitas. Think Bloomberg Terminal meets modern SaaS.

- **Color palette**: Deep navy (`#0D1B2A`) background with crisp white cards, electric teal (`#00B4D8`) accents, amber (`#F59E0B`) for warnings/urgency
- **Typography**: `IBM Plex Sans` for UI text (technical, readable), `IBM Plex Mono` for order numbers and codes
- **Tables**: Sticky headers, row hover highlights, inline status badges with color coding
- **Status badges**: Color-coded pills for each OrderStatus
- **Density**: Compact table rows — this is a power-user tool, not a marketing site

---

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/medtrade_crm"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Anthropic (email parsing)
ANTHROPIC_API_KEY="sk-ant-..."

# Gmail OAuth
GMAIL_CLIENT_ID="..."
GMAIL_CLIENT_SECRET="..."

# Encryption key for sensitive fields (32 bytes hex)
ENCRYPTION_KEY="..."

# AWS S3 (optional, for document storage)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
```

---

## Project File Structure

```
medtrade-crm/
├── CLAUDE.md                    # This file
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (crm)/
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   │   └── [id]/
│   │   │   ├── clients/
│   │   │   │   └── [id]/
│   │   │   ├── manufacturers/
│   │   │   │   └── [id]/
│   │   │   ├── emails/
│   │   │   ├── products/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/
│   │       ├── orders/
│   │       ├── clients/
│   │       ├── manufacturers/
│   │       ├── emails/
│   │       │   ├── sync/
│   │       │   └── parse/
│   │       └── reports/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── layout/              # Sidebar, Header, Nav
│   │   ├── orders/              # Order-specific components
│   │   ├── clients/
│   │   ├── manufacturers/
│   │   ├── emails/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── encryption.ts        # AES-256 encrypt/decrypt
│   │   ├── gmail.ts             # Gmail API client
│   │   ├── email-parser.ts      # Claude API email parsing
│   │   └── audit.ts             # Audit logging helpers
│   ├── types/
│   └── middleware.ts            # Auth protection on all routes
├── .env.local
├── .env.example
├── .gitignore                   # Must include .env.local
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## Build Order for Claude Code

Build in this sequence to avoid dependency issues:

1. **Project scaffold** — Next.js 14 + TypeScript + Tailwind + Prisma setup
2. **Database schema** — Full Prisma schema as defined above
3. **Auth system** — NextAuth with credentials provider + middleware protecting all `/dashboard/*` routes
4. **Encryption utility** — AES-256 helpers for client/manufacturer sensitive fields
5. **Layout & navigation** — Sidebar with all pages, responsive, role-aware menu items
6. **Dashboard page** — Summary cards, activity feed, quick stats
7. **Orders module** — List page + detail page with status timeline
8. **Clients module** — List + detail (role-gated)
9. **Manufacturers module** — List + detail (role-gated)
10. **Email inbox** — Sync + display + link-to-order UI
11. **AI email parsing** — Anthropic API integration for extraction
12. **Products catalogue** — Simple CRUD
13. **Reports page** — Charts and exports
14. **Settings & audit log** — User management, session info
15. **Seed data** — Realistic fake data for development/demo

---

## Key Invariants (Never Break These)

- All routes under `/(crm)/` must be protected by NextAuth session middleware
- Client and Manufacturer names/contacts must ALWAYS be stored encrypted, decrypted only at render time
- Every access to Client or Manufacturer records must write an AuditLog entry
- Exports (CSV/PDF) must check for ADMIN role and log the action
- Email sync must never store raw email credentials in the database — use OAuth tokens only
- No `console.log` of sensitive fields in production code
