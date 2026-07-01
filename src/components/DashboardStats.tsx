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
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Queue Throughput</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-semibold text-slate-800 font-mono">
              {brokerStats ? brokerStats.throughput : "0.0"}
            </span>
            <span className="text-xs text-slate-400">eps</span>
          </div>
          <p className="text-xs text-emerald-500 mt-2.5 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Streaming Active
          </p>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kafka Broker Lag</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-semibold font-mono ${brokerStats && brokerStats.queueSize > 50 ? 'text-amber-600' : 'text-slate-800'}`}>
              {brokerStats ? brokerStats.queueSize : "0"}
            </span>
            <span className="text-xs text-slate-400">events</span>
          </div>
          <div className="flex gap-1.5 mt-2.5">
            {brokerStats?.partitions.map(p => (
              <span 
                key={p.id} 
                className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                  p.status === 'BACKPRESSURE' ? 'bg-red-50 text-red-600 border border-red-100' :
                  p.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                }`}
                title={`Partition ${p.id} lag: ${p.lag}`}
              >
                P{p.id}: {p.lag}
              </span>
            ))}
          </div>
        </div>
        <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg">
          <Server className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Stream Volume</p>
          <h3 className="text-2xl font-semibold text-gray-800 mt-1 font-mono">
            {brokerStats ? brokerStats.totalIngested.toLocaleString() : "0"}
          </h3>
          <p className="text-xs text-slate-500 mt-2.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Active Memory Broker
          </p>
        </div>
        <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
          <Database className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-indigo-100 bg-indigo-50/30 shadow-sm shadow-indigo-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Flagged Threats</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-semibold text-indigo-700 font-mono">
              {alertCount}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-gray-400" />
              {systemStats ? `${systemStats.cpuUsage}% CPU` : ""}
            </span>
            <button 
              onClick={onReset}
              disabled={isResetting}
              className="text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50 flex items-center gap-0.5 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset
            </button>
          </p>
        </div>
        <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-lg">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
