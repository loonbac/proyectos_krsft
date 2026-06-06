import clsx from 'clsx';

/**
 * StatsCard — modelo compacto de proyectos con icono cuadrado.
 */
export default function StatsCard({
  title,
  value,
  icon,
  iconBg = 'bg-blue-100',
  iconColor = 'text-blue-600',
  className = '',
}) {
  return (
    <article
      className={clsx(
        'flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-4 py-3 min-w-0 w-full max-w-full',
        className,
      )}
    >
      <span className={clsx(
        'flex size-10 shrink-0 items-center justify-center rounded-lg',
        iconBg,
        iconColor,
      )}>
        <span className="[&>svg]:size-5 [&>svg]:shrink-0">{icon}</span>
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-base font-semibold leading-tight text-gray-900">{value}</p>
        <p className="truncate text-[11px] text-gray-500">{title}</p>
      </div>
    </article>
  );
}
