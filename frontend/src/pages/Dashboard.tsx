import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Router, WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { orgsApi } from '../api/organizations';
import { sitesApi } from '../api/sites';
import { devicesApi } from '../api/devices';
import { useAuth } from '../contexts/AuthContext';
import type { DeviceStatus } from '../types';

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();

  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: orgsApi.list,
  });

  // Fetch all sites across orgs
  const { data: allSites = [] } = useQuery({
    queryKey: ['all-sites', orgs.map((o) => o.id)],
    queryFn: async () => {
      const results = await Promise.all(orgs.map((o) => sitesApi.list(o.id)));
      return results.flat();
    },
    enabled: orgs.length > 0,
  });

  // Fetch all devices across sites
  const { data: allDevices = [] } = useQuery({
    queryKey: ['all-devices', allSites.map((s) => s.id)],
    queryFn: async () => {
      const results = await Promise.all(allSites.map((s) => devicesApi.list(s.id)));
      return results.flat();
    },
    enabled: allSites.length > 0,
  });

  const statusCount = (status: DeviceStatus) =>
    allDevices.filter((d) => d.status === status).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.username}
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of your network infrastructure.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<Building2 size={20} className="text-blue-600" />}
          label="Organizations"
          value={orgs.length}
          color="bg-blue-50"
        />
        <StatCard
          icon={<MapPin size={20} className="text-purple-600" />}
          label="Sites"
          value={allSites.length}
          color="bg-purple-50"
        />
        <StatCard
          icon={<Router size={20} className="text-gray-600" />}
          label="Total Devices"
          value={allDevices.length}
          color="bg-gray-50"
        />
        <StatCard
          icon={<Wifi size={20} className="text-green-600" />}
          label="Online"
          value={statusCount('ONLINE')}
          color="bg-green-50"
        />
        <StatCard
          icon={<WifiOff size={20} className="text-red-600" />}
          label="Offline"
          value={statusCount('OFFLINE')}
          color="bg-red-50"
        />
      </div>

      {/* Organizations list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Organizations</h2>
          <Link
            to="/organizations"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No organizations yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first organization to get started</p>
            <Link
              to="/organizations"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Create Organization
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <Link
                key={org.id}
                to={`/organizations/${org.id}`}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {org.members?.find((m) => m.userId === user?.id)?.role ?? 'MEMBER'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {org.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">/{org.slug}</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-500">
                    {org._count?.sites ?? 0} sites
                  </span>
                  <span className="text-xs text-gray-500">
                    {org._count?.members ?? 0} members
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Warning devices */}
      {statusCount('WARNING') > 0 && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
          <p className="text-sm text-yellow-800">
            {statusCount('WARNING')} device(s) are reporting warnings. Check your sites for details.
          </p>
        </div>
      )}
    </div>
  );
}
