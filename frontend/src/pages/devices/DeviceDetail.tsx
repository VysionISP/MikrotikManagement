import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Activity, Cpu, MemoryStick, Clock, Network } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { devicesApi } from '../../api/devices';
import { StatusBadge } from '../../components/StatusBadge';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const id = Number(deviceId);
  const qc = useQueryClient();

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.get(id),
  });

  const { data: stats, refetch: refetchStats, isFetching: fetchingStats } = useQuery({
    queryKey: ['device-stats', id],
    queryFn: () => devicesApi.getStats(id),
    refetchInterval: 60000,
    retry: false,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['device-metrics', id],
    queryFn: () => devicesApi.getMetrics(id, 60),
    refetchInterval: 60000,
  });

  const testConn = useMutation({
    mutationFn: () => devicesApi.testConnection(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['device', id] });
      void refetchStats();
    },
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!device) return <div className="p-8 text-red-500">Device not found</div>;

  const chartData = [...metrics]
    .reverse()
    .map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: m.cpuLoad ?? 0,
      memory:
        m.totalMemory && m.memoryUsed
          ? Math.round((m.memoryUsed / m.totalMemory) * 100)
          : 0,
    }));

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/organizations" className="hover:text-gray-600">Organizations</Link>
        <ChevronRight size={14} />
        <Link to={`/sites/${device.siteId}`} className="hover:text-gray-600">Site</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{device.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
            <StatusBadge status={device.status} />
          </div>
          <p className="text-gray-500 text-sm">
            {device.ipAddress}:{device.apiPort}
            {device.model && ` · ${device.model}`}
            {device.version && ` · RouterOS v${device.version}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refetchStats()}
            disabled={fetchingStats}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={fetchingStats ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => testConn.mutate()}
            disabled={testConn.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {testConn.isPending ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Live stats */}
      {stats?.resources && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Cpu size={16} />
              <span className="text-xs font-medium">CPU Load</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.resources.cpuLoad}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <MemoryStick size={16} />
              <span className="text-xs font-medium">Memory Used</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.resources.totalMemory
                ? `${Math.round((stats.resources.memoryUsed / stats.resources.totalMemory) * 100)}%`
                : formatBytes(stats.resources.memoryUsed)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatBytes(stats.resources.memoryUsed)} / {formatBytes(stats.resources.totalMemory)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock size={16} />
              <span className="text-xs font-medium">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatUptime(stats.resources.uptimeSeconds)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Activity size={16} />
              <span className="text-xs font-medium">Board</span>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">{stats.resources.boardName}</p>
            <p className="text-xs text-gray-400">v{stats.resources.version}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">CPU Load (%)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Memory Usage (%)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Interfaces */}
      {stats?.interfaces && stats.interfaces.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Network size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Interfaces</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Type', 'MAC Address', 'Status', 'RX', 'TX'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.interfaces.map((iface) => (
                  <tr key={iface.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{iface.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{iface.type}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{iface.macAddress}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          iface.disabled
                            ? 'bg-gray-100 text-gray-500'
                            : iface.running
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {iface.disabled ? 'Disabled' : iface.running ? 'Running' : 'Down'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{formatBytes(iface.rxByte)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatBytes(iface.txByte)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!stats && !fetchingStats && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <Activity size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No stats available</p>
          <p className="text-sm text-gray-400 mt-1">Click "Test Connection" to fetch live device data</p>
        </div>
      )}
    </div>
  );
}
