import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CellPos } from '../core/types';
import { createTsumoDeck, DECK_PAIRS } from '../core/tsumo';
import { FOUNDATION_TEMPLATES, matchTemplate } from '../eval/templates';
import { SKILL_LEVELS } from '../eval/profiles';
import {
  createInitialState,
  evalContextOf,
  gameReducer,
  type GameConfig,
} from '../state/gameReducer';
import { buildHints } from '../state/review';
import type { Settings } from '../state/settings';
import { BoardView, type BoardOverlayCell } from './BoardView';
import { useKeyboard } from './useKeyboard';
import { GhostOverlay } from './GhostOverlay';
import { NextPreview } from './NextPreview';
import { EvalPanel } from './EvalPanel';
import { CandidateCard } from './CandidateCard';
import { TemplateProgress } from './TemplateProgress';

interface Props {
  config: GameConfig;
  settings: Settings;
  onChangeSettings: (s: Settings) => void;
  onExit: () => void;
}

const TICK_MS = { normal: 650, fast: 300, off: 0 } as const;

export function GameScreen({ config, settings, onChangeSettings, onExit }: Props) {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createInitialState(config, settings.skill),
  );
  const [showGuide, setShowGuide] = useState(false);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const deck = useMemo(() => createTsumoDeck(config.seed), [config.seed]);
  const pair = deck.pairAt(state.tsumoIndex);
  const animate = settings.animationSpeed !== 'off';

  // 練度設定の変更を反映する。
  useEffect(() => {
    if (state.skill !== settings.skill) dispatch({ type: 'SET_SKILL', skill: settings.skill });
  }, [settings.skill, state.skill]);

  // 連鎖アニメーションの進行。
  useEffect(() => {
    if (state.phase !== 'resolving') return;
    const t = setTimeout(
      () => dispatch({ type: 'CHAIN_TICK' }),
      TICK_MS[settings.animationSpeed === 'fast' ? 'fast' : 'normal'],
    );
    return () => clearTimeout(t);
  }, [state.phase, state.chainStepIndex, settings.animationSpeed]);

  const template =
    config.mode === 'foundation' && config.form ? FOUNDATION_TEMPLATES[config.form] : null;
  const match = useMemo(
    () => (template ? matchTemplate(state.field, template) : null),
    [template, state.field],
  );

  const hints = useMemo(() => {
    if (state.phase !== 'placing' || !settings.showHint) return null;
    return buildHints(state.field, pair, evalContextOf(state), 3);
  }, [state, pair, settings.showHint]);

  const guideOverlay = useMemo<BoardOverlayCell[]>(() => {
    if (!showGuide || !template || !match) return [];
    const variant = template.variants.find((v) => v.name === match.variantName);
    if (!variant) return [];
    return variant.cells
      .filter((c) => !state.field[c.pos.col]?.[c.pos.row])
      .map((c) => ({ pos: c.pos, color: match.assignment.get(c.v)!, style: 'ghost' as const }));
  }, [showGuide, template, match, state.field]);

  // 表示する盤面: アニメ中はタイムラインの中間盤面。
  const displayField =
    state.phase === 'resolving' && state.chainTimeline
      ? state.chainTimeline[state.chainStepIndex]!
      : state.field;
  const flashing: CellPos[] =
    state.phase === 'resolving' && state.chainSteps
      ? (state.chainSteps[state.chainStepIndex]?.groups ?? []).flatMap((g) => g.cells)
      : [];
  const lastLanded =
    state.phase === 'review' && state.review && state.review.player.candidate.chainResult.chains === 0
      ? state.review.player.candidate.outcome.landed
      : [];

  const toggleHint = useCallback(
    () => onChangeSettings({ ...settings, showHint: !settings.showHint }),
    [settings, onChangeSettings],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  useKeyboard({ phase: state.phase, animate, dispatch, onToggleHint: toggleHint, onReset: reset });

  const colFromPointer = (e: React.PointerEvent | React.MouseEvent): number | null => {
    const rect = boardWrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(5, Math.floor((x / rect.width) * 6)));
  };

  const formName = template?.nameJa;

  return (
    <div className="game-screen">
      <header className="game-header">
        <button className="btn btn-ghost" onClick={onExit}>
          ← モード選択へ
        </button>
        <h1 className="game-title">
          {config.mode === 'simple' ? 'とこぷよ練習' : `土台練習: ${formName}`}
        </h1>
        <span className="seed-label">シード {config.seed}</span>
      </header>

      <div className="game-layout">
        <section className="board-col">
          <div
            className="board-wrap"
            ref={boardWrapRef}
            onPointerMove={(e) => {
              if (state.phase !== 'placing') return;
              const col = colFromPointer(e);
              if (col !== null && col !== state.cursor.col) dispatch({ type: 'SET_COL', col });
            }}
            onClick={(e) => {
              if (state.phase === 'placing') {
                const col = colFromPointer(e);
                if (col !== null && col === state.cursor.col) dispatch({ type: 'DROP', animate });
                else if (col !== null) dispatch({ type: 'SET_COL', col });
              } else if (state.phase === 'resolving') {
                dispatch({ type: 'SKIP_ANIMATION' });
              } else if (state.phase === 'review') {
                dispatch({ type: 'NEXT_TSUMO' });
              }
            }}
            onWheel={(e) => {
              if (state.phase === 'placing') dispatch({ type: 'ROTATE', dir: e.deltaY > 0 ? 1 : -1 });
            }}
          >
            <BoardView
              field={displayField}
              flashing={flashing}
              overlay={guideOverlay}
              highlight={lastLanded}
            >
              {state.phase === 'placing' && (
                <GhostOverlay field={state.field} pair={pair} placement={state.cursor} />
              )}
            </BoardView>
            {state.phase === 'gameover' && (
              <div className="gameover-overlay">
                <p className="gameover-title">ゲームオーバー</p>
                <p>3列目の12段目が塞がりました</p>
                <div className="btn-row">
                  <button className="btn" onClick={() => dispatch({ type: 'UNDO' })}>
                    待った(1手戻す)
                  </button>
                  <button className="btn btn-primary" onClick={reset}>
                    最初から
                  </button>
                </div>
              </div>
            )}
            {state.phase === 'resolving' && state.chainSteps && (
              <div className="chain-banner">{state.chainStepIndex + 1}連鎖!</div>
            )}
          </div>

          <div className="control-row">
            <button className="btn" disabled={state.phase !== 'placing'} onClick={() => dispatch({ type: 'MOVE', dir: -1 })}>←</button>
            <button className="btn" disabled={state.phase !== 'placing'} onClick={() => dispatch({ type: 'ROTATE', dir: -1 })}>↺ Z</button>
            <button className="btn" disabled={state.phase !== 'placing'} onClick={() => dispatch({ type: 'ROTATE', dir: 1 })}>↻ X</button>
            <button className="btn" disabled={state.phase !== 'placing'} onClick={() => dispatch({ type: 'MOVE', dir: 1 })}>→</button>
            <button
              className="btn btn-primary"
              disabled={state.phase !== 'placing'}
              onClick={() => dispatch({ type: 'DROP', animate })}
            >
              設置 ↓
            </button>
          </div>
          <p className="key-help">
            ←→移動 / Z・X回転 / ↓・Space設置 / U待った / H ヒント
          </p>
        </section>

        <aside className="side-col">
          <NextPreview next={deck.pairAt(state.tsumoIndex + 1)} nextNext={deck.pairAt(state.tsumoIndex + 2)} />
          <div className="stats-box">
            <dl>
              <div><dt>スコア</dt><dd>{state.totalScore.toLocaleString()}</dd></div>
              <div><dt>手数</dt><dd>{state.moveCount}</dd></div>
              <div><dt>最大連鎖</dt><dd>{state.maxChainSeen}</dd></div>
              <div><dt>全消し</dt><dd>{state.allClearCount}</dd></div>
              <div><dt>ツモ</dt><dd>{(state.tsumoIndex % DECK_PAIRS) + 1}/{DECK_PAIRS}</dd></div>
            </dl>
          </div>

          {template && match && (
            <TemplateProgress
              match={match}
              formName={template.nameJa}
              lastTemplate={state.review?.player.candidate.features.template}
              showGuide={showGuide}
              onToggleGuide={setShowGuide}
            />
          )}

          <div className="history-controls">
            {state.phase === 'review' && (
              <button className="btn btn-primary btn-wide" onClick={() => dispatch({ type: 'NEXT_TSUMO' })}>
                次のツモへ(N)
              </button>
            )}
            {state.phase === 'resolving' && (
              <button className="btn btn-wide" onClick={() => dispatch({ type: 'SKIP_ANIMATION' })}>
                アニメをスキップ
              </button>
            )}
            <button
              className="btn btn-wide"
              disabled={state.history.length === 0 || state.phase === 'resolving'}
              onClick={() => dispatch({ type: 'UNDO' })}
            >
              待った(U)
            </button>
            <button className="btn btn-wide" onClick={reset}>
              最初からやり直す
            </button>
          </div>

          <details className="settings-box">
            <summary>設定</summary>
            <div className="settings-body">
              <fieldset>
                <legend>練度(評価基準)</legend>
                {SKILL_LEVELS.map((s) => (
                  <label key={s.id}>
                    <input
                      type="radio"
                      name="skill"
                      checked={settings.skill === s.id}
                      onChange={() => onChangeSettings({ ...settings, skill: s.id })}
                    />
                    {s.nameJa}
                  </label>
                ))}
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showHint}
                  onChange={(e) => onChangeSettings({ ...settings, showHint: e.target.checked })}
                />
                置く前にヒント(有力候補)を表示
              </label>
              <label>
                連鎖アニメ:
                <select
                  value={settings.animationSpeed}
                  onChange={(e) =>
                    onChangeSettings({
                      ...settings,
                      animationSpeed: e.target.value as Settings['animationSpeed'],
                    })
                  }
                >
                  <option value="normal">ふつう</option>
                  <option value="fast">はやい</option>
                  <option value="off">なし</option>
                </select>
              </label>
            </div>
          </details>
        </aside>

        <section className="eval-col">
          {state.review && state.phase !== 'resolving' ? (
            <EvalPanel review={state.review} stale={state.phase === 'placing'} />
          ) : state.phase === 'placing' ? (
            <div className="eval-panel eval-placeholder">
              <h2 className="eval-heading">一手ごとの評価</h2>
              <p>
                ぷよを置くと、その手のメリット・デメリットと他の有力候補がここに表示されます。じっくり考えてから置いてください。
              </p>
            </div>
          ) : null}
          {hints && (
            <div className="eval-panel hint-panel">
              <h2 className="eval-heading">ヒント: 有力候補</h2>
              {hints.map((h, i) => (
                <CandidateCard key={i} view={h} title={`候補${i + 1}`} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
