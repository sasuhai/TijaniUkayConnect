import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Settings } from '../../types';

export const ManageSettings: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No settings found, which is fine - we'll create them on save
                    setSettings(null);
                } else {
                    throw error;
                }
            } else {
                setSettings(data);
            }
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // if (!settings) return; // Allow creating new settings

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData(e.currentTarget);
            const updates = {
                app_name: formData.get('app_name') as string,
                version: formData.get('version') as string,
                author: formData.get('author') as string || null,
                resident_name: formData.get('resident_name') as string || null,
                resident_address: formData.get('resident_address') as string || null,
                information1: formData.get('information1') as string || null,
                information2: formData.get('information2') as string || null,
                videolink: formData.get('videolink') as string || null,
                banner1: formData.get('banner1') as string || null,
                updated_at: new Date().toISOString(),
            };

            let error;
            if (settings) {
                const { error: updateError } = await supabase
                    .from('settings')
                    .update(updates)
                    .eq('id', settings.id);
                error = updateError;
            } else {
                const { data: newSettings, error: insertError } = await supabase
                    .from('settings')
                    .insert([updates])
                    .select()
                    .single();
                error = insertError;
                if (newSettings) setSettings(newSettings);
            }

            if (error) throw error;

            if (settings) {
                setSettings({ ...settings, ...updates });
            }
            setSuccess('Settings updated successfully!');
        } catch (err: any) {
            console.error('Error updating settings:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>

            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="app_name"
                        name="app_name"
                        label="Application Name"
                        defaultValue={settings?.app_name}
                        required
                    />

                    <Input
                        id="version"
                        name="version"
                        label="Version"
                        defaultValue={settings?.version}
                        required
                    />

                    <Input
                        id="author"
                        name="author"
                        label="Author"
                        defaultValue={settings?.author || ''}
                    />

                    <Input
                        id="resident_name"
                        name="resident_name"
                        label="Resident Name"
                        defaultValue={settings?.resident_name || ''}
                    />

                    <Input
                        id="resident_address"
                        name="resident_address"
                        label="Resident Address"
                        defaultValue={settings?.resident_address || ''}
                    />

                    <Input
                        id="videolink"
                        name="videolink"
                        label="Video URL (YouTube)"
                        placeholder="https://www.youtube.com/watch?v=..."
                        defaultValue={settings?.videolink || ''}
                    />

                    <Input
                        id="banner1"
                        name="banner1"
                        label="Banner Title"
                        placeholder="Elevate Your Community Living"
                        defaultValue={settings?.banner1 || ''}
                    />

                    <div className="space-y-2">
                        <label htmlFor="information1" className="block text-sm font-medium text-gray-700">
                            Information 1
                        </label>
                        <textarea
                            id="information1"
                            name="information1"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                            defaultValue={settings?.information1 || ''}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="information2" className="block text-sm font-medium text-gray-700">
                            Information 2
                        </label>
                        <textarea
                            id="information2"
                            name="information2"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                            defaultValue={settings?.information2 || ''}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={saving}>
                            {saving ? <Spinner /> : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
