import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '../../lib/api';
import { Plus, Play, Pause, Trash2, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-800 text-gray-400',
  scheduled: 'bg-blue-900/60 text-blue-400',
  running:   'bg-yellow-900/60 text-yellow-400',
  completed: 'bg-green-900/60 text-green-400',
  failed:    'bg-red-900/60 text-red-400',
  paused:    'bg-orange-900/60 text-orange-400',
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', templateName: '', templateLanguage: 'pt_BR',
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn:  () => campaignsApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => campaignsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreate(false);
      setForm({ name: '', templateName: '', templateLanguage: 'pt_BR' });
      toast.success('Campaign created');
    },
  });

  const launch = useMutation({
    mutationFn: (id: string) => campaignsApi.launch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign launched!'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Launch failed'),
  });

  const pause = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); },
  });

  const del = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Deleted'); },
  });

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Campaigns</h1>
          <p className="text-sm text-gray-400">Send bulk WhatsApp template messages</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
          <h2 className="text-sm font-semibold mb-4">New Campaign</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Campaign Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. June Promo"
                className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Template Name</label>
              <input
                value={form.templateName}
                onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
                placeholder="e.g. hello_world"
                className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Language</label>
              <select
                value={form.templateLanguage}
                onChange={(e) => setForm((f) => ({ ...f, templateLanguage: e.target.value }))}
                className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="pt_BR">Portuguese (BR)</option>
                <option value="en_US">English (US)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || !form.templateName || create.isPending}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-xl transition-colors"
            >
              {create.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No campaigns yet. Create your first broadcast.</p>
          </div>
        ) : (
          campaigns?.map((c: any) => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Template: <span className="text-gray-300">{c.templateName}</span>
                    {' · '}
                    {c.createdAt && format(new Date(c.createdAt), 'd MMM yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status === 'draft' && (
                    <button
                      onClick={() => launch.mutate(c.id)}
                      className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Play size={12} /> Launch
                    </button>
                  )}
                  {c.status === 'running' && (
                    <button
                      onClick={() => pause.mutate(c.id)}
                      className="flex items-center gap-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Pause size={12} /> Pause
                    </button>
                  )}
                  {['draft', 'paused', 'completed', 'failed'].includes(c.status) && (
                    <button
                      onClick={() => { if (confirm('Delete campaign?')) del.mutate(c.id); }}
                      className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Estimated', value: c.estimatedCount ?? '—', color: 'text-gray-300' },
                  { label: 'Sent',      value: c.sentCount,             color: 'text-blue-400'  },
                  { label: 'Delivered', value: c.deliveredCount,        color: 'text-green-400' },
                  { label: 'Read',      value: c.readCount,             color: 'text-green-300' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
