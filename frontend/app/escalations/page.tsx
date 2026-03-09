"use client";
import { useEffect, useState } from "react";
import { supabase, type Escalation } from "@/lib/supabase";
import { categoryLabel, formatDate } from "@/lib/utils";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, ChevronDown } from "lucide-react";

export default function EscalationsPage() {
  const [items, setItems]       = useState<Escalation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [draft, setDraft]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("escalations").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const openEscalation = (e: Escalation) => {
    setSelected(e);
    setDraft(e.draft_response ?? e.final_response ?? "");
  };

  const approve = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from("escalations").update({
      status: "approved",
      final_response: draft,
      approved_by: "ir-team",
      approved_at: new Date().toISOString(),
    }).eq("id", selected.id);
    await supabase.from("inquiries").update({ status: "responded" }).eq("id", selected.inquiry_id);
    setSaving(false);
    setSelected(null);
    load();
  };

  const reject = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from("escalations").update({ status: "rejected" }).eq("id", selected.id);
    setSaving(false);
    setSelected(null);
    load();
  };

  const statusColor: Record<string, string> = {
    pending:  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    approved: "bg-green-500/20  text-green-300  border-green-500/30",
    rejected: "bg-red-500/20    text-red-300    border-red-500/30",
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Escalations</h1>
            <p className="text-brand-muted text-sm mt-1">{items.length} items · requires human review</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white focus:outline-none cursor-pointer">
                {["all","pending","approved","rejected"].map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
            </div>
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white transition-colors">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-center py-12 text-brand-muted">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="text-center py-12 text-brand-muted">No escalations found.</div>
          )}
          {items.map((esc) => (
            <div
              key={esc.id}
              onClick={() => openEscalation(esc)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors hover:bg-brand-dark ${selected?.id === esc.id ? "bg-brand-dark border-brand-accent" : "bg-brand-card border-brand-border"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {esc.investor_name ?? esc.investor_email ?? "Unknown Investor"}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[esc.status]}`}>
                        {esc.status}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {esc.client_name ?? "—"} · {categoryLabel(esc.category)} · {esc.channel}
                    </p>
                    <p className="text-xs text-brand-muted mt-1 line-clamp-2">{esc.original_text}</p>
                  </div>
                </div>
                <p className="text-xs text-brand-muted whitespace-nowrap shrink-0">{formatDate(esc.created_at)}</p>
              </div>
              {esc.info_gaps && (
                <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-300"><span className="font-semibold">Gap: </span>{esc.info_gaps}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Review panel */}
      {selected && (
        <div className="w-[480px] border-l border-brand-border bg-brand-dark flex flex-col">
          <div className="p-6 border-b border-brand-border">
            <h2 className="font-semibold text-white">Review Escalation</h2>
            <p className="text-xs text-brand-muted mt-0.5">{selected.id}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Investor" value={selected.investor_name ?? "—"} />
              <Info label="Email"    value={selected.investor_email ?? "—"} />
              <Info label="Client"   value={selected.client_name ?? "—"} />
              <Info label="Deal"     value={selected.deal_name ?? "—"} />
              <Info label="Category" value={categoryLabel(selected.category)} />
              <Info label="Channel"  value={selected.channel} />
            </div>

            <Section title="Original Message">
              <p className="text-sm text-white whitespace-pre-wrap bg-brand-card rounded-lg p-3 border border-brand-border">
                {selected.original_text}
              </p>
            </Section>

            {selected.info_found && (
              <Section title="Information Found">
                <p className="text-sm text-green-300 bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  {selected.info_found}
                </p>
              </Section>
            )}

            {selected.info_gaps && (
              <Section title="Information Gaps">
                <p className="text-sm text-red-300 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  {selected.info_gaps}
                </p>
              </Section>
            )}

            <Section title="Response (edit before approving)">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="w-full bg-brand-card border border-brand-border rounded-lg p-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent resize-none"
                placeholder="Write or edit the response here…"
              />
            </Section>
          </div>

          <div className="p-5 border-t border-brand-border flex gap-3">
            <button
              onClick={approve} disabled={saving || !draft.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-green text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <CheckCircle size={15} /> {saving ? "Saving…" : "Approve & Send"}
            </button>
            <button
              onClick={reject} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-white truncate">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}
