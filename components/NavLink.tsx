
import React, { FC } from 'react';

export const NavLink: FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 text-left text-lg transition-colors duration-200 ${isActive ? 'bg-brand-green text-white' : 'text-gray-200 hover:bg-brand-dark hover:text-white'}`}>
        {icon}
        <span className="mx-4 font-medium">{label}</span>
    </button>
);
