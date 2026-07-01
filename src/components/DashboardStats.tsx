import { QueueStats, SystemStats } from "../types";
import { Activity, Server, Database, AlertOctagon, RefreshCw, Cpu } from "lucide-react";

interface DashboardStatsProps {
  brokerStats: QueueStats | null;
  alertCount: number;
  systemStats: SystemStats | null;
  onReset: () => void;
  isResetting: boolean;
}

export default function DashboardStats({
  brokerStats,
  alertCount,
  systemStats,
  onReset,
  isResetting
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Throughput Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Queue Throughput</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-3xl font-extrabold text-slate-800 font-mono">
              {brokerStats ? brokerStats.throughput : "0.0"}
            </span>
            <span className="text-xs text-slate-400 font-mono font-medium">eps</span>
          </div>
          <p className="text-xs text-emerald-500 mt-3 flex items-center gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Streaming Active
          </p>
        </div>
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 text-indigo-600 rounded-xl">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {/* Broker Lag Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Redis Broker Lag</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className={`text-3xl font-extrabold font-mono ${brokerStats && brokerStats.queueSize > 50 ? 'text-amber-600' : 'text-slate-800'}`}>
              {brokerStats ? brokerStats.queueSize : "0"}
            </span>
            <span className="text-xs text-slate-400 font-mono font-medium">events</span>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {brokerStats?.partitions.map(p => (
              <span 
                key={p.id} 
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                  p.status === 'BACKPRESSURE' ? 'bg-red-50 text-red-600 border-red-150' :
                  p.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600 border-indigo-150' : 'bg-slate-50 text-slate-400 border-slate-150'
                }`}
                title={`Partition ${p.id} lag: ${p.lag}`}
              >
                P{p.id}: {p.lag}
              </span>
            ))}
          </div>
        </div>
        <div className="p-3 bg-amber-50/50 border border-amber-100 text-amber-600 rounded-xl">
          <Server className="w-5 h-5" />
        </div>
      </div>

      {/* Total Volume Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Total Stream Volume</p>
          <h3 className="text-3xl font-extrabold text-slate-800 mt-1.5 font-mono">
            {brokerStats ? brokerStats.totalIngested.toLocaleString() : "0"}
          </h3>
          <p className="text-xs text-slate-500 mt-3.5 flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Active Memory Broker
          </p>
        </div>
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 text-emerald-600 rounded-xl">
          <Database className="w-5 h-5" />
        </div>
      </div>

      {/* Flagged Threats Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Flagged Threats</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-3xl font-extrabold text-red-600 font-mono">
              {alertCount}
            </span>
            <span className="text-xs text-red-400 font-mono font-medium">alerts</span>
          </div>
          <p className="text-xs text-slate-500 mt-3.5 flex items-center gap-2 font-medium">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-400" />
              {systemStats ? `${systemStats.cpuUsage}% CPU` : ""}
            </span>
            <span className="text-slate-300">|</span>
            <button 
              onClick={onReset}
              disabled={isResetting}
              className="text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50 flex items-center gap-0.5 cursor-pointer font-bold"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset
            </button>
          </p>
        </div>
        <div className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
