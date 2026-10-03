import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, X, Send, Stethoscope, HeartPulse, GripVertical } from 'lucide-react';
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
 * Canned answers used only when the Gemini backend is unreachable, so the widget
 * stays demonstrable without an API key. Surfaced to the user as "demo mode".
 */
const DEMO_REPLIES: { match: RegExp; text: string; actionBtn?: ChatMessage['actionBtn'] }[] = [
  {
    match: /fat|snf/i,
    text: 'Dr. Advice: To push milk fat percentage above 4.5%, feed bypass fat at 100-150 g/day alongside your high-protein pellet. Bypass fat passes the rumen intact, so more of it reaches the udder for fat synthesis.',
    actionBtn: { label: 'Open Ration Calculator', view: 'nutrition-quiz' },
  },
  {
    match: /calf/i,
    text: 'Dr. Advice: Calf starter feed at 24% crude protein speeds up rumen papillae development. Introduce it from 15 days of age to hit roughly 500 g of daily weight gain through weaning.',
  },
  {
    match: /khata|credit/i,
    text: 'Dr. Advice: The Farmer Credit Khata lets registered dairy farmers buy feed on credit, settled automatically against milk-collection union payouts. Open your dashboard to see outstanding balances.',
    actionBtn: { label: 'View Khata Ledger', view: 'customer-dashboard' },
  },
  {
    match: /.*/,
    text: 'Dr. Advice: For steady milk yield without risking rumen acidosis, hold a 60:40 forage-to-concentrate ratio and supplement with ionic calcium and bypass fat.',
  },
];

function getDemoReply(question: string): ChatApiReply {
  const hit = DEMO_REPLIES.find((r) => r.match.test(question));
  return { text: hit?.text ?? '', actionBtn: hit?.actionBtn };
}

export const AIChatbotWidget: React.FC = () => {
  const { setSelectedProduct, setCurrentView, products, khataRecords } = useApp();
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Namaste! I am Dr. Pashu AI, your veterinary & dairy nutrition advisor. How can I help with your cattle health or feed today?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Drag & Drop state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with main mouse button or touch
    if (e.button !== undefined && e.button !== 0) return;
    
    // Capture pointer
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

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    
    const wasMoved = dragStartRef.current.moved;
    dragStartRef.current = null;
    setIsDragging(false);

    // If it was just a tap/click without drag motion, toggle open
    if (!wasMoved) {
      setIsOpen((prev) => !prev);
    }
  };

  const quickQuestions = isStaff
    ? [
        'Which products are low in stock?',
        'How do I collect pending Khata credit?',
        'Suggest 3 offers to move slow-selling feed',
      ]
    : [
        'Which feed boosts milk fat test?',
        'Calf nutrition guidance',
        'What is today\'s weather like?',
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
            { sender: 'ai', text: 'Please sign in to chat with Dr. Pashu AI. The advisor is for our registered customers and staff only.' },
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
            : `Dr. Advice: I could not reach the AI service just now, so here is a standard answer. ${demo.text}`,
          actionBtn: demo.actionBtn,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 touch-none select-none"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
      }}
    >
      {/* Floating Trigger Button with Doctor Logo (Draggable anywhere on screen) */}
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`bg-[#064e3b] hover:bg-[#065f46] text-white p-2.5 pr-5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all cursor-grab active:cursor-grabbing border-2 border-[#10b981] group relative ${
            isDragging ? 'scale-105 shadow-emerald-900/50' : 'hover:scale-105'
          }`}
        >
          {/* Drag Handle Indicator */}
          <div className="text-emerald-400/70 group-hover:text-emerald-300 pl-1">
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-emerald-400 p-0.5 shadow-lg shrink-0 flex items-center justify-center animate-bounce-slow">
            <div className="w-full h-full bg-slate-900 rounded-full overflow-hidden flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#065f46" />
                {/* Cow Horns & Ears */}
                <path d="M 22 25 L 12 10 L 32 20 Z" fill="#f59e0b" />
                <path d="M 78 25 L 88 10 L 68 20 Z" fill="#f59e0b" />
                <path d="M 18 35 C 10 30 10 45 22 40 Z" fill="#f43f5e" />
                <path d="M 82 35 C 90 30 90 45 78 40 Z" fill="#f43f5e" />
                {/* Cow Head */}
                <ellipse cx="50" cy="45" rx="28" ry="24" fill="#ffffff" />
                <ellipse cx="50" cy="55" rx="20" ry="14" fill="#fbcfe8" />
                {/* Snout Nostrils */}
                <circle cx="44" cy="55" r="2.5" fill="#be185d" />
                <circle cx="56" cy="55" r="2.5" fill="#be185d" />
                {/* Funky Sunglasses */}
                <path d="M 28 36 L 48 36 L 46 48 L 30 48 Z" fill="#0f172a" />
                <path d="M 52 36 L 72 36 L 70 48 L 54 48 Z" fill="#0f172a" />
                <line x1="48" y1="40" x2="52" y2="40" stroke="#0f172a" strokeWidth="3" />
                {/* Sunglass Lens Reflection */}
                <line x1="32" y1="38" x2="42" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="56" y1="38" x2="66" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                {/* Doctor Stethoscope */}
                <path d="M 32 60 C 32 78 68 78 68 60" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="74" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[11px] font-black p-0.5 rounded-full border border-white shadow-xs">
              😎
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-black text-white flex items-center gap-1">
              <span>Dr. Pashu AI</span>
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </div>
            <div className="text-[10px] text-[#34d399] font-medium">Drag anywhere • Vet Doctor</div>
          </div>
        </div>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 sm:w-96 max-h-[520px] flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Doctor Header (also Draggable) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="bg-[#064e3b] text-white p-3.5 flex items-center justify-between border-b border-[#065f46] cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center gap-2.5">
              <GripVertical className="w-4 h-4 text-emerald-400/80 shrink-0" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-emerald-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-full overflow-hidden flex items-center justify-center relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="48" fill="#065f46" />
                    <path d="M 22 25 L 12 10 L 32 20 Z" fill="#f59e0b" />
                    <path d="M 78 25 L 88 10 L 68 20 Z" fill="#f59e0b" />
                    <path d="M 18 35 C 10 30 10 45 22 40 Z" fill="#f43f5e" />
                    <path d="M 78 35 C 90 30 90 45 78 40 Z" fill="#f43f5e" />
                    <ellipse cx="50" cy="45" rx="28" ry="24" fill="#ffffff" />
                    <ellipse cx="50" cy="55" rx="20" ry="14" fill="#fbcfe8" />
                    <circle cx="44" cy="55" r="2.5" fill="#be185d" />
                    <circle cx="56" cy="55" r="2.5" fill="#be185d" />
                    <path d="M 28 36 L 48 36 L 46 48 L 30 48 Z" fill="#0f172a" />
                    <path d="M 52 36 L 72 36 L 70 48 L 54 48 Z" fill="#0f172a" />
                    <line x1="48" y1="40" x2="52" y2="40" stroke="#0f172a" strokeWidth="3" />
                    <line x1="32" y1="38" x2="42" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="56" y1="38" x2="66" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 32 60 C 32 78 68 78 68 60" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="50" cy="74" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-slate-950 text-[9px] font-bold p-0.2 rounded-full border border-white">
                  😎
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-white">Dr. Pashu AI (DVM)</h3>
                  <span className="bg-emerald-500/30 text-[#a7f3d0] text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-400/40">
                    VET DOCTOR
                  </span>
                </div>
                <span className="text-[10px] text-[#34d399] flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online | Drag header to move
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-300 hover:text-white cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Consultation Banner */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-3.5 py-1.5 flex items-center justify-between text-[10px] text-emerald-900 font-medium select-none">
            <span className="flex items-center gap-1 font-semibold">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-700" />
              Free Tele-Consultation Active
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
              {isDemoMode ? 'Demo Mode' : 'Verified Vet AI'}
            </span>
          </div>

          {isDemoMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-1.5 text-[10px] text-amber-900 leading-relaxed">
              AI service unavailable, so these are canned answers. Add a GEMINI_API_KEY in .env and
              start the API server for live replies.
            </div>
          )}

          {/* Messages Body */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs select-text">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-emerald-400 p-0.5 shrink-0 shadow-xs flex items-center justify-center">
                    <div className="w-full h-full bg-slate-900 rounded-full overflow-hidden flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="48" fill="#065f46" />
                        <path d="M 22 25 L 12 10 L 32 20 Z" fill="#f59e0b" />
                        <path d="M 78 25 L 88 10 L 68 20 Z" fill="#f59e0b" />
                        <path d="M 18 35 C 10 30 10 45 22 40 Z" fill="#f43f5e" />
                        <path d="M 82 35 C 90 30 90 45 78 40 Z" fill="#f43f5e" />
                        <ellipse cx="50" cy="45" rx="28" ry="24" fill="#ffffff" />
                        <ellipse cx="50" cy="55" rx="20" ry="14" fill="#fbcfe8" />
                        <circle cx="44" cy="55" r="2.5" fill="#be185d" />
                        <circle cx="56" cy="55" r="2.5" fill="#be185d" />
                        <path d="M 28 36 L 48 36 L 46 48 L 30 48 Z" fill="#0f172a" />
                        <path d="M 52 36 L 72 36 L 70 48 L 54 48 Z" fill="#0f172a" />
                        <line x1="48" y1="40" x2="52" y2="40" stroke="#0f172a" strokeWidth="3" />
                        <line x1="32" y1="38" x2="42" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="56" y1="38" x2="66" y2="46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 32 60 C 32 78 68 78 68 60" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="50" cy="74" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#064e3b] text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-xs'
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
                      className="mt-2.5 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg w-full text-center transition-colors cursor-pointer"
                    >
                      {m.actionBtn.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-emerald-400 p-0.5 shrink-0">
                  <div className="w-full h-full bg-slate-900 rounded-full" />
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-xs px-3 py-2.5 text-slate-500">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-2 bg-slate-50 border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={isThinking}
                className="whitespace-nowrap bg-white border border-slate-200 hover:border-emerald-600 disabled:opacity-50 text-slate-700 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Row */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Dr. Pashu about cow feed, fat %, or Khata..."
              value={inputText}
              disabled={isThinking}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-100 text-xs text-slate-900 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#10b981] disabled:opacity-60"
            />
            <button
              onClick={() => handleSend()}
              disabled={isThinking}
              className="bg-[#064e3b] hover:bg-[#065f46] disabled:opacity-50 text-white p-2 rounded-xl cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

