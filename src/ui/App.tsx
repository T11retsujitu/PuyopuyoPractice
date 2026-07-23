import { useEffect, useState } from 'react';
import type { GameConfig } from '../state/gameReducer';
import { loadSettings, saveSettings, type Settings } from '../state/settings';
import { ModeSelect } from './ModeSelect';
import { GameScreen } from './GameScreen';

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [config, setConfig] = useState<GameConfig | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  if (!config) {
    return (
      <ModeSelect settings={settings} onChangeSettings={setSettings} onStart={setConfig} />
    );
  }
  return (
    <GameScreen
      key={`${config.mode}-${config.form ?? ''}-${config.seed}`}
      config={config}
      settings={settings}
      onChangeSettings={setSettings}
      onExit={() => setConfig(null)}
    />
  );
}
