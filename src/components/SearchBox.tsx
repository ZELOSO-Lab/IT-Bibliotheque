import { useEffect, useId, useRef, type FormEvent } from 'react';
import styles from './SearchBox.module.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Enter 押下時の処理。指定しない場合はフォーム送信しない */
  onSubmit?: (value: string) => void;
  label: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
  /** 検索結果領域のID（aria-controls） */
  controls?: string;
  /** 「/」キーでこの検索欄にフォーカスする */
  shortcut?: boolean;
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function SearchBox({
  value,
  onChange,
  onSubmit,
  label,
  placeholder = '技術名、キーワードを検索',
  size = 'md',
  autoFocus,
  controls,
  shortcut,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcut]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.(value.trim());
  };

  return (
    <form role="search" className={`${styles.form} ${styles[size]}`} onSubmit={handleSubmit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        id={id}
        type="search"
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        autoFocus={autoFocus}
        aria-controls={controls}
        aria-keyshortcuts={shortcut ? '/' : undefined}
      />
      {shortcut && !value && (
        <kbd className={styles.kbd} aria-hidden="true">
          /
        </kbd>
      )}
      {value && (
        <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="検索語をクリア">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      {onSubmit && size !== 'sm' && (
        <button type="submit" className={styles.submit}>
          検索
        </button>
      )}
    </form>
  );
}
