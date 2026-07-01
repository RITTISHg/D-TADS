import { IEEECisTransaction } from "../types";
import { CreditCard, Globe, Zap, AlertTriangle } from "lucide-react";

interface RealTimeFeedProps {
  transactions: IEEECisTransaction[];
}

export default function RealTimeFeed({ transactions }: RealTimeFeedProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[520px]">
      <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600 animate-pulse" />
          <h2 className="text-sm font-semibold text-gray-800">Kafka Topic: financial-transactions</h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
          <span>{transactions.length} items buffered</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <CreditCard className="w-8 h-8 text-gray-300 stroke-[1.5] mb-2 animate-bounce" />
            <p className="text-xs text-gray-400">Awaiting stream ingestion events...</p>
            <p className="text-[10px] text-gray-300 mt-1">Play the simulator above to push transactions.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/20 text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">TxID</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Card / Type</th>
                <th className="py-2.5 px-3">Addr 1/2</th>
                <th className="py-2.5 px-3">C-Counts</th>
                <th className="py-2.5 px-3">D-Deltas</th>
                <th className="py-2.5 px-3 text-right pr-4">Ground Truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {transactions.map((t) => {
                const isDebit = t.card6 === "debit";
                const isFraud = t.isFraud === 1;

                return (
                  <tr 
                    key={t.TransactionID}
                    className={`hover:bg-gray-50/50 transition-colors ${isFraud ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-gray-600">
                      {t.TransactionID}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-gray-800">
                      ${t.TransactionAmt.toFixed(2)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="capitalize text-gray-700 font-medium">
                          {t.card4} <span className="text-[10px] text-gray-400 font-mono">({t.card1})</span>
                        </span>
                        <div className="flex gap-1 mt-0.5">
                          <span className={`text-[9px] font-mono px-1 rounded-full ${
                            isDebit ? 'bg-indigo-50 text-indigo-600' : 'bg-fuchsia-50 text-fuchsia-600'
                          }`}>
                            {t.card6}
                          </span>
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded-full font-mono">
                            Prod:{t.ProductCD}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-gray-500">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-gray-300" />
                        <span>R:{t.addr1} / C:{t.addr2}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[10px] text-gray-500">
                      C1:{t.C1} · C13:{t.C13}
                    </td>

                    <td className="py-3 px-3 font-mono text-[10px] text-gray-500">
                      D1:{t.D1}d · D3:{t.D3}d
                    </td>

                    <td className="py-3 px-3 text-right pr-4">
                      {isFraud ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-medium text-[10px] px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            FRAUD
                          </span>
                          {t.fraudScenario && (
                            <span className="text-[8px] text-red-500/80 font-mono mt-0.5 max-w-[120px] truncate" title={t.fraudScenario}>
                              {t.fraudScenario}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          LEGITIMATE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
