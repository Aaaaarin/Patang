import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Bell, Lock, Key, Settings, UserCheck, AlertTriangle } from 'lucide-react';

const ExecutiveSettingsPage = () => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Mock settings state for UI demonstration
    const [settings, setSettings] = useState({
        autoApproveVerifiedClubs: false,
        strictPenaltyEnforcement: true,
        requireReasonForRejection: true,
        emailAlertsMajorEvents: true,
        emailAlertsSuspensions: true,
        dailyDigest: true,
        twoFactorAuth: false,
        sessionTimeout: '60'
    });

    const handleToggle = (key) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setSaving(true);
        // Simulate API call
        setTimeout(() => {
            setSaving(false);
            setSuccessMsg('Settings successfully updated.');
            setTimeout(() => setSuccessMsg(''), 3000);
        }, 800);
    };

    const SectionHeader = ({ title, icon: Icon, description }) => (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="text-brand-500" size={18} />
                <h2 className="text-base font-bold text-gray-800">{title}</h2>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
    );

    const ToggleRow = ({ label, description, checked, onChange, danger }) => (
        <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="pr-4">
                <p className={`text-sm font-semibold ${danger ? 'text-red-700' : 'text-gray-800'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${checked ? (danger ? 'bg-red-500' : 'bg-brand-500') : 'bg-gray-200'
                    }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Portal Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure global policies, notifications, and security rules.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                    <UserCheck size={16} />
                    {successMsg}
                </div>
            )}

            <div className="space-y-6">
                {/* Policy Configuration */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <SectionHeader
                        title="Global Policies"
                        icon={Shield}
                        description="Automated rules for handling venues and users."
                    />
                    <div className="space-y-1">
                        <ToggleRow
                            label="Auto-Approve Verified Clubs"
                            description="Automatically approve bookings requested by institute-verified clubs for recurring slots."
                            checked={settings.autoApproveVerifiedClubs}
                            onChange={() => handleToggle('autoApproveVerifiedClubs')}
                        />
                        <ToggleRow
                            label="Require Rejection Reason"
                            description="Mandate a detailed text reason when an executive rejects a venue booking."
                            checked={settings.requireReasonForRejection}
                            onChange={() => handleToggle('requireReasonForRejection')}
                        />
                        <ToggleRow
                            label="Strict Penalty Enforcement"
                            description="Automatically suspend users with 3 or more unexcused no-shows in a month."
                            checked={settings.strictPenaltyEnforcement}
                            danger={true}
                            onChange={() => handleToggle('strictPenaltyEnforcement')}
                        />
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <SectionHeader
                        title="Notification Preferences"
                        icon={Bell}
                        description="Manage when and how you receive portal alerts."
                    />
                    <div className="space-y-1">
                        <ToggleRow
                            label="Major Event Alerts"
                            description="Receive immediate emails when a high-capacity event is requested."
                            checked={settings.emailAlertsMajorEvents}
                            onChange={() => handleToggle('emailAlertsMajorEvents')}
                        />
                        <ToggleRow
                            label="Suspension Alerts"
                            description="Notify me when a user is suspended by the automated penalty system."
                            checked={settings.emailAlertsSuspensions}
                            onChange={() => handleToggle('emailAlertsSuspensions')}
                        />
                        <ToggleRow
                            label="Executive Daily Digest"
                            description="Send a daily morning email summarizing pending approvals and system health."
                            checked={settings.dailyDigest}
                            onChange={() => handleToggle('dailyDigest')}
                        />
                    </div>
                </div>

                {/* Access & Security */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <SectionHeader
                        title="Access Configuration"
                        icon={Lock}
                        description="Security settings for the Executive Portal environment."
                    />
                    <div className="space-y-4 pt-2">
                        <ToggleRow
                            label="Two-Factor Authentication (2FA)"
                            description="Require OTP verification for all executive accounts upon login."
                            checked={settings.twoFactorAuth}
                            onChange={() => handleToggle('twoFactorAuth')}
                        />
                        <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-4 pt-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Idle Session Timeout</p>
                                <p className="text-xs text-gray-500 mt-0.5">Automatically log out inactive executive sessions.</p>
                            </div>
                            <select
                                value={settings.sessionTimeout}
                                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                                className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="15">15 Minutes</option>
                                <option value="30">30 Minutes</option>
                                <option value="60">1 Hour</option>
                                <option value="240">4 Hours</option>
                            </select>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 mt-4 border border-amber-100 flex items-start gap-3">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-amber-800">
                                Changes to security features will forcibly log out all other active executive sessions to ensure immediate compliance.
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExecutiveSettingsPage;
