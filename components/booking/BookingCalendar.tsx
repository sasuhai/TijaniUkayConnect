import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';
import type { Booking, Facility } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: Booking;
}

interface BookingCalendarProps {
    facilities: Facility[];
    onBookingClick?: (booking: Booking) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ facilities, onBookingClick }) => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .order('booking_date', { ascending: true });

            if (error) throw error;
            if (data) setBookings(data as Booking[]);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const events: CalendarEvent[] = useMemo(() => {
        return bookings.map((booking) => {
            const facility = facilities.find(f => f.id === booking.facility_id);
            const [hours, minutes] = booking.booking_slot.split(':');
            const startDate = new Date(booking.booking_date);
            startDate.setHours(parseInt(hours), parseInt(minutes), 0);

            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1); // 1 hour slots

            return {
                id: booking.id,
                title: `${facility?.name || 'Facility'} - ${booking.resident_name}`,
                start: startDate,
                end: endDate,
                resource: booking,
            };
        });
    }, [bookings, facilities]);

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setShowModal(true);
        if (onBookingClick) {
            onBookingClick(event.resource);
        }
    };

    const eventStyleGetter = (event: CalendarEvent) => {
        const isMyBooking = event.resource.resident_id === user?.id;
        return {
            style: {
                backgroundColor: isMyBooking ? '#10b981' : '#3b82f6',
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
            },
        };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="mb-4 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Booking Calendar</h3>
                <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Your Bookings</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>Other Bookings</span>
                    </div>
                </div>
            </div>

            <div style={{ height: '600px' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    popup
                    tooltipAccessor={(event) => event.title}
                />
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Booking Details"
            >
                {selectedEvent && (
                    <div className="space-y-3">
                        <div>
                            <p className="font-semibold">Facility:</p>
                            <p>{facilities.find(f => f.id === selectedEvent.resource.facility_id)?.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Booked by:</p>
                            <p>{selectedEvent.resource.resident_name}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Date:</p>
                            <p>{format(selectedEvent.start, 'MMMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Time:</p>
                            <p>{format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}</p>
                        </div>
                        {selectedEvent.resource.resident_id === user?.id && (
                            <div className="pt-4 border-t">
                                <p className="text-green-600 font-semibold">✓ This is your booking</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
