import React, { FC } from 'react';
import { Button } from '../../components/ui/Button';

export const LandingPage: FC<{ onLogin: () => void; onRegister: () => void }> = ({ onLogin, onRegister }) => {
    // --- BACKGROUND IMAGE CONFIGURATION ---
    // To use your own local image:
    // 1. Ensure your image is named 'hero-background.jpg'.
    // 2. Place it inside the 'public/assets/' folder of your project.
    // 3. Uncomment the 'localImage' line below and comment out the 'remoteImage' line.
    
    // const backgroundImageUrl = '/assets/hero-background.jpg'; // Local image
    const backgroundImageUrl = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2000&q=80'; // Default luxury home image

    return (
        <div 
            className="relative flex flex-col min-h-screen w-full overflow-hidden text-white bg-brand-dark bg-cover bg-center"
            style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        >
            {/* Dark overlay to ensure text readability over the photographic background */}
            <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
            
            <header className="relative z-10 p-4 flex justify-between items-center bg-transparent">
                <h1 className="text-2xl font-bold tracking-wider drop-shadow-sm">Tijani Ukay Connect</h1>
            </header>

            <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4 drop-shadow-lg animate-fade-in-down">
                    Welcome to Tijani Ukay
                </h2>
                <p className="text-xl md:text-2xl max-w-3xl mb-8 drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    Your exclusive portal for community living, visitor management, and facility bookings.
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
        </div>
    );
};