/** Content-shaped placeholder. Decorative: the surrounding region carries the accessible loading status. */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`gg-skeleton ${className}`} style={style} aria-hidden="true" />;
}
