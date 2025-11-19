
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import type { Announcement } from '../../types';
import { formatDate } from '../../utils/helpers';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';

export const AnnouncementsPage: FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
        try {
            const cached = localStorage.getItem('tijani_announcements');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchAnnouncements = async () => {
            const timeoutId = setTimeout(() => {
                if (isMounted) setLoading(false);
            }, 5000);

            try {
                const { data, error } = await supabase.from('announcements').select('*');
                if (isMounted) {
                    if (data) {
                        const sorted = (data as Announcement[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        setAnnouncements(sorted);
                        localStorage.setItem('tijani_announcements', JSON.stringify(sorted));
                    }
                }
            } catch (error) {
                console.error("Error fetching announcements:", error);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) setLoading(false);
            }
        }
        fetchAnnouncements();
        return () => { isMounted = false; };
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Announcements</h1>
                {loading && <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm"><Spinner /><span className="ml-2">Updating...</span></div>}
            </div>
            
            {announcements.length === 0 && loading ? (
                 <div className="flex flex-col items-center justify-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading announcements...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {announcements.length === 0 ? <p className="text-gray-500">No announcements found.</p> : announcements.map(ann => (
                        <Card key={ann.id} className="p-6">
                            <p className="text-sm text-gray-500 mb-1">{formatDate(ann.created_at)}</p>
                            <h2 className="text-2xl font-semibold text-brand-dark mb-2">{ann.title}</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{ann.content}</p>
                            {ann.attachment_url && <a href={ann.attachment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-brand-green hover:underline mt-4 inline-block">View Attachment</a>}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
