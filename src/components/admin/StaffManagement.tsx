import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, updateDoc, addDoc, doc, query, orderBy } from 'firebase/firestore';
import { Staff, Service } from '../../types';
import { Edit2, X, Check, Loader2, Shield, User, Plus } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    const unsubStaff = onSnapshot(query(collection(db, 'staff'), orderBy('name')), (snap) => {
      setStaff(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'staff'));
    
    const unsubServices = onSnapshot(query(collection(db, 'services')), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    
    return () => { unsubStaff(); unsubServices(); };
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const selectedSkills = services.filter(s => formData.get(`skill-${s.id}`) === 'on').map(s => s.id);
    const schedule: any = {};
    DAYS.forEach(day => {
      schedule[day] = { start: formData.get(`${day}-start`) || '09:00', end: formData.get(`${day}-end`) || '18:00', isWorking: formData.get(`${day}-working`) === 'on' };
    });
    const staffData = { 
      name: formData.get('name') as string, 
      email: formData.get('email') as string,
      role: formData.get('role') as any, 
      skills: selectedSkills, 
      schedule, 
      isActive: true 
    };
    try {
      if (editingStaff) await updateDoc(doc(db, 'staff', editingStaff.id), staffData);
      else await addDoc(collection(db, 'staff'), staffData);
      setIsModalOpen(false); setEditingStaff(null);
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'staff'); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display">Staff</h2>
        <button 
          onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-2 bg-brand-950 text-white rounded-full font-bold hover:bg-brand-800 transition-colors"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staff.map(member => (
          <div key={member.id} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm flex gap-6 items-start">
            <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600">{member.role === 'admin' ? <Shield /> : <User />}</div>
            <div className="flex-1">
              <div className="flex justify-between">
                <div><h3 className="text-lg font-bold">{member.name}</h3><p className="text-sm text-brand-500">{member.email}</p></div>
                <button onClick={() => { setEditingStaff(member); setIsModalOpen(true); }} className="p-2"><Edit2 size={16} /></button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{member.skills.map(sId => <span key={sId} className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold uppercase rounded-md">{services.find(s => s.id === sId)?.name}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/20 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 my-8">
            <form onSubmit={handleSave} className="space-y-8 h-[70vh] overflow-y-auto pr-4">
              <h3 className="text-2xl font-display">{editingStaff ? 'Edit' : 'New'} Staff Member</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-400 mb-1 ml-1">Name</label>
                  <input required name="name" defaultValue={editingStaff?.name} placeholder="Full Name" className="w-full px-4 py-2 border border-brand-100 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-400 mb-1 ml-1">Email</label>
                  <input required name="email" type="email" defaultValue={editingStaff?.email} placeholder="email@example.com" className="w-full px-4 py-2 border border-brand-100 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-400 mb-1 ml-1">Role</label>
                  <select name="role" defaultValue={editingStaff?.role || 'staff'} className="w-full px-4 py-2 border border-brand-100 rounded-xl">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-3">Skills & Treatments</p>
                <div className="grid grid-cols-2 gap-3">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 p-3 border border-brand-50 rounded-xl hover:bg-brand-50 cursor-pointer transition-colors">
                      <input type="checkbox" name={`skill-${s.id}`} defaultChecked={editingStaff?.skills.includes(s.id)} className="accent-brand-600" />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-3">Weekly Schedule</p>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-brand-50 rounded-2xl">
                      <label className="flex items-center gap-2 w-32 capitalize font-medium">
                        <input type="checkbox" name={`${day}-working`} defaultChecked={editingStaff?.schedule?.[day]?.isWorking ?? true} className="accent-brand-600" />
                        {day}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="time" name={`${day}-start`} defaultValue={editingStaff?.schedule?.[day]?.start || '09:00'} className="px-2 py-1 border border-brand-100 rounded-lg text-sm bg-white" />
                        <span className="text-brand-400 text-xs font-bold uppercase">to</span>
                        <input type="time" name={`${day}-end`} defaultValue={editingStaff?.schedule?.[day]?.end || '18:00'} className="px-2 py-1 border border-brand-100 rounded-lg text-sm bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 sticky bottom-0 bg-white pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-brand-200 rounded-full font-bold">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-brand-950 text-white rounded-full font-bold shadow-lg hover:bg-brand-800">
                  {editingStaff ? 'Update Profile' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
