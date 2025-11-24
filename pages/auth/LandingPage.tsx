import React, { FC, useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../services/supabaseService';
import { Settings, Contact, VideoAlbum } from '../../types';
import heroBg from '../../assets/landing-bg.jpg';
import {
    IconQrCode,
    IconCalendar,
    IconMegaphone,
    IconExclamationTriangle,
    IconDocument,
    IconPoll,
    IconHome,
    IconUsers,
    IconAdmin,
    IconChevronLeft,
    IconChevronRight
} from '../../components/icons';

export const LandingPage: FC<{ onLogin: () => void; onRegister: () => void }> = ({ onLogin, onRegister }) => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [managementContact, setManagementContact] = useState<Contact | null>(null);
    const [videos, setVideos] = useState<VideoAlbum[]>([]);
    const [scrolled, setScrolled] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 350;
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer || videos.length === 0) return;

        let animationFrameId: number;

        const autoScroll = () => {
            if (!isPaused && scrollContainer) {
                if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
                    scrollContainer.scrollLeft = 0;
                } else {
                    scrollContainer.scrollLeft += 1;
                }
            }
            animationFrameId = requestAnimationFrame(autoScroll);
        };

        animationFrameId = requestAnimationFrame(autoScroll);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, videos]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('settings')
                    .select('resident_name, resident_address, app_name, information1, information2, videolink, banner1')
                    .limit(1);

                if (data && data.length > 0) {
                    setSettings(data[0] as Settings);
                }

                const { data: contactData, error: contactError } = await supabase
                    .from('contacts')
                    .select('*')
                    .or('role.ilike.%Management%,name.ilike.%Management%')
                    .limit(1);

                if (contactError) {
                    console.error('Error fetching contact:', contactError);
                } else if (contactData && contactData.length > 0) {
                    setManagementContact(contactData[0] as Contact);
                }

                const { data: videoData } = await supabase
                    .from('video_albums')
                    .select('*')
                    .order('id', { ascending: false })
                    .limit(15);

                if (videoData) {
                    setVideos(videoData as VideoAlbum[]);
                }
            } catch (e) {
                // Silent error - will use fallback values
            }
        };
        fetchSettings();

        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const appName = settings?.app_name || 'Tijani Ukay Connect';
    const communityName = settings?.resident_name || 'Tijani Ukay';

    // Helper to extract YouTube ID
    const getYoutubeId = (url: string | null | undefined) => {
        if (!url) return 'xumK_60qpTw'; // Default video
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : 'xumK_60qpTw';
    };

    const videoId = getYoutubeId(settings?.videolink);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* --- NAVIGATION --- */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="bg-brand-green p-1.5 rounded-lg">
                            <IconHome className="h-6 w-6 text-white" />
                        </div>
                        <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-brand-dark' : 'text-white'}`}>
                            {appName}
                        </span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        {['Features', 'About', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollToSection(item.toLowerCase())}
                                className={`text-sm font-medium hover:text-brand-green transition-colors ${scrolled ? 'text-gray-600' : 'text-white/90'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onLogin}
                            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${scrolled ? 'text-brand-green hover:bg-brand-green/10' : 'text-white hover:bg-white/10'}`}
                        >
                            Log In
                        </button>
                        <Button
                            onClick={onRegister}
                            className="bg-brand-green hover:bg-brand-dark text-white px-5 py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="relative h-screen flex items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center z-0 transform scale-105 transition-transform duration-[20s] hover:scale-100"
                    style={{ backgroundImage: `url('${heroBg}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-brand-dark/90 z-10" />

                <div className="relative z-20 max-w-5xl mx-auto px-4 text-center">
                    <div className="inline-block mb-6 px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-lg md:text-2xl font-medium animate-fade-in-down">
                        ✨ {settings?.resident_name || 'Tijani Ukay'} @ {settings?.resident_address || 'Ampang'}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight drop-shadow-xl animate-fade-in-down">
                        {settings?.banner1 ? (
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light-green to-white">
                                {settings.banner1}
                            </span>
                        ) : (
                            <>
                                Elevate Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light-green to-white">
                                    Community Living
                                </span>
                            </>
                        )}
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        {settings?.information1 || 'Experience seamless visitor management, facility bookings, and community engagement in one beautiful app.'}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <Button
                            onClick={onLogin}
                            className="w-full sm:w-auto px-8 py-4 bg-brand-green hover:bg-brand-light-green text-white text-lg font-bold rounded-xl shadow-glow-green transition-all transform hover:scale-105"
                        >
                            Resident Login
                        </Button>
                        <Button
                            onClick={() => scrollToSection('features')}
                            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-lg font-semibold rounded-xl transition-all transform hover:scale-105"
                        >
                            Explore Features
                        </Button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
                    <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </header>

            {/* --- FEATURES SECTION --- */}
            <section id="features" className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-brand-green font-semibold tracking-wide uppercase text-sm mb-2">Key Features</h2>
                        <h3 className="text-4xl font-bold text-gray-900 mb-4">Everything you need in one place</h3>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            Designed to make your life at {communityName} easier, safer, and more connected.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<IconQrCode className="w-8 h-8 text-white" />}
                            title="Smart Visitor Pass"
                            description="Generate QR codes for your guests instantly. Seamless entry at the guardhouse with real-time notifications."
                            color="bg-blue-500"
                        />
                        <FeatureCard
                            icon={<IconCalendar className="w-8 h-8 text-white" />}
                            title="Facility Booking"
                            description="Reserve the clubhouse, BBQ pit, or tennis court in seconds. View availability and manage your bookings effortlessly."
                            color="bg-purple-500"
                        />
                        <FeatureCard
                            icon={<IconExclamationTriangle className="w-8 h-8 text-white" />}
                            title="Issue Reporting"
                            description="Spot a problem? Snap a photo and report maintenance issues directly to management with priority tracking."
                            color="bg-red-500"
                        />
                        <FeatureCard
                            icon={<IconMegaphone className="w-8 h-8 text-white" />}
                            title="Announcements"
                            description="Never miss important community updates. Receive instant alerts for maintenance, events, and notices."
                            color="bg-yellow-500"
                        />
                        <FeatureCard
                            icon={<IconDocument className="w-8 h-8 text-white" />}
                            title="Digital Documents"
                            description="Access important forms, bylaws, and meeting minutes anytime, anywhere. No more paper clutter."
                            color="bg-green-500"
                        />
                        <FeatureCard
                            icon={<IconPoll className="w-8 h-8 text-white" />}
                            title="Community Polls"
                            description="Have your say in community matters. Participate in polls and surveys to help shape a better living environment."
                            color="bg-indigo-500"
                        />
                    </div>
                </div>
            </section>

            {/* --- VIDEO TOUR SECTION --- */}
            <section className="py-20 bg-brand-dark relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Experience {communityName}</h2>

                    {videos.length > 0 ? (
                        <div
                            className="relative w-full group"
                            onMouseEnter={() => setIsPaused(true)}
                            onMouseLeave={() => setIsPaused(false)}
                        >
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
                                aria-label="Scroll left"
                            >
                                <IconChevronLeft className="w-6 h-6" />
                            </button>

                            <div
                                ref={scrollContainerRef}
                                className="flex overflow-x-auto gap-6 pb-8 px-4 scrollbar-hide snap-x snap-mandatory"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {videos.map((video, index) => {
                                    const videoId = getYoutubeId(video.description);
                                    return (
                                        <div key={`${video.id}-${index}`} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                                            <a
                                                href={video.description?.match(/https?:\/\/[^\s]+/) ? video.description.match(/https?:\/\/[^\s]+/)?.[0] : '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative block w-full pb-[56.25%] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-black"
                                            >
                                                <img
                                                    src={video.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                                    alt={video.title}
                                                    className="absolute top-0 left-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border-2 border-white/50">
                                                        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                                                    <h3 className="text-white font-bold text-sm truncate">{video.title}</h3>
                                                </div>
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => scroll('right')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
                                aria-label="Scroll right"
                            >
                                <IconChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full max-w-4xl mx-auto">
                            <a
                                href={`https://www.youtube.com/watch?v=${videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative block w-full pb-[56.25%] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-black"
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                                    alt={`${communityName} Video Tour`}
                                    className="absolute top-0 left-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border-2 border-white/50">
                                        <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium flex items-center">
                                    <span className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                                    Watch on YouTube
                                </div>
                            </a>
                        </div>
                    )}
                    <p className="text-white/60 mt-6 text-sm">Watch the video to see our beautiful community in action.</p>
                </div>
            </section>

            {/* --- APP SHOWCASE SECTION --- */}
            <section className="py-24 bg-gray-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2 space-y-8">
                            <h3 className="text-4xl font-bold text-gray-900 leading-tight">
                                Manage your home from <br />
                                <span className="text-brand-green">the palm of your hand</span>
                            </h3>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                {appName} brings modern convenience to your doorstep. Whether you're inviting friends over for a weekend party or reporting a street light issue, it's all just a tap away.
                            </p>

                            <div className="space-y-4">
                                <CheckItem text="Real-time notifications for visitor arrivals" />
                                <CheckItem text="Secure and private data handling" />
                                <CheckItem text="Direct line to management office" />
                                <CheckItem text="Accessible on any device" />
                            </div>

                            <Button onClick={onRegister} className="mt-4 bg-brand-dark text-white px-8 py-3 rounded-lg shadow-lg hover:bg-gray-800 transition-colors">
                                Join the Community
                            </Button>
                        </div>

                        <div className="lg:w-1/2 relative">
                            {/* Abstract decorative blobs */}
                            <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-green/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />

                            {/* Mockup Container */}
                            <div className="relative bg-white rounded-3xl shadow-2xl border-8 border-gray-900 overflow-hidden max-w-sm mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                {/* Mockup Header */}
                                <div className="bg-gray-900 h-8 flex items-center justify-center">
                                    <div className="w-16 h-4 bg-black rounded-b-xl" />
                                </div>
                                {/* Mockup Screen Content (Simulated Dashboard) */}
                                <div className="bg-gray-50 h-[600px] p-4 flex flex-col space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="h-8 w-8 bg-gray-200 rounded-full" />
                                        <div className="h-4 w-24 bg-gray-200 rounded" />
                                    </div>
                                    <div className="bg-brand-green h-32 rounded-xl shadow-lg flex items-center justify-center text-white p-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">Welcome Home</div>
                                            <div className="text-sm opacity-80">No 9 Jalan Tijani 2/A</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white p-4 rounded-xl shadow-sm h-24 flex flex-col justify-center items-center space-y-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                <IconQrCode className="w-5 h-5" />
                                            </div>
                                            <div className="text-xs font-medium">Visitor Pass</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl shadow-sm h-24 flex flex-col justify-center items-center space-y-2">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                                <IconCalendar className="w-5 h-5" />
                                            </div>
                                            <div className="text-xs font-medium">Bookings</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm flex-1">
                                        <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
                                        <div className="space-y-3">
                                            <div className="h-12 bg-gray-50 rounded-lg border border-gray-100" />
                                            <div className="h-12 bg-gray-50 rounded-lg border border-gray-100" />
                                            <div className="h-12 bg-gray-50 rounded-lg border border-gray-100" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- MANAGEMENT & ANALYTICS SECTION --- */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-xl mb-4">
                            <IconAdmin className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Insights for Management</h2>
                        <p className="text-xl text-gray-500 max-w-3xl mx-auto">
                            Empower your management team with real-time data and comprehensive reports to optimize community operations.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <div className="bg-white w-16 h-16 rounded-xl shadow-sm flex items-center justify-center mb-6">
                                <IconPoll className="w-9 h-9 text-brand-green" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Dashboard</h3>
                            <p className="text-gray-600 mb-4">
                                Monitor community health at a glance. Track active visitors, facility occupancy, and pending issues in real-time.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center">• <span className="ml-2">Live visitor counts</span></li>
                                <li className="flex items-center">• <span className="ml-2">Facility booking status</span></li>
                                <li className="flex items-center">• <span className="ml-2">Recent activity feed</span></li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <div className="bg-white w-16 h-16 rounded-xl shadow-sm flex items-center justify-center mb-6">
                                <IconDocument className="w-9 h-9 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Comprehensive Reports</h3>
                            <p className="text-gray-600 mb-4">
                                Generate detailed monthly reports to analyze trends and make informed decisions for future planning.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center">• <span className="ml-2">Visitor traffic analysis</span></li>
                                <li className="flex items-center">• <span className="ml-2">Facility utilization rates</span></li>
                                <li className="flex items-center">• <span className="ml-2">Issue resolution metrics</span></li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <div className="bg-white w-16 h-16 rounded-xl shadow-sm flex items-center justify-center mb-6">
                                <IconUsers className="w-9 h-9 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Resident Engagement</h3>
                            <p className="text-gray-600 mb-4">
                                Understand your community better. Track poll participation and announcement reach to improve engagement.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center">• <span className="ml-2">Poll voting statistics</span></li>
                                <li className="flex items-center">• <span className="ml-2">Announcement read receipts</span></li>
                                <li className="flex items-center">• <span className="ml-2">Active user trends</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- COMMUNITY VALUES SECTION --- */}
            <section id="about" className="py-20 bg-brand-dark text-white relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-green blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose {appName}?</h2>
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                            Building a harmonious and well-managed neighborhood through technology.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 text-green-400">
                                <IconQrCode className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Enhanced Security</h3>
                            <p className="text-gray-400 text-sm">Streamlined visitor management ensures only authorized guests enter the premises.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                                <IconHome className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Modern Convenience</h3>
                            <p className="text-gray-400 text-sm">Book facilities and access documents instantly from your smartphone.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400">
                                <IconUsers className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Community First</h3>
                            <p className="text-gray-400 text-sm">Stay connected with neighbors and management through polls and announcements.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4 text-yellow-400">
                                <IconAdmin className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Efficient Management</h3>
                            <p className="text-gray-400 text-sm">Data-driven insights help the management office serve you better.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA SECTION --- */}
            <section className="py-24 bg-white text-center">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to get started?</h2>
                    <p className="text-xl text-gray-600 mb-10">
                        Join your neighbors and experience the future of community living today.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Button
                            onClick={onRegister}
                            className="bg-brand-green hover:bg-brand-dark text-white px-10 py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
                        >
                            Create Account
                        </Button>
                        <Button
                            onClick={onLogin}
                            className="!bg-white border-2 border-gray-200 hover:!border-brand-green !text-gray-700 hover:!text-brand-green px-10 py-4 rounded-xl text-lg font-bold transition-all"
                        >
                            Log In
                        </Button>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer id="contact" className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <IconHome className="h-6 w-6 text-brand-green" />
                                <span className="text-xl font-bold text-white">{appName}</span>
                            </div>


                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                            <ul className="space-y-2 text-sm">
                                <li><button onClick={() => scrollToSection('features')} className="hover:text-brand-green">Features</button></li>
                                <li><button onClick={() => scrollToSection('about')} className="hover:text-brand-green">About Us</button></li>
                                <li><button onClick={onLogin} className="hover:text-brand-green">Login</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold mb-4">Contact</h4>
                            <ul className="space-y-2 text-sm">
                                <li>{managementContact?.name || 'Management Office'}</li>
                                {managementContact?.role && <li className="text-gray-500 text-xs">{managementContact.role}</li>}
                                <li>{managementContact?.email || 'support@tijaniukay.com'}</li>
                                <li>{managementContact?.phone || '+60 3-1234 5678'}</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-sm text-center">
                        {settings?.information2 || `© ${new Date().getFullYear()} ${communityName}. All rights reserved.`}
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- SUBCOMPONENTS ---

const FeatureCard: FC<{ icon: React.ReactNode; title: string; description: string; color: string }> = ({ icon, title, description, color }) => (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
        <div className={`${color} w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
);

const CheckItem: FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <span className="text-gray-700 font-medium">{text}</span>
    </div>
);
