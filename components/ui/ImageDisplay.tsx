
import React, { useState, useEffect } from 'react';
import { getStoredImage } from '../../services/firebaseService';
import { Spinner } from './Spinner';

interface ImageDisplayProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string | null;
    fallbackSrc?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
    src,
    fallbackSrc = 'https://placehold.co/600x400?text=No+Image',
    alt,
    className,
    ...props
}) => {
    const [displaySrc, setDisplaySrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const resolveImage = async () => {
            if (!src) {
                setDisplaySrc(null);
                return;
            }

            // Direct URL or Base64
            if (src.startsWith('http') || src.startsWith('data:')) {
                setDisplaySrc(src);
                return;
            }

            // Firestore Stored Image
            if (src.startsWith('firestore://')) {
                setLoading(true);
                try {
                    const base64Data = await getStoredImage(src);
                    if (isMounted) {
                        setDisplaySrc(base64Data);
                    }
                } catch (err) {
                    console.error("Failed to load image:", err);
                    setError(true);
                } finally {
                    if (isMounted) setLoading(false);
                }
                return;
            }

            // Fallback for unknown schemes
            setDisplaySrc(src);
        };

        resolveImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ minHeight: '150px' }}>
                <Spinner />
            </div>
        );
    }

    if (error || !displaySrc) {
        if (fallbackSrc) {
            return <img src={fallbackSrc} alt={alt || 'Fallback'} className={className} {...props} />;
        }
        return null;
    }

    return <img src={displaySrc} alt={alt} className={className} {...props} />;
};
