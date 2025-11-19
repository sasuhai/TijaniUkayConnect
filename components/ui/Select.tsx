
import React, { FC } from 'react';

export const Select: FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; description?: string }> = ({ label, id, children, description, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <select id={id} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm" {...props}>
            {children}
        </select>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
    </div>
);
