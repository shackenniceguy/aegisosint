import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { FileMetadata } from '../types';
import {
  FileSearch,
  UploadCloud,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Camera,
  FileText,
  Link2,
  Download,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export const MetadataForensicsView: React.FC = () => {
  const { activeWorkspace, addLog } = useWorkspace();
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);
  const [data, setData] = useState<FileMetadata | null>(null);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setLoading(true);
    addLog('Forensics', 'STARTED', `Analyzing metadata for artifact '${file.name}' (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const res = await apiService.analyzeMetadata(file, activeWorkspace?.id);
      setData(res);
      addLog('Forensics', 'SUCCESS', `Extracted metadata. Leaks: ${res.leak_warnings.length}, GPS: ${Boolean(res.gps_info)}`);
    } catch (err: any) {
      addLog('Forensics', 'ERROR', `Extraction error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSanitize = async () => {
    if (!selectedFile) return;
    setSanitizing(true);
    addLog('Forensics', 'STARTED', `Stripping metadata from '${selectedFile.name}'...`);

    try {
      const blob = await apiService.sanitizeFile(selectedFile);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sanitized_${selectedFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog('Forensics', 'SUCCESS', `Sanitized file downloaded successfully.`);
    } catch (err: any) {
      addLog('Forensics', 'ERROR', `Sanitize failed: ${err.message}`);
    } finally {
      setSanitizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Dropzone */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-cyber-textPrimary flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-cyber-accent" />
            {t('forensics.title')}
          </h2>
          <p className="text-xs text-cyber-textMuted mt-1">
            {t('forensics.subtitle')}
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-cyber-border hover:border-cyber-accent/60 rounded-2xl p-8 flex flex-col items-center justify-center bg-cyber-bg/40 cursor-pointer transition-colors"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <UploadCloud className="w-10 h-10 text-cyber-accent mb-3 animate-pulse" />
          <p className="text-sm font-semibold text-cyber-textPrimary mb-1">
            {t('forensics.dropzone')}
          </p>
          <p className="text-xs text-cyber-textMuted font-mono">
            {t('forensics.formats_supported')}
          </p>
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.tiff,.pdf,.docx,.doc"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-sm font-mono text-cyber-accent animate-pulse">
          {t('forensics.analyzing')}
        </div>
      )}

      {data && (
        <>
          {/* Action Bar & Warnings */}
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-base text-cyber-textPrimary">{data.filename}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyber-border rounded text-cyber-accent uppercase font-bold">
                  {data.file_type}
                </span>
                <span className="text-xs text-cyber-textMuted">
                  {(data.file_size_bytes / 1024).toFixed(1)} KB
                </span>
              </div>
              {data.has_sensitive_leaks && (
                <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  {t('forensics.leaks_detected')}
                </p>
              )}
            </div>

            <button
              onClick={handleSanitize}
              disabled={sanitizing}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              {sanitizing ? 'Sanitizing...' : t('forensics.sanitize_btn')}
            </button>
          </div>

          {/* Privacy Leak Alerts */}
          {data.leak_warnings.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-800/60 rounded-2xl p-4 shadow-lg space-y-2">
              <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Security & Privacy Alerts ({data.leak_warnings.length})
              </h4>
              <ul className="space-y-1 text-xs text-slate-300">
                {data.leak_warnings.map((w, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-rose-400">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GPS Coordinates & Map Pin */}
          {data.gps_info && (
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-cyber-textPrimary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  {t('forensics.gps_title')}
                </h3>
                <div className="flex gap-3">
                  <a
                    href={data.gps_info.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-cyber-bg border border-cyber-border rounded-lg text-xs font-semibold text-cyber-accent hover:border-cyber-accent flex items-center gap-1"
                  >
                    {t('forensics.view_gmaps')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={data.gps_info.osm_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-cyber-bg border border-cyber-border rounded-lg text-xs font-semibold text-cyber-accent hover:border-cyber-accent flex items-center gap-1"
                  >
                    {t('forensics.view_osm')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-cyber-textMuted uppercase block">Latitude</span>
                  <span className="font-bold text-slate-200 text-sm">{data.gps_info.latitude}°</span>
                </div>
                <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-cyber-textMuted uppercase block">Longitude</span>
                  <span className="font-bold text-slate-200 text-sm">{data.gps_info.longitude}°</span>
                </div>
                {data.gps_info.altitude && (
                  <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                    <span className="text-[10px] text-cyber-textMuted uppercase block">Altitude</span>
                    <span className="font-bold text-slate-200 text-sm">{data.gps_info.altitude} m</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXIF / Document Properties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(data.exif_data).length > 0 && (
              <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-cyber-textPrimary mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyber-accent" />
                  {t('forensics.exif_title')}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {Object.entries(data.exif_data).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center p-2 bg-cyber-bg/60 border border-cyber-border rounded-lg"
                    >
                      <span className="text-cyber-accent">{key}</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(data.document_properties).length > 0 && (
              <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-cyber-textPrimary mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyber-accent" />
                  {t('forensics.doc_title')}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                  {Object.entries(data.document_properties).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center p-2 bg-cyber-bg/60 border border-cyber-border rounded-lg"
                    >
                      <span className="text-cyber-accent">{key}</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Embedded URLs */}
          {data.embedded_urls.length > 0 && (
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-cyber-textPrimary mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyber-accent" />
                {t('forensics.urls_title')} ({data.embedded_urls.length})
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                {data.embedded_urls.map((url, idx) => (
                  <div key={idx} className="p-2 bg-cyber-bg/60 border border-cyber-border rounded-lg truncate">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyber-accent hover:underline flex items-center gap-1.5"
                    >
                      {url}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

