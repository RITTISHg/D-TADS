import { useState } from "react";
import { AnomalyAlert } from "../types";
import { 
  ShieldAlert, Sparkles, Loader2, CheckCircle2, 
  AlertTriangle, X, ShieldX, Clock
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[520px] relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-red-50/10 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-800 font-mono tracking-tight">Anomaly Detections & Alerts</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
          <ShieldX className="w-3 h-3 text-red-500" />
          {alerts.filter(a => a.status === 'OPEN').length} Unresolved
        </span>
      </div>

      {/* List of Alerts */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[1.5] mb-3 bg-emerald-50 rounded-full p-2" />
            <p className="text-xs text-slate-700 font-medium">Pipeline Clear: No anomalies detected</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
              All streamed transactions conform to normal spatial density boundaries.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isHighRisk = alert.riskScore >= 80;
            const isMediumRisk = alert.riskScore >= 60;
            const borderIndicatorColor = isHighRisk 
              ? "bg-red-500" 
              : isMediumRisk 
                ? "bg-amber-500" 
                : "bg-yellow-400";

            return (
              <div 
                key={alert.id}
                className={`flex hover:bg-slate-50/40 transition-colors cursor-pointer group ${
                  selectedAlert?.id === alert.id ? 'bg-indigo-50/20' : ''
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                {/* Left indicator accent stripe */}
                <div className={`w-1.5 ${borderIndicatorColor} shrink-0`}></div>

                {/* Main card body */}
                <div className="flex-1 p-4 space-y-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    {/* ID and Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        TX-{alert.transaction.TransactionID}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isHighRisk 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : isMediumRisk 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        Risk: {alert.riskScore}/100
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-300" />
                        {alert.timestamp}
                      </span>
                    </div>

                    {/* Quick status dropdown & Explain action */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={alert.status}
                        onChange={(e) => onUpdateStatus(alert.id, e.target.value as any)}
                        className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 bg-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="OPEN">Open</option>
                        <option value="INVESTIGATING">Reviewing</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>

                      <button
                        onClick={() => onExplainWithGemini(alert.id)}
                        disabled={alert.geminiLoading}
                        className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded font-semibold border border-indigo-100 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
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

                  {/* Transaction Details */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-800 font-mono">
                      ${alert.transaction.TransactionAmt.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      USD · <span className="capitalize">{alert.transaction.card4}</span> ({alert.transaction.card6})
                    </span>
                  </div>

                  {/* Model Scores Side-By-Side */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <div className="flex justify-between px-1">
                      <span className="text-slate-400 font-medium">Baseline (iForest):</span>
                      <span className={`font-bold ${alert.isBaselineFlagged ? 'text-red-600' : 'text-slate-500'}`}>
                        {alert.baselineScore.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between px-1 border-l border-slate-200">
                      <span className="text-slate-400 font-medium">Tuned (XGB+iF):</span>
                      <span className={`font-bold ${alert.isTunedFlagged ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {alert.tunedScore.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Indicators / Risk Factors */}
                  <div className="flex flex-wrap gap-1 items-center">
                    {alert.keyRiskFactors.slice(0, 2).map((rf, i) => (
                      <span key={i} className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5 font-medium whitespace-nowrap">
                        {rf}
                      </span>
                    ))}
                    {alert.keyRiskFactors.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-mono px-1 font-semibold">
                        +{alert.keyRiskFactors.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Slide-In Modal Assessment Details */}
      {selectedAlert && (
        <div className="absolute inset-0 bg-white/95 z-20 flex flex-col rounded-xl p-5 border border-indigo-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                AI Threat Assessment Details
              </h3>
            </div>
            <button 
              onClick={() => setSelectedAlert(null)}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-3">
              <div className="flex justify-between items-center font-mono text-[9px] text-slate-400 border-b border-slate-200/50 pb-2">
                <span className="font-bold text-slate-500">TXID: {selectedAlert.transaction.TransactionID}</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                  selectedAlert.riskScore >= 80 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  RISK SCORE: {selectedAlert.riskScore}/100
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-[10px] font-mono">TRANSACTION VALUE</p>
                  <p className="font-extrabold text-slate-800 font-mono text-sm mt-0.5">${selectedAlert.transaction.TransactionAmt.toFixed(2)} USD</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-mono">PAYMENT INSTRUMENT</p>
                  <p className="font-bold text-slate-700 capitalize mt-0.5">{selectedAlert.transaction.card4} {selectedAlert.transaction.card6}</p>
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2">
                <p className="text-slate-400 text-[10px] font-mono uppercase mb-1.5">Flagged Risk Indicators</p>
                <div className="flex flex-col gap-1">
                  {selectedAlert.keyRiskFactors.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50/50 px-2.5 py-1 rounded border border-amber-100/50">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-indigo-100 bg-indigo-50/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-indigo-500 fill-indigo-100" />
                  Gemini Agent Insights
                </span>
                {!selectedAlert.geminiExplanation && (
                  <button
                    onClick={() => onExplainWithGemini(selectedAlert.id)}
                    disabled={selectedAlert.geminiLoading}
                    className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {selectedAlert.geminiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>Run AI Review</>
                    )}
                  </button>
                )}
              </div>

              {selectedAlert.geminiLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-[10px] font-mono max-w-[240px] animate-pulse">Running multi-dimensional anomaly vector analysis on GBDT score distributions...</p>
                </div>
              ) : selectedAlert.geminiExplanation ? (
                <div className="text-xs text-slate-700 leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans bg-white p-3.5 border border-indigo-50/50 rounded-lg shadow-sm">
                  {selectedAlert.geminiExplanation}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center py-6 font-mono">
                  Trigger automated LLM explanation to inspect risk velocity outliers.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
