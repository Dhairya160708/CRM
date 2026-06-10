// Gmail API client — requires GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET in .env.local

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    body: { data?: string };
    parts?: {
      mimeType: string;
      body: { data?: string };
      parts?: { mimeType: string; body: { data?: string } }[];
    }[];
  };
}

export interface GmailThread {
  id: string;
  snippet: string;
  messages: GmailMessage[];
}

const INBOX_QUERY = [
  "in:inbox",
  "-category:promotions",
  "-category:social",
  "-category:updates",
  "-category:forums",
  "-from:noreply",
  "-from:no-reply",
  "-from:donotreply",
  "-from:mailer-daemon",
  "-from:notifications",
  "-from:alerts",
  "-from:support",
  "-from:team",
].join(" ");

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractBodyFromParts(
  parts: { mimeType: string; body: { data?: string }; parts?: { mimeType: string; body: { data?: string } }[] }[]
): string {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64(part.body.data);
    if (part.parts) {
      const nested = extractBodyFromParts(part.parts);
      if (nested) return nested;
    }
  }
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) return decodeBase64(part.body.data);
  }
  return "";
}

function extractBody(msg: GmailMessage): string {
  if (msg.payload.body?.data) return decodeBase64(msg.payload.body.data);
  if (msg.payload.parts) return extractBodyFromParts(msg.payload.parts);
  return "";
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { error_description?: string };
    throw new Error(`Token refresh failed: ${err.error_description ?? res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function fetchThreadFull(id: string, accessToken: string): Promise<GmailThread | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return res.json() as Promise<GmailThread>;
}

// Fetch up to maxResults recent threads (regular sync)
export async function fetchGmailThreads(
  accessToken: string,
  maxResults = 50
): Promise<GmailThread[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}&q=${encodeURIComponent(INBOX_QUERY)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const listData = (await listRes.json()) as { threads?: { id: string }[] };
  if (!listData.threads) return [];

  const results = await Promise.all(listData.threads.map((t) => fetchThreadFull(t.id, accessToken)));
  return results.filter(Boolean) as GmailThread[];
}

// Paginate through the ENTIRE inbox and return all thread IDs (up to cap)
export async function fetchAllGmailThreadIds(
  accessToken: string,
  maxTotal = 500
): Promise<string[]> {
  const allIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const url =
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=100&q=${encodeURIComponent(INBOX_QUERY)}` +
      (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) break;
    const data = (await res.json()) as { threads?: { id: string }[]; nextPageToken?: string };
    if (data.threads) allIds.push(...data.threads.map((t) => t.id));
    pageToken = data.nextPageToken;
  } while (pageToken && allIds.length < maxTotal);

  return allIds;
}

// Fetch full thread data in parallel batches
export async function fetchThreadsBatch(ids: string[], accessToken: string, batchSize = 8): Promise<GmailThread[]> {
  const results: GmailThread[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const settled = await Promise.all(batch.map((id) => fetchThreadFull(id, accessToken)));
    results.push(...(settled.filter(Boolean) as GmailThread[]));
  }
  return results;
}

export function parseGmailThread(thread: GmailThread) {
  const msgs = thread.messages ?? [];
  const first = msgs[0];
  const subject = first ? getHeader(first.payload.headers, "Subject") : "(no subject)";

  return {
    gmailThreadId: thread.id,
    subject,
    messages: msgs.map((msg) => ({
      gmailId: msg.id,
      from: getHeader(msg.payload.headers, "From"),
      to: getHeader(msg.payload.headers, "To"),
      subject: getHeader(msg.payload.headers, "Subject"),
      body: extractBody(msg),
      sentAt: new Date(parseInt(msg.internalDate)),
      isInbound: true,
    })),
  };
}
