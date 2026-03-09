import { supabase } from "@/lib/supabase";
import { Inbox, CheckCircle, AlertTriangle, Clock, TrendingUp, Mail, Globe, Ticket } from "lucide-react";
import { categoryLabel, formatDate } from "@/lib/utils";

async function getMetrics() {
  const [pending, responded, escalated, total] = await Promise.all([
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "responded"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "escalated"),
    supabase.from("inquiries").select("id", { count: "exact", head: true }),
  ]);
  return {
    pending: pending.count ?? 0,
    responded: responded.count ?? 0,
    escalated: escalated.count ?? 0,
    total: total.count ?? 0,
  };
}

async function getRecentInquiries() {
  const { data } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getPendingEscalations() {
  const { data } = await supabase
    .from("escalations")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

const channelIcon: Record<string, React.ReactNode> = {
  email:   <Mail size={14} />,
  portal:  <Globe size={14} />,
  zendesk: <Ticket size={14} />,
};

export default async function Dashboard() {
  const [metrics, recent, escalations] = await Promise.all([
    getMetrics(), getRecentInquiries(), getPendingEscalations(),
  ]);

  const autoRate = metrics.total > 0
    ? Math.round((metrics.responded / metrics.total) * 100)
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-brand-muted text-sm mt-1">Axiskey Investor Relations — Industry FinTech</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={<Inbox size={20} />}       label="Pending"        value={metrics.pending}   color="yellow" />
        <MetricCard icon={<CheckCircle size={20} />} label="Responded"      value={metrics.responded} color="green"  />
        <MetricCard icon={<AlertTriangle size={20} />} label="Escalations"  value={metrics.escalated} color="red"    />
        <MetricCard icon={<TrendingUp size={20} />}  label="Auto-response %" value={`${autoRate}%`}   color="blue"   />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent inquiries */}
        <div className="xl:col-span-2 bg-brand-card rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Inquiries</h2>
            <a href="/inquiries" className="text-xs text-brand-accent hover:underline">View all</a>
          </div>
          <div className="space-y-2">
            {recent.length === 0 && (
              <p className="text-brand-muted text-sm py-6 text-center">No inquiries yet.</p>
            )}
            {recent.map((inq) => (
              <div key={inq.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-brand-dark transition-colors">
                <div className="mt-0.5 text-brand-muted">{channelIcon[inq.channel] ?? <Mail size={14} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {inq.sender_name ?? inq.sender_email ?? "Unknown"}
                    </p>
                    <StatusBadge status={inq.status} />
                  </div>
                  <p className="text-xs text-brand-muted truncate mt-0.5">
                    {inq.subject ?? inq.body.slice(0, 80)}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {categoryLabel(inq.category)} · {formatDate(inq.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending escalations */}
        <div className="bg-brand-card rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Pending Escalations</h2>
            <a href="/escalations" className="text-xs text-brand-accent hover:underline">View all</a>
          </div>
          <div className="space-y-3">
            {escalations.length === 0 && (
              <p className="text-brand-muted text-sm py-6 text-center">No pending escalations.</p>
            )}
            {escalations.map((esc) => (
              <a key={esc.id} href="/escalations"
                className="block p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
                <p className="text-sm font-medium text-white">
                  {esc.investor_name ?? esc.investor_email ?? "Unknown Investor"}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {esc.client_name ?? "—"} · {categoryLabel(esc.category)}
                </p>
                <p className="text-xs text-red-300 mt-1 truncate">{esc.info_gaps ?? "Needs review"}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    green:  "bg-green-500/10  border-green-500/20  text-green-400",
    red:    "bg-red-500/10    border-red-500/20    text-red-400",
    blue:   "bg-blue-500/10   border-blue-500/20   text-blue-400",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    pending:   "bg-yellow-500/20 text-yellow-300",
    responded: "bg-green-500/20  text-green-300",
    escalated: "bg-red-500/20    text-red-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s[status] ?? "bg-gray-500/20 text-gray-300"}`}>
      {status}
    </span>
  );
}
