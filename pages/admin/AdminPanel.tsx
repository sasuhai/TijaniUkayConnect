
import React, { useState, FC } from 'react';
import { IconUsers, IconBuilding, IconDocument, IconMegaphone, IconPhoto, IconVideo, IconPhone, IconExclamationTriangle, IconPoll } from '../../components/icons';
import { ManageResidents } from './ManageResidents';
import { ManageFacilities } from './ManageFacilities';
import { ManageDocuments } from './ManageDocuments';
import { ManageAnnouncements } from './ManageAnnouncements';
import { ManagePhotoAlbums } from './ManagePhotoAlbums';
import { ManageVideoAlbums } from './ManageVideoAlbums';
import { ManageContacts } from './ManageContacts';
import { ManageIssues } from './ManageIssues';
import { ManagePolls } from './ManagePolls';
import { ManageSettings } from './ManageSettings';

type AdminPage = 'residents' | 'facilities' | 'documents' | 'announcements' | 'issues' | 'polls' | 'photos' | 'videos' | 'contacts' | 'settings';

export const AdminPanel: FC = () => {
    const [page, setPage] = useState<AdminPage>('residents');

    const adminPages: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
        { id: 'residents', label: 'Residents', icon: <IconUsers className="h-5 w-5 mr-2" /> },
        { id: 'facilities', label: 'Facilities', icon: <IconBuilding className="h-5 w-5 mr-2" /> },
        { id: 'documents', label: 'Documents', icon: <IconDocument className="h-5 w-5 mr-2" /> },
        { id: 'announcements', label: 'Announcements', icon: <IconMegaphone className="h-5 w-5 mr-2" /> },
        { id: 'issues', label: 'Issues', icon: <IconExclamationTriangle className="h-5 w-5 mr-2" /> },
        { id: 'polls', label: 'Polls', icon: <IconPoll className="h-5 w-5 mr-2" /> },
        { id: 'photos', label: 'Photo Albums', icon: <IconPhoto className="h-5 w-5 mr-2" /> },
        { id: 'videos', label: 'Video Albums', icon: <IconVideo className="h-5 w-5 mr-2" /> },
        { id: 'contacts', label: 'Contacts', icon: <IconPhone className="h-5 w-5 mr-2" /> },
        { id: 'settings', label: 'Settings', icon: <IconBuilding className="h-5 w-5 mr-2" /> },
    ];

    const renderAdminPage = () => {
        switch (page) {
            case 'residents': return <ManageResidents />;
            case 'facilities': return <ManageFacilities />;
            case 'documents': return <ManageDocuments />;
            case 'announcements': return <ManageAnnouncements />;
            case 'issues': return <ManageIssues />;
            case 'polls': return <ManagePolls />;
            case 'photos': return <ManagePhotoAlbums />;
            case 'videos': return <ManageVideoAlbums />;
            case 'contacts': return <ManageContacts />;
            case 'settings': return <ManageSettings />;
            default: return <ManageResidents />;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-6">Admin Panel</h1>
            <div className="flex flex-wrap space-x-2 border-b mb-6">
                {adminPages.map(p => (
                    <button key={p.id} onClick={() => setPage(p.id)}
                        className={`flex items-center py-2 px-4 mb-2 rounded-t-lg ${page === p.id ? 'border-b-2 border-brand-green font-semibold text-brand-green bg-green-50' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {p.icon} {p.label}
                    </button>
                ))}
            </div>
            {renderAdminPage()}
        </div>
    );
};
