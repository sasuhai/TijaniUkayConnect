import React, { FC } from 'react';

export const toYyyyMmDd = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const formatDateWithDay = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString.includes('T') ? isoString : `${isoString}T00:00:00`);
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
        const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
        return `${formattedDate} (${dayOfWeek})`;
    } catch (e) {
        return 'Invalid Date';
    }
};

export const formatDateTime = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${formattedDate}, ${formattedTime}`;
    } catch (e) {
        return 'Invalid Date';
    }
};

export const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
     try {
        const date = new Date(isoString.includes('T') ? isoString : `${isoString}T00:00:00`);
        return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    } catch (e) {
        return 'Invalid Date';
    }
};

export const urlRegex = /(https?:\/\/[^\s]+)/g;

export const RenderWithLinks: FC<{ text: string | undefined | null }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(urlRegex);

    return React.createElement(
        React.Fragment,
        null,
        ...parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return React.createElement('a', {
                    key: index,
                    href: part,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'text-brand-green hover:underline',
                    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()
                }, 'View Link');
            }
            return React.createElement(React.Fragment, { key: index }, part);
        })
    );
};


export const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Unknown error';
    
    if (typeof error === 'string') return error;
    
    if (error instanceof Error) return error.message;

    if (typeof error === 'object' && error !== null) {
        const anyError = error as any;
        // Common error properties from various libraries/APIs
        if (anyError.message) return anyError.message;
        if (anyError.error_description) return anyError.error_description;
        if (anyError.details) return anyError.details;
        
        try {
            const json = JSON.stringify(error, null, 2);
            // Avoid returning empty JSON objects if possible
            if (json !== '{}' && json !== '[]') return json;
        } catch {
            // Fallback to string casting if stringify fails
            return String(error);
        }
    }

    // Fallback for numbers, booleans, or other types
    return String(error);
};