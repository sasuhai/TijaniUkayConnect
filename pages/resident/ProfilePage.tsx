
import React, { FC, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseService';
import { Spinner } from '../../components/ui/Spinner';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const ProfilePage: FC = () => {
    const { user, refetchUser } = useAuth();
    const [profileData, setProfileData] = useState({ fullName: '', address: '', phone: '' });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setProfileData({
                fullName: user.full_name || '',
                address: user.address || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmittingProfile(true);
        setProfileMessage({ type: '', text: '' });

        const { error } = await supabase.from('profiles').update({
            full_name: profileData.fullName,
            address: profileData.address,
            phone: profileData.phone,
        }).eq('id', user.id);

        if (error) {
            setProfileMessage({ type: 'error', text: 'Failed to update profile: ' + error.message });
        } else {
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
            await refetchUser();
        }
        setIsSubmittingProfile(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmittingPassword(true);
        setPasswordMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
            setIsSubmittingPassword(false);
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            setIsSubmittingPassword(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });

        if (error) {
            setPasswordMessage({ type: 'error', text: 'Failed to change password: ' + error.message });
        } else {
            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        }
        setIsSubmittingPassword(false);
    };

    if (!user) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-6">My Profile</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h2 className="text-2xl font-semibold text-brand-dark mb-4">Profile Information</h2>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <Input label="Email" id="email" type="email" value={user.email} disabled />
                        <Input label="Full Name" id="fullName" name="fullName" value={profileData.fullName} onChange={handleProfileChange} required />
                        <Input label="Address" id="address" name="address" value={profileData.address} onChange={handleProfileChange} required />
                        <Input label="Phone" id="phone" name="phone" type="tel" value={profileData.phone} onChange={handleProfileChange} required />
                        {profileMessage.text && (
                            <p className={`text-sm ${profileMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{profileMessage.text}</p>
                        )}
                        <div className="pt-2">
                             <Button type="submit" disabled={isSubmittingProfile}>
                                {isSubmittingProfile ? <Spinner /> : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>
                <Card className="p-6">
                    <h2 className="text-2xl font-semibold text-brand-dark mb-4">Change Password</h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <Input label="New Password" id="newPassword" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                        <Input label="Confirm New Password" id="confirmPassword" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                         {passwordMessage.text && (
                            <p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{passwordMessage.text}</p>
                        )}
                        <div className="pt-2">
                            <Button type="submit" disabled={isSubmittingPassword}>
                                {isSubmittingPassword ? <Spinner /> : 'Change Password'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};
