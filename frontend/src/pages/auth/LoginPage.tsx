// ── LoginPage.tsx ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { useAuthStore }     from '../../store/auth.store';
import toast                from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [bizName, setBizName]   = useState('');
  const [fullName, setFullName] = useState('');
  const login                   = useAuthStore((s) => s.login);
  const nav                     = useNavigate();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { authApi } = await import('../../lib/api');
        const { data } = await authApi.register({ businessName: bizName, email, password, fullName });
        localStorage.setItem('token', data.access_token);
        useAuthStore.setState({ user: data.user, token: data.access_token });
      } else {
        await login(email, password);
      }
      nav('/inbox');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">💬</div>
          <h1 className="text-2xl font-bold text-white">WA SaaS Angola</h1>
          <p className="text-gray-400 text-sm mt-1">WhatsApp Business Platform</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-6">
            {['Login', 'Register'].map((tab) => (
              <button
                key={tab}
                onClick={() => setIsRegister(tab === 'Register')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  (tab === 'Register') === isRegister
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Business Name</label>
                  <input value={bizName} onChange={(e) => setBizName(e.target.value)} required
                    className="w-full bg-gray-800 text-sm text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="My Company" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Your Name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                    className="w-full bg-gray-800 text-sm text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Carlos Silva" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-gray-800 text-sm text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-gray-800 text-sm text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
              {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
