import { useState } from "react";
import { ModelMetrics } from "../types";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Sliders, RotateCw, TrendingUp, Info } from "lucide-react";

interface ModelPanelProps {
  metrics: {
    baseline: ModelMetrics | null;
    tuned: ModelMetrics | null;
  };
  onTuneModels: (tuningParams: {
    baseline?: { nEstimators: number; maxSamples: number };
    tuned?: { nTrees: number; learningRate: number; maxDepth: number };
  }) => Promise<void>;
  isTuning: boolean;
}

export default function ModelPanel({
  metrics,
  onTuneModels,
  isTuning
}: ModelPanelProps) {
  const [ifEstimators, setIfEstimators] = useState(100);
  const [ifSamples, setIfSamples] = useState(256);

  const [xgbTrees, setXgbTrees] = useState(35);
  const [xgbLr, setXgbLr] = useState(0.15);
  const [xgbDepth, setXgbDepth] = useState(4);

  const handleRetrain = async () => {
    await onTuneModels({
      baseline: { nEstimators: ifEstimators, maxSamples: ifSamples },
      tuned: { nTrees: xgbTrees, learningRate: xgbLr, maxDepth: xgbDepth }
    });
  };

  const { baseline, tuned } = metrics;

  const rocChartData = [];
  if (baseline && tuned) {
    const pointsCount = Math.max(baseline.rocCurve.length, tuned.rocCurve.length);
    for (let i = 0; i < pointsCount; i++) {
      const bPt = baseline.rocCurve[i] || { fpr: 0, tpr: 0 };
      const tPt = tuned.rocCurve[i] || { fpr: 0, tpr: 0 };
      rocChartData.push({
        name: `T${i}`,
        fpr: parseFloat(bPt.fpr.toFixed(3)),
        "Baseline TPR": parseFloat(bPt.tpr.toFixed(3)),
        "Tuned TPR": parseFloat(tPt.tpr.toFixed(3)),
        random: parseFloat(bPt.fpr.toFixed(3))
      });
    }
  }

  const f1Diff = tuned && baseline ? (tuned.f1Score - baseline.f1Score) : 0;
  const f1PctImprovement = baseline && baseline.f1Score > 0 ? (f1Diff / baseline.f1Score) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Machine Learning Model Versioning</h2>
          <p className="text-xs text-slate-400 mt-0.5">Comparing baseline Isolation Forest vs. tuned XGBoost + IF ensemble classifier.</p>
        </div>

        {tuned && baseline && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider font-mono">F1-Score Improvement</p>
              <p className="text-lg font-semibold text-emerald-800 font-mono">
                +{f1PctImprovement.toFixed(1)}%{" "}
                <span className="text-xs font-normal text-emerald-600 font-sans">
                  ({baseline.f1Score.toFixed(3)} → {tuned.f1Score.toFixed(3)})
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Model Version 1.0</span>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">Unsupervised</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Baseline Isolation Forest</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Isolates anomalies strictly via multidimensional recursive random splits.</p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">F1-Score</p>
              <p className="text-lg font-semibold text-slate-800 font-mono mt-0.5">
                {baseline ? baseline.f1Score.toFixed(3) : "—"}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">ROC-AUC</p>
              <p className="text-lg font-semibold text-slate-800 font-mono mt-0.5">
                {baseline ? baseline.auc.toFixed(3) : "—"}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">Recall</p>
              <p className="text-lg font-semibold text-slate-800 font-mono mt-0.5">
                {baseline ? baseline.recall.toFixed(3) : "—"}
              </p>
            </div>
          </div>

          {baseline && (
            <div className="mt-4">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono mb-1.5">Val Confusion Matrix</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-center font-mono">
                <div className="bg-emerald-50/50 text-emerald-800 border border-emerald-100/50 p-2 rounded">
                  <div className="text-[9px] text-emerald-600 font-medium">True Neg (TN)</div>
                  <div className="font-bold text-sm mt-0.5">{baseline.confusionMatrix.tn}</div>
                </div>
                <div className="bg-red-50 text-red-800 border border-red-100 p-2 rounded">
                  <div className="text-[9px] text-red-600 font-medium">False Pos (FP)</div>
                  <div className="font-bold text-sm mt-0.5">{baseline.confusionMatrix.fp}</div>
                </div>
                <div className="bg-orange-50 text-orange-800 border border-orange-100 p-2 rounded">
                  <div className="text-[9px] text-orange-600 font-medium">False Neg (FN)</div>
                  <div className="font-bold text-sm mt-0.5">{baseline.confusionMatrix.fn}</div>
                </div>
                <div className="bg-indigo-50/50 text-indigo-800 border border-indigo-100/50 p-2 rounded">
                  <div className="text-[9px] text-indigo-600 font-medium">True Pos (TP)</div>
                  <div className="font-bold text-sm mt-0.5">{baseline.confusionMatrix.tp}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">Model Version 2.1</span>
            <span className="text-[10px] bg-indigo-100/50 px-2 py-0.5 rounded font-mono text-indigo-700 font-semibold">Supervised Ensemble</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Tuned XGBoost + Isolation Forest</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Ensembles tree boosting classification probabilities with spatial density scores.</p>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-white border border-indigo-50 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">F1-Score</p>
              <p className="text-lg font-bold text-indigo-600 font-mono mt-0.5">
                {tuned ? tuned.f1Score.toFixed(3) : "—"}
              </p>
            </div>
            <div className="bg-white border border-indigo-50 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">ROC-AUC</p>
              <p className="text-lg font-bold text-indigo-600 font-mono mt-0.5">
                {tuned ? tuned.auc.toFixed(3) : "—"}
              </p>
            </div>
            <div className="bg-white border border-indigo-50 p-2.5 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium">Recall</p>
              <p className="text-lg font-bold text-indigo-600 font-mono mt-0.5">
                {tuned ? tuned.recall.toFixed(3) : "—"}
              </p>
            </div>
          </div>

          {tuned && (
            <div className="mt-4">
              <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider font-mono mb-1.5">Val Confusion Matrix</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-center font-mono">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-2 rounded">
                  <div className="text-[9px] text-emerald-600 font-medium">True Neg (TN)</div>
                  <div className="font-bold text-sm mt-0.5">{tuned.confusionMatrix.tn}</div>
                </div>
                <div className="bg-red-50 text-red-800 border border-red-100 p-2 rounded">
                  <div className="text-[9px] text-red-600 font-medium">False Pos (FP)</div>
                  <div className="font-bold text-sm mt-0.5">{tuned.confusionMatrix.fp}</div>
                </div>
                <div className="bg-orange-50 text-orange-800 border border-orange-100 p-2 rounded">
                  <div className="text-[9px] text-orange-600 font-medium">False Neg (FN)</div>
                  <div className="font-bold text-sm mt-0.5">{tuned.confusionMatrix.fn}</div>
                </div>
                <div className="bg-indigo-600 text-white p-2 rounded shadow-sm">
                  <div className="text-[9px] text-indigo-200 font-medium">True Pos (TP)</div>
                  <div className="font-bold text-sm mt-0.5">{tuned.confusionMatrix.tp}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">Receiver Operating Characteristic (ROC)</h3>
            <p className="text-[11px] text-slate-400">Trading off False Positive Rate vs. True Positive Rate across model thresholds.</p>
          </div>
          <div className="flex gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-0.5 bg-slate-400 inline-block"></span>
              IF AUC: {baseline ? baseline.auc.toFixed(3) : "0.500"}
            </span>
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <span className="w-3 h-0.5 bg-indigo-600 inline-block"></span>
              XGB AUC: {tuned ? tuned.auc.toFixed(3) : "0.500"}
            </span>
          </div>
        </div>

        <div className="h-[230px] w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rocChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="fpr" 
                type="number" 
                domain={[0, 1]} 
                ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]} 
                stroke="#94a3b8"
                tickSize={6}
                name="FPR"
              />
              <YAxis 
                type="number" 
                domain={[0, 1]} 
                ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
                stroke="#94a3b8"
                tickSize={6}
                name="TPR"
              />
              <Tooltip 
                formatter={(value: any) => [value, "Rate"]}
                labelFormatter={(label) => `FPR Threshold point: ${label}`}
                contentStyle={{ background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "8px" }}
              />
              <Line 
                type="monotone" 
                dataKey="random" 
                stroke="#cbd5e1" 
                strokeDasharray="4 4" 
                dot={false} 
                activeDot={false}
              />
              <Line 
                type="monotone" 
                dataKey="Baseline TPR" 
                stroke="#94a3b8" 
                strokeWidth={2}
                dot={false} 
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Tuned TPR" 
                stroke="#4f46e5" 
                strokeWidth={3}
                dot={false} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">Hyperparameter Tuner</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Baseline (Isolation Forest)</h4>
            
            <div>
              <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-1">
                <span>Number of Estimators (Trees)</span>
                <span className="font-semibold">{ifEstimators}</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="250" 
                step="10"
                value={ifEstimators} 
                onChange={(e) => setIfEstimators(parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-1">
                <span>Max Samples Subsample</span>
                <span className="font-semibold">{ifSamples}</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="300" 
                step="25"
                value={ifSamples} 
                onChange={(e) => setIfSamples(parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-700">Tuned XGBoost / Boosted GBDT</h4>

            <div>
              <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-1">
                <span>Number of Boosted Trees</span>
                <span className="font-semibold">{xgbTrees}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={xgbTrees} 
                onChange={(e) => setXgbTrees(parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-1">
                  <span>Learning Rate</span>
                  <span className="font-semibold">{xgbLr.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="0.5" 
                  step="0.05"
                  value={xgbLr} 
                  onChange={(e) => setXgbLr(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-mono text-[10px] text-slate-500 mb-1">
                  <span>Max Depth</span>
                  <span className="font-semibold">{xgbDepth}</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="6" 
                  step="1"
                  value={xgbDepth} 
                  onChange={(e) => setXgbDepth(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3.5 mt-2 flex-wrap">
          <p className="text-[10px] text-slate-400 flex items-center gap-1 max-w-sm">
            <Info className="w-3.5 h-3.5 stroke-[1.5] text-indigo-500 shrink-0" />
            Hyperparameter updates trigger backend retraining of both models, recalculating F1 validation matrices dynamically in under 50ms.
          </p>
          <button
            onClick={handleRetrain}
            disabled={isTuning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isTuning ? 'animate-spin' : ''}`} />
            {isTuning ? "Retraining Models..." : "Retrain & Optimize Models"}
          </button>
        </div>
      </div>
    </div>
  );
}
