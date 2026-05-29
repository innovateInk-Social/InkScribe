/**
 * Shared color palette — 10 colors each for text, highlight and block background.
 * Single source of truth used by FloatBar, ImageBar, and BlockHandle.
 */

export const TEXT_COLORS = [
  { label: 'Default',  value: null,        swatch: 'bg-gray-400' },
  { label: 'Red',      value: '#ef4444',   swatch: 'bg-red-500' },
  { label: 'Orange',   value: '#f97316',   swatch: 'bg-orange-500' },
  { label: 'Amber',    value: '#f59e0b',   swatch: 'bg-amber-400' },
  { label: 'Green',    value: '#22c55e',   swatch: 'bg-green-500' },
  { label: 'Blue',     value: '#3b82f6',   swatch: 'bg-blue-500' },
  { label: 'Indigo',   value: '#6366f1',   swatch: 'bg-indigo-500' },
  { label: 'Purple',   value: '#a855f7',   swatch: 'bg-purple-500' },
  { label: 'Pink',     value: '#ec4899',   swatch: 'bg-pink-500' },
  { label: 'Gray',     value: '#9ca3af',   swatch: 'bg-gray-400' },
];

export const HIGHLIGHT_COLORS = [
  { label: 'None',     value: null,              swatch: 'bg-transparent border border-gray-700' },
  { label: 'Red',      value: '#fecaca',         swatch: 'bg-red-200' },
  { label: 'Orange',   value: '#fed7aa',         swatch: 'bg-orange-200' },
  { label: 'Yellow',   value: '#fef08a',         swatch: 'bg-yellow-200' },
  { label: 'Green',    value: '#bbf7d0',         swatch: 'bg-green-200' },
  { label: 'Blue',     value: '#bfdbfe',         swatch: 'bg-blue-200' },
  { label: 'Indigo',   value: '#c7d2fe',         swatch: 'bg-indigo-200' },
  { label: 'Purple',   value: '#e9d5ff',         swatch: 'bg-purple-200' },
  { label: 'Pink',     value: '#fce7f3',         swatch: 'bg-pink-200' },
  { label: 'Gray',     value: '#e5e7eb',         swatch: 'bg-gray-200' },
];

export const BG_COLORS = [
  { label: 'None',     value: null,                          swatch: 'bg-transparent border border-gray-700' },
  { label: 'Red',      value: 'rgba(239,68,68,0.10)',        swatch: 'bg-red-500/20' },
  { label: 'Orange',   value: 'rgba(249,115,22,0.10)',       swatch: 'bg-orange-500/20' },
  { label: 'Amber',    value: 'rgba(245,158,11,0.10)',       swatch: 'bg-amber-400/20' },
  { label: 'Green',    value: 'rgba(34,197,94,0.10)',        swatch: 'bg-green-500/20' },
  { label: 'Blue',     value: 'rgba(59,130,246,0.10)',       swatch: 'bg-blue-500/20' },
  { label: 'Indigo',   value: 'rgba(99,102,241,0.10)',       swatch: 'bg-indigo-500/20' },
  { label: 'Purple',   value: 'rgba(168,85,247,0.10)',       swatch: 'bg-purple-500/20' },
  { label: 'Pink',     value: 'rgba(236,72,153,0.10)',       swatch: 'bg-pink-500/20' },
  { label: 'Dark',     value: 'rgba(0,0,0,0.40)',            swatch: 'bg-black/40' },
];
