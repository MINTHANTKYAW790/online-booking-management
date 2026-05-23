import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Service } from '../../types';
import { Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { motion } from 'motion/react';

export default function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));
    return unsubscribe;
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const serviceData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      duration: parseInt(formData.get('duration') as string),
      price: parseFloat(formData.get('price') as string),
      maxParallel: parseInt(formData.get('maxParallel') as string),
      color: formData.get('color') as string,
      isActive: true,
    };

    try {
      if (editingService) await updateDoc(doc(db, 'services', editingService.id), serviceData);
      else await addDoc(collection(db, 'services'), serviceData);
      setIsModalOpen(false); setEditingService(null);
    } catch (error) { handleFirestoreError(error, OperationType.WRITE, 'services'); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-3xl font-display">Service Menu</h2></div>
        <button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-2 bg-brand-950 text-white rounded-full"><Plus size={18} /> Add Service</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-sm relative group">
            <div className="w-12 h-1 bg-brand-600 mb-4 rounded-full" style={{ backgroundColor: service.color }}></div>
            <h3 className="text-xl font-bold mb-1">{service.name}</h3>
            <p className="text-sm text-brand-500 line-clamp-2 h-10">{service.description}</p>
            <div className="grid grid-cols-2 gap-4 mt-4 border-t border-brand-50 pt-4">
              <div><p className="text-[10px] uppercase font-bold text-brand-400">Duration</p><p>{service.duration} min</p></div>
              <div><p className="text-[10px] uppercase font-bold text-brand-400">Price</p><p>{formatPrice(service.price)}</p></div>
            </div>
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingService(service); setIsModalOpen(true); }} className="p-2 bg-brand-50 rounded-full"><Edit2 size={14} /></button>
              <button 
                onClick={async () => { 
                  try {
                    await deleteDoc(doc(db, 'services', service.id)); 
                  } catch (error) {
                    handleFirestoreError(error, OperationType.DELETE, 'services');
                  }
                }} 
                className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                title="Delete Service"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/20 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <h3 className="text-2xl font-display">{editingService ? 'Edit' : 'New'} Service</h3>
              <input required name="name" placeholder="Name" defaultValue={editingService?.name} className="w-full px-4 py-2 border rounded-xl" />
              <textarea name="description" placeholder="Description" defaultValue={editingService?.description} className="w-full px-4 py-2 border rounded-xl h-24" />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" name="duration" placeholder="Duration" defaultValue={editingService?.duration} className="w-full px-4 py-2 border rounded-xl" />
                <input required type="number" step="0.01" name="price" placeholder="Price" defaultValue={editingService?.price} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <input required type="number" name="maxParallel" placeholder="Max Parallel" defaultValue={editingService?.maxParallel} className="w-full px-4 py-2 border rounded-xl" />
              <input type="color" name="color" defaultValue={editingService?.color || '#ec4899'} className="w-full h-10 p-1 border rounded-xl" />
              <div className="flex gap-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border rounded-full">Cancel</button><button type="submit" className="flex-1 px-6 py-3 bg-brand-950 text-white rounded-full">Save</button></div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
