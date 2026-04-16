import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore }    from './store/auth.store';
import { Sidebar }         from './components/ui/Sidebar';
import LoginPage           from './pages/auth/LoginPage';
import InboxPage           from './pages/inbox/InboxPage';
import ContactsPage        from './pages/contacts/ContactsPage';
import CampaignsPage       from './pages/campaigns/CampaignsPage';
import AutomationsPage     from './pages/automations/AutomationsPage';
import SettingsPage        from './pages/settings/SettingsPage';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected() {
  const isAuth = useAuthStore((s) => s.isAuth());
  if (!isAuth) return <Navigate to="/login" replace />;
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Protected />}>
            <Route path="/"            element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox"       element={<InboxPage />} />
            <Route path="/inbox/:conversationId" element={<InboxPage />} />
            <Route path="/contacts"    element={<ContactsPage />} />
            <Route path="/campaigns"   element={<CampaignsPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/settings"    element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        }}
      />
    </QueryClientProvider>
  );
}
