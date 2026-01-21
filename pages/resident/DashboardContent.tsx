import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Page } from './Dashboard';
import * as firebase from '../../services/firebaseService';
import type { Announcement, VisitorInvitation, Issue, IssueStatus, Facility } from '../../types';
import { toYyyyMmDd, formatDateTime, formatDate } from '../../utils/helpers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

const IssueStatusBadge: FC<{ status: IssueStatus }> = ({ status }) => {
    const statusClasses = {
        'New': 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        'Resolved': 'bg-green-100 text-green-800',
        'Closed': 'bg-gray-100 text-gray-800',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClasses[status]}`}>{status}</span>;
};

export const DashboardContent: FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { user } = useAuth();

    type NextBooking = {
        id: string;
        booking_date: string;
        booking_slot: string;
        facility_id: string;
        facilityName?: string;
    };

    type ActivePollData = {
        question: string;
        topOption: string;
        topOptionPercentage: number;
    }

    const [latestAnnouncements, setLatestAnnouncements] = useState<Pick<Announcement, 'id' | 'title' | 'content'>[]>([]);
    const [nextBookings, setNextBookings] = useState<NextBooking[]>([]);
    const [upcomingVisitors, setUpcomingVisitors] = useState<Pick<VisitorInvitation, 'id' | 'visitor_name' | 'visit_date_time'>[]>([]);
    const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
    const [facilityAvailability, setFacilityAvailability] = useState<{ name: string, slotsLeft: number }[]>([]);
    const [activePoll, setActivePoll] = useState<ActivePollData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;

        const fetchDashboardData = async () => {
            // Only show loading spinner if we don't have data yet (initial load)
            if (latestAnnouncements.length === 0 && nextBookings.length === 0) {
                setLoading(true);
            }

            const timeoutPromise = new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("Fetch timeout")), 5000)
            );

            try {
                const nowISO = new Date().toISOString();
                const today = toYyyyMmDd(new Date());

                await Promise.race([
                    (async () => {
                        // Fetch all data in parallel
                        const [announcementRes, bookingsRes, visitorRes, issuesRes, facilitiesRes, todaysBookingsRes, pollsRes] = await Promise.all([
                            firebase.getAnnouncements(),
                            firebase.getBookings(undefined, user.id),
                            firebase.getVisitorInvitations(user.id),
                            firebase.getIssues(user.id),
                            firebase.getFacilities(),
                            firebase.getBookings(),
                            firebase.getPolls()
                        ]);

                        if (!isMounted) return;

                        // Process announcements - already sorted in Firebase service
                        if (announcementRes.data) {
                            setLatestAnnouncements(announcementRes.data.slice(0, 4).map((a: any) => ({
                                id: a.id,
                                title: a.title,
                                content: a.content
                            })));
                        }

                        // Process bookings - filter future bookings
                        if (bookingsRes.data && facilitiesRes.data) {
                            const now = new Date();
                            const facilityMap = new Map<string, string>(facilitiesRes.data.map((f: any) => [f.id, f.name] as [string, string]));

                            const upcomingBookings = bookingsRes.data
                                .filter((b: any) => {
                                    const bookingDate = b.booking_date >= today;
                                    if (!bookingDate) return false;
                                    const bookingDateTime = new Date(`${b.booking_date}T${b.booking_slot}`);
                                    return bookingDateTime > now;
                                })
                                .map((b: any) => ({
                                    ...b,
                                    facilityName: facilityMap.get(b.facility_id)
                                }));

                            setNextBookings(upcomingBookings.slice(0, 3));
                        }

                        // Process visitors - filter upcoming
                        if (visitorRes.data) {
                            const upcoming = visitorRes.data
                                .filter((v: any) => v.visit_date_time >= nowISO)
                                .slice(0, 4);
                            setUpcomingVisitors(upcoming);
                        }

                        // Process issues - already sorted in Firebase service
                        if (issuesRes.data) {
                            setRecentIssues(issuesRes.data.slice(0, 3) as Issue[]);
                        }

                        // Process facility availability for today
                        if (facilitiesRes.data && todaysBookingsRes.data) {
                            const totalSlotsPerDay = 18; // 6:00 to 23:00
                            const todaysOnly = todaysBookingsRes.data.filter((b: any) => b.booking_date === today);

                            const availability = facilitiesRes.data.map((facility: any) => {
                                const bookingsCount = todaysOnly.filter((b: any) => b.facility_id === facility.id).length;
                                const slotsLeft = Math.max(0, totalSlotsPerDay - bookingsCount);
                                return { name: facility.name, slotsLeft };
                            });
                            setFacilityAvailability(availability.slice(0, 4));
                        }

                        // Process polls - find active poll and calculate votes
                        if (pollsRes.data && pollsRes.data.length > 0) {
                            // Find active polls (end_date >= now)
                            const activePolls = pollsRes.data.filter((p: any) => {
                                return p.end_date && new Date(p.end_date) >= new Date(nowISO);
                            });

                            if (activePolls.length > 0) {
                                const poll = activePolls[0];
                                // Get all poll votes
                                const { data: allVotes } = await firebase.getPollVotes(poll.id);

                                if (poll.options && poll.options.length > 0) {
                                    // Count votes per option
                                    const voteCounts = new Map();
                                    poll.options.forEach((opt: any) => voteCounts.set(opt.id, 0));

                                    if (allVotes) {
                                        allVotes.forEach((vote: any) => {
                                            const current = voteCounts.get(vote.option_id) || 0;
                                            voteCounts.set(vote.option_id, current + 1);
                                        });
                                    }

                                    // Find top option
                                    let maxVotes = 0;
                                    let topOptionText = poll.options[0].text;
                                    let totalVotes = 0;

                                    poll.options.forEach((opt: any) => {
                                        const votes = voteCounts.get(opt.id) || 0;
                                        totalVotes += votes;
                                        if (votes > maxVotes) {
                                            maxVotes = votes;
                                            topOptionText = opt.text;
                                        }
                                    });

                                    setActivePoll({
                                        question: poll.question,
                                        topOption: topOptionText,
                                        topOptionPercentage: totalVotes > 0 ? Math.round((maxVotes / totalVotes) * 100) : 0
                                    });
                                }
                            }
                        }
                    })(),
                    timeoutPromise
                ]);

            } catch (error) {
                console.warn("Dashboard data fetch incomplete or timed out:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDashboardData();
        return () => { isMounted = false; };
    }, [user?.id]);


    const SkeletonLoader: FC = () => (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-2">Welcome, {user?.full_name}!</h1>
            <p className="text-lg text-gray-600">Here's what's happening in your community today.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Row 1 */}
                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Latest Announcements</h3>
                    <div className="flex-grow">
                        {loading ? <SkeletonLoader /> : (
                            latestAnnouncements.length > 0 ? (
                                <ul className="space-y-4">
                                    {latestAnnouncements.slice(0, 3).map(ann => (
                                        <li key={ann.id}>
                                            <h4 className="font-semibold text-gray-800 truncate">{ann.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1 break-words">
                                                {ann.content.substring(0, 100)}
                                                {ann.content.length > 100 && (
                                                    <>...<button onClick={() => setCurrentPage('announcements')} className="text-sm text-brand-green hover:underline ml-1 font-semibold">more</button></>
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-gray-500">No new announcements.</p>
                        )}
                    </div>
                    {latestAnnouncements.length > 3 && (
                        <div className="mt-4">
                            <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('announcements')}>View All</Button>
                        </div>
                    )}
                </Card>

                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Next Bookings</h3>
                    <div className="flex-grow">
                        {loading ? <SkeletonLoader /> : (
                            nextBookings.length > 0 ? (
                                <ul className="space-y-2">
                                    {nextBookings.map(b =>
                                        <li key={b.id} className="text-gray-700 text-sm">
                                            <span className="font-semibold">{b.facilityName}</span> on {formatDateTime(b.booking_date + 'T' + b.booking_slot)}
                                        </li>
                                    )}
                                </ul>
                            ) : <p className="text-gray-500">You have no upcoming bookings.</p>
                        )}
                    </div>
                    {nextBookings.length > 3 && (
                        <div className="mt-4">
                            <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('booking')}>View All</Button>
                        </div>
                    )}
                </Card>

                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Upcoming Visitors</h3>
                    <div className="flex-grow">
                        {loading ? <SkeletonLoader /> : (
                            upcomingVisitors.length > 0 ? (
                                <ul className="space-y-2">
                                    {upcomingVisitors.slice(0, 3).map(v =>
                                        <li key={v.id} className="text-gray-700">
                                            <span className="font-semibold">{v.visitor_name}</span> on {formatDate(v.visit_date_time)}
                                        </li>
                                    )}
                                </ul>
                            ) : <p className="text-gray-500">No upcoming visitors.</p>
                        )}
                    </div>
                    {upcomingVisitors.length > 3 && (
                        <div className="mt-4">
                            <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('visitors')}>View All</Button>
                        </div>
                    )}
                </Card>

                {/* Row 2 */}
                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Recent Issues</h3>
                    <div className="flex-grow">
                        {loading ? <SkeletonLoader /> : (
                            recentIssues.length > 0 ? (
                                <ul className="space-y-3">
                                    {recentIssues.map(issue => (
                                        <li key={issue.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{issue.title}</p>
                                                <p className="text-xs text-gray-500">{formatDate(issue.created_at)}</p>
                                            </div>
                                            <IssueStatusBadge status={issue.status} />
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-gray-500">No issues reported recently.</p>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('issues')}>Report Issue</Button>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Facility Availability (Today)</h3>
                    <div className="flex-grow">
                        {loading ? <SkeletonLoader /> : (
                            <ul className="space-y-3">
                                {facilityAvailability.map(f => (
                                    <li key={f.name} className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700">{f.name}</span>
                                        <span className={`text-sm font-bold ${f.slotsLeft > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {f.slotsLeft > 0 ? `${f.slotsLeft} slots left` : 'Fully Booked'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('booking')}>Book Now</Button>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col">
                    <h3 className="font-bold text-xl mb-4 text-brand-green">Community Polls</h3>
                    <div className="flex-grow">
                        {activePoll ? (
                            <div className="bg-brand-light-gray p-4 rounded-lg mb-2">
                                <p className="font-semibold text-brand-dark mb-2">{activePoll.question}</p>
                                <div className="space-y-1">
                                    <div className="w-full bg-gray-300 rounded-full h-2">
                                        <div className="bg-brand-green h-2 rounded-full" style={{ width: `${activePoll.topOptionPercentage}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right">{activePoll.topOptionPercentage}% votes for '{activePoll.topOption}'</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 py-4">No active polls at the moment.</p>
                        )}
                        <p className="text-sm text-gray-600">Participate in community decisions and make your voice heard.</p>
                    </div>
                    <div className="mt-4">
                        <Button variant="secondary" className="text-sm py-1 px-3" onClick={() => setCurrentPage('polls')}>View All Polls</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
