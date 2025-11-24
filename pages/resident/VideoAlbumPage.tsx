
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import type { VideoAlbum } from '../../types';
import { urlRegex } from '../../utils/helpers';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';

export const VideoAlbumPage: FC = () => {
    // Initialize with empty array to force fresh fetch
    const [videos, setVideos] = useState<VideoAlbum[]>([]);

    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchVideos = async () => {
            // Safety timeout
            const timeoutId = setTimeout(() => {
                if (isMounted) setIsFetching(false);
            }, 5000);

            try {
                const { data, error } = await supabase
                    .from('video_albums')
                    .select('*')
                    .order('id', { ascending: false });

                if (isMounted) {
                    if (error) throw error;
                    if (data) {
                        const dataArray = data as VideoAlbum[];
                        setVideos(dataArray);
                        localStorage.setItem('tijani_video_albums', JSON.stringify(dataArray));
                    }
                }
            } catch (error) {
                console.error("Error fetching video albums:", error);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsFetching(false);
                }
            }
        };

        fetchVideos();

        return () => {
            isMounted = false;
        };
    }, []);

    const getVideoLink = (video: VideoAlbum): string | null => {
        if (!video.description) return null;
        const match = video.description.match(urlRegex);
        return match ? match[0] : null;
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = 'https://placehold.co/480x360?text=Image+Not+Found';
        e.currentTarget.onerror = null;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Video Albums</h1>
                {/* Only show small indicator if we have data but are updating */}
                {isFetching && videos.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                        <Spinner />
                        <span className="ml-2">Updating...</span>
                    </div>
                )}
            </div>

            {/* Only show full empty state spinner if we have NO data and are fetching */}
            {videos.length === 0 && isFetching ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading videos...</p>
                </div>
            ) : videos.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <p className="text-lg">No video albums available yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map(video => {
                        const videoLink = getVideoLink(video);

                        const cardContent = (
                            <Card className="overflow-hidden h-full flex flex-col">
                                <div className="relative w-full h-48">
                                    <img
                                        src={video.thumbnail_url}
                                        alt={video.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        onError={handleImageError}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 bg-white/80 rounded-lg text-brand-dark font-semibold">
                                            {videoLink ? 'Watch Video' : 'No Link Available'}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex-grow">
                                    <h3 className="font-bold text-lg group-hover:text-brand-green">{video.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{(video.description || '').replace(urlRegex, '').trim()}</p>
                                </div>
                            </Card>
                        );

                        if (videoLink) {
                            return (
                                <a key={video.id} href={videoLink} target="_blank" rel="noopener noreferrer" className="group block no-underline" onClick={e => e.stopPropagation()}>
                                    {cardContent}
                                </a>
                            );
                        } else {
                            return (
                                <div key={video.id} className="group relative opacity-70 cursor-not-allowed" title="No link found in description">
                                    {cardContent}
                                </div>
                            );
                        }
                    })}
                </div>
            )}
        </div>
    );
};
