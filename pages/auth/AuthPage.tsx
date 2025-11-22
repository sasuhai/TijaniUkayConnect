
import React, { useState, FC } from 'react';
import { supabase } from '../../services/supabaseService';
import { LandingPage } from './LandingPage';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export const AuthPage: FC = () => {
    const [page, setPage] = useState<'landing' | 'login' | 'register' | 'reset'>('landing');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const switchPage = (newPage: 'login' | 'register' | 'reset') => {
        setError('');
        setSuccessMessage('');
        setPage(newPage);
    }

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        const formData = new FormData(e.currentTarget);
        const fullName = formData.get('fullName') as string;
        const address = formData.get('address') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const password = formData.get('password') as string;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    address: address,
                    phone: phone,
                }
            }
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccessMessage("Registration successful! Please check your email to confirm your account. Admins have been notified to review your registration.");

            const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
            if (admins && admins.length > 0) {
                const adminEmails = admins.map(a => a.email);
                console.log(`NEW USER REGISTERED (${email}). Notifying admins: ${adminEmails.join(', ')}`);
            }

            setTimeout(() => setPage('login'), 5000);
        }
        setLoading(false);
    };

    const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccessMessage("Password reset link sent! Please check your email to continue.");
        }
        setLoading(false);
    };

    if (page === 'landing') {
        return <LandingPage onLogin={() => switchPage('login')} onRegister={() => switchPage('register')} />
    }

    return (
        <div className="min-h-screen bg-brand-light-gray flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-dark tracking-wider">Tijani Ukay Connect</h1>
                </div>
                <Card className="p-8">
                    {page === 'login' && (
                        <>
                            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Resident Login</h2>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <Input id="email" name="email" type="email" label="Email Address" required />
                                <Input id="password" name="password" type="password" label="Password" required />
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => switchPage('reset')}
                                        className="text-sm font-medium text-brand-green hover:text-green-700 focus:outline-none"
                                    >
                                        Forgot your password?
                                    </button>
                                </div>
                                {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
                                <Button type="submit" disabled={loading} className="w-full flex justify-center !mt-6">{loading ? <Spinner /> : 'Login'}</Button>
                            </form>
                            <p className="mt-6 text-center text-sm text-gray-600">
                                Not a resident? <button onClick={() => switchPage('register')} className="font-medium text-brand-green hover:text-green-700">Register here</button>
                            </p>
                        </>
                    )}
                    {page === 'register' && (
                        <>
                            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">New Resident Registration</h2>
                            {successMessage ? (
                                <p className="text-center text-green-600 bg-green-100 p-4 rounded-lg">{successMessage}</p>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <Input id="fullName" name="fullName" type="text" label="Full Name" required />
                                    <Input id="address" name="address" type="text" label="Address (House No, Street)" required />
                                    <Input id="email" name="email" type="email" label="Email" required />
                                    <Input id="phone" name="phone" type="tel" label="Phone Number" required />
                                    <Input id="password" name="password" type="password" label="Password" required />
                                    {error && <p className="text-red-500 text-sm">{error}</p>}
                                    <Button type="submit" disabled={loading} className="w-full flex justify-center">{loading ? <Spinner /> : 'Register'}</Button>
                                </form>
                            )}
                            <p className="mt-6 text-center text-sm text-gray-600">
                                Already have an account? <button onClick={() => switchPage('login')} className="font-medium text-brand-green hover:text-green-700">Login here</button>
                            </p>
                        </>
                    )}
                    {page === 'reset' && (
                        <>
                            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Reset Password</h2>
                            {successMessage ? (
                                <p className="text-center text-green-600 bg-green-100 p-4 rounded-lg">{successMessage}</p>
                            ) : (
                                <form onSubmit={handlePasswordReset} className="space-y-6">
                                    <p className="text-sm text-center text-gray-600">Enter your email address and we will send you a link to reset your password.</p>
                                    <Input id="email" name="email" type="email" label="Email Address" required autoComplete="email" />
                                    {error && <p className="text-red-500 text-sm">{error}</p>}
                                    <Button type="submit" disabled={loading} className="w-full flex justify-center">{loading ? <Spinner /> : 'Send Reset Link'}</Button>
                                </form>
                            )}
                            <p className="mt-6 text-center text-sm text-gray-600">
                                Remember your password? <button onClick={() => switchPage('login')} className="font-medium text-brand-green hover:text-green-700">Back to Login</button>
                            </p>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
};
