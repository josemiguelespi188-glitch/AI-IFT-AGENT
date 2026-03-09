"use client";
import { useEffect, useRef, useState } from "react";
import { supabase, type Document } from "@/lib/supabase";
import { FileText, Upload, Trash2, RefreshCw, MessageSquare, Send, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const [docs, setDocs]         = useState<Document[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [askOpen, setAskOpen]   = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer]     = useState("");
  const [asking, setAsking]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", description: "", client_name: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !form.name.trim()) return;

    setUploading(true);
    try {
      // 1. Insert record in Supabase (status: processing)
      const { data: doc } = await supabase.from("documents").insert({
        name: form.name,
        description: form.description || null,
        client_name: form.client_name || null,
        status: "processing",
      }).select().single();

      if (!doc) throw new Error("Failed to create document record");

      // 2. Upload to Pinecone via API route
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docId", doc.id);
      formData.append("name", form.name);

      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error ?? "Upload failed");

      // 3. Update status to ready
      await supabase.from("documents").update({
        status: "ready",
        pinecone_file_id: result.pineconeFileId,
      }).eq("id", doc.id);

      setForm({ name: "", description: "", client_name: "" });
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    if (doc.pinecone_file_id) {
      await fetch(`/api/documents/${doc.pinecone_file_id}`, { method: "DELETE" });
    }
    await supabase.from("documents").delete().eq("id", doc.id);
    load();
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("");
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.answer ?? "No response.");
    setAsking(false);
  };

  const statusIcon = (s: string) => ({
    ready:      <CheckCircle size={14} className="text-green-400" />,
    processing: <Loader2 size={14} className="text-yellow-400 animate-spin" />,
    error:      <AlertCircle size={14} className="text-red-400" />,
  }[s] ?? null);

  const statusText = (s: string) => ({
    ready:      "text-green-400",
    processing: "text-yellow-400",
    error:      "text-red-400",
  }[s] ?? "text-brand-muted");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-brand-muted text-sm mt-1">Upload docs to Pinecone — the AI agent searches them automatically</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setAskOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <MessageSquare size={15} /> Ask Assistant
          </button>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-card border border-brand-border text-sm text-brand-muted hover:text-white transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upload form */}
        <div className="xl:col-span-1">
          <div className="bg-brand-card rounded-xl border border-brand-border p-5">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Upload size={16} /> Upload Document
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Document Name *</label>
                <input
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. PAH Fund PPM 2024"
                  className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Description</label>
                <input
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description…"
                  className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">Client (optional)</label>
                <input
                  value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="e.g. Rastegar"
                  className="w-full px-3 py-2 bg-brand-dark border border-brand-border rounded-lg text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="text-xs text-brand-muted font-semibold uppercase tracking-wide block mb-1">File *</label>
                <input
                  ref={fileRef} type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.csv"
                  className="w-full text-sm text-brand-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-accent file:text-white file:text-xs file:font-medium file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-brand-muted mt-1">PDF, DOCX, TXT, CSV supported</p>
              </div>
              <button
                onClick={upload}
                disabled={uploading || !form.name.trim()}
                className="w-full py-2.5 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload to Pinecone</>}
              </button>
            </div>
          </div>

          {/* Pinecone info */}
          <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wide mb-1">Pinecone Assistant</p>
            <p className="text-xs text-purple-200 leading-relaxed">
              Documents uploaded here are indexed in Pinecone. The AI agent automatically searches them when answering investor questions.
            </p>
          </div>
        </div>

        {/* Document list */}
        <div className="xl:col-span-2">
          <div className="bg-brand-card rounded-xl border border-brand-border overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-border">
              <h2 className="font-semibold text-white">{docs.length} Documents in Pinecone</h2>
            </div>
            {loading ? (
              <div className="p-12 text-center text-brand-muted">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="p-12 text-center text-brand-muted">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p>No documents yet. Upload your first document.</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-brand-dark transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        {doc.client_name && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 shrink-0">
                            {doc.client_name}
                          </span>
                        )}
                      </div>
                      {doc.description && <p className="text-xs text-brand-muted mt-0.5 truncate">{doc.description}</p>}
                      <div className={`flex items-center gap-1.5 mt-1 text-xs ${statusText(doc.status)}`}>
                        {statusIcon(doc.status)} {doc.status}
                        <span className="text-brand-muted">· {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteDoc(doc)} className="text-brand-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask Assistant modal */}
      {askOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-dark rounded-2xl border border-brand-border w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-brand-accent" /> Ask Pinecone Assistant
              </h2>
              <button onClick={() => { setAskOpen(false); setAnswer(""); setQuestion(""); }} className="text-brand-muted hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about your uploaded documents…"
                rows={3}
                className="w-full bg-brand-card border border-brand-border rounded-lg p-3 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-accent resize-none"
              />
              {answer && (
                <div className="bg-brand-card border border-brand-border rounded-lg p-4">
                  <p className="text-xs text-brand-muted font-semibold uppercase tracking-wide mb-2">Answer</p>
                  <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{answer}</p>
                </div>
              )}
              <button
                onClick={ask} disabled={asking || !question.trim()}
                className="w-full py-2.5 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {asking ? <><Loader2 size={14} className="animate-spin" /> Thinking…</> : <><Send size={14} /> Ask</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
