import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Router, Plus, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { sitesApi } from '../../api/sites';
import { devicesApi } from '../../api/devices';
import { StatusBadge } from '../../components/StatusBadge';

export function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const id = Number(siteId);
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    ipAddress: '',
    apiPort: '8728',
    username: 'admin',
    password: '',
  });

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => sitesApi.get(id),
  });

  const { data: devices = [], refetch } = useQuery({
    queryKey: ['devices', id],
    queryFn: () => devicesApi.list(id),
    refetchInterval: 30000,
  });

  const addDevice = useMutation({
    mutationFn: () =>
      devicesApi.create(id, {
        name: deviceForm.name,
        ipAddress: deviceForm.ipAddress,
        apiPort: deviceForm.apiPort ? parseInt(deviceForm.apiPort) : undefined,
        username: deviceForm.username,
        password: deviceForm.password,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['devices', id] });
      setShowAdd(false);
      setDeviceForm({ name: '', ipAddress: '', apiPort: '8728', username: 'admin', password: '' });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: (deviceId: number) => devicesApi.delete(deviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices', id] }),
  });

  const testDevice = useMutation({
    mutationFn: (deviceId: number) => devicesApi.testConnection(deviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices', id] }),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!site) return <div className="p-8 text-red-500">Site not found</div>;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/organizations" className="hover:text-gray-600">Organizations</Link>
        <ChevronRight size={14} />
        <Link to={`/organizations/${site.organizationId}`} className="hover:text-gray-600">
          {site.organization?.name ?? 'Organization'}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{site.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          {site.description && <p className="text-gray-500 text-sm mt-0.5">{site.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refetch()}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} />
            Add Device
          </button>
        </div>
      </div>

      {/* Devices */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Router size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No devices yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first Mikrotik device to start monitoring</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors"
            >
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <Router size={20} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900">{device.name}</h3>
                  <StatusBadge status={device.status} />
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {device.ipAddress}:{device.apiPort}
                  {device.model && ` · ${device.model}`}
                  {device.version && ` · v${device.version}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testDevice.mutate(device.id)}
                  disabled={testDevice.isPending}
                  className="px-3 py-1.5 text-sm border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this device?')) deleteDevice.mutate(device.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                <Link
                  to={`/devices/${device.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-sm transition-colors"
                >
                  Details
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Add Mikrotik Device</h2>
            <div className="space-y-4">
              {[
                { key: 'name', label: 'Device Name', placeholder: 'Main Router', type: 'text' },
                { key: 'ipAddress', label: 'IP Address', placeholder: '192.168.1.1', type: 'text' },
                { key: 'apiPort', label: 'API Port', placeholder: '8728', type: 'number' },
                { key: 'username', label: 'API Username', placeholder: 'admin', type: 'text' },
                { key: 'password', label: 'API Password', placeholder: '••••••••', type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={deviceForm[key as keyof typeof deviceForm]}
                    onChange={(e) =>
                      setDeviceForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              {addDevice.error && (
                <p className="text-sm text-red-600">
                  {(addDevice.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add device'}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => addDevice.mutate()}
                disabled={!deviceForm.name || !deviceForm.ipAddress || addDevice.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {addDevice.isPending ? 'Adding...' : 'Add Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
