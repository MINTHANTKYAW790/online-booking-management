import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, Timestamp, doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Service, Staff, StoreConfig } from '../../types';
import { format, addDays, startOfDay, isToday, getDay, isBefore } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, Loader2, Sparkles, User } from 'lucide-react';
import { getAvailableTimeSlots } from '../../services/bookingEngine';
import { cn, formatPrice } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_CONFIG: StoreConfig = {
  storeName: 'Lumière Nail Spa',
  tagline: 'Elegance at your fingertips',
  logoUrl: '',
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
};

export default function CustomerBooking({ user, onBookingComplete }: { user: any, onBookingComplete: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [bookingMode, setBookingMode] = useState<'specialist' | 'time' | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [availableSlots, setAvailableSlots] = useState<{ time: Date, availableStaffIds: string[] }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ time: Date, availableStaffIds: string[] } | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);

  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    if (user && !customerName) setCustomerName(user.displayName || '');
  }, [user]);

  useEffect(() => {
    const unsubServices = onSnapshot(query(collection(db, 'services'), where('isActive', '==', true)), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });

    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'global'));
        if (snap.exists()) {
          const data = snap.data() as StoreConfig;
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            closedDay: data.closedDay ?? 0,
            socialMediaLinks: {
              ...DEFAULT_CONFIG.socialMediaLinks,
              ...(data.socialMediaLinks || {})
            }
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'config/global');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    return () => { unsubServices(); unsubStaff(); };
  }, []);

  useEffect(() => {
    if (selectedService && selectedDate) {
      setLoading(true);
      // If a staff is already selected (Specialist-first), only check their availability
      const staffToCheck = selectedStaff ? [selectedStaff] : staff;
      
      getAvailableTimeSlots(selectedDate, selectedService, staffToCheck, config).then(slots => {
        const filtered = isToday(selectedDate) 
          ? slots.filter(s => s.time > new Date())
          : slots;
        setAvailableSlots(filtered);
        setLoading(false);
      });
    }
  }, [selectedService, selectedDate, staff, config, selectedStaff]);

  const handleBooking = async () => {
    if (!selectedService || !selectedSlot || !user) return;
    
    // Determine which staff member to use
    // If Specialist-first, it's selectedStaff
    // If Time-first, and we've picked a slot, we need to ensure a staff member is assigned
    const staffId = selectedStaff ? selectedStaff.id : selectedSlot.availableStaffIds[0];
    
    if (!staffId) return;

    setIsSubmitting(true);

    const end = new Date(selectedSlot.time.getTime() + selectedService.duration * 60000);
    const bookingData = {
      customerId: user.uid,
      serviceId: selectedService.id,
      staffId: staffId,
      startTime: Timestamp.fromDate(selectedSlot.time),
      endTime: Timestamp.fromDate(end),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const piiData = {
      customerName: customerName || user.displayName || 'Guest',
      customerEmail: user.email,
      customerPhone: customerPhone,
    };

    try {
      const bookingsRef = collection(db, 'bookings');
      const bookingDocRef = doc(bookingsRef);
      const piiDocRef = doc(db, 'bookings', bookingDocRef.id, 'customer', 'pii');

      const batch = writeBatch(db);
      batch.set(bookingDocRef, bookingData);
      batch.set(piiDocRef, piiData);

      await batch.commit();
      
      setSuccessBooking({ ...bookingData, ...piiData, id: bookingDocRef.id });
      setStep(6); // Success step
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && step === 1) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>;

  if (step === 6 && successBooking) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-display mb-2">Booking Confirmed!</h2>
        <p className="text-brand-500 mb-8 italic">We've reserved your spot at Lumière.</p>
        <div className="bg-white p-6 rounded-3xl border border-brand-100 text-left mb-8">
          <div className="flex justify-between mb-4 border-b border-brand-50 pb-4 text-brand-500 text-sm">
            <span>Reference</span>
            <span className="font-mono text-brand-950 uppercase">{successBooking.id.slice(0, 8)}</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-bold">Service</p>
              <p className="font-bold">{selectedService?.name}</p>
            </div>
            <div className="flex justify-between">
               <div>
                 <p className="text-xs uppercase tracking-widest text-brand-400 font-bold">Date</p>
                 <p className="font-medium">{format(selectedSlot!.time, 'EEEE, MMM do')}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs uppercase tracking-widest text-brand-400 font-bold">Time</p>
                 <p className="font-medium">{format(selectedSlot!.time, 'h:mm a')}</p>
               </div>
            </div>
          </div>
        </div>
        <button onClick={onBookingComplete} className="w-full py-4 bg-brand-950 text-white rounded-full font-bold hover:bg-brand-800 transition-colors">Done</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
      <div className="flex-1 space-y-12">
        <header>
          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-4">
            <span className={cn(step >= 1 ? "text-brand-900" : "")}>01 Service</span>
            <ChevronRight size={10} />
            <span className={cn(step >= 2 ? "text-brand-900" : "")}>02 Preference</span>
            <ChevronRight size={10} />
            <span className={cn(step >= 3 ? "text-brand-900" : "")}>03 Path</span>
            <ChevronRight size={10} />
            <span className={cn(step >= 5 ? "text-brand-900" : "")}>04 Confirm</span>
          </div>
          <h2 className="text-4xl font-display">
            {step === 1 && "Choose Treatment"}
            {step === 2 && "Booking Preference"}
            {step === 3 && (bookingMode === 'specialist' ? "Choose Specialist" : "Pick a Date")}
            {step === 4 && (bookingMode === 'specialist' ? "Pick a Date" : "Available Slots")}
            {step === 5 && (bookingMode === 'specialist' ? "Available Slots" : "Who will look after you?")}
            {step === 10 && "Complete Booking"}
          </h2>
        </header>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(s => (
                <button key={s.id} onClick={() => { setSelectedService(s); setStep(2); }} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm text-left hover:border-brand-300 transition-all group">
                  <div className="w-8 h-1 mb-4 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <h3 className="text-xl font-bold mb-1 group-hover:text-brand-600">{s.name}</h3>
                  <p className="text-sm text-brand-500 mb-4 line-clamp-2">{s.description}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-brand-50">
                    <span className="text-sm font-medium">{s.duration} min</span>
                    <span className="text-lg font-display font-medium text-brand-900">{formatPrice(s.price)}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => { setBookingMode('specialist'); setStep(3); }}
                className="bg-white p-8 rounded-[2.5rem] border border-brand-100 shadow-sm text-left hover:border-brand-300 transition-all group flex flex-col items-center text-center py-12"
              >
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 text-brand-600 group-hover:scale-110 transition-transform">
                  <User size={32} />
                </div>
                <h3 className="text-2xl font-display mb-2">Choose by Specialist</h3>
                <p className="text-sm text-brand-500 italic">Follow your favourite practitioners</p>
              </button>

              <button 
                onClick={() => { setBookingMode('time'); setStep(3); }}
                className="bg-white p-8 rounded-[2.5rem] border border-brand-100 shadow-sm text-left hover:border-brand-300 transition-all group flex flex-col items-center text-center py-12"
              >
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 text-brand-600 group-hover:scale-110 transition-transform">
                  <Clock size={32} />
                </div>
                <h3 className="text-2xl font-display mb-2">Choose by Time</h3>
                <p className="text-sm text-brand-500 italic">Find a slot that fits your schedule</p>
              </button>
              <div className="sm:col-span-2">
                <button onClick={() => setStep(1)} className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold transition-colors">Back to Services</button>
              </div>
            </motion.div>
          )}

          {step === 3 && bookingMode === 'specialist' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staff.filter(s => s.isActive && s.skills.includes(selectedService!.id)).map(s => (
                  <button key={s.id} onClick={() => { setSelectedStaff(s); setStep(4); }} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm flex items-center gap-6 text-left hover:border-brand-300 transition-all group">
                    <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-300 group-hover:text-brand-600 transition-colors">
                      <User size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-brand-600">{s.name}</h3>
                      <p className="text-xs text-brand-400 font-bold uppercase tracking-widest mt-1">Specialist</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold">Back</button>
            </motion.div>
          )}

          {( (step === 3 && bookingMode === 'time') || (step === 4 && bookingMode === 'specialist') ) && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {Array.from({ length: 14 }).map((_, i) => {
                  const date = addDays(new Date(), i);
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  const isClosed = config.closedDay !== -1 && getDay(date) === config.closedDay;
                  const isPast = isBefore(date, startOfDay(new Date()));

                  return (
                    <button 
                      key={i} 
                      onClick={() => !isClosed && !isPast && setSelectedDate(startOfDay(date))} 
                      disabled={isClosed || isPast}
                      className={cn(
                        "flex-shrink-0 w-20 py-4 rounded-2xl flex flex-col items-center transition-all relative", 
                        isSelected ? "bg-brand-950 text-white shadow-xl scale-110" : "bg-white border border-brand-100 hover:border-brand-300",
                        (isClosed || isPast) && "opacity-40 grayscale cursor-not-allowed border-dashed"
                      )}
                    >
                      <span className={cn("text-[10px] uppercase font-bold tracking-widest", isSelected ? "text-brand-300" : "text-brand-400")}>{format(date, 'EEE')}</span>
                      <span className="text-xl font-bold">{format(date, 'd')}</span>
                      {isClosed && <span className="absolute -bottom-1 text-[8px] font-bold text-red-500 uppercase tracking-tighter bg-white px-1 border border-brand-100 rounded">Closed</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(bookingMode === 'specialist' ? 3 : 2)} className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold">Back</button>
                <button onClick={() => setStep(bookingMode === 'specialist' ? 5 : 4)} className="flex-1 px-8 py-3 bg-brand-950 text-white rounded-full font-bold hover:bg-brand-800 shadow-lg">View Available Slots</button>
              </div>
            </motion.div>
          )}

          {( (step === 4 && bookingMode === 'time') || (step === 5 && bookingMode === 'specialist') ) && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-400 mb-6 font-sans"><Clock size={16} /> Available Times</h4>
                {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-400" /></div> : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {availableSlots.map(slot => (
                      <button 
                        key={slot.time.toISOString()} 
                        onClick={() => {
                          setSelectedSlot(slot);
                        }} 
                        className={cn("py-3 rounded-xl text-sm font-medium border transition-all", selectedSlot?.time.toISOString() === slot.time.toISOString() ? "bg-brand-600 border-brand-600 text-white" : "bg-white border-brand-100 hover:border-brand-300")}
                      >
                        {format(slot.time, 'h:mm a')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-brand-100 rounded-3xl text-brand-500 italic">
                    {staff.filter(s => s.isActive && s.skills.includes(selectedService!.id)).length === 0 
                      ? "No practitioners currently available for this service."
                      : "All booked up for this day. Please try another date or check back later."}
                    {isToday(selectedDate) && staff.length > 0 && <p className="text-xs mt-2 not-italic">Note: Same-day bookings may be limited or past current hours.</p>}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(bookingMode === 'specialist' ? 4 : 3)} className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold">Back</button>
                <button 
                  disabled={!selectedSlot} 
                  onClick={() => {
                    // In specialist mode, we already have staff. In time mode, we need to pick a staff from slot.availableStaffIds
                    if (bookingMode === 'specialist') {
                      setStep(10); // Confirmation
                    } else {
                      // If only one staff member is available for this slot, we can auto-select them and go to step 10
                      if (selectedSlot?.availableStaffIds.length === 1) {
                        setSelectedStaff(staff.find(s => s.id === selectedSlot.availableStaffIds[0]) || null);
                        setStep(10);
                      } else {
                        setStep(5);
                      }
                    }
                  }} 
                  className="flex-1 px-8 py-3 bg-brand-950 text-white rounded-full font-bold hover:bg-brand-800 disabled:opacity-50 shadow-lg"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && bookingMode === 'time' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staff.filter(s => selectedSlot?.availableStaffIds.includes(s.id)).map(s => (
                  <button key={s.id} onClick={() => { setSelectedStaff(s); setStep(10); }} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm flex items-center gap-6 text-left hover:border-brand-300 transition-all group">
                    <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-300 group-hover:text-brand-600 transition-colors">
                      <User size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-brand-600">{s.name}</h3>
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-1">Available at {format(selectedSlot!.time, 'h:mm a')}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(4)} className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold">Back</button>
            </motion.div>
          )}

          {step === 10 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="bg-white p-8 rounded-3xl border border-brand-100 shadow-sm space-y-8">
                <div className="flex justify-between items-start">
                   <div>
                     <h3 className="text-2xl font-display">{selectedService?.name}</h3>
                     <p className="text-brand-500 italic">{selectedService?.description}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-3xl font-display">{formatPrice(selectedService!.price)}</p>
                     <p className="text-xs text-brand-400 font-bold uppercase tracking-widest">{selectedService!.duration} minutes</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-brand-50">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-400">Contact Details</h4>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1 ml-1">Full Name</label>
                      <input 
                        required 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-2 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1 ml-1">Phone Number</label>
                      <input 
                        required 
                        type="tel"
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +1 234 567 890"
                        className="w-full px-4 py-2 border border-brand-100 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-brand-400">Appointment Details</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><CalendarIcon size={20} /></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Date</p><p className="font-bold text-sm tracking-tight">{format(selectedSlot!.time, 'EEEE, MMM do')}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><Clock size={20} /></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Time</p><p className="font-bold text-sm tracking-tight">{format(selectedSlot!.time, 'h:mm a')}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600"><User size={20} /></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Specialist</p><p className="font-bold text-sm tracking-tight">{selectedStaff?.name}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {!user && (
                <div className="p-8 bg-brand-100 rounded-[2.5rem] flex flex-col items-center gap-6 text-center border border-brand-200">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display mb-2">Sign in to complete booking</h4>
                    <p className="text-sm text-brand-500 italic max-w-xs mx-auto font-serif">We'll save your appointment and send you updates about your treatment.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const provider = new GoogleAuthProvider();
                      try {
                        await signInWithPopup(auth, provider);
                      } catch (error) {
                        console.error("Sign in failed", error);
                      }
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-white border border-brand-200 rounded-full font-bold shadow-sm hover:bg-brand-50 transition-all group scale-105"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="" />
                    Sign in with Google
                  </button>
                </div>
              )}
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    if (bookingMode === 'specialist') {
                      setStep(5);
                    } else {
                      // If we came from 4 (auto-selected staff), go back to 4. Otherwise 5.
                      // We can check if multiple staff were available for current slot
                      if (selectedSlot && selectedSlot.availableStaffIds.length > 1) {
                        setStep(5);
                      } else {
                        setStep(4);
                      }
                    }
                  }} 
                  className="px-8 py-3 border border-brand-200 rounded-full hover:bg-brand-50 font-bold"
                >
                  Back
                </button>
                <button 
                  disabled={!user || isSubmitting || !customerName || !customerPhone} 
                  onClick={handleBooking} 
                  className="flex-1 py-4 bg-brand-950 text-white rounded-full font-bold hover:bg-brand-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Confirm My Appointment"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full md:w-80 flex-shrink-0">
         <div className="sticky top-24 bg-brand-100 p-8 rounded-[2.5rem] border border-brand-200">
            <h3 className="text-xl font-display mb-6">Reservation Summary</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-400"><Sparkles size={16} /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1">Service</p><p className="text-sm font-bold">{selectedService?.name || 'Pending...'}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-400"><CalendarIcon size={16} /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1">When</p><p className="text-sm font-bold">{selectedSlot ? format(selectedSlot.time, 'MMM do @ h:mm a') : 'Select time...'}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-brand-400"><User size={16} /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1">Specialist</p><p className="text-sm font-bold">{selectedStaff?.name || 'Any specialist'}</p></div></div>
              <div className="pt-6 border-t border-brand-200 mt-6 flex justify-between items-center"><span className="text-sm font-bold text-brand-500 uppercase tracking-widest">Total</span><span className="text-2xl font-display font-medium">{selectedService ? formatPrice(selectedService.price) : '--'}</span></div>
            </div>
         </div>
      </div>
    </div>
  );
}
