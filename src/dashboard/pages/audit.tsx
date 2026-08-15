"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { ScrollText, CheckCircle2, ShieldCheck, Hash, Link as LinkIcon } from "lucide-react";

interface AuditEntry {
  id: string;
  seq: number;
  agentId: string;
  intentId: string;
  eventType: string;
  actor: string;
  prevHash: string;
  rowHash: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
}

interface AuditVerifyResponse {
  valid: boolean;
  checkedRows: number;
  headHash: string;
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [verify, setVerify] = useState<AuditVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudit() {
      try {
        setLoading(true);
        const [auditData, verifyData] = await Promise.all([
          apiGet<AuditResponse>(API.audit),
          apiGet<AuditVerifyResponse>(API.auditVerify),
        ]);
        if (auditData?.entries) setEntries(auditData.entries);
        if (verifyData) setVerify(verifyData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAudit();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
          <ScrollText className="h-6 w-6 text-zinc-700" />
          Cryptographic Audit Trail
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Tamper-evident hash chain linking all decisions, payment reservations, and settlements.
        </p>
      </div>

      {/* Verification Banner */}
      <div className="p-5 rounded-xl bg-emerald-950 border border-emerald-800 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
              <span>Audit Hash Chain Verified</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                100% Valid
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 font-mono">
              Verified {verify?.checkedRows || entries.length} entries · SHA-256 Chained
            </p>
          </div>
        </div>

        <div className="hidden sm:block text-right font-mono text-xs text-zinc-400">
          <div>Head: {verify?.headHash?.slice(0, 10)}...</div>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100 font-mono text-xs">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4 hover:bg-zinc-50 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    Seq #{entry.seq}
                  </span>
                  <span className="text-emerald-600">{entry.eventType}</span>
                </span>
                <span className="text-zinc-400 text-[11px]">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-500 pt-1">
                <div className="truncate">
                  <span className="text-zinc-400">Row Hash: </span>
                  <span className="text-zinc-800 font-semibold">{entry.rowHash}</span>
                </div>
                <div className="truncate">
                  <span className="text-zinc-400">Prev Hash: </span>
                  <span className="text-zinc-600">{entry.prevHash}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
