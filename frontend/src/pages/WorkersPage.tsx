import React, { useEffect, useState } from 'react';
import { workerService } from '../services/worker.service';
import type { Worker } from '../types/api.types';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { useWorkerUpdate } from '../context/SocketContext';
import {
  Server,
  Activity,
  Cpu,
  Clock,
  Radio,
  RotateCw,
  Zap,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = async () => {
    setRefreshing(true);
    try {
      const data = await workerService.getWorkers();
      setWorkers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useWorkerUpdate((updatedWorker) => {
    setWorkers((prev) => {
      const exists = prev.find(w => w.id === updatedWorker.id);
      if (exists) {
        return prev.map(w => w.id === updatedWorker.id ? updatedWorker : w);
      }
      return [updatedWorker, ...prev];
    });
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeCount = workers.filter(w => w.status === 'ONLINE' || w.status === 'BUSY').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-surface-elevated/70 to-slate-900/60 border border-surface-border shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Server className="w-6 h-6 text-indigo-400" />
            Distributed Worker Fleet
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Autonomous background daemon nodes, heartbeats, and real-time execution workloads ({activeCount}/{workers.length} nodes active)
          </p>
        </div>
        <button
          onClick={fetchWorkers}
          disabled={refreshing}
          className="btn-secondary btn-sm flex items-center gap-2"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{refreshing ? 'Polling Fleet...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Worker Rack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workers.map((worker) => {
          const isOnline = worker.status === 'ONLINE' || worker.status === 'BUSY';
          return (
            <div
              key={worker.id}
              className={`p-6 rounded-2xl bg-surface-elevated/80 border transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1 ${
                isOnline
                  ? 'border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-b from-emerald-950/20 to-surface-elevated'
                  : 'border-surface-border opacity-70'
              }`}
            >
              <div>
                {/* Status & Heartbeat Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${isOnline ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      {worker.hostname}
                    </span>
                  </div>
                  <Badge status={worker.status} />
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 mb-4">
                  <span className="text-[10px] text-gray-500 font-mono block">WORKER ID</span>
                  <span className="text-xs font-mono text-indigo-300 font-semibold truncate block" title={worker.id}>
                    {worker.id}
                  </span>
                </div>

                {/* Telemetry Metrics */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      Process PID
                    </span>
                    <span className="font-mono text-gray-200">{worker.pid}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Jobs Processed
                    </span>
                    <span className="font-bold text-white">{worker.jobsProcessed}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      In-Flight Jobs
                    </span>
                    <span className="font-bold text-amber-300">{worker.currentJobIds?.length || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-pink-400" />
                      Last Heartbeat
                    </span>
                    <span className="text-gray-300 font-mono text-[11px]">
                      {new Date(worker.lastHeartbeatAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Uptime Since
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      {new Date(worker.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Failover Heartbeat TTL: 45s</span>
                <span className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {isOnline ? '● Healthy Node' : '○ Offline'}
                </span>
              </div>
            </div>
          );
        })}

        {workers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-surface-elevated/40 rounded-2xl border border-dashed border-surface-border">
            <Server className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No active worker daemons found</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Run <code className="text-indigo-300 bg-black/40 px-2 py-0.5 rounded font-mono">npm run dev</code> or start the worker process to view live node telemetry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
