import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
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
    totalVisitors: number;
    bookingsByFacility: { name: string; count: number }[];
    issuesByCategory: { name: string; count: number }[];
    issuesByPriority: { name: string; count: number }[];
    activityData: { date: string; bookings: number; issues: number; visitors: number }[];
}

type ViewMode = 'week' | 'month' | 'year' | 'all';
type DataScope = 'my' | 'all';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AnalyticsDashboard: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [dataScope, setDataScope] = useState<DataScope>('all');

    // Chart series toggles
    const [showBookings, setShowBookings] = useState(true);
    const [showIssues, setShowIssues] = useState(true);
    const [showVisitors, setShowVisitors] = useState(true);

    // For week view: track which week (0 = current week, 1 = last week, etc.)
    const [weekOffset, setWeekOffset] = useState(0);

    // For month view: track which month
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // For year view: track which year
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchAnalytics();
    }, [viewMode, weekOffset, selectedMonth, selectedYear, dataScope]);

    const getDateRange = () => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (viewMode) {
            case 'week':
                // Weekly data for last 3 months (12 weeks)
                startDate = new Date(now);
                startDate.setDate(now.getDate() - (weekOffset * 7) - 7 * 12);
                endDate = new Date(now);
                endDate.setDate(now.getDate() - (weekOffset * 7));
                break;

            case 'month':
                // Daily data for selected month
                startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
                break;

            case 'year':
                // Monthly data for selected year
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31);
                break;

            case 'all':
                // All monthly data
                startDate = new Date(2020, 0, 1); // Start from 2020 or your app's launch date
                endDate = new Date();
                break;
        }

        return { startDate, endDate };
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const { startDate, endDate } = getDateRange();

            // Build queries based on data scope
            let bookingsQuery = supabase.from('bookings').select('facility_id, booking_date, resident_id')
                .gte('booking_date', startDate.toISOString().split('T')[0])
                .lte('booking_date', endDate.toISOString().split('T')[0]);

            let issuesQuery = supabase.from('issues').select('category, status, priority, created_at, resident_id')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            let visitorsQuery = supabase.from('visitor_invitations').select('created_at, resident_id')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            // Filter by user if viewing personal data
            if (dataScope === 'my' && user) {
                bookingsQuery = bookingsQuery.eq('resident_id', user.id);
                issuesQuery = issuesQuery.eq('resident_id', user.id);
                visitorsQuery = visitorsQuery.eq('resident_id', user.id);
            }

            // Fetch all data in parallel
            const [
                residentsRes,
                bookingsRes,
                issuesRes,
                visitorsRes,
                facilitiesRes
            ] = await Promise.all([
                supabase.from('profiles').select('status, created_at')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),
                bookingsQuery,
                issuesQuery,
                visitorsQuery,
                supabase.from('facilities').select('id, name')
            ]);

            const residents = residentsRes.data || [];
            const bookings = bookingsRes.data || [];
            const issues = issuesRes.data || [];
            const visitors = visitorsRes.data || [];
            const facilities = facilitiesRes.data || [];

            // Get total residents (not filtered by date)
            const allResidentsRes = await supabase.from('profiles').select('status');
            const allResidents = allResidentsRes.data || [];

            // Process residents
            const totalResidents = allResidents.length;
            const activeResidents = allResidents.filter(r => r.status === 'Active').length;
            const pendingResidents = allResidents.filter(r => r.status === 'Pending Approval').length;

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

            // Process visitors
            const totalVisitors = visitors.length;

            // Generate activity data based on view mode
            const activityData = generateActivityData(viewMode, startDate, endDate, bookings, issues, visitors);

            setAnalytics({
                totalResidents,
                activeResidents,
                pendingResidents,
                totalBookings,
                totalIssues,
                resolvedIssues,
                openIssues,
                totalVisitors,
                bookingsByFacility,
                issuesByCategory,
                issuesByPriority,
                activityData
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            showToast('Failed to load analytics', 'error');
        } finally {
            setLoading(false);
        }
    };

    const generateActivityData = (
        mode: ViewMode,
        startDate: Date,
        endDate: Date,
        bookings: any[],
        issues: any[],
        visitors: any[]
    ) => {
        const data: { date: string; bookings: number; issues: number; visitors: number }[] = [];

        if (mode === 'week') {
            // Weekly data for last 12 weeks
            for (let i = 11; i >= 0; i--) {
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - (i * 7) - (weekOffset * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const weekStartStr = weekStart.toISOString().split('T')[0];
                const weekEndStr = weekEnd.toISOString().split('T')[0];

                data.push({
                    date: `Week ${12 - i}`,
                    bookings: bookings.filter(b => b.booking_date >= weekStartStr && b.booking_date <= weekEndStr).length,
                    issues: issues.filter(i => {
                        const issueDate = i.created_at.split('T')[0];
                        return issueDate >= weekStartStr && issueDate <= weekEndStr;
                    }).length,
                    visitors: visitors.filter(v => {
                        const visitorDate = v.created_at.split('T')[0];
                        return visitorDate >= weekStartStr && visitorDate <= weekEndStr;
                    }).length
                });
            }
        } else if (mode === 'month') {
            // Daily data for selected month
            const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                const dateStr = date.toISOString().split('T')[0];

                data.push({
                    date: day.toString(),
                    bookings: bookings.filter(b => b.booking_date === dateStr).length,
                    issues: issues.filter(i => i.created_at.startsWith(dateStr)).length,
                    visitors: visitors.filter(v => v.created_at.startsWith(dateStr)).length
                });
            }
        } else if (mode === 'year') {
            // Monthly data for selected year
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let month = 0; month < 12; month++) {
                const monthStart = new Date(selectedYear, month, 1).toISOString().split('T')[0];
                const monthEnd = new Date(selectedYear, month + 1, 0).toISOString().split('T')[0];

                data.push({
                    date: monthNames[month],
                    bookings: bookings.filter(b => b.booking_date >= monthStart && b.booking_date <= monthEnd).length,
                    issues: issues.filter(i => {
                        const issueDate = i.created_at.split('T')[0];
                        return issueDate >= monthStart && issueDate <= monthEnd;
                    }).length,
                    visitors: visitors.filter(v => {
                        const visitorDate = v.created_at.split('T')[0];
                        return visitorDate >= monthStart && visitorDate <= monthEnd;
                    }).length
                });
            }
        } else {
            // All: Monthly data for all years
            const monthsMap = new Map<string, { bookings: number; issues: number; visitors: number }>();

            bookings.forEach(b => {
                const monthKey = b.booking_date.substring(0, 7); // YYYY-MM
                if (!monthsMap.has(monthKey)) {
                    monthsMap.set(monthKey, { bookings: 0, issues: 0, visitors: 0 });
                }
                monthsMap.get(monthKey)!.bookings++;
            });

            issues.forEach(i => {
                const monthKey = i.created_at.substring(0, 7); // YYYY-MM
                if (!monthsMap.has(monthKey)) {
                    monthsMap.set(monthKey, { bookings: 0, issues: 0, visitors: 0 });
                }
                monthsMap.get(monthKey)!.issues++;
            });

            visitors.forEach(v => {
                const monthKey = v.created_at.substring(0, 7); // YYYY-MM
                if (!monthsMap.has(monthKey)) {
                    monthsMap.set(monthKey, { bookings: 0, issues: 0, visitors: 0 });
                }
                monthsMap.get(monthKey)!.visitors++;
            });

            const sortedMonths = Array.from(monthsMap.keys()).sort();
            sortedMonths.forEach(monthKey => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const stats = monthsMap.get(monthKey)!;
                data.push({
                    date: monthName,
                    bookings: stats.bookings,
                    issues: stats.issues,
                    visitors: stats.visitors
                });
            });
        }

        return data;
    };

    const navigatePrevious = () => {
        if (viewMode === 'week') {
            setWeekOffset(weekOffset + 1);
        } else if (viewMode === 'month') {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setSelectedMonth(newMonth);
        } else if (viewMode === 'year') {
            setSelectedYear(selectedYear - 1);
        }
    };

    const navigateNext = () => {
        if (viewMode === 'week') {
            if (weekOffset > 0) setWeekOffset(weekOffset - 1);
        } else if (viewMode === 'month') {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            if (newMonth <= new Date()) {
                setSelectedMonth(newMonth);
            }
        } else if (viewMode === 'year') {
            if (selectedYear < new Date().getFullYear()) {
                setSelectedYear(selectedYear + 1);
            }
        }
    };

    const getDateRangeLabel = () => {
        if (viewMode === 'week') {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (weekOffset * 7) - 7 * 12);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (weekOffset * 7));
            return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else if (viewMode === 'month') {
            return selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (viewMode === 'year') {
            return selectedYear.toString();
        } else {
            return 'All Time';
        }
    };

    const exportToPDF = () => {
        if (!analytics) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        doc.setFontSize(20);
        doc.text('Analytics Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Period: ${getDateRangeLabel()}`, pageWidth / 2, 35, { align: 'center' });

        let yPos = 45;

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

        if (analytics.bookingsByFacility.length > 0) {
            doc.text('Bookings by Facility', 14, yPos);
            yPos += 10;

            autoTable(doc, {
                startY: yPos,
                head: [['Facility', 'Bookings']],
                body: analytics.bookingsByFacility.map(f => [f.name, f.count.toString()]),
            });
        }

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

    const canNavigateNext = viewMode === 'all' ? false :
        viewMode === 'week' ? weekOffset > 0 :
            viewMode === 'month' ? selectedMonth < new Date() :
                selectedYear < new Date().getFullYear();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-dark">Analytics Dashboard</h1>
                <div className="flex space-x-2">
                    <Button onClick={exportToPDF}>📄 Export PDF</Button>
                </div>
            </div>

            {/* Data Scope Selector */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700">View Data:</span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setDataScope('my')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${dataScope === 'my'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                📊 My Data
                            </button>
                            <button
                                onClick={() => setDataScope('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition ${dataScope === 'all'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                🏘️ All Residents
                            </button>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        {dataScope === 'my' ? 'Showing only your activity' : 'Showing all community activity'}
                    </div>
                </div>
            </Card>

            {/* View Mode Selector with Navigation */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => { setViewMode('week'); setWeekOffset(0); }}
                            className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'week'
                                ? 'bg-brand-green text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => { setViewMode('month'); setSelectedMonth(new Date()); }}
                            className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'month'
                                ? 'bg-brand-green text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => { setViewMode('year'); setSelectedYear(new Date().getFullYear()); }}
                            className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'year'
                                ? 'bg-brand-green text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Year
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'all'
                                ? 'bg-brand-green text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            All
                        </button>
                    </div>

                    {viewMode !== 'all' && (
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={navigatePrevious}
                                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                                title="Previous"
                            >
                                ←
                            </button>
                            <span className="font-semibold text-gray-700 min-w-[200px] text-center">
                                {getDateRangeLabel()}
                            </span>
                            <button
                                onClick={navigateNext}
                                disabled={!canNavigateNext}
                                className={`p-2 rounded-lg transition ${canNavigateNext
                                    ? 'bg-gray-200 hover:bg-gray-300'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Next"
                            >
                                →
                            </button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <p className="text-sm text-gray-600 mt-2">{getDateRangeLabel()}</p>
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
                            <p className="text-sm text-gray-600">Visitor Registrations</p>
                            <p className="text-3xl font-bold text-brand-dark">{analytics.totalVisitors}</p>
                        </div>
                        <div className="text-4xl">🚗</div>
                    </div>
                    <p className="text-sm text-blue-600 mt-2">{getDateRangeLabel()}</p>
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
                {/* Activity Chart */}
                <Card className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold">
                            {viewMode === 'week' ? 'Weekly Trends (Last 12 Weeks)' :
                                viewMode === 'month' ? 'Daily Activity' :
                                    viewMode === 'year' ? 'Monthly Activity' :
                                        'All Time Trends'}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowBookings(!showBookings)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${showBookings
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                📅 Bookings
                            </button>
                            <button
                                onClick={() => setShowIssues(!showIssues)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${showIssues
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                🔧 Issues
                            </button>
                            <button
                                onClick={() => setShowVisitors(!showVisitors)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${showVisitors
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                            >
                                🚗 Visitors
                            </button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.activityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, (dataMax: number) => {
                                // Calculate max from visible series only
                                let max = 0;
                                analytics.activityData.forEach(item => {
                                    if (showBookings) max = Math.max(max, item.bookings);
                                    if (showIssues) max = Math.max(max, item.issues);
                                    if (showVisitors) max = Math.max(max, item.visitors);
                                });
                                return Math.ceil(max * 1.1); // Add 10% padding
                            }]} />
                            <Tooltip />
                            <Legend />
                            {showBookings && <Line type="monotone" dataKey="bookings" stroke="#10b981" name="Bookings" strokeWidth={2} />}
                            {showIssues && <Line type="monotone" dataKey="issues" stroke="#ef4444" name="Issues" strokeWidth={2} />}
                            {showVisitors && <Line type="monotone" dataKey="visitors" stroke="#3b82f6" name="Visitors" strokeWidth={2} />}
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
