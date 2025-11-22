
import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SidebarHeader } from '../../components/layout/SidebarHeader';
import { NavLink } from '../../components/NavLink';
import { GlobalSearch } from '../../components/search/GlobalSearch';
import { IconMenu, IconHome, IconUserCircle, IconMegaphone, IconQrCode, IconCalendar, IconDocument, IconPhoto, IconVideo, IconPhone, IconAdmin, IconLogout, IconExclamationTriangle, IconPoll, IconSearch } from '../../components/icons';
import { DashboardContent } from './DashboardContent';
import { ProfilePage } from './ProfilePage';
import { AnnouncementsPage } from './AnnouncementsPage';
import { VisitorInvitationPage } from './VisitorInvitationPage';
import { FacilityBookingPage } from './FacilityBookingPage';
import { DocumentsPage } from './DocumentsPage';
import { PhotoAlbumPage } from './PhotoAlbumPage';
import { VideoAlbumPage } from './VideoAlbumPage';
import { ContactsPage } from './ContactsPage';
import { IssueReportingPage } from './IssueReportingPage';
import { PollsPage } from './PollsPage';
import { AdminPanel } from '../admin/AdminPanel';

export type Page = 'dashboard' | 'profile' | 'announcements' | 'visitors' | 'booking' | 'documents' | 'photos' | 'videos' | 'contacts' | 'issues' | 'polls' | 'admin';

export const Dashboard: FC = () => {
    const { isAdmin, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSearchOpen, setSearchOpen] = useState(false);


    // Initialize page from local storage or default to 'dashboard'
    const [currentPage, setCurrentPage] = useState<Page>(() => {
        const savedPage = localStorage.getItem('tijani_current_page');
        // Validate that the saved page is a valid Page type (basic check)
        const validPages: Page[] = ['dashboard', 'profile', 'announcements', 'visitors', 'booking', 'documents', 'photos', 'videos', 'contacts', 'issues', 'polls', 'admin'];
        return (savedPage && validPages.includes(savedPage as Page)) ? (savedPage as Page) : 'dashboard';
    });

    // Keyboard shortcut for search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const navigateTo = (page: Page) => {
        setCurrentPage(page);
        localStorage.setItem('tijani_current_page', page);
        if (isSidebarOpen) setSidebarOpen(false);
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <IconHome className="h-6 w-6" />, adminOnly: false },
        { id: 'profile', label: 'My Profile', icon: <IconUserCircle className="h-6 w-6" />, adminOnly: false },
        { id: 'announcements', label: 'Announcements', icon: <IconMegaphone className="h-6 w-6" />, adminOnly: false },
        { id: 'visitors', label: 'Visitor Invitation', icon: <IconQrCode className="h-6 w-6" />, adminOnly: false },
        { id: 'booking', label: 'Facility Booking', icon: <IconCalendar className="h-6 w-6" />, adminOnly: false },
        { id: 'issues', label: 'Report an Issue', icon: <IconExclamationTriangle className="h-6 w-6" />, adminOnly: false },
        { id: 'polls', label: 'Community Polls', icon: <IconPoll className="h-6 w-6" />, adminOnly: false },
        { id: 'documents', label: 'Documents', icon: <IconDocument className="h-6 w-6" />, adminOnly: false },
        { id: 'photos', label: 'Photo Albums', icon: <IconPhoto className="h-6 w-6" />, adminOnly: false },
        { id: 'videos', label: 'Video Albums', icon: <IconVideo className="h-6 w-6" />, adminOnly: false },
        { id: 'contacts', label: 'Contacts', icon: <IconPhone className="h-6 w-6" />, adminOnly: false },
        { id: 'admin', label: 'Admin Panel', icon: <IconAdmin className="h-6 w-6" />, adminOnly: true },
    ] as const;

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardContent setCurrentPage={navigateTo} />;
            case 'profile': return <ProfilePage />;
            case 'announcements': return <AnnouncementsPage />;
            case 'visitors': return <VisitorInvitationPage />;
            case 'booking': return <FacilityBookingPage />;
            case 'documents': return <DocumentsPage />;
            case 'photos': return <PhotoAlbumPage />;
            case 'videos': return <VideoAlbumPage />;
            case 'contacts': return <ContactsPage />;
            case 'issues': return <IssueReportingPage />;
            case 'polls': return <PollsPage />;
            case 'admin':
                if (!isAdmin) {
                    return (
                        <div className="text-center p-8 bg-white rounded-lg shadow">
                            <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                            <p className="mt-4 text-gray-700">You do not have permission to access the Admin Panel.</p>
                        </div>
                    );
                }
                return <AdminPanel />;
            default: return <DashboardContent setCurrentPage={navigateTo} />;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('tijani_current_page');
        logout();
    };

    return (
        <div className="flex min-h-screen bg-brand-light-gray">
            <aside className={`bg-brand-dark fixed inset-y-0 left-0 z-30 w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
                <SidebarHeader />
                <nav className="mt-6">
                    {navItems.map(item => (!item.adminOnly || isAdmin) && (
                        <NavLink key={item.id} label={item.label} icon={item.icon} isActive={currentPage === item.id} onClick={() => navigateTo(item.id as Page)} />
                    ))}
                    <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
                        <NavLink label="Logout" icon={<IconLogout className="h-6 w-6" />} isActive={false} onClick={handleLogout} />
                    </div>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between p-4 bg-white shadow-md">
                    <span className="text-xl font-semibold text-brand-dark md:hidden">Tijani Ukay Connect</span>
                    <div className="hidden md:flex items-center space-x-4">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <IconSearch className="h-5 w-5 text-gray-600" />
                            <span className="text-sm text-gray-600">Search...</span>
                            <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-white border rounded">Ctrl+K</kbd>
                        </button>
                    </div>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden">
                        <IconMenu className="h-6 w-6 text-gray-600" />
                    </button>
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>

            {isSearchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
        </div>
    );
};
