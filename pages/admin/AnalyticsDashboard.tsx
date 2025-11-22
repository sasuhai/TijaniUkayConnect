import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalyticsData {
    totalResidents: number;
    activeResidents: number;
    pendingResidents: number;
    totalBookings: number;
    totalIssues: number;
    resolvedIssues: number;
    openIssues: number;
    bookingsByFacility: { name: string; count: number }[];
    issuesByCategory: { name: string; count: number }[];
    issuesByPriority: { name: string; count: number }[];
    recentActivity: { date: string; bookings: number; issues: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalyticsDashboard: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Calculate date range
            const now = new Date();
            const startDate = new Date();
            if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
            else if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
            else startDate.setFullYear(now.getFullYear() - 1);

            // Fetch all data in parallel
            const [
                residentsRes,
                bookingsRes,
                issuesRes,
                facilitiesRes
            ] = await Promise.all([
                supabase.from('profiles').select('status'),
                supabase.from('bookings').select('facility_id, booking_date').gte('booking_date', startDate.toISOString().split('T')[0]),
                supabase.from('issues').select('category, status, priority, created_at').gte('created_at', startDate.toISOString()),
                supabase.from('facilities').select('id, name')
            ]);

            const residents = residentsRes.data || [];
            const bookings = bookingsRes.data || [];
            const issues = issuesRes.data || [];
            const facilities = facilitiesRes.data || [];

            // Process residents
            const totalResidents = residents.length;
            const activeResidents = residents.filter(r => r.status === 'Active').length;
            const pendingResidents = residents.filter(r => r.status === 'Pending Approval').length;

            // Process bookings
            const totalBookings = bookings.length;
            const bookingsByFacility = facilities.map(f => ({
                name: f.name,
                count: bookings.filter(b => b.facility_id === f.id).length
            })).filter(f => f.count > 0);

            // Process issues
            const totalIssues = issues.length;
            const resolvedIssues = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
            const openIssues = totalIssues - resolvedIssues;

            const issuesByCategory = ['Maintenance', 'Security', 'Landscaping', 'Facilities', 'Other'].map(cat => ({
                name: cat,
                count: issues.filter(i => i.category === cat).length
            })).filter(c => c.count > 0);

            const issuesByPriority = ['Low', 'Medium', 'High', 'Critical'].map(pri => ({
                name: pri,
                count: issues.filter(i => i.priority === pri).length
            })).filter(p => p.count > 0);

            // Recent activity (last 7 days)
            const recentActivity = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                recentActivity.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    bookings: bookings.filter(b => b.booking_date === dateStr).length,
                    issues: issues.filter(i => i.created_at.startsWith(dateStr)).length
                });
            }

            setAnalytics({
                totalResidents,
                activeResidents,
                pendingResidents,
                totalBookings,
                totalIssues,
                resolvedIssues,
                openIssues,
                bookingsByFacility,
                issuesByCategory,
                issuesByPriority,
                recentActivity
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            showToast('Failed to load analytics', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = () => {
        if (!analytics) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Title
        doc.setFontSize(20);
        doc.text('Analytics Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Period: Last ${dateRange}`, pageWidth / 2, 35, { align: 'center' });

        let yPos = 45;

        // Summary Statistics
        doc.setFontSize(14);
        doc.text('Summary Statistics', 14, yPos);
        yPos += 10;

        autoTable(doc, {
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
                ['Total Residents', analytics.totalResidents.toString()],
                ['Active Residents', analytics.activeResidents.toString()],
                ['Pending Approvals', analytics.pendingResidents.toString()],
                ['Total Bookings', analytics.totalBookings.toString()],
                ['Total Issues', analytics.totalIssues.toString()],
                ['Resolved Issues', analytics.resolvedIssues.toString()],
                ['Open Issues', analytics.openIssues.toString()],
            ],
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Facility Bookings
        if (analytics.bookingsByFacility.length > 0) {
            doc.text('Bookings by Facility', 14, yPos);
            yPos += 10;

            autoTable(doc, {
                startY: yPos,
                head: [['Facility', 'Bookings']],
                body: analytics.bookingsByFacility.map(f => [f.name, f.count.toString()]),
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
        }

        // Save PDF
        doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Report exported successfully!', 'success');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner />
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-dark">Analytics Dashboard</h1>
                <div className="flex space-x-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                        <option value="year">Last Year</option>
                    </select>
                    <Button onClick={exportToPDF}>📄 Export PDF</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Residents</p>
                            <p className="text-3xl font-bold text-brand-dark">{analytics.totalResidents}</p>
                        </div>
                        <div className="text-4xl">👥</div>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                        {analytics.activeResidents} active, {analytics.pendingResidents} pending
                    </p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Bookings</p>
                            <p className="text-3xl font-bold text-brand-dark">{analytics.totalBookings}</p>
                        </div>
                        <div className="text-4xl">📅</div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Last {dateRange}</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Issues</p>
                            <p className="text-3xl font-bold text-brand-dark">{analytics.totalIssues}</p>
                        </div>
                        <div className="text-4xl">🔧</div>
                    </div>
                    <p className="text-sm text-orange-600 mt-2">{analytics.openIssues} open</p>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Resolution Rate</p>
                            <p className="text-3xl font-bold text-brand-dark">
                                {analytics.totalIssues > 0 ? Math.round((analytics.resolvedIssues / analytics.totalIssues) * 100) : 0}%
                            </p>
                        </div>
                        <div className="text-4xl">✅</div>
                    </div>
                    <p className="text-sm text-green-600 mt-2">{analytics.resolvedIssues} resolved</p>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Recent Activity (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.recentActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="bookings" stroke="#10b981" name="Bookings" />
                            <Line type="monotone" dataKey="issues" stroke="#ef4444" name="Issues" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                {/* Bookings by Facility */}
                {analytics.bookingsByFacility.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-xl font-semibold mb-4">Bookings by Facility</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.bookingsByFacility}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                {/* Issues by Category */}
                {analytics.issuesByCategory.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-xl font-semibold mb-4">Issues by Category</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.issuesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => entry.name}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {analytics.issuesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                {/* Issues by Priority */}
                {analytics.issuesByPriority.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-xl font-semibold mb-4">Issues by Priority</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.issuesByPriority}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                )}
            </div>
        </div>
    );
};
