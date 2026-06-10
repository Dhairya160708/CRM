import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createCipheriv, randomBytes } from "crypto";

const prisma = new PrismaClient();

// ── Encryption (mirrors src/lib/encryption.ts) ──────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be set (64 hex chars) in .env.local");
  }
  return Buffer.from(hex, "hex");
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding MedTrade CRM...");

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminPw = await hash("Admin@1234", 12);
  const managerPw = await hash("Manager@1234", 12);
  const viewerPw = await hash("Viewer@1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@medtrade.com" },
    update: {},
    create: {
      email: "admin@medtrade.com",
      name: "Dhairyaa (Admin)",
      passwordHash: adminPw,
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@medtrade.com" },
    update: {},
    create: {
      email: "manager@medtrade.com",
      name: "Priya Sharma",
      passwordHash: managerPw,
      role: "MANAGER",
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@medtrade.com" },
    update: {},
    create: {
      email: "viewer@medtrade.com",
      name: "Rajan Gupta",
      passwordHash: viewerPw,
      role: "VIEWER",
    },
  });

  const demoPw = await hash("Demo@1234", 12);
  await prisma.user.upsert({
    where: { email: "demo@medtrade.com" },
    update: { role: "MANAGER" },
    create: {
      email: "demo@medtrade.com",
      name: "Demo User",
      passwordHash: demoPw,
      role: "MANAGER",
      isDemo: true,
    },
  });

  console.log("✅ Users created");

  // ── Products ───────────────────────────────────────────────────────────────
  const productDefs = [
    { name: "Paracetamol API", casNumber: "103-90-2", category: "API", unit: "kg" },
    { name: "Amoxicillin Trihydrate", casNumber: "61336-70-7", category: "API", unit: "kg" },
    { name: "Metformin HCl", casNumber: "1115-70-4", category: "API", unit: "kg" },
    { name: "Atorvastatin Calcium", casNumber: "134523-00-5", category: "API", unit: "kg" },
    { name: "Omeprazole", casNumber: "73590-58-6", category: "API", unit: "kg" },
    { name: "Ibuprofen", casNumber: "15687-27-1", category: "API", unit: "kg" },
    { name: "Ascorbic Acid USP", casNumber: "50-81-7", category: "Excipient", unit: "kg" },
    { name: "Microcrystalline Cellulose PH102", casNumber: "9004-34-6", category: "Excipient", unit: "kg" },
    { name: "Lactose Monohydrate", casNumber: "64044-51-5", category: "Excipient", unit: "kg" },
    { name: "Magnesium Stearate", casNumber: "557-04-0", category: "Excipient", unit: "kg" },
    { name: "Ceftriaxone Sodium", casNumber: "74578-69-1", category: "API", unit: "kg" },
    { name: "Azithromycin", casNumber: "83905-01-5", category: "API", unit: "kg" },
  ];

  const products: Record<string, { id: string }> = {};
  for (const p of productDefs) {
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({ data: { ...p, isDemoData: true } });
    }
    products[p.name] = product;
  }

  // Fetch all created products
  const allProducts = await prisma.product.findMany();
  for (const p of allProducts) products[p.name] = p;

  console.log("✅ Products created");

  // ── Clients ────────────────────────────────────────────────────────────────
  const clientDefs = [
    {
      name: "Karim Al-Rashid",
      company: "Gulf Pharma Trading LLC",
      country: "UAE",
      language: "Arabic/English",
      email: "karim@gulfpharma.ae",
      tags: ["High Volume", "Reliable", "Fast Payment"],
    },
    {
      name: "Zhang Wei",
      company: "SinoMed Imports Co.",
      country: "China",
      language: "Chinese/English",
      email: "zhang.wei@sinomed.cn",
      tags: ["Price Sensitive", "High Volume"],
    },
    {
      name: "Elena Petrov",
      company: "EastEuro Pharma GmbH",
      country: "Germany",
      language: "German/English",
      email: "e.petrov@easteuropharma.de",
      tags: ["Quality Focused", "Requires GMP Docs"],
    },
    {
      name: "Mohammed Al-Farsi",
      company: "Riyadh Medical Supplies",
      country: "Saudi Arabia",
      language: "Arabic/English",
      email: "m.alfarsi@rms.sa",
      tags: ["Reliable", "New Client"],
    },
    {
      name: "Nguyen Thi Lan",
      company: "VietPharma Import",
      country: "Vietnam",
      language: "Vietnamese/English",
      email: "lan@vietpharmaimport.vn",
      tags: ["Price Sensitive"],
    },
    {
      name: "Fatima Hassan",
      company: "AfriMed Trading",
      country: "Nigeria",
      language: "English",
      email: "f.hassan@afrimed.ng",
      tags: ["Slow Payment", "Bulk Orders"],
    },
  ];

  const clients: Record<string, { id: string }> = {};
  for (const c of clientDefs) {
    const client = await prisma.client.create({
      data: {
        nameEncrypted: encrypt(c.name),
        company: c.company,
        country: c.country,
        language: c.language,
        email: encrypt(c.email),
        tags: c.tags,
        isActive: true,
        isDemoData: true,
      },
    });
    clients[c.name] = client;
  }

  console.log("✅ Clients created");

  // ── Manufacturers ──────────────────────────────────────────────────────────
  const mfgDefs = [
    {
      name: "Cipla Limited",
      location: "Mumbai, Maharashtra",
      contact: "procurement@cipla.com",
      certifications: ["GMP", "WHO-GMP", "US FDA"],
      reliabilityScore: 5,
    },
    {
      name: "Sun Pharmaceutical Industries",
      location: "Vadodara, Gujarat",
      contact: "export@sunpharma.com",
      certifications: ["GMP", "US FDA", "EU GMP"],
      reliabilityScore: 5,
    },
    {
      name: "Cadila Pharmaceuticals",
      location: "Ahmedabad, Gujarat",
      contact: "api@cadila.com",
      certifications: ["GMP", "ISO 9001"],
      reliabilityScore: 4,
    },
    {
      name: "Laurus Labs",
      location: "Hyderabad, Telangana",
      contact: "bulk@lauruslabs.com",
      certifications: ["US FDA", "EU GMP", "WHO-GMP"],
      reliabilityScore: 4,
    },
    {
      name: "Aarti Drugs Ltd",
      location: "Nagpur, Maharashtra",
      contact: "sales@aartidrugs.com",
      certifications: ["GMP", "ISO 14001"],
      reliabilityScore: 3,
    },
    {
      name: "Granules India",
      location: "Hyderabad, Telangana",
      contact: "exports@granulesindia.com",
      certifications: ["US FDA", "GMP"],
      reliabilityScore: 4,
    },
  ];

  const manufacturers: Record<string, { id: string }> = {};
  for (const m of mfgDefs) {
    const mfg = await prisma.manufacturer.create({
      data: {
        nameEncrypted: encrypt(m.name),
        location: m.location,
        contactEncrypted: encrypt(m.contact),
        certifications: m.certifications,
        reliabilityScore: m.reliabilityScore,
        isActive: true,
        isDemoData: true,
      },
    });
    manufacturers[m.name] = mfg;
  }

  console.log("✅ Manufacturers created");

  // ── ManufacturerProducts ───────────────────────────────────────────────────
  const mfgProducts = [
    { mfg: "Cipla Limited", product: "Paracetamol API", lastPrice: 8.5, moq: 100, leadTimeDays: 21 },
    { mfg: "Cipla Limited", product: "Ibuprofen", lastPrice: 12.0, moq: 200, leadTimeDays: 25 },
    { mfg: "Sun Pharmaceutical Industries", product: "Atorvastatin Calcium", lastPrice: 450.0, moq: 10, leadTimeDays: 30 },
    { mfg: "Sun Pharmaceutical Industries", product: "Omeprazole", lastPrice: 95.0, moq: 50, leadTimeDays: 28 },
    { mfg: "Sun Pharmaceutical Industries", product: "Metformin HCl", lastPrice: 6.5, moq: 500, leadTimeDays: 20 },
    { mfg: "Cadila Pharmaceuticals", product: "Amoxicillin Trihydrate", lastPrice: 35.0, moq: 100, leadTimeDays: 35 },
    { mfg: "Laurus Labs", product: "Ceftriaxone Sodium", lastPrice: 320.0, moq: 20, leadTimeDays: 45 },
    { mfg: "Laurus Labs", product: "Azithromycin", lastPrice: 180.0, moq: 50, leadTimeDays: 40 },
    { mfg: "Aarti Drugs Ltd", product: "Paracetamol API", lastPrice: 7.8, moq: 500, leadTimeDays: 18 },
    { mfg: "Granules India", product: "Metformin HCl", lastPrice: 6.2, moq: 1000, leadTimeDays: 22 },
    { mfg: "Granules India", product: "Paracetamol API", lastPrice: 8.0, moq: 250, leadTimeDays: 20 },
  ];

  for (const mp of mfgProducts) {
    const mfg = manufacturers[mp.mfg];
    const product = allProducts.find((p: { id: string; name: string }) => p.name === mp.product);
    if (!mfg || !product) continue;
    await prisma.manufacturerProduct.create({
      data: {
        manufacturerId: mfg.id,
        productId: product.id,
        lastPrice: mp.lastPrice,
        moq: mp.moq,
        leadTimeDays: mp.leadTimeDays,
      },
    });
  }

  console.log("✅ Manufacturer-Product links created");

  // ── Orders ─────────────────────────────────────────────────────────────────
  type OrderStatus =
    | "INQUIRY" | "SOURCING" | "QUOTED" | "NEGOTIATING"
    | "CONFIRMED" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CLOSED" | "CANCELLED";

  const orderDefs: {
    client: string; product: string; manufacturer?: string;
    quantity: number; unit: string; specs?: string;
    targetPrice?: number; confirmedPrice?: number; currency: string;
    incoterms?: string; deliveryCountry?: string;
    status: OrderStatus; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    createdDaysAgo: number; expectedShipDaysFromNow?: number; actualShipDaysAgo?: number;
  }[] = [
    {
      client: "Karim Al-Rashid", product: "Paracetamol API",
      manufacturer: "Cipla Limited",
      quantity: 500, unit: "kg", specs: "USP Grade, Micronized",
      targetPrice: 4500, confirmedPrice: 4250, currency: "USD",
      incoterms: "CIF", deliveryCountry: "UAE",
      status: "SHIPPED", priority: "HIGH",
      createdDaysAgo: 60, expectedShipDaysFromNow: -5, actualShipDaysAgo: 7,
    },
    {
      client: "Zhang Wei", product: "Metformin HCl",
      manufacturer: "Sun Pharmaceutical Industries",
      quantity: 2000, unit: "kg", specs: "BP 2023",
      targetPrice: 12000, confirmedPrice: 12400, currency: "USD",
      incoterms: "FOB", deliveryCountry: "China",
      status: "IN_PRODUCTION", priority: "NORMAL",
      createdDaysAgo: 45, expectedShipDaysFromNow: 15,
    },
    {
      client: "Elena Petrov", product: "Atorvastatin Calcium",
      manufacturer: "Sun Pharmaceutical Industries",
      quantity: 50, unit: "kg", specs: "EP, Certificate of Suitability",
      targetPrice: 24000, confirmedPrice: 22500, currency: "USD",
      incoterms: "DDP", deliveryCountry: "Germany",
      status: "CONFIRMED", priority: "HIGH",
      createdDaysAgo: 30, expectedShipDaysFromNow: 20,
    },
    {
      client: "Karim Al-Rashid", product: "Amoxicillin Trihydrate",
      manufacturer: "Cadila Pharmaceuticals",
      quantity: 300, unit: "kg", specs: "BP/USP",
      targetPrice: 11000, currency: "USD",
      incoterms: "CIF", deliveryCountry: "UAE",
      status: "NEGOTIATING", priority: "NORMAL",
      createdDaysAgo: 20,
    },
    {
      client: "Nguyen Thi Lan", product: "Ibuprofen",
      quantity: 1000, unit: "kg",
      targetPrice: 13000, currency: "USD",
      status: "SOURCING", priority: "NORMAL",
      createdDaysAgo: 10,
    },
    {
      client: "Mohammed Al-Farsi", product: "Omeprazole",
      quantity: 100, unit: "kg", specs: "USP 40mg pellets",
      currency: "USD",
      status: "INQUIRY", priority: "NORMAL",
      createdDaysAgo: 3,
    },
    {
      client: "Fatima Hassan", product: "Paracetamol API",
      manufacturer: "Aarti Drugs Ltd",
      quantity: 1000, unit: "kg", specs: "BP Grade",
      targetPrice: 7800, confirmedPrice: 7800, currency: "USD",
      incoterms: "FOB", deliveryCountry: "Nigeria",
      status: "DELIVERED", priority: "NORMAL",
      createdDaysAgo: 120, actualShipDaysAgo: 25,
    },
    {
      client: "Zhang Wei", product: "Ceftriaxone Sodium",
      manufacturer: "Laurus Labs",
      quantity: 30, unit: "kg", specs: "Sterile Grade, EP",
      targetPrice: 10000, currency: "USD",
      incoterms: "CIF", deliveryCountry: "China",
      status: "QUOTED", priority: "HIGH",
      createdDaysAgo: 14,
    },
    {
      client: "Elena Petrov", product: "Ascorbic Acid USP",
      manufacturer: "Cipla Limited",
      quantity: 500, unit: "kg", specs: "USP/EP Fine Powder",
      targetPrice: 3500, confirmedPrice: 3200, currency: "USD",
      incoterms: "DDP", deliveryCountry: "Germany",
      status: "CLOSED", priority: "LOW",
      createdDaysAgo: 180, actualShipDaysAgo: 90,
    },
    {
      client: "Karim Al-Rashid", product: "Azithromycin",
      quantity: 80, unit: "kg",
      targetPrice: 15000, currency: "USD",
      status: "INQUIRY", priority: "URGENT",
      createdDaysAgo: 1,
    },
    {
      client: "Nguyen Thi Lan", product: "Metformin HCl",
      manufacturer: "Granules India",
      quantity: 3000, unit: "kg",
      targetPrice: 18000, confirmedPrice: 18600, currency: "USD",
      incoterms: "FOB", deliveryCountry: "Vietnam",
      status: "IN_PRODUCTION", priority: "NORMAL",
      createdDaysAgo: 55, expectedShipDaysFromNow: 25,
    },
    {
      client: "Mohammed Al-Farsi", product: "Ibuprofen",
      quantity: 500, unit: "kg",
      currency: "USD",
      status: "CANCELLED", priority: "LOW",
      createdDaysAgo: 90,
    },
  ];

  const year = new Date().getFullYear();
  const usedNumbers = new Set<number>();

  for (let i = 0; i < orderDefs.length; i++) {
    const def = orderDefs[i];
    const client = clients[def.client];
    const product = allProducts.find((p: { id: string; name: string }) => p.name === def.product);
    const manufacturer = def.manufacturer ? manufacturers[def.manufacturer] : undefined;

    if (!client || !product) continue;

    let num: number;
    do { num = Math.floor(Math.random() * 9000) + 1000; } while (usedNumbers.has(num));
    usedNumbers.add(num);
    const orderNumber = `ORD-${year}-${num}`;

    const createdAt = daysAgo(def.createdDaysAgo);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: client.id,
        productId: product.id,
        manufacturerId: manufacturer?.id,
        quantity: def.quantity,
        unit: def.unit,
        specs: def.specs,
        targetPrice: def.targetPrice,
        confirmedPrice: def.confirmedPrice,
        currency: def.currency,
        incoterms: def.incoterms,
        deliveryCountry: def.deliveryCountry,
        status: def.status,
        priority: def.priority,
        isDemoData: true,
        createdAt,
        updatedAt: daysAgo(Math.max(0, def.createdDaysAgo - 5)),
        expectedShipDate: def.expectedShipDaysFromNow != null ? daysFromNow(def.expectedShipDaysFromNow) : undefined,
        actualShipDate: def.actualShipDaysAgo != null ? daysAgo(def.actualShipDaysAgo) : undefined,
        statusHistory: {
          create: {
            from: "INQUIRY",
            to: def.status,
            changedBy: admin.name,
            changedAt: createdAt,
            note: "Initial status from seed",
          },
        },
      },
    });

    // Add a sample note on a few orders
    if (i < 4) {
      await prisma.note.create({
        data: {
          content: [
            "Client confirmed specs match their requirements.",
            "COA and MSDS documents requested. Following up with manufacturer.",
            "Manufacturer confirmed availability. Lead time 30 days.",
            "Price negotiation ongoing. Client wants 5% discount on bulk.",
          ][i],
          authorId: admin.id,
          orderId: order.id,
        },
      });
    }
  }

  console.log("✅ Orders created");

  // ── Email Threads ──────────────────────────────────────────────────────────
  const allClients = await prisma.client.findMany();
  const allOrders = await prisma.order.findMany({ include: { product: true } });

  const emailDefs = [
    {
      clientName: "Karim Al-Rashid",
      subject: "Re: Inquiry for Paracetamol API 500kg - USP Grade",
      summary: "Client requesting 500kg Paracetamol USP Grade with COA and MSDS. Needs CIF Dubai.",
      messages: [
        {
          from: "karim@gulfpharma.ae",
          to: "trade@medtrade.com",
          body: `Dear Sir/Madam,

We are interested in procuring Paracetamol API, USP Grade, Micronized, 500 kg.
Please provide your best CIF Dubai price with lead time.
We require COA, MSDS and GMP certificate.

Best regards,
Karim Al-Rashid
Gulf Pharma Trading LLC`,
          isInbound: true,
          daysAgo: 62,
        },
        {
          from: "trade@medtrade.com",
          to: "karim@gulfpharma.ae",
          body: `Dear Mr. Karim,

Thank you for your inquiry. We can supply Paracetamol API USP Grade, Micronized, 500 kg.

Quoted Price: USD 8.50/kg CIF Dubai
Lead Time: 21 days from order confirmation
Documents: COA, MSDS, GMP Certificate included

Please confirm if this is acceptable.

Best regards,
MedTrade`,
          isInbound: false,
          daysAgo: 60,
        },
      ],
    },
    {
      clientName: "Zhang Wei",
      subject: "New Inquiry - Metformin HCl BP 2000kg",
      summary: "Bulk order inquiry for 2000kg Metformin HCl BP grade. Price sensitive buyer.",
      messages: [
        {
          from: "zhang.wei@sinomed.cn",
          to: "trade@medtrade.com",
          body: `Hello,

We need Metformin HCl BP 2023, 2000 kg quantity.
Our target price is USD 5.50/kg FOB Indian port.
Please confirm availability and best price.

Zhang Wei
SinoMed Imports`,
          isInbound: true,
          daysAgo: 47,
        },
      ],
    },
    {
      clientName: "Mohammed Al-Farsi",
      subject: "Urgent: Omeprazole 100kg Inquiry",
      summary: "Urgent inquiry for Omeprazole 40mg pellets 100kg, no price given.",
      messages: [
        {
          from: "m.alfarsi@rms.sa",
          to: "trade@medtrade.com",
          body: `Dear Team,

We urgently require Omeprazole 40mg pellets (Enteric Coated), USP grade, 100 kg.
Please send price and availability ASAP.
This is time-sensitive for a hospital tender.

Regards,
Mohammed Al-Farsi`,
          isInbound: true,
          daysAgo: 3,
        },
      ],
    },
    {
      subject: "New Supplier Inquiry - Azithromycin 80kg",
      summary: null,
      messages: [
        {
          from: "unknown.buyer@pharmaworld.com",
          to: "trade@medtrade.com",
          body: `Hi,

Do you supply Azithromycin API? We need 80kg urgently.
Please send price CIF Jebel Ali.

Thanks`,
          isInbound: true,
          daysAgo: 1,
        },
      ],
    },
  ];

  for (const def of emailDefs) {
    // Find client by name (stored encrypted — use index match instead)
    const clientMatch = def.clientName
      ? allClients[clientDefs.findIndex((cd: { name: string }) => cd.name === def.clientName)] ?? null
      : null;

    // Link to matching order
    const orderMatch = def.clientName
      ? allOrders.find(
          (o: { clientId: string; status: string }) =>
            o.clientId === clientMatch?.id &&
            ["INQUIRY", "SOURCING", "QUOTED", "NEGOTIATING", "CONFIRMED"].includes(o.status)
        ) ?? null
      : null;

    await prisma.emailThread.create({
      data: {
        subject: def.subject,
        aiSummary: def.summary,
        clientId: clientMatch?.id,
        orderId: orderMatch?.id,
        isDemoData: true,
        messages: {
          create: def.messages.map((m) => ({
            from: m.from,
            to: m.to,
            subject: def.subject,
            body: m.body,
            sentAt: daysAgo(m.daysAgo),
            isInbound: m.isInbound,
          })),
        },
      },
    });
  }

  console.log("✅ Email threads created");

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  const auditEntries = [
    { userId: admin.id, action: "LOGIN", ip: "192.168.1.10" },
    { userId: admin.id, action: "VIEW_CLIENT", entity: "Client" },
    { userId: manager.id, action: "LOGIN", ip: "192.168.1.11" },
    { userId: manager.id, action: "CREATE_ORDER", entity: "Order" },
    { userId: admin.id, action: "UPDATE_ORDER", entity: "Order" },
    { userId: viewer.id, action: "LOGIN", ip: "192.168.1.12" },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const e = auditEntries[i];
    await prisma.auditLog.create({
      data: {
        userId: e.userId,
        action: e.action,
        entity: e.entity,
        ip: e.ip,
        createdAt: daysAgo(i),
      },
    });
  }

  console.log("✅ Audit logs created");
  console.log("\n🎉 Seed complete!\n");
  console.log("  Admin:   admin@medtrade.com   / Admin@1234");
  console.log("  Manager: manager@medtrade.com / Manager@1234");
  console.log("  Viewer:  viewer@medtrade.com  / Viewer@1234\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
