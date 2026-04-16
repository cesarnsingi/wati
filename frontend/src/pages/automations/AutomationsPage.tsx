import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationsApi } from '../../lib/api';
import { Plus, Zap, Toggle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const TRIGGER_LABELS: Record<string, string> = {
  keyword:       '🔑 Keyword match',
  first_message: '👋 First message',
  opt_in:        '✅ Opt-in',
  no_reply:      '⏰ No reply',
};

const ACTION_TYPES = [
  { value: 'send_message',        label: 'Send message'        },
  { value: 'send_template',       label: 'Send template'       },
  { value: 'assign_agent',        label: 'Assign to agent'     },
  { value: 'add_tag',             label: 'Add tag'             },
  { value: 'resolve_conversation',label: 'Resolve conversation'},
];

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [form, setForm] = useState({
    name:          '',
    triggerType:   'keyword',
    triggerConfig: { keywords: [] as string[] },
    actions:       [{ type: 'send_message', content: '', delay_seconds: 0 }] as any[],
  });
  const [kwInput, setKwInput] = useState('');

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn:  () => automationsApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => automationsApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      setShowCreate(false);
      toast.success('Automation created');
    },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => automationsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => automationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automations'] }); toast.success('Deleted'); },
  });

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (!kw) return;
    setForm((f) => ({ ...f, triggerConfig: { keywords: [...(f.triggerConfig.keywords ?? []), kw] } }));
    setKwInput('');
  };

  const addAction = () => {
    setForm((f) => ({ ...f, actions: [...f.actions, { type: 'send_message', content: '', delay_seconds: 0 }] }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Automations</h1>
          <p className="text-sm text-gray-400">Auto-replies, keyword triggers and flows</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> New Automation
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900 space-y-4">
          <h2 className="text-sm font-semibold">New Automation</h2>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Welcome message"
              className="w-full max-w-sm bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Trigger</label>
            <select
              value={form.triggerType}
              onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
              className="bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Keywords */}
          {form.triggerType === 'keyword' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Keywords (triggers when message contains any)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.triggerConfig.keywords?.map((kw: string) => (
                  <span key={kw} className="flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                    {kw}
                    <button onClick={() => setForm((f) => ({ ...f, triggerConfig: { keywords: f.triggerConfig.keywords.filter((k: string) => k !== kw) } }))} className="text-gray-500 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }}
                  placeholder="e.g. oi, olá, hello"
                  className="bg-gray-800 text-sm text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button onClick={addKeyword} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded-xl">Add</button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Actions (executed in order)</label>
            <div className="space-y-2">
              {form.actions.map((action, i) => (
                <div key={i} className="flex gap-3 items-start bg-gray-800 rounded-xl p-3">
                  <span className="text-xs font-bold text-gray-500 mt-1 w-4">{i + 1}</span>
                  <select
                    value={action.type}
                    onChange={(e) => {
                      const acts = [...form.actions];
                      acts[i] = { ...acts[i], type: e.target.value };
                      setForm((f) => ({ ...f, actions: acts }));
                    }}
                    className="bg-gray-700 text-sm text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {action.type === 'send_message' && (
                    <textarea
                      value={action.content}
                      onChange={(e) => {
                        const acts = [...form.actions];
                        acts[i] = { ...acts[i], content: e.target.value };
                        setForm((f) => ({ ...f, actions: acts }));
                      }}
                      placeholder="Message content..."
                      rows={2}
                      className="flex-1 bg-gray-700 text-sm text-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none"
                    />
                  )}
                  {action.type === 'add_tag' && (
                    <input
                      value={action.tag ?? ''}
                      onChange={(e) => {
                        const acts = [...form.actions];
                        acts[i] = { ...acts[i], tag: e.target.value };
                        setForm((f) => ({ ...f, actions: acts }));
                      }}
                      placeholder="Tag name"
                      className="flex-1 bg-gray-700 text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
                    />
                  )}
                  <button onClick={() => setForm((f) => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))} className="text-gray-500 hover:text-red-400 mt-1">×</button>
                </div>
              ))}
            </div>
            <button onClick={addAction} className="mt-2 text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              <Plus size={12} /> Add action
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || create.isPending}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm px-5 py-2 rounded-xl"
            >
              {create.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto p-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />)}</div>
        ) : automations?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p>No automations yet. Create your first keyword trigger.</p>
          </div>
        ) : (
          automations?.map((a: any) => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="flex items-center gap-4 p-5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.isActive ? 'bg-green-500' : 'bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TRIGGER_LABELS[a.triggerType]}
                    {a.triggerConfig?.keywords?.length > 0 && `: ${a.triggerConfig.keywords.join(', ')}`}
                    {' · '}{a.actions?.length} action{a.actions?.length !== 1 ? 's' : ''}
                    {' · '}{a.runCount} runs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle.mutate(a.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      a.isActive ? 'bg-green-900/60 text-green-400 hover:bg-green-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {a.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="p-1.5 text-gray-500 hover:text-white">
                    {expanded === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => { if (confirm('Delete?')) del.mutate(a.id); }} className="p-1.5 text-gray-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === a.id && (
                <div className="px-5 pb-5 pt-0 border-t border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Actions</p>
                  <div className="space-y-2">
                    {a.actions?.map((action: any, i: number) => (
                      <div key={i} className="flex gap-3 bg-gray-800 rounded-xl px-4 py-2.5 text-sm">
                        <span className="text-gray-500 font-mono">{i + 1}.</span>
                        <span className="text-gray-400">{ACTION_TYPES.find((t) => t.value === action.type)?.label}</span>
                        {action.content && <span className="text-gray-300 truncate flex-1">"{action.content}"</span>}
                        {action.tag && <span className="text-gray-300">tag: {action.tag}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
