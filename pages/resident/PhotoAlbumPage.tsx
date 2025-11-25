
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

    const createPlaceholderSVG = (text: string): string => {
        const svg = `
            <svg width="480" height="360" xmlns="http://www.w3.org/2000/svg">
                <rect width="480" height="360" fill="#6366f1"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">
                    ${text}
                </text>
            </svg>
        `;
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    };

    const extractGooglePhotosImageUrl = (url: string): string | null => {
        // Google Photos shared photo URLs can be converted to direct image URLs
        // Format: https://lh3.googleusercontent.com/... or similar

        // If it's already a direct Google image URL, return it
        if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
            // Add size parameter if not present
            if (!url.includes('=w') && !url.includes('=s')) {
                return `${url}=w480-h360`;
            }
            return url;
        }

        // For Google Photos album/photo share links, we can't directly extract without API
        // Return null to use placeholder
        return null;
    };

    const convertOneDriveUrl = (url: string): string => {
        // OneDrive share links need to be converted to direct download links

        if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
            // If it's already an embed URL, return it
            if (url.includes('/embed?')) {
                return url;
            }

            // Try to extract resid and cid from album view URLs
            // Format: ...cid=XXX...photosData=...!XXX...
            const cidMatch = url.match(/cid=([A-F0-9]+)/i);
            const resIdMatch = url.match(/!(\d+)/); // Photo ID after !

            if (cidMatch && resIdMatch) {
                const cid = cidMatch[1];
                const photoId = resIdMatch[1];
                // Construct embed URL
                return `https://onedrive.live.com/embed?cid=${cid}&resid=${cid}!${photoId}&authkey=!${cid}`;
            }

            // Try to convert share link to embed link
            if (url.includes('resid=') && url.includes('authkey=')) {
                const baseUrl = 'https://onedrive.live.com/embed?';
                const params = url.split('?')[1] || '';
                return `${baseUrl}${params}&width=480&height=360`;
            }

            // If we can't convert, try to use download parameter
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}download=1`;
        }

        return url;
    };

    const getThumbnailUrl = (album: PhotoAlbum): string => {
        // Check if cover_image_url exists
        if (album.cover_image_url &&
            !album.cover_image_url.includes('placehold') &&
            !album.cover_image_url.includes('placeholder') &&
            !album.cover_image_url.includes('data:image')) {

            // Try to extract Google Photos image URL
            const googleImageUrl = extractGooglePhotosImageUrl(album.cover_image_url);
            if (googleImageUrl) {
                return googleImageUrl;
            }

            // Handle OneDrive URLs
            if (album.cover_image_url.includes('1drv.ms') || album.cover_image_url.includes('onedrive.live.com')) {
                return convertOneDriveUrl(album.cover_image_url);
            }

            // Check if it's a direct image URL (ends with image extensions)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            const urlLower = album.cover_image_url.toLowerCase();
            const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));

            if (hasImageExtension || urlLower.startsWith('http')) {
                // Try to use it as is
                return album.cover_image_url;
            }
        }

        // Use SVG data URI for reliable placeholder
        return createPlaceholderSVG(album.title || 'Photo Album');
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        const album = albums.find(a => a.id === img.getAttribute('data-album-id'));

        // Fallback to SVG placeholder
        if (album) {
            img.src = createPlaceholderSVG(album.title || 'Photo Album');
        } else {
            img.src = createPlaceholderSVG('Photo Album');
        }
        img.onerror = null;
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
                                        src={getThumbnailUrl(album)}
                                        alt={album.title}
                                        data-album-id={album.id}
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
