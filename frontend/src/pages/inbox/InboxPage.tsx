import React, { useState, useEffect } from 'react';
import { useParams }           from 'react-router-dom';
import { useQueryClient }      from '@tanstack/react-query';
import { ConversationList }    from '../../components/chat/ConversationList';
import { ChatWindow }          from '../../components/chat/ChatWindow';
import { ContactPanel }        from '../../components/chat/ContactPanel';
import { useConversations }    from '../../hooks/useConversations';
import { useMessages }         from '../../hooks/useMessages';
import { useSocket }           from '../../hooks/useSocket';

export default function InboxPage() {
  const { conversationId }              = useParams<{ conversationId?: string }>();
  const [selectedId, setSelectedId]     = useState<string | null>(conversationId ?? null);
  const [showContact, setShowContact]   = useState(false);
  const [search, setSearch]             = useState('');
  const qc                              = useQueryClient();

  const { conversations, isLoading, mutate } = useConversations();
  const { messages, sendText, sendTemplate } = useMessages(selectedId);
  const socket                               = useSocket();

  // Real-time inbound message → refresh conversations + current messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message.inbound', (data: any) => {
      mutate();
      if (data.conversation?.id === selectedId) {
        qc.invalidateQueries({ queryKey: ['messages', selectedId] });
      }
    });

    socket.on('message.status', (data: any) => {
      qc.invalidateQueries({ queryKey: ['messages', selectedId] });
    });

    return () => {
      socket.off('message.inbound');
      socket.off('message.status');
    };
  }, [socket, selectedId, mutate, qc]);

  const selectedConversation = conversations.find((c: any) => c.id === selectedId);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Left: conversation list ── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-base font-semibold text-white mb-3">Inbox</h1>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 text-sm text-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-500"
          />
        </div>

        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          search={search}
          isLoading={isLoading}
          onSelect={(id) => {
            setSelectedId(id);
            setShowContact(false);
            // Mark as read
            qc.invalidateQueries({ queryKey: ['conversations'] });
          }}
        />
      </div>

      {/* ── Centre: chat ── */}
      {selectedId ? (
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow
            conversationId={selectedId}
            conversation={selectedConversation}
            messages={messages}
            onSendText={sendText}
            onSendTemplate={sendTemplate}
            onOpenContact={() => setShowContact((v) => !v)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-30">💬</div>
            <p className="text-sm font-medium">Select a conversation</p>
          </div>
        </div>
      )}

      {/* ── Right: contact panel ── */}
      {showContact && selectedConversation && (
        <div className="w-72 flex-shrink-0 border-l border-gray-800">
          <ContactPanel
            contactId={selectedConversation.contact?.id ?? selectedConversation.contactId}
            onClose={() => setShowContact(false)}
          />
        </div>
      )}
    </div>
  );
}
