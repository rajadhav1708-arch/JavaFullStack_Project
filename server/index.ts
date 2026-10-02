import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const PORT = Number(process.env.PORT ?? 3001);
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;

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
}

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

const SYSTEM_INSTRUCTION = `You are "Dr. Pashu", the in-app veterinary and dairy-nutrition advisor for PashuFeed Pro, a cattle feed shop and farm-management SaaS used by dairy farmers and shop owners in India.

Rules:
- Answer cattle and buffalo nutrition, ration formulation, feed product, milk-fat-test (SNF), calf rearing, and Khata (farmer credit ledger) questions.
- Speak plainly and concisely, like a livestock adviser speaking to an Indian dairy farmer. 2-4 sentences unless asked for more detail.
- Ground answers in the product catalogue supplied in the context when the farmer asks about feed, price, or availability. Never invent a product, price, or scheme that is not in that catalogue.
- Prefix actionable feed or health guidance with "Dr. Advice:".
- This is educational guidance for livestock, not a prescription. For clinical illness, advise consulting a veterinarian.
- If you offer a next step inside the app, set actionLabel to a short button caption (max 28 characters) and actionView to the matching view id. Use an empty string for both when no button fits.
- Never output markdown, bullet characters, or emoji.`;

function buildContext(payload: ChatRequestBody): string {
  const parts: string[] = [];

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

  return parts.length ? `\n\nApp context:\n${parts.join('\n')}` : '';
}

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

app.post('/api/chat', async (req, res) => {
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

  const systemInstruction = SYSTEM_INSTRUCTION + buildContext({ products, khataSummary });
  const contents = [
    ...toGeminiHistory(history),
    { role: 'user' as const, parts: [{ text: message.trim() }] },
  ];

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });

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
    res.status(502).json({
      error: 'UPSTREAM_ERROR',
      message: 'The AI advisor is temporarily unavailable. Please try again.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`PashuFeed API listening on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('GEMINI_API_KEY missing - /api/chat will return 503 and the chat uses demo mode.');
  }
});
