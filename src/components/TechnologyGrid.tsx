import type { Technology } from '../types/technology';
import { TechnologyCard } from './TechnologyCard';
import styles from './TechnologyGrid.module.css';

type Props = {
  technologies: Technology[];
  variant?: 'default' | 'compact';
  id?: string;
};

export function TechnologyGrid({ technologies, variant = 'default', id }: Props) {
  return (
    <ul className={`${styles.grid} ${styles[variant]}`} id={id}>
      {technologies.map((t) => (
        <li key={t.id}>
          <TechnologyCard technology={t} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
