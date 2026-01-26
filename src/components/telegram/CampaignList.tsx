"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Eye,
  MessageSquare,
  Users,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TelegramCampaign } from "@/lib/telegram/types";

interface CampaignListProps {
  onViewCampaign: (campaign: TelegramCampaign) => void;
  onViewMessages: (campaign: TelegramCampaign) => void;
}

export function CampaignList({ onViewCampaign, onViewMessages }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<TelegramCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadCampaigns() {
    try {
      const response = await fetch('/api/telegram/campaigns');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaigns');
      }

      setCampaigns(data.campaigns);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartCampaign(campaign: TelegramCampaign) {
    if (!confirm(`Start campaign "${campaign.name}"?`)) return;

    try {
      const response = await fetch(`/api/telegram/campaigns/${campaign.id}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start campaign');
      }

      alert(`Campaign started! ${data.targets_loaded} messages queued.`);
      loadCampaigns();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handlePauseCampaign(campaign: TelegramCampaign) {
    try {
      const response = await fetch(`/api/telegram/campaigns/${campaign.id}/pause`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pause campaign');
      }

      loadCampaigns();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleResumeCampaign(campaign: TelegramCampaign) {
    try {
      const response = await fetch(`/api/telegram/campaigns/${campaign.id}/resume`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resume campaign');
      }

      loadCampaigns();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[#00ff41]" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'text-green-500 border-green-500';
      case 'paused':
        return 'text-yellow-500 border-yellow-500';
      case 'completed':
        return 'text-[#00ff41] border-[#00ff41]';
      case 'failed':
        return 'text-red-500 border-red-500';
      default:
        return 'text-gray-500 border-gray-500';
    }
  }

  function calculateProgress(campaign: TelegramCampaign): number {
    if (campaign.total_targets === 0) return 0;
    const processed = campaign.messages_sent + campaign.messages_failed;
    return (processed / campaign.total_targets) * 100;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-[#00ff41] font-mono">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <NeonCard>
        <div className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-mono">{error}</p>
        </div>
      </NeonCard>
    );
  }

  if (campaigns.length === 0) {
    return (
      <NeonCard>
        <div className="p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 font-mono mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-500 font-mono mb-6">
            Create your first campaign to start messaging leads
          </p>
        </div>
      </NeonCard>
    );
  }

  return (
    <div className="space-y-6">
      {campaigns.map((campaign, index) => (
        <motion.div
          key={campaign.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <NeonCard>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(campaign.status)}
                    <h3 className="text-xl font-bold text-[#00ff41] font-mono">
                      {campaign.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono border ${getStatusColor(campaign.status)}`}
                    >
                      {campaign.status.toUpperCase()}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-gray-400 text-sm font-mono">
                      {campaign.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {campaign.status === 'draft' && (
                    <NeonButton
                      onClick={() => handleStartCampaign(campaign)}
                      size="sm"
                      icon={<Play className="w-4 h-4" />}
                    >
                      Start
                    </NeonButton>
                  )}

                  {campaign.status === 'active' && (
                    <NeonButton
                      onClick={() => handlePauseCampaign(campaign)}
                      size="sm"
                      variant="secondary"
                      icon={<Pause className="w-4 h-4" />}
                    >
                      Pause
                    </NeonButton>
                  )}

                  {campaign.status === 'paused' && (
                    <NeonButton
                      onClick={() => handleResumeCampaign(campaign)}
                      size="sm"
                      icon={<Play className="w-4 h-4" />}
                    >
                      Resume
                    </NeonButton>
                  )}

                  <NeonButton
                    onClick={() => onViewCampaign(campaign)}
                    size="sm"
                    variant="secondary"
                    icon={<Eye className="w-4 h-4" />}
                  >
                    Stats
                  </NeonButton>

                  <NeonButton
                    onClick={() => onViewMessages(campaign)}
                    size="sm"
                    variant="secondary"
                    icon={<MessageSquare className="w-4 h-4" />}
                  >
                    Messages
                  </NeonButton>
                </div>
              </div>

              {/* Progress Bar */}
              {campaign.total_targets > 0 && (
                <div className="mb-4">
                  <ProgressBar
                    value={calculateProgress(campaign)}
                    label={`${campaign.messages_sent + campaign.messages_failed} / ${campaign.total_targets}`}
                  />
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-black/30 p-3 rounded border border-[#00ff41]/20">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono mb-1">
                    <Users className="w-3 h-3" />
                    Targets
                  </div>
                  <div className="text-[#00ff41] font-bold font-mono">
                    {campaign.total_targets}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded border border-green-500/20">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono mb-1">
                    <Send className="w-3 h-3" />
                    Sent
                  </div>
                  <div className="text-green-500 font-bold font-mono">
                    {campaign.messages_sent}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono mb-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </div>
                  <div className="text-yellow-500 font-bold font-mono">
                    {campaign.messages_pending}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded border border-red-500/20">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono mb-1">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </div>
                  <div className="text-red-500 font-bold font-mono">
                    {campaign.messages_failed}
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded border border-blue-500/20">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Replies
                  </div>
                  <div className="text-blue-500 font-bold font-mono">
                    {campaign.responses_received}
                  </div>
                </div>
              </div>

              {/* Rate Info */}
              {campaign.rate_limit_config && (
                <div className="mt-4 text-xs text-gray-500 font-mono">
                  Rate: {campaign.rate_limit_config.messages_per_hour} msg/hour
                </div>
              )}
            </div>
          </NeonCard>
        </motion.div>
      ))}
    </div>
  );
}
