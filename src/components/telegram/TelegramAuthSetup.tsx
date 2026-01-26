"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";

interface TelegramAuthSetupProps {
  onAuthSuccess: () => void;
}

type AuthStep = 'credentials' | 'verify' | 'success';

export function TelegramAuthSetup({ onAuthSuccess }: TelegramAuthSetupProps) {
  const [step, setStep] = useState<AuthStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setSessionId(data.session_id);
      setPhoneCodeHash(data.phone_code_hash);
      setStep('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-phone-code-hash': phoneCodeHash,
        },
        body: JSON.stringify({
          session_id: sessionId,
          phone_code: phoneCode,
          password: password || undefined,
          phone_code_hash: phoneCodeHash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setStep('success');
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <NeonCard className="max-w-2xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-[#00ff41] mb-4 font-mono flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Telegram Authentication
        </h2>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 rounded">
          <p className="text-blue-400 text-sm font-mono mb-2">
            📱 Telegram Authentication
          </p>
          <p className="text-blue-300 text-sm font-mono">
            Enter your Telegram phone number to receive a verification code. 
            API credentials are automatically loaded from your environment configuration.
          </p>
        </div>

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

        {/* Step 1: Phone Number */}
        {step === 'credentials' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSendCode}
            className="space-y-4"
          >
            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
              <p className="mt-2 text-xs text-gray-400 font-mono">
                Include country code (e.g., +39 for Italy, +1 for USA)
              </p>
            </div>

            <NeonButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </NeonButton>
          </motion.form>
        )}

        {/* Step 2: Verify */}
        {step === 'verify' && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerifyCode}
            className="space-y-4"
          >
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded">
              <p className="text-green-400 text-sm font-mono">
                Verification code sent to {phoneNumber}. Check your Telegram app.
              </p>
            </div>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="12345"
                required
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none text-center text-2xl tracking-widest"
              />
            </div>

            <div>
              <label className="block text-[#00ff41] text-sm font-mono mb-2">
                2FA Password (if enabled)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional"
                className="w-full bg-black/50 border border-[#00ff41]/30 rounded px-4 py-2 text-[#00ff41] font-mono focus:border-[#00ff41] focus:outline-none"
              />
            </div>

            <NeonButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify & Authenticate'}
            </NeonButton>
          </motion.form>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-500 font-mono mb-2">
              Authentication Successful!
            </h3>
            <p className="text-gray-400 font-mono">
              Redirecting to campaigns...
            </p>
          </motion.div>
        )}
      </div>
    </NeonCard>
  );
}
