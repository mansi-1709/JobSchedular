import React, { useEffect, useState } from 'react';
import { workerService } from '../services/worker.service';
import type { Worker } from '../types/api.types';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useWorkerUpdate } from '../context/SocketContext';

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      const data = await workerService.getWorkers();
      setWorkers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Workers</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor active worker processes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="flex items-center gap-2">
                {worker.status === 'ONLINE' || worker.status === 'BUSY' ? (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow"></div>
                ) : (
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                )}
                <Badge status={worker.status} />
              </div>
            </div>
            
            <h3 className="font-mono text-sm font-semibold text-white mb-4 pr-20 truncate" title={worker.id}>
              {worker.id}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-surface-border/50 pb-2">
                <span className="text-gray-400">Hostname</span>
                <span className="text-white">{worker.hostname}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/50 pb-2">
                <span className="text-gray-400">PID</span>
                <span className="text-white">{worker.pid}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/50 pb-2">
                <span className="text-gray-400">Jobs Processed</span>
                <span className="text-white">{worker.jobsProcessed}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/50 pb-2">
                <span className="text-gray-400">Current Jobs</span>
                <span className="text-white">{worker.currentJobIds.length}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border/50 pb-2">
                <span className="text-gray-400">Last Heartbeat</span>
                <span className="text-white text-xs">
                  {new Date(worker.lastHeartbeatAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Started</span>
                <span className="text-white text-xs">
                  {new Date(worker.startedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        ))}
        {workers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-surface-elevated rounded-xl border border-dashed border-surface-border">
            <h3 className="text-lg font-medium text-white mb-2">No active workers</h3>
            <p className="text-gray-400">Start a worker process to see it listed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
