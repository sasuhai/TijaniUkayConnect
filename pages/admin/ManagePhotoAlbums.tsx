
import React, { useMemo } from 'react';
import type { PhotoAlbum } from '../../types';
import { ManageGeneric } from './ManageGeneric';

export const ManagePhotoAlbums: React.FC = () => {
    const columns = useMemo(() => [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'cover_image_url', label: 'Cover Image' }], []);
    const formFields = useMemo(() => [
        { id: 'title', label: 'Title', type: 'text' },
        { id: 'description', label: 'Description (must include full album URL, e.g., https://photos.app.goo.gl/...)', type: 'textarea' },
        { id: 'cover_image_url', label: 'Cover Image URL (Optional) - For best results: OneDrive/Google Photos: Use </> Embed option and paste the src URL. Direct image URLs (.jpg, .png) also work. Leave blank for auto-generated placeholder.', type: 'text', optional: true },
    ], []);
    const textSearchColumns = useMemo(() => ['title', 'description'], []);
    return <ManageGeneric<PhotoAlbum> tableName="photo_albums" title="Manage Photo Albums" columns={columns} formFields={formFields} textSearchColumns={textSearchColumns} />;
};
