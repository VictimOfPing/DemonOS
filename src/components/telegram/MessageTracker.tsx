"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import type { TelegramCampaign, MessageWithResponse } from "@/lib/telegram/types";

interface MessageTrackerProps {
  campaign: TelegramCampaign;
  onBack: () => void;
}

export function MessageTracker({ campaign, onBack }: MessageTrackerProps) {
  const [messages, setMessages] = useState<MessageWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<MessageWithResponse | null>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000); // Refresh every 10s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id, statusFilter, responseFilter]);

  async function loadMessages() {
    try {
      let url = `/api/telegram/messages?campaign_id=${campaign.id}`;
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      if (responseFilter === 'with_response') {
        url += `&has_response=true`;
      } else if (responseFilter === 'no_response') {
        url += `&has_response=false`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      msg.recipient_username?.toLowerCase().includes(search) ||
      msg.recipient_name?.toLowerCase().includes(search) ||
      msg.recipient_telegram_id.includes(search)
    );
  });

  function getStatusBadge(status: string) {
    const config = {
      sent: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
      replied: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <MessageSquare className="w-3 h-3" /> },
    }[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: null };

    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${config.bg} ${config.text}`}>
        {config.icon}
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <NeonButton
          onClick={onBack}
          variant="secondary"
          icon={<ArrowLeft className="w-4 h-4" />}
          className="mb-4"
        >
          Back to Stats
        </NeonButton>
        <h2 className="text-2xl font-bold text-[#00ff41] font-mono mb-2">
          Message Tracker
        </h2>
        <p className="text-gray-400 font-mono text-sm">
          Campaign: {campaign.name}
        </p>
      </div>

      {/* Filters */}
      <NeonCard>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Username, name, or ID..."
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
            </div>

            <div className="min-w-[150px]">
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="replied">Replied</option>
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Response
              </label>
              <select
                value={responseFilter}
                onChange={(e) => setResponseFilter(e.target.value)}
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="with_response">With Response</option>
                <option value="no_response">No Response</option>
              </select>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Messages Table */}
      <NeonCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono">
              Messages ({filteredMessages.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 font-mono">
              Loading messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-mono">
              No messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#00ff41]/30">
                    <th className="text-left py-3 px-2 text-[#00ff41] font-mono text-sm">
                      Recipient
                    </th>
                    <th className="text-left py-3 px-2 text-[#00ff41] font-mono text-sm">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-[#00ff41] font-mono text-sm">
                      Sent At
                    </th>
                    <th className="text-left py-3 px-2 text-[#00ff41] font-mono text-sm">
                      Response
                    </th>
                    <th className="text-left py-3 px-2 text-[#00ff41] font-mono text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg, index) => (
                    <motion.tr
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-800 hover:bg-[#00ff41]/5"
                    >
                      <td className="py-3 px-2">
                        <div>
                          <div className="text-[#00ff41] font-mono text-sm">
                            {msg.recipient_username ? `@${msg.recipient_username}` : msg.recipient_name}
                          </div>
                          <div className="text-gray-500 font-mono text-xs">
                            {msg.recipient_telegram_id}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(msg.status)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-gray-400 font-mono text-sm">
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : '-'}
                        </div>
                        {msg.retry_count > 0 && (
                          <div className="text-yellow-500 font-mono text-xs">
                            Retries: {msg.retry_count}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {msg.has_response ? (
                          <div>
                            <CheckCircle className="w-4 h-4 text-blue-500 inline mr-1" />
                            <span className="text-blue-400 font-mono text-sm">
                              Yes
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 font-mono text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <NeonButton
                          onClick={() => setSelectedMessage(msg)}
                          size="sm"
                          variant="secondary"
                          icon={<Eye className="w-3 h-3" />}
                        >
                          View
                        </NeonButton>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </NeonCard>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMessage(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <NeonCard>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#00ff41] font-mono">
                    Message Details
                  </h3>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-gray-400 hover:text-[#00ff41]"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 font-mono text-sm">Recipient:</label>
                    <div className="text-[#00ff41] font-mono">
                      {selectedMessage.recipient_username ? `@${selectedMessage.recipient_username}` : selectedMessage.recipient_name}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 font-mono text-sm">Message:</label>
                    <div className="bg-black/30 p-3 rounded border border-[#00ff41]/30 mt-1">
                      <p className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                        {selectedMessage.message_text}
                      </p>
                    </div>
                  </div>

                  {selectedMessage.has_response && selectedMessage.response_text && (
                    <div>
                      <label className="text-blue-400 font-mono text-sm">Response:</label>
                      <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30 mt-1">
                        <p className="text-blue-300 font-mono text-sm whitespace-pre-wrap">
                          {selectedMessage.response_text}
                        </p>
                        {selectedMessage.response_received_at && (
                          <div className="text-blue-500 font-mono text-xs mt-2">
                            {new Date(selectedMessage.response_received_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedMessage.error_message && (
                    <div>
                      <label className="text-red-400 font-mono text-sm">Error:</label>
                      <div className="bg-red-500/10 p-3 rounded border border-red-500/30 mt-1">
                        <p className="text-red-300 font-mono text-sm">
                          {selectedMessage.error_message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </NeonCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
