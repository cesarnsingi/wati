import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessApi } from '../../lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: biz } = useQuery({ queryKey: ['business'], queryFn: () => businessApi.me().then((r) => r.data) });
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => businessApi.stats().then((r) => r.data) });

  const [form, setForm] = useState({ waPhoneNumberId: '', waAccessToken: '', waWebhookSecret: '' });
  const save = useMutation({
    mutationFn: () => businessApi.updateWhatsApp(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['business'] }); toast.success('WhatsApp settings saved'); },
  });

  const webhookUrl = biz ? `${window.location.origin.replace('3000', '4000')}/api/v1/webhooks/${biz.slug}` : '';

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-auto">
      <div className="px-6 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-gray-400">{biz?.name}</p>
      </div>

      <div className="p-6 max-w-2xl space-y-8">
        {/* Usage stats */}
        {stats && (
          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Usage this month</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Messages sent</span>
                <span className="text-white font-medium">{stats.messagesSentThisMonth} / {stats.monthlyMessageLimit}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (stats.messagesSentThisMonth / stats.monthlyMessageLimit) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp config */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-1">WhatsApp Cloud API</h2>
          <p className="text-xs text-gray-500 mb-4">
            Get these from <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-green-400 underline">Meta for Developers</a> → your app → WhatsApp → API Setup
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            {[
              { key: 'waPhoneNumberId', label: 'Phone Number ID', placeholder: '123456789' },
              { key: 'waAccessToken',   label: 'Access Token (Permanent)',  placeholder: 'EAAxxxxxxx' },
              { key: 'waWebhookSecret', label: 'App Secret (for signature)',placeholder: 'abc123' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  type={key === 'waAccessToken' ? 'password' : 'text'}
                  className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
                />
              </div>
            ))}
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              {save.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Webhook URL */}
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-1">Webhook URL</h2>
          <p className="text-xs text-gray-500 mb-3">
            Add this URL in Meta for Developers → WhatsApp → Configuration → Webhook
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
            <code className="flex-1 text-xs text-green-400 font-mono break-all">{webhookUrl}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
              className="text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Verify token: <code className="text-green-400">{biz?.waVerifyToken}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
