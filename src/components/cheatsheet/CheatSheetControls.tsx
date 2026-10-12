import type { CheatSheet } from '../../types/technology';
import { COLOR_PRESETS, COLUMN_CHOICES, ROW_CHOICES, type Orientation } from '../../utils/cheatsheetLayout';
import styles from './CheatSheetControls.module.css';

export type ColorChoice = { preset: (typeof COLOR_PRESETS)[number]['id'] } | { preset: 'custom'; value: string };

export type CheatSheetSettings = {
  color: ColorChoice;
  columns: number;
  rows: number | null;
  orientation: Orientation;
  groups: Set<string>;
};

type Props = {
  sheet: CheatSheet;
  settings: CheatSheetSettings;
  resolvedColor: string;
  onChange: (next: CheatSheetSettings) => void;
};

export function CheatSheetControls({ sheet, settings, resolvedColor, onChange }: Props) {
  const update = (patch: Partial<CheatSheetSettings>) => onChange({ ...settings, ...patch });

  const toggleGroup = (title: string) => {
    const groups = new Set(settings.groups);
    if (groups.has(title)) groups.delete(title);
    else groups.add(title);
    update({ groups });
  };

  return (
    <div className={styles.controls}>
      <fieldset className={styles.field}>
        <legend className={styles.legend}>カラー</legend>
        <div className={styles.swatches}>
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.swatch}
              aria-pressed={settings.color.preset === p.id}
              aria-label={p.label}
              title={p.label}
              onClick={() => update({ color: { preset: p.id } })}
            >
              <span
                className={styles.swatchColor}
                style={{ background: p.value ?? undefined }}
                data-category-swatch={p.value === null ? '' : undefined}
              />
            </button>
          ))}
          <label className={styles.custom} title="任意の色">
            <input
              type="color"
              value={resolvedColor}
              onChange={(e) => update({ color: { preset: 'custom', value: e.target.value } })}
              aria-label="任意の色を選ぶ"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>列数</legend>
        <div className={styles.segmented}>
          {COLUMN_CHOICES.map((n) => (
            <button key={n} type="button" aria-pressed={settings.columns === n} onClick={() => update({ columns: n })}>
              {n}列
            </button>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="cs-rows" className={styles.legend}>
          行数
        </label>
        <select
          id="cs-rows"
          className={styles.select}
          value={settings.rows ?? 'auto'}
          onChange={(e) => update({ rows: e.target.value === 'auto' ? null : Number(e.target.value) })}
        >
          <option value="auto">自動（A4 1枚に収める）</option>
          {ROW_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}行 / ページ
            </option>
          ))}
        </select>
      </div>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>用紙の向き</legend>
        <div className={styles.segmented}>
          {(
            [
              ['portrait', 'A4 縦'],
              ['landscape', 'A4 横'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.orientation === value}
              onClick={() => update({ orientation: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.legend}>掲載する項目</legend>
        <ul className={styles.groups}>
          {sheet.groups.map((g) => (
            <li key={g.title}>
              <label className={styles.check}>
                <input type="checkbox" checked={settings.groups.has(g.title)} onChange={() => toggleGroup(g.title)} />
                {g.title}
                <span className={styles.count}>{g.items.length}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
