import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload, MessageCircle, Phone, ShieldAlert, BarChart3, Users, MousePointerClick, LayoutGrid, Layers, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [appMode, setAppMode] = useState(null);

  const [currentView, setCurrentView] = useState('marketplace');
  const [clickLogs, setClickLogs] = useState([]);
  const [loadingClicks, setLoadingClicks] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Vehicles');
  const [newCity, setNewCity] = useState('Dhangadhi');
  const [newPhone, setNewPhone] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const categories = ['Vehicles', 'Real Estate', 'Mobile Phones', 'Computers', 'Electronics', 'Home & Furniture', 'Fashion', 'Jobs'];

  useEffect(() => {
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

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId) {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data) setUserRole(data.role);
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
      setLoadingClicks(true);
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
    } finally {
      setLoadingClicks(false);
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

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return alert('Please fill in title and price!');

    try {
      setPosting(true);
      let imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';

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

      const finalCategory = `${appMode === 'rental' ? 'Rental: ' : 'Buy/Sell: '}${newCategory}`;
      const isPrivileged = userRole === 'owner' || userRole === 'admin';

      const { error } = await supabase.from('listings').insert([
        {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice),
          category: finalCategory,
          city: newCity,
          phone: newPhone,
          image_url: imageUrl,
          user_id: user.id,
          is_approved: isPrivileged // Auto-approve if posted by owner/admin, pending otherwise
        }
      ]);

      if (error) throw error;

      setNewTitle('');
      setNewDescription('');
      setNewPrice('');
      setNewPhone('');
      setImageFile(null);
      setIsModalOpen(false);
      fetchListings();
      alert(isPrivileged ? 'Listing published successfully!' : 'Ad submitted successfully! It will appear publicly after admin approval.');
    } catch (err) {
      alert('Error posting listing: ' + err.message);
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

  const handleDeleteListing = async (e, item) => {
    e.stopPropagation();
    const canDelete = userRole === 'owner' || userRole === 'admin' || (user && item.user_id === user.id);
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

  const isPrivileged = userRole === 'owner' || userRole === 'admin';

  // Filter listings based on mode, category, search, and approval status
  const filteredListings = listings.filter((item) => {
    // Regular users/guests only see approved items. Admins can see all.
    if (!isPrivileged && !item.is_approved) return false;

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

  // Gateway Screen
  if (!appMode && currentView === 'marketplace') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">Kinmel Nepal</h1>
          <p className="text-lg md:text-xl text-orange-100 mb-12">Make deals securely by contacting owners directly. Choose your section below:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Rental Option */}
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

            {/* Buy / Sell Option */}
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

          {isPrivileged && (
            <div className="mt-10">
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className="bg-black/30 hover:bg-black/50 text-white text-xs font-bold px-6 py-3 rounded-2xl backdrop-blur-md transition"
              >
                🛡️ Open Admin Control Center {pendingListings.length > 0 && `(${pendingListings.length} Pending Approval)`}
              </button>
            </div>
          )}
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
              }}
              className="text-2xl font-black text-orange-600 tracking-tight cursor-pointer"
            >
              Kinmel
            </a>
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-semibold">Nepal</span>
            
            <button 
              onClick={() => setAppMode(appMode === 'rental' ? 'buysell' : 'rental')}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-xl font-bold transition flex items-center"
            >
              Mode: <span className="text-orange-600 ml-1 uppercase">{appMode === 'rental' ? '🏠 Rental' : '🛒 Buy/Sell'} (Switch)</span>
            </button>
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

          <div className="flex items-center space-x-3">
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
                <ShieldAlert size={16} className="mr-1.5" /> 
                {currentView === 'admin-dashboard' ? 'Marketplace View' : 'Admin Dashboard'}
                {pendingListings.length > 0 && currentView !== 'admin-dashboard' && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {pendingListings.length}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center shadow-sm"
                >
                  <PlusCircle size={16} className="mr-1.5" /> Post Ad
                </button>
                <span className="text-sm font-medium text-gray-700 hidden lg:inline">{user.email}</span>
                <button onClick={handleLogout} className="text-sm border border-gray-300 px-3 py-2 rounded-xl hover:bg-gray-100 font-medium text-gray-700">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm">
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'admin-dashboard' && isPrivileged ? (
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner & Admin Control Center</h1>
              <p className="text-sm text-gray-500">Approve pending ads, monitor platform engagement, and track viewer clicks.</p>
            </div>
            <button onClick={fetchClickLogs} className="text-xs bg-white border border-gray-300 px-3.5 py-2 rounded-xl font-medium hover:bg-gray-50 flex items-center">
              <RefreshCw size={14} className="mr-1.5 text-gray-500" /> Refresh Data
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Active User Role</p>
                <h3 className="text-xl font-bold text-orange-600 capitalize">{userRole} Admin</h3>
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
                        <p className="text-xs text-gray-400 mt-0.5">Posted: {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleApproveListing(item.id)} 
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
                      >
                        ✓ Approve Ad
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

          {/* Click Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-base flex items-center">
                <MousePointerClick size={18} className="mr-2 text-orange-600" /> Buyer Ad Click Notifications
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Clicked Ad Title</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Price</th>
                    <th className="py-3.5 px-6">Viewer Gmail / User</th>
                    <th className="py-3.5 px-6">Time Clicked</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {clickLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-4 px-6 font-semibold text-gray-900">{log.listings?.title || 'Deleted Listing'}</td>
                      <td className="py-4 px-6"><span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">{log.listings?.category || 'N/A'}</span></td>
                      <td className="py-4 px-6 font-bold text-orange-600">{log.listings?.price ? `Rs. ${log.listings.price.toLocaleString()}` : 'N/A'}</td>
                      <td className="py-4 px-6 font-medium text-gray-900">{log.viewer_email || 'Guest Visitor'}</td>
                      <td className="py-4 px-6 text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                onClick={() => setIsModalOpen(true)}
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
                  {selectedCategory === 'All' ? `All Approved ${appMode === 'rental' ? 'Rental' : 'Buy/Sell'} Items` : `${selectedCategory} Listings`}
                </h2>
                <span className="text-xs font-semibold bg-gray-200/70 text-gray-700 px-3 py-1 rounded-full">{filteredListings.length} items</span>
              </div>

              {loading ? (
                <div className="text-center py-24 text-gray-500 font-medium">Loading items...</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <p className="text-gray-600 font-semibold mb-2">No approved items found here yet.</p>
                  <p className="text-xs text-gray-400">Post an ad and our team will approve it shortly!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((item) => {
                    const canModify = isPrivileged || (user && item.user_id === user.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleCardClick(item)}
                        className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                      >
                        <div>
                          <div className="h-48 bg-gray-100 relative overflow-hidden">
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <span className="absolute top-3 left-3 bg-black/75 text-white text-xs px-2.5 py-1 rounded-lg font-medium">{item.category}</span>
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
                              <button onClick={(e) => handleDeleteListing(e, item)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg transition" title="Delete post">
                                <Trash2 size={14} />
                              </button>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            <div className="h-64 bg-gray-100 rounded-2xl overflow-hidden mb-4"><img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-full object-cover" /></div>
            <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold">{selectedItem.category}</span>
            <h2 className="text-2xl font-black text-gray-900 mt-2.5 mb-1">{selectedItem.title}</h2>
            <div className="text-2xl font-black text-orange-600 mb-4">Rs. {selectedItem.price?.toLocaleString()}</div>
            <div className="flex items-center text-sm text-gray-600 mb-5 flex-wrap gap-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200/60">
              <span className="flex items-center mr-4 font-medium"><MapPin size={16} className="mr-1 text-orange-600" />Location: {selectedItem.city || 'Nepal'}</span>
              {selectedItem.phone && <span className="flex items-center mr-4 font-bold text-gray-900"><Phone size={16} className="mr-1 text-orange-600" />Contact: {selectedItem.phone}</span>}
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-200/60">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selectedItem.description || 'No description provided.'}</p>
            </div>
            <div className="flex items-center space-x-3">
              <a 
                href={`https://wa.me/${selectedItem.phone ? selectedItem.phone.replace(/[^0-9]/g, '') : ''}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center shadow-sm"
              >
                <MessageCircle size={18} className="mr-2" /> WhatsApp Chat
              </a>
              {selectedItem.phone ? (
                <a href={`tel:${selectedItem.phone}`} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center">
                  <Phone size={16} className="mr-2" /> Call Owner
                </a>
              ) : (
                <button onClick={() => alert('Owner notified!')} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center">
                  Notify Owner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            <h2 className="text-xl font-black text-gray-900 mb-4">Post in {appMode === 'rental' ? 'Rental' : 'Buy/Sell'}</h2>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Item Title *</label>
                <input type="text" required placeholder="e.g. Concrete Mixer / Honda Dio" className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Price / Rate (NPR) *</label>
                  <input type="number" required placeholder="e.g. 5000" className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                  <select className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">City / Location</label>
                  <input type="text" placeholder="e.g. Dhangadhi" className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Contact Phone Number</label>
                  <input type="text" placeholder="e.g. 9812345678" className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Upload Photo</label>
                <label className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl px-3.5 py-3 text-sm cursor-pointer hover:bg-gray-50 text-gray-600 transition">
                  <Upload size={16} className="mr-2 text-orange-600" />
                  <span className="truncate font-medium">{imageFile ? imageFile.name : 'Choose file...'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                <textarea rows="3" placeholder="Mention condition, terms, features..." className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}></textarea>
              </div>
              <button type="submit" disabled={posting} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm transition">
                {posting ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t mt-12 py-6 text-center text-sm text-gray-500 font-medium px-4">
        <p className="mb-1">Make deals by directly contacting the owner. For any assistance, our team is ready for you!</p>
        <p className="text-xs text-gray-400">© 2026 [Kinmel Nepal](https://kinmel-delta.vercel.app/#) · Powered by Supabase & Vercel</p>
      </footer>
    </div>
  );
}
