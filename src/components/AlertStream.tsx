import { useState } from "react";
import { AnomalyAlert } from "../types";
import { 
  ShieldAlert, Sparkles, Loader2, CheckCircle2, 
  AlertTriangle, X
} from "lucide-react";

interface AlertStreamProps {
  alerts: AnomalyAlert[];
  onUpdateStatus: (alertId: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') => void;
  onExplainWithGemini: (alertId: string) => void;
}

export default function AlertStream({
  alerts,
  onUpdateStatus,
  onExplainWithGemini
}: AlertStreamProps) {
  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[520px]">
      <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between bg-red-50/20 rounded-t-xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <h2 className="text-sm font-semibold text-gray-800">Anomaly Detections & Alerts</h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full font-semibold">
          <span>{alerts.filter(a => a.status === 'OPEN').length} Unresolved</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-50">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <CheckCircle2 className="w-8 h-8 text-green-400 stroke-[1.5] mb-2" />
            <p className="text-xs text-gray-500 font-medium">No anomaly alerts detected</p>
            <p className="text-[10px] text-gray-400 mt-1">If the models are trained correctly, they will catch anomalies when fraud is streamed.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            return (
              <div 
                key={alert.id}
                className={`p-4 hover:bg-gray-50/40 transition-colors flex flex-col cursor-pointer ${
                  selectedAlert?.id === alert.id ? 'bg-indigo-50/10 border-l-2 border-indigo-500' : ''
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-gray-800">
                        TX-{alert.transaction.TransactionID}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        alert.riskScore >= 80 ? 'bg-red-100 text-red-700' : 
                        alert.riskScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        Risk: {alert.riskScore}/100
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                        {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-800 mt-1">
                      ${alert.transaction.TransactionAmt.toFixed(2)} USD · {alert.transaction.card4.toUpperCase()} ({alert.transaction.card6})
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={alert.status}
                      onChange={(e) => onUpdateStatus(alert.id, e.target.value as any)}
                      className="text-[10px] border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="OPEN">Open</option>
                      <option value="INVESTIGATING">Reviewing</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>

                    <button
                      onClick={() => onExplainWithGemini(alert.id)}
                      disabled={alert.geminiLoading}
                      className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2 py-1 rounded font-medium disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {alert.geminiLoading ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5" />
                      )}
                      Explain
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] font-mono bg-gray-50 p-2 rounded">
                  <div>
                    <span className="text-gray-400">Baseline (IF):</span>{" "}
                    <span className={`font-semibold ${alert.isBaselineFlagged ? 'text-red-600' : 'text-gray-500'}`}>
                      {alert.baselineScore.toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tuned (XGB+IF):</span>{" "}
                    <span className={`font-semibold ${alert.isTunedFlagged ? 'text-red-600' : 'text-gray-500'}`}>
                      {alert.tunedScore.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {alert.keyRiskFactors.slice(0, 2).map((rf, i) => (
                    <span key={i} className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                      {rf}
                    </span>
                  ))}
                  {alert.keyRiskFactors.length > 2 && (
                    <span className="text-[9px] text-gray-400 px-1 py-0.5">
                      +{alert.keyRiskFactors.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedAlert && (
        <div className="absolute inset-0 bg-white/95 z-10 flex flex-col rounded-xl p-4 border border-indigo-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                AI Threat Assessment: TX-{selectedAlert.transaction.TransactionID}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedAlert(null)}
              className="p-1 hover:bg-gray-100 rounded-full text-gray-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between font-mono text-[10px] text-gray-500">
                <span>SCENARIO: {selectedAlert.transaction.fraudScenario || "Unknown Attack Profile"}</span>
                <span>RISK: {selectedAlert.riskScore}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-[10px]">Transaction Amount</p>
                  <p className="font-semibold text-gray-800 font-mono text-sm">${selectedAlert.transaction.TransactionAmt.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px]">Payment Instrument</p>
                  <p className="font-semibold text-gray-800 capitalize">{selectedAlert.transaction.card4} {selectedAlert.transaction.card6}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] mb-1">Flagged Risk Indicators</p>
                <div className="flex flex-col gap-1">
                  {selectedAlert.keyRiskFactors.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-indigo-50 bg-indigo-50/10 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini Agent Insights
                </span>
                {!selectedAlert.geminiExplanation && (
                  <button
                    onClick={() => onExplainWithGemini(selectedAlert.id)}
                    disabled={selectedAlert.geminiLoading}
                    className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1 rounded shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    {selectedAlert.geminiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>Generate Analysis</>
                    )}
                  </button>
                )}
              </div>

              {selectedAlert.geminiLoading ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-[10px] animate-pulse">Running advanced multi-dimensional fraud analysis on IEEE-CIS vectors...</p>
                </div>
              ) : selectedAlert.geminiExplanation ? (
                <div className="prose prose-sm prose-indigo text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans">
                  {selectedAlert.geminiExplanation}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-4">Click "Generate Analysis" to evaluate with Google Gemini 3.5-flash.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
