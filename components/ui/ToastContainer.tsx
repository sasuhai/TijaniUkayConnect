import React from 'react';
import { useToast } from '../../contexts/ToastContext';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    const getToastStyles = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
            case 'info':
            default:
                return 'bg-blue-500 text-white';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${getToastStyles(toast.type)} px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-slide-in-right`}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold">{getIcon(toast.type)}</span>
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="ml-4 text-white hover:text-gray-200 font-bold"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};
