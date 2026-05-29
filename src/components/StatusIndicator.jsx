import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * StatusIndicator Component.
 * Displays real-time autosave sync state and block ceiling stats in header.
 */
export default function StatusIndicator({ saveState, blockCount = 0 }) {
  // saveState: 'saved' | 'syncing' | 'offline'

  const stateConfig = {
    saved: {
      label: 'Draft Saved',
      colorClass: 'text-brand-success bg-brand-success/15 border-brand-success/20',
      dotClass: 'bg-brand-success',
      icon: <Cloud className="w-4 h-4 text-brand-success" />
    },
    syncing: {
      label: 'Saving Changes...',
      colorClass: 'text-brand-accent bg-brand-accent/15 border-brand-accent/20',
      dotClass: 'bg-brand-accent animate-pulse',
      icon: <RefreshCw className="w-4 h-4 text-brand-accent animate-spin" />
    },
    offline: {
      label: 'Offline Sandbox Mode',
      colorClass: 'text-brand-warning bg-brand-warning/15 border-brand-warning/20',
      dotClass: 'bg-brand-warning animate-pulse-subtle',
      icon: <CloudOff className="w-4 h-4 text-brand-warning" />
    }
  }[saveState] || {
    label: 'Offline Sandbox Mode',
    colorClass: 'text-brand-warning bg-brand-warning/15 border-brand-warning/20',
    dotClass: 'bg-brand-warning',
    icon: <CloudOff className="w-4 h-4 text-brand-warning" />
  };

  const isNearingLimit = blockCount >= 85;
  const isAtLimit = blockCount >= 99;

  let limitColor = 'text-gray-400 bg-gray-800/50 border-gray-700/30';
  if (isAtLimit) {
    limitColor = 'text-brand-danger bg-brand-danger/15 border-brand-danger/25 animate-pulse-subtle';
  } else if (isNearingLimit) {
    limitColor = 'text-brand-warning bg-brand-warning/15 border-brand-warning/25';
  }

  return (
    <div className="flex items-center space-x-3 select-none">
      {/* 99 Block Limit Counter */}
      <div className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-medium rounded-full border transition-all duration-300 ${limitColor}`}>
        {isAtLimit && <AlertTriangle className="w-3.5 h-3.5 text-brand-danger" />}
        <span>Blocks: {blockCount.toString().padStart(2, '0')} / 99</span>
      </div>

      {/* Syncing/Saved Indicator Banner */}
      <div className={`flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full border transition-all duration-300 ${stateConfig.colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${stateConfig.dotClass}`}></span>
        {stateConfig.icon}
        <span>{stateConfig.label}</span>
      </div>
    </div>
  );
}
