import React, { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseService';
import type { VisitorInvitation } from '../../types';
import { toYyyyMmDd, formatDate, getErrorMessage } from '../../utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeCanvas } from 'qrcode.react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { IconShare, IconTrash, IconQrCode } from '../../components/icons';
// @ts-ignore
import jsQR from 'jsqr';

export const VisitorInvitationPage: FC = () => {
    const { user } = useAuth();
    const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sharingId, setSharingId] = useState<string | null>(null);
    const [isQrModalOpen, setQrModalOpen] = useState(false);
    const [selectedInvite, setSelectedInvite] = useState<VisitorInvitation | null>(null);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [inviteToDelete, setInviteToDelete] = useState<VisitorInvitation | null>(null);
    const [inviteForShare, setInviteForShare] = useState<VisitorInvitation | null>(null);
    const qrContainerRef = useRef<HTMLDivElement>(null);

    // Scanner states
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [scanResult, setScanResult] = useState<{ status: 'valid' | 'invalid' | 'expired'; invitation?: VisitorInvitation; message?: string } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    const today = toYyyyMmDd(new Date());
    const initialFormState = {
        visitorName: '',
        visitorPhone: '',
        vehiclePlate: '',
        vehicleType: 'car' as VisitorInvitation['vehicle_type'],
        visitDate: today,
        reason: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutofill = () => {
        const randomId = Math.floor(Math.random() * 1000);
        const sampleNames = ['Alice Smith', 'Bob Johnson', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt'];
        const sampleReasons = ['Family visit', 'Package delivery', 'Maintenance work', 'Friend gathering', 'Business meeting'];
        const vehicleTypes: VisitorInvitation['vehicle_type'][] = ['car', 'motorcycle', 'van', 'truck'];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateString = toYyyyMmDd(tomorrow);

        setFormData({
            visitorName: `${sampleNames[Math.floor(Math.random() * sampleNames.length)]} ${randomId}`,
            visitorPhone: `01${Math.floor(10000000 + Math.random() * 90000000)}`,
            vehiclePlate: `W${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${1000 + randomId}`,
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            visitDate: tomorrowDateString,
            reason: sampleReasons[Math.floor(Math.random() * sampleReasons.length)],
        });
    };

    const fetchInvitations = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('visitor_invitations')
            .select('*')
            .eq('resident_id', user.id)
            .order('visit_date_time', { ascending: false });

        if (data) setInvitations(data as VisitorInvitation[]);
        if (error) console.error("Error fetching invitations:", error);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const generateQrContent = useCallback((invite: VisitorInvitation): string => {
        // For local development, use network IP so phones can access
        // For production, use the actual domain
        let baseUrl = window.location.origin;

        // If running on localhost, replace with network IP
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Use the network IP that Vite shows (e.g., http://192.168.0.111:3001)
            // You can find this in the terminal where you ran 'npm run dev'
            const port = window.location.port;
            baseUrl = `http://192.168.0.111:${port}`;
        }

        // Get the base path (e.g., /tukconnect-v2)
        const basePath = import.meta.env.BASE_URL || '/';
        // Construct full URL
        const fullPath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        // USE qr_code_value INSTEAD OF id FOR SECURITY AND UUID COMPATIBILITY
        const qrUrl = `${baseUrl}${fullPath}/verify-visitor/${invite.qr_code_value}`;

        // DEBUG: Log the QR URL
        console.log('🔍 QR Code URL:', qrUrl);
        console.log('📋 Invitation ID:', invite.id);
        console.log('🔑 QR Value:', invite.qr_code_value);
        console.log('🌐 Base URL:', baseUrl);
        console.log('📁 Base Path:', basePath);

        return qrUrl;
    }, []);


    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) {
            alert("Authentication error: User not found. Please try logging out and in again.");
            return;
        }

        if (!formData.visitDate) {
            alert("Please select a date for the visit.");
            return;
        }

        setIsSubmitting(true);
        try {
            const visit_date_time = new Date(formData.visitDate + 'T00:00:00');
            if (isNaN(visit_date_time.getTime())) {
                throw new Error("The selected date is invalid.");
            }

            const qrValue = uuidv4();

            const inviteData = {
                visitor_name: formData.visitorName,
                visitor_phone: formData.visitorPhone,
                vehicle_plate: formData.vehiclePlate,
                vehicle_type: formData.vehicleType,
                visit_date_time: visit_date_time.toISOString(),
                reason: formData.reason,
                resident_id: user.id,
                resident_name: user.full_name,
                qr_code_value: qrValue,
            };

            const { error } = await supabase
                .from('visitor_invitations')
                .insert(inviteData);

            if (error) throw error;

            await fetchInvitations();
            setFormData(initialFormState);

        } catch (error) {
            const errorMessage = getErrorMessage(error);
            console.error("Failed to submit invitation:", error);
            alert(`Failed to create invitation:\n${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadBlob = (blob: Blob, fileName: string) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleShare = (invite: VisitorInvitation) => {
        if (sharingId) return;
        setSharingId(invite.id);
        setInviteForShare(invite);
    };

    useEffect(() => {
        if (!inviteForShare || !qrContainerRef.current) return;

        const timer = setTimeout(async () => {
            const qrCanvas = qrContainerRef.current?.querySelector('canvas');
            if (!qrCanvas) {
                alert('Could not generate QR code image.');
                setSharingId(null);
                setInviteForShare(null);
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                alert('Could not create image context.');
                setSharingId(null);
                setInviteForShare(null);
                return;
            }

            const width = 600;
            const padding = 40;
            const qrDisplaySize = 400;
            const titleFont = `bold 36px sans-serif`;
            const addressFont = `bold 28px sans-serif`;
            const detailsFont = `22px sans-serif`;
            const footerFont = `18px sans-serif`;
            const bgColor = '#ffffff';
            const titleColor = '#1a2e23';
            const textColor = '#374151';
            const footerColor = '#6b7280';
            const titleText = 'Tijani Ukay Visitor Pass';
            const addressLine = user?.address || 'Host Address';
            const detailsLine = `${formatDate(inviteForShare.visit_date_time)} : ${inviteForShare.visitor_name} (${inviteForShare.vehicle_plate})`;
            const footerText = "Show this QR code to security. Scanning will open a page with the visitor's details for verification.";

            const wrapText = (text: string, maxWidth: number, font: string): string[] => {
                ctx.font = font;
                const words = text.split(' ');
                let lines: string[] = [];
                if (words.length === 0) return lines;
                let currentLine = words[0];

                for (let i = 1; i < words.length; i++) {
                    const word = words[i];
                    const testWidth = ctx.measureText(currentLine + " " + word).width;
                    if (testWidth > maxWidth) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine += " " + word;
                    }
                }
                lines.push(currentLine);
                return lines;
            }

            const contentWidth = width - (padding * 2);
            const footerLines = wrapText(footerText, contentWidth, footerFont);

            const titleHeight = 40;
            const addressHeight = 32;
            const detailsHeight = 26;
            const footerLineHeight = 22;
            const footerBlockHeight = footerLines.length * footerLineHeight;

            // Calculate total height with spacing
            const height = padding + titleHeight + 20 + qrDisplaySize + 30 + addressHeight + 10 + detailsHeight + 40 + footerBlockHeight + padding;

            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            let currentY = padding;
            ctx.textAlign = 'center';
            const centerX = width / 2;

            ctx.font = titleFont;
            ctx.fillStyle = titleColor;
            currentY += titleHeight;
            ctx.fillText(titleText, centerX, currentY);

            currentY += 20;
            ctx.drawImage(qrCanvas, (width - qrDisplaySize) / 2, currentY, qrDisplaySize, qrDisplaySize);
            currentY += qrDisplaySize;

            currentY += 30;
            ctx.font = addressFont;
            ctx.fillStyle = titleColor;
            ctx.fillText(addressLine, centerX, currentY);
            currentY += addressHeight + 10;

            ctx.font = detailsFont;
            ctx.fillStyle = textColor;
            ctx.fillText(detailsLine, centerX, currentY);
            currentY += detailsHeight;

            currentY += 40;
            ctx.font = footerFont;
            ctx.fillStyle = footerColor;
            footerLines.forEach((line, index) => {
                ctx.fillText(line, centerX, currentY + (index * footerLineHeight));
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Failed to create image file.');
                    setSharingId(null);
                    setInviteForShare(null);
                    return;
                }

                const fileName = `VisitorPass-${inviteForShare.visitor_name.replace(/\s+/g, '_')}.png`;
                const file = new File([blob], fileName, { type: 'image/png' });

                const shareData = {
                    files: [file],
                    title: `Visitor Pass for ${inviteForShare.visitor_name}`,
                    text: `Here is the visitor pass for ${inviteForShare.visitor_name}.`,
                };

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share(shareData);
                    } catch (error) {
                        if ((error as Error).name !== 'AbortError') {
                            console.error("Sharing failed, falling back to download:", error);
                            alert("Sharing was cancelled or failed. The image will be downloaded instead.");
                            downloadBlob(blob, fileName);
                        }
                    }
                } else {
                    alert("Your browser doesn't support sharing files. The image will be downloaded.");
                    downloadBlob(blob, fileName);
                }

                setSharingId(null);
                setInviteForShare(null);
            }, 'image/png', 1.0);
        }, 100);

        return () => clearTimeout(timer);
    }, [inviteForShare, user]);


    const openDeleteConfirm = (invite: VisitorInvitation) => {
        setInviteToDelete(invite);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!inviteToDelete) return;

        const { error } = await supabase.from('visitor_invitations').delete().eq('id', inviteToDelete.id);

        if (error) {
            alert("Failed to delete invitation: " + error.message);
        } else {
            await fetchInvitations();
        }

        setDeleteConfirmOpen(false);
        setInviteToDelete(null);
    };

    const showQrCode = (invite: VisitorInvitation) => {
        setSelectedInvite(invite);
        setQrModalOpen(true);
    };

    // QR Scanner Logic
    const startScanner = () => {
        setScannerOpen(true);
        setScanResult(null);
        setIsScanning(true);
    };

    useEffect(() => {
        if (!isScannerOpen || !isScanning) {
            if (videoRef.current?.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true");
                    videoRef.current.play();
                    requestAnimationFrame(tick);
                }
            })
            .catch(err => {
                console.error("Error accessing camera:", err);
                alert("Unable to access camera. Please ensure you have given permission.");
                setScannerOpen(false);
            });

        const tick = () => {
            if (!videoRef.current || !canvasRef.current) return;

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        // Stop scanning momentarily
                        setIsScanning(false);
                        processScanResult(code.data);
                        return;
                    }
                }
            }
            animationFrameRef.current = requestAnimationFrame(tick);
        };

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScannerOpen, isScanning]);

    const processScanResult = async (data: string) => {
        // Try to extract UUID from URL or fallback to old format
        let inviteId = '';

        // Check if it's a URL format: .../verify-visitor/<UUID>
        const urlMatch = data.match(/\/verify-visitor\/([a-f0-9\-]{36})/i);
        if (urlMatch && urlMatch[1]) {
            inviteId = urlMatch[1];
        } else {
            // Fallback to old format: "Pass ID: <UUID>"
            const idMatch = data.match(/Pass ID: ([a-f0-9\-]{36})/i);
            if (idMatch && idMatch[1]) {
                inviteId = idMatch[1];
            }
        }

        if (inviteId) {
            try {
                // Query by qr_code_value instead of id
                const { data: invite, error } = await supabase
                    .from('visitor_invitations')
                    .select('*')
                    .eq('qr_code_value', inviteId)
                    .single();

                if (error || !invite) {
                    setScanResult({ status: 'invalid', message: 'Invitation not found in the database.' });
                } else {
                    // Check validity
                    const visitDate = new Date(invite.visit_date_time);
                    const now = new Date();
                    const isToday = visitDate.toDateString() === now.toDateString();

                    if (isToday) {
                        setScanResult({ status: 'valid', invitation: invite as VisitorInvitation });
                    } else {
                        setScanResult({ status: 'expired', invitation: invite as VisitorInvitation, message: `This pass is for ${formatDate(invite.visit_date_time)}, not today.` });
                    }
                }
            } catch (e) {
                setScanResult({ status: 'invalid', message: 'Error verifying invitation.' });
            }
        } else {
            setScanResult({ status: 'invalid', message: 'QR Code format not recognized.' });
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setIsScanning(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-brand-dark">Visitor Invitation</h1>
                <Button onClick={startScanner} className="flex items-center !bg-brand-dark hover:!bg-black">
                    <IconQrCode className="h-5 w-5 mr-2" />
                    Verify Visitor
                </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Register New Visitor</h2>
                            <Button type="button" variant="secondary" onClick={handleAutofill} className="text-sm py-1 px-3">Autofill</Button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <Input label="Visitor Name" name="visitorName" value={formData.visitorName} onChange={handleInputChange} required />
                            <Input label="Visitor Phone" name="visitorPhone" type="tel" value={formData.visitorPhone} onChange={handleInputChange} required />
                            <Input label="Vehicle Plate Number" name="vehiclePlate" value={formData.vehiclePlate} onChange={handleInputChange} required />
                            <Select label="Vehicle Type" name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} required>
                                <option value="car">Car</option>
                                <option value="motorcycle">Motorcycle</option>
                                <option value="van">Van</option>
                                <option value="truck">Truck</option>
                                <option value="other">Other</option>
                            </Select>
                            <Input label="Date of Visit" name="visitDate" type="date" value={formData.visitDate} onChange={handleInputChange} required min={today} />
                            <Textarea label="Reason for Visit" name="reason" value={formData.reason} onChange={handleInputChange} required />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Spinner /> : 'Generate Invitation'}
                            </Button>
                        </form>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">My Invitations</h2>
                    <div className="space-y-4">
                        {loading ? <Spinner /> : invitations.map(inv => (
                            <Card key={inv.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">{inv.visitor_name}</p>
                                    <p className="text-sm text-gray-600">{inv.vehicle_plate} ({inv.vehicle_type})</p>
                                    <p className="text-sm text-gray-600">On: {formatDate(inv.visit_date_time)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button onClick={() => showQrCode(inv)}>Show QR</Button>
                                    <Button variant="secondary" onClick={() => handleShare(inv)} className="p-2" disabled={sharingId === inv.id} title="Share Pass">
                                        {sharingId === inv.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div> : <IconShare className="h-5 w-5" />}
                                    </Button>
                                    <Button variant="danger" onClick={() => openDeleteConfirm(inv)} className="p-2" title="Delete Invitation">
                                        <IconTrash className="h-5 w-5" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <Modal isOpen={isQrModalOpen} onClose={() => setQrModalOpen(false)} title="Visitor QR Code">
                {selectedInvite && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="p-2 bg-white inline-block rounded-lg">
                            {user ?
                                <QRCodeCanvas value={generateQrContent(selectedInvite)} size={256} /> :
                                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg"><Spinner /></div>
                            }
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-brand-dark">{user?.address}</p>
                            <p className="text-gray-600">
                                {formatDate(selectedInvite.visit_date_time)} : {selectedInvite.visitor_name} ({selectedInvite.vehicle_plate})
                            </p>
                        </div>
                        <p className="text-sm text-center text-gray-600">Show this QR code to security. Scanning will open a page with the visitor's details for verification.</p>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Confirm Deletion">
                {inviteToDelete && (
                    <div>
                        <p className="mb-6">
                            Are you sure you want to delete the invitation for <span className="font-semibold">{inviteToDelete.visitor_name}</span> on <span className="font-semibold">{formatDate(inviteToDelete.visit_date_time)}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col justify-center items-center p-4">
                    <div className="w-full max-w-md relative">
                        <button
                            onClick={() => setScannerOpen(false)}
                            className="absolute top-0 right-0 -mt-12 text-white hover:text-gray-300 p-2"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        {!scanResult && (
                            <div className="relative overflow-hidden rounded-xl bg-black border-2 border-gray-700 shadow-2xl">
                                <video ref={videoRef} className="w-full h-full object-cover" />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-64 h-64 border-2 border-brand-green opacity-50 rounded-lg relative">
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-green -mt-1 -ml-1"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-green -mt-1 -mr-1"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-green -mb-1 -ml-1"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-green -mb-1 -mr-1"></div>
                                        <div className="w-full h-1 bg-brand-green absolute top-0 animate-pulse shadow-glow-green" style={{ animation: 'scan 2s infinite' }}></div>
                                    </div>
                                </div>
                                <p className="absolute bottom-4 w-full text-center text-white text-sm bg-black/50 py-1">Align QR code within the frame</p>
                            </div>
                        )}

                        {scanResult && (
                            <div className="bg-white rounded-xl p-6 shadow-2xl animate-fade-in-up">
                                <div className="text-center mb-4">
                                    {scanResult.status === 'valid' && (
                                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                    {scanResult.status === 'expired' && (
                                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                                            <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    )}
                                    {scanResult.status === 'invalid' && (
                                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    )}

                                    <h3 className={`text-2xl font-bold ${scanResult.status === 'valid' ? 'text-green-600' :
                                        scanResult.status === 'expired' ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                        {scanResult.status === 'valid' ? 'ACCESS GRANTED' :
                                            scanResult.status === 'expired' ? 'PASS EXPIRED' : 'INVALID PASS'}
                                    </h3>
                                    {scanResult.message && <p className="text-gray-500 mt-2">{scanResult.message}</p>}
                                </div>

                                {scanResult.invitation && (
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6 text-left">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Visitor</p>
                                            <p className="font-bold text-lg text-gray-900">{scanResult.invitation.visitor_name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Vehicle</p>
                                                <p className="font-semibold">{scanResult.invitation.vehicle_plate}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                                                <p className="capitalize">{scanResult.invitation.vehicle_type}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Host</p>
                                            <p className="font-semibold">{scanResult.invitation.resident_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Visit Date</p>
                                            <p className="font-semibold">{formatDate(scanResult.invitation.visit_date_time)}</p>
                                        </div>
                                    </div>
                                )}

                                <Button onClick={resetScanner} className="w-full">Scan Next Visitor</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {inviteForShare && user && (
                <div ref={qrContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <QRCodeCanvas value={generateQrContent(inviteForShare)} size={400} />
                </div>
            )}
        </div>
    );
};