import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';
import { VoiceOption } from '../types';
import { Spinner } from './Spinner';
import { IconVolumeUp, IconVolumeOff, IconPlay, IconStop } from './Icons';

let audioContext: AudioContext | null = null;

type PreviewState = {
    voice: VoiceOption | null;
    status: 'idle' | 'loading' | 'playing';
}

export const SpeechGenerator: React.FC = () => {
  const [text, setText] = useState<string>('Привет! Я — голос искусственного интеллекта, созданный с помощью Gemini. Вы можете сгенерировать речь из любого предоставленного вами текста.');
  const [voice, setVoice] = useState<VoiceOption>(VoiceOption.Female);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAudioAvailable, setIsAudioAvailable] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({ voice: null, status: 'idle' });

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const previewAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef(0);
  
  const getAudioContext = useCallback(() => {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContext;
  }, []);

  const updateProgress = useCallback(() => {
    const context = getAudioContext();
    if (!context || !audioBufferRef.current || playbackStartTimeRef.current === 0 || !audioSourceRef.current) {
        return;
    }
    const elapsedTime = context.currentTime - playbackStartTimeRef.current;
    const duration = audioBufferRef.current.duration;
    const newProgress = Math.min((elapsedTime / duration) * 100, 100);
    setProgress(newProgress);

    if (newProgress < 100) {
        animationFrameIdRef.current = requestAnimationFrame(updateProgress);
    }
  }, [getAudioContext]);

  const stopPlayback = useCallback(() => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const stopPreview = useCallback(() => {
    if (previewAudioSourceRef.current) {
        previewAudioSourceRef.current.stop();
        previewAudioSourceRef.current.disconnect();
        previewAudioSourceRef.current = null;
    }
    setPreviewState({ voice: null, status: 'idle' });
  }, []);

  const playAudio = async (base64Audio: string) => {
    stopPlayback();
    setProgress(0);
    
    const context = getAudioContext();
    
    try {
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, context, 24000, 1);
        audioBufferRef.current = audioBuffer;
        setIsAudioAvailable(true);
        
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        
        playbackStartTimeRef.current = context.currentTime;
        source.start();
        setIsPlaying(true);

        animationFrameIdRef.current = requestAnimationFrame(updateProgress);

        source.onended = () => {
          setIsPlaying(false);
          audioSourceRef.current = null;
          if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current);
          }
          if (context && audioBufferRef.current) {
            const elapsedTime = context.currentTime - playbackStartTimeRef.current;
            if (elapsedTime >= audioBufferRef.current.duration - 0.1) {
               setProgress(100);
            }
          }
        };
        audioSourceRef.current = source;

    } catch (err) {
        console.error("Failed to play audio:", err);
        setError("Не удалось воспроизвести сгенерированное аудио.");
        setIsAudioAvailable(false);
    }
  };

  const handlePreviewVoice = async (previewVoice: VoiceOption) => {
      if (previewState.status === 'loading') return;
      if (previewState.status === 'playing' && previewState.voice === previewVoice) {
          stopPreview();
          return;
      }

      stopPreview();
      stopPlayback();
      
      setPreviewState({ voice: previewVoice, status: 'loading' });
      setError(null);
      
      try {
          const previewText = "Это предварительный просмотр голоса.";
          const audioData = await generateSpeech(previewText, previewVoice);
          const context = getAudioContext();
          const decodedBytes = decode(audioData);
          const audioBuffer = await decodeAudioData(decodedBytes, context, 24000, 1);
          
          const source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(context.destination);
          source.start();
          
          setPreviewState({ voice: previewVoice, status: 'playing' });
          
          source.onended = () => {
              setPreviewState({ voice: null, status: 'idle' });
              previewAudioSourceRef.current = null;
          };
          previewAudioSourceRef.current = source;

      } catch (err) {
          setError('Не удалось загрузить предпрослушивание.');
          setPreviewState({ voice: null, status: 'idle' });
      }
  };

  const handleGenerate = async () => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    stopPlayback();
    stopPreview();
    setProgress(0);
    setIsAudioAvailable(false);
    audioBufferRef.current = null;

    try {
      const audioData = await generateSpeech(text, voice);
      await playAudio(audioData);
    } catch (err: any) {
      setError('Не удалось сгенерировать речь. Пожалуйста, проверьте консоль для получения подробной информации.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopPlayback();
      stopPreview();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().then(() => audioContext = null);
      }
    };
  }, [stopPlayback, stopPreview]);
  
  const VoiceSelector = ({ selectedVoice, onChange, disabled, onPreview, previewState }: { selectedVoice: VoiceOption; onChange: (voice: VoiceOption) => void; disabled: boolean; onPreview: (voice: VoiceOption) => void; previewState: PreviewState; }) => (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(VoiceOption) as Array<keyof typeof VoiceOption>).map((key) => {
        const value = VoiceOption[key];
        const label = key === 'Male' ? 'Мужской' : 'Женский';
        const isSelected = selectedVoice === value;
        const isPreviewing = previewState.voice === value;

        return (
          <div
            key={value}
            onClick={() => !disabled && onChange(value)}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 ${
              isSelected ? 'bg-cyan-500/20 ring-2 ring-cyan-500' : 'bg-slate-800 hover:bg-slate-700/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`font-medium ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>{label}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(value); }}
              disabled={disabled || (previewState.status === 'loading' && !isPreviewing)}
              className="p-2 rounded-full hover:bg-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-wait"
              aria-label={`Предпрослушать ${label} голос`}
            >
                {isPreviewing && previewState.status === 'loading' ? <Spinner /> : 
                 isPreviewing && previewState.status === 'playing' ? <IconStop /> : 
                 <IconPlay />}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 p-4 rounded-lg shadow-lg">
        <label htmlFor="tts-text" className="block text-sm font-medium text-slate-300 mb-2">
          Введите текст для синтеза
        </label>
        <textarea
          id="tts-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например, В лесу родилась ёлочка, в лесу она росла."
          className="w-full h-36 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all duration-200"
          disabled={isLoading}
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Выберите голос
          </label>
          <VoiceSelector selectedVoice={voice} onChange={setVoice} disabled={isLoading} onPreview={handlePreviewVoice} previewState={previewState} />
        </div>
        
        {isAudioAvailable && (
          <div className="mt-6">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-sky-500 to-cyan-400 h-2 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="sticky bottom-4 z-0">
        <button
          onClick={isLoading ? undefined : (isPlaying ? stopPlayback : handleGenerate)}
          disabled={isLoading || !text.trim()}
          className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-400 disabled:shadow-none ${
            isPlaying ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 hover:shadow-orange-500/50 hover:shadow-lg' 
                      : 'bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-600 hover:to-cyan-500 hover:shadow-cyan-500/50 hover:shadow-lg'
          } disabled:from-slate-600 disabled:to-slate-700`}
        >
          {isLoading ? (
            <Spinner />
          ) : isPlaying ? (
            <><IconVolumeOff /> Остановить</>
          ) : (
            <><IconVolumeUp /> Сгенерировать и воспроизвести</>
          )}
        </button>
      </div>

      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}
    </div>
  );
};