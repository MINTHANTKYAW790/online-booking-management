import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Service, Staff, Booking, StoreConfig } from '../types';
import { addMinutes, format, parse, startOfDay, endOfDay, isBefore, isAfter, areIntervalsOverlapping, getDay } from 'date-fns';

export async function getAvailableTimeSlots(
  date: Date,
  service: Service,
  staffList: Staff[],
  config: StoreConfig
) {
  // Check if store is closed on this day
  if (config.closedDay !== -1 && getDay(date) === config.closedDay) {
    return [];
  }

  const start = startOfDay(date);
  const end = endOfDay(date);

  // 1. Fetch all bookings for the day
  const q = query(
    collection(db, 'bookings'),
    where('startTime', '>=', Timestamp.fromDate(start)),
    where('startTime', '<=', Timestamp.fromDate(end))
  );
  
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

  // 2. Determine store hours for the chosen day
  const openTimeStr = config.openTime || '09:00';
  const closeTimeStr = config.closeTime || '21:00';
  const lastBookingTimeStr = config.lastBookingTime || closeTimeStr;
  
  const openTime = parse(openTimeStr, 'HH:mm', date);
  const closeTime = parse(closeTimeStr, 'HH:mm', date);
  const lastBookingTime = parse(lastBookingTimeStr, 'HH:mm', date);
  const interval = config.bookingInterval || 30;

  const slots = [];
  let currentSlot = openTime;

  if (staffList.length === 0) {
    console.warn("getAvailableTimeSlots: No staff members provided.");
    return [];
  }

  // 3. Generate slots and check each
  while (true) {
    const duration = Number(service.duration) || 0;
    const slotEnd = addMinutes(currentSlot, duration);
    
    // Constraint 1: The entire service must be completed by the store's closing time
    if (isAfter(slotEnd, closeTime)) break;
    
    // Constraint 2: The appointment cannot start after the 'last booking' deadline
    if (isAfter(currentSlot, lastBookingTime)) break;

    const buffer = Number(config.bufferTime) || 0;
    // For overlap checking, we consider the "occupied" time of a slot to be duration + buffer
    const slotOccupiedEnd = addMinutes(slotEnd, buffer);

    // Check service-specific capacity
    const overlappingBookings = bookings.filter(b => {
      if (!b.startTime || !b.endTime) return false;
      const bStart = b.startTime.toDate();
      const bEnd = b.endTime.toDate();
      // An existing booking also occupies its duration + store's buffer time
      const bOccupiedEnd = addMinutes(bEnd, buffer);

      return areIntervalsOverlapping(
        { start: currentSlot, end: slotOccupiedEnd },
        { start: bStart, end: bOccupiedEnd }
      ) && b.serviceId === service.id && b.status !== 'cancelled';
    });

    const maxParallel = service.maxParallel || 1;
    const isServiceAvailable = overlappingBookings.length < maxParallel;

    // Check staff availability
    const dayName = format(date, 'EEEE').toLowerCase();
    const availableStaff = staffList.filter(s => {
      // Skills check
      const hasSkill = Array.isArray(s.skills) && s.skills.includes(service.id);
      if (!s.isActive || !hasSkill) return false;
      
      const sSched = s.schedule?.[dayName];
      if (!sSched || !sSched.isWorking || !sSched.start || !sSched.end) return false;

      const sStart = parse(sSched.start, 'HH:mm', date);
      const sEnd = parse(sSched.end, 'HH:mm', date);

      // Staff must be working during the entire slot
      const isWorking = !isBefore(currentSlot, sStart) && !isAfter(slotEnd, sEnd);
      if (!isWorking) return false;

      // Staff must not have an overlapping occupied slot
      const staffBookings = bookings.filter(b => {
        if (!b.startTime || !b.endTime) return false;
        const bStart = b.startTime.toDate();
        const bEnd = b.endTime.toDate();
        const bOccupiedEnd = addMinutes(bEnd, buffer);

        return b.staffId === s.id && b.status !== 'cancelled' && areIntervalsOverlapping(
          { start: currentSlot, end: slotOccupiedEnd },
          { start: bStart, end: bOccupiedEnd }
        );
      });

      return staffBookings.length === 0;
    });

    if (isServiceAvailable && availableStaff.length > 0) {
      slots.push({
        time: currentSlot,
        availableStaffIds: availableStaff.map(s => s.id)
      });
    }

    currentSlot = addMinutes(currentSlot, interval);
    
    // Safety break for infinite loops
    if (interval <= 0 || slots.length > 100) break;
  }

  return slots;
}
