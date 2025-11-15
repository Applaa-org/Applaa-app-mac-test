/**
 * 🌟 INTELLIGENT PREVIEW PANEL
 * 
 * User-friendly, motivational preview interface for non-technical users
 * Shows progress, provides encouragement, and makes the preview experience delightful
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Smartphone, QrCode, Zap, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { IpcClient } from '../../ipc/ipc_client';

interface IntelligentPreviewState {
  appId: number;
  phase: 'waiting' | 'preparing' | 'warming' | 'ready' | 'error';
  progress: number;
  userMessage: string;
  motivationalMessage: string;
  qrCode?: string;
  port?: number;
  estimatedTimeRemaining?: number;
}

interface IntelligentPreviewPanelProps {
  appId: number;
  appName: string;
  isLLMGenerating: boolean;
  onPreviewReady?: (qrCode: string, port: number) => void;
}

export function IntelligentPreviewPanel({ 
  appId, 
  appName, 
  isLLMGenerating,
  onPreviewReady 
}: IntelligentPreviewPanelProps) {
  const [state, setState] = useState<IntelligentPreviewState | null>(null);
  const [, setShowQR] = useState(false);
  const [preparationStarted, setPreparationStarted] = useState(false);

  // Start preparation when LLM begins generating
  useEffect(() => {
    if (isLLMGenerating && !preparationStarted) {
      startPreparation();
      setPreparationStarted(true);
    }
  }, [isLLMGenerating, preparationStarted]);

  // Poll for state updates
  useEffect(() => {
    if (!state) return;

    const interval = setInterval(async () => {
      try {
        const ipcClient = IpcClient.getInstance();
        const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:get-state', { appId });
        
        if (result.success && result.state) {
          setState(result.state);
          
          // Notify when ready
          if (result.state.phase === 'ready' && result.state.qrCode && result.state.port) {
            onPreviewReady?.(result.state.qrCode, result.state.port);
          }
        }
      } catch (error) {
        console.error('Failed to get preview state:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, appId, onPreviewReady]);

  const startPreparation = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:start-preparation', {
        appId,
        isLLMGenerating: true
      });
      
      if (result.success) {
        setState(result.state);
      }
    } catch (error) {
      console.error('Failed to start preparation:', error);
    }
  };

  const handleLLMCompleted = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.ipcRenderer.invoke('intelligent-preview:llm-completed', { appId });
    } catch (error) {
      console.error('Failed to notify LLM completion:', error);
    }
  };

  const getPreviewNow = async () => {
    try {
      const ipcClient = IpcClient.getInstance();
      const result = await ipcClient.ipcRenderer.invoke('intelligent-preview:get-preview', { appId });
      
      if (result.success && result.ready) {
        setShowQR(true);
        onPreviewReady?.(result.qrCode, result.port);
      }
    } catch (error) {
      console.error('Failed to get preview:', error);
    }
  };

  // Notify when LLM completes (this would be called from the chat component)
  useEffect(() => {
    if (!isLLMGenerating && state?.phase === 'preparing') {
      handleLLMCompleted();
    }
  }, [isLLMGenerating, state?.phase]);

  if (!state) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Mobile Preview</h3>
        </div>
        <p className="text-gray-600">Preview will be available once your app is generated...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ rotate: state.phase === 'preparing' || state.phase === 'warming' ? 360 : 0 }}
          transition={{ duration: 2, repeat: state.phase === 'preparing' || state.phase === 'warming' ? Infinity : 0 }}
        >
          {state.phase === 'ready' ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : state.phase === 'error' ? (
            <AlertCircle className="w-6 h-6 text-red-600" />
          ) : (
            <Smartphone className="w-6 h-6 text-blue-600" />
          )}
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-800">
          {state.phase === 'ready' ? '🎉 Preview Ready!' : 'Mobile Preview'}
        </h3>
      </div>

      {/* Motivational Message */}
      <motion.div
        key={state.motivationalMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <p className="text-lg font-medium text-gray-800">{state.motivationalMessage}</p>
        </div>
        <p className="text-sm text-gray-600">{state.userMessage}</p>
      </motion.div>

      {/* Progress Bar */}
      {state.phase !== 'ready' && state.phase !== 'error' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {state.estimatedTimeRemaining && (
            <p className="text-xs text-gray-500 mt-1">
              Estimated time: {state.estimatedTimeRemaining} seconds
            </p>
          )}
        </div>
      )}

      {/* Phase-specific Content */}
      <AnimatePresence mode="wait">
        {state.phase === 'preparing' && (
          <motion.div
            key="preparing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4"
            >
              <Zap className="w-12 h-12 text-yellow-500 mx-auto" />
            </motion.div>
            <p className="text-gray-600">
              We're setting up your app in the background while the AI creates your code. 
              This means your preview will be ready instantly when the code is complete!
            </p>
          </motion.div>
        )}

        {state.phase === 'warming' && (
          <motion.div
            key="warming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto" />
            </motion.div>
            <p className="text-gray-600">
              Your code is ready! We're now warming up the preview environment. 
              This will only take a few more seconds...
            </p>
          </motion.div>
        )}

        {state.phase === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="mb-4"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
              <h4 className="font-semibold text-gray-800 mb-2">🎉 Your {appName} is Live!</h4>
              <p className="text-sm text-gray-600 mb-4">
                Scan the QR code with your phone's camera or the Expo Go app to see your creation!
              </p>
              
              {state.qrCode && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                    {/* QR Code would be generated here */}
                    <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>📱 Download Expo Go from your app store</p>
                <p>📸 Point your camera at the QR code</p>
                <p>🚀 Your app will open instantly!</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowQR(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg"
            >
              🎉 View Your Live App
            </motion.button>
          </motion.div>
        )}

        {state.phase === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Don't worry! Sometimes previews need a little extra help. 
              Let's try again - it usually works perfectly the second time!
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startPreparation}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              🔄 Try Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button for Non-Ready States */}
      {state.phase === 'waiting' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={getPreviewNow}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg"
        >
          🚀 Get Preview Now
        </motion.button>
      )}

      {/* Technical Details (Collapsible) */}
      <details className="mt-4">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
          Technical Details
        </summary>
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p>Phase: {state.phase}</p>
          <p>Progress: {state.progress}%</p>
          {state.port && <p>Port: {state.port}</p>}
          <p>Details: {state.userMessage}</p>
        </div>
      </details>
    </div>
  );
}
