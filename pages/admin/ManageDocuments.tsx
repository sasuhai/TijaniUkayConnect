
import React, { useMemo } from 'react';
import type { CommunityDocument } from '../../types';
import { ManageGeneric } from './ManageGeneric';

export const ManageDocuments: React.FC = () => {
    const columns = useMemo(() => [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'file_url', label: 'File Link' }
    ], []);
    const formFields = useMemo(() => [
        { id: 'name', label: 'Document Name', type: 'text' },
        { id: 'description', label: 'Description', type: 'textarea' },
        { id: 'file_url', label: 'File URL', type: 'text' }
    ], []);
    const textSearchColumns = useMemo(() => ['name', 'description'], []);
    
    return <ManageGeneric<CommunityDocument>
        tableName="documents"
        title="Manage Documents"
        columns={columns}
        formFields={formFields}
        textSearchColumns={textSearchColumns}
    />;
};
