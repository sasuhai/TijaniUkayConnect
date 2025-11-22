import React from 'react';

/**
 * Converts URLs in text to clickable links
 */
export const linkifyText = (text: string): React.ReactElement => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-green hover:underline break-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};
