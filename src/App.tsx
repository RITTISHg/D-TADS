import { useState, useEffect, useCallback } from "react";
import { 
  IEEECisTransaction, AnomalyAlert, QueueStats, 
  ModelMetrics, SimulatorConfig, SystemStats 
} from "./types";

import DashboardStats from "./components/DashboardStats";
import SimulationControls from "./components/SimulationControls";
import RealTimeFeed from "./components/RealTimeFeed";
import AlertStream from "./components/AlertStream";
import ModelPanel from "./components/ModelPanel";

import { ShieldAlert, BarChart3, Radio, Sparkles, Loader2 } from "lucide-react";

export default function App() {
  const [transactions, setTransactions] = useState<IEEECisTransaction[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [brokerStats, setBrokerStats] = useState<QueueStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [modelMetrics, setModelMetrics] = useState<{
    baseline: ModelMetrics | null;
    tuned: ModelMetrics | null;
  }>({ baseline: null, tuned: null });

  const [simulatorConfig, setSimulatorConfig] = useState<SimulatorConfig | null>(null);
  
  const [isInjecting, setIsInjecting] = useState(false);
  const [isTuning, setIsTuning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'telemetry'>('dashboard');

  const fetchModelStats = useCallback(async () => {
    try {
      const res = await fetch("/api/models/stats");
      if (res.ok) {
        const data = await res.json();
        setModelMetrics({
          baseline: data.baseline,
          tuned: data.tuned
        });
      }
    } catch (err) {
      console.error("Failed to fetch model stats:", err);
    }
  }, []);

  const fetchStreamingFeeds = useCallback(async () => {
    try {
      const txRes = await fetch("/api/transactions");
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions);
        setBrokerStats(data.brokerStats);
      }

      const alertRes = await fetch("/api/alerts");
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(data);
      }

      const sysRes = await fetch("/api/system/stats");
      if (sysRes.ok) {
        const data = await sysRes.json();
        setSystemStats(data);
      }
    } catch (err) {
      console.error("Failed to sync stream feeds:", err);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setSimulatorConfig({
        isRunning: true,
        speedTps: 1,
        scenario: 'Balanced',
        contaminationRate: 0.07
      });

      await fetchModelStats();
      await fetchStreamingFeeds();
    };

    bootstrap();
  }, [fetchModelStats, fetchStreamingFeeds]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (simulatorConfig?.isRunning) {
        fetchStreamingFeeds();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulatorConfig?.isRunning, fetchStreamingFeeds]);

  const handleUpdateSimulatorConfig = async (newConfig: Partial<SimulatorConfig>) => {
    try {
      const res = await fetch("/api/simulator/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorConfig(data.config);
        await fetchStreamingFeeds();
      }
    } catch (err) {
      console.error("Failed to update simulator control:", err);
    }
  };

  const handleInjectTransaction = async (isFraud: boolean, scenario?: string) => {
    setIsInjecting(true);
    try {
      const res = await fetch("/api/transactions/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFraud, scenario })
      });
      if (res.ok) {
        await fetchStreamingFeeds();
      }
    } catch (err) {
      console.error("Failed to inject manual event:", err);
    } finally {
      setIsInjecting(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
      }
    } catch (err) {
      console.error("Failed to update alert state:", err);
    }
  };

  const handleTuneModels = async (tuningParams: {
    baseline?: { nEstimators: number; maxSamples: number };
    tuned?: { nTrees: number; learningRate: number; maxDepth: number };
  }) => {
    setIsTuning(true);
    try {
      const res = await fetch("/api/models/tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tuningParams)
      });
      if (res.ok) {
        const data = await res.json();
        setModelMetrics({
          baseline: data.baseline,
          tuned: data.tuned
        });
      }
    } catch (err) {
      console.error("Failed to train and optimize:", err);
    } finally {
      setIsTuning(false);
    }
  };

  const handleExplainWithGemini = async (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, geminiLoading: true } : a));
    
    try {
      const res = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId })
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => a.id === alertId ? { 
          ...a, 
          geminiExplanation: data.explanation, 
          geminiLoading: false 
        } : a));
      } else {
        throw new Error("Failed to generate response");
      }
    } catch (err: any) {
      console.error("Gemini call failed:", err);
      setAlerts(prev => prev.map(a => a.id === alertId ? { 
        ...a, 
        geminiExplanation: `⚠️ Connection to Gemini API failed. Please ensure your API key is correctly initialized in AI Studio Secrets.`, 
        geminiLoading: false 
      } : a));
    }
  };

  const handleResetSimulation = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/simulator/reset", { method: "POST" });
      if (res.ok) {
        setTransactions([]);
        setAlerts([]);
        if (brokerStats) {
          setBrokerStats({
            ...brokerStats,
            totalIngested: 0,
            totalProcessed: 0,
            queueSize: 0,
            partitions: brokerStats.partitions.map(p => ({ ...p, offset: 0, lag: 0, status: 'IDLE' }))
          });
        }
      }
    } catch (err) {
      console.error("Failed to reset stream:", err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight">D-TADS <span className="font-normal text-slate-400">// Distributed Anomaly Detection</span></h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Real-Time Streaming Fraud Engine · IEEE-CIS Kaggle Framework
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 p-1 rounded-lg bg-slate-50 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Real-time Ingestion
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'telemetry' 
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              ML Version Tuning
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <DashboardStats 
          brokerStats={brokerStats}
          alertCount={alerts.length}
          systemStats={systemStats}
          onReset={handleResetSimulation}
          isResetting={isResetting}
        />

        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <SimulationControls 
              config={simulatorConfig}
              onUpdateConfig={handleUpdateSimulatorConfig}
              onInjectTransaction={handleInjectTransaction}
              isInjecting={isInjecting}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
              <RealTimeFeed transactions={transactions} />
              <AlertStream 
                alerts={alerts}
                onUpdateStatus={handleUpdateAlertStatus}
                onExplainWithGemini={handleExplainWithGemini}
              />
            </div>
          </div>
        ) : (
          <ModelPanel 
            metrics={modelMetrics}
            onTuneModels={handleTuneModels}
            isTuning={isTuning}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 px-6 mt-12 text-center text-[10px] text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Active Consumer Group: anomaly-detector-group · Topic Partitions: 3</span>
          {systemStats && (
            <div className="flex gap-4">
              <span>CPU: {systemStats.cpuUsage}%</span>
              <span>Memory: {systemStats.memoryUsageMb} MB</span>
              <span>Broker Latency: {systemStats.latencyMs} ms</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
