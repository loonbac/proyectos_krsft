import clsx from 'clsx';

/**
 * Input — HyperUI Input Simple (patrón 4.1).
 */
function Input({
    label, name, type = 'text', value, onChange, placeholder, error, required = false, helper, className = '', ...props
}) {
    return (
        <div className={clsx('space-y-2', className)}>
            <label className="block">
                <span className="text-[13px] font-semibold text-gray-700">
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </span>
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={clsx(
                        'mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] shadow-sm transition-all focus:outline-none focus:ring-2',
                        error
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-primary/50 focus:ring-primary/20',
                    )}
                    {...props}
                />
            </label>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            {helper && !error && <p className="mt-1 text-[11px] text-gray-500">{helper}</p>}
        </div>
    );
}

Input.displayName = 'Input';
export default Input;