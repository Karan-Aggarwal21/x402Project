"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { Store, ShieldCheck, ShieldBan, ExternalLink, Globe } from "lucide-react";

interface MerchantItem {
  domain: string;
  name: string;
  status: string;
  pinnedRecipient: string;
  trustLevel: string;
  txCount24h: number;
  volumeUsd24h: string;
}

interface MerchantsResponse {
  merchants: MerchantItem[];
  total: number;
}

export function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMerchants() {
      try {
        setLoading(true);
        const data = await apiGet<MerchantsResponse>(API.merchants);
        if (data?.merchants) {
          setMerchants(data.merchants);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load merchants");
      } finally {
        setLoading(false);
      }
    }

    loadMerchants();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
          <Store className="h-6 w-6 text-zinc-700" />
          Merchant Controls & Recipient Pinning
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Allowlisted service providers, pinned settlement recipients, and domain-level blocklists.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-zinc-100 rounded-xl animate-pulse" />
          ))
        ) : (
          merchants.map((m) => {
            const isAllowed = m.status === "ALLOWED";
            return (
              <div
                key={m.domain}
                className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                        isAllowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isAllowed ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
                      {m.status}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      24h Vol: ${m.volumeUsd24h}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-zinc-900">{m.name}</h3>
                    <p className="text-xs font-mono text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Globe className="h-3 w-3 text-zinc-400" />
                      {m.domain}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 text-xs space-y-1 font-mono">
                  <span className="text-zinc-400">Pinned PayTo Recipient:</span>
                  <div className="text-[11px] text-zinc-700 truncate bg-zinc-50 p-1.5 rounded border border-zinc-200" title={m.pinnedRecipient}>
                    {m.pinnedRecipient}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
