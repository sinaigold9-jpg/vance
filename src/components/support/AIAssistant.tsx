import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Plus, History, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updatedAt: number; messages: Msg[] };

const STORAGE_KEY = "advance_ai_conversations";
const GREETING: Msg = {
  role: "assistant",
  content: "أهلاً بك 👋 أنا مساعد Advance. اسألني عن أي شيء داخل التطبيق: الباقات، الكاش باك، المهام، السحب، الألعاب، العروض...",
};

const loadConversations = (): Conversation[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const newConversation = (): Conversation => ({
  id: `c_${Date.now()}`,
  title: "محادثة جديدة",
  updatedAt: Date.now(),
  messages: [GREETING],
});

interface Props { open: boolean; onClose: () => void; onOpenTicket: () => void }

export const AIAssistant = ({ open, onClose, onOpenTicket }: Props) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadConversations();
    return stored.length ? stored : [newConversation()];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = loadConversations();
    return (stored.length ? stored[0].id : "");
  });
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; action: string }>>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];

  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 30))); } catch { /* ignore */ }
  }, [conversations]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open, activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, loading]);

  const initialSuggestions = [
    { label: "الكاش باك", action: "ask:كيف يعمل نظام الكاش باك؟" },
    { label: "الباقات", action: "ask:ما الفرق بين الباقات؟" },
    { label: "المهام اليومية", action: "ask:متى تتجدد المهام اليومية؟" },
    { label: "السحب", action: "ask:كيف أسحب أرباحي؟" },
  ];

  const updateActive = (updater: (c: Conversation) => Conversation) =>
    setConversations((prev) => prev.map((c) => (c.id === active?.id ? updater(c) : c)));

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading || !active) return;
    const nextMsgs: Msg[] = [...active.messages, { role: "user", content: text }];
    updateActive((c) => ({
      ...c,
      title: c.messages.length <= 1 ? text.slice(0, 40) : c.title,
      messages: nextMsgs,
      updatedAt: Date.now(),
    }));
    setInput("");
    setSuggestions([]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-ai-chat", {
        body: { messages: nextMsgs.slice(-14).map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      const payload = data as { reply?: string; error?: string; suggestions?: Array<{ label: string; action: string }> };
      const reply = payload?.reply || payload?.error || "حدث خطأ.";
      updateActive((c) => ({ ...c, messages: [...nextMsgs, { role: "assistant", content: reply }], updatedAt: Date.now() }));
      setSuggestions(payload?.suggestions || []);
    } catch {
      updateActive((c) => ({
        ...c,
        messages: [...nextMsgs, { role: "assistant", content: "تعذر الاتصال بالخدمة. حاول لاحقاً أو اترك رسالة للدعم." }],
        updatedAt: Date.now(),
      }));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleAction = (action: string) => {
    if (action.startsWith("navigate:")) { onClose(); navigate(action.slice(9)); return; }
    if (action.startsWith("ask:")) { send(action.slice(4)); return; }
    if (action === "ticket") { onClose(); onOpenTicket(); }
  };

  const startNew = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setSuggestions([]);
    setShowHistory(false);
  };

  const removeConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      const list = next.length ? next : [newConversation()];
      if (id === activeId) setActiveId(list[0].id);
      return list;
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && active && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col"
          dir="rtl"
        >
          {/* Header */}
          <header className="shrink-0 border-b border-border/60 bg-black/60 backdrop-blur-lg">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-foreground leading-tight">مساعد Advance</h2>
                <p className="text-[11px] text-muted-foreground truncate">متصل بأحدث بيانات التطبيق</p>
              </div>
              <Button variant="ghost" size="icon" onClick={startNew} title="محادثة جديدة"><Plus className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory((v) => !v)} title="السجل"><History className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
            </div>
            {showHistory && (
              <div className="max-w-3xl mx-auto px-4 pb-3 space-y-1.5 max-h-52 overflow-y-auto">
                {conversations.map((c) => (
                  <div key={c.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${c.id === active.id ? "border-primary/50 bg-primary/10" : "border-border/50 bg-muted/20"}`}>
                    <button className="flex-1 text-right min-w-0" onClick={() => { setActiveId(c.id); setShowHistory(false); setSuggestions([]); }}>
                      <p className="text-sm truncate">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(c.updatedAt).toLocaleString("ar-EG", { hour12: true })}</p>
                    </button>
                    <button onClick={() => removeConversation(c.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
              {active.messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary/20 text-primary" : "bg-gradient-gold text-primary-foreground"}`}>
                    {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed whitespace-pre-line ${m.role === "user" ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
                  <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري التفكير...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border/60 bg-black/60 backdrop-blur-lg">
            <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {(suggestions.length ? suggestions : active.messages.length <= 1 ? initialSuggestions : []).map((s, i) => (
                  <button
                    key={`${s.action}-${i}`}
                    onClick={() => handleAction(s.action)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="اكتب سؤالك هنا..."
                  disabled={loading}
                  className="flex-1 h-12 rounded-xl"
                />
                <Button onClick={() => send()} disabled={loading || !input.trim()} className="h-12 w-12 bg-gradient-gold text-primary-foreground rounded-xl">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <button onClick={() => { onClose(); onOpenTicket(); }} className="w-full text-[11px] text-muted-foreground hover:text-primary">
                لم تجد ما تبحث عنه؟ اترك رسالة للإدارة →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
