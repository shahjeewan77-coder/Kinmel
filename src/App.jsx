import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    // 1. Check active session on load and clean up the OAuth hash tokens
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // 2. Listen for auth changes and clean up URL hash on sign in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    fetchListings();

    return () => subscription.unsubscribe();
  }, []);

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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const categories = ['Vehicles', 'Real Estate', 'Mobile Phones', 'Computers', 'Electronics', 'Home & Furniture', 'Fashion', 'Jobs'];

  const filteredListings = listings.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-extrabold text-orange-600 tracking-tight">Kinmel</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Nepal</span>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search phones, cars, rooms, jobs..."
                className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleGoogleLogin}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-12 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Buy and sell, simply across Nepal.</h1>
        <p className="text-orange-100 max-w-xl mx-auto text-sm md:text-base mb-6">
          From smartphones and scooters to apartments and jobs. Post free in under a minute.
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Explore Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
              className={`p-4 rounded-xl text-center border transition text-sm font-medium ${
                selectedCategory === cat 
                  ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-6">Freshly Posted Ads</h2>
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading marketplace listings...</div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 font-medium">No live listings found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredListings.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="h-48 bg-gray-100 relative">
                  <img 
                    src={item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                  {item.is_featured && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded font-bold uppercase">
                      Featured
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-lg font-bold text-gray-900 mb-1">Rs. {item.price?.toLocaleString()}</div>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-2">{item.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                    <span className="flex items-center"><MapPin size={12} className="mr-1" />{item.city || 'Kathmandu'}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6 text-center text-sm text-gray-500">
        <p>© 2026 Kinmel Nepal · Powered by Supabase & Vercel</p>
      </footer>
    </div>
  );
}
