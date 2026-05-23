/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { signInWithRedirect, GoogleAuthProvider, signOut, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { LogIn, LogOut, Calendar, Users, Settings, PlusCircle, Menu, X, Scissors, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import ServiceManagement from './components/admin/ServiceManagement';
import StaffManagement from './components/admin/StaffManagement';
import BookingCalendar from './components/admin/BookingCalendar';
import StoreProfileSettings from './components/admin/StoreProfileSettings';
import CustomerBooking from './components/booking/CustomerBooking';

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [mockUser, setMockUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'customer' | null>(null);
  const [activeTab, setActiveTab] = useState<'booking' | 'admin-calendar' | 'admin-services' | 'admin-staff' | 'admin-config'>('booking');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Merge real user and mock user
  const currentUser = mockUser || user;

  useEffect(() => {
    // Check for redirect result on mount
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Successfully signed in via redirect");
          setIsLoggingIn(false);
        }
      } catch (err: any) {
        console.error("Redirect login error:", err);
        setLoginError(`Sign in failed: ${err.message || 'Please try again.'}`);
      }
    };
    checkRedirect();
  }, []);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        if (currentUser) {
          // If it's the mock admin, set role directly
          if (mockUser) {
            setUserRole('admin');
            setActiveTab('admin-calendar');
            return;
          }

          // 1. Try UID first
          if (currentUser.email === 'kthura397@gmail.com') {
          setUserRole('admin');
          if (activeTab === 'booking') setActiveTab('admin-calendar');
          return;
        }

        const staffDoc = await getDoc(doc(db, 'staff', currentUser.uid));
          if (staffDoc.exists()) {
            setUserRole(staffDoc.data().role);
            if (activeTab === 'booking') setActiveTab('admin-calendar');
          } else {
            // 2. Fallback to Email if UID not found (for pre-added staff)
            const q = query(collection(db, 'staff'), where('email', '==', currentUser.email));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
              const staffData = snap.docs[0].data();
              // Migrate document to use UID as ID
              await setDoc(doc(db, 'staff', currentUser.uid), staffData);
              await deleteDoc(snap.docs[0].ref);
              
              setUserRole(staffData.role);
              if (activeTab === 'booking') setActiveTab('admin-calendar');
            } else {
              setUserRole('customer');
            }
          }
        } else {
          setUserRole(null);
          setActiveTab('booking');
        }
      } catch (err: any) {
        console.error("Failed to fetch user role:", err);
        // If it's a connectivity issue, we might want to still allow customer view if possible
        // but for now we just log it.
        setUserRole('customer'); 
      }
    }
    fetchUserRole();
  }, [currentUser, mockUser]);

  const handleDemoLogin = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const u = formData.get('username');
    const p = formData.get('password');

    if (u === 'admin' && p === 'admin123') {
      setMockUser({
        uid: 'demo-admin',
        displayName: 'Demo Admin',
        email: 'admin@lumiere.spa',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
      });
      setLoginError('');
      setIsLoggingIn(false);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogin = async () => {
    if (isAuthProcessing) return;
    setIsAuthProcessing(true);
    setLoginError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/operation-not-allowed') {
        setLoginError('Google sign-in is not enabled in the Firebase console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError('This domain is not authorized for OAuth. Please add it to the Firebase console.');
      } else {
        setLoginError(`Sign in failed: ${err.message || 'Please try again.'}`);
      }
      setIsAuthProcessing(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setMockUser(null);
  };

  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff' || isAdmin;

  const initializeStore = async () => {
    if (!currentUser || !isAdmin) return;
    try {
      await setDoc(doc(db, 'config', 'global'), {
        storeName: 'Lumière Nail Spa',
        tagline: 'Elegance at your fingertips',
        address: '123 Beauty Lane, Glow City, GC 54321',
        phoneNumber: '+1 (555) 000-1111',
        email: 'hello@lumiere.spa',
        website: 'www.lumiere.spa',
        socialMediaLinks: {
          facebook: '',
          instagram: '',
          tiktok: ''
        },
        openTime: '09:00',
        closeTime: '21:00',
        lastBookingTime: '20:00',
        bufferTime: 15,
        bookingInterval: 30,
        themePrimaryColor: '#4f46e5',
        closedDay: 0
      });

      const services = [
        { name: 'Classic Manicure', duration: 45, maxParallel: 6, price: 35, color: '#f472b6', isActive: true, description: 'Basic clean, shape, and polish.' },
        { name: 'Gel Color', duration: 90, maxParallel: 4, price: 55, color: '#db2777', isActive: true, description: 'Long-lasting gel polish with a high-shine finish.' },
        { name: 'Nail Art', duration: 120, maxParallel: 2, price: 85, color: '#9d174d', isActive: true, description: 'Custom hand-painted designs by our experts.' }
      ];
      
      const serviceRefs = [];
      for (const s of services) {
        const ref = await addDoc(collection(db, 'services'), s);
        serviceRefs.push(ref.id);
      }

      const staffRef = doc(db, 'staff', currentUser.uid);
      const staffSnap = await getDoc(staffRef);
      if (!staffSnap.exists()) {
        const schedule: any = {};
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
          schedule[day] = { start: '09:00', end: '18:00', isWorking: true };
        });
        
        await setDoc(staffRef, {
          name: currentUser.displayName || 'Admin',
          email: currentUser.email,
          role: 'admin',
          skills: serviceRefs,
          schedule,
          isActive: true
        });
      }
      
      alert("Store initialized successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Init failed", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-50">
      {isStaff && (
        <>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg"
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>

          <aside className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-brand-200 transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
          `}>
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                  <Scissors size={20} />
                </div>
                <h1 className="text-xl font-display font-bold tracking-tight">Lumière</h1>
              </div>

              <nav className="flex-1 space-y-2">
                <SidebarItem 
                  active={activeTab === 'admin-calendar'} 
                  onClick={() => setActiveTab('admin-calendar')}
                  icon={<Calendar size={20} />}
                  label="Schedule"
                />
                <SidebarItem 
                  active={activeTab === 'admin-services'} 
                  onClick={() => setActiveTab('admin-services')}
                  icon={<PlusCircle size={20} />}
                  label="Services"
                />
                <SidebarItem 
                  active={activeTab === 'admin-staff'} 
                  onClick={() => setActiveTab('admin-staff')}
                  icon={<Users size={20} />}
                  label="Staff"
                />
                <SidebarItem 
                  active={activeTab === 'admin-config'} 
                  onClick={() => setActiveTab('admin-config')}
                  icon={<Settings size={20} />}
                  label="Settings"
                />
                <div className="pt-8 border-t border-brand-100">
                  <SidebarItem 
                    active={activeTab === 'booking'} 
                    onClick={() => setActiveTab('booking')}
                    icon={<PlusCircle size={20} />}
                    label="Customer View"
                  />
                </div>
              </nav>

              <div className="pt-4 border-t border-brand-100">
                <div className="flex items-center gap-3 mb-4">
                  {currentUser?.photoURL && <img src={currentUser.photoURL} className="w-8 h-8 rounded-full" alt="" />}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{currentUser?.displayName}</p>
                    <p className="text-xs text-brand-500 capitalize">{userRole}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-brand-200 rounded-lg text-sm hover:bg-brand-50 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        {!isStaff && (
          <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-brand-200 px-6 flex items-center justify-between z-30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
                <Scissors size={20} />
              </div>
              <h1 className="text-xl font-display font-bold">Lumière</h1>
            </div>
            {currentUser ? (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium hover:text-brand-600 transition-colors"
              >
                Sign Out <LogOut size={16} />
              </button>
            ) : (
              <button 
                onClick={() => setIsLoggingIn(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-950 text-white rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors shadow-lg"
              >
                <LogIn size={16} /> Login
              </button>
            )}
          </header>
        )}

        <div className={`p-6 ${!isStaff ? 'pt-24' : ''}`}>
          {mockUser && (
            <div className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-full flex items-center gap-2 shadow-lg animate-pulse">
              <Sparkles size={14} /> Demo Mode: Database writes disabled. Sign in with Google to test full features.
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'booking' && <CustomerBooking user={currentUser} onBookingComplete={() => isStaff && setActiveTab('admin-calendar')} />}
              {activeTab === 'admin-calendar' && <BookingCalendar />}
              {activeTab === 'admin-services' && <ServiceManagement />}
              {activeTab === 'admin-staff' && <StaffManagement />}
              {activeTab === 'admin-config' && <StoreProfileSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Login Modal */}
      {isLoggingIn && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden"
          >
            <button onClick={() => setIsLoggingIn(false)} className="absolute top-6 right-6 text-brand-400 hover:text-brand-950">
              <X size={24} />
            </button>
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Scissors size={28} />
              </div>
              <h2 className="text-2xl font-display">Lumière Spa</h2>
              <p className="text-sm text-brand-500 italic mt-1 font-serif">Demo Login</p>
            </div>
            <form onSubmit={handleDemoLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-400 mb-1.5 ml-1">Username</label>
                <input required name="username" placeholder="admin" className="w-full px-4 py-3 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-400 mb-1.5 ml-1">Password</label>
                <input required name="password" type="password" placeholder="admin123" className="w-full px-4 py-3 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm" />
              </div>
              {loginError && <p className="text-xs text-red-500 text-center font-medium animate-pulse">{loginError}</p>}
              <button type="submit" className="w-full py-4 bg-brand-950 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-brand-800 transition-all mt-4">
                Sign In
              </button>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-50"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-brand-400 tracking-widest bg-white px-2">Or continue with</div>
              </div>
              <button 
                type="button"
                onClick={handleLogin}
                disabled={isAuthProcessing}
                className="w-full py-4 border border-brand-100 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthProcessing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-600"></div>
                ) : (
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
                )}
                {isAuthProcessing ? 'Processing...' : 'Sign in with Google'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${active ? 'bg-brand-100 text-brand-900 border-l-4 border-brand-600' : 'text-brand-500 hover:bg-brand-50 hover:text-brand-900'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
