"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, X, Users, Zap, Shield, AlertCircle } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";

interface CampaignFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CampaignForm({ onSuccess, onCancel }: CampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTargets, setEstimatedTargets] = useState(0);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [rateLimitPreset, setRateLimitPreset] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  
  // Filters
  const [sourceGroups, setSourceGroups] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState<boolean | undefined>(undefined);
  const [isVerified, setIsVerified] = useState<boolean | undefined>(undefined);
  const [excludeSuspicious, setExcludeSuspicious] = useState(true);
  const [limit, setLimit] = useState<number | undefined>(undefined);

  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableGroups();
  }, []);

  useEffect(() => {
    // Debounce estimate calculation
    const timer = setTimeout(() => {
      estimateTargets();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceGroups, isPremium, isVerified, excludeSuspicious, limit]);

  async function loadAvailableGroups() {
    try {
      const response = await fetch('/api/scraper/data?scraperType=telegram&source=database&groupsOnly=true');
      const data = await response.json();
      
      if (data.success) {
        // Extract unique source identifiers
        const groups = data.data.items?.map((item: any) => item.source_identifier).filter(Boolean) || [];
        setAvailableGroups(groups as string[]);
        console.log('[CampaignForm] Loaded groups:', groups);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }

  async function estimateTargets() {
    try {
      const targetFilter = {
        source_identifiers: sourceGroups.length > 0 ? sourceGroups : undefined,
        is_premium: isPremium,
        is_verified: isVerified,
        exclude_suspicious: excludeSuspicious,
        limit,
      };

      // Calculate estimate locally or via API
      // For now, just show a placeholder
      setEstimatedTargets(Math.floor(Math.random() * 500) + 50);
    } catch (err) {
      console.error('Failed to estimate targets:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const targetFilter = {
        source_identifiers: sourceGroups.length > 0 ? sourceGroups : undefined,
        is_premium: isPremium,
        is_verified: isVerified,
        exclude_suspicious: excludeSuspicious,
        is_active: true,
        limit,
      };

      const response = await fetch('/api/telegram/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          message_template: messageTemplate,
          target_filter: targetFilter,
          rate_limit_preset: rateLimitPreset,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleGroup(group: string) {
    setSourceGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  }

  return (
    <NeonCard>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-[#00ff41] mb-6 font-mono">
          Create New Campaign
        </h2>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-sm font-mono">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Campaign Details
            </h3>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My First Campaign"
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Message Template *
              </label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                required
                rows={4}
                placeholder="Ciao {name}, come stai? ..."
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none resize-none"
              />
              <p className="text-gray-500 text-xs font-mono mt-1">
                Use variables: {'{name}'}, {'{first_name}'}, {'{username}'}
              </p>
            </div>
          </div>

          {/* Target Filters */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono flex items-center gap-2">
              <Users className="w-5 h-5" />
              Target Filters
            </h3>

            {availableGroups.length > 0 && (
              <div>
                <label className="block text-[#00ff41] text-sm font-mono mb-2">
                  Source Groups
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map(group => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className={`px-3 py-1 rounded text-sm font-mono border transition-colors ${
                        sourceGroups.includes(group)
                          ? 'bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41]'
                          : 'bg-black/30 border-gray-600 text-gray-400 hover:border-[#00ff41]/50'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#00ff41] text-sm font-mono mb-2">
                  Premium Only
                </label>
                <select
                  value={isPremium === undefined ? 'any' : isPremium.toString()}
                  onChange={(e) => setIsPremium(e.target.value === 'any' ? undefined : e.target.value === 'true')}
                  className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
                >
                  <option value="any">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-[#00ff41] text-sm font-mono mb-2">
                  Verified Only
                </label>
                <select
                  value={isVerified === undefined ? 'any' : isVerified.toString()}
                  onChange={(e) => setIsVerified(e.target.value === 'any' ? undefined : e.target.value === 'true')}
                  className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
                >
                  <option value="any">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[#00ff41] text-sm font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeSuspicious}
                  onChange={(e) => setExcludeSuspicious(e.target.checked)}
                  className="w-4 h-4"
                />
                Exclude suspicious accounts (scam/fake)
              </label>
            </div>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Max Targets (optional)
              </label>
              <input
                type="number"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="No limit"
                min="1"
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#00ff41] font-mono flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Rate Limiting
            </h3>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Preset
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['conservative', 'moderate', 'aggressive'] as const).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRateLimitPreset(preset)}
                    className={`p-3 rounded border font-mono text-sm transition-colors ${
                      rateLimitPreset === preset
                        ? 'bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41]'
                        : 'bg-black/30 border-gray-600 text-gray-400 hover:border-[#00ff41]/50'
                    }`}
                  >
                    <div className="font-bold mb-1 capitalize">{preset}</div>
                    <div className="text-xs">
                      {preset === 'conservative' && '20 msg/h'}
                      {preset === 'moderate' && '60 msg/h'}
                      {preset === 'aggressive' && '120 msg/h'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estimate */}
          <div className="p-4 bg-blue-500/10 border border-blue-500 rounded">
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono text-sm">
                Estimated Targets:
              </span>
              <span className="text-blue-300 font-mono font-bold text-lg">
                ~{estimatedTargets}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <NeonButton
              type="button"
              onClick={onCancel}
              variant="secondary"
              icon={<X className="w-4 h-4" />}
            >
              Cancel
            </NeonButton>
            <NeonButton
              type="submit"
              disabled={loading}
              icon={<Save className="w-4 h-4" />}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </NeonButton>
          </div>
        </form>
      </div>
    </NeonCard>
  );
}
