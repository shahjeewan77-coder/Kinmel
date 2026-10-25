import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload, MessageCircle, Phone, ShieldAlert, BarChart3, Users, MousePointerClick, LayoutGrid, Layers, RefreshCw, ArrowRight, CheckCircle2, UserCheck, Tag, Edit3, Download } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [appMode, setAppMode] = useState(null);

  const [currentView, setCurrentView] = useState('marketplace'); // 'marketplace', 'admin-dashboard', 'my-dashboard'
  const [clickLogs, setClickLogs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Post / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Vehicles');
  const [newCity, setNewCity] = useState('Dhangadhi');
  const [newPhone, setNewPhone] = useState('');
  const [newNegotiable, setNewNegotiable] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const categories = ['Vehicles', 'Real Estate', 'Mobile Phones', 'Computers', 'Electronics', 'Home & Furniture', 'Fashion', 'Jobs'];

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchUserRole(currentUser.id);
      
      if (session && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserRole(currentUser.id);
      } else {
        setUserRole('user');
        setCurrentView('marketplace');
      }

      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    fetchListings();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      subscription.unsubscribe();
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install this app on mobile, tap your browser menu (three dots) and select "Add to Home Screen" or "Install App".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  async function fetchUserRole(userId) {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data) {
        setUserRole(data.role.toLowerCase()); // 'admin', 'editor', 'responder', etc.
      }
    } catch (err) {
      setUserRole('user');
    }
  }

  async function fetchListings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClickLogs() {
    try {
      const { data, error } = await supabase
        .from('listing_clicks')
        .select(`
          id,
          created_at,
          viewer_id,
          viewer_email,
          listings (
            id,
            title,
            price,
            category,
            city,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClickLogs(data || []);
    } catch (err) {
      console.error('Error fetching click logs:', err.message);
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole('user');
    setCurrentView('marketplace');
    setAppMode(null);
  };

  const handleCardClick = async (item) => {
    setSelectedItem(item);
    try {
      await supabase.from('listing_clicks').insert([
        {
          listing_id: item.id,
          owner_id: item.user_id,
          viewer_id: user ? user.id : null,
          viewer_email: user ? user.email : 'Guest Visitor'
        }
      ]);
    } catch (err) {
      console.error('Error logging click:', err);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setNewTitle(item.title || '');
    setNewDescription(item.description || '');
    setNewPrice(item.price || '');
    setNewCity(item.city || 'Dhangadhi');
    setNewPhone(item.phone || '');
    setNewNegotiable(item.negotiable ?? true);
    const cleanCat = item.category?.replace(/^(Rental: |Buy\/Sell: )/, '') || 'Vehicles';
    setNewCategory(categories.includes(cleanCat) ? cleanCat : 'Vehicles');
    setImageFile(null);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setNewTitle('');
    setNewDescription('');
    setNewPrice('');
    setNewCity('Dhangadhi');
    setNewPhone('');
    setNewNegotiable(true);
    setNewCategory('Vehicles');
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSaveListing = async (e) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return alert('Please fill in title and price!');

    try {
      setPosting(true);
      let imageUrl = editingItem ? editingItem.image_url : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        imageUrl = publicURLData.publicUrl;
      }

      let finalCategory = newCategory;
      if (editingItem) {
        const prefix = editingItem.category?.startsWith('Rental:') ? 'Rental: ' : 'Buy/Sell: ';
        finalCategory = `${prefix}${newCategory}`;
      } else {
        finalCategory = `${appMode === 'rental' ? 'Rental: ' : 'Buy/Sell: '}${newCategory}`;
      }

      const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

      if (editingItem) {
        const updateData = {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice),
          category: finalCategory,
          city: newCity,
          phone: newPhone,
          negotiable: newNegotiable,
          image_url: imageUrl
        };

        const { error } = await supabase.from('listings').update(updateData).eq('id', editingItem.id);
        if (error) throw error;
        alert('Listing updated successfully!');
      } else {
        const insertData = {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice),
          category: finalCategory,
          city: newCity,
          phone: newPhone,
          negotiable: newNegotiable,
          image_url: imageUrl,
          user_id: user.id,
          is_approved: isAdminOrEditor,
          status: 'Active',
          sold_at: null
        };

        const { error } = await supabase.from('listings').insert([insertData]);
        if (error) throw error;
        alert(isAdminOrEditor ? 'Listing published successfully!' : 'Ad submitted successfully! It will appear publicly after admin approval.');
      }

      setIsModalOpen(false);
      setEditingItem(null);
      fetchListings();
    } catch (err) {
      alert('Error saving listing: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleApproveListing = async (id) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_approved: true })
        .eq('id', id);

      if (error) throw error;
      setListings(listings.map(l => l.id === id ? { ...l, is_approved: true } : l));
    } catch (err) {
      alert('Error approving listing: ' + err.message);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'Sold' ? 'Active' : 'Sold';
    const updatePayload = { 
      status: newStatus,
      sold_at: newStatus === 'Sold' ? new Date().toISOString() : null
    };

    try {
      const { error } = await supabase
        .from('listings')
        .update(updatePayload)
        .eq('id', item.id);

      if (error) throw error;
      setListings(listings.map(l => l.id === item.id ? { ...l, ...updatePayload } : l));
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteListing = async (e, item) => {
    e.stopPropagation();
    const canDelete = userRole === 'admin' || userRole === 'editor' || (user && item.user_id === user.id);
    if (!canDelete) return alert('You do not have permission to delete this listing.');

    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', item.id);
      if (error) throw error;
      setListings(listings.filter(l => l.id !== item.id));
      if (selectedItem?.id === item.id) setSelectedItem(null);
    } catch (err) {
      alert('Error deleting listing: ' + err.message);
    }
  };

  const isAdmin = userRole === 'admin';
  const isEditor = userRole === 'editor' || isAdmin;
  const isPrivileged = isAdmin || isEditor || userRole === 'responder';

  const filteredListings = listings.filter((item) => {
    if (!isPrivileged && !item.is_approved) return false;

    if (item.status === 'Sold' && item.sold_at) {
      const soldTime = new Date(item.sold_at).getTime();
      const now = new Date().getTime();
      const hoursPassed = (now - soldTime) / (1000 * 60 * 60);
      if (hoursPassed > 24) return false;
    }

    const isRentalMode = appMode === 'rental';
    const itemIsRental = item.category?.startsWith('Rental:');
    
    if (isRentalMode && !itemIsRental && item.category !== 'All') return false;
    if (!isRentalMode && itemIsRental) return false;

    const matchesCategory = selectedCategory === 'All' || item.category?.includes(selectedCategory);
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingListings = listings.filter(item => !item.is_approved);
  const myUserListings = listings.filter(item => user && item.user_id === user.id);

  if (!appMode && currentView === 'marketplace') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">Kinmel Nepal</h1>
          <p className="text-lg md:text-xl text-orange-100 mb-8">Make deals securely by contacting owners directly. Choose your section below:</p>

          <div className="mb-8 max-w-md mx-auto bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3 text-left">
              <div className="bg-white text-orange-600 p-2.5 rounded-xl font-black"><Download size={20} /></div>
              <div>
                <h4 className="font-bold text-sm">Install Kinmel App</h4>
                <p className="text-xs text-orange-100">Get quick access from your device!</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-orange-600 hover:bg-orange-50 text-xs font-black px-4 py-2.5 rounded-xl shadow transition whitespace-nowrap"
            >
              Download
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div 
              onClick={() => { setAppMode('rental'); setSelectedCategory('All'); }}
              className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl hover:scale-105 transition cursor-pointer flex flex-col items-center text-center group border-4 border-transparent hover:border-amber-400"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 group-hover:bg-orange-600 group-hover:text-white transition">
                🏠
              </div>
              <h2 className="text-2xl font-black mb-2">Rental</h2>
              <p className="text-sm text-gray-500 mb-6">Find equipment, shuttering tools, rooms, vehicles, or items available for rent.</p>
              <span className="inline-flex items-center text-sm font-bold text-orange-600 group-hover:translate-x-1 transition">
                Enter Rental <ArrowRight size={16} className="ml-1.5" />
              </span>
            </div>

            <div 
              onClick={() => { setAppMode('buysell'); setSelectedCategory('All'); }}
              className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl hover:scale-105 transition cursor-pointer flex flex-col items-center text-center group border-4 border-transparent hover:border-orange-400"
            >
              <div className="w-16 h-16 bg-orange-100 text-orange-700 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 group-hover:bg-orange-600 group-hover:text-white transition">
                🛒
              </div>
              <h2 className="text-2xl font-black mb-2">Buy / Sell</h2>
              <p className="text-sm text-gray-500 mb-6">Buy pre-owned goods, smartphones, electronics, or sell your items for cash.</p>
              <span className="inline-flex items-center text-sm font-bold text-orange-600 group-hover:translate-x-1 transition">
                Enter Buy / Sell <ArrowRight size={16} className="ml-1.5" />
              </span>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center space-x-4">
            {user && (
              <button
                onClick={() => setCurrentView('my-dashboard')}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-6 py-3 rounded-2xl backdrop-blur-md transition flex items-center"
              >
                <UserCheck size={16} className="mr-2" /> My Dashboard ({myUserListings.length} Ads)
              </button>
            )}
            {isPrivileged && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className="bg-black/30 hover:bg-black/50 text-white text-xs font-bold px-6 py-3 rounded-2xl backdrop-blur-md transition"
              >
                🛡️ Control Center {pendingListings.length > 0 && `(${pendingListings.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAppMode(null);
                setSearchTerm('');
                setSelectedCategory('All');
                setCurrentView('marketplace');
              }}
              className="text-2xl font-black text-orange-600 tracking-tight cursor-pointer"
            >
              Kinmel
            </a>
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-semibold">Nepal</span>
            
            {appMode && (
              <button 
                onClick={() => setAppMode(appMode === 'rental' ? 'buysell' : 'rental')}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-xl font-bold transition flex items-center hidden sm:flex"
              >
                Mode: <span className="text-orange-600 ml-1 uppercase">{appMode === 'rental' ? '🏠 Rental' : '🛒 Buy/Sell'} (Switch)</span>
              </button>
            )}
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleInstallClick}
              className="hidden lg:flex items-center text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-2 rounded-xl font-bold transition"
            >
              <Download size={14} className="mr-1.5" /> Download App
            </button>

            {user && (
              <button
                onClick={() => setCurrentView(currentView === 'my-dashboard' ? 'marketplace' : 'my-dashboard')}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center transition shadow-2xs ${
                  currentView === 'my-dashboard' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserCheck size={16} className="mr-1.5" /> <span className="hidden sm:inline">My Dashboard</span>
              </button>
            )}

            {isPrivileged && (
              <button
                onClick={() => {
                  setCurrentView(currentView === 'admin-dashboard' ? 'marketplace' : 'admin-dashboard');
                  if (currentView !== 'admin-dashboard') fetchClickLogs();
                }}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center transition shadow-2xs relative ${
                  currentView === 'admin-dashboard' ? 'bg-gray-900 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                }`}
              >
                <ShieldAlert size={16} className="mr-1.5" /> <span className="hidden sm:inline">Control Center</span>
                {pendingListings.length > 0 && currentView !== 'admin-dashboard' && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {pendingListings.length}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={openCreateModal}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center shadow-sm"
                >
                  <PlusCircle size={16} className="mr-1" /> Post
                </button>
                <button onClick={handleLogout} className="text-xs border border-gray-300 px-3 py-2 rounded-xl hover:bg-gray-100 font-medium text-gray-700 hidden lg:inline">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'my-dashboard' && user ? (
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Posted Ads Dashboard</h1>
              <p className="text-sm text-gray-500">Manage your active listings, check approval status, and update product status.</p>
            </div>
            <button 
              onClick={() => setCurrentView('marketplace')} 
              className="text-xs bg-white border border-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-50"
            >
              ← Back to Marketplace
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-base">Your Listings ({myUserListings.length})</h3>
              <button onClick={openCreateModal} className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                + Post New Ad
              </button>
            </div>
            {myUserListings.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">You haven't posted any ads yet. Click "+ Post New Ad" to get started!</div>
            ) : (
              <div className="divide-y">
                {myUserListings.map(item => (
                  <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-4">
                      <img src={item.image_url} alt={item.title} className="w-20 h-20 object-cover rounded-xl border" />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-bold text-gray-900 text-base">{item.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.status === 'Sold' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.status || 'Active'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.negotiable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.negotiable ? 'Negotiable' : 'Fixed Price'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-orange-600">Rs. {item.price?.toLocaleString()} · {item.city} · {item.category}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Approval: {item.is_approved ? <span className="text-green-600 font-semibold">Approved & Live</span> : <span className="text-amber-600 font-semibold">Pending Review</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center"
                      >
                        <Edit3 size={14} className="mr-1" /> Edit
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(item)}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition ${
                          item.status === 'Sold' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {item.status === 'Sold' ? 'Mark Active' : 'Mark Sold'}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteListing(e, item)} 
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : currentView === 'admin-dashboard' && isPrivileged ? (
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Control Center ({userRole.toUpperCase()})</h1>
              <p className="text-sm text-gray-500">Approve pending ads, edit posts, and monitor platform engagement.</p>
            </div>
            <button onClick={() => setCurrentView('marketplace')} className="text-xs bg-white border border-gray-300 px-4 py-2 rounded-xl font-medium hover:bg-gray-50">
              ← Back to Marketplace
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pending Approval Queue</p>
                <h3 className="text-3xl font-black text-orange-600">{pendingListings.length}</h3>
              </div>
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl"><CheckCircle2 size={24} /></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Ad Clicks / Views</p>
                <h3 className="text-3xl font-black text-gray-900">{clickLogs.length}</h3>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl"><MousePointerClick size={24} /></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Assigned Role</p>
                <h3 className="text-xl font-bold text-orange-600 capitalize">{userRole}</h3>
              </div>
              <div className="p-3.5 bg-red-50 text-red-600 rounded-2xl"><Users size={24} /></div>
            </div>
          </div>

          {/* Pending Approval Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-orange-50/70 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base flex items-center">
                <CheckCircle2 size={18} className="mr-2 text-orange-600" /> Pending Ads Awaiting Approval ({pendingListings.length})
              </h3>
            </div>
            {pendingListings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No ads currently waiting for approval.</div>
            ) : (
              <div className="divide-y">
                {pendingListings.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex items-center space-x-4">
                      <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-xl" />
                      <div>
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <p className="text-xs text-orange-600 font-semibold">Rs. {item.price?.toLocaleString()} · {item.city} · {item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isEditor && (
                        <button 
                          onClick={() => openEditModal(item)} 
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center"
                        >
                          <Edit3 size={14} className="mr-1" /> Edit
                        </button>
                      )}
                      <button 
                        onClick={() => handleApproveListing(item.id)} 
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
                      >
                        ✓ Approve
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={(e) => handleDeleteListing(e, item)} 
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
          {/* Slim Banner with Mode Title */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl px-6 py-5 mb-8 text-white shadow-md flex items-center justify-between">
            <button 
              onClick={() => setAppMode(null)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl transition"
            >
              ← Back to Selection
            </button>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase text-center">
              {appMode === 'rental' ? '🏠 Rental' : '🛒 Buy & Sell'}
            </h1>
            {user ? (
              <button 
                onClick={openCreateModal}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition whitespace-nowrap"
              >
                + Post {appMode === 'rental' ? 'Rental' : 'Ad'}
              </button>
            ) : <div></div>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar Categories */}
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs sticky top-20">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center">
                  <LayoutGrid size={15} className="mr-2 text-orange-600" /> CATEGORIES
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      selectedCategory === 'All' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/70'
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        selectedCategory === cat ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/70'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Right Content Listings */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900">
                  {selectedCategory === 'All' ? `All ${appMode === 'rental' ? 'Rental' : 'Buy/Sell'} Items` : `${selectedCategory} Listings`}
                </h2>
                <span className="text-xs font-semibold bg-gray-200/70 text-gray-700 px-3 py-1 rounded-full">{filteredListings.length} items</span>
              </div>

              {loading ? (
                <div className="text-center py-24 text-gray-500 font-medium">Loading items...</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <p className="text-gray-600 font-semibold mb-2">No items found here right now.</p>
                  <p className="text-xs text-gray-400">Post an ad or check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((item) => {
                    const canModify = isAdmin || isEditor || (user && item.user_id === user.id);
                    const isSold = item.status === 'Sold';
                    const isNeg = item.negotiable ?? true;
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleCardClick(item)}
                        className={`bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group ${isSold ? 'opacity-80' : ''}`}
                      >
                        <div>
                          <div className="h-48 bg-gray-100 relative overflow-hidden">
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <span className="absolute top-3 left-3 bg-black/75 text-white text-xs px-2.5 py-1 rounded-lg font-medium">{item.category}</span>
                            <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${isNeg ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
                              {isNeg ? 'Negotiable' : 'Fixed Price'}
                            </span>
                            {isSold && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="bg-red-600 text-white font-black text-sm px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">SOLD</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="text-lg font-black text-gray-900 mb-1">Rs. {item.price?.toLocaleString()}</div>
                            <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-1.5">{item.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                          </div>
                        </div>
                        <div className="px-4 pb-4 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                          <span className="flex items-center font-medium"><MapPin size={13} className="mr-1 text-orange-600" />{item.city || 'Nepal'}</span>
                          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                            {canModify && (
                              <div className="flex items-center space-x-1">
                                {isEditor && (
                                  <button onClick={() => openEditModal(item)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-lg transition" title="Edit post">
                                    <Edit3 size={14} />
                                  </button>
                                )}
                                <button onClick={(e) => handleDeleteListing(e, item)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg transition" title="Delete post">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div 
          onClick={() => setSelectedItem(null)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl max-w-xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <button 
              onClick={() => setSelectedItem(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2.5 rounded-full transition z-10"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="h-64 bg-gray-100 rounded-2xl overflow-hidden mb-4 relative">
              <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-full object-cover" />
              {selectedItem.status === 'Sold' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-red-600 text-white font-black text-lg px-6 py-2 rounded-full uppercase tracking-wider">SOLD</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs bg-orange-100 text-
