import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Booking, Staff, Service } from '../../types';
import { format, startOfDay, endOfDay, addMinutes, differenceInMinutes, addHours, startOfHour } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Loader2, Phone, MessageSquare, X, User, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); // 8 AM to 9 PM
const PIXELS_PER_MINUTE = 2;

interface BookingItemProps {
  booking: Booking;
  service?: Service;
  getTimePosition: (d: Date) => number;
  onSelect: (booking: Booking, pii: { name: string, phone: string } | null) => void;
}

const BookingItem: React.FC<BookingItemProps> = ({ booking, service, getTimePosition, onSelect }) => {
  const [pii, setPii] = useState<{ name: string, phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPii() {
      try {
        const snap = await getDoc(doc(db, 'bookings', booking.id, 'customer', 'pii'));
        if (snap.exists()) {
          const data = snap.data();
          setPii({ name: data.customerName, phone: data.customerPhone });
        }
      } catch (error) {
        // Silent fail for PII if not permitted
      } finally {
        setLoading(false);
      }
    }
    fetchPii();
  }, [booking.id]);

  const start = booking.startTime.toDate();
  const duration = differenceInMinutes(booking.endTime.toDate(), start);

  return (
    <motion.div 
      key={booking.id} 
      title={`${pii?.name || 'Loading...'} - ${pii?.phone || ''}\n${service?.name}`}
      onClick={() => onSelect(booking, pii)}
      className={cn("absolute top-2 bottom-2 rounded-2xl p-3 shadow-sm border truncate cursor-pointer hover:shadow-md transition-shadow", booking.status === 'completed' ? 'opacity-60 grayscale' : 'opacity-100')} 
      style={{ 
        left: `${getTimePosition(start)}px`, 
        width: `${duration * PIXELS_PER_MINUTE}px`, 
        backgroundColor: `${service?.color || '#ec4899'}20`, 
        borderColor: service?.color || '#ec4899', 
        color: service?.color || '#9d174d' 
      }}
    >
      <p className="font-bold text-xs">{loading ? '...' : (pii?.name || 'Guest')}</p>
      <p className="text-[10px]">{service?.name}</p>
    </motion.div>
  );
}

export default function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<{ b: Booking, pii: { name: string, phone: string } | null } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedBooking) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'bookings', selectedBooking.b.id), {
        status,
        updatedAt: serverTimestamp()
      });
      setSelectedBooking(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'bookings');
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const q = query(
      collection(db, 'bookings'),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime')
    );

    const stopBookings = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'bookings'));

    const stopStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'staff'));

    const stopServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      setLoading(false);
    }, err => handleFirestoreError(err, OperationType.LIST, 'services'));

    return () => { stopBookings(); stopStaff(); stopServices(); };
  }, [selectedDate]);

  const getTimePosition = (date: Date) => {
    const dayStart = startOfHour(addHours(startOfDay(selectedDate), 8)); 
    return differenceInMinutes(date, dayStart) * PIXELS_PER_MINUTE;
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display">Schedule</h2>
          <p className="text-brand-500 italic">Daily operations overview.</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full border border-brand-100 shadow-sm">
          <button onClick={() => setSelectedDate(d => addMinutes(d, -1440))} className="p-1 hover:text-brand-600"><ChevronLeft size={20} /></button>
          <span className="font-bold min-w-32 text-center">{format(selectedDate, 'EEEE, MMM do')}</span>
          <button onClick={() => setSelectedDate(d => addMinutes(d, 1440))} className="p-1 hover:text-brand-600"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-brand-100 shadow-sm overflow-auto h-[70vh] scrollbar-hide">
        <div className="min-w-max relative">
          {/* Current Time Line */}
          {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
            <div 
              className="absolute top-0 bottom-0 pointer-events-none z-40"
              style={{ left: '192px', width: 'calc(100% - 192px)' }}
            >
              {(() => {
                const pos = getTimePosition(currentTime);
                if (pos >= 0 && pos <= 13 * 60 * PIXELS_PER_MINUTE) {
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-px bg-red-400 transition-all duration-1000"
                      style={{ left: `${pos}px` }}
                    >
                      <div className="sticky top-[42px] -ml-1.5 w-3 h-3 rounded-full bg-red-500 shadow-sm border-2 border-white" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="flex border-b border-brand-50 bg-brand-50 sticky top-0 z-30">
            <div className="w-48 border-r border-brand-100 p-4 font-bold text-xs uppercase text-brand-400 sticky left-0 bg-brand-50 z-40">Staff</div>
            <div className="flex-1 relative h-12 min-w-[1700px]">
              {HOURS.map(hour => (
                <div key={hour} className="absolute top-0 bottom-0 border-l border-brand-100" style={{ left: `${(hour - 8) * 60 * PIXELS_PER_MINUTE}px` }}>
                  <span className="text-[10px] font-bold text-brand-400 p-1">{hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            {staff.filter(s => s.isActive).map((member, idx) => (
              <div key={member.id} className={cn("flex border-b border-brand-50 min-h-[70px]", idx % 2 === 0 ? "bg-white" : "bg-brand-50/10")}>
                <div className="w-48 border-r border-brand-100 p-2 flex gap-3 items-center sticky left-0 bg-inherit z-10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">{member.name.charAt(0)}</div>
                  <div><p className="font-bold text-sm whitespace-nowrap">{member.name}</p></div>
                </div>
                <div className="flex-1 relative py-2 min-w-[1700px]">
                  {HOURS.map(hour => <div key={hour} className="absolute top-0 bottom-0 border-l border-brand-100/50" style={{ left: `${(hour - 8) * 60 * PIXELS_PER_MINUTE}px` }}></div>)}
                  {bookings.filter(b => b.staffId === member.id).map(booking => (
                    <BookingItem 
                      key={booking.id}
                      booking={booking}
                      service={services.find(s => s.id === booking.serviceId)}
                      getTimePosition={getTimePosition}
                      onSelect={(b, pii) => setSelectedBooking({ b, pii })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-brand-100"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-display">Booking Details</h3>
                    <p className="text-brand-500 italic">Manage appointment information.</p>
                  </div>
                  <button 
                    onClick={() => setSelectedBooking(null)}
                    className="p-2 hover:bg-brand-50 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Customer PII Section */}
                  <div className="bg-brand-50/50 rounded-3xl p-6 border border-brand-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-brand-100 flex items-center justify-center text-brand-600">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{selectedBooking.pii?.name || 'Guest'}</p>
                        <p className="text-sm text-brand-500">Customer</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <a 
                        href={`tel:${selectedBooking.pii?.phone}`}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-brand-100 rounded-2xl text-sm font-bold text-brand-900 hover:bg-brand-100 transition-colors shadow-sm"
                      >
                        <Phone size={16} /> Call
                      </a>
                      <a 
                        href={`viber://chat?number=${selectedBooking.pii?.phone?.replace('+', '')}`}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 transition-colors shadow-md"
                      >
                        <MessageSquare size={16} /> Viber
                      </a>
                    </div>
                  </div>

                  {/* Booking Info */}
                  <div className="space-y-4 px-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500">
                        <CalendarIcon size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-brand-400 text-[10px] uppercase tracking-wider">Date & Time</p>
                        <p className="font-bold text-brand-900">
                          {format(selectedBooking.b.startTime.toDate(), 'PPP')} @ {format(selectedBooking.b.startTime.toDate(), 'p')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-brand-400 text-[10px] uppercase tracking-wider">Service</p>
                        <p className="font-bold text-brand-900">
                          {services.find(s => s.id === selectedBooking.b.serviceId)?.name || 'Unknown Service'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-brand-400 text-[10px] uppercase tracking-wider">Staff</p>
                        <p className="font-bold text-brand-900">
                          {staff.find(s => s.id === selectedBooking.b.staffId)?.name || 'Any Available'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-brand-100">
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-3 px-2">Manage Status</p>
                    <div className="flex flex-wrap gap-2">
                      {['confirmed', 'in_service', 'completed', 'cancelled', 'no_show'].map(status => (
                        <button
                          key={status}
                          disabled={updatingStatus || selectedBooking.b.status === status}
                          onClick={() => handleUpdateStatus(status)}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2",
                            selectedBooking.b.status === status 
                              ? "bg-brand-900 border-brand-900 text-white" 
                              : "border-brand-100 text-brand-600 hover:border-brand-300"
                          )}
                        >
                          {status === 'completed' && <CheckCircle2 size={12} />}
                          {status === 'cancelled' && <AlertCircle size={12} />}
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
