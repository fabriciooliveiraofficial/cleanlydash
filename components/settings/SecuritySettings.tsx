import React, { useEffect, useState } from 'react';
import { Lock, Smartphone, Activity, Key, ShieldCheck, ShieldAlert, Check, Copy } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

export const SecuritySettings: React.FC = () => {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'password' | 'mfa' | 'activity'>('password');
    const [loading, setLoading] = useState(true);

    // Password State
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [passLoading, setPassLoading] = useState(false);

    // MFA State
    const [mfaStatus, setMfaStatus] = useState<'enabled' | 'disabled'>('disabled');
    const [enrollFactorId, setEnrollFactorId] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [enrollStep, setEnrollStep] = useState<'init' | 'verify'>('init');

    // Activity State
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        checkMfaStatus();
        fetchActivityLogs();
    }, []);

    const checkMfaStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.auth.mfa.listFactors();
            if (data?.totp.length > 0 && data.totp[0].status === 'verified') {
                setMfaStatus('enabled');
            }
        }
    };

    const fetchActivityLogs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('actor_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setLogs(data);
        setLoading(false);
    };

    const handleUpdatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setPassLoading(true);
        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password updated successfully");
            setPasswordData({ newPassword: '', confirmPassword: '' });
            logSecurityEvent('PASSWORD_CHANGE', 'User changed their password');
        }
        setPassLoading(false);
    };

    const startMfaEnrollment = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp'
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        setEnrollFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setEnrollStep('verify');
    };

    const verifyMfaEnrollment = async () => {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({
            factorId: enrollFactorId,
            code: verifyCode
        });

        if (error) {
            toast.error("Invalid code. Try again.");
            return;
        }

        toast.success("MFA Enabled Successfully!");
        setMfaStatus('enabled');
        setEnrollStep('init');
        setVerifyCode('');
        logSecurityEvent('MFA_ENABLE', 'User enabled 2FA');
    };

    const disableMfa = async () => {
        if (!window.confirm("Are you sure you want to disable 2FA? This reduces security.")) return;

        const { data } = await supabase.auth.mfa.listFactors();
        const factorId = data?.totp[0]?.id;

        if (factorId) {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success("MFA Disabled");
                setMfaStatus('disabled');
                logSecurityEvent('MFA_DISABLE', 'User disabled 2FA');
            }
        }
    };

    const logSecurityEvent = async (action: string, details: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any).from('audit_logs').insert({
            actor_id: user.id,
            action,
            target_resource: 'user_security',
            details: { message: details }
        });
        fetchActivityLogs();
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Security Settings</h2>

            <div className="flex gap-4 mb-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('password')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'password' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Key size={16} /> Password
                </button>
                <button
                    onClick={() => setActiveTab('mfa')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'mfa' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Smartphone size={16} /> Two-Factor Auth
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Activity size={16} /> Recent Activity
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 min-h-[400px]">
                {activeTab === 'password' && (
                    <div className="max-w-md space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg text-amber-800 text-sm mb-4">
                            <Lock size={20} className="shrink-0" />
                            <p>For your security, you will be logged out of other devices after changing your password.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={passwordData.newPassword}
                                onChange={e => setPasswordData(s => ({ ...s, newPassword: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={passwordData.confirmPassword}
                                onChange={e => setPasswordData(s => ({ ...s, confirmPassword: e.target.value }))}
                            />
                        </div>
                        <button
                            onClick={handleUpdatePassword}
                            disabled={passLoading}
                            className="mt-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors w-full disabled:opacity-50"
                        >
                            {passLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                )}

                {activeTab === 'mfa' && (
                    <div>
                        {mfaStatus === 'enabled' ? (
                            <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">2FA is Enabled</h3>
                                <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">Your account is secured with Two-Factor Authentication. You will be asked for a code when you log in.</p>
                                <button
                                    onClick={disableMfa}
                                    className="text-red-600 font-medium hover:text-red-700 hover:underline"
                                >
                                    Disable 2FA
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-xl">
                                {enrollStep === 'init' ? (
                                    <>
                                        <div className="flex items-start gap-4 mb-8">
                                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                                <Smartphone size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">Secure your account</h3>
                                                <p className="text-slate-500 text-sm mt-1">Two-factor authentication adds an extra layer of security to your account by asking for a verification code when you sign in.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={startMfaEnrollment}
                                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                                        >
                                            Setup 2FA
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <h3 className="font-bold text-slate-900">Scan this QR Code</h3>
                                            <p className="text-sm text-slate-500 mb-4">Use an authenticator app like Google Authenticator or Authy.</p>

                                            {qrCode && (
                                                <div className="bg-white p-4 inline-block border border-slate-200 rounded-lg shadow-sm">
                                                    <div dangerouslySetInnerHTML={{ __html: qrCode }} className="w-48 h-48" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="max-w-xs mx-auto">
                                            <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Enter Verification Code</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-lg font-mono"
                                                placeholder="000 000"
                                                maxLength={6}
                                                value={verifyCode}
                                                onChange={e => setVerifyCode(e.target.value)}
                                            />
                                            <button
                                                onClick={verifyMfaEnrollment}
                                                className="mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors w-full"
                                            >
                                                Verify & Enable
                                            </button>
                                            <button
                                                onClick={() => setEnrollStep('init')}
                                                className="mt-2 text-slate-400 text-sm hover:text-slate-600 w-full"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div>
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400">No recent activity</td></tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {log.action.replace(/_/g, ' ')}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                                                    {JSON.stringify(log.details)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
