
import React, { FC, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseService';
import type { Facility, Booking } from '../../types';
import { toYyyyMmDd, formatDateWithDay, formatDate } from '../../utils/helpers';
import { FullPageSpinner, Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { BookingCalendar } from '../../components/booking/BookingCalendar';

export const FacilityBookingPage: FC = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
    const [selectedDate, setSelectedDate] = useState(toYyyyMmDd(new Date()));
    const [loading, setLoading] = useState(true);

    const [isBookingModalOpen, setBookingModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<(Booking & { facility?: Facility }) | null>(null);

    const timeSlots = useMemo(() => Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`), []); // 6:00 to 23:00

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const facilityPromise = supabase.from('facilities').select('*');
                const bookingPromise = supabase.from('bookings').select('*');

                const [facilityRes, bookingRes] = await Promise.all([facilityPromise, bookingPromise]);

                if (facilityRes.error) throw facilityRes.error;
                if (bookingRes.error) throw bookingRes.error;

                const loadedFacilities = (facilityRes.data as Facility[]) || [];
                setFacilities(loadedFacilities);
                setBookings((bookingRes.data as Booking[]) || []);

                if (loadedFacilities.length > 0) {
                    setSelectedFacility(loadedFacilities[0]);
                }
            } catch (error) {
                console.error("Error fetching booking data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const myUpcomingBookings = useMemo(() => {
        if (!user) return [];
        const now = new Date();

        return bookings
            .filter(b => {
                const bookingDateTime = new Date(`${b.booking_date}T${b.booking_slot}`);
                return b.resident_id === user.id && bookingDateTime >= now;
            })
            .map(booking => ({
                ...booking,
                facility: facilities.find(f => f.id === booking.facility_id)
            }))
            .sort((a, b) => {
                const dateA = new Date(`${a.booking_date}T${a.booking_slot}`);
                const dateB = new Date(`${b.booking_date}T${b.booking_slot}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [bookings, user, facilities]);

    const bookingsOnSelectedDate = useMemo(() => {
        if (!selectedFacility || !selectedDate) return [];
        return bookings.filter(b => b.facility_id === selectedFacility.id && b.booking_date === selectedDate);
    }, [bookings, selectedFacility, selectedDate]);


    const handleSlotClick = (slot: string) => {
        // Check if the selected date and time is in the past
        const selectedDateTime = new Date(`${selectedDate}T${slot}`);
        const now = new Date();

        if (selectedDateTime < now) {
            alert('Cannot book slots in the past. Please select a future date and time.');
            return;
        }

        setSelectedSlot(slot);
        setBookingModalOpen(true);
    };

    const confirmBooking = async () => {
        if (!user || !selectedFacility || !selectedSlot) {
            alert("An error occurred. Missing user, facility, or slot information.");
            return;
        }

        // Double-check that the booking is not in the past
        const selectedDateTime = new Date(`${selectedDate}T${selectedSlot}`);
        const now = new Date();

        if (selectedDateTime < now) {
            alert('Cannot book slots in the past. Please select a future date and time.');
            setBookingModalOpen(false);
            setSelectedSlot(null);
            return;
        }

        setIsSubmitting(true);
        const newBookingData = {
            facility_id: selectedFacility.id,
            resident_id: user.id,
            resident_name: user.full_name,
            booking_date: selectedDate,
            booking_slot: selectedSlot
        };
        const { data, error } = await supabase.from('bookings').insert(newBookingData).select().single();

        setIsSubmitting(false);
        setBookingModalOpen(false);
        setSelectedSlot(null);

        if (error) {
            console.error("Booking error:", error);
            alert(`Failed to book slot: ${error.message}`);
            return;
        }
        if (data) {
            setBookings(prevBookings => [...prevBookings, data]);
        }
    };

    const openCancelModal = (booking: Booking & { facility?: Facility }) => {
        setBookingToCancel(booking);
        setCancelModalOpen(true);
    };

    const confirmCancelBooking = async () => {
        if (!bookingToCancel) return;

        setIsSubmitting(true);
        const { error } = await supabase.from('bookings').delete().eq('id', bookingToCancel.id);

        if (error) {
            alert("Failed to cancel booking: " + error.message);
        } else {
            setBookings(prev => prev.filter(b => b.id !== bookingToCancel.id));
        }

        setIsSubmitting(false);
        setCancelModalOpen(false);
        setBookingToCancel(null);
    };

    const changeDate = (days: number) => {
        const currentDate = new Date(selectedDate + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() + days);
        setSelectedDate(toYyyyMmDd(currentDate));
    };

    const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const facilityId = e.target.value;
        const newFacility = facilities.find(f => String(f.id) === facilityId);
        setSelectedFacility(newFacility || null);
    };

    if (loading) return <FullPageSpinner message="Loading facilities..." />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Facility Booking</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'list'
                            ? 'bg-brand-green text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        📋 List View
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${viewMode === 'calendar'
                            ? 'bg-brand-green text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        📅 Calendar View
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <BookingCalendar facilities={facilities} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 order-1">
                        <Card className="p-4">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="facility-select" className="block text-sm font-medium text-gray-700">Select Facility</label>
                                    <select
                                        id="facility-select"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm"
                                        value={selectedFacility?.id || ''}
                                        onChange={handleFacilityChange}
                                    >
                                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                    {selectedFacility?.description && (
                                        <p className="mt-2 text-sm text-gray-600">{selectedFacility.description}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="booking-date" className="block text-sm font-medium text-gray-700">Select Date</label>
                                    <div className="flex items-center mt-1">
                                        <button onClick={() => changeDate(-1)} className="p-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 hover:bg-gray-200" aria-label="Previous day">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        </button>
                                        <input
                                            id="booking-date"
                                            type="date"
                                            value={selectedDate}
                                            min={toYyyyMmDd(new Date())}
                                            onChange={e => setSelectedDate(e.target.value)}
                                            className="block w-full px-3 py-2 border-t border-b border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-brand-green focus:border-brand-green sm:text-sm"
                                        />
                                        <button onClick={() => changeDate(1)} className="p-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-100 hover:bg-gray-200" aria-label="Next day">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 lg:row-span-2 order-2">
                        <Card className="p-4">
                            <h3 className="text-xl font-semibold">Available Slots for {formatDateWithDay(selectedDate)}</h3>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 my-4 p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-sm bg-gray-100 border border-gray-300 mr-2"></span>
                                    <span>Available</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-sm bg-red-100 border border-red-200 mr-2"></span>
                                    <span>Booked</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-sm bg-green-100 ring-1 ring-green-400 mr-2"></span>
                                    <span>My Booking</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="h-4 w-4 rounded-sm bg-gray-300 border border-gray-400 mr-2"></span>
                                    <span>Past</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                {timeSlots.map(slot => {
                                    const booking = bookingsOnSelectedDate.find(b => b.booking_slot === slot);
                                    const isBookedByMe = booking && user && booking.resident_id === user.id;

                                    // Check if this slot is in the past
                                    const slotDateTime = new Date(`${selectedDate}T${slot}`);
                                    const now = new Date();
                                    const isPast = slotDateTime < now;

                                    const buttonClasses =
                                        isPast ? 'bg-gray-300 text-gray-500 cursor-not-allowed line-through' :
                                            isBookedByMe ? 'bg-green-100 text-green-800 cursor-not-allowed ring-2 ring-green-400' :
                                                booking ? 'bg-red-100 text-red-800 cursor-not-allowed' :
                                                    'bg-gray-100 text-gray-700 hover:bg-brand-green hover:text-white';

                                    return (
                                        <button key={slot}
                                            onClick={() => !booking && !isPast && handleSlotClick(slot)}
                                            disabled={!!booking || isPast}
                                            className={`p-3 rounded-lg text-center font-semibold text-sm transition ${buttonClasses}`}>
                                            {slot}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 order-3">
                        <Card className="p-4">
                            <h3 className="text-xl font-semibold mb-4">My Upcoming Bookings</h3>
                            {myUpcomingBookings.length > 0 ? (
                                <ul className="space-y-3">
                                    {myUpcomingBookings.map(booking => (
                                        <li key={booking.id} className="p-3 bg-brand-light-gray rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-brand-dark">{booking.facility?.name}</p>
                                                <p className="text-sm text-gray-600">{formatDate(booking.booking_date)}, {booking.booking_slot}</p>
                                            </div>
                                            <Button variant="danger" className="text-xs !py-1 !px-2" onClick={() => openCancelModal(booking)}>Cancel</Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-center py-4">You have no upcoming bookings.</p>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            <Modal isOpen={isBookingModalOpen} onClose={() => setBookingModalOpen(false)} title="Confirm Your Booking">
                {selectedFacility && selectedSlot && (
                    <div>
                        <p className="mb-4 text-gray-700">Please confirm you want to book the following slot:</p>
                        <div className="bg-brand-light-gray p-4 rounded-lg space-y-2">
                            <p><span className="font-semibold text-gray-600">Facility:</span> <span className="text-brand-dark font-bold">{selectedFacility.name}</span></p>
                            <p><span className="font-semibold text-gray-600">Date:</span> <span className="text-brand-dark font-bold">{formatDate(selectedDate)}</span></p>
                            <p><span className="font-semibold text-gray-600">Time:</span> <span className="text-brand-dark font-bold">{selectedSlot}</span></p>
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <Button variant="secondary" onClick={() => setBookingModalOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button onClick={confirmBooking} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Confirm Booking'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isCancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Booking">
                {bookingToCancel && (
                    <div>
                        <p className="mb-6">
                            Are you sure you want to cancel your booking for <span className="font-semibold">{bookingToCancel.facility?.name}</span> on <span className="font-semibold">{formatDate(bookingToCancel.booking_date)} at {bookingToCancel.booking_slot}</span>?
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setCancelModalOpen(false)} disabled={isSubmitting}>
                                Back
                            </Button>
                            <Button variant="danger" onClick={confirmCancelBooking} disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Yes, Cancel'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
