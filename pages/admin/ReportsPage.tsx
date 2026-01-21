
import React, { FC, useState } from 'react';
import * as firebase from '../../services/firebaseService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'bookings' | 'issues' | 'residents' | 'visitors';

export const ReportsPage: FC = () => {
    const [reportType, setReportType] = useState<ReportType>('bookings');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any[] | null>(null);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setReportData(null);

        try {
            let data: any[] = [];
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // Include full end date

            switch (reportType) {
                case 'bookings': {
                    const { data: bookings } = await firebase.getBookings();
                    const { data: facilities } = await firebase.getFacilities();

                    const facilityMap = new Map();
                    facilities?.forEach((f: any) => {
                        facilityMap.set(f.id, f.name);
                        facilityMap.set(String(f.id), f.name);
                        facilityMap.set(Number(f.id), f.name);
                    });

                    data = (bookings || []).filter((b: any) => {
                        const bookingDate = new Date(b.booking_date);
                        return bookingDate >= start && bookingDate <= end;
                    }).map((b: any) => ({
                        ...b,
                        facility_name: facilityMap.get(b.facility_id) || 'Unknown'
                    }));
                    break;
                }
                case 'issues': {
                    const { data: issues } = await firebase.getIssues();
                    data = (issues || []).filter((i: any) => {
                        const issueDate = new Date(i.created_at);
                        return issueDate >= start && issueDate <= end;
                    });
                    break;
                }
                case 'residents': {
                    const { data: profiles } = await firebase.getAllProfiles();
                    data = (profiles || []).filter((p: any) => {
                        const regDate = new Date(p.created_at);
                        return regDate >= start && regDate <= end;
                    });
                    break;
                }
                case 'visitors': {
                    const { data: visitors } = await firebase.getVisitorInvitations();
                    data = (visitors || []).filter((v: any) => {
                        const visitDate = new Date(v.created_at);
                        return visitDate >= start && visitDate <= end;
                    });
                    break;
                }
            }

            setReportData(data);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();
        const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;

        doc.setFontSize(18);
        doc.text(title, 14, 20);
        doc.setFontSize(11);
        doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 28);
        doc.text(`Total Records: ${reportData.length}`, 14, 35);

        let headers: string[] = [];
        let rows: any[][] = [];

        switch (reportType) {
            case 'bookings':
                headers = ['Facility', 'Resident', 'Date', 'Time'];
                rows = reportData.map(b => [
                    b.facility_name,
                    b.resident_name,
                    formatDate(b.booking_date),
                    b.booking_slot
                ]);
                break;
            case 'issues':
                headers = ['Title', 'Category', 'Status', 'Priority', 'Reported By', 'Date'];
                rows = reportData.map(i => [
                    i.title,
                    i.category,
                    i.status,
                    i.priority,
                    i.resident_name,
                    formatDate(i.created_at)
                ]);
                break;
            case 'residents':
                headers = ['Name', 'Email', 'Status', 'Role', 'Registered'];
                rows = reportData.map(p => [
                    p.full_name,
                    p.email,
                    p.status,
                    p.role,
                    formatDate(p.created_at)
                ]);
                break;
            case 'visitors':
                headers = ['Visitor Name', 'Contact', 'Host', 'Visit Date'];
                rows = reportData.map(v => [
                    v.visitor_name,
                    v.visitor_contact || 'N/A',
                    v.resident_name,
                    formatDate(v.visit_date_time)
                ]);
                break;
        }

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 42,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [16, 185, 129] }
        });

        doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportCSV = () => {
        if (!reportData) return;

        let csvContent = '';
        let headers: string[] = [];
        let rows: any[][] = [];

        switch (reportType) {
            case 'bookings':
                headers = ['Facility', 'Resident', 'Date', 'Time', 'Created At'];
                rows = reportData.map(b => [
                    b.facility_name,
                    b.resident_name,
                    b.booking_date,
                    b.booking_slot,
                    formatDate(b.created_at)
                ]);
                break;
            case 'issues':
                headers = ['Title', 'Category', 'Status', 'Priority', 'Resident', 'Date'];
                rows = reportData.map(i => [
                    i.title,
                    i.category,
                    i.status,
                    i.priority,
                    i.resident_name,
                    formatDate(i.created_at)
                ]);
                break;
            case 'residents':
                headers = ['Name', 'Email', 'Phone', 'Address', 'Status', 'Role', 'Registered'];
                rows = reportData.map(p => [
                    p.full_name,
                    p.email,
                    p.phone,
                    p.address,
                    p.status,
                    p.role,
                    formatDate(p.created_at)
                ]);
                break;
            case 'visitors':
                headers = ['Visitor', 'Contact', 'Purpose', 'Host', 'Visit Date'];
                rows = reportData.map(v => [
                    v.visitor_name,
                    v.visitor_contact || '',
                    v.purpose || '',
                    v.resident_name,
                    formatDate(v.visit_date_time)
                ]);
                break;
        }

        csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark">Reports</h2>

            {/* Report Configuration */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Generate Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Type
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as ReportType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                            <option value="bookings">Facility Bookings</option>
                            <option value="issues">Issues Reported</option>
                            <option value="residents">New Residents</option>
                            <option value="visitors">Visitor Invitations</option>
                        </select>
                    </div>

                    <Input
                        label="Start Date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                    />

                    <Input
                        label="End Date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().split('T')[0]}
                    />

                    <div className="flex items-end">
                        <Button
                            onClick={handleGenerateReport}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? <Spinner /> : 'Generate Report'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Report Results */}
            {reportData !== null && (
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">Report Results</h3>
                            <p className="text-sm text-gray-600">
                                Found {reportData.length} records from {formatDate(startDate)} to {formatDate(endDate)}
                            </p>
                        </div>
                        {reportData.length > 0 && (
                            <div className="flex space-x-2">
                                <Button onClick={handleExportPDF} variant="secondary">
                                    Export PDF
                                </Button>
                                <Button onClick={handleExportCSV} variant="secondary">
                                    Export CSV
                                </Button>
                            </div>
                        )}
                    </div>

                    {reportData.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            No records found for the selected period
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        {reportType === 'bookings' && (
                                            <>
                                                <th className="px-4 py-2 text-left">Facility</th>
                                                <th className="px-4 py-2 text-left">Resident</th>
                                                <th className="px-4 py-2 text-left">Date</th>
                                                <th className="px-4 py-2 text-left">Time</th>
                                            </>
                                        )}
                                        {reportType === 'issues' && (
                                            <>
                                                <th className="px-4 py-2 text-left">Title</th>
                                                <th className="px-4 py-2 text-left">Category</th>
                                                <th className="px-4 py-2 text-left">Status</th>
                                                <th className="px-4 py-2 text-left">Priority</th>
                                                <th className="px-4 py-2 text-left">Reported By</th>
                                            </>
                                        )}
                                        {reportType === 'residents' && (
                                            <>
                                                <th className="px-4 py-2 text-left">Name</th>
                                                <th className="px-4 py-2 text-left">Email</th>
                                                <th className="px-4 py-2 text-left">Status</th>
                                                <th className="px-4 py-2 text-left">Role</th>
                                            </>
                                        )}
                                        {reportType === 'visitors' && (
                                            <>
                                                <th className="px-4 py-2 text-left">Visitor Name</th>
                                                <th className="px-4 py-2 text-left">Contact</th>
                                                <th className="px-4 py-2 text-left">Host</th>
                                                <th className="px-4 py-2 text-left">Visit Date</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.slice(0, 100).map((item, index) => (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            {reportType === 'bookings' && (
                                                <>
                                                    <td className="px-4 py-2">{item.facility_name}</td>
                                                    <td className="px-4 py-2">{item.resident_name}</td>
                                                    <td className="px-4 py-2">{formatDate(item.booking_date)}</td>
                                                    <td className="px-4 py-2">{item.booking_slot}</td>
                                                </>
                                            )}
                                            {reportType === 'issues' && (
                                                <>
                                                    <td className="px-4 py-2">{item.title}</td>
                                                    <td className="px-4 py-2">{item.category}</td>
                                                    <td className="px-4 py-2">{item.status}</td>
                                                    <td className="px-4 py-2">{item.priority}</td>
                                                    <td className="px-4 py-2">{item.resident_name}</td>
                                                </>
                                            )}
                                            {reportType === 'residents' && (
                                                <>
                                                    <td className="px-4 py-2">{item.full_name}</td>
                                                    <td className="px-4 py-2">{item.email}</td>
                                                    <td className="px-4 py-2">{item.status}</td>
                                                    <td className="px-4 py-2">{item.role}</td>
                                                </>
                                            )}
                                            {reportType === 'visitors' && (
                                                <>
                                                    <td className="px-4 py-2">{item.visitor_name}</td>
                                                    <td className="px-4 py-2">{item.visitor_contact || 'N/A'}</td>
                                                    <td className="px-4 py-2">{item.resident_name}</td>
                                                    <td className="px-4 py-2">{formatDate(item.visit_date_time)}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {reportData.length > 100 && (
                                <p className="text-center text-sm text-gray-500 mt-4">
                                    Showing first 100 of {reportData.length} records. Export to see all.
                                </p>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};
