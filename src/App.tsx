import React, { useState, useEffect } from "react";
import { api, getToken, removeToken } from "./lib/api.js";
import { UserProfile, ListingItem, SystemNotification, BuyerRequestItem } from "./types.js";
import { AuthCard } from "./components/AuthCard.js";
import { LandingPage } from "./components/LandingPage.js";
import { UziLinkLogo } from "./components/UziLinkLogo.js";
import { SellerView } from "./components/SellerView.js";
import { BuyerView } from "./components/BuyerView.js";
import { AdminView } from "./components/AdminView.js";
import { EPrView } from "./components/EPrView.js";
import { InboxView } from "./components/InboxView.js";
import { ToastContainer, ToastMessage } from "./components/Banner.js";
import { 
  LogOut, Shield, ShieldCheck, Mail, Bell, MessageSquare, ShoppingBag, 
  Settings, UserCheck, ShieldAlert, CheckCircle, HelpCircle, Layout,
  Home, ExternalLink, Leaf, Scale, MapPin, X, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { resolveImageUrl, handleImageFallback } from "./lib/imageMap.js";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showNotificationList, setShowNotificationList] = useState(false);

  // High-level view mode: "landing" for public marketing showcase, "dashboard" for logged-in circular workplace
  const [viewMode, setViewMode] = useState<"landing" | "dashboard">("landing");

  // Active App Navigation tab inside Dashboard
  const [activeTab, setActiveTab] = useState<string>("marketplace");

  // Quotation requests bids state
  const [bids, setBids] = useState<BuyerRequestItem[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);

  // Authentication Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authRole, setAuthRole] = useState<"SELLER" | "RECYCLER" | "MANUFACTURER" | "ARTISAN" | "EPR">("SELLER");

  // Guest listing preview modal
  const [selectedGuestListing, setSelectedGuestListing] = useState<ListingItem | null>(null);

  // Connection presets to route conversation instantly from buyer clicks
  const [partnerIdPreset, setPartnerIdPreset] = useState<string | null>(null);
  const [partnerNamePreset, setPartnerNamePreset] = useState<string | null>(null);
  const [listingIdPreset, setListingIdPreset] = useState<string | null>(null);

  // Display helpers: toast notifications generator
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    
    // Auto purge in 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleToastClose = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync / pull listings, bids, and notifications
  const pullPlatformData = async () => {
    try {
      const listRes = await api.getListings();
      setListings(listRes.listings || []);
    } catch (e) {
      console.warn("Soft: failed to update listings feed.");
    }

    if (!getToken()) return;

    try {
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications || []);

      setLoadingBids(true);
      const bidsRes = await api.getBids();
      setBids(bidsRes.requests || []);
    } catch (e) {
      console.warn("Soft: failed to update marketplace synchronization logs.");
    } finally {
      setLoadingBids(false);
    }
  };

  // Profile handshake on mount
  const checkSession = async () => {
    // Pull public listings for landing page immediately
    await pullPlatformData();

    const token = getToken();
    if (!token) {
      setLoading(false);
      setViewMode("landing");
      return;
    }

    try {
      const response = await api.getProfile();
      setUser(response.user);
      setViewMode("dashboard");
      
      // Auto assign default view based on user roles
      if (response.user.role === "SELLER") {
        setActiveTab("seller_console");
      } else if (response.user.role === "ADMIN") {
        setActiveTab("admin_suite");
      } else if (response.user.role === "EPR") {
        setActiveTab("epr_compliance");
      } else {
        setActiveTab("marketplace");
      }
    } catch (err) {
      console.error("Expired session context, clearing authorization token.", err);
      removeToken();
      setViewMode("landing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleSignout = () => {
    removeToken();
    setUser(null);
    setViewMode("landing");
    showToast("Logged out successfully.", "info");
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setAuthModalOpen(false);
    setViewMode("dashboard");
    
    // Route tab naturally
    if (profile.role === "SELLER") {
      setActiveTab("seller_console");
    } else if (profile.role === "ADMIN") {
      setActiveTab("admin_suite");
    } else if (profile.role === "EPR") {
      setActiveTab("epr_compliance");
    } else {
      setActiveTab("marketplace");
    }

    pullPlatformData();
  };

  const handleOpenAuth = (mode: "login" | "signup", role: "SELLER" | "RECYCLER" | "MANUFACTURER" | "ARTISAN" | "EPR" = "SELLER") => {
    setAuthMode(mode);
    setAuthRole(role);
    setAuthModalOpen(true);
  };

  const handleClearNotifications = async () => {
    if (notifications.length === 0) return;
    try {
      await api.markNotificationsAsRead();
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications);
      showToast("Cleared and read all notifications", "success");
    } catch (e) {
      showToast("Could not modify notification state.", "error");
    }
  };

  const handleSimulateEmailVerification = async () => {
    try {
      await api.verifyAccount();
      showToast("Email address verified (simulation active)!", "success");
      const response = await api.getProfile();
      setUser(response.user);
    } catch (e) {
      showToast("Verification attempt failed.", "error");
    }
  };

  const triggerDirectMessagePreset = (partnerId: string, partnerName: string, listingId: string) => {
    setPartnerIdPreset(partnerId);
    setPartnerNamePreset(partnerName);
    setListingIdPreset(listingId);
    setActiveTab("chat_inbox");
  };

  const handleViewGuestListing = (listing: ListingItem) => {
    if (user) {
      setViewMode("dashboard");
      setActiveTab("marketplace");
    } else {
      setSelectedGuestListing(listing);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center text-slate-600" id="global-loading-stage">
        <div className="relative">
          <UziLinkLogo size="xl" animated withText={false} />
        </div>
        <div className="mt-4 text-xs font-semibold tracking-wider text-slate-500 uppercase font-['Poppins',sans-serif]">
          Connecting to UziLink Kenya...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col">
      {/* Toast alert notifications */}
      <ToastContainer toasts={toasts} onClose={handleToastClose} />

      {/* Primary View Routing: Landing Page or Logged-In Circular Dashboard */}
      {viewMode === "landing" ? (
        <LandingPage
          user={user}
          listings={listings}
          onOpenAuth={handleOpenAuth}
          onGoToDashboard={() => setViewMode("dashboard")}
          onViewListingDetail={handleViewGuestListing}
        />
      ) : (
        /* DASHBOARD VIEW */
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" id="applet-dashboard-shell">
          
          {/* Dashboard Header Bar */}
          <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 sticky top-0 z-30" id="app-primary-navbar">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              
              {/* Brand Logo & Back to Home */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode("landing")}
                  className="flex items-center gap-2 group text-left cursor-pointer"
                  title="View Public Landing Page"
                >
                  <UziLinkLogo size="sm" theme="dark" />
                </button>

                <div className="hidden sm:block h-5 w-px bg-slate-800" />

                <button
                  onClick={() => setViewMode("landing")}
                  className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-2.5 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Landing Page</span>
                </button>
              </div>

              {/* Profile info, Notifications & Logout */}
              <div className="flex items-center gap-3 sm:gap-4">
                
                {/* Email Verification status badge */}
                {user && !user.verified && (
                  <button 
                    onClick={handleSimulateEmailVerification}
                    className="hidden sm:flex items-center gap-1.5 bg-[#452E10]/40 border border-[#6B4B18]/40 hover:bg-[#452E10] text-[10px] px-2.5 py-1.5 text-amber-200 rounded-lg transition cursor-pointer"
                    title="Verify your profile email (Simulation)"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unverified Email</span>
                  </button>
                )}

                {/* Notifications Bell toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotificationList(!showNotificationList)}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition relative cursor-pointer"
                    id="btn-navbar-notifications"
                    aria-label="Toggle notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                        {notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotificationList && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2.5 w-80 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl z-50 overflow-hidden"
                        id="notification-dropdown-menu"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-2">
                          <span className="text-xs font-bold text-slate-300">
                            Notifications ({notifications.filter((n) => !n.read).length})
                          </span>
                          <button
                            onClick={handleClearNotifications}
                            className="text-[10px] text-teal-400 hover:text-teal-300 transition font-bold cursor-pointer"
                          >
                            Read All
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-60 overflow-y-auto" id="notification-items-list">
                          {notifications.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-xs">No alerts. You are completely up to date!</div>
                          ) : (
                            notifications.map((n) => (
                              <div key={n.id} className={`text-[11px] p-2 rounded-lg border leading-tight ${n.read ? "bg-slate-950/25 text-slate-400 border-slate-850" : "bg-slate-950/80 text-slate-200 border-teal-800/40"}`}>
                                <div className="font-bold mb-0.5">{n.title}</div>
                                <div>{n.message}</div>
                                <span className="text-[8px] text-slate-500 font-normal block mt-1">{new Date(n.createdAt).toLocaleTimeString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile info greetings */}
                {user && (
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">{user.name}</span>
                    <span className="text-[10px] text-emerald-400 font-black block mt-0.5">Role: {user.role}</span>
                  </div>
                )}

                {/* Signout button */}
                <button
                  onClick={handleSignout}
                  className="bg-slate-950 hover:bg-slate-850 p-2.5 rounded-xl border border-slate-850 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                  id="btn-navbar-logout"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Pending Approval notice banner */}
          {user?.approvalStatus === "PENDING" && (
            <div className="bg-[#451111]/35 border-b border-rose-900/40 text-rose-300 py-2.5 px-6 text-xs font-medium text-center flex items-center justify-center gap-1.5" id="critical-account-review-strip">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Your {user.role} credentials are currently under administrative review. Once approved, you gain full trading permissions.</span>
            </div>
          )}

          {/* Dashboard Body Layout */}
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8" id="dashboard-stage-grid">
            
            {/* Sidebar Rail (Left) */}
            <nav className="lg:col-span-1 space-y-2 border-r border-slate-800/50 pr-4" id="sidebar-navigation">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 block mb-3">
                Circular Workspaces
              </span>

              {user?.role === "SELLER" && (
                <button
                  onClick={() => setActiveTab("seller_console")}
                  className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                    activeTab === "seller_console" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                  id="sidebar-btn-seller"
                >
                  <Layout className="w-4 h-4" />
                  <span>Declare Waste Batch</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab("marketplace")}
                className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                  activeTab === "marketplace" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
                id="sidebar-btn-marketplace"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>B2B Scrap Marketplace</span>
              </button>

              <button
                onClick={() => setActiveTab("chat_inbox")}
                className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                  activeTab === "chat_inbox" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
                id="sidebar-btn-chat"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Negotiations & Chat</span>
              </button>

              <button
                onClick={() => setActiveTab("bids_activities")}
                className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                  activeTab === "bids_activities" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
                id="sidebar-btn-bids"
              >
                <Mail className="w-4 h-4" />
                <span>Quotation Bids ({bids.length})</span>
              </button>

              {user?.role === "EPR" && (
                <button
                  onClick={() => setActiveTab("epr_compliance")}
                  className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                    activeTab === "epr_compliance" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                  id="sidebar-btn-epr"
                >
                  <Shield className="w-4 h-4" />
                  <span>EPR Compliance Center</span>
                </button>
              )}

              {user?.role === "ADMIN" && (
                <button
                  onClick={() => setActiveTab("admin_suite")}
                  className={`w-full text-left font-bold px-3 py-2.5 text-xs rounded-xl flex items-center gap-3 transition cursor-pointer ${
                    activeTab === "admin_suite" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                  id="sidebar-btn-admin"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Administrative Suite</span>
                </button>
              )}

              <div className="pt-6 mt-6 border-t border-slate-900">
                <button
                  onClick={() => setViewMode("landing")}
                  className="w-full text-left text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Public Landing Page</span>
                </button>
              </div>
            </nav>

            {/* Dynamic Stage Viewport */}
            <main className="lg:col-span-3 min-h-[480px]" id="dynamic-viewport-stage">
              <AnimatePresence mode="wait">
                {activeTab === "seller_console" && user?.role === "SELLER" && (
                  <motion.div key="seller_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <SellerView user={user} showToast={showToast} onRefresh={pullPlatformData} />
                  </motion.div>
                )}

                {activeTab === "marketplace" && user && (
                  <motion.div key="marketplace_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <BuyerView 
                      user={user} 
                      showToast={showToast} 
                      listings={listings} 
                      onRefresh={pullPlatformData}
                      openContactPartner={triggerDirectMessagePreset}
                    />
                  </motion.div>
                )}

                {activeTab === "chat_inbox" && user && (
                  <motion.div key="chat_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <InboxView 
                      user={user} 
                      showToast={showToast} 
                      partnerIdPreset={partnerIdPreset}
                      partnerNamePreset={partnerNamePreset}
                      listingIdPreset={listingIdPreset}
                      onClearPreset={() => {
                        setPartnerIdPreset(null);
                        setPartnerNamePreset(null);
                        setListingIdPreset(null);
                      }}
                    />
                  </motion.div>
                )}

                {activeTab === "bids_activities" && (
                  <motion.div key="bids_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-white mb-2">Track B2B Bidding and Quotations</h2>
                      <p className="text-xs text-slate-400 mb-6">Transactions submitted under your listings or purchase proposals made to other traders.</p>

                      {loadingBids ? (
                        <div className="text-center py-10 text-slate-500">Querying transaction pipeline...</div>
                      ) : bids.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">No quotation requests registered yet. Discover lots on the marketplace!</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-[10px] text-slate-500 uppercase bg-slate-950/45">
                              <tr>
                                <th scope="col" className="px-6 py-3 rounded-l-lg">Shipment Details</th>
                                <th scope="col" className="px-6 py-3">Counterparty</th>
                                <th scope="col" className="px-6 py-3">Proposed Terms</th>
                                <th scope="col" className="px-6 py-3">Circularity Status</th>
                                <th scope="col" className="px-6 py-3 rounded-r-lg text-right">Action Gate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {bids.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-850/50">
                                  <td className="px-6 py-4 font-bold text-white">{b.listingTitle}</td>
                                  <td className="px-6 py-4">{b.buyerName} ({b.buyerRole})</td>
                                  <td className="px-6 py-4 text-slate-300 max-w-xs">{b.message}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      b.status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-400" :
                                      b.status === "PENDING" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                                    }`}>
                                      {b.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {b.status === "PENDING" && user?.role === "SELLER" ? (
                                      <div className="flex gap-1.5 justify-end">
                                        <button
                                          onClick={async () => {
                                            try {
                                              await api.updateBidStatus(b.id, "DECLINED");
                                              showToast("Bid declined.", "info");
                                              pullPlatformData();
                                            } catch (e) {
                                              showToast("Failed to process decision", "error");
                                            }
                                          }}
                                          className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded text-[10px] font-bold transition"
                                        >
                                          Decline
                                        </button>
                                        <button
                                          onClick={async () => {
                                            try {
                                              await api.updateBidStatus(b.id, "ACCEPTED");
                                              showToast("Bid accepted successfully!", "success");
                                              pullPlatformData();
                                            } catch (e) {
                                              showToast("Failed to process decision", "error");
                                            }
                                          }}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-bold transition"
                                        >
                                          Accept Bid
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-medium">Logged</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "epr_compliance" && user && (
                  <motion.div key="epr_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <EPrView user={user} listings={listings} showToast={showToast} />
                  </motion.div>
                )}

                {activeTab === "admin_suite" && user?.role === "ADMIN" && (
                  <motion.div key="admin_viewport" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <AdminView user={user} showToast={showToast} onRefresh={pullPlatformData} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL OVERLAY */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <AuthCard
                isModal={true}
                initialMode={authMode}
                initialRole={authRole}
                onSuccess={handleAuthSuccess}
                showToast={showToast}
                onClose={() => setAuthModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GUEST LOT DETAIL MODAL (When visitor clicks on preview listing) */}
      <AnimatePresence>
        {selectedGuestListing && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl border border-stone-200"
            >
              <div className="relative h-56 bg-stone-100">
                <img
                  src={resolveImageUrl(selectedGuestListing.imageUrl)}
                  alt={selectedGuestListing.fabricType}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={handleImageFallback}
                />
                <button
                  onClick={() => setSelectedGuestListing(null)}
                  className="absolute top-4 right-4 bg-white/90 p-1.5 rounded-full text-slate-700 hover:bg-white shadow-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  <span>Saves {selectedGuestListing.carbonSavingsKg} kg CO2e</span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Recyclability Score: {selectedGuestListing.recyclabilityScore}%
                    </span>
                    <span className="text-base font-extrabold text-emerald-700 font-['Poppins',sans-serif]">
                      KES {selectedGuestListing.estimatedPriceKES.toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-2 font-['Poppins',sans-serif]">
                    {selectedGuestListing.fabricType}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {selectedGuestListing.description}
                  </p>
                </div>

                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-stone-200 text-xs text-slate-700 grid grid-cols-2 gap-2">
                  <div>• Material: <strong>{selectedGuestListing.material}</strong></div>
                  <div>• Weight: <strong>{selectedGuestListing.weightKg} Kg</strong></div>
                  <div>• Depot: <strong>{selectedGuestListing.location}</strong></div>
                  <div>• Quantity: <strong>{selectedGuestListing.quantity} bales</strong></div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setSelectedGuestListing(null)}
                    className="flex-1 bg-stone-100 hover:bg-stone-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Back to Feed
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGuestListing(null);
                      handleOpenAuth("signup", "RECYCLER");
                    }}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 font-['Poppins',sans-serif]"
                  >
                    <span>Sign In to Request Lot</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
