"use client";
import { useEffect, useState } from "react";
import { supabase, type KnowledgeEntry } from "@/lib/supabase";
import { BookOpen, Plus, Trash2, RefreshCw, Search, X, Save } from "lucide-react";
import { categoryLabel, formatDate } from "@/lib/utils";

const CATEGORIES = ["distributions","tax_documents","account_activation","banking_changes","accreditation","investment_status","redemption_request","technical_portal_help","other"];

export default function KnowledgePage() {
  const [entries, setEntries]   = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ topic: "", question: "", answer: "", client_name: "", category: "other" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("knowledge_base").select("*").order("created_at", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.topic.trim() || !form.answer.trim()) return;
    setSaving(true);
    await supabase.from("knowledge_base").insert({ ...form, source: "manual" });
    setForm({ topic: "", question: "", answer: "", client_name: "", category: "other" });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("knowledge_base").delete().eq("id", id);
    load();
  };

  const filtered = entries.filter((e) =>
    !search ||
    e.topic.toLowerCase().includes(search.toLowerCase()) ||
    e.answer.toLowerCase().includes(search.toLowerCase()) ||
    (e.question ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-brand-muted text-sm mt-1">Q&A pairs used by the AI agent to answer investors</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            <Plus size={15} /> Add Entry
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-brand-card rounded-xl border border-brand-accent/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">New Knowledge Entry</h2>
            <button onClick={() => setShowForm(false)} className="text-brand-muted hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Topic *</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Distribution Schedule" className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent" />
            </div>
            <div>
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-accent">
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Client (leave blank = general)</label>
              <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                placeholder="e.g. Rastegar" className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent" />
            </div>
            <div>
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Question (optional)</label>
              <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. When are distributions paid?" className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Answer *</label>
              <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={4} placeholder="Full answer the AI should give to investors…"
                className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent resize-none" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={save} disabled={saving || !form.topic.trim() || !form.answer.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
              <Save size={14} /> {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-5 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search knowledge base…"
          className="w-full pl-9 pr-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-brand-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-muted">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No knowledge entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="bg-brand-card rounded-xl border border-brand-border p-5 hover:border-brand-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-white text-sm">{e.topic}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                      {categoryLabel(e.category)}
                    </span>
                    {e.client_name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        {e.client_name}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.source === "learned" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"}`}>
                      {e.source}
                    </span>
                  </div>
                  {e.question && <p className="text-xs text-brand-muted mb-2 italic">"{e.question}"</p>}
                  <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{e.answer}</p>
                  <p className="text-xs text-brand-muted mt-2">{formatDate(e.created_at)}</p>
                </div>
                <button onClick={() => remove(e.id)} className="text-brand-muted hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
