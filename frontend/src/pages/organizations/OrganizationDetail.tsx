import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Users, ChevronRight, Trash2, Router } from 'lucide-react';
import { orgsApi } from '../../api/organizations';
import { sitesApi } from '../../api/sites';
import { useAuth } from '../../contexts/AuthContext';

export function OrganizationDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const id = Number(orgId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showSiteCreate, setShowSiteCreate] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: '', description: '' });

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: () => orgsApi.get(id),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites', id],
    queryFn: () => sitesApi.list(id),
  });

  const createSite = useMutation({
    mutationFn: () => sitesApi.create(id, siteForm.name, siteForm.description || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sites', id] });
      setShowSiteCreate(false);
      setSiteForm({ name: '', description: '' });
    },
  });

  const deleteSite = useMutation({
    mutationFn: (siteId: number) => sitesApi.delete(siteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites', id] }),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!org) return <div className="p-8 text-red-500">Organization not found</div>;

  const myRole = org.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/organizations" className="hover:text-gray-600">Organizations</Link>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{org.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">/{org.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            {myRole}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sites */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" />
              Sites ({sites.length})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowSiteCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus size={14} />
                New Site
              </button>
            )}
          </div>

          {sites.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No sites yet</p>
              <p className="text-sm text-gray-400 mt-1">Add a site to group your Mikrotik devices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors"
                >
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <MapPin size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{site.name}</h3>
                    {site.description && (
                      <p className="text-sm text-gray-400 truncate">{site.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Router size={12} />
                      {site._count?.devices ?? 0} devices
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this site?')) deleteSite.mutate(site.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <Link
                      to={`/sites/${site.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 rounded-lg text-sm transition-colors"
                    >
                      View
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users size={18} className="text-gray-400" />
            Members ({org.members?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {org.members?.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {member.user?.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{member.user?.username}</p>
                  <p className="text-xs text-gray-400 truncate">{member.user?.email}</p>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Site Modal */}
      {showSiteCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Create Site</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={siteForm.name}
                  onChange={(e) => setSiteForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Headquarters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={siteForm.description}
                  onChange={(e) => setSiteForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Main office location"
                />
              </div>
              {createSite.error && (
                <p className="text-sm text-red-600">
                  {(createSite.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create site'}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSiteCreate(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createSite.mutate()}
                disabled={!siteForm.name || createSite.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {createSite.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
