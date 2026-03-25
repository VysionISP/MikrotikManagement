import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Trash2, ChevronRight } from 'lucide-react';
import { orgsApi } from '../../api/organizations';
import { useAuth } from '../../contexts/AuthContext';

export function Organizations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '' });

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: orgsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () => orgsApi.create(form.name, form.slug),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['organizations'] });
      setShowCreate(false);
      setForm({ name: '', slug: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orgsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage your tenants and their members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Organization
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Create Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value, slug: autoSlug(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="acme-corp"
                />
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
              {createMutation.error && (
                <p className="text-sm text-red-600">
                  {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create'}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.slug || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No organizations yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first organization to start managing Mikrotik devices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => {
            const myRole = org.members?.find((m) => m.userId === user?.id)?.role;
            return (
              <div
                key={org.id}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors"
              >
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {myRole}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    /{org.slug} · {org._count?.sites ?? 0} sites · {org._count?.members ?? 0} members
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {myRole === 'ADMIN' && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this organization?')) deleteMutation.mutate(org.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <Link
                    to={`/organizations/${org.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-sm transition-colors"
                  >
                    Manage
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
