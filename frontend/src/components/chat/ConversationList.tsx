import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt }                  from 'date-fns/locale';
import clsx                    from 'clsx';

interface Conversation {
  id:             string;
  status:         string;
  unreadCount:    number;
  lastMessageAt:  string;
  windowExpiresAt: string;
  contact: {
    id:    string;
    name:  string;
    phone: string;
  };
  lastMessage?: {
    content:   string;
    direction: string;
    type:      string;
  };
}

interface Props {
  conversations: Conversation[];
  selectedId:    string | null;
  search:        string;
  isLoading:     boolean;
  onSelect:      (id: string) => void;
}

export function ConversationList({ conversations, selectedId, search, isLoading, onSelect }: Props) {
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contact.name?.toLowerCase().includes(q) ||
      c.contact.phone.includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-800 rounded w-2/3" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        No conversations found
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((conv) => {
        const isSelected = conv.id === selectedId;
        const windowOpen = conv.windowExpiresAt
          ? new Date() < new Date(conv.windowExpiresAt)
          : false;
        const initials = conv.contact.name
          ? conv.contact.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
          : conv.contact.phone.slice(-2);

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={clsx(
              'w-full flex items-start gap-3 px-4 py-3.5 border-b border-gray-800/50 transition-colors text-left',
              isSelected ? 'bg-gray-800' : 'hover:bg-gray-900',
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center text-sm font-semibold text-green-300">
                {initials}
              </div>
              {/* Window open indicator */}
              {windowOpen && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-sm font-semibold text-white truncate">
                  {conv.contact.name ?? conv.contact.phone}
                </span>
                <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                  {conv.lastMessageAt
                    ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: pt })
                    : ''}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {conv.lastMessage?.direction === 'outbound' && (
                  <span className="text-gray-500 text-xs">→</span>
                )}
                <span className="text-xs text-gray-400 truncate">
                  {conv.lastMessage?.type === 'template'
                    ? '📋 Template'
                    : conv.lastMessage?.content ?? 'No messages yet'}
                </span>
              </div>
            </div>

            {/* Unread badge */}
            {conv.unreadCount > 0 && (
              <span className="flex-shrink-0 bg-green-500 text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
