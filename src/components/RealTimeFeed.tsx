import { IEEECisTransaction } from "../types";
import { CreditCard, Globe, Zap, AlertTriangle, HardDrive } from "lucide-react";

interface RealTimeFeedProps {
  transactions: IEEECisTransaction[];
}

export default function RealTimeFeed({ transactions }: RealTimeFeedProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-800 font-mono tracking-tight">TOPIC: financial-transactions</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-xs">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{transactions.length} events in ring-buffer</span>
        </div>
      </div>

      {/* Grid Headers */}
      <div className="grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-slate-150 bg-slate-50 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
        <div className="col-span-2">TxID</div>
        <div className="col-span-2">Amount (USD)</div>
        <div className="col-span-3">Card & Product</div>
        <div className="col-span-2 text-center">Addr 1/2</div>
        <div className="col-span-3 text-right">Ground Truth</div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <CreditCard className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2 animate-bounce" />
            <p className="text-xs font-medium text-slate-500">Awaiting stream ingestion events...</p>
            <p className="text-[10px] text-slate-400 mt-1">Activate the pipeline flow to stream financial transactions.</p>
          </div>
        ) : (
          transactions.map((t) => {
            const isDebit = t.card6 === "debit";
            const isFraud = t.isFraud === 1;

            return (
              <div 
                key={t.TransactionID}
                className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors hover:bg-slate-50/50 ${
                  isFraud ? "bg-red-50/20" : ""
                }`}
              >
                {/* TxID & small indicator */}
                <div className="col-span-2 font-mono font-semibold text-xs text-slate-600 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFraud ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}></span>
                  <span>{t.TransactionID}</span>
                </div>

                {/* Amount */}
                <div className="col-span-2 font-mono font-bold text-slate-800 text-xs">
                  ${t.TransactionAmt.toFixed(2)}
                </div>

                {/* Card Details */}
                <div className="col-span-3 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="capitalize font-semibold text-slate-700 text-xs truncate">
                      {t.card4}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({t.card1})</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-medium uppercase border ${
                      isDebit ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100"
                    }`}>
                      {t.card6}
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md font-mono">
                      Prod:{t.ProductCD}
                    </span>
                  </div>
                </div>

                {/* Location / Addr */}
                <div className="col-span-2 text-center min-w-0">
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 whitespace-nowrap">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{t.addr1 || "—"} / {t.addr2 || "—"}</span>
                  </div>
                  <div className="text-[8px] font-mono text-slate-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    C13:{t.C13} · D3:{t.D3}d
                  </div>
                </div>

                {/* Ground Truth Status */}
                <div className="col-span-3 text-right">
                  {isFraud ? (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-bold text-[9px] px-2.5 py-1 rounded-full border border-red-200 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 animate-bounce" />
                        FRAUD ATTACK
                      </span>
                      {t.fraudScenario && (
                        <span className="text-[8px] text-red-500/80 font-mono mt-1 font-semibold max-w-[130px] truncate" title={t.fraudScenario}>
                          {t.fraudScenario}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[9px] px-2.5 py-1 rounded-full font-bold border border-emerald-200 uppercase tracking-wider">
                      LEGITIMATE
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
