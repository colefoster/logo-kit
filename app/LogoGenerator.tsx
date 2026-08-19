'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SIZE_PRESETS, DEFAULT_EXPORT_KEYS, PRESET_BY_KEY, MAX_FONT_SIZE, MAX_NAME_LENGTH } from '@/src/config';
import type { SizePreset } from '@/src/config';

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
  const fontSize = parseFloat(config.fontSize);
  if (!Number.isNaN(fontSize) && fontSize > 0) {
    payload['fontSize'] = fontSize;
  }
  return payload;
}

/**
 * `<input type="color">` only accepts a 7-character #rrggbb value; anything else
 * makes React warn and the swatch fall back to black. The text field is the
 * source of truth, so normalise what the swatch is shown.
 */
function toSwatchValue(color: string, fallback: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(color);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const withAlpha = /^#([0-9a-fA-F]{6})[0-9a-fA-F]{2}$/.exec(color);
  if (withAlpha) return `#${withAlpha[1]}`;
  return fallback;
}

async function errorMessageFrom(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

const DEFAULT_CONFIG: Config = {
  name: 'My Product',
  color: '#6366f1',
  type: 'icon',
  icon: 'star',
  fontSize: '',
};

const MAX_DROPDOWN_ITEMS = 50;

interface PresetGroup {
  label: string;
  keys: string[];
}

const PRESET_GROUPS: PresetGroup[] = [
  { label: 'Favicons',    keys: ['favicon-32', 'favicon-64', 'apple-touch-180', 'favicon-ico'] },
  { label: 'Social Media', keys: ['social-media-og'] },
  { label: 'App Icons',   keys: ['app-icon-512'] },
  { label: 'Logo Sizes',  keys: ['svg', 'logo-1x', 'logo-2x', 'logo-4x'] },
];

const DEFAULT_SELECTED_KEYS = new Set(DEFAULT_EXPORT_KEYS);

function presetLabel(preset: SizePreset): string {
  if (preset.format === 'svg') return `${preset.name} · SVG`;
  return `${preset.name} · ${preset.width}×${preset.height} · ${preset.format.toUpperCase()}`;
}

export default function LogoGenerator() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBlobRef = useRef<string>('');

  // Icon picker state
  const [icons, setIcons] = useState<string[]>([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsError, setIconsError] = useState('');
  const [iconQuery, setIconQuery] = useState(DEFAULT_CONFIG.icon);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Export format selection
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(DEFAULT_SELECTED_KEYS);
  const allKeys = SIZE_PRESETS.map((p) => p.key);
  const allSelected = allKeys.every((k) => selectedKeys.has(k));

  function togglePreset(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelectedKeys(allSelected ? new Set() : new Set(allKeys));
  }

  // Fetch icon list once on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/icons')
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorMessageFrom(res, 'Failed to load icons'));
        return res.json() as Promise<{ icons: string[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setIcons(data.icons);
        setIconsLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setIconsError(err.message || 'Failed to load icon list');
        setIconsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
        setError(await errorMessageFrom(res, 'Request failed'));
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

  const filteredIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return icons;
    // Names that start with the query are what the user almost certainly meant.
    const starts: string[] = [];
    const contains: string[] = [];
    for (const icon of icons) {
      if (icon.startsWith(query)) starts.push(icon);
      else if (icon.includes(query)) contains.push(icon);
    }
    return [...starts, ...contains];
  }, [icons, iconQuery]);

  const displayedIcons = useMemo(
    () => filteredIcons.slice(0, MAX_DROPDOWN_ITEMS),
    [filteredIcons],
  );

  function handleIconQueryChange(value: string) {
    setIconQuery(value);
    update('icon', value.trim().toLowerCase());
    setDropdownOpen(true);
    setActiveIndex(-1);
  }

  function selectIcon(name: string) {
    setIconQuery(name);
    update('icon', name);
    setDropdownOpen(false);
    setActiveIndex(-1);
  }

  function moveActive(delta: number) {
    if (displayedIcons.length === 0) return;
    setActiveIndex((prev) => {
      const next = Math.min(Math.max(prev + delta, 0), displayedIcons.length - 1);
      // Keep the highlighted option visible without scrolling the page.
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
      return next;
    });
  }

  function handleIconKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!dropdownOpen) setDropdownOpen(true);
        else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (dropdownOpen && activeIndex >= 0) selectIcon(displayedIcons[activeIndex]);
        else setDropdownOpen(false);
        break;
      case 'Escape':
        setDropdownOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setDropdownOpen(false);
        break;
    }
  }

  async function handleDownload() {
    if (selectedKeys.size === 0) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const payload = {
        ...buildPayload(config),
        exports: { presets: Array.from(selectedKeys) },
      };
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Previously this returned silently: a rate-limited or failed download
        // looked exactly like a successful one that produced no file.
        setDownloadError(await errorMessageFrom(res, `Download failed (${res.status})`));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      anchor.download = match ? match[1] : 'logo-kit.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoking in the same tick cancels the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError('Network error');
    } finally {
      setDownloading(false);
    }
  }

  const fileCount = selectedKeys.size;
  const downloadLabel = downloading
    ? 'Downloading…'
    : fileCount > 0
    ? `Download Kit (${fileCount} file${fileCount === 1 ? '' : 's'})`
    : 'Download Kit';

  const iconListboxId = 'icon-listbox';
  const activeOptionId = activeIndex >= 0 ? `icon-option-${activeIndex}` : undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
        <header className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Logo Kit</h1>
          <p className="text-sm text-gray-500 mt-1">Generate SVG logos and favicons from a config</p>
        </header>

        <div className="flex flex-col md:flex-row">
          {/* Form */}
          <div className="flex-1 px-8 py-6 space-y-5 border-r border-gray-100">
            {/* Name */}
            <div>
              <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                id="product-name"
                name="name"
                type="text"
                value={config.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="My Product"
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Color */}
            <div>
              <label htmlFor="product-color-hex" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="product-color-swatch"
                  type="color"
                  value={toSwatchValue(config.color, DEFAULT_CONFIG.color)}
                  onChange={(e) => update('color', e.target.value)}
                  aria-label="Pick color"
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  id="product-color-hex"
                  name="color"
                  type="text"
                  value={config.color}
                  onChange={(e) => update('color', e.target.value)}
                  placeholder="#6366f1"
                  spellCheck={false}
                  autoComplete="off"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="product-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="product-type"
                name="type"
                value={config.type}
                onChange={(e) => update('type', e.target.value as Config['type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="icon">Icon + Text</option>
                <option value="text-only">Text Only</option>
              </select>
            </div>

            {/* Icon picker (only when type is "icon") */}
            {config.type === 'icon' && (
              <div>
                <label htmlFor="product-icon" className="block text-sm font-medium text-gray-700 mb-1">
                  Icon Name
                </label>
                <div className="relative">
                  <input
                    id="product-icon"
                    name="icon"
                    type="text"
                    role="combobox"
                    aria-expanded={dropdownOpen}
                    aria-controls={iconListboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeOptionId}
                    aria-describedby={iconsError ? 'icon-error' : undefined}
                    value={iconQuery}
                    onChange={(e) => handleIconQueryChange(e.target.value)}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => setDropdownOpen(false)}
                    onKeyDown={handleIconKeyDown}
                    placeholder={iconsLoading ? 'Loading icons…' : 'Search icons…'}
                    disabled={iconsLoading}
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {iconsError && (
                    <p id="icon-error" role="alert" className="text-xs text-red-500 mt-1">
                      {iconsError}
                    </p>
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
                      <ul
                        id={iconListboxId}
                        role="listbox"
                        aria-label="Icons"
                        ref={listRef}
                        className="max-h-48 overflow-y-auto"
                      >
                        {displayedIcons.map((icon, index) => {
                          const selected = icon === config.icon;
                          const active = index === activeIndex;
                          return (
                            <li
                              key={icon}
                              id={`icon-option-${index}`}
                              role="option"
                              aria-selected={selected}
                              // mousedown fires before blur, so the option can be
                              // picked without the dropdown closing underneath it
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectIcon(icon);
                              }}
                              onMouseEnter={() => setActiveIndex(index)}
                              className={`cursor-pointer px-3 py-1.5 text-sm font-mono transition-colors ${
                                selected
                                  ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                  : active
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-gray-700'
                              }`}
                            >
                              {icon}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Font Size */}
            <div>
              <label htmlFor="product-font-size" className="block text-sm font-medium text-gray-700 mb-1">
                Font Size <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="product-font-size"
                name="fontSize"
                type="number"
                value={config.fontSize}
                onChange={(e) => update('fontSize', e.target.value)}
                placeholder="24"
                min={1}
                max={MAX_FONT_SIZE}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Export Formats */}
            <fieldset aria-labelledby="export-formats-label">
              <div className="flex items-center justify-between mb-2">
                <span id="export-formats-label" className="text-sm font-medium text-gray-700">
                  Export Formats
                </span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-3">
                {PRESET_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-1">
                      {group.keys.map((key) => {
                        const preset = PRESET_BY_KEY.get(key);
                        if (!preset) return null;
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-1.5 cursor-pointer min-w-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(key)}
                              onChange={() => togglePreset(key)}
                              className="shrink-0 rounded"
                              style={{ accentColor: config.color }}
                            />
                            <span className="text-xs text-gray-600 truncate" title={presetLabel(preset)}>
                              {presetLabel(preset)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Preview */}
          <div className="flex-1 px-8 py-6 flex flex-col items-center justify-center bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-medium text-gray-700">Preview</p>
              <span role="status" aria-live="polite" className="text-xs text-gray-400">
                {loading ? <span className="animate-pulse">Updating…</span> : null}
              </span>
            </div>
            <div className="w-48 h-48 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
              {/* Placeholder on the very first load, before any URL is set */}
              {!previewUrl && !error && <div className="text-gray-400 text-sm">Loading…</div>}
              {/* Keep the previous image visible while loading or on error */}
              {previewUrl && (
                /* Using <img> with a blob URL to sandbox SVG script execution */
                <img
                  src={previewUrl}
                  alt={`Preview of the ${config.name || 'untitled'} logo`}
                  className={`w-full h-full object-contain rounded-xl transition-opacity duration-150 ${loading ? 'opacity-50' : 'opacity-100'}`}
                />
              )}
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-500 mt-2 text-center max-w-[12rem]">
                {error}
              </p>
            )}
            {previewUrl && !error && <p className="text-xs text-gray-400 mt-3">128 × 128 px</p>}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!previewUrl || !!error || downloading || selectedKeys.size === 0}
              aria-busy={downloading}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {downloadLabel}
            </button>
            {selectedKeys.size === 0 && (
              <p className="text-xs text-gray-400 mt-2 text-center">Select at least one format</p>
            )}
            {downloadError && (
              <p role="alert" className="text-xs text-red-500 mt-2 text-center max-w-[14rem]">
                {downloadError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
