import React, { useState } from 'react';
import { ImageGenerator } from './components/ImageGenerator';
import { SpeechGenerator } from './components/SpeechGenerator';
import { IconImage, IconAudio } from './components/Icons';

type Tab = 'image' | 'speech';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('image');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'image':
        return <ImageGenerator />;
      case 'speech':
        return <SpeechGenerator />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab; label: string; icon: React.ReactElement }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-cyan-400 ${
        activeTab === tab
          ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
          : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-300'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-slate-950/70 backdrop-blur-lg sticky top-0 z-10 p-4 border-b border-slate-800">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400">
            Gemini Media Generator
          </h1>
          <p className="text-center text-slate-400 mt-2 text-sm">
            Создавайте потрясающие визуальные эффекты и реалистичный звук с помощью ИИ
          </p>
        </div>
      </header>
      <main className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex border-b border-slate-800 mb-6">
            <TabButton tab="image" label="Генератор изображений" icon={<IconImage />} />
            <TabButton tab="speech" label="Генератор речи" icon={<IconAudio />} />
          </div>
          <div>{renderTabContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;