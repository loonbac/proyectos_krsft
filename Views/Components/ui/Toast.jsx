import { useEffect, useState } from 'react';

/**
 * Toast – HyperUI-aligned notification (self-contained for proyectos module).
 */
export default function Toast({ show, message, type = 'success', duration = 4000, onHide }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            const t = setTimeout(() => { setVisible(false); onHide?.(); }, duration);
            return () => clearTimeout(t);
        }
        setVisible(false);
    }, [show, duration, onHide]);

    if (!visible) return null;

    const colors = {
        success: 'border-emerald-500 bg-emerald-50 text-emerald-700',
        error:   'border-red-500 bg-red-50 text-red-700',
        warning: 'border-amber-500 bg-amber-50 text-amber-700',
        info:    'border-blue-500 bg-blue-50 text-blue-700',
    };

    return (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md sm:right-6">
            <div
                role="alert"
                className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${colors[type] || colors.success}`}
            >
                {type === 'success' && (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                )}
                {type === 'error' && (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                )}
                {type === 'warning' && (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                )}
                {type === 'info' && (
                    <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                )}
                <p className="flex-1 text-sm font-medium">{message}</p>
                <button
                    type="button"
                    onClick={() => onHide?.()}
                    className="rounded p-1 opacity-70 transition-opacity hover:opacity-100"
                    aria-label="Cerrar notificación"
                >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
}
