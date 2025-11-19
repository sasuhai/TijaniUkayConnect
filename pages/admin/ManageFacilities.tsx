
import React, { useMemo, useState, useCallback, useEffect, FC } from 'react';
import type { Facility, Booking } from '../../types';
import { ManageGeneric } from './ManageGeneric';
import { supabase } from '../../services/supabaseService';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { IconTrash } from '../../components/icons';

const ManageBookings: FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: 'booking_date', asc: false });
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<(Booking & { facilityName: string }) | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [bookingsRes, facilitiesRes] = await Promise.all([
                supabase.from('bookings').select('*'),
                supabase.from('facilities').select('id, name')
            ]);

            if (bookingsRes.error) throw bookingsRes.error;
            if (facilitiesRes.error) throw facilitiesRes.error;

            setBookings((bookingsRes.data as Booking[]) || []);
            setFacilities((facilitiesRes.data as Facility[]) || []);

        } catch (error) {
            alert(`Error fetching booking data:\n${getErrorMessage(error)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sortedBookings = useMemo(() => {
        const facilityMap = new Map(facilities.map(f => [f.id, f.name]));
        const bookingsWithFacilityName = bookings.map(b => ({
            ...b,
            facilityName: facilityMap.get(b.facility_id) || 'Unknown Facility'
        }));

        return bookingsWithFacilityName.sort((a, b) => {
            if (sort.key === 'facilityName') {
                return sort.asc ? a.facilityName.localeCompare(b.facilityName) : b.facilityName.localeCompare(a.facilityName);
            }
            
            const aVal = (a as any)[sort.key];
            const bVal = (b as any)[sort.key];

            if (aVal < bVal) return sort.asc ? -1 : 1;
            if (aVal > bVal) return sort.asc ? 1 : -1;
            return 0;
        });
    }, [bookings, facilities, sort]);
    
    const handleSort = (key: string) => {
        setSort(prev => ({ key, asc: prev.key === key ? !prev.asc : true }));
    };

    const openDeleteModal = (booking: Booking & { facilityName: string }) => {
        setBookingToDelete(booking);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!bookingToDelete) return;
        const { error } = await supabase.from('bookings').delete().eq('id', bookingToDelete.id);
        if (error) {
            alert(`Failed to delete booking: ${getErrorMessage(error)}`);
        } else {
            await fetchData();
        }
        setDeleteModalOpen(false);
        setBookingToDelete(null);
    };

    return (
         <Card className="p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">All Facility Bookings</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('facilityName')}>Facility</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('resident_name')}>Resident</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('booking_date')}>Date</th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('booking_slot')}>Slot</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5} className="text-center p-4"><Spinner /></td></tr> : sortedBookings.map(booking => (
                            <tr key={booking.id} className="bg-white border-b">
                                <td className="px-6 py-4 font-medium text-gray-900">{booking.facilityName}</td>
                                <td className="px-6 py-4">{booking.resident_name}</td>
                                <td className="px-6 py-4">{formatDate(booking.booking_date)}</td>
                                <td className="px-6 py-4">{booking.booking_slot}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => openDeleteModal(booking)} className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-100" title="Delete Booking">
                                        <IconTrash className="h-5 w-5"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Deletion">
                {bookingToDelete && (
                    <div>
                        <p className="mb-6">
                            Are you sure you want to delete the booking for <span className="font-semibold">{bookingToDelete.facilityName}</span> by <span className="font-semibold">{bookingToDelete.resident_name}</span> on <span className="font-semibold">{formatDate(bookingToDelete.booking_date)} at {bookingToDelete.booking_slot}</span>?
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export const ManageFacilities: React.FC = () => {
    const columns = useMemo(() => [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }], []);
    const formFields = useMemo(() => [{ id: 'name', label: 'Facility Name', type: 'text' }, { id: 'description', label: 'Description', type: 'textarea' }], []);
    const textSearchColumns = useMemo(() => ['name', 'description'], []);
    return (
        <div>
            <ManageGeneric<Facility> tableName="facilities" title="Manage Facilities" columns={columns} formFields={formFields} textSearchColumns={textSearchColumns} />
            <ManageBookings />
        </div>
    );
};
