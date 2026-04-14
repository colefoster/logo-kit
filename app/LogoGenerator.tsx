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

const MAX_DROPDOWN_ITEMS = 50;

export default function LogoGenerator() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlobRef = useRef<string>('');

  // Icon picker state
  const [icons, setIcons] = useState<string[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsError, setIconsError] = useState('');
  const [iconQuery, setIconQuery] = useState(DEFAULT_CONFIG.icon);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch icon list once on mount
  useEffect(() => {
    fetch('/api/icons')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load icons');
        return res.json() as Promise<{ icons: string[] }>;
      })
      .then((data) => {
        setIcons(data.icons);
        setIconsLoading(false);
      })
      .catch(() => {
        setIconsError('Failed to load icon list');
        setIconsLoading(false);
      });
  }, []);

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

  function handleIconQueryChange(value: string) {
    setIconQuery(value);
    update('icon', value);
    setDropdownOpen(true);
  }

  function selectIcon(name: string) {
    setIconQuery(name);
    update('icon', name);
    setDropdownOpen(false);
  }

  const filteredIcons = icons.filter((icon) =>
    icon.includes(iconQuery.toLowerCase())
  );
  const displayedIcons = filteredIcons.slice(0, MAX_DROPDOWN_ITEMS);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(config)),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : 'logo-kit.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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

            {/* Icon picker (only when type is "icon") */}
            {config.type === 'icon' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={iconQuery}
                    onChange={(e) => handleIconQueryChange(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setDropdownOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setDropdownOpen(false);
                    }}
                    placeholder={iconsLoading ? 'Loading icons…' : 'Search icons…'}
                    disabled={iconsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {iconsError && (
                    <p className="text-xs text-red-500 mt-1">{iconsError}</p>
                  )}
                  {dropdownOpen && !iconsLoading && !iconsError && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                        {filteredIcons.length === 0
                          ? 'No matching icons'
                          : filteredIcons.length <= MAX_DROPDOWN_ITEMS
                          ? `${filteredIcons.length} icon${filteredIcons.length === 1 ? '' : 's'}`
                          : `${MAX_DROPDOWN_ITEMS} of ${filteredIcons.length} icons`}
                      </div>
                      <ul className="max-h-48 overflow-y-auto">
                        {displayedIcons.map((icon) => (
                          <li key={icon}>
                            <button
                              type="button"
                              // mousedown fires before blur, so we can select without closing dropdown first
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectIcon(icon);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
                                icon === config.icon ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                              }`}
                            >
                              {icon}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
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
            <button
              onClick={handleDownload}
              disabled={!previewUrl || !!error || downloading}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? 'Downloading…' : 'Download Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
