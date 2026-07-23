import { useEffect } from 'react';
import type { GameAction, Phase } from '../state/gameReducer';

interface Options {
  phase: Phase;
  animate: boolean;
  dispatch: (a: GameAction) => void;
  onToggleHint: () => void;
  onReset: () => void;
}

/**
 * キー操作:
 * ←→ 移動 / ↑・X 右回転 / Z 左回転 / ↓・Space・Enter 設置 /
 * U 待った / N・Enter 次のツモ / H ヒント切替 / R リスタート(ゲームオーバー時)
 */
export function useKeyboard({ phase, animate, dispatch, onToggleHint, onReset }: Options) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat && !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const key = e.key.toLowerCase();
      const swallow = () => e.preventDefault();
      if (phase === 'placing') {
        switch (e.key) {
          case 'ArrowLeft':
            swallow();
            dispatch({ type: 'MOVE', dir: -1 });
            return;
          case 'ArrowRight':
            swallow();
            dispatch({ type: 'MOVE', dir: 1 });
            return;
          case 'ArrowUp':
            swallow();
            dispatch({ type: 'ROTATE', dir: 1 });
            return;
          case 'ArrowDown':
          case ' ':
          case 'Enter':
            swallow();
            dispatch({ type: 'DROP', animate });
            return;
        }
        if (key === 'x') dispatch({ type: 'ROTATE', dir: 1 });
        else if (key === 'z') dispatch({ type: 'ROTATE', dir: -1 });
        else if (key === 'u') dispatch({ type: 'UNDO' });
        else if (key === 'h') onToggleHint();
      } else if (phase === 'resolving') {
        if (e.key === ' ' || e.key === 'Enter') {
          swallow();
          dispatch({ type: 'SKIP_ANIMATION' });
        }
      } else if (phase === 'review') {
        if (e.key === ' ' || e.key === 'Enter' || key === 'n' || e.key === 'ArrowDown') {
          swallow();
          dispatch({ type: 'NEXT_TSUMO' });
        } else if (key === 'u') {
          dispatch({ type: 'UNDO' });
        }
      } else if (phase === 'gameover') {
        if (key === 'u') dispatch({ type: 'UNDO' });
        else if (key === 'r') onReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, animate, dispatch, onToggleHint, onReset]);
}
