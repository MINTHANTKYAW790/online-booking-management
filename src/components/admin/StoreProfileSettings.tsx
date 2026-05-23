import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { StoreConfig } from '../../types';
import { 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Facebook, 
  Instagram, 
  Youtube,
  Clock,
  Palette,
  Eye,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  Image as ImageIcon,
  History
} from 'lucide-react';
import { cn } from '../../lib/utils';
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
  closedDay: 0 // Default closed on Sunday
};

export default function StoreProfileSettings() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'hours' | 'theme'>('info');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreConfig;
        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          socialMediaLinks: {
            ...DEFAULT_CONFIG.socialMediaLinks,
            ...(data.socialMediaLinks || {})
          }
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/global');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'config', 'global'), { ...config });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/global');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-brand-900">Store Profile</h2>
          <p className="text-brand-500 italic">Manage your online presence and store settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-500 hover:text-brand-900 transition-colors"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-900 text-white rounded-full font-bold text-sm shadow-xl hover:shadow-brand-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-brand-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-brand-50 bg-brand-50/50">
              <button 
                onClick={() => setActiveSubTab('info')}
                className={cn(
                  "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all",
                  activeSubTab === 'info' ? "bg-white text-brand-900 border-b-2 border-brand-600" : "text-brand-400 hover:text-brand-600"
                )}
              >
                Store Info
              </button>
              <button 
                onClick={() => setActiveSubTab('hours')}
                className={cn(
                  "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all",
                  activeSubTab === 'hours' ? "bg-white text-brand-900 border-b-2 border-brand-600" : "text-brand-400 hover:text-brand-600"
                )}
              >
                Business Hours
              </button>
              <button 
                onClick={() => setActiveSubTab('theme')}
                className={cn(
                  "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all",
                  activeSubTab === 'theme' ? "bg-white text-brand-900 border-b-2 border-brand-600" : "text-brand-400 hover:text-brand-600"
                )}
              >
                Theme
              </button>
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {activeSubTab === 'info' && (
                  <motion.div 
                    key="info"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Store Name</label>
                        <div className="relative">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300" size={18} />
                          <input 
                            value={config?.storeName}
                            onChange={(e) => setConfig(c => c ? { ...c, storeName: e.target.value } : null)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Tagline</label>
                        <input 
                          value={config?.tagline}
                          onChange={(e) => setConfig(c => c ? { ...c, tagline: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Logo URL</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300" size={18} />
                        <input 
                          value={config?.logoUrl}
                          onChange={(e) => setConfig(c => c ? { ...c, logoUrl: e.target.value } : null)}
                          placeholder="https://example.com/logo.png"
                          className="w-full pl-11 pr-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Physical Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300" size={18} />
                        <input 
                          value={config?.address}
                          onChange={(e) => setConfig(c => c ? { ...c, address: e.target.value } : null)}
                          className="w-full pl-11 pr-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300" size={18} />
                          <input 
                            value={config?.phoneNumber}
                            onChange={(e) => setConfig(c => c ? { ...c, phoneNumber: e.target.value } : null)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300" size={18} />
                          <input 
                            value={config?.email}
                            onChange={(e) => setConfig(c => c ? { ...c, email: e.target.value } : null)}
                            className="w-full pl-11 pr-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-brand-50">
                      <h4 className="text-sm font-bold text-brand-900 mb-4 flex items-center gap-2">
                        <Globe size={16} /> Social Media & Web
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Website</label>
                          <input 
                            value={config?.website}
                            onChange={(e) => setConfig(c => c ? { ...c, website: e.target.value } : null)}
                            className="w-full px-4 py-2 bg-brand-50/50 border border-brand-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Instagram</label>
                          <div className="relative">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" size={14} />
                            <input 
                              value={config?.socialMediaLinks?.instagram || ''}
                              onChange={(e) => setConfig(c => c ? { ...c, socialMediaLinks: { ...DEFAULT_CONFIG.socialMediaLinks, ...c.socialMediaLinks, instagram: e.target.value } } : null)}
                              className="w-full pl-9 pr-4 py-2 bg-brand-50/50 border border-brand-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Facebook</label>
                          <div className="relative">
                            <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" size={14} />
                            <input 
                              value={config?.socialMediaLinks?.facebook || ''}
                              onChange={(e) => setConfig(c => c ? { ...c, socialMediaLinks: { ...DEFAULT_CONFIG.socialMediaLinks, ...c.socialMediaLinks, facebook: e.target.value } } : null)}
                              className="w-full pl-9 pr-4 py-2 bg-brand-50/50 border border-brand-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">TikTok</label>
                          <input 
                            value={config?.socialMediaLinks?.tiktok || ''}
                            onChange={(e) => setConfig(c => c ? { ...c, socialMediaLinks: { ...DEFAULT_CONFIG.socialMediaLinks, ...c.socialMediaLinks, tiktok: e.target.value } } : null)}
                            className="w-full px-4 py-2 bg-brand-50/50 border border-brand-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'hours' && (
                  <motion.div 
                    key="hours"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                          <Clock size={16} /> Business Operation
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Opens at</label>
                            <input 
                              type="time"
                              value={config?.openTime}
                              onChange={(e) => setConfig(c => c ? { ...c, openTime: e.target.value } : null)}
                              className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Closes at</label>
                            <input 
                              type="time"
                              value={config?.closeTime}
                              onChange={(e) => setConfig(c => c ? { ...c, closeTime: e.target.value } : null)}
                              className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Last Booking slot</label>
                          <input 
                            type="time"
                            value={config?.lastBookingTime}
                            onChange={(e) => setConfig(c => c ? { ...c, lastBookingTime: e.target.value } : null)}
                            className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          />
                          <p className="text-[10px] text-brand-400 italic ml-1">Latest time a customer can start an appointment.</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                          <History size={16} /> Buffer & Scheduling
                        </h4>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Buffer Time (Min)</label>
                          <input 
                            type="number"
                            value={config?.bufferTime}
                            onChange={(e) => setConfig(c => c ? { ...c, bufferTime: parseInt(e.target.value) } : null)}
                            className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          />
                          <p className="text-[10px] text-brand-400 italic ml-1">Break time between appointments.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Booking Interval (Min)</label>
                          <select 
                            value={config?.bookingInterval}
                            onChange={(e) => setConfig(c => c ? { ...c, bookingInterval: parseInt(e.target.value) } : null)}
                            className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                          </select>
                          <p className="text-[10px] text-brand-400 italic ml-1">Step size for available booking slots.</p>
                        </div>

                        <div className="space-y-1.5 pt-4 border-t border-brand-50">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Weekly Closed Day</label>
                          <select 
                            value={config?.closedDay}
                            onChange={(e) => setConfig(c => c ? { ...c, closedDay: parseInt(e.target.value) } : null)}
                            className="w-full px-4 py-3 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                          >
                            <option value={-1}>No closed day</option>
                            <option value={0}>Sunday</option>
                            <option value={1}>Monday</option>
                            <option value={2}>Tuesday</option>
                            <option value={3}>Wednesday</option>
                            <option value={4}>Thursday</option>
                            <option value={5}>Friday</option>
                            <option value={6}>Saturday</option>
                          </select>
                          <p className="text-[10px] text-brand-400 italic ml-1">The store will be completely closed on this day every week.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'theme' && (
                  <motion.div 
                    key="theme"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1 space-y-6">
                        <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                          <Palette size={16} /> Brand Colors
                        </h4>
                        <div className="space-y-3">
                          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-widest ml-1">Primary Brand Color</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="color"
                              value={config?.themePrimaryColor}
                              onChange={(e) => setConfig(c => c ? { ...c, themePrimaryColor: e.target.value } : null)}
                              className="w-16 h-16 rounded-2xl border-4 border-white shadow-md cursor-pointer overflow-hidden p-0 bg-transparent"
                            />
                            <div className="flex-1">
                              <input 
                                value={config?.themePrimaryColor}
                                onChange={(e) => setConfig(c => c ? { ...c, themePrimaryColor: e.target.value } : null)}
                                className="w-full px-4 py-2 bg-brand-50/50 border border-brand-100 rounded-xl outline-none font-mono text-xs"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-brand-400 italic">This color will be used for buttons, links, and highlights in your customer storefront.</p>
                        </div>
                      </div>

                      <div className="w-full md:w-64 bg-brand-50/50 rounded-3xl p-6 border border-dashed border-brand-200">
                        <h5 className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-6">Presets</h5>
                        <div className="grid grid-cols-4 gap-3">
                          {['#4f46e5', '#db2777', '#059669', '#d97706', '#9333ea', '#2563eb', '#dc2626', '#1e293b'].map(color => (
                            <button 
                              key={color}
                              onClick={() => setConfig(c => c ? { ...c, themePrimaryColor: color } : null)}
                              className="w-full aspect-square rounded-full shadow-sm hover:scale-110 transition-transform border-2 border-white"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-5">
          <div className="sticky top-8 space-y-4">
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2 ml-4">
              <Eye size={14} /> Live Storefront Preview
            </h3>
            
            <div className="bg-brand-950 rounded-[3rem] p-3 shadow-2xl relative overflow-hidden group">
              <div className="bg-white rounded-[2.5rem] aspect-[9/16] overflow-hidden flex flex-col">
                {/* Preview Content */}
                <div className="p-6 text-center space-y-4 pt-10">
                  <div className="w-20 h-20 mx-auto bg-brand-50 rounded-3xl flex items-center justify-center overflow-hidden border border-brand-100">
                    {config?.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={40} className="text-brand-200" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-display font-bold text-slate-900">{config?.storeName}</h4>
                    <p className="text-sm text-slate-500 italic mt-0.5">{config?.tagline}</p>
                  </div>
                  <button 
                    disabled
                    className="w-full py-4 text-white rounded-2xl text-sm font-bold shadow-lg transition-colors cursor-not-allowed"
                    style={{ backgroundColor: config?.themePrimaryColor }}
                  >
                    Book Now
                  </button>
                </div>

                <div className="flex-1 bg-slate-50 p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded-full w-1/2"></div>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
                          <div className="h-2 bg-slate-100 rounded-full w-3/4"></div>
                          <div className="h-2 bg-slate-100 rounded-full w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-slate-400" />
                      <p className="text-[10px] text-slate-500 line-clamp-1">{config?.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-slate-400" />
                      <p className="text-[10px] text-slate-500">{config?.phoneNumber}</p>
                    </div>
                    <div className="flex gap-4 pt-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive indicator overlay */}
              <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/10 transition-colors pointer-events-none flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 bg-white/90 px-4 py-2 rounded-full text-[10px] font-bold text-brand-900 transition-all transform translate-y-4 group-hover:translate-y-0">
                  MOBILE PREVIEW
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <div className="w-1 h-1 rounded-full bg-brand-200" />
              <div className="w-1 h-1 rounded-full bg-brand-200" />
              <div className="w-1 h-1 rounded-full bg-brand-200" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-brand-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={20} className="text-brand-300" />
            <p className="font-bold text-sm">Settings saved successfully!</p>
            <button onClick={() => setShowSuccess(false)} className="ml-2 hover:text-brand-300">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
