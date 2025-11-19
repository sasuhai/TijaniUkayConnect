
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import type { CommunityDocument } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { IconDocument, IconDownload } from '../../components/icons';

export const DocumentsPage: FC = () => {
    const [documents, setDocuments] = useState<CommunityDocument[]>(() => {
        try {
            const cached = localStorage.getItem('tijani_documents');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchDocs = async () => {
             const timeoutId = setTimeout(() => {
                if (isMounted) setLoading(false);
            }, 5000);

            try {
                const { data, error } = await supabase.from('documents').select('*');
                if (isMounted) {
                    if (data) {
                        setDocuments(data as CommunityDocument[]);
                        localStorage.setItem('tijani_documents', JSON.stringify(data));
                    }
                }
            } catch (error) {
                 console.error("Error fetching documents:", error);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) setLoading(false);
            }
        };
        fetchDocs();
        return () => { isMounted = false; };
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Documents & Forms</h1>
                {loading && <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm"><Spinner /><span className="ml-2">Updating...</span></div>}
            </div>

            {documents.length === 0 && loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading documents...</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    {documents.length === 0 ? <div className="p-6 text-gray-500">No documents available.</div> : (
                        <ul className="divide-y divide-gray-200">
                            {documents.map(doc => (
                                <li key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center">
                                        <IconDocument className="h-8 w-8 text-brand-green mr-4" />
                                        <div>
                                            <p className="font-semibold text-lg text-gray-800">{doc.name}</p>
                                            <p className="text-sm text-gray-500">{doc.description}</p>
                                        </div>
                                    </div>
                                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><Button><IconDownload className="h-5 w-5 mr-2" />Download</Button></a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
