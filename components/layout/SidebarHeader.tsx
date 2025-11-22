import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { Settings } from '../../types';

export const SidebarHeader: FC = () => {
    const [appSettings, setAppSettings] = useState<Settings | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('app_name, version')
                    .limit(1);

                if (data && data.length > 0) {
                    setAppSettings(data[0] as Settings);
                }
            } catch (e) {
                // Silent error
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-brand-dark/50">
            <span className="text-white text-2xl font-semibold text-center">
                {appSettings?.app_name || 'Tijani Ukay'}
            </span>
            {appSettings?.version && (
                <span className="text-white/60 text-xs mt-1">v{appSettings.version}</span>
            )}
        </div>
    );
};
