
import React, { FC } from 'react';

// Fix: Update Card component to accept and forward HTML div attributes like onClick.
export const Card: FC<{ children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`} {...props}>
        {children}
    </div>
);
