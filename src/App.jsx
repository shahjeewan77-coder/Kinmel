import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload, MessageCircle, Phone, ShieldAlert, BarChart3, Users, MousePointerClick, LayoutGrid } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user'); // 'owner', 'admin', or 'user'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Navigation view: 'marketplace' or 'admin-dashboard'
  const [currentView, setCurrentView] = useState('marketplace');

  // Admin Clicks & Analytics State
  const [clickLogs, setClickLogs] = useState([]);
  const [loadingClicks, setLoadingClicks] = useState(false);

  // State for item detail view modal
  const [selectedItem, setSelectedItem] = useState(null);

  // State for posting new listing modal
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

      if (data) {
        setUserRole(data.role);
      } else {
        setUserRole('user');
      }
    } catch (err) {
      console.error('Error fetching role:', err);
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
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole('user');
    setCurrentView('marketplace');
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
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        imageUrl = publicURLData.publicUrl;
      }

      const { error } = await supabase.from('listings').insert([
        {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice),
          category: newCategory,
          city: newCity,
          phone: newPhone,
          image_url: imageUrl,
          user_id: user.id
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
    } catch (err) {
      alert('Error posting listing: ' + err.message);
    } finally {
      setPosting(false);
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

  const filteredListings = listings.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isPrivileged = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentView('marketplace');
                setSearchTerm('');
                setSelectedCategory('All');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-2xl font-black text-orange-600 tracking-tight hover:opacity-85 transition cursor-pointer"
            >
              Kinmel
            </a>
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-semibold">Nepal</span>
            {userRole === 'owner' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold ml-2">Owner Admin</span>
            )}
            {userRole === 'admin' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold ml-2">Admin</span>
            )}
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search phones, cars, rooms, jobs..."
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
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center transition shadow-xs ${
                  currentView === 'admin-dashboard' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                }`}
              >
                <ShieldAlert size={16} className="mr-1.5" /> 
                {currentView === 'admin-dashboard' ? 'Marketplace View' : 'Admin Dashboard'}
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center shadow-sm transition"
                >
                  <PlusCircle size={16} className="mr-1.5" /> Post Ad
                </button>
                <span className="text-sm font-medium text-gray-700 hidden lg:inline">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="text-sm border border-gray-300 px-3 py-2 rounded-xl hover:bg-gray-100 font-medium text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleGoogleLogin}
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'admin-dashboard' && isPrivileged ? (
        /* ================= ADMIN DASHBOARD PANEL ================= */
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner & Admin Control Center</h1>
              <p className="text-sm text-gray-500">Monitor platform activity, listing engagement, and buyer interest notifications.</p>
            </div>
            <button 
              onClick={fetchClickLogs}
              className="text-xs bg-white border border-gray-300 px-3.5 py-2 rounded-xl font-medium hover:bg-gray-50 shadow-xs"
            >
              Refresh Data
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Live Listings</p>
                <h3 className="text-3xl font-black text-gray-900">{listings.length}</h3>
              </div>
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl"><BarChart3 size={24} /></div>
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

          {/* Click Notifications Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50/70 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-base flex items-center">
                <MousePointerClick size={18} className="mr-2 text-orange-600" /> Buyer Ad Click Notifications
              </h3>
              <span className="text-xs text-gray-500">Live interaction stream</span>
            </div>

            {loadingClicks ? (
              <div className="text-center py-12 text-gray-500">Loading click logs...</div>
            ) : clickLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No ad clicks recorded yet. Try clicking an ad in the marketplace!</div>
            ) : (
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
                        <td className="py-4 px-6">
                          <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                            {log.listings?.category || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-orange-600">
                          {log.listings?.price ? `Rs. ${log.listings.price.toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900">
                          {log.viewer_email || 'Guest Visitor'}
                        </td>
                        <td className="py-4 px-6 text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* ================= MARKETPLACE VIEW ================= */
        <>
          {/* Hero Banner with Tagline */}
          <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white py-12 px-4 text-center shadow-inner">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Buy, sell and rent everything</h1>
              <p className="text-orange-100 text-base md:text-lg mb-6 font-medium">
                Your trusted local marketplace across Nepal for gear, property, vehicles, electronics and more.
              </p>
              {user && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-8 py-3 rounded-2xl text-sm shadow-lg transition transform hover:-translate-y-0.5"
                >
                  + Post Your Free Ad Now
                </button>
              )}
            </div>
          </section>

          {/* Main Layout: Left Sidebar Categories + Right Listings */}
          <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Left Sidebar Categories */}
              <aside className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs sticky top-20">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center">
                    <LayoutGrid size={15} className="mr-2 text-orange-600" /> Categories
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory('All')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        selectedCategory === 'All' 
                          ? 'bg-orange-500 text-white shadow-sm' 
                          : 'text-gray-700 hover:bg-gray-100/70'
                      }`}
                    >
                      All Items
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                          selectedCategory === cat 
                            ? 'bg-orange-500 text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100/70'
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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">
                      {selectedCategory === 'All' ? 'Freshly Posted Ads' : `${selectedCategory} Listings`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">Click any listing to view details, call, or message instantly</p>
                  </div>
                  <span className="text-xs font-semibold bg-gray-200/70 text-gray-700 px-3 py-1 rounded-full">
                    {filteredListings.length} items
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-24 text-gray-500 font-medium">Loading marketplace...</div>
                ) : filteredListings.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-xs">
                    <p className="text-gray-600 font-semibold mb-2">No live listings found matching your criteria.</p>
                    {user && (
                      <button onClick={() => setIsModalOpen(true)} className="text-orange-600 text-sm font-bold hover:underline">
                        Be the first to post in this category!
                      </button>
                    )}
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
                              <img 
                                src={item.image_url} 
                                alt={item.title}
