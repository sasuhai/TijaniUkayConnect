
import React, { FC, useState, useEffect } from 'react';
import * as firebase from '../../services/firebaseService';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/helpers';

interface Stats {
    totalResidents: number;
    activeResidents: number;
    pendingApprovals: number;
    totalBookings: number;
    totalIssues: number;
    openIssues: number;
    totalVisitors: number;
    totalFacilities: number;
}

export const AnalyticsDashboard: FC = () => {
    const [stats, setStats] = useState<Stats>({
        totalResidents: 0,
        activeResidents: 0,
        pendingApprovals: 0,
        totalBookings: 0,
        totalIssues: 0,
        openIssues: 0,
        totalVisitors: 0,
        totalFacilities: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Fetch all data in parallel
            const [
                profilesRes,
                bookingsRes,
                issuesRes,
                visitorsRes,
                facilitiesRes
            ] = await Promise.all([
                firebase.getAllProfiles(),
                firebase.getBookings(),
                firebase.getIssues(),
                firebase.getVisitorInvitations(),
                firebase.getFacilities()
            ]);

            // Calculate stats
            const profiles = profilesRes.data || [];
            const bookings = bookingsRes.data || [];
            const issues = issuesRes.data || [];
            const visitors = visitorsRes.data || [];
            const facilities = facilitiesRes.data || [];

            setStats({
                totalResidents: profiles.length,
                activeResidents: profiles.filter((p: any) => p.status === 'Active').length,
                pendingApprovals: profiles.filter((p: any) => p.status === 'Pending Approval').length,
                totalBookings: bookings.length,
                totalIssues: issues.length,
                openIssues: issues.filter((i: any) => i.status === 'New' || i.status === 'In Progress').length,
                totalVisitors: visitors.length,
                totalFacilities: facilities.length
            });

            // Recent activity (last 10 items combined)
            const recentItems: any[] = [];

            // Add recent bookings
            bookings.slice(0, 5).forEach((b: any) => {
                recentItems.push({
                    type: 'booking',
                    text: `${b.resident_name} booked a facility`,
                    date: b.created_at,
                    icon: '📅'
                });
            });

            // Add recent issues
            issues.slice(0, 5).forEach((i: any) => {
                recentItems.push({
                    type: 'issue',
                    text: `${i.resident_name} reported: ${i.title}`,
                    date: i.created_at,
                    icon: '🔧'
                });
            });

            // Sort by date and take top 10
            recentItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRecentActivity(recentItems.slice(0, 10));

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark">Analytics Dashboard</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Residents"
                    value={stats.totalResidents}
                    subtitle={`${stats.activeResidents} active`}
                    icon="👥"
                    color="blue"
                />
                <StatCard
                    title="Pending Approvals"
                    value={stats.pendingApprovals}
                    subtitle="Awaiting review"
                    icon="⏳"
                    color="yellow"
                />
                <StatCard
                    title="Total Bookings"
                    value={stats.totalBookings}
                    subtitle={`${stats.totalFacilities} facilities`}
                    icon="📅"
                    color="green"
                />
                <StatCard
                    title="Issues"
                    value={stats.totalIssues}
                    subtitle={`${stats.openIssues} open`}
                    icon="🔧"
                    color="red"
                />
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    {recentActivity.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-start space-x-3 text-sm">
                                    <span className="text-2xl">{activity.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-gray-900">{activity.text}</p>
                                        <p className="text-gray-500 text-xs">{formatDate(activity.date)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Quick Stats */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Overview</h3>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Active Residents"
                            value={stats.activeResidents}
                            max={stats.totalResidents}
                            color="green"
                        />
                        <ProgressBar
                            label="Open Issues"
                            value={stats.openIssues}
                            max={stats.totalIssues || 1}
                            color="red"
                        />
                        <div className="pt-4 border-t">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Total Visitor Invitations</span>
                                <span className="font-semibold">{stats.totalVisitors}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Available Facilities</span>
                                <span className="font-semibold">{stats.totalFacilities}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard: FC<{
    title: string;
    value: number;
    subtitle: string;
    icon: string;
    color: 'blue' | 'green' | 'yellow' | 'red';
}> = ({ title, value, subtitle, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        red: 'bg-red-100 text-red-800'
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{icon}</span>
                <span className={`px-3 py-1 rounded-full text-2xl font-bold ${colorClasses[color]}`}>
                    {value}
                </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
        </Card>
    );
};

// Progress Bar Component
const ProgressBar: FC<{
    label: string;
    value: number;
    max: number;
    color: 'green' | 'red';
}> = ({ label, value, max, color }) => {
    const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
    const colorClass = color === 'green' ? 'bg-green-500' : 'bg-red-500';

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold">{value} / {max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
