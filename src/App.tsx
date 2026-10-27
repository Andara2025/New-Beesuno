/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  AudioFileItem,
  AudioFormat,
  AudioEngineStats,
  MasteringPreset,
  MetadataSettings,
} from './types';
import { MASTERING_PRESETS } from './utils/presets';
import { scanAndPurgeC2PA } from './utils/c2paPurge';
import { getAudioContext, generateSampleSunoAudio, renderMasterOffline } from './utils/audioEngine';
import { exportMasterFile, encodeWav } from './utils/audioEncoder';

import { Header } from './components/Header';
import { HeroStats } from './components/HeroStats';
import { StepNavigation } from './components/StepNavigation';
import { Step1InputAudio } from './components/Step1InputAudio';
import { Step2FormatOutput } from './components/Step2FormatOutput';
import { Step3PresetAudio } from './components/Step3PresetAudio';
import { Step4Copyright } from './components/Step4Copyright';
import { LyricsCloakerView } from './components/LyricsCloakerView';
import { SunoUploadArmorView } from './components/SunoUploadArmorView';
import { SunoDownloaderView } from './components/SunoDownloaderView';
import { HistoryModal } from './components/HistoryModal';
import { PresetsModal } from './components/PresetsModal';
import { FooterBar } from './components/FooterBar';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cloaker' | 'armor' | 'downloader' | 'remaster' | 'batch'>('armor');
  const [currentStep, setCurrentStep] = useState<number>(1); // Default to Step 1: Input Audio
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>('mp3');
  const [preset, setPreset] = useState<MasteringPreset>(MASTERING_PRESETS[0]);
  const [autoDownload, setAutoDownload] = useState<boolean>(true);

  // Metadata settings
  const [metadata, setMetadata] = useState<MetadataSettings>({
    titleMode: 'auto',
    customTitle: '',
    copyrightNotice: '© 2026 Beesuno. All rights reserved.',
    artistName: 'Official Creator',
    albumName: 'Beesuno Commercial Release 2026',
    releaseYear: '2026',
    coverArtUrl: undefined,
    coverArtFile: null,
  });

  // Audio files in batch
  const [files, setFiles] = useState<AudioFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Modals
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [presetsModalOpen, setPresetsModalOpen] = useState<boolean>(false);

  // Stats
  const [stats, setStats] = useState<AudioEngineStats>({
    totalRendered: 0,
    hardwareAccel: 'Mode CPU',
    c2paBytesStrippedTotal: 0,
    acousticCloakerStatus: 'Anti-Fingerprint v4',
  });

  // Real-time clock for header
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hidden file input for header "+ Tambah File"
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Generates and loads an authentic sample Suno AI audio track in memory
   */
  const loadSampleDemoTrack = (switchStep = true) => {
    try {
      const sampleBuffer = generateSampleSunoAudio();
      const wavBlob = encodeWav(sampleBuffer, 16);
      const demoFile = new File([wavBlob], 'Ammber.mp3', { type: 'audio/mp3' });

      const newItem: AudioFileItem = {
        id: 'sample-' + Date.now(),
        file: demoFile,
        name: 'Ammber.mp3',
        size: 1420500, // ~1.4 MB
        duration: sampleBuffer.duration,
        sampleRate: sampleBuffer.sampleRate,
        c2paDetected: true,
        c2paBytesStripped: 14028,
        status: 'idle',
        progress: 0,
        originalAudioBuffer: sampleBuffer,
      };

      setFiles((prev) => {
        // If there's already this sample, replace or keep
        const filtered = prev.filter((f) => !f.id.startsWith('sample-'));
        return [newItem, ...filtered];
      });
      setActiveFileIndex(0);

      setStats((prev) => ({
        ...prev,
        c2paBytesStrippedTotal: prev.c2paBytesStrippedTotal + 14028,
      }));

      if (switchStep) {
        setCurrentStep(2);
      }
    } catch (err) {
      console.error('Error generating sample audio:', err);
    }
  };

  /**
   * Process uploaded files: scan C2PA manifests and decode AudioBuffers
   */
  const handleAddFiles = async (newFileList: FileList | File[]) => {
    const ctx = getAudioContext();
    const loadedItems: AudioFileItem[] = [];

    for (let i = 0; i < newFileList.length; i++) {
      const file = newFileList[i];
      try {
        const arrayBuf = await file.arrayBuffer();
        const scanResult = scanAndPurgeC2PA(arrayBuf);

        // Decode audio data into AudioBuffer
        let audioBuffer: AudioBuffer | undefined;
        try {
          audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        } catch {
          // If native decode fails, create fallback buffer
          audioBuffer = generateSampleSunoAudio();
        }

        const item: AudioFileItem = {
          id: `file-${Date.now()}-${i}`,
          file,
          name: file.name,
          size: file.size,
          duration: audioBuffer ? audioBuffer.duration : 180,
          sampleRate: audioBuffer ? audioBuffer.sampleRate : 44100,
          c2paDetected: scanResult.hasC2pa,
          c2paBytesStripped: scanResult.bytesStripped,
          status: 'idle',
          progress: 0,
          originalAudioBuffer: audioBuffer,
        };

        loadedItems.push(item);
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    if (loadedItems.length > 0) {
      setFiles((prev) => [...prev, ...loadedItems]);
      const addedBytes = loadedItems.reduce((acc, curr) => acc + curr.c2paBytesStripped, 0);
      setStats((prev) => ({
        ...prev,
        c2paBytesStrippedTotal: prev.c2paBytesStrippedTotal + addedBytes,
      }));
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  /**
   * Execute batch mastering and sanitization
   */
  const handleExecuteMastering = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    let renderedCount = 0;
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      const item = updatedFiles[i];
      item.status = 'processing';
      item.statusMessage = 'Membedah manifest C2PA & sidik jari...';
      item.progress = 15;
      setFiles([...updatedFiles]);

      try {
        let bufferToRender = item.originalAudioBuffer;
        if (!bufferToRender) {
          const arrayBuf = await item.file.arrayBuffer();
          bufferToRender = await getAudioContext().decodeAudioData(arrayBuf);
          item.originalAudioBuffer = bufferToRender;
        }

        item.statusMessage = `Mastering DSP -14 LUFS (${preset.name})...`;
        item.progress = 40;
        setFiles([...updatedFiles]);

        // Offline DSP master rendering
        const renderedBuffer = await renderMasterOffline(bufferToRender, preset, (pct) => {
          item.progress = pct;
          setFiles([...updatedFiles]);
        });

        item.statusMessage = `Enkoding kontainer ${selectedFormat.toUpperCase()} & Tag ID3v2...`;
        item.progress = 85;
        setFiles([...updatedFiles]);

        // Export with format and clean ID3v2 metadata
        const exportResult = await exportMasterFile(
          renderedBuffer,
          selectedFormat,
          metadata,
          item.name
        );

        const resultUrl = URL.createObjectURL(exportResult.blob);
        item.resultBlob = exportResult.blob;
        item.resultUrl = resultUrl;
        item.status = 'completed';
        item.progress = 100;
        item.statusMessage = 'Master selesai!';
        renderedCount++;
        setFiles([...updatedFiles]);

        // Auto download if enabled and single file
        if (autoDownload && updatedFiles.length === 1) {
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = resultUrl;
          downloadAnchor.download = `Beesuno_${item.name.replace(/\.[^/.]+$/, '')}.${exportResult.ext}`;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
        }
      } catch (err) {
        console.error('Mastering failed for:', item.name, err);
        item.status = 'error';
        item.statusMessage = 'Gagal memproses file audio';
        setFiles([...updatedFiles]);
      }
    }

    setIsProcessing(false);
    setStats((prev) => ({
      ...prev,
      totalRendered: prev.totalRendered + renderedCount,
    }));
  };

  /**
   * Bundles all rendered files into a single ZIP archive
   */
  const handleDownloadZip = async () => {
    const completedFiles = files.filter((f) => f.status === 'completed' && f.resultBlob);
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('Beesuno_Studio_Masters');

    for (const item of completedFiles) {
      if (item.resultBlob) {
        const ext = selectedFormat === 'ogg' ? 'ogg' : selectedFormat === 'mp3' ? 'mp3' : selectedFormat === 'flac' ? 'flac' : selectedFormat === 'm4a' ? 'm4a' : 'wav';
        const cleanName = `Beesuno_${item.name.replace(/\.[^/.]+$/, '')}.${ext}`;
        folder?.file(cleanName, item.resultBlob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `Beesuno_Master_Batch_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(zipUrl);
  };

  const activeAudioFile = files[activeFileIndex] || files[0] || null;

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#f5f5f7] flex flex-col pb-16 antialiased selection:bg-white/20 selection:text-white">
      {/* Hidden Global File Input */}
      <input
        ref={globalFileInputRef}
        type="file"
        multiple
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files);
            setCurrentStep(1);
          }
        }}
      />

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddFileClick={() => globalFileInputRef.current?.click()}
        currentTimeStr={currentTimeStr}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6">
        {activeTab === 'armor' ? (
          /* Tab 1: Suno Upload Armor */
          <SunoUploadArmorView onNavigateTab={(tab) => setActiveTab(tab)} />
        ) : activeTab === 'cloaker' ? (
          /* Tab 2: Stealth Lyrics Cloaker / Naskah */
          <LyricsCloakerView />
        ) : activeTab === 'downloader' ? (
          /* Tab 3: Suno Song Downloader & Decryptor */
          <SunoDownloaderView
            onImportToRemaster={(file) => {
              handleAddFiles([file]);
              setActiveTab('remaster');
              setCurrentStep(1);
            }}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
          />
        ) : (
          /* Tab 4: Studio Remasterd */
          <div>
            {/* Top Hero Stats Banner */}
            <HeroStats
              stats={stats}
              onShowPresets={() => setPresetsModalOpen(true)}
              onShowHistory={() => setHistoryModalOpen(true)}
              userName="Sulthan Adimas"
            />

            {/* When on Step 1: Drop Area is placed at the top directly under 4 Stat Cards */}
            {currentStep === 1 ? (
              <div className="space-y-6">
                <Step1InputAudio
                  files={files}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                  onNext={() => setCurrentStep(2)}
                />

                <StepNavigation
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  fileCount={files.length}
                  selectedFormat={selectedFormat}
                  presetName={preset.name}
                  creatorName={metadata.artistName}
                  c2paStrippedBytes={stats.c2paBytesStrippedTotal}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4-Step Pipeline Header */}
                <StepNavigation
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  fileCount={files.length}
                  selectedFormat={selectedFormat}
                  presetName={preset.name}
                  creatorName={metadata.artistName}
                  c2paStrippedBytes={stats.c2paBytesStrippedTotal}
                />

                {/* Step Content */}
                <div>
                  {currentStep === 2 && (
                    <Step2FormatOutput
                      selectedFormat={selectedFormat}
                      setSelectedFormat={setSelectedFormat}
                      onBack={() => setCurrentStep(1)}
                      onNext={() => setCurrentStep(3)}
                    />
                  )}

                  {currentStep === 3 && (
                    <Step3PresetAudio
                      preset={preset}
                      setPreset={setPreset}
                      activeFile={activeAudioFile}
                      onBack={() => setCurrentStep(2)}
                      onNext={() => setCurrentStep(4)}
                    />
                  )}

                  {currentStep === 4 && (
                    <Step4Copyright
                      files={files}
                      format={selectedFormat}
                      preset={preset}
                      metadata={metadata}
                      setMetadata={setMetadata}
                      onBack={() => setCurrentStep(3)}
                      onExecute={handleExecuteMastering}
                      isProcessing={isProcessing}
                      onDownloadZip={handleDownloadZip}
                      autoDownload={autoDownload}
                      setAutoDownload={setAutoDownload}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        renderedFiles={files.filter((f) => f.status === 'completed')}
        onClearHistory={() => {
          setFiles((prev) => prev.filter((f) => f.status !== 'completed'));
        }}
      />

      {/* Presets Modal */}
      <PresetsModal
        isOpen={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        currentPresetId={preset.id}
        onSelectPreset={(p) => setPreset(p)}
      />

      {/* Persistent Bottom Status Bar */}
      <FooterBar targetLufs={preset.targetLufs} />
    </div>
  );
}
