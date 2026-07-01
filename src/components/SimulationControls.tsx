import { useState } from "react";
import { SimulatorConfig } from "../types";
import { Play, Pause, Radio, Zap, ShieldCheck, AlertOctagon, Sliders } from "lucide-react";

interface SimulationControlsProps {
  config: SimulatorConfig | null;
  onUpdateConfig: (newConfig: Partial<SimulatorConfig>) => Promise<void>;
  onInjectTransaction: (isFraud: boolean, scenario?: string) => Promise<void>;
  isInjecting: boolean;
}

export default function SimulationControls({
  config,
  onUpdateConfig,
  onInjectTransaction,
  isInjecting
}: SimulationControlsProps) {
  const [selectedScenario, setSelectedScenario] = useState("High-Value Region Mismatch");

  const scenariosList = [
    "High-Value Region Mismatch",
    "Card Cloning Velocity Run",
    "Product Sweep Account Takeover",
    "Anonymous Device Cash-out",
    "Cold Card Activation Spike"
  ];

  if (!config) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">Streaming Control Desk</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 rounded-full border ${
          config.isRunning 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold animate-pulse' 
            : 'bg-slate-100 text-slate-500 border-slate-200 font-bold'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.isRunning ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          {config.isRunning ? "RUNNING" : "PAUSED"}
        </span>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Speed Throttle */}
        <div className="space-y-3 lg:border-r lg:border-slate-100 lg:pr-5">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Pipeline Flow Speed
          </p>
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <button
              onClick={() => onUpdateConfig({ isRunning: !config.isRunning })}
              className={`p-2.5 rounded-lg cursor-pointer transition-colors shadow-sm shrink-0 ${
                config.isRunning 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title={config.isRunning ? "Pause Stream" : "Start Stream"}
            >
              {config.isRunning ? <Pause className="w-4 h-4 fill-amber-700" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                <span>Speed Throttle</span>
                <span className="font-bold text-slate-700">{config.speedTps} TPS</span>
              </div>
              <input 
                type="range" 
                min="0.2" 
                max="5" 
                step="0.2"
                value={config.speedTps} 
                onChange={(e) => onUpdateConfig({ speedTps: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Contamination Rate */}
        <div className="space-y-3 lg:border-r lg:border-slate-100 lg:px-5">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-slate-400" />
            Simulated Contamination
          </p>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
              <span>Underlying Fraud Ratio</span>
              <span className="font-bold text-slate-700">{(config.contaminationRate * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.25" 
              step="0.01"
              value={config.contaminationRate} 
              onChange={(e) => onUpdateConfig({ contaminationRate: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer focus:outline-none mt-2"
            />
          </div>
        </div>

        {/* Threat Preset Scenario */}
        <div className="space-y-3 lg:pl-5">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            Threat Preset Scenario
          </p>
          <div className="flex gap-2">
            {["Balanced", "HighVolume", "FraudWave"].map((preset) => {
              const isActive = config.scenario === preset;
              return (
                <button
                  key={preset}
                  onClick={() => onUpdateConfig({ scenario: preset as any })}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer font-bold ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset === "FraudWave" ? "🔥 Wave" : preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Direct Ingress Trigger Block */}
      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-2 font-mono">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          INTERACTIVE INCIDENT TRIGGER (DIRECT INGRESS)
        </p>
        
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer shadow-xs"
          >
            {scenariosList.map((sc, idx) => (
              <option key={idx} value={sc}>{sc}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => onInjectTransaction(true, selectedScenario)}
              disabled={isInjecting}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs px-4 py-2 rounded-lg border border-red-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs transition-colors"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Inject Attack
            </button>
            <button
              onClick={() => onInjectTransaction(false)}
              disabled={isInjecting}
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs px-4 py-2 rounded-lg border border-emerald-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Inject Normal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
