import { useState } from 'react';
import { SKILL_LEVELS } from '../eval/profiles';
import { FOUNDATION_TEMPLATES, type FoundationFormId } from '../eval/templates';
import type { GameConfig, GameMode } from '../state/gameReducer';
import type { Settings } from '../state/settings';

interface Props {
  settings: Settings;
  onChangeSettings: (s: Settings) => void;
  onStart: (config: GameConfig) => void;
}

const FORM_IDS: FoundationFormId[] = ['stairs', 'kagi', 'gtr'];

export function ModeSelect({ settings, onChangeSettings, onStart }: Props) {
  const [mode, setMode] = useState<GameMode>('simple');
  const [form, setForm] = useState<FoundationFormId>('gtr');
  const [seedText, setSeedText] = useState('');

  const start = () => {
    const parsed = Number.parseInt(seedText, 10);
    const seed = Number.isFinite(parsed) && seedText.trim() !== '' ? parsed >>> 0 : (Math.random() * 0xffffffff) >>> 0;
    onStart({ mode, seed, ...(mode === 'foundation' ? { form } : {}) });
  };

  return (
    <div className="mode-select">
      <h1 className="title-heading">ぷよぷよ練習</h1>
      <p className="title-lead">
        一手ごとに完全に止まるぷよぷよ。時間を気にせず「なぜその一手なのか」をじっくり考え、
        置いた手のメリット・デメリットと他の候補手から考え方を学べます。
      </p>

      <section className="select-section">
        <h2>モード</h2>
        <div className="mode-cards">
          <button
            className={`mode-card ${mode === 'simple' ? 'selected' : ''}`}
            onClick={() => setMode('simple')}
          >
            <span className="mode-card-title">とこぷよ練習</span>
            <span className="mode-card-desc">
              対戦・おじゃま・時間制限なし。自由に積んで、一手ごとの評価で考え方を磨くモード。
            </span>
          </button>
          <button
            className={`mode-card ${mode === 'foundation' ? 'selected' : ''}`}
            onClick={() => setMode('foundation')}
          >
            <span className="mode-card-title">土台練習</span>
            <span className="mode-card-desc">
              階段積み・カギ積み・GTR をランダムツモで練習。お手本との一致度と「逃がし」の判断も評価。
            </span>
          </button>
        </div>
      </section>

      {mode === 'foundation' && (
        <section className="select-section">
          <h2>練習する土台</h2>
          <div className="mode-cards">
            {FORM_IDS.map((id) => {
              const t = FOUNDATION_TEMPLATES[id];
              return (
                <button
                  key={id}
                  className={`mode-card ${form === id ? 'selected' : ''}`}
                  onClick={() => setForm(id)}
                >
                  <span className="mode-card-title">{t.nameJa}</span>
                  <span className="mode-card-desc">{t.descriptionJa}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="select-section">
        <h2>練度(評価と解説が変わります)</h2>
        <div className="skill-options">
          {SKILL_LEVELS.map((s) => (
            <label key={s.id} className={`skill-option ${settings.skill === s.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="title-skill"
                checked={settings.skill === s.id}
                onChange={() => onChangeSettings({ ...settings, skill: s.id })}
              />
              <span className="skill-name">{s.nameJa}</span>
              <span className="skill-desc">{s.descriptionJa}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="select-section">
        <h2>ツモのシード(任意)</h2>
        <p className="seed-note">
          同じシードなら同じツモ順になります。空欄ならランダム。気に入った譜面を練習し直すときに使えます。
        </p>
        <input
          className="seed-input"
          type="text"
          inputMode="numeric"
          placeholder="例: 42"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
        />
      </section>

      <button className="btn btn-primary btn-start" onClick={start}>
        練習をはじめる
      </button>
    </div>
  );
}
