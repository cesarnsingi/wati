import React from 'react';
import { NavLink }      from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { MessageSquare, Users, Megaphone, Zap, Settings, LogOut } from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/inbox',       icon: MessageSquare, label: 'Inbox'       },
  { to: '/contacts',    icon: Users,         label: 'Contacts'    },
  { to: '/campaigns',   icon: Megaphone,     label: 'Campaigns'   },
  { to: '/automations', icon: Zap,           label: 'Automations' },
  { to: '/settings',    icon: Settings,      label: 'Settings'    },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-16 flex flex-col items-center bg-gray-900 border-r border-gray-800 py-4 gap-1 flex-shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 bg-green-700 rounded-xl flex items-center justify-center text-lg mb-4">💬</div>

      {/* Nav items */}
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              isActive ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-800 hover:text-white',
            )
          }
        >
          <Icon size={18} />
        </NavLink>
      ))}

      <div className="flex-1" />

      {/* Avatar + logout */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white" title={user?.fullName}>
          {user?.fullName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <button onClick={logout} title="Logout" className="w-10 h-10 rounded-xl text-gray-500 hover:bg-gray-800 hover:text-red-400 flex items-center justify-center transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
