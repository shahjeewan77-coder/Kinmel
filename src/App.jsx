import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user'); // 'owner', 'admin', or 'user'
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
          image_url: imageUrl,
          user_id: user.id
        }
      ]);

      if (error) throw error;

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

  const handleDeleteListing = async (item) => {
    const canDelete = userRole === 'owner' || userRole === 'admin' || (user && item.user_id === user.id);
    if (!canDelete) return alert('You do not have permission to delete this listing.');

    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', item.id);
      if (error) throw error;
      setListings(listings.filter(l => l.id !== item.id));
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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-2xl font-extrabold text-orange-600 tracking-tight hover:opacity-80 transition cursor-pointer text-left focus:outline-none"
            >
              Kinmel
            </button>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Nepal</span>
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
                className="bg-orange-600 hover:bg-orange-700 text-
