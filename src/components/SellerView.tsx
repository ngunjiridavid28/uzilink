import React, { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { ListingItem, UserProfile } from "../types.js";
import { UploadCloud, FileText, Weight, Layers, MapPin, Sparkles, AlertCircle, Heart, FolderPlus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SellerViewProps {
  user: UserProfile;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  onRefresh: () => void;
}

export const SellerView: React.FC<SellerViewProps> = ({ user, showToast, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<"upload" | "mylistings">("upload");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form parameters
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState(user.location || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // AI Auditing parameters
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditedResult, setAuditedResult] = useState<any | null>(null);

  // Sync / load seller listings
  const loadSellerListings = async () => {
    setLoadingListings(true);
    try {
      const response = await api.getListings({ sellerId: user.id });
      setListings(response.listings);
    } catch (e: any) {
      showToast(e.message || "Failed to load your listing portfolio", "error");
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "mylistings") {
      loadSellerListings();
    }
  }, [activeTab]);

  // Image helpers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and Drop helpers
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuditTextile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !quantity || !location) {
      showToast("Please specify the total weight, quantity and base location first", "info");
      return;
    }

    setIsAuditing(true);
    setAuditedResult(null);

    try {
      // Direct base64 parsing
      let b64 = "";
      let mType = "image/jpeg";
      if (imagePreview) {
        const parts = imagePreview.split(",");
        b64 = parts[1] || "";
        const match = parts[0].match(/data:(.*?);/);
        mType = match ? match[1] : "image/jpeg";
      }

      // Automatically trigger backend Gemini analysis
      const response = await api.createListing({
        weightKg: Number(weight),
        quantity: Number(quantity),
        location,
        imageB64: b64,
        mimeType: mType,
        isDraft: true // save as draft first to review AI report
      });

      setAuditedResult(response.listing);
      showToast("AI Textile analysis audit generated successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed during textile audit", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  const handlePublishListing = async () => {
    if (!auditedResult) return;
    try {
      await api.updateListing(auditedResult.id, { status: "PUBLISHED" });
      showToast("Listing published successfully to B2B feed!", "success");
      setAuditedResult(null);
      // reset form
      setWeight("");
      setQuantity("");
      setImageFile(null);
      setImagePreview(null);
      onRefresh();
    } catch (err: any) {
      showToast("Publishing draft failed.", "error");
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await api.deleteListing(id);
      showToast("Listing deleted successfully.", "success");
      setConfirmDeleteId(null);
      loadSellerListings();
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Failed to delete listing", "error");
    }
  };

  return (
    <div className="space-y-6" id="seller-page-wrapper">
      {/* Tab Control */}
      <div className="flex border-b border-slate-800 gap-4" id="seller-navigation-tabs">
        <button
          onClick={() => {
            setActiveTab("upload");
            setAuditedResult(null);
          }}
          className={`pb-3 text-sm font-semibold transition relative ${
            activeTab === "upload" ? "text-teal-400 border-b-2 border-teal-400" : "text-slate-400 hover:text-slate-200"
          }`}
          id="tab-seller-upload"
        >
          Submit Waste Batch
        </button>
        <button
          onClick={() => setActiveTab("mylistings")}
          className={`pb-3 text-sm font-semibold transition relative ${
            activeTab === "mylistings" ? "text-teal-400 border-b-2 border-teal-400" : "text-slate-400 hover:text-slate-200"
          }`}
          id="tab-seller-mylistings"
        >
          My Listings ({listings.length})
        </button>
      </div>

      {activeTab === "upload" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="seller-upload-panel">
          {/* Submission and AI auditing options */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-teal-400" />
              Declare New Scrap Batch
            </h2>
            <p className="text-xs text-slate-400 mb-6">Specify parameters and upload photo. Gemini AI will scan structural fibers, composition and automatically price the batch.</p>

            <form onSubmit={handleAuditTextile} className="space-y-5">
              {/* Drag and Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Textile Waste Image</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    isDragging ? "bg-teal-950/20 border-teal-500" : "border-slate-800 bg-slate-950/50 hover:bg-slate-950/90"
                  }`}
                  id="dropzone-textile"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="textile-image-picker"
                  />
                  <label htmlFor="textile-image-picker" className="cursor-pointer space-y-3 block">
                    {imagePreview ? (
                      <div className="relative max-h-48 mx-auto overflow-hidden rounded-lg border border-slate-800">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-slate-900/80 text-white font-semibold text-[10px] px-2 py-1 rounded-md">
                          Click to swap
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 text-slate-500 mx-auto" />
                        <div className="text-sm font-medium text-slate-300">Drag & drop scrap photo here or <span className="text-teal-400">browse</span></div>
                        <p className="text-[10px] text-slate-500">Supports JPEG, PNG, or WebP. Visual scan automatically estimates materials.</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Grid properties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 block">Total Est Weight (Kg)</label>
                  <div className="relative">
                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 350"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 text-slate-200 text-sm pl-9 pr-3 py-2.5 rounded-xl outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 block">Estimated Package Qty (Bales/Bags)</label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 text-slate-200 text-sm pl-9 pr-3 py-2.5 rounded-xl outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Current Depot Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Gikomba Market, Nairobi"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 text-slate-200 text-sm pl-9 pr-3 py-2.5 rounded-xl outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuditing || !weight || !imagePreview}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-trigger-ai-audit"
              >
                {isAuditing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scanning fabrics with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze with Gemini AI
                  </>
                )}
              </button>
            </form>
          </div>

          {/* AI Auditing output results display panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between" id="seller-ai-results">
            <AnimatePresence mode="wait">
              {isAuditing ? (
                <motion.div
                  key="auditing-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-800 border-t-teal-400 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">AI Structural Audit Active</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Analyzing composition density, estimated fabric fibers, color spectrums, and assessing carbon abatement levels...
                  </p>
                </motion.div>
              ) : auditedResult ? (
                <motion.div
                  key="audit-view"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <span className="bg-teal-500/10 text-teal-300 text-[10px] font-bold tracking-wider px-2 py-1 rounded-md uppercase">
                        Audit Report Details ({auditedResult.confidence}% confidence)
                      </span>
                      <h3 className="text-2xl font-extrabold text-white mt-1.5">{auditedResult.fabricType}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-[10px]">Est Value (KES)</div>
                      <div className="text-xl font-black text-emerald-400">KES {auditedResult.estimatedPriceKES.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Primary Grid metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider">Recyclability</div>
                      <div className="text-lg font-bold text-white mt-1 text-teal-400">{auditedResult.recyclabilityScore}%</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider">CO2 Offsets</div>
                      <div className="text-lg font-bold text-white mt-1 text-emerald-400">-{auditedResult.carbonSavingsKg} kg</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                      <div className="text-slate-500 text-[9px] uppercase tracking-wider">Estimated fiber</div>
                      <div className="text-xs font-bold text-white mt-2 truncate text-blue-400" title={auditedResult.material}>
                        {auditedResult.material.split(" ")[0]}..
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 font-medium text-slate-300 text-sm">
                    <div>
                      <strong className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Observation:</strong>
                      <p className="text-xs leading-relaxed text-slate-200">{auditedResult.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <strong className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Color palette:</strong>
                        <span className="text-xs text-slate-200">{auditedResult.color}</span>
                      </div>
                      <div>
                        <strong className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Structural texture:</strong>
                        <span className="text-xs text-slate-200">{auditedResult.texture}</span>
                      </div>
                    </div>

                    <div>
                      <strong className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Suggested Upcycles:</strong>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {auditedResult.upcyclingIdeas?.map((idea: string, i: number) => (
                          <span key={i} className="bg-slate-950 text-slate-300 text-[10px] px-2 py-1 rounded-md border border-slate-800">
                            {idea}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800 flex gap-3">
                    <button
                      onClick={() => setAuditedResult(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Remake Audit
                    </button>
                    <button
                      onClick={handlePublishListing}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      Publish Listing
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center text-slate-500 space-y-4">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-xs max-w-xs leading-relaxed">
                    Input Weight, Location, and select a scrap photo. Gemini Multimodal Analysis report of chemical composition and valuations will be shown here.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Render list of seller options */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md" id="seller-records-panel">
          <h2 className="text-xl font-bold text-white mb-6">Manage Your Declared Inventory</h2>

          {loadingListings ? (
            <div className="text-center py-12 text-slate-400">Loading listings...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No scrap shipments declared yet. Go to declaration tab to submit your first batch!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-l-lg">Visual</th>
                    <th scope="col" className="px-6 py-3">Fabric Audit</th>
                    <th scope="col" className="px-6 py-3">Weight (Kg)</th>
                    <th scope="col" className="px-6 py-3">Est Valuation</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Created</th>
                    <th scope="col" className="px-6 py-3 rounded-r-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4">
                        <img src={l.imageUrl} className="w-10 h-10 object-cover rounded-lg border border-slate-800" />
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        <div>{l.fabricType}</div>
                        <div className="text-[10px] text-teal-400 font-medium mt-0.5">{l.material}</div>
                      </td>
                      <td className="px-6 py-4">{l.weightKg} Kg ({l.quantity} packages)</td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold">KES {l.estimatedPriceKES?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-400" :
                          l.status === "SOLD" ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-300"
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {confirmDeleteId === l.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-rose-400 font-bold">Delete?</span>
                            <button
                              onClick={() => handleDeleteListing(l.id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded transition cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(l.id)}
                            className="bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-400 hover:text-rose-200 p-1.5 rounded transition cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
