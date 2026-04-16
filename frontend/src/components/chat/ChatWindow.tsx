import React, { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday }        from 'date-fns';
import { pt }                                  from 'date-fns/locale';

interface Message {
  id:          string;
  direction:   'inbound' | 'outbound';
  senderType:  'contact' | 'agent' | 'bot' | 'system';
  type:        string;
  content:     string | null;
  status:      'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt:   string;
  waTimestamp: string | null;
}

interface Props {
  conversationId: string;
  conversation:   any;
  messages:       Message[];
  onSendText:     (text: string, replyToId?: string) => Promise<void>;
  onSendTemplate: (templateName: string, lang: string, components?: any[]) => Promise<void>;
  onOpenContact:  () => void;
}

export function ChatWindow({
  conversation, messages, onSendText, onOpenContact,
}: Props) {
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [replyTo, setReplyTo]     = useState<Message | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    setReplyTo(null);
    try {
      await onSendText(trimmed, replyTo?.id);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const windowOpen = conversation?.windowExpiresAt
    ? new Date() < new Date(conversation.windowExpiresAt)
    : false;

  return (
    <div className="flex flex-col h-full">

      {/* ── Chat header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-950">
        <button onClick={onOpenContact} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center text-lg font-semibold text-green-300">
            {conversation?.contact?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white leading-tight">
              {conversation?.contact?.name ?? conversation?.contact?.phone}
            </p>
            <p className="text-xs text-gray-400">{conversation?.contact?.phone}</p>
          </div>
        </button>

        {/* Window indicator */}
        <div className="flex items-center gap-2">
          {windowOpen ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Window open
            </span>
          ) : (
            <span className="text-xs text-yellow-500">Template only</span>
          )}

          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-900">
        {messages.map((msg, i) => {
          const prev   = messages[i - 1];
          const showDate = !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));
          const isOut  = msg.direction === 'outbound';
          const isBot  = msg.senderType === 'bot';

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                    {formatDate(new Date(msg.createdAt))}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOutbound={isOut}
                isBot={isBot}
                onReply={() => setReplyTo(msg)}
              />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Reply indicator ── */}
      {replyTo && (
        <div className="flex items-center gap-3 px-5 py-2 bg-gray-800 border-t border-gray-700">
          <div className="w-1 h-full bg-green-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-400 font-medium">Replying to</p>
            <p className="text-xs text-gray-300 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
        {!windowOpen && (
          <p className="text-xs text-yellow-500 text-center mb-2">
            24h window expired — use a template message to restart the conversation
          </p>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-gray-800 rounded-2xl px-4 py-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={windowOpen ? 'Type a message...' : 'Window closed — use templates'}
              disabled={!windowOpen || sending}
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-32 disabled:opacity-50"
              style={{ minHeight: 24 }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || !windowOpen || sending}
            className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ message, isOutbound, isBot, onReply }: {
  message:    Message;
  isOutbound: boolean;
  isBot:      boolean;
  onReply:    () => void;
}) {
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[70%] relative ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
        {isBot && (
          <span className="text-[10px] text-purple-400 mb-0.5 ml-1">🤖 Bot</span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOutbound
              ? 'bg-green-700 text-white rounded-br-sm'
              : 'bg-gray-800 text-gray-100 rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>

        {/* Time + status */}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isOutbound ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>

        {/* Reply button (hover) */}
        <button
          onClick={onReply}
          className="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white text-xs px-1.5 py-0.5 bg-gray-800 rounded-lg"
          style={isOutbound ? { right: '100%', marginRight: 4 } : { left: '100%', marginLeft: 4 }}
        >
          ↩
        </button>
      </div>
    </div>
  );
}

// ── StatusIcon ────────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: string }) {
  if (status === 'pending')   return <span className="text-[10px] text-gray-500">○</span>;
  if (status === 'sent')      return <span className="text-[10px] text-gray-400">✓</span>;
  if (status === 'delivered') return <span className="text-[10px] text-gray-400">✓✓</span>;
  if (status === 'read')      return <span className="text-[10px] text-blue-400">✓✓</span>;
  if (status === 'failed')    return <span className="text-[10px] text-red-400">✗</span>;
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatDate(date: Date) {
  if (isToday(date))     return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'd MMM yyyy', { locale: pt });
}
