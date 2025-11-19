
import React, { useMemo } from 'react';
import type { Contact } from '../../types';
import { ManageGeneric } from './ManageGeneric';

export const ManageContacts: React.FC = () => {
    const columns = useMemo(() => [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'phone', label: 'Phone' }], []);
    const formFields = useMemo(() => [{ id: 'name', label: 'Name', type: 'text' }, { id: 'role', label: 'Role', type: 'text' }, { id: 'phone', label: 'Phone', type: 'tel' }, { id: 'email', label: 'Email (Optional)', type: 'email', optional: true }], []);
    const textSearchColumns = useMemo(() => ['name', 'role', 'phone', 'email'], []);
    return <ManageGeneric<Contact> tableName="contacts" title="Manage Contacts" columns={columns} formFields={formFields} textSearchColumns={textSearchColumns} />;
};
