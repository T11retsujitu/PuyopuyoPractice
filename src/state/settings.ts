import type { SkillLevel } from '../eval/profiles';

export type AnimationSpeed = 'normal' | 'fast' | 'off';

export interface Settings {
  skill: SkillLevel;
  /** 設置前に上位候補のヒントを表示する。 */
  showHint: boolean;
  animationSpeed: AnimationSpeed;
}

export const DEFAULT_SETTINGS: Settings = {
  skill: 'beginner',
  showHint: false,
  animationSpeed: 'normal',
};

const STORAGE_KEY = 'puyopuyo-practice:settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // localStorage が使えない環境では保存しない。
  }
}
