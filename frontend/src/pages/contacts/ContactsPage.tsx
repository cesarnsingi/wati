import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi }   from '../../lib/api';
import { Search, Plus, Tag, Phone, Mail, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [tag, setTag]         = useState('');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, tag, page }],
    queryFn:  () => contactsApi.list({ search, tag, page, limit: 50 }).then((r) => r.data),
  });

  const { data: allTags } = useQuery({
    queryKey: ['contact-tags'],
    queryFn:  () => contactsApi.allTags().then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
  });

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Contacts</h1>
          <p className="text-sm text-gray-400">{data?.total ?? 0} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-800 flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, phone or email..."
            className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
          />
        </div>

        <select
          value={tag}
          onChange={(e) => { setTag(e.target.value); setPage(1); }}
          className="bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">All tags</option>
          {(allTags ?? []).map((t: string) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Phone</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Tags</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-gray-900 hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center text-xs font-semibold text-green-300 flex-shrink-0">
                        {c.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-medium text-white">{c.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {c.email ? <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 3).map((t: string) => (
                        <span key={t} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                          <Tag size={8} />{t}
                        </span>
                      ))}
                      {c.tags?.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{c.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === 'open' ? 'bg-green-900/60 text-green-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (confirm('Delete contact?')) del.mutate(c.id); }}
                      className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 50 && (
        <div className="px-6 py-3 border-t border-gray-800 flex justify-between items-center text-sm text-gray-400">
          <span>Page {page} of {Math.ceil(data.total / 50)}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= data.total} className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
