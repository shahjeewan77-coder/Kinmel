import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, MapPin, PlusCircle, Trash2, X, Upload, MessageCircle, Phone, ShieldAlert, Users, MousePointerClick, LayoutGrid, ArrowRight, CheckCircle2, UserCheck, Edit3, Download, Home, ShoppingBag, Calendar, Eye, EyeOff } from 'lucide-react';

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Phone Auth States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for date filter input inside Control Center (Defaults to today's date YYYY-MM-DD)
  const [clickDateFilter, setClickDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Screen Size Detection for Mobile vs PC Adjustments
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Team Roles State for Directory Management
  const [teamMembers, setTeamMembers] = useState([]);

  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Post / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Construction');
  const [newCity, setNewCity] = useState('Dhangadhi');
  const [newPhone, setNewPhone] = useState('');
  const [newNegotiable, setNewNegotiable] = useState(true);
  
  // Multiple Image States
  const [imageFiles, setImageFiles] = useState([]);
  const [posting, setPosting] = useState(false);

  // Role Assignment State inside Control Center
  const [targetEmail, setTargetEmail] = useState('');
  const [assignedRoleSelect, setAssignedRoleSelect] = useState('admin');
  const [updatingRole, setUpdatingRole] = useState(false);

  const categories = ['Construction', 'Vehicles', 'Real Estate', 'Mobile Phones', 'Computers', 'Electronics', 'Home & Furniture', 'Fashion', 'Jobs'];

  // Register Service Worker & Handle Install Prompt safely on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('Service worker registration failed: ', err);
        });
      });
    }

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      console.log('App was successfully installed');
    });

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
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      subscription.unsubscribe();
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install Kinmel:\n• On Mobile: Tap your browser menu (three dots) and select "Add to Home Screen" or "Install App".\n• On PC/Desktop: Click the install icon in your browser address bar.');
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
        setUserRole(data.role.toLowerCase());
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

  async function fetchTeamMembers() {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('role', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Error fetching team members:', err.message);
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  // Phone Auth Handlers
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return alert('Please enter your mobile number!');
    
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+977${formattedPhone}`;
    }

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      setOtpSent(true);
      alert('OTP code sent successfully to your phone!');
    } catch (err) {
      alert('Error sending OTP: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpToken) return alert('Please enter the OTP code!');

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+977${formattedPhone}`;
    }

    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpToken.trim(),
        type: 'sms',
      });

      if (error) throw error;
      alert('Successfully logged in!');
    } catch (err) {
      alert('Invalid OTP code: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole('user');
    setCurrentView('marketplace');
    setAppMode(null);
  };

  const handleCardClick = async (item) => {
    setActiveImageIndex(0);
    setSelectedItem(item);
    try {
      await supabase.from('listing_clicks').insert([
        {
          listing_id: item.id,
          owner_id: item.user_id,
          viewer_id: user ? user.id : null,
          viewer_email: user ? user.email : (user?.phone || 'Guest Visitor')
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
    const cleanCat = item.category?.replace(/^(Rental: |Buy\/Sell: )/, '') || 'Construction';
    setNewCategory(categories.includes(cleanCat) ? cleanCat : 'Construction');
    setImageFiles([]);
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
    setNewCategory('Construction');
    setImageFiles([]);
    setIsModalOpen(true);
  };

  const handleSaveListing = async (e) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return alert('Please fill in title and price!');

    try {
      setPosting(true);
      
      // Determine existing images array or fallback string
      let imageUrls = [];
      if (editingItem) {
        if (Array.isArray(editingItem.image_url)) {
          imageUrls = [...editingItem.image_url];
        } else if (typeof editingItem.image_url === 'string') {
          imageUrls = [editingItem.image_url];
        }
      }

      // Upload new selected images in parallel
      if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = Array.from(imageFiles).map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicURLData } = supabase.storage
            .from('listing-images')
            .getPublicUrl(fileName);

          return publicURLData.publicUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...uploadedUrls];
      }

      // Fallback default image if none available
      if (imageUrls.length === 0) {
        imageUrls = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'];
      }

      let finalCategory = newCategory;
      if (editingItem) {
        const prefix = editingItem.category?.startsWith('Rental:') ? 'Rental: ' : 'Buy/Sell: ';
        finalCategory = `${prefix}${newCategory}`;
      } else {
        finalCategory = `${appMode === 'rental' ? 'Rental: ' : 'Buy/Sell: '}${newCategory}`;
      }

      const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

      if (editingItem) {
        const updateData = {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice),
          category: finalCategory,
          city: newCity,
          phone: newPhone,
          negotiable: newNegotiable,
          image_url: imageUrls // Store array of images
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
          image_url: imageUrls, // Store array of images
          user_id: user.id,
          is_approved: isOwnerOrAdmin,
          status: 'Active',
          sold_at: null
        };

        const { error } = await supabase.from('listings').insert([insertData]);
        if (error) throw error;
        alert(isOwnerOrAdmin ? 'Listing published successfully!' : 'Ad submitted successfully! It will appear publicly after review.');
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
    const canDelete = isOwner || (user && item.user_id === user.id);
    if (!canDelete) return alert('Only the Owner or the listing author can delete this listing.');

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

  const handleAssignRoleFromApp = async (e) => {
    e.preventDefault();
    if (!isOwner) return alert('Only the Owner can assign roles.');
    if (!targetEmail) return alert('Please enter an identifier.');

    try {
      setUpdatingRole(true);
      
      const { data: userData } = await supabase
        .from('user_roles')
        .select('id')
        .eq('email', targetEmail.trim().toLowerCase())
        .maybeSingle();

      let targetUserId = userData?.id;

      if (!targetUserId) {
        return alert('User must sign into Kinmel Nepal first before assigning a role!');
      }

      const { error: upsertError } = await supabase
        .from('user_roles')
        .upsert([
          { id: targetUserId, email: targetEmail.trim().toLowerCase(), role: assignedRoleSelect }
        ], { onConflict: ['id'] });

      if (upsertError) throw upsertError;

      alert(`Successfully assigned role '${assignedRoleSelect}'!`);
      setTargetEmail('');
      fetchTeamMembers();
    } catch (err) {
      alert('Error updating role: ' + err.message);
    } finally {
      setUpdatingRole(false);
    }
  };

  // Role Hierarchy Definitions
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;
  const isEditor = userRole === 'editor' || isAdmin;
  const isPrivileged = isOwner || isAdmin || isEditor || userRole === 'responder';

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

  const filteredClicksByDate = clickLogs.filter(log => {
    if (!clickDateFilter) return true;
    if (!log.created_at) return false;
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    return logDate === clickDateFilter;
  });

  // Helper to safely extract image URLs as an array
  const getItemImages = (item) => {
    if (!item?.image_url) return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30'];
    if (Array.isArray(item.image_url)) return item.image_url;
    return [item.image_url];
  };

  // INITIAL LANDING DISPLAY SCREEN
  if (!appMode && currentView === 'marketplace') {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <span className="text-2xl font-black text-orange-600 tracking-tight cursor-pointer">Kinmel</span>
              <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-gray-600">
                <a href="#" className="hover:text-orange-600 transition">Home</a>
                <a href="#" className="hover:text-orange-600 transition">About boosting</a>
                <a href="#" className="hover:text-orange-600 transition">FAQ</a>
                <a href="#" className="hover:text-orange-600 transition">Contact us</a>
                <a href="#" className="hover:text-orange-600 transition">Subscription plans</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleInstallClick}
                className="hidden lg:flex items-center text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-2 rounded-xl font-bold transition"
              >
                <Download size={14} className="mr-1.5" /> App
              </button>
              {user && (
                <button
                  onClick={() => setCurrentView('my-dashboard')}
                  className="text-xs bg-orange-600 text-white font-bold px-3.5 py-2 rounded-xl"
                >
                  My Dashboard
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="bg-gray-50 border-b py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex-1 max-w-2xl relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400"><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search for anything..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="hidden md:flex items-center space-x-3 ml-4">
              <button 
                onClick={() => { setAppMode('rental'); setSelectedCategory('All'); }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center"
              >
                🏠 Enter Rental Section
              </button>
              <button 
                onClick={() => { setAppMode('buysell'); setSelectedCategory('All'); }}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center"
              >
                🛒 Enter Buy & Sell Section
              </button>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-10 md:py-16 flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start space-y-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2">Download Kinmel app</h2>
              <p className="text-sm md:text-base text-gray-500 font-medium">Scan and discover great deals on the go!</p>
            </div>

            <div className="bg-white border-2 border-gray-200 p-4 rounded-3xl shadow-sm inline-block">
              <div className="w-48 h-48 bg-gray-900 rounded-2xl flex items-center justify-center text-white p-3">
                <div className="w-full h-full border-4 border-white flex flex-col justify-between p-2 font-mono text-[9px] text-center bg-white text-black font-bold tracking-tighter">
                  <div className="flex justify-between"><span>■■■</span><span>■■■</span></div>
                  <div className="my-auto">SCAN TO DOWNLOAD APP</div>
                  <div className="flex justify-between"><span>■■■</span><span>■■■</span></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-black text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 cursor-pointer hover:bg-gray-800 transition">
                <span className="text-xl">▶</span>
                <div className="text-left leading-tight">
                  <div className="text-[9px] uppercase font-semibold text-gray-300">Get it on</div>
                  <div className="text-xs font-bold">Google Play</div>
                </div>
              </div>
              <div className="bg-black text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 cursor-pointer hover:bg-gray-800 transition">
                <span className="text-xl"></span>
                <div className="text-left leading-tight">
                  <div className="text-[9px] uppercase font-semibold text-gray-300">Download on the</div>
                  <div className="text-xs font-bold">App Store</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xl max-w-md w-full mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-6">Login</h2>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <div className="relative flex items-center border border-gray-300 rounded-2xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                    <div className="flex items-center pl-3 pr-2 py-3 bg-gray-100 border-r text-xs font-bold text-gray-700">
                      🇳🇵 +977
                    </div>
                    <input 
                      type="tel" 
                      required 
                      placeholder="Phone Number" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-3 text-sm bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative flex items-center border border-gray-300 rounded-2xl bg-gray-50 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password / PIN" 
                      className="w-full px-4 py-3 text-sm bg-transparent outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-4 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-md"
                >
                  {authLoading ? 'Sending OTP...' : 'Log In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Enter 6-digit OTP code sent to phone</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="123456" 
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    className="w-full border rounded-2xl px-4 py-3 text-center tracking-widest text-lg font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-md"
                >
                  {authLoading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </form>
            )}

            <div className="text-center mt-4">
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset sent to registered phone.'); }} className="text-xs font-bold text-gray-600 hover:text-orange-600 underline">
                Forgot password?
              </a>
            </div>

            <div className="mt-6 pt-6 border-t text-center">
              <button 
                onClick={handleGoogleLogin} 
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 transition"
              >
                <span>🌐</span>
                <span>Continue with Google Sign-In</span>
              </button>
            </div>
          </div>
        </main>

        <div className="bg-gray-50 border-t py-8 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="font-black text-gray-800 text-lg mb-4">Or jump directly into sections:</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => { setAppMode('rental'); setSelectedCategory('All'); }}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-6 py-3 rounded-2xl text-sm transition flex items-center justify-center space-x-2"
              >
                <span>🏠 Browse Rental Marketplace</span>
              </button>
              <button 
                onClick={() => { setAppMode('buysell'); setSelectedCategory('All'); }}
                className="bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold px-6 py-3 rounded-2xl text-sm transition flex items-center justify-center space-x-2"
              >
                <span>🛒 Browse Buy & Sell Marketplace</span>
              </button>
            </div>
          </div>
        </div>

        <footer className="bg-white border-t py-4 text-center text-xs text-gray-500">
          <p>© 2026 Kinmel Nepal · Powered by Supabase & Vercel</p>
        </footer>
      </div>
    );
  }

  // MAIN MARKETPLACE / DASHBOARD VIEWS
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-20 md:pb-0">
      <header className="bg-white border-b sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAppMode(null);
                setSearchTerm('');
                setSelectedCategory('All');
                setCurrentView('marketplace');
              }}
              className="text-xl md:text-2xl font-black text-orange-600 tracking-tight cursor-pointer"
            >
              Kinmel
            </a>
            <span className="text-[10px] md:text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Nepal</span>
            
            {appMode && (
              <button 
                onClick={() => setAppMode(appMode === 'rental' ? 'buysell' : 'rental')}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-1 rounded-xl font-bold transition flex items-center"
              >
                <span className="text-orange-600 uppercase text-[10px] md:text-xs">{appMode === 'rental' ? '🏠 Rental' : '🛒 Buy/Sell'} (Switch)</span>
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

          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="hidden lg:flex items-center text-xs bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 px-3 py-2 rounded-xl font-bold transition"
            >
              <Download size={14} className="mr-1.5" /> App
            </button>

            {user && (
              <button
                onClick={() => setCurrentView(currentView === 'my-dashboard' ? 'marketplace' : 'my-dashboard')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold hidden md:flex items-center transition shadow-2xs ${
                  currentView === 'my-dashboard' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserCheck size={14} className="mr-1.5" /> My Dashboard
              </button>
            )}

            {isPrivileged && (
              <button
                onClick={() => {
                  setCurrentView(currentView === 'admin-dashboard' ? 'marketplace' : 'admin-dashboard');
                  if (currentView !== 'admin-dashboard') {
                    fetchClickLogs();
                    if (isOwner) fetchTeamMembers();
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold hidden md:flex items-center transition shadow-2xs relative ${
                  currentView === 'admin-dashboard' ? 'bg-gray-900 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                }`}
              >
                <ShieldAlert size={14} className="mr-1.5" /> Control Center
                {pendingListings.length > 0 && currentView !== 'admin-dashboard' && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {pendingListings.length}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={openCreateModal}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center shadow-sm"
                >
                  <PlusCircle size={14} className="mr-1" /> Post
                </button>
                <button onClick={handleLogout} className="text-xs border border-gray-300 px-2.5 py-2 rounded-xl hover:bg-gray-100 font-medium text-gray-700 hidden lg:inline">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={() => setAppMode(null)} className="bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-9 pr-4 py-2 border rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'my-dashboard' && user ? (
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Posted Ads</h1>
              <p className="text-xs md:text-sm text-gray-500">Manage active listings, review approval, or update product status.</p>
            </div>
            <button 
              onClick={() => setCurrentView('marketplace')} 
              className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-xl font-medium hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-8">
            <div className="px-4 md:px-6 py-3.5 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm md:text-base">Your Listings ({myUserListings.length})</h3>
              <button onClick={openCreateModal} className="bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                + Post New
              </button>
            </div>
            {myUserListings.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs md:text-sm">You haven't posted any ads yet.</div>
            ) : (
              <div className="divide-y">
                {myUserListings.map(item => {
                  const itemImgs = getItemImages(item);
                  return (
                    <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50 transition">
                      <div className="flex items-center space-x-3">
                        <img src={itemImgs[0]} alt={item.title} className="w-16 h-16 object-cover rounded-xl border shrink-0" />
                        <div>
                          <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                            <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.status === 'Sold' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.status || 'Active'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-orange-600">Rs. {item.price?.toLocaleString()} · {item.city}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {item.is_approved ? <span className="text-green-600 font-semibold">Approved</span> : <span className="text-amber-600 font-semibold">Pending Review</span>}
                            {itemImgs.length > 1 && <span className="ml-2 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{itemImgs.length} Photos</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center"
                        >
                          <Edit3 size={12} className="mr-1" /> Edit
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(item)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                            item.status === 'Sold' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.status === 'Sold' ? 'Active' : 'Mark Sold'}
                        </button>
                        <button 
                          onClick={(e) => handleDeleteListing(e, item)} 
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      ) : currentView === 'admin-dashboard' && isPrivileged ? (
        <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Control Center ({userRole.toUpperCase()})</h1>
              <p className="text-xs md:text-sm text-gray-500">Approve pending ads and manage platform tools.</p>
            </div>
            <button onClick={() => setCurrentView('marketplace')} className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-xl font-medium hover:bg-gray-50">
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pending Queue</p>
                <h3 className="text-2xl md:text-3xl font-black text-orange-600">{pendingListings.length}</h3>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><CheckCircle2 size={20} /></div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Ad Clicks</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900">{clickLogs.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><MousePointerClick size={20} /></div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Your Role</p>
                <h3 className="text-lg md:text-xl font-bold text-orange-600 capitalize">{userRole}</h3>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Users size={20} /></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden mb-6">
            <div className="px-4 md:px-6 py-3.5 border-b bg-blue-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="font-bold text-gray-900 text-sm md:text-base flex items-center">
                <MousePointerClick size={16} className="mr-2 text-blue-600" /> Ad Clicks on Selected Date ({filteredClicksByDate.length})
              </h3>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-gray-600 flex items-center"><Calendar size={14} className="mr-1 text-blue-600" /> Select Date:</span>
                <input 
                  type="date" 
                  value={clickDateFilter}
                  onChange={(e) => setClickDateFilter(e.target.value)}
                  className="border rounded-xl px-3 py-1.5 text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800"
                />
              </div>
            </div>

            {filteredClicksByDate.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No ad clicks recorded for {clickDateFilter}.</div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredClicksByDate.map((log, idx) => (
                  <div key={idx} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs hover:bg-gray-50/60 transition gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {log.listings?.title || 'Deleted or Unknown Listing'}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Rs. {log.listings?.price?.toLocaleString() || 'N/A'} · {log.listings?.city || 'N/A'} · <span className="text-orange-600 font-semibold">{log.listings?.category || 'General'}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <span className="font-medium text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg">
                        👤 {log.viewer_email || 'Guest Visitor'}
                      </span>
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex-1 w-full">
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl px-4 md:px-6 py-4 mb-6 text-white shadow-md flex items-center justify-between">
            <button 
              onClick={() => setAppMode(null)}
              className="text-[10px] md:text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-1 rounded-xl transition"
            >
              ← Back to Login
            </button>
            <h1 className="text-sm md:text-xl font-black tracking-tight uppercase text-center">
              {appMode === 'rental' ? '🏠 Rental Section' : '🛒 Buy & Sell Section'}
            </h1>
            {user ? (
              <button 
                onClick={openCreateModal}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-3 py-1.5 rounded-xl text-[10px] md:text-xs shadow-sm transition whitespace-nowrap"
              >
                + Post
              </button>
            ) : <div></div>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-3 md:p-4 shadow-xs sticky top-20">
                <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center">
                  <LayoutGrid size={13} className="mr-1.5 text-orange-600" /> CATEGORIES
                </h3>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible space-x-1.5 lg:space-x-0 lg:space-y-1 pb-2 lg:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className={`whitespace-nowrap px-3 py-2 lg:w-full lg:text-left rounded-xl text-xs font-semibold transition ${
                      selectedCategory === 'All' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/70 bg-gray-50 lg:bg-transparent'
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-3 py-2 lg:w-full lg:text-left rounded-xl text-xs font-semibold transition ${
                        selectedCategory === cat ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/70 bg-gray-50 lg:bg-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-xl font-black text-gray-900">
                  {selectedCategory === 'All' ? `All ${appMode === 'rental' ? 'Rental' : 'Buy/Sell'} Items` : `${selectedCategory}`}
                </h2>
                <span className="text-[10px] md:text-xs font-semibold bg-gray-200/70 text-gray-700 px-2.5 py-0.5 rounded-full">{filteredListings.length} items</span>
              </div>

              {loading ? (
                <div className="text-center py-20 text-gray-500 text-sm font-medium">Loading items...</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs px-4">
                  <p className="text-gray-600 text-sm font-semibold mb-1">No items found here right now.</p>
                  <p className="text-xs text-gray-400">Post an ad or check back soon!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredListings.map((item) => {
                    const canModify = isEditor || (user && item.user_id === user.id);
                    const canDelete = isOwner || (user && item.user_id === user.id);
                    const isSold = item.status === 'Sold';
                    const isNeg = item.negotiable ?? true;
                    const itemImgs = getItemImages(item);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleCardClick(item)}
                        className={`bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group ${isSold ? 'opacity-80' : ''}`}
                      >
                        <div>
                          <div className="h-40 md:h-48 bg-gray-100 relative overflow-hidden">
                            <img src={itemImgs[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <span className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md font-medium">{item.category}</span>
                            {itemImgs.length > 1 && (
                              <span className="absolute bottom-2.5 left-2.5 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                                📷 {itemImgs.length} Photos
                              </span>
                            )}
                            <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm ${isNeg ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
                              {isNeg ? 'Negotiable' : 'Fixed'}
                            </span>
                            {isSold && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">SOLD</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3.5">
                            <div className="text-base font-black text-gray-900 mb-0.5">Rs. {item.price?.toLocaleString()}</div>
                            <h3 className="text-xs md:text-sm font-bold text-gray-800 line-clamp-1 mb-1">{item.title}</h3>
                            <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                          </div>
                        </div>
                        <div className="px-3.5 pb-3 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2.5">
                          <span className="flex items-center font-medium"><MapPin size={12} className="mr-1 text-orange-600" />{item.city || 'Nepal'}</span>
                          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                            {canModify && (
                              <div className="flex items-center space-x-1">
                                {isEditor && (
                                  <button onClick={() => openEditModal(item)} className="text-blue-500 bg-blue-50 p-1 rounded-md" title="Edit">
                                    <Edit3 size={12} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button onClick={(e) => handleDeleteListing(e, item)} className="text-red-500 bg-red-50 p-1 rounded-md" title="Delete">
                                    <Trash2 size={12} />
                                  </button>
                                )}
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

      {/* Item Detail Modal with Multiple Image Gallery Viewer */}
      {selectedItem && (
        <div 
          onClick={() => setSelectedItem(null)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto cursor-default"
          >
            <button 
              onClick={() => setSelectedItem(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition z-10"
            >
              <X size={18} />
            </button>

            {/* Main Active Photo */}
            {(() => {
              const imgs = getItemImages(selectedItem);
              return (
                <div>
                  <div className="h-52 md:h-64 bg-gray-100 rounded-2xl overflow-hidden mb-3 relative shadow-inner">
                    <img src={imgs[activeImageIndex] || imgs[0]} alt={selectedItem.title} className="w-full h-full object-cover transition duration-300" />
                    {selectedItem.status === 'Sold' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-red-600 text-white font-black text-base px-5 py-1.5 rounded-full uppercase tracking-wider">SOLD</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Row Selector */}
                  {imgs.length > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                      {imgs.map((imgUrl, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                            activeImageIndex === i ? 'border-orange-600 ring-2 ring-orange-400/50' : 'border-gray-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] md:text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-lg font-bold">{selectedItem.category}</span>
              <div className="flex items-center space-x-1.5">
                <span className={`text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full ${selectedItem.negotiable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                  {selectedItem.negotiable ? 'Negotiable' : 'Fixed'}
                </span>
              </div>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mt-1 mb-0.5">{selectedItem.title}</h2>
            <div className="text-xl md:text-2xl font-black text-orange-600 mb-3">Rs. {selectedItem.price?.toLocaleString()}</div>
            <div className="flex items-center text-xs md:text-sm text-gray-600 mb-4 flex-wrap gap-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200/60">
              <span className="flex items-center mr-4 font-medium"><MapPin size={14} className="mr-1 text-orange-600" />{selectedItem.city || 'Nepal'}</span>
              {selectedItem.phone && <span className="flex items-center font-bold text-gray-900"><Phone size={14} className="mr-1 text-orange-600" />{selectedItem.phone}</span>}
            </div>
            <div className="bg-gray-50 rounded-2xl p-3.5 mb-5 border border-gray-200/60">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-xs md:text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selectedItem.description || 'No description provided.'}</p>
            </div>
            <div className="flex items-center space-x-2.5">
              <a 
                href={`https://wa.me/${selectedItem.phone ? selectedItem.phone.replace(/[^0-9]/g, '') : ''}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm flex items-center justify-center shadow-sm"
              >
                <MessageCircle size={16} className="mr-1.5" /> WhatsApp Chat
              </a>
              {selectedItem.phone ? (
                <a href={`tel:${selectedItem.phone}`} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center">
                  <Phone size={14} className="mr-1.5" /> Call
                </a>
              ) : (
                <button onClick={() => alert('Owner notified!')} className="bg-orange-600 text-white px-4 py-3 rounded-xl text-xs font-bold">
                  Notify
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post / Edit Ad Modal with Multiple Photo Uploader */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 bg-gray-100 p-2 rounded-full"><X size={18} /></button>
            <h2 className="text-lg md:text-xl font-black text-gray-900 mb-3">{editingItem ? 'Edit Listing' : 'Post a New Ad'}</h2>
            <form onSubmit={handleSaveListing} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Item Title *</label>
                <input type="text" required placeholder="e.g. Concrete Mixer / Honda Dio" className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Price (NPR) *</label>
                  <input type="number" required placeholder="e.g. 5000" className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Category</label>
                  <select className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">City / Location</label>
                  <input type="text" placeholder="e.g. Dhangadhi" className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone Number</label>
                  <input type="text" placeholder="e.g. 9812345678" className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Price Type</label>
                <div className="flex items-center space-x-4 pt-0.5">
                  <label className="flex items-center cursor-pointer text-xs font-semibold text-gray-700">
                    <input type="radio" name="negotiable" checked={newNegotiable === true} onChange={() => setNewNegotiable(true)} className="mr-1.5 text-orange-600" /> Negotiable
                  </label>
                  <label className="flex items-center cursor-pointer text-xs font-semibold text-gray-700">
                    <input type="radio" name="negotiable" checked={newNegotiable === false} onChange={() => setNewNegotiable(false)} className="mr-1.5 text-orange-600" /> Fixed Price
                  </label>
                </div>
              </div>

              {/* Multiple Photos Upload Input */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Upload Photos (Multiple Allowed)</label>
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl px-3 py-3 text-xs cursor-pointer hover:bg-gray-50 text-gray-600 transition">
                  <Upload size={16} className="mb-1 text-orange-600" />
                  <span className="font-semibold text-center">
                    {imageFiles.length > 0 ? `${imageFiles.length} photo(s) selected` : 'Click to select multiple product photos'}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setImageFiles(Array.from(e.target.files));
                      }
                    }} 
                  />
                </label>
                {imageFiles.length > 0 && (
                  <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-1">
                    {Array.from(imageFiles).map((file, idx) => (
                      <span key={idx} className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Description</label>
                <textarea rows="2.5" placeholder="Mention condition, terms..." className="w-full border rounded-xl px-3 py-2 text-xs md:text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-orange-500" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}></textarea>
              </div>
              <button type="submit" disabled={posting} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition shadow-sm">
                {posting ? 'Uploading & Saving...' : (editingItem ? 'Save Changes' : 'Publish Listing')}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-white border-t mt-12 py-5 text-center text-xs text-gray-500 font-medium px-4">
        <p className="mb-1">Make deals by directly contacting the owner. For any assistance, our team is ready for you!</p>
        <p className="text-[10px] text-gray-400">© 2026 Kinmel Nepal · Powered by Supabase & Vercel</p>
      </footer>
    </div>
  );
}
