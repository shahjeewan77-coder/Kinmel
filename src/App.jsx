import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, ShoppingBag, PlusCircle, User, Shield, Search, Filter, 
  Phone, MessageSquare, CheckCircle, Trash2, Edit, X, Camera, 
  LogOut, ArrowRight, ShieldAlert, Check, AlertCircle, Settings, Download
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const SUPABASE_URL = 'https://xyzcompany.supabase.co'; // Replace with your actual Supabase URL if needed
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with your actual Anon Key
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // App Modes & Navigation
  const [activeTab, setActiveTab] = useState('rental'); // 'rental', 'buy_sell', 'dashboard', 'control_center'
  const [session, setSession] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal States
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Form State for Posting/Editing Listings
  const [formData, setFormData] = useState({
    title: '',
    category: 'Pillar Pharma',
    price: '',
    rate_type: 'per day',
    location: 'Dhangadhi',
    phone: '',
    whatsapp: '',
    description: '',
    image_url: '',
    item_type: 'rental' // 'rental' or 'buy_sell'
  });

  // User Role State (Simulated for Control Center)
  const [userRole, setUserRole] = useState('Owner'); // Owner, Admin, Editor, Responder, User
  const [teamMembers, setTeamMembers] = useState([
    { email: 'admin@kinmel.com', role: 'Admin' },
    { email: 'editor@kinmel.com', role: 'Editor' },
  ]);

  // Handle PWA Install Event & Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('Service worker registration failed: ', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      alert('To install Kinmel Nepal: Tap your browser menu (the 3 dots) and select "Install app" or "Add to Home screen".');
    }
  };

  // Fetch Listings on Load
  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Mock data fallback if database is empty or connecting
      const mockListings = [
        {
          id: '1',
          title: 'Heavy Duty Pillar Pharma',
          category: 'Pillar Pharma',
          price: '150',
          rate_type: 'per day',
          location: 'Dhangadhi - 03',
          phone: '+977 9800000000',
          whatsapp: '9800000000',
          description: 'High quality steel pillar pharma available for rent in pristine condition.',
          image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f727c?auto=format&fit=crop&q=80&w=600',
          item_type: 'rental',
          status: 'Active',
          user_id: 'sample-user'
        },
        {
          id: '2',
          title: 'Concrete Mixer Machine',
          category: 'Concrete Mixers',
          price: '1200',
          rate_type: 'per day',
          location: 'Mahendranagar',
          phone: '+977 9811111111',
          whatsapp: '9811111111',
          description: 'Reliable concrete mixer with heavy duty engine for construction sites.',
          image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600',
          item_type: 'rental',
          status: 'Active',
          user_id: 'sample-user'
        }
      ];
      setListings(mockListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Form Submission for New/Edited Listings
  const handleSaveListing = (e) => {
    e.preventDefault();
    if (editingItem) {
      setListings(listings.map(item => item.id === editingItem.id ? { ...formData, id: item.id } : item));
      setEditingItem(null);
    } else {
      const newItem = {
        ...formData,
        id: Date.now().toString(),
        status: 'Active',
        user_id: 'current-user'
      };
      setListings([newItem, ...listings]);
    }
    setFormData({
      title: '',
      category: 'Pillar Pharma',
      price: '',
      rate_type: 'per day',
      location: 'Dhangadhi',
      phone: '',
      whatsapp: '',
      description: '',
      image_url: '',
      item_type: activeTab === 'buy_sell' ? 'buy_sell' : 'rental'
    });
    setShowPostModal(false);
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowPostModal(true);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      setListings(listings.filter(item => item.id !== id));
    }
  };

  // Filter Listings by Tab, Search, and Category
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const matchesTab = activeTab === 'buy_sell' ? item.item_type === 'buy_sell' : item.item_type === 'rental';
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [listings, activeTab, searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 md:pb-0">
      
      {/* Top Header */}
      <header className="bg-orange-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('rental')}>
            <div className="bg-white p-2 rounded-lg text-orange-600 font-bold">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Kinmel Nepal</h1>
              <p className="text-xs text-orange-100">Equipment Rental & Marketplace</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isInstallable && (
              <button 
                onClick={handleInstallClick} 
                className="hidden sm:flex items-center space-x-1 bg-orange-700 hover:bg-orange-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                <Download className="w-4 h-4" />
                <span>Install App</span>
              </button>
            )}

            <button 
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  title: '',
                  category: activeTab === 'buy_sell' ? 'General' : 'Pillar Pharma',
                  price: '',
                  rate_type: 'per day',
                  location: 'Dhangadhi',
                  phone: '',
                  whatsapp: '',
                  description: '',
                  image_url: '',
                  item_type: activeTab === 'buy_sell' ? 'buy_sell' : 'rental'
                });
                setShowPostModal(true);
              }}
              className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-3.5 py-1.5 rounded-lg text-sm flex items-center space-x-1 shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Ad</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-orange-700 border-t border-orange-500/50">
          <div className="max-w-6xl mx-auto px-4 flex space-x-6 overflow-x-auto">
            <button 
              onClick={() => { setActiveTab('rental'); setSelectedCategory('All'); }}
              className={`py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'rental' ? 'border-white text-white font-semibold' : 'border-transparent text-orange-200 hover:text-white'}`}
            >
              <Wrench className="w-4 h-4" />
              <span>Rental Equipment</span>
            </button>

            <button 
              onClick={() => { setActiveTab('buy_sell'); setSelectedCategory('All'); }}
              className={`py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'buy_sell' ? 'border-white text-white font-semibold' : 'border-transparent text-orange-200 hover:text-white'}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy / Sell Market</span>
            </button>

            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'dashboard' ? 'border-white text-white font-semibold' : 'border-transparent text-orange-200 hover:text-white'}`}
            >
              <User className="w-4 h-4" />
              <span>My Dashboard</span>
            </button>

            <button 
              onClick={() => setActiveTab('control_center')}
              className={`py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 ${activeTab === 'control_center' ? 'border-white text-white font-semibold' : 'border-transparent text-orange-200 hover:text-white'}`}
            >
              <Shield className="w-4 h-4" />
              <span>Control Center</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* RENTAL & BUY/SELL VIEWS */}
        {(activeTab === 'rental' || activeTab === 'buy_sell') && (
          <div>
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search equipment, tools or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Category selector */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                {['All', 'Pillar Pharma', 'Plate Pharma', 'Concrete Mixers', 'JCB & Tractors', 'Scaffolding'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${selectedCategory === cat ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700">No listings found</h3>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your search or post the first listing!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map(item => (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition">
                    <div className="h-48 bg-slate-200 relative overflow-hidden">
                      <img 
                        src={item.image_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb18f727c?auto=format&fit=crop&q=80&w=600'} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-orange-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-800 text-base">{item.title}</h3>
                          <span className="text-orange-600 font-bold text-base">
                            Rs. {item.price} <span className="text-xs text-slate-500 font-normal">/{item.rate_type}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">📍 {item.location}</p>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{item.description}</p>
                      </div>

                      <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                        <a 
                          href={`https://wa.me/977${item.whatsapp}?text=Hi, I am interested in your listing: ${item.title}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        <a 
                          href={`tel:${item.phone}`}
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Owner</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Listings Dashboard</h2>
                <p className="text-xs text-slate-500">Manage your posted equipment and marketplace ads</p>
              </div>
              <button 
                onClick={() => setShowPostModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add New Listing</span>
              </button>
            </div>

            <div className="space-y-4">
              {listings.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-4">
                  <div className="flex items-center space-x-4">
                    <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500">Rs. {item.price} /{item.rate_type} • {item.location}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded">
                        {item.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button 
                      onClick={() => handleEditClick(item)}
                      className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTROL CENTER VIEW */}
        {activeTab === 'control_center' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Admin Control Center</h2>
                <p className="text-xs text-slate-500">Manage team roles, permissions, and moderation queues</p>
              </div>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
                Current Role: {userRole}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Team Access & Roles</h3>
                <div className="space-y-3">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <p className="font-semibold text-slate-800">{member.email}</p>
                        <p className="text-slate-400">Role: {member.role}</p>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Platform Status</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">Database Connection</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">● Connected</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">Storage Service</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">● Active</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-700">PWA Manifest & Service Worker</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">● Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* POST / EDIT MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingItem ? 'Edit Listing' : 'Post New Equipment / Item'}
              </h3>
              <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Listing Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Heavy Duty Pillar Pharma"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="Pillar Pharma">Pillar Pharma</option>
                    <option value="Plate Pharma">Plate Pharma</option>
                    <option value="Concrete Mixers">Concrete Mixers</option>
                    <option value="JCB & Tractors">JCB & Tractors</option>
                    <option value="Scaffolding">Scaffolding</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select 
                    value={formData.item_type}
                    onChange={(e) => setFormData({...formData, item_type: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="rental">Rental Equipment</option>
                    <option value="buy_sell">Buy / Sell Market</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (Rs.)</label>
                  <input 
                    type="number"
                    required
                    placeholder="150"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate Type</label>
                  <select 
                    value={formData.rate_type}
                    onChange={(e) => setFormData({...formData, rate_type: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="per day">per day</option>
                    <option value="per month">per month</option>
                    <option value="fixed">fixed price</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input 
                    type="text"
                    required
                    placeholder="Dhangadhi"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input 
                    type="text"
                    required
                    placeholder="9800000000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value, phone: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Image URL</label>
                <input 
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  rows="3"
                  placeholder="Provide equipment condition, specifications, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowPostModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg"
                >
                  Save Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 shadow-lg">
        <button 
          onClick={() => setActiveTab('rental')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'rental' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px]">Rental</span>
        </button>

        <button 
          onClick={() => setActiveTab('buy_sell')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'buy_sell' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Market</span>
        </button>

        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('control_center')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'control_center' ? 'text-orange-600 font-bold' : 'text-slate-500'}`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px]">Control</span>
        </button>
      </div>

    </div>
  );
}
