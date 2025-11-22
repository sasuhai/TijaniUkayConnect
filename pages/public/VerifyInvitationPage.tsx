import React, { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseService';
import { VisitorInvitation } from '../../types';
import { formatDate } from '../../utils/helpers';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';

export const VerifyInvitationPage: FC = () => {
    const { id } = useParams<{ id: string }>();
    const [invitation, setInvitation] = useState<VisitorInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'valid' | 'expired' | 'future' | 'invalid'>('invalid');
    const [hostAddress, setHostAddress] = useState<string>('');

    useEffect(() => {
        const fetchInvitation = async () => {
            if (!id) {
                setError("No invitation ID provided.");
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('visitor_invitations')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    setStatus('invalid');
                    setError("Invitation not found.");
                } else {
                    const invite = data as VisitorInvitation;
                    setInvitation(invite);

                    // Fetch resident's address
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('address')
                        .eq('id', invite.resident_id)
                        .single();

                    if (profileData?.address) {
                        setHostAddress(profileData.address);
                    }

                    const visitDate = new Date(invite.visit_date_time);
                    visitDate.setHours(0, 0, 0, 0);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    if (visitDate.getTime() === now.getTime()) {
                        setStatus('valid');
                    } else if (visitDate.getTime() > now.getTime()) {
                        setStatus('future');
                    } else {
                        setStatus('expired');
                    }
                }
            } catch (err) {
                console.error("Error fetching invitation:", err);
                setStatus('invalid');
                setError("An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchInvitation();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-xl rounded-2xl overflow-hidden relative">
                {/* Status Banner */}
                <div className={`absolute top-0 left-0 w-full h-2 ${status === 'valid' ? 'bg-green-500' :
                        status === 'future' ? 'bg-blue-500' :
                            status === 'expired' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />

                <div className="text-center mb-8">
                    {status === 'valid' && (
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4 animate-bounce-in">
                            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    )}
                    {status === 'future' && (
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-4">
                            <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}
                    {status === 'expired' && (
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100 mb-4">
                            <svg className="h-12 w-12 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    )}
                    {status === 'invalid' && (
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-4">
                            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    )}

                    <h1 className={`text-3xl font-extrabold tracking-tight ${status === 'valid' ? 'text-green-600' :
                            status === 'future' ? 'text-blue-600' :
                                status === 'expired' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {status === 'valid' ? 'ACCESS GRANTED' :
                            status === 'future' ? 'FUTURE DATE!' :
                                status === 'expired' ? 'PASS EXPIRED' : 'INVALID PASS'}
                    </h1>
                    {error && <p className="text-gray-500 mt-2">{error}</p>}
                </div>

                {invitation && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Visitor</p>
                            <p className="text-xl font-bold text-gray-900">{invitation.visitor_name}</p>
                            <p className="text-gray-600">{invitation.visitor_phone}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Vehicle</p>
                                <p className="text-lg font-bold text-gray-900">{invitation.vehicle_plate}</p>
                                <p className="text-sm text-gray-600 capitalize">{invitation.vehicle_type}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                                <p className="text-lg font-bold text-gray-900">{formatDate(invitation.visit_date_time).split(',')[0]}</p>
                                <p className="text-sm text-gray-600">{formatDate(invitation.visit_date_time).split(',')[1]}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Host</p>
                            <p className="text-lg font-bold text-gray-900">{invitation.resident_name}</p>
                            {hostAddress && <p className="text-sm text-gray-600">{hostAddress}</p>}
                        </div>

                        <div className="text-center pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400">Pass ID: {invitation.id}</p>
                        </div>
                    </div>
                )}
            </Card>
            <p className="mt-8 text-gray-500 text-sm">Tijani Ukay Connect Security System</p>
        </div>
    );
};
