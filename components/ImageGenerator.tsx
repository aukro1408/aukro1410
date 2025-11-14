import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { IconDownload } from './Icons';

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('Фотореалистичное изображение величественного льва в саванне на закате, с ярким оранжево-фиолетовым небом.');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const url = await generateImage(prompt);
      setImageUrl(url);
    } catch (err: any) {
      setError('Не удалось сгенерировать изображение. Пожалуйста, проверьте консоль для получения подробной информации.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 p-4 rounded-lg shadow-lg">
        <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-2">
          Введите ваш запрос для изображения
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Например, футуристический город с летающими машинами в сумерках"
          className="w-full h-28 p-3 bg-slate-800 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all duration-200"
          disabled={isLoading}
        />
      </div>

      <div className="sticky bottom-4 z-0">
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-sky-600 hover:to-cyan-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-400 hover:shadow-cyan-500/50 hover:shadow-lg disabled:shadow-none"
        >
          {isLoading ? <Spinner /> : 'Сгенерировать изображение'}
        </button>
      </div>

      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</div>}

      <div className="mt-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center bg-slate-900 p-8 rounded-lg aspect-square">
            <Spinner />
            <p className="mt-4 text-slate-400">Создаем ваш шедевр...</p>
          </div>
        )}
        {imageUrl && (
          <div className="relative group bg-slate-900 p-2 rounded-lg">
            <img src={imageUrl} alt="Сгенерированное изображение" className="w-full h-auto rounded-md shadow-lg" />
            <a
              href={imageUrl}
              download="generated-image.jpg"
              className="absolute bottom-4 right-4 bg-slate-900/70 text-white p-3 rounded-full hover:bg-cyan-500 transition-all duration-200 opacity-0 group-hover:opacity-100 transform group-hover:scale-110"
              aria-label="Загрузить изображение"
            >
              <IconDownload />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};