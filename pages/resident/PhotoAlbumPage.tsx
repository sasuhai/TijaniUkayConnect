
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import type { PhotoAlbum } from '../../types';
import { urlRegex } from '../../utils/helpers';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';

export const PhotoAlbumPage: FC = () => {
    // Initialize with empty array to force fresh fetch and avoid stale cache issues
    const [albums, setAlbums] = useState<PhotoAlbum[]>([]);

    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchAlbums = async () => {
            // Safety timeout to ensure spinner eventually disappears if network hangs
            const timeoutId = setTimeout(() => {
                if (isMounted) setIsFetching(false);
            }, 5000);

            try {
                const { data, error } = await supabase
                    .from('photo_albums')
                    .select('*')
                    .order('id', { ascending: false });

                if (isMounted) {
                    if (error) throw error;
                    if (data) {
                        setAlbums(data as PhotoAlbum[]);
                        // Update cache for next time (optional, but good for offline)
                        localStorage.setItem('tijani_photo_albums', JSON.stringify(data));
                    }
                }
            } catch (error) {
                console.error("Error fetching photo albums:", error);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setIsFetching(false);
                }
            }
        };
        fetchAlbums();

        return () => {
            isMounted = false;
        };
    }, []);

    const getAlbumLink = (album: PhotoAlbum): string | null => {
        if (!album.description) return null;
        const match = album.description.match(urlRegex);
        return match ? match[0] : null;
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = 'https://placehold.co/480x360?text=Image+Not+Found';
        e.currentTarget.onerror = null;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Photo Albums</h1>
                {/* Only show small indicator if we have data but are updating */}
                {isFetching && albums.length > 0 && (
                    <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                        <Spinner />
                        <span className="ml-2">Updating...</span>
                    </div>
                )}
            </div>

            {/* Only show full empty state spinner if we have NO data and are fetching */}
            {albums.length === 0 && isFetching ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading albums...</p>
                </div>
            ) : albums.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <p className="text-lg">No photo albums available yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {albums.map(album => {
                        const albumLink = getAlbumLink(album);

                        const cardContent = (
                            <Card className="overflow-hidden h-full flex flex-col">
                                <div className="relative w-full h-48">
                                    <img
                                        src={album.cover_image_url}
                                        alt={album.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        onError={handleImageError}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 bg-white/80 rounded-lg text-brand-dark font-semibold">
                                            {albumLink ? 'View Album' : 'No Link Available'}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex-grow">
                                    <h3 className="font-bold text-lg group-hover:text-brand-green">{album.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{(album.description || '').replace(urlRegex, '').trim()}</p>
                                </div>
                            </Card>
                        );

                        if (albumLink) {
                            return (
                                <a key={album.id} href={albumLink} target="_blank" rel="noopener noreferrer" className="group block no-underline" onClick={e => e.stopPropagation()}>
                                    {cardContent}
                                </a>
                            );
                        } else {
                            return (
                                <div key={album.id} className="group relative opacity-70 cursor-not-allowed" title="No link found in description">
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
