"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Send,
  Clock,
  XCircle,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TelegramCampaign, CampaignStatsResponse } from "@/lib/telegram/types";

interface CampaignStatsProps {
  campaign: TelegramCampaign;
  onBack: () => void;
  onViewMessages: () => void;
}

export function CampaignStats({ campaign, onBack, onViewMessages }: CampaignStatsProps) {
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  async function loadStats() {
    try {
      const response = await fetch(`/api/telegram/campaigns/${campaign.id}/stats`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <NeonCard>
        <div className="p-12 text-center">
          <div className="text-[#00ff41] font-mono">Loading stats...</div>
        </div>
      </NeonCard>
    );
  }

  const progress = stats.campaign.total_targets > 0
    ? ((stats.campaign.messages_sent + stats.campaign.messages_failed) / stats.campaign.total_targets) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <NeonButton
            onClick={onBack}
            variant="secondary"
            icon={<ArrowLeft className="w-4 h-4" />}
            className="mb-4"
          >
            Back
          </NeonButton>
          <h2 className="text-2xl font-bold text-[#00ff41] font-mono">
            {stats.campaign.name}
          </h2>
          <p className="text-gray-400 font-mono text-sm">
            {stats.campaign.description}
          </p>
        </div>
        <NeonButton
          onClick={onViewMessages}
          icon={<Eye className="w-4 h-4" />}
        >
          View Messages
        </NeonButton>
      </div>

      {/* Progress */}
      {stats.campaign.status === 'active' && (
        <NeonCard>
          <div className="p-6">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono mb-4">
              Campaign Progress
            </h3>
            <ProgressBar
              value={progress}
              label={`${stats.campaign.messages_sent + stats.campaign.messages_failed} / ${stats.campaign.total_targets}`}
            />
          </div>
        </NeonCard>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NeonCard>
          <div className="p-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm font-mono mb-2">
              <Users className="w-4 h-4" />
              Total Targets
            </div>
            <div className="text-3xl font-bold text-[#00ff41] font-mono">
              {stats.stats.total_targets}
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="p-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm font-mono mb-2">
              <Send className="w-4 h-4" />
              Messages Sent
            </div>
            <div className="text-3xl font-bold text-green-500 font-mono">
              {stats.stats.messages_sent}
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="p-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm font-mono mb-2">
              <Clock className="w-4 h-4" />
              Pending
            </div>
            <div className="text-3xl font-bold text-yellow-500 font-mono">
              {stats.stats.messages_pending}
            </div>
          </div>
        </NeonCard>

        <NeonCard>
          <div className="p-6">
            <div className="flex items-center gap-2 text-gray-400 text-sm font-mono mb-2">
              <XCircle className="w-4 h-4" />
              Failed
            </div>
            <div className="text-3xl font-bold text-red-500 font-mono">
              {stats.stats.messages_failed}
            </div>
          </div>
        </NeonCard>
      </div>

      {/* Response Stats */}
      <NeonCard>
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#00ff41] font-mono mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Response Rate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-5xl font-bold text-blue-500 font-mono mb-2">
                {stats.stats.responses_received}
              </div>
              <div className="text-gray-400 font-mono text-sm">
                Total Responses
              </div>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-500 font-mono mb-2">
                {stats.stats.response_rate.toFixed(1)}%
              </div>
              <div className="text-gray-400 font-mono text-sm">
                Response Rate
              </div>
            </div>
          </div>
        </div>
      </NeonCard>

      {/* Errors */}
      {Object.keys(stats.stats.errors_by_type).length > 0 && (
        <NeonCard>
          <div className="p-6">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Errors by Type
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.stats.errors_by_type).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b border-gray-800"
                >
                  <span className="text-gray-400 font-mono text-sm">{type}</span>
                  <span className="text-red-400 font-mono font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </NeonCard>
      )}

      {/* Recent Messages */}
      {stats.recent_messages.length > 0 && (
        <NeonCard>
          <div className="p-6">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono mb-4">
              Recent Messages
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recent_messages.slice(0, 10).map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 text-sm font-mono"
                >
                  <div className="flex-1">
                    <span className="text-gray-400">
                      @{msg.recipient_username || msg.recipient_telegram_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        msg.status === 'sent'
                          ? 'bg-green-500/20 text-green-400'
                          : msg.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : msg.status === 'replied'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {msg.status}
                    </span>
                    {msg.sent_at && (
                      <span className="text-gray-500 text-xs">
                        {new Date(msg.sent_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NeonCard>
      )}

      {/* Recent Responses */}
      {stats.recent_responses.length > 0 && (
        <NeonCard>
          <div className="p-6">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Responses ({stats.recent_responses.length})
            </h3>
            <div className="space-y-4">
              {stats.recent_responses.slice(0, 5).map((response) => (
                <motion.div
                  key={response.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-black/30 border border-blue-500/30 rounded"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-blue-400 font-mono text-sm">
                      Response
                    </span>
                    <span className="text-gray-500 text-xs font-mono">
                      {new Date(response.received_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-300 font-mono text-sm">
                    {response.response_text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </NeonCard>
      )}
    </div>
  );
}
