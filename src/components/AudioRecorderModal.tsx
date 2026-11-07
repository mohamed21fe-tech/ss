import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, X, AlertCircle } from 'lucide-react';

interface AudioRecorderModalProps {
  pageIndex: number;
  coords: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onSaveAudio: (title: string, duration: number, blobUrl: string) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  pageIndex,
  coords,
  isOpen,
  onClose,
  onSaveAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(`Lecture Note - Page ${pageIndex + 1}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (isRecording) stopRecording();
      setDuration(0);
      setRecordedUrl(null);
      setIsPlaying(false);
      setMicError(null);
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setMicError('Microphone access was denied or not supported in this frame. You can create a simulated voice memo below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const createSimulatedAudio = () => {
    onSaveAudio(title || `Voice Memo Page ${pageIndex + 1}`, 15, '');
    onClose();
  };

  const handleSave = () => {
    if (recordedUrl) {
      onSaveAudio(title || `Voice Note Page ${pageIndex + 1}`, duration || 1, recordedUrl);
      onClose();
    } else {
      createSimulatedAudio();
    }
  };

  const togglePreviewPlay = () => {
    if (!recordedUrl) return;
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(recordedUrl);
      audioPreviewRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-lg">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Record Voice Memo</h3>
              <p className="text-xs text-stone-500">Attaches to Page {pageIndex + 1}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">Memo Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-stone-400 dark:focus:border-stone-500"
            placeholder="e.g., Professor comment on exam"
          />
        </div>

        {micError && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{micError}</span>
          </div>
        )}

        {/* Recorder Center */}
        <div className="flex flex-col items-center justify-center p-5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="text-2xl font-mono font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
            {Math.floor(duration / 60)
              .toString()
              .padStart(2, '0')}
            :{(duration % 60).toString().padStart(2, '0')}
          </div>

          {!recordedUrl ? (
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Recording</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePreviewPlay}
                className="flex items-center gap-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Preview'}</span>
              </button>
              <button
                onClick={() => {
                  setRecordedUrl(null);
                  setDuration(0);
                }}
                className="text-xs text-stone-500 hover:text-stone-700 underline"
              >
                Re-record
              </button>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!recordedUrl && !micError}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Attach Memo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
