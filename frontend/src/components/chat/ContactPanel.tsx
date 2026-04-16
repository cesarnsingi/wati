import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '../../lib/api';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export function ContactPanel({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn:  () => contactsApi.findOne(contactId).then((r) => r.data),
  });

  const addTag = useMutation({
    mutationFn: (tag: string) => contactsApi.addTag(contactId, tag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      setNewTag('');
    },
  });

  const removeTag = useMutation({
    mutationFn: (tag: string) => contactsApi.removeTag(contactId, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact', contactId] }),
  });

  const update = useMutation({
    mutationFn: (data: any) => contactsApi.update(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      toast.success('Contact updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 animate-pulse space-y-4">
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white">Contact Info</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Avatar + name */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-900 flex items-center justify-center text-2xl font-bold text-green-300 mx-auto mb-3">
            {contact.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="text-white font-semibold">{contact.name ?? 'Unknown'}</p>
          <p className="text-gray-400 text-sm">{contact.phone}</p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <Field label="Name">
            <EditableField
              value={contact.name ?? ''}
              onSave={(v) => update.mutate({ name: v })}
            />
          </Field>
          <Field label="Email">
            <EditableField
              value={contact.email ?? ''}
              onSave={(v) => update.mutate({ email: v })}
              placeholder="Add email..."
            />
          </Field>
          <Field label="Phone">
            <span className="text-sm text-gray-300">{contact.phone}</span>
          </Field>
          <Field label="Status">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              contact.status === 'open' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'
            }`}>
              {contact.status}
            </span>
          </Field>
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {contact.tags?.map((tag: string) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full"
              >
                {tag}
                <button
                  onClick={() => removeTag.mutate(tag)}
                  className="text-gray-500 hover:text-red-400 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newTag.trim()) addTag.mutate(newTag.trim()); }}
              placeholder="Add tag..."
              className="flex-1 bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
            />
            <button
              onClick={() => newTag.trim() && addTag.mutate(newTag.trim())}
              className="p-2 bg-green-700 hover:bg-green-600 rounded-lg transition-colors"
            >
              <Plus size={14} className="text-white" />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
          <textarea
            defaultValue={contact.notes ?? ''}
            onBlur={(e) => update.mutate({ notes: e.target.value })}
            rows={4}
            placeholder="Add notes..."
            className="w-full bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

function EditableField({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onSave(val); setEditing(false); } }}
        className="w-full bg-gray-800 text-sm text-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm text-gray-300 hover:text-white text-left w-full truncate"
    >
      {value || <span className="text-gray-600">{placeholder ?? 'Click to edit...'}</span>}
    </button>
  );
}
