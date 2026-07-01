import { useState } from "react";
import { SimulatorConfig } from "../types";
import { Play, Pause, Radio, Zap, ShieldCheck, AlertOctagon } from "lucide-react";

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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800 font-mono">Streaming Control Desk</h2>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono ${
          config.isRunning ? 'bg-green-50 text-green-700 font-semibold' : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
          {config.isRunning ? "RUNNING" : "PAUSED"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        <div className="space-y-2 border-r border-gray-50 pr-4">
          <p className="font-semibold text-gray-700">Pipeline Flow</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateConfig({ isRunning: !config.isRunning })}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                config.isRunning ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title={config.isRunning ? "Pause Stream" : "Start Stream"}
            >
              {config.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-0.5">
                <span>Speed Throttle</span>
                <span className="font-semibold">{config.speedTps} TPS</span>
              </div>
              <input 
                type="range" 
                min="0.2" 
                max="5" 
                step="0.2"
                value={config.speedTps} 
                onChange={(e) => onUpdateConfig({ speedTps: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 h-1 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 border-r border-gray-50 px-0 md:px-4">
          <p className="font-semibold text-gray-700">Simulated Contamination Rate</p>
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mb-1">
              <span>Underlying Fraud Ratio</span>
              <span className="font-semibold">{(config.contaminationRate * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.25" 
              step="0.01"
              value={config.contaminationRate} 
              onChange={(e) => onUpdateConfig({ contaminationRate: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 h-1 bg-gray-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2 px-0 md:px-4">
          <p className="font-semibold text-gray-700">Threat Preset Scenario</p>
          <div className="flex gap-1.5">
            {["Balanced", "HighVolume", "FraudWave"].map((preset) => {
              const isActive = config.scenario === preset;
              return (
                <button
                  key={preset}
                  onClick={() => onUpdateConfig({ scenario: preset as any })}
                  className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 text-white font-semibold' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset === "FraudWave" ? "🔥 Wave" : preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2.5">
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          Interactive Incident Trigger (Direct Ingress)
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="flex-1 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none"
          >
            {scenariosList.map((sc, idx) => (
              <option key={idx} value={sc}>{sc}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => onInjectTransaction(true, selectedScenario)}
              disabled={isInjecting}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs px-3.5 py-1.5 rounded border border-red-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Inject Attack
            </button>
            <button
              onClick={() => onInjectTransaction(false)}
              disabled={isInjecting}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs px-3.5 py-1.5 rounded border border-emerald-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
