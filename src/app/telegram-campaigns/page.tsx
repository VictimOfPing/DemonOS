"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Send,
  Pause,
  Play,
  Trash2,
  Eye,
  AlertCircle,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { NetworkBackground } from "@/components/background/NetworkBackground";
import { ModMenuSidebar } from "@/components/layout/ModMenuSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { HUDOverlay } from "@/components/layout/HUDOverlay";
import { NeonButton } from "@/components/ui/NeonButton";
import { TelegramAuthSetup } from "@/components/telegram/TelegramAuthSetup";
import { CampaignList } from "@/components/telegram/CampaignList";
import { CampaignForm } from "@/components/telegram/CampaignForm";
import { CampaignStats } from "@/components/telegram/CampaignStats";
import { MessageTracker } from "@/components/telegram/MessageTracker";
import type { TelegramCampaign } from "@/lib/telegram/types";

type ViewMode = 'list' | 'create' | 'stats' | 'messages' | 'auth';

export default function TelegramCampaignsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<TelegramCampaign | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/telegram/auth/status');
      const data = await response.json();
      setIsAuthenticated(data.connected);
      
      if (!data.connected) {
        setViewMode('auth');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setViewMode('auth');
    } finally {
      setLoading(false);
    }
  }

  function handleAuthSuccess() {
    setIsAuthenticated(true);
    setViewMode('list');
  }

  function handleCreateCampaign() {
    setSelectedCampaign(null);
    setViewMode('create');
  }

  function handleViewCampaign(campaign: TelegramCampaign) {
    setSelectedCampaign(campaign);
    setViewMode('stats');
  }

  function handleViewMessages(campaign: TelegramCampaign) {
    setSelectedCampaign(campaign);
    setViewMode('messages');
  }

  function handleCampaignCreated() {
    setViewMode('list');
  }

  function handleBackToList() {
    setViewMode('list');
    setSelectedCampaign(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
        <NetworkBackground />
        <div className="text-[#00ff41] font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <NetworkBackground />
      <ModMenuSidebar />
      <MobileSidebar />
      <HUDOverlay />

      <main className="ml-0 md:ml-64 min-h-screen p-4 md:p-8 pt-24 md:pt-28 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#00ff41] mb-2 font-mono">
              TELEGRAM CAMPAIGNS
            </h1>
            <p className="text-gray-400 font-mono text-sm">
              Automated messaging system with rate limiting
            </p>
          </motion.div>

          {/* Auth Warning */}
          {!isAuthenticated && viewMode !== 'auth' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-orange-500/10 border border-orange-500 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-orange-500 font-mono text-sm">
                Telegram not authenticated. 
                <button
                  onClick={() => setViewMode('auth')}
                  className="ml-2 underline hover:text-orange-400"
                >
                  Setup now
                </button>
              </span>
            </motion.div>
          )}

          {/* Action Bar */}
          {isAuthenticated && viewMode !== 'auth' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex flex-wrap gap-3"
            >
              <NeonButton
                onClick={handleBackToList}
                variant={viewMode === 'list' ? 'primary' : 'secondary'}
                icon={<MessageSquare className="w-4 h-4" />}
              >
                Campaigns
              </NeonButton>
              
              {viewMode === 'list' && (
                <NeonButton
                  onClick={handleCreateCampaign}
                  icon={<Plus className="w-4 h-4" />}
                >
                  New Campaign
                </NeonButton>
              )}

              <NeonButton
                onClick={() => setViewMode('auth')}
                variant="secondary"
              >
                Auth Settings
              </NeonButton>
            </motion.div>
          )}

          {/* Main Content */}
          <AnimatePresence mode="wait">
            {viewMode === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TelegramAuthSetup onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            )}

            {viewMode === 'list' && isAuthenticated && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CampaignList
                  onViewCampaign={handleViewCampaign}
                  onViewMessages={handleViewMessages}
                />
              </motion.div>
            )}

            {viewMode === 'create' && isAuthenticated && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CampaignForm
                  onSuccess={handleCampaignCreated}
                  onCancel={handleBackToList}
                />
              </motion.div>
            )}

            {viewMode === 'stats' && selectedCampaign && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CampaignStats
                  campaign={selectedCampaign}
                  onBack={handleBackToList}
                  onViewMessages={() => handleViewMessages(selectedCampaign)}
                />
              </motion.div>
            )}

            {viewMode === 'messages' && selectedCampaign && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MessageTracker
                  campaign={selectedCampaign}
                  onBack={handleBackToList}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
