
import React, { FC, useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import type { Contact } from '../../types';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { IconPhone } from '../../components/icons';

export const ContactsPage: FC = () => {
    const [contacts, setContacts] = useState<Contact[]>(() => {
        try {
            const cached = localStorage.getItem('tijani_contacts');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchContacts = async () => {
            const timeoutId = setTimeout(() => {
                if (isMounted) setLoading(false);
            }, 5000);

            try {
                const { data, error } = await supabase.from('contacts').select('*');
                if (isMounted) {
                    if (data) {
                        setContacts(data as Contact[]);
                        localStorage.setItem('tijani_contacts', JSON.stringify(data));
                    }
                }
            } catch (error) {
                console.error("Error fetching contacts:", error);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) setLoading(false);
            }
        };
        fetchContacts();
        return () => { isMounted = false; };
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Contacts</h1>
                {loading && <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm"><Spinner /><span className="ml-2">Updating...</span></div>}
            </div>

            {contacts.length === 0 && loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-500">Loading contacts...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {contacts.length === 0 ? <p className="text-gray-500">No contacts found.</p> : contacts.map(contact => (
                        <Card key={contact.id} className="p-6 flex items-center">
                            <IconPhone className="h-10 w-10 text-brand-green mr-4" />
                            <div>
                                <h3 className="font-bold text-xl">{contact.name}</h3>
                                <p className="text-gray-600">{contact.role}</p>
                                <p className="font-semibold text-lg text-brand-dark mt-1">{contact.phone}</p>
                                {contact.email && (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="text-brand-green hover:underline text-sm block mt-1"
                                    >
                                        {contact.email}
                                    </a>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
