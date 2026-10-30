import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { X, Send, HeartPulse, GripVertical } from 'lucide-react';
import type { MainView } from '../../types';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  actionBtn?: { label: string; view: MainView };
}

interface ChatApiReply {
  text: string;
  actionBtn?: { label: string; view: MainView };
}

/**
 * General dairy husbandry tips shown only when the Gemini backend is
 * unreachable, so the widget stays demonstrable without an API key. Surfaced
 * to the user as demo mode — not presented as a licensed veterinarian.
 */
const DEMO_REPLIES: { match: RegExp; text: string; actionBtn?: ChatMessage['actionBtn'] }[] = [
  {
    match: /^(hi|hello|hey|namaste|good morning|good evening|good afternoon)/i,
    text: 'Namaste! I am the PashuFeed assistant. Ask about feed, rations, or general dairy husbandry. For medical diagnosis, please consult a local veterinarian.',
  },
  {
    match: /who (am i|are you)/i,
    text: 'I am the PashuFeed feed & husbandry assistant. I can help with ration planning, product questions, and khata/order guidance. I am not a substitute for a veterinarian.',
  },
  {
    match: /fat|snf/i,
    text: 'To support milk fat percentage, many farmers add bypass fat at roughly 100–150 g/day alongside a high-protein concentrate. Fat test is also affected by breed, stage of lactation and forage quality. The ration calculator can size a bundle for your herd.',
    actionBtn: { label: 'Open ration calculator', view: 'nutrition-quiz' },
  },
  {
    match: /calf/i,
    text: 'A 24% protein calf starter from about 15 days of age supports rumen development. Introduce concentrate gradually alongside milk; keep water and dry feed available at all times.',
  },
  {
    match: /khata|credit/i,
    text: 'The khata (credit) ledger tracks feed bought on store credit. Open your dashboard to see outstanding balances and payment history.',
    actionBtn: { label: 'View khata ledger', view: 'customer-dashboard' },
  },
  {
    match: /vomit|vomited|vomiting|diarrhea|scours|loose motion|not eating|off feed|fever|lameness|limp|bloat|choking|milk fever|downer|mastitis|swollen udder/i,
    text: 'These symptoms need a hands-on check. Note species, age, how long signs have been present, and body temperature if you can. For scours in calves, start electrolytes early. For downer cows or severe bloat, call your local veterinarian immediately — do not wait.',
  },
  {
    match: /pregnant|pregnancy|heat|ai|artificial insemination|breeding|repeat breeder/i,
    text: 'Breeding decisions depend on body condition, health records and timing. Keep BCS around 3.0–3.5 at service, and work with your AI technician on heat detection windows. Pregnancy diagnosis should be done by a veterinarian.',
  },
  {
    match: /deworm|worm|parasite|lice|tick|fly/i,
    text: 'Deworming schedules vary by region and fodder system — many farms deworm 2–3 times a year. Rotate dewormer classes to reduce resistance, and treat ectoparasites with a vet-recommended pour-on or dip in peak season.',
  },
  {
    match: /weather|temperature|rain|humidity/i,
    text: 'In hot weather, dry matter intake and milk yield often drop. Provide shade, fans or sprinklers, and plenty of clean water; feed in early morning and late evening. In monsoon, keep feed dry and off the ground to limit fungal growth.',
  },
  {
    match: /.*/,
    text: 'For a simple starting point, aim for a 60:40 forage-to-concentrate ratio and balance protein to yield. Describe your animal type, daily yield, and stage of lactation and I can point you to a suitable feed bundle.',
  },
];

function getDemoReply(question: string): ChatApiReply {
  const hit = DEMO_REPLIES.find((r) => r.match.test(question));
  return { text: hit?.text ?? '', actionBtn: hit?.actionBtn };
}

const CowAvatar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center overflow-hidden rounded-full bg-pine ${className}`}>
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <circle cx="50" cy="50" r="48" fill="#1f4d3a" />
      <path d="M 22 25 L 12 10 L 32 20 Z" fill="#c8842a" />
      <path d="M 78 25 L 88 10 L 68 20 Z" fill="#c8842a" />
      <path d="M 18 35 C 10 30 10 45 22 40 Z" fill="#b4552d" />
      <path d="M 82 35 C 90 30 90 45 78 40 Z" fill="#b4552d" />
      <ellipse cx="50" cy="45" rx="28" ry="24" fill="#fffdf7" />
      <ellipse cx="50" cy="55" rx="20" ry="14" fill="#f4e7cd" />
      <circle cx="44" cy="55" r="2.5" fill="#b4552d" />
      <circle cx="56" cy="55" r="2.5" fill="#b4552d" />
      <circle cx="40" cy="42" r="3" fill="#1b2a22" />
      <circle cx="60" cy="42" r="3" fill="#1b2a22" />
      <path d="M 32 60 C 32 78 68 78 68 60" fill="none" stroke="#e3dac8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="74" r="5" fill="#c8842a" stroke="#fffdf7" strokeWidth="1.5" />
    </svg>
  </div>
);

export const AIChatbotWidget: React.FC = () => {
  const { setCurrentView, products, khataRecords } = useApp();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: t('chat.greeting'),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Reset the conversation whenever the signed-in identity changes so one
  // user's chat (including anything the AI said about their khata) never
  // appears for the next user.
  const userId = user?.id ?? null;
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: t('chat.greeting'),
      },
    ]);
    setInputText('');
    setIsThinking(false);
    setIsDemoMode(false);
  }, [userId, t]);

  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    if (Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.moved = true;
    }
    setPosition({
      x: dragStartRef.current.initX + deltaX,
      y: dragStartRef.current.initY + deltaY,
    });
  };

  const handlePointerUp = () => {
    if (!dragStartRef.current) return;
    const wasMoved = dragStartRef.current.moved;
    dragStartRef.current = null;
    setIsDragging(false);
    if (!wasMoved) {
      setIsOpen((prev) => !prev);
    }
  };

  const quickQuestions = isStaff
    ? [
        t('chat.chipLowStock'),
        t('chat.chipKhataCollect'),
        t('chat.chipOffers'),
      ]
    : [
        t('chat.chipFat'),
        t('chat.chipCalf'),
        t('chat.chipWeather'),
      ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text.trim() || isThinking) return;

    const userMessage: ChatMessage = { sender: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          role: user?.role ?? 'guest',
          userName: user?.name,
          language,
          products: products.map((p) => ({
            name: p.name,
            brand: p.brand,
            category: p.category,
            price: p.price,
          })),
          khataSummary: {
            outstanding: khataRecords.reduce((sum, r) => sum + (r.totalOutstanding ?? 0), 0),
            records: khataRecords.length,
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        if (res.status === 401 || detail?.error === 'SIGN_IN_REQUIRED') {
          setMessages((prev) => [
            ...prev,
            { sender: 'ai', text: t('chat.signInNotice') },
          ]);
          setIsThinking(false);
          return;
        }
        if (res.status === 503 || detail?.error === 'AI_DISABLED' || detail?.error === 'AI_RATE_LIMITED') {
          setIsDemoMode(true);
          throw new Error('AI_DISABLED');
        }
        throw new Error(detail?.message ?? `Request failed (${res.status})`);
      }

      const reply = (await res.json()) as ChatApiReply;
      setIsDemoMode(false);
      setMessages((prev) => [...prev, { sender: 'ai', text: reply.text, actionBtn: reply.actionBtn }]);
    } catch (error) {
      const offline = error instanceof Error && error.message === 'AI_DISABLED';
      if (!offline) setIsDemoMode(true);

      const demo = getDemoReply(text);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: offline
            ? demo.text
            : `Connection issue — here is general guidance instead. ${demo.text}`,
          actionBtn: demo.actionBtn,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div
      className="no-print fixed bottom-6 right-6 z-50 touch-none select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
      }}
    >
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`group relative flex cursor-grab items-center gap-2.5 rounded-full border-2 border-pine/20 bg-paper p-2.5 pr-5 shadow-lg transition-all active:cursor-grabbing ${
            isDragging ? 'scale-105' : 'hover:scale-105'
          }`}
        >
          <div className="pl-1 text-ink-soft">
            <GripVertical className="h-4 w-4" />
          </div>
          <CowAvatar className="h-11 w-11 shrink-0 border border-line" />
          <div className="hidden text-left sm:block">
            <div className="flex items-center gap-1 text-xs font-bold text-ink">
              <span>PashuFeed assistant</span>
            </div>
            <div className="text-[10px] text-ink-soft">Drag anywhere · feed & husbandry help</div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="flex max-h-[520px] w-80 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-paper shadow-xl sm:w-96">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex cursor-grab select-none items-center justify-between border-b border-pine-deep/40 bg-pine p-3.5 text-white active:cursor-grabbing"
          >
            <div className="flex items-center gap-2.5">
              <GripVertical className="h-4 w-4 shrink-0 text-white/60" />
              <CowAvatar className="h-10 w-10 shrink-0 border border-white/20" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold">PashuFeed assistant</h3>
                  <span className="rounded border border-white/25 bg-white/10 px-1.5 py-0.2 text-[9px] font-extrabold text-white/85">
                    AI
                  </span>
                </div>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/80">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre" />
                  {isDemoMode ? 'Demo tips mode' : 'Live assistant'} · drag header to move
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="cursor-pointer p-1 text-white/80 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-line bg-pine-soft px-3.5 py-1.5 text-[10px] text-ink select-none">
            <span className="flex items-center gap-1 font-semibold">
              <HeartPulse className="h-3.5 w-3.5 text-pine" />
              Feed & husbandry guidance
            </span>
            <span className="rounded bg-paper px-1.5 py-0.5 font-bold text-pine">
              {isDemoMode ? 'Demo tips' : 'Live AI'}
            </span>
          </div>

          {isDemoMode && (
            <div className="border-b border-ochre/30 bg-ochre-soft px-3.5 py-1.5 text-[10px] leading-relaxed text-ink">
              Live AI is unavailable — these are general tips shown for demonstration. Add a
              GEMINI_API_KEY in .env and start the API server for live replies.
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs select-text">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && <CowAvatar className="h-8 w-8 shrink-0 border border-line" />}
                <div
                  className={`max-w-[82%] rounded-2xl p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'rounded-br-sm bg-pine text-white'
                      : 'rounded-bl-sm border border-line bg-cream text-ink'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.actionBtn && (
                    <button
                      onClick={() => {
                        if (m.actionBtn) {
                          setCurrentView(m.actionBtn.view);
                          setIsOpen(false);
                        }
                      }}
                      className="mt-2.5 w-full cursor-pointer rounded-lg bg-ochre px-3 py-1.5 text-center text-[11px] font-bold text-ink transition-colors hover:brightness-105"
                    >
                      {m.actionBtn.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start gap-2.5">
                <CowAvatar className="h-8 w-8 shrink-0 border border-line" />
                <div className="rounded-2xl rounded-bl-sm border border-line bg-cream px-3 py-2.5 text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-t border-line bg-cream p-2 scrollbar-none">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={isThinking}
                className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink transition-colors hover:border-pine disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-paper p-3">
            <input
              type="text"
              placeholder="Ask about feed, fat %, calf care, or khata..."
              value={inputText}
              disabled={isThinking}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="field flex-1 disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={isThinking}
              className="btn btn-primary !p-2.5 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
