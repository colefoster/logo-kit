'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Config {
  name: string;
  color: string;
  type: 'icon' | 'text-only';
  icon: string;
  fontSize: string;
}

function buildPayload(config: Config): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: config.name,
    color: config.color,
    type: config.type,
  };
  if (config.type === 'icon' && config.icon) {
    payload['icon'] = config.icon;
  }
  const fs = parseFloat(config.fontSize);
  if (!isNaN(fs) && fs > 0) {
    payload['fontSize'] = fs;
  }
  return payload;
}

const DEFAULT_CONFIG: Config = {
  name: 'My Product',
  color: '#6366f1',
  type: 'icon',
  icon: 'star',
  fontSize: '',
};

export default function LogoGenerator() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlobRef = useRef<string>('');

  const fetchPreview = useCallback(async (cfg: Config) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(cfg)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setError(errData.error ?? 'Request failed');
        return;
      }
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = url;
      setPreviewUrl(url);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch immediately on mount, then debounce subsequent changes
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchPreview(config);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview(config);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config, fetchPreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, []);

  function update(field: keyof Config, value: string) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Logo Kit</h1>
          <p className="text-sm text-gray-500 mt-1">Generate SVG logos and favicons from a config</p>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Form */}
          <div className="flex-1 px-8 py-6 space-y-5 border-r border-gray-100">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="My Product"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.color}
                  onChange={(e) => update('color', e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={config.type}
                onChange={(e) => update('type', e.target.value as 'icon' | 'text-only')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="icon">Icon + Text</option>
                <option value="text-only">Text Only</option>
              </select>
            </div>

            {/* Icon (only when type is "icon") */}
            {config.type === 'icon' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon Name
                </label>
                <input
                  type="text"
                  value={config.icon}
                  onChange={(e) => update('icon', e.target.value)}
                  placeholder="star"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Lucide icon name (e.g. star, zap, heart, code)
                </p>
              </div>
            )}

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Size <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                value={config.fontSize}
                onChange={(e) => update('fontSize', e.target.value)}
                placeholder="24"
                min="1"
                max="96"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 px-8 py-6 flex flex-col items-center justify-center bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-medium text-gray-700">Preview</p>
              {loading && (
                <span className="text-xs text-gray-400 animate-pulse">Updating…</span>
              )}
            </div>
            <div className="w-48 h-48 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              {/* Show placeholder on very first load before any URL is set */}
              {!previewUrl && !error && (
                <div className="text-gray-400 text-sm">Loading…</div>
              )}
              {/* Keep previous image visible while loading or on error */}
              {previewUrl && (
                /* Using <img> with blob URL to sandbox SVG script execution */
                <img
                  src={previewUrl}
                  alt="Logo preview"
                  className={`w-full h-full object-contain rounded-xl transition-opacity duration-150 ${loading ? 'opacity-50' : 'opacity-100'}`}
                />
              )}
              {error && !previewUrl && (
                <div className="text-red-500 text-xs text-center px-2">{error}</div>
              )}
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-2 text-center max-w-[12rem]">{error}</p>
            )}
            {previewUrl && !error && (
              <p className="text-xs text-gray-400 mt-3">128 × 128 px</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
