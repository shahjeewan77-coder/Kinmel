import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // State for posting new listing modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Vehicles');
  const [newCity, setNewCity] = useState('Dhangadhi');
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const categories = ['Vehicles', 'Real Estate', 'Mobile Phones', 'Computers', 'Electronics', 'Home & Furniture', 'Fashion', 'Jobs'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) checkOwnerStatus(currentUser.id);
      
      if (session && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkOwnerStatus(currentUser.id);
      } else {
        setIsOwner(false);
      }

      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    fetchListings();

    return () => subscription.unsubscribe();
  }, []);

  async function checkOwnerStatus(userId) {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data && data.role === 'owner') {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (err) {
      console.error('Error checking owner role:', err);
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
    setIsOwner(false);
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return alert('Please fill in title and price!');

    try {
      setPosting(true);
      let imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';

      // Upload image file to Supabase Storage if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get public URL of the uploaded image
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
          image_url: imageUrl,
          user_id: user.id
        }
      ]);

      if (error) throw error;

      // Reset form & close modal
      setNewTitle('');
      setNewDescription('');
      setNewPrice('');
      setImageFile(null);
      setIsModalOpen(false);
      fetchListings();
    } catch (err) {
      alert('Error posting listing: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
      setListings(listings.filter(item => item.id !== id));
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-extrabold text-orange-600 tracking-tight">Kinmel</span>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Nepal</span>
            {isOwner && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold ml-2">Owner Admin</span>
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
                className="w-full pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center shadow-sm"
                >
                  <PlusCircle size={16} className="mr-1.5" /> Post Ad
                </button>
                <span className="text-sm font-medium text-gray-700 hidden lg:inline">{user.email}</span>
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
        {user && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-6 py-2.5 rounded-xl text-sm shadow-md transition"
          >
            + Post Your Free Ad Now
          </button>
        )}
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Explore Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`p-4 rounded-xl text-center border transition text-sm font-medium ${
              selectedCategory === 'All' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            All Items
          </button>
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
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 font-medium mb-2">No live listings found matching your criteria.</p>
            {user && (
              <button onClick={() => setIsModalOpen(true)} className="text-orange-600 text-sm font-semibold hover:underline">
                Be the first to post an ad!
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredListings.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="h-48 bg-gray-100 relative">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-medium">
                      {item.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-lg font-bold text-gray-900 mb-1">Rs. {item.price?.toLocaleString()}</div>
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-2">{item.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                  </div>
                </div>
                <div className="px-4 pb-4 flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                  <span className="flex items-center"><MapPin size={12} className="mr-1" />{item.city || 'Nepal'}</span>
                  <div className="flex items-center space-x-2">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    {isOwner && (
                      <button 
                        onClick={() => handleDeleteListing(item.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
                        title="Delete as Owner"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Post Ad Modal with File Picker */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative shadow-xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Post a New Ad</h2>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ad Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Honda Dio Scooter 2022" 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Price (NPR) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 150000" 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City / Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dhangadhi" 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Photo</label>
                  <label className="flex items-center justify-center w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-600">
                    <Upload size={16} className="mr-2 text-orange-600" />
                    <span className="truncate">{imageFile ? imageFile.name : 'Choose file...'}</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea 
                  rows="3"
                  placeholder="Mention condition, features, contact details..." 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={posting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm"
              >
                {posting ? 'Uploading & Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6 text-center text-sm text-gray-500">
        <p>© 2026 Kinmel Nepal · Powered by Supabase & Vercel</p>
      </footer>
    </div>
  );
}
