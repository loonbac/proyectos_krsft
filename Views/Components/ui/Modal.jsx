import { createPortal } from 'react-dom';

/**
 * Modal — HyperUI-aligned portal modal.
 */
export default function Modal({
    open,
    onClose,
    title,
    titleIcon,
    children,
    footer,
    size = 'md',
    borderColor = null,
}) {
    if (!open) return null;

    const widths = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
    };

    const borderStyle = borderColor 
        ? { borderColor: borderColor, borderWidth: '3px' }
        : {};
    const borderClass = borderColor ? 'border-2' : 'border-2 border-gray-200';

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`w-full ${widths[size]} max-h-[90vh] flex flex-col rounded-lg bg-white shadow-2xl ${borderClass}`}
                style={borderStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
                        <h2 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                            {titleIcon}
                            {title}
                        </h2>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
