import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyReport {
    month: string;
    newResidents: number;
    totalBookings: number;
    issuesReported: number;
    issuesResolved: number;
    activeUsers: number;
}

interface FacilityUsage {
    facilityName: string;
    totalBookings: number;
    uniqueUsers: number;
    peakDay: string;
    peakTime: string;
    utilizationRate: number;
}

export const ReportsPage: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
    const [facilityUsage, setFacilityUsage] = useState<FacilityUsage[]>([]);

    useEffect(() => {
        fetchReports();
    }, [selectedMonth]);

    const fetchReports = async () => {
        try {
            setLoading(true);

            // Get last 6 months for trend
            const months = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                months.push(date.toISOString().slice(0, 7));
            }

            // Fetch monthly data
            const monthlyData: MonthlyReport[] = await Promise.all(
                months.map(async (month) => {
                    const startDate = `${month}-01`;
                    const endDate = new Date(month + '-01');
                    endDate.setMonth(endDate.getMonth() + 1);
                    const endDateStr = endDate.toISOString().slice(0, 10);

                    const [residentsRes, bookingsRes, issuesRes] = await Promise.all([
                        supabase.from('profiles').select('created_at').gte('created_at', startDate).lt('created_at', endDateStr),
                        supabase.from('bookings').select('*').gte('booking_date', startDate).lt('booking_date', endDateStr),
                        supabase.from('issues').select('status, created_at, resolved_at').gte('created_at', startDate).lt('created_at', endDateStr)
                    ]);

                    const newResidents = residentsRes.data?.length || 0;
                    const totalBookings = bookingsRes.data?.length || 0;
                    const issuesReported = issuesRes.data?.length || 0;
                    const issuesResolved = issuesRes.data?.filter(i => i.status === 'Resolved' || i.status === 'Closed').length || 0;

                    // Count active users (users who made bookings or reported issues)
                    const activeUserIds = new Set([
                        ...(bookingsRes.data?.map(b => b.resident_id) || []),
                        ...(issuesRes.data?.map(i => i.resident_id) || [])
                    ]);

                    return {
                        month: new Date(month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                        newResidents,
                        totalBookings,
                        issuesReported,
                        issuesResolved,
                        activeUsers: activeUserIds.size
                    };
                })
            );

            setMonthlyReports(monthlyData);

            // Fetch facility usage stats
            const facilitiesRes = await supabase.from('facilities').select('*');
            const facilities = facilitiesRes.data || [];

            const usageStats: FacilityUsage[] = await Promise.all(
                facilities.map(async (facility) => {
                    const { data: bookings } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('facility_id', facility.id)
                        .gte('booking_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)); // Last 90 days

                    const totalBookings = bookings?.length || 0;
                    const uniqueUsers = new Set(bookings?.map(b => b.resident_id) || []).size;

                    // Find peak day
                    const dayCount: Record<string, number> = {};
                    bookings?.forEach(b => {
                        const day = new Date(b.booking_date).toLocaleDateString('en-US', { weekday: 'long' });
                        dayCount[day] = (dayCount[day] || 0) + 1;
                    });
                    const peakDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'N/A');

                    // Find peak time
                    const timeCount: Record<string, number> = {};
                    bookings?.forEach(b => {
                        const hour = parseInt(b.booking_slot.split(':')[0]);
                        const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
                        timeCount[period] = (timeCount[period] || 0) + 1;
                    });
                    const peakTime = Object.keys(timeCount).reduce((a, b) => timeCount[a] > timeCount[b] ? a : b, 'N/A');

                    // Calculate utilization rate (assuming 18 slots per day, 90 days)
                    const totalAvailableSlots = 18 * 90;
                    const utilizationRate = totalAvailableSlots > 0 ? (totalBookings / totalAvailableSlots) * 100 : 0;

                    return {
                        facilityName: facility.name,
                        totalBookings,
                        uniqueUsers,
                        peakDay,
                        peakTime,
                        utilizationRate: Math.round(utilizationRate)
                    };
                })
            );

            setFacilityUsage(usageStats.filter(f => f.totalBookings > 0));
        } catch (error) {
            console.error('Error fetching reports:', error);
            showToast('Failed to load reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportMonthlyReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Title
        doc.setFontSize(20);
        doc.text('Monthly Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: 'center' });

        let yPos = 40;

        // Monthly Trends
        doc.setFontSize(14);
        doc.text('6-Month Trend', 14, yPos);
        yPos += 10;

        autoTable(doc, {
            startY: yPos,
            head: [['Month', 'New Residents', 'Bookings', 'Issues Reported', 'Issues Resolved', 'Active Users']],
            body: monthlyReports.map(m => [
                m.month,
                m.newResidents.toString(),
                m.totalBookings.toString(),
                m.issuesReported.toString(),
                m.issuesResolved.toString(),
                m.activeUsers.toString()
            ]),
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Facility Usage
        if (facilityUsage.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.text('Facility Usage Statistics (Last 90 Days)', 14, yPos);
            yPos += 10;

            autoTable(doc, {
                startY: yPos,
                head: [['Facility', 'Bookings', 'Unique Users', 'Peak Day', 'Peak Time', 'Utilization %']],
                body: facilityUsage.map(f => [
                    f.facilityName,
                    f.totalBookings.toString(),
                    f.uniqueUsers.toString(),
                    f.peakDay,
                    f.peakTime,
                    f.utilizationRate + '%'
                ]),
            });
        }

        doc.save(`monthly-report-${selectedMonth}.pdf`);
        showToast('Report exported successfully!', 'success');
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-dark">Reports & Statistics</h1>
                <Button onClick={exportMonthlyReport}>📄 Export Monthly Report</Button>
            </div>

            {/* Monthly Trends */}
            <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">6-Month Trend Analysis</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-medium mb-3">Bookings & Issues</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={monthlyReports}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="totalBookings" stroke="#10b981" name="Bookings" />
                                <Line type="monotone" dataKey="issuesReported" stroke="#ef4444" name="Issues Reported" />
                                <Line type="monotone" dataKey="issuesResolved" stroke="#3b82f6" name="Issues Resolved" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-3">Residents & Activity</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyReports}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="newResidents" fill="#8b5cf6" name="New Residents" />
                                <Bar dataKey="activeUsers" fill="#10b981" name="Active Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>

            {/* Facility Usage Statistics */}
            <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Facility Usage Statistics (Last 90 Days)</h2>

                {facilityUsage.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No facility bookings in the last 90 days</p>
                ) : (
                    <>
                        <div className="mb-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={facilityUsage}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="facilityName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="totalBookings" fill="#10b981" name="Total Bookings" />
                                    <Bar dataKey="uniqueUsers" fill="#3b82f6" name="Unique Users" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bookings</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peak Day</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peak Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {facilityUsage.map((facility, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{facility.facilityName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{facility.totalBookings}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{facility.uniqueUsers}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{facility.peakDay}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{facility.peakTime}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                        <div
                                                            className="bg-brand-green h-2.5 rounded-full"
                                                            style={{ width: `${Math.min(facility.utilizationRate, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{facility.utilizationRate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="p-4 bg-green-50">
                                <p className="text-sm text-gray-600">Most Popular</p>
                                <p className="text-xl font-bold text-brand-dark">
                                    {facilityUsage.reduce((max, f) => f.totalBookings > max.totalBookings ? f : max).facilityName}
                                </p>
                                <p className="text-sm text-green-600">
                                    {facilityUsage.reduce((max, f) => f.totalBookings > max.totalBookings ? f : max).totalBookings} bookings
                                </p>
                            </Card>

                            <Card className="p-4 bg-blue-50">
                                <p className="text-sm text-gray-600">Highest Utilization</p>
                                <p className="text-xl font-bold text-brand-dark">
                                    {facilityUsage.reduce((max, f) => f.utilizationRate > max.utilizationRate ? f : max).facilityName}
                                </p>
                                <p className="text-sm text-blue-600">
                                    {facilityUsage.reduce((max, f) => f.utilizationRate > max.utilizationRate ? f : max).utilizationRate}% utilized
                                </p>
                            </Card>

                            <Card className="p-4 bg-purple-50">
                                <p className="text-sm text-gray-600">Most Diverse Users</p>
                                <p className="text-xl font-bold text-brand-dark">
                                    {facilityUsage.reduce((max, f) => f.uniqueUsers > max.uniqueUsers ? f : max).facilityName}
                                </p>
                                <p className="text-sm text-purple-600">
                                    {facilityUsage.reduce((max, f) => f.uniqueUsers > max.uniqueUsers ? f : max).uniqueUsers} unique users
                                </p>
                            </Card>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};
