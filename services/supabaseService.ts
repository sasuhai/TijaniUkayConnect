// @ts-ignore
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm';

// Define constants locally to avoid potential import issues during debugging
const supabaseUrl = 'https://pztucbctmrbvrmpibwbf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dHVjYmN0bXJidnJtcGlid2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMjY2MzEsImV4cCI6MjA3NzkwMjYzMX0.4EJmdYz4c3PWjJr3eCduJmV-7WzYpOgod1wHBs6_Qyc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    global: {
        fetch: (url, options = {}) => {
            // Add timeout to all fetch requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            return fetch(url, {
                ...options,
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
        },
    },
});

// Helper to check if Supabase is reachable
export const checkSupabaseConnection = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        return !error;
    } catch {
        return false;
    }
};

// Wrapper to add timeout to any Supabase query
export const withTimeout = <T,>(
    promise: PromiseLike<T>,
    timeoutMs: number = 10000,
    errorMessage: string = 'Request timed out'
): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        ),
    ]);
};
