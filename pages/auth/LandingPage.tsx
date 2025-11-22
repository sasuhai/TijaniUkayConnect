import React, { FC, useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseService';
import { Settings } from '../../types';
import heroBg from '../../assets/landing-bg.jpg';

export const LandingPage: FC<{ onLogin: () => void; onRegister: () => void }> = ({ onLogin, onRegister }) => {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('settings')
                    .select('resident_name, app_name, information1, information2')
                    .limit(1);

                if (data && data.length > 0) {
                    setSettings(data[0] as Settings);
                }
            } catch (e) {
                // Silent error - will use fallback values
            }
        };
        fetchSettings();
    }, []);

    // --- BACKGROUND IMAGE CONFIGURATION ---
    // Using local image from assets
    const backgroundImageUrl = heroBg;

    return (
        <div
            className="relative flex flex-col min-h-screen w-full overflow-hidden text-white bg-brand-dark bg-cover bg-center"
            style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        >
            {/* Dark overlay to ensure text readability over the photographic background */}
            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

            <header className="relative z-10 p-4 flex justify-between items-center bg-transparent">
                <h1 className="text-2xl font-bold tracking-wider drop-shadow-sm">
                    {settings?.resident_name || 'Tijani Ukay Connect'}
                </h1>
            </header>

            <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4 drop-shadow-lg animate-fade-in-down">
                    {settings?.app_name || 'Tijani Ukay'}
                </h2>
                <p className="text-xl md:text-2xl max-w-3xl mb-8 drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {settings?.information1 || 'Your exclusive portal for community living, visitor management, and facility bookings.'}
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <Button
                        onClick={onLogin}
                        variant="primary"
                        className="!bg-brand-green/80 hover:!bg-brand-green border border-brand-light-green/50 !text-white text-lg px-8 py-3 transition-all duration-300 hover:scale-105 hover:shadow-glow-green"
                    >
                        Resident Login
                    </Button>
                    <Button
                        onClick={onRegister}
                        variant="secondary"
                        className="!bg-white/10 hover:!bg-white/20 border border-gray-600 !text-gray-200 text-lg px-8 py-3 transition-transform hover:scale-105"
                    >
                        Register
                    </Button>
                </div>
            </main>

            {settings?.information2 && (
                <footer className="relative z-10 p-4 text-center">
                    <p className="text-sm text-white/80 drop-shadow-sm">
                        {settings.information2}
                    </p>
                </footer>
            )}
        </div>
    );
};