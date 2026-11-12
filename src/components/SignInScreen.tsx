import React, { useState } from 'react';
import { UserProfile, LanguageCode } from '../types';
import { INDIAN_LANGUAGES, t } from '../utils/i18n';
import { OmniStockLogo } from './OmniStockLogo';

interface SignInScreenProps {
  onSignIn: (user: UserProfile, isNewUser?: boolean) => void;
  accounts?: UserProfile[];
  onDeleteAccount?: (user: UserProfile) => void;
  currentLang?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
}

// Strict Real Email Validator
export function validateRealEmail(email: string): { isValid: boolean; message: string } {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Email address is mandatory.' };
  }

  // RFC standard email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid real email format (e.g., name@gmail.com, alex@company.com).' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, message: 'Email must contain exactly one @ symbol.' };
  }

  const [localPart, domain] = parts;
  if (localPart.length < 2) {
    return { isValid: false, message: 'Email username is too short.' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, message: 'Domain must include a valid extension (e.g., .com, .in, .org).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return { isValid: false, message: 'Domain extension (.tld) is too short.' };
  }

  // Blacklist dummy / placeholder domains & emails
  const blacklisted = [
    'test@test.com',
    'admin@admin.com',
    'fake@fake.com',
    'none@none.com',
    'asdf@asdf.com',
    'abc@abc.com',
    'aaa@aaa.com',
    '123@123.com',
    'user@user.com',
    'dummy@dummy.com',
    'sample@sample.com',
  ];

  if (blacklisted.includes(trimmed.toLowerCase())) {
    return { isValid: false, message: 'Disposable or dummy email IDs are not allowed. Please enter your real email.' };
  }

  if (domain.toLowerCase() === 'test.com' || domain.toLowerCase() === 'example.com' || domain.toLowerCase() === 'dummy.com') {
    return { isValid: false, message: 'Please use an active real email provider domain.' };
  }

  return { isValid: true, message: 'Valid real email address.' };
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onSignIn,
  accounts = [],
  onDeleteAccount,
  currentLang = 'en',
  onLanguageChange,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Sign In form fields
  const [identifier, setIdentifier] = useState('staff@kitchen.com');
  const [password, setPassword] = useState('••••••••');

  // Sign Up form fields
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [role, setRole] = useState('kitchen_manager');
  const [newPassword, setNewPassword] = useState('');

  // Notification state
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const emailValidation = validateRealEmail(email);

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if matching account exists
    const matching = accounts.find(
      (a) =>
        a.email.toLowerCase() === identifier.trim().toLowerCase() ||
        a.staffId.toLowerCase() === identifier.trim().toLowerCase()
    );

    if (matching) {
      onSignIn(matching, false);
      return;
    }

    onSignIn({
      id: `usr-${Date.now()}`,
      name: identifier.includes('gordon') ? 'Gordon Ramsay' : 'Marcus Vance',
      email: identifier.includes('@') ? identifier : 'staff@kitchen.com',
      staffId: identifier.startsWith('S-') ? identifier : 'S-1029',
      role: 'Warehouse Operations Manager',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqyWXBWYpi1tEQFIX_Girep3yxej7LF6e8px6GNP5Y2Yk5L_0nVQKcmRV7zwOA3JM3IfVjnzWsr9GdXZF57jD9udcSwZOURck0DFXpiatldVRoLDiLMA6sfGOqICyyGfpCyC4y0V8Mfe9CdLDWlYChJ4eo0atGCM0Vpr-GvwxdkStWOy-zS_EhwcxhLg__2ziyzco_1FJ-ZEvrDqUIuw9I3i1fvxj6F-mys-2CSG3F6LXGZObdisMrNg',
    }, false);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);

    if (!fullName.trim()) {
      setNotification({ type: 'error', text: 'Please provide your Full Name.' });
      return;
    }

    const checkEmail = validateRealEmail(email);
    if (!checkEmail.isValid) {
      setNotification({ type: 'error', text: checkEmail.message });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setNotification({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setNotification({ type: 'success', text: 'Account successfully registered! Loading your fresh warehouse workspace...' });
    
    setTimeout(() => {
      onSignIn(
        {
          id: `usr-${Date.now()}`,
          name: fullName.trim(),
          email: email.trim(),
          staffId: staffId.trim() || `S-${Math.floor(1000 + Math.random() * 9000)}`,
          role: role ? role.replace('_', ' ').toUpperCase() : 'Operations Staff',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCVAiZJ6RuyGVdokpKBVOAW1oCg17PtcK-Y3GP1EaWgobAL44iK3deniH4bmTqsx_ytH-OiEjMFZc9r-r1o7-20zZgG1ftPsEurYs9_QITQUisF-e5Bt6fJDCkGWrNiFOzngnVTZIx25299UFa9Vnq4awCaRz_J6tAvtEEQoMjMUriEj_0HeLBZlsRyZdegegd6C54oDM43Pc1-HUmlxfde3ZIKtjN1nvTuanT8KFOVabZiqadwyWmWaA',
        },
        true // isNewUser -> Trigger fresh interface!
      );
    }, 700);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification({ type: 'success', text: 'Password recovery instructions dispatched to authorized staff mailbox.' });
    setTimeout(() => {
      setMode('signin');
      setNotification(null);
    }, 2000);
  };

  const fillDemoCredentials = () => {
    setIdentifier('S-1029');
    setPassword('OmniStock2026!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Top Demo Shortcut Banner */}
      <div className="mb-4 flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-xs text-slate-600 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-mono">OmniStock v2.4.1 Production Environment</span>
        <button
          onClick={fillDemoCredentials}
          className="ml-2 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
        >
          Auto-fill Demo ID
        </button>
      </div>

      {notification && (
        <div
          className={`mb-4 w-full max-w-[480px] p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{notification.text}</span>
        </div>
      )}

      {/* BENTO CARD CONTAINER */}
      <div className="w-full max-w-[480px] bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 flex flex-col">
        {mode === 'signin' && (
          <div>
            {/* Official OmniStock Branding / Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <OmniStockLogo variant="full" size="lg" showTagline={true} tagline="Never Runout. Never Overstock" className="mb-2" />
              <h2 className="text-sm font-bold text-slate-700 mt-2 font-mono uppercase tracking-wider">
                Sign In to Dashboard
              </h2>
            </div>

            {/* Saved Accounts Quick Picker */}
            {accounts.length > 0 && (
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">
                      switch_account
                    </span>
                    <span>Saved Accounts ({accounts.length})</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Click to switch</span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="group flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 transition-all shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => onSignIn(acc, false)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate leading-tight">
                            {acc.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">
                            {acc.staffId} • {acc.role}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSignIn(acc, false)}
                          className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Login
                        </button>
                        {onDeleteAccount && accounts.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAccount(acc);
                            }}
                            title={`Delete account for ${acc.name}`}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignInSubmit} className="flex flex-col gap-4">
              {/* Staff ID or Email Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium font-mono text-slate-600" htmlFor="identifier">
                  Staff ID or Email
                </label>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter ID or Email"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center w-full">
                  <label className="text-xs font-medium font-mono text-slate-600" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-mono text-slate-600 hover:text-slate-900 hover:underline focus:outline-none cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-700 text-white rounded-xl font-mono text-sm font-semibold hover:bg-emerald-800 active:scale-[0.99] transition-all flex justify-center items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">New operator? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNotification(null);
                      setMode('signup');
                    }}
                    className="text-xs font-mono font-medium text-emerald-700 hover:underline focus:outline-none cursor-pointer"
                  >
                    Create a New Account
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {mode === 'signup' && (
          <div>
            {/* Header */}
            <div className="text-center mb-5 flex flex-col items-center">
              <OmniStockLogo variant="full" size="md" showTagline={false} className="mb-2" />
              <h2 className="text-base font-bold text-slate-900">Create Fresh Warehouse Account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Real email ID is mandatory for authorization &amp; automatic alert dispatch.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-3">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1" htmlFor="fullName">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    person
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="e.g. Marcus Vance or Ishan Batra"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-shadow"
                  />
                </div>
              </div>

              {/* Real Email ID - Mandatory */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-medium text-slate-700" htmlFor="email">
                    Real Email Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Mandatory
                  </span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="yourname@gmail.com or alex@company.com"
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!emailTouched) setEmailTouched(true);
                    }}
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 outline-none transition-all font-sans ${
                      emailTouched
                        ? emailValidation.isValid
                          ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20'
                          : 'border-rose-400 ring-1 ring-rose-400 bg-rose-50/20'
                        : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                    }`}
                  />
                  {emailTouched && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailValidation.isValid ? (
                        <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
                      )}
                    </span>
                  )}
                </div>
                {emailTouched && (
                  <p
                    className={`text-[11px] mt-1 font-mono ${
                      emailValidation.isValid ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {emailValidation.message}
                  </p>
                )}
              </div>

              {/* Staff ID (Optional) */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1" htmlFor="staffId">
                  Staff ID <span className="text-slate-400">(Optional, auto-generated if blank)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    badge
                  </span>
                  <input
                    id="staffId"
                    type="text"
                    placeholder="e.g. S-2044"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-shadow"
                  />
                </div>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1" htmlFor="role">
                  Operational Role
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    work
                  </span>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-shadow appearance-none"
                  >
                    <option value="kitchen_manager">Kitchen Operations Manager</option>
                    <option value="head_chef">Executive Chef / Head Chef</option>
                    <option value="procurement">Procurement &amp; Supply Officer</option>
                    <option value="line_cook">Inventory Floor Staff / Cook</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1" htmlFor="newPassword">
                  Account Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    lock
                  </span>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-shadow"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={!emailValidation.isValid}
                  className={`w-full font-mono text-sm py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-xs cursor-pointer ${
                    emailValidation.isValid
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.99]'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Register &amp; Open Fresh Workspace</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotification(null);
                    setMode('signin');
                  }}
                  className="w-full text-center font-mono text-xs text-slate-600 hover:text-slate-900 transition-colors py-1 cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'forgot' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-900">
                <span className="material-symbols-outlined text-[24px]">lock_reset</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Password Recovery</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your authorized real email address to receive reset instructions.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                  Registered Real Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-700 text-white font-mono text-sm py-2.5 rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Dispatch Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotification(null);
                    setMode('signin');
                  }}
                  className="w-full text-center font-mono text-xs text-slate-500 hover:text-slate-900 py-1 cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <p>Secure SSL session. Real email verification required for multi-tenant workspace provisioning.</p>
        <p className="mt-1 font-mono text-[11px] text-slate-400">OmniStock Version 2.4.1 • Commercial Precision Engine</p>
      </div>
    </div>
  );
};
