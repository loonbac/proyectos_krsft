import clsx from 'clsx';

/**
 * StatsCard — HyperUI Stat Card (patrón 3.4 con icono grande).
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
                'flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white p-[20px]',
                className,
            )}
        >
            <span className={clsx('rounded-full p-[14px]', iconBg, iconColor, '[&>svg]:size-[27px]')}>
                {icon}
            </span>
            <div>
                <p className="text-[21px] font-semibold text-gray-900">{value}</p>
                <p className="text-[13px] text-gray-500">{title}</p>
            </div>
        </article>
    );
}
