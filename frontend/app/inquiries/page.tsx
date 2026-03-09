"use client";
import { useEffect, useState } from "react";
import { supabase, type Inquiry } from "@/lib/supabase";
import { categoryLabel, channelColor, statusColor, formatDate } from "@/lib/utils";
import { Search, Filter, RefreshCw, Mail, Globe, Ticket, ChevronDown, X } from "lucide-react";

const CHANNELS = ["all", "email", "zendesk", "portal"];
const STATUSES = ["all", "pending", "responded", "escalated"];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [channel, setChannel]     = useState("all");
  const [status, setStatus]       = useState("all");
  const [selected, setSelected]   = useState<Inquiry | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
    if (channel !== "all") q = q.eq("channel", channel);
    if (status  !== "all") q = q.eq("status",  status);
    const { data } = await q;
    setInquiries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [channel, status]);

  const filtered = inquiries.filter((i) =>
    !search ||
    i.body.toLowerCase().includes(search.toLowerCase()) ||
    (i.sender_name  ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (i.sender_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (i.subject      ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const channelIcon: Record<string, React.ReactNode> = {
    email:   <Mail size={13} />,
    portal:  <Globe size={13} />,
    zendesk: <Ticket size={13} />,
  };

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex-1 p-8 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Inquiries</h1>
            <p className="text-brand-muted text-sm mt-1">{filtered.length} results</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inquiries..."
              className="w-full pl-9 pr-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
            />
          </div>
          <FilterSelect value={channel} onChange={setChannel} options={CHANNELS} />
          <FilterSelect value={status}  onChange={setStatus}  options={STATUSES} />
        </div>

        {/* Table */}
        <div className="bg-brand-card rounded-xl border border-brand-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-brand-muted">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-brand-muted">No inquiries found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  {["Investor", "Subject", "Channel", "Category", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-brand-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inq) => (
                  <tr
                    key={inq.id}
                    onClick={() => setSelected(inq)}
                    className={`border-b border-brand-border/50 cursor-pointer transition-colors hover:bg-brand-dark ${selected?.id === inq.id ? "bg-brand-dark" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{inq.sender_name ?? "—"}</p>
                      <p className="text-xs text-brand-muted">{inq.sender_email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-white truncate">{inq.subject ?? inq.body.slice(0, 50)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${channelColor(inq.channel)}`}>
                        {channelIcon[inq.channel]} {inq.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-brand-muted">{categoryLabel(inq.category)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(inq.status)}`}>
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted whitespace-nowrap">
                      {formatDate(inq.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 border-l border-brand-border bg-brand-dark p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white">Inquiry Detail</h2>
            <button onClick={() => setSelected(null)} className="text-brand-muted hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <Field label="From"    value={`${selected.sender_name ?? ""} <${selected.sender_email ?? ""}>`} />
            <Field label="Channel" value={selected.channel} />
            <Field label="Client"  value={selected.client_name ?? "—"} />
            <Field label="Deal"    value={selected.deal_name ?? "—"} />
            <Field label="Category" value={categoryLabel(selected.category)} />
            <Field label="Status"  value={selected.status} />
            <Field label="Date"    value={formatDate(selected.created_at)} />
            <div>
              <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-1">Subject</p>
              <p className="text-sm text-white">{selected.subject ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-1">Message</p>
              <p className="text-sm text-white whitespace-pre-wrap bg-brand-card rounded-lg p-3 border border-brand-border">
                {selected.body}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-white focus:outline-none focus:border-brand-accent cursor-pointer"
      >
        {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
    </div>
  );
}
