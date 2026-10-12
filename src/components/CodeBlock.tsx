import { useEffect, useState } from 'react';
import styles from './CodeBlock.module.css';

type Props = {
  title: string;
  code: string;
};

/** コマンド・コード表示。ワンクリックでコピーできる */
export function CodeBlock({ title, code }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // クリップボードが使えない環境では何もしない（コードは選択してコピー可能）
    }
  };

  return (
    <figure className={styles.block}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.copy} onClick={copy} aria-label={`${title}をコピー`}>
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </figcaption>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
      <span className="visually-hidden" aria-live="polite">
        {copied ? 'クリップボードにコピーしました' : ''}
      </span>
    </figure>
  );
}
