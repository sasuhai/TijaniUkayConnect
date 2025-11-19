
import React, { useMemo } from 'react';
import type { Announcement } from '../../types';
import { ManageGeneric } from './ManageGeneric';

export const ManageAnnouncements: React.FC = () => {
    const columns = useMemo(() => [{ key: 'title', label: 'Title' }, { key: 'content', label: 'Content' }], []);
    const formFields = useMemo(() => [{ id: 'title', label: 'Title', type: 'text' }, { id: 'content', label: 'Content', type: 'textarea' }, { id: 'attachment_url', label: 'Attachment URL (Optional)', type: 'text', optional: true }], []);
    const textSearchColumns = useMemo(() => ['title', 'content'], []);
    return <ManageGeneric<Announcement> tableName="announcements" title="Manage Announcements" columns={columns} formFields={formFields} textSearchColumns={textSearchColumns} />;
};
