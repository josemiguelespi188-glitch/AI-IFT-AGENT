"use client";
import { useEffect, useState } from "react";
import { supabase, type Client } from "@/lib/supabase";
import { Users, Plus, X, Save, RefreshCw, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

const EMPTY: Omit<Client, "id" | "created_at"> = {
  client_name: "", portal_url: "", sponsor_contact_name: "",
  sponsor_contact_email: "", notes: "",
};

export default function ClientsPage() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("client_name");
    setClients(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    await supabase.from("clients").insert(form);
    setForm({ ...EMPTY });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    await supabase.from("clients").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-brand-muted text-sm mt-1">Sponsor & fund configurations</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            <Plus size={15} /> Add Client
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-brand-card rounded-xl border border-brand-accent/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">New Client</h2>
            <button onClick={() => setShowForm(false)} className="text-brand-muted hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "client_name",           label: "Client Name *",     placeholder: "e.g. Phoenix American Hospitality" },
              { key: "portal_url",            label: "Portal URL",        placeholder: "https://portal.tribexa.com/..." },
              { key: "sponsor_contact_name",  label: "Contact Name",      placeholder: "e.g. Katie Ginther" },
              { key: "sponsor_contact_email", label: "Contact Email",     placeholder: "katie@..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">{label}</label>
                <input
                  value={(form as Record<string, string>)[key]} placeholder={placeholder}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Notes</label>
              <textarea
                value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="Distribution schedule, tax docs, reinvestment policy…"
                className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={save} disabled={saving || !form.client_name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
              <Save size={14} /> {saving ? "Saving…" : "Save Client"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-brand-muted">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-brand-muted">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>No clients yet. Add your first client.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="bg-brand-card rounded-xl border border-brand-border p-5 hover:border-brand-accent/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-accent/20 flex items-center justify-center">
                    <Building2 size={18} className="text-brand-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{c.client_name}</p>
                    <p className="text-xs text-brand-muted">{formatDate(c.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => remove(c.id)} className="text-brand-muted hover:text-red-400 transition-colors p-1">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2 mt-4">
                {c.sponsor_contact_name && (
                  <Row label="Contact" value={c.sponsor_contact_name} />
                )}
                {c.sponsor_contact_email && (
                  <Row label="Email" value={c.sponsor_contact_email} />
                )}
                {c.portal_url && (
                  <Row label="Portal" value={c.portal_url} link />
                )}
                {c.notes && (
                  <div className="pt-2 border-t border-brand-border mt-3">
                    <p className="text-xs text-brand-muted leading-relaxed">{c.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-brand-muted w-14 shrink-0">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline truncate">{value}</a>
      ) : (
        <span className="text-xs text-white truncate">{value}</span>
      )}
    </div>
  );
}
