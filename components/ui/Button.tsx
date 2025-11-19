
import React, { FC } from 'react';

export const Button: FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, className, variant = 'primary', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';
    const variantClasses = {
        primary: 'bg-brand-green text-white hover:bg-green-700 focus:ring-brand-green',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>{children}</button>;
};
