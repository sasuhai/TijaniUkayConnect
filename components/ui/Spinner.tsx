
import React, { FC } from 'react';

export const Spinner: FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
);
export const FullPageSpinner: FC<{ message?: string }> = ({ message = "Loading..." }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-light-gray">
        <Spinner />
        <p className="mt-4 text-brand-dark font-semibold">{message}</p>
    </div>
);
