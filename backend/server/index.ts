import express from 'express';
import { GoogleGenAI } from '@google/genai';
import './env';
import { checkDb, isDbConfigured, pool } from './db';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { adminRouter } from './routes/admin';
import { currentUser } from './auth';

const PORT = Number(process.env.PORT ?? 3001);
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

// The value copied from .env.example is a non-empty string, so a plain truthiness
// check would report AI as enabled and then fail every request. Treat the
// placeholder as "not configured" so the chat falls back to demo mode cleanly.
const RAW_API_KEY = process.env.GEMINI_API_KEY;
const API_KEY = RAW_API_KEY && !RAW_API_KEY.startsWith('your-') ? RAW_API_KEY : undefined;

const ALLOWED_VIEWS = [
  'shop',
  'nutrition-quiz',
  'services',
  'subscriptions',
  'offers',
  'customer-dashboard',
  'order-tracking',
  'admin-dashboard',
] as const;

type AllowedView = (typeof ALLOWED_VIEWS)[number];

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatMessage[];
  products?: { name: string; brand: string; category: string; price: number }[];
  khataSummary?: { outstanding: number; records: number };
  role?: 'customer' | 'admin' | 'employee';
  userName?: string;
}

const FARMER_INSTRUCTION = `You are "Dr. Pashu", a licensed veterinary and dairy-nutrition doctor for an Indian dairy farming SaaS, answering in plain, practical language.

Your prime job is to behave like a real veterinary doctor. Rules:
- Answer ANY livestock health question directly and honestly: symptoms, likely causes, first aid, treatment options, prevention. Do not deflect to the app or say you only know the catalogue - the catalogue is only for feed product and price questions.
- Be honest about uncertainty: if several conditions share the symptoms, say so, list them in likely order, explain what to observe next, and when in doubt recommend a local veterinary visit. Never invent a drug dose you are not confident about; give commonly used guideline doses with a clear "confirm with your vet" note. For emergencies (choking, bloat, milk fever, severe bleeding, downer cow) say so and advise immediate local veterinary help.
- You may also answer general questions a farmer would ask - today's date and time, and the current weather - because feeding and care plans depend on them. Use the live context block below for exact values instead of guessing.
- Answer any cattle, buffalo, goat, poultry or crop husbandry question plainly, even if it is not about our shop.
- When the question is specifically about feed products, prices, or availability, ground the answer in the product catalogue in the context block and do not invent products or prices.
- Prefix actionable feed or health guidance with "Dr. Advice:".
- Keep answers concise (2-5 sentences unless asked more), empathetic, and practical for an Indian dairy farmer.
- If you offer a next step inside the app, set actionLabel to a short button caption (max 28 characters) and actionView to the matching view id. Use an empty string for both when no button fits.
- Never output markdown, bullet characters, or emoji.`;

const OWNER_INSTRUCTION = `You are "Dr. Pashu AI" running in SHOP-OWNER mode for PashuFeed Pro, a cattle feed shop and farm-management SaaS used by dairy shop owners in India.

The user you are talking to is a shop admin or counter staff member, NOT a farmer. Shift entirely to their job:
- Help with business: pricing, discounts, which products to stock, low-stock alerts, seasonal demand for feed, how to retain farmer customers, collecting Khata credit balances, and training counter staff.
- Help with data: explain what the sales analytics, Khata ledger, and delivery management screens mean and how to improve the numbers behind them.
- You may also help with simple code or automation ideas for the shop (for example a reminder SMS template, a stock alert script).
- Use the shop's actual catalogue and Khata numbers in the context block when you give advice - reference real product names and balances.
- Speak concisely and practically, like a business consultant who knows dairy retail in rural India. 2-5 sentences unless asked more.
- If you offer a next step inside the app, set actionLabel to a short button caption (max 28 characters) and actionView to the matching view id. Use an empty string for both when no button fits.
- Never output markdown, bullet characters, or emoji.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
      description: 'The reply shown in the chat bubble. Plain text, no markdown.',
    },
    actionLabel: {
      type: 'string',
      description: 'Label for an optional button that deep-links into the app. Empty string if none.',
    },
    actionView: {
      type: 'string',
      enum: [...ALLOWED_VIEWS, ''],
      description: 'Target view for the button. Empty string if none.',
    },
  },
  required: ['text', 'actionLabel', 'actionView'],
} as const;

function buildContext(payload: ChatRequestBody): string {
  const parts: string[] = [];

  const now = new Date();
  const dayName = now.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  const dateWords = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const timeWords = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  parts.push(`Today is ${dayName}, ${dateWords}. Current time in India: ${timeWords} IST.`);

  if (payload.products?.length) {
    const lines = payload.products
      .slice(0, 12)
      .map((p) => `- ${p.name} (${p.brand}, ${p.category}): INR ${p.price}`)
      .join('\n');
    parts.push(`Current feed catalogue:\n${lines}`);
  }

  if (payload.khataSummary) {
    parts.push(
      `Farmer Khata (credit ledger) status: ${payload.khataSummary.records} open records, ` +
        `INR ${payload.khataSummary.outstanding} outstanding.`
    );
  }

  if (cachedWeather) {
    parts.push(`Current weather near the shop (Kolhapur, Maharashtra): ${cachedWeather}`);
  }

  return parts.length ? `\n\nApp context:\n${parts.join('\n')}` : '';
}

/* Weather from the free Open-Meteo API (no key needed), cached for 10 minutes
   so every chat request does not hit the network. Scope: Kolhapur, because
   that is where the demo shop's customers are. */
let cachedWeather: string | null = null;
let weatherFetchedAt = 0;

async function refreshWeather(): Promise<void> {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=16.70&longitude=74.24&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FKolkata'
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number };
    };
    const c = data.current;
    if (c && typeof c.temperature_2m === 'number') {
      cachedWeather = `${c.temperature_2m}°C, humidity ${c.relative_humidity_2m}%, weather code ${c.weather_code}`;
      weatherFetchedAt = Date.now();
    }
  } catch {
    // No weather is fine: the model still has time and the catalogue.
  }
}

setInterval(() => {
  if (Date.now() - weatherFetchedAt > 10 * 60 * 1000) void refreshWeather();
}, 60 * 1000).unref();
void refreshWeather();

function toGeminiHistory(history: ChatMessage[] | undefined) {
  if (!history?.length) return [];
  return history
    .filter((m) => m.text.trim().length > 0)
    .slice(-8)
    .map((m) => ({
      role: m.sender === 'ai' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.text }],
    }));
}

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, aiEnabled: Boolean(API_KEY) });
});

app.get('/api/health/db', async (_req, res) => {
  res.json({ db: await checkDb() });
});

/**
 * Audit every API hit in the visits table, and refuse anything from a blocked
 * IP. Registered BEFORE the routers, otherwise the routers would answer the
 * request first and this middleware would never see it.
 */
app.use('/api', async (req, res, next) => {
  if (!isDbConfigured || !pool) return next();
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const blocked = await pool.query('SELECT 1 FROM blocked_ips WHERE ip = $1', [ip]);
    if (blocked.rowCount && blocked.rowCount > 0) {
      res.status(403).json({ error: 'BLOCKED', message: 'Access from this network has been blocked.' });
      return;
    }
    pool.query('INSERT INTO visits (ip, path, user_agent) VALUES ($1, $2, $3)', [ip, req.path, req.headers['user-agent'] ?? null]).catch(() => {});
    next();
  } catch {
    next();
  }
});

app.use('/api/auth', authRouter);
app.use('/api', productsRouter);
app.use('/api', ordersRouter);
app.use('/api', adminRouter);

app.post('/api/track', async (req, res) => {
  if (!isDbConfigured || !pool) {
    res.json({ ok: true, db: false });
    return;
  }
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const path = typeof req.body?.path === 'string' ? req.body.path : '/';
    await pool.query('INSERT INTO visits (ip, path, user_agent) VALUES ($1, $2, $3)', [ip, path, req.headers['user-agent'] ?? null]);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

app.post('/api/chat', async (req, res) => {
  // The AI advisor is our feature, so it belongs to our signed-in users.
  let sessionUser = null;
  try {
    sessionUser = await currentUser(req);
  } catch {
    sessionUser = null;
  }
  if (!sessionUser) {
    res.status(401).json({ error: 'SIGN_IN_REQUIRED', message: 'Sign in to chat with Dr. Pashu AI.' });
    return;
  }

  if (!API_KEY) {
    res.status(503).json({
      error: 'AI_DISABLED',
      message: 'GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.',
    });
    return;
  }

  const { message, history, products, khataSummary } = (req.body ?? {}) as ChatRequestBody;
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'A non-empty "message" is required.' });
    return;
  }

  const role = sessionUser.role;
  const isShopStaff = role === 'admin' || role === 'employee';
  const systemInstruction =
    (isShopStaff ? OWNER_INSTRUCTION : FARMER_INSTRUCTION) +
    buildContext({ products, khataSummary });
  const contents = [
    ...toGeminiHistory(history),
    { role: 'user' as const, parts: [{ text: message.trim() }] },
  ];

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Gemini answers a model overhaul with either a 404 (unknown model) or a
    // transient 503 under load. Retry the short-lived 503s a couple of times
    // with a pause, so a momentary demand spike is not the farmer's problem.
    let response;
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: RESPONSE_SCHEMA,
          },
        });
        break;
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number })?.status;
        if ((status !== 503 && status !== 429) || attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
    if (!response) throw lastError;

    const parsed = JSON.parse(response.text ?? '{}');
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';

    if (!text) {
      res.status(502).json({ error: 'EMPTY_RESPONSE', message: 'The model returned no content.' });
      return;
    }

    const requestedView = parsed.actionView as string | undefined;
    const actionLabel = typeof parsed.actionLabel === 'string' ? parsed.actionLabel.trim() : '';
    const view = (ALLOWED_VIEWS as readonly string[]).includes(requestedView ?? '')
      ? (requestedView as AllowedView)
      : undefined;

    res.json({
      text,
      actionBtn: view && actionLabel ? { label: actionLabel, view } : undefined,
    });
  } catch (error) {
    console.error('[api/chat] Gemini request failed:', error);
    const status = (error as { status?: number })?.status;
    res.status(502).json({
      error: status === 429 ? 'AI_RATE_LIMITED' : 'UPSTREAM_ERROR',
      message:
        status === 429
          ? 'Dr. Pashu is temporarily busy with high demand. Please try again in a moment.'
          : 'Dr. Pashu is momentarily unavailable. Please try again shortly.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`PashuFeed API listening on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('GEMINI_API_KEY missing - /api/chat will return 503 and the chat uses demo mode.');
  }
  if (!isDbConfigured) {
    console.warn(
      'DATABASE_URL missing - accounts are disabled and /api/auth returns 503. ' +
        'The storefront, AI quiz and chatbot still work. See README for setup.'
    );
  } else if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET missing - set it in .env or login will fail.');
  }
});
