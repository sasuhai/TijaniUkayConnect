
import React, { useMemo } from 'react';
import type { VideoAlbum } from '../../types';
import { ManageGeneric } from './ManageGeneric';

export const ManageVideoAlbums: React.FC = () => {
    const columns = useMemo(() => [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description (YouTube URL)' }, { key: 'thumbnail_url', label: 'Thumbnail' }], []);
    const formFields = useMemo(() => [{ id: 'title', label: 'Title', type: 'text' }, { id: 'description', label: 'Description (must include video URL for embedding)', type: 'textarea' }], []);
    const textSearchColumns = useMemo(() => ['title', 'description'], []);
    return <ManageGeneric<VideoAlbum> tableName="video_albums" title="Manage Video Albums" columns={columns} formFields={formFields} textSearchColumns={textSearchColumns} />;
};
