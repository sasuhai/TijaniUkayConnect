import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseService';
import type { Announcement, CommunityDocument, Contact } from '../../types';

interface SearchResult {
    type: 'announcement' | 'document' | 'contact';
    id: string;
    title: string;
    description?: string;
    date?: string;
}

export const GlobalSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }

        const searchTimeout = setTimeout(async () => {
            setLoading(true);
            try {
                const searchTerm = `%${query.toLowerCase()}%`;

                // Search announcements
                const { data: announcements } = await supabase
                    .from('announcements')
                    .select('id, title, content, created_at')
                    .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
                    .limit(5);

                // Search documents
                const { data: documents } = await supabase
                    .from('documents')
                    .select('id, name, description, created_at')
                    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                    .limit(5);

                // Search contacts
                const { data: contacts } = await supabase
                    .from('contacts')
                    .select('id, name, role, phone')
                    .or(`name.ilike.${searchTerm},role.ilike.${searchTerm}`)
                    .limit(5);

                const searchResults: SearchResult[] = [
                    ...(announcements || []).map((a: Announcement) => ({
                        type: 'announcement' as const,
                        id: a.id,
                        title: a.title,
                        description: a.content.substring(0, 100) + '...',
                        date: a.created_at,
                    })),
                    ...(documents || []).map((d: CommunityDocument) => ({
                        type: 'document' as const,
                        id: d.id,
                        title: d.name,
                        description: d.description,
                        date: d.created_at,
                    })),
                    ...(contacts || []).map((c: Contact) => ({
                        type: 'contact' as const,
                        id: c.id,
                        title: c.name,
                        description: `${c.role} - ${c.phone}`,
                    })),
                ];

                setResults(searchResults);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce

        return () => clearTimeout(searchTimeout);
    }, [query]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement':
                return '📢';
            case 'document':
                return '📄';
            case 'contact':
                return '📞';
            default:
                return '🔍';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search announcements, documents, contacts..."
                        className="w-full px-4 py-3 text-lg border-none outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-2">Searching...</p>
                        </div>
                    )}

                    {!loading && query.trim().length >= 2 && results.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-xl">No results found</p>
                            <p className="text-sm mt-2">Try different keywords</p>
                        </div>
                    )}

                    {!loading && query.trim().length < 2 && (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-xl">🔍</p>
                            <p className="text-sm mt-2">Type at least 2 characters to search</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="divide-y">
                            {results.map((result) => (
                                <div
                                    key={`${result.type}-${result.id}`}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={onClose}
                                >
                                    <div className="flex items-start space-x-3">
                                        <span className="text-2xl">{getIcon(result.type)}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h3 className="font-semibold text-gray-900">{result.title}</h3>
                                                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                                    {result.type}
                                                </span>
                                            </div>
                                            {result.description && (
                                                <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                                            )}
                                            {result.date && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(result.date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 bg-gray-50 text-xs text-gray-500 text-center border-t">
                    Press <kbd className="px-2 py-1 bg-white border rounded">ESC</kbd> to close
                </div>
            </div>
        </div>
    );
};
