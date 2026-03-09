import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function categoryLabel(cat: string | null) {
  const map: Record<string, string> = {
    distributions: "Distributions",
    tax_documents: "Tax Documents",
    account_activation: "Account Activation",
    banking_changes: "Banking Changes",
    accreditation: "Accreditation",
    investment_status: "Investment Status",
    redemption_request: "Redemption",
    technical_portal_help: "Technical Help",
    other: "Other",
  };
  return map[cat ?? "other"] ?? cat ?? "—";
}

export function channelColor(channel: string) {
  return {
    email: "bg-blue-500/20 text-blue-300",
    zendesk: "bg-orange-500/20 text-orange-300",
    portal: "bg-purple-500/20 text-purple-300",
  }[channel] ?? "bg-gray-500/20 text-gray-300";
}

export function statusColor(status: string) {
  return {
    pending: "bg-yellow-500/20 text-yellow-300",
    responded: "bg-green-500/20 text-green-300",
    escalated: "bg-red-500/20 text-red-300",
    approved: "bg-green-500/20 text-green-300",
    rejected: "bg-red-500/20 text-red-300",
  }[status] ?? "bg-gray-500/20 text-gray-300";
}
