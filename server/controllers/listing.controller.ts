import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { db, Listing } from "../db.js";
import { analyzeTextileImage } from "../services/ai.service.js";

/**
 * Fetch listings with robust marketplace filtering (Material, Weight, Price, Location, Recyclability, Condition)
 */
export async function getListings(req: AuthenticatedRequest, res: Response) {
  try {
    let listings = db.getListings();

    const { material, minWeight, maxWeight, maxPrice, location, minRecyclability, condition, search, sellerId } = req.query;

    if (sellerId) {
      listings = listings.filter((l) => l.sellerId === String(sellerId));
    } else {
      // By default query only published listings for buyers
      listings = listings.filter((l) => l.status === "PUBLISHED" || l.status === "SOLD");
    }

    if (material) {
      const matStr = String(material).toLowerCase();
      listings = listings.filter((l) => l.material.toLowerCase().includes(matStr) || l.fabricType.toLowerCase().includes(matStr));
    }

    if (minWeight) {
      listings = listings.filter((l) => l.weightKg >= Number(minWeight));
    }
    
    if (maxWeight) {
      listings = listings.filter((l) => l.weightKg <= Number(maxWeight));
    }

    if (maxPrice) {
      listings = listings.filter((l) => l.estimatedPriceKES <= Number(maxPrice));
    }

    if (location) {
      const locStr = String(location).toLowerCase();
      listings = listings.filter((l) => l.location.toLowerCase().includes(locStr));
    }

    if (minRecyclability) {
      listings = listings.filter((l) => l.recyclabilityScore >= Number(minRecyclability));
    }

    if (condition) {
      const condStr = String(condition).toLowerCase();
      listings = listings.filter((l) => l.condition.toLowerCase().includes(condStr));
    }

    if (search) {
      const query = String(search).toLowerCase();
      listings = listings.filter(
        (l) =>
          l.material.toLowerCase().includes(query) ||
          l.fabricType.toLowerCase().includes(query) ||
          l.description.toLowerCase().includes(query) ||
          l.location.toLowerCase().includes(query)
      );
    }

    return res.json({ listings });
  } catch (error) {
    return res.status(500).json({ message: "Failed to query Listings database" });
  }
}

/**
 * Retrieve one listing details & increments view count
 */
export async function getListingById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const listings = db.getListings();
    const lIdx = listings.findIndex((l) => l.id === id);

    if (lIdx === -1) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const listing = listings[lIdx];
    // Increment views safely
    db.updateListing(id, { viewsCount: (listing.viewsCount || 0) + 1 });

    return res.json({ listing: db.getListings()[lIdx] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load listing details" });
  }
}

/**
 * Create listing (Supports automated AI fabric audit from base64 uploaded image)
 */
export async function createListing(req: AuthenticatedRequest, res: Response) {
  try {
    const { weightKg, quantity, location, imageB64, mimeType, isDraft } = req.body;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (!weightKg || !quantity || !location) {
      return res.status(400).json({ message: "Weight, quantity, and location are mandatory" });
    }

    let fabricDetails = {
      fabricType: "Unsorted Textiles",
      material: "Mixed synthetic & natural blends",
      condition: "Post-consumer sorted apparel bails",
      color: "Assorted multi-color bails",
      texture: "Variable fiber mix",
      recyclabilityScore: 50,
      estimatedPriceKES: Math.round(Number(weightKg) * 80), // ~80 KES per Kg fallback
      confidence: 60,
      recommendedIndustries: ["Industrial wiping rags", "Felt and non-woven mechanical shredding"],
      upcyclingIdeas: ["Coarse felt sheets", "Acoustic insulation batts"],
      carbonSavingsKg: Math.round(Number(weightKg) * 2.8),
      description: "Textile shipment waste waiting for full visual sorting and mechanical classification."
    };

    let defaultImg = "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600"; // fallback

    // If active image base64 has been provided by Seller, we automatically audit it using our Gemini AI integration!
    if (imageB64) {
      try {
        console.log("Analyzing uploaded textile image with Gemini...");
        const aiResult = await analyzeTextileImage(imageB64, mimeType || "image/jpeg", Number(weightKg), location);
        fabricDetails = {
          ...fabricDetails,
          ...aiResult
        };
        // Use uploaded base64 data directly as listing image to save space and display beautifully
        defaultImg = `data:${mimeType || "image/jpeg"};base64,${imageB64}`;
      } catch (aiErr) {
        console.error("Automated AI fabric analysis failed, using high-quality mock engine.", aiErr);
      }
    }

    const newListing: Listing = {
      id: `list-${Date.now()}`,
      sellerId: req.user.id,
      sellerName: req.user.name,
      weightKg: Number(weightKg),
      quantity: Number(quantity),
      location: String(location),
      imageUrl: defaultImg,
      fabricType: fabricDetails.fabricType,
      material: fabricDetails.material,
      condition: fabricDetails.condition,
      color: fabricDetails.color,
      texture: fabricDetails.texture,
      recyclabilityScore: fabricDetails.recyclabilityScore,
      estimatedPriceKES: fabricDetails.estimatedPriceKES || Math.round(Number(weightKg) * 100),
      confidence: fabricDetails.confidence,
      recommendedIndustries: fabricDetails.recommendedIndustries,
      upcyclingIdeas: fabricDetails.upcyclingIdeas,
      carbonSavingsKg: fabricDetails.carbonSavingsKg,
      description: fabricDetails.description,
      status: isDraft ? "DRAFT" : "PUBLISHED",
      viewsCount: 0,
      createdAt: new Date().toISOString()
    };

    db.addListing(newListing);

    // Notify recyclers when high-recyclability items are published
    if (!isDraft && newListing.recyclabilityScore >= 75) {
      db.getUsers().forEach((user) => {
        if (user.role === "RECYCLER") {
          db.addNotification({
            id: `notif-${Date.now()}`,
            userId: user.id,
            title: "High-Recyclability Listing Alert",
            message: `New high Score (${newListing.recyclabilityScore}%) denim/twill waste listing uploaded in ${newListing.location}.`,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    return res.status(201).json({
      message: "Listing created successfully",
      listing: newListing
    });
  } catch (error) {
    console.error("Listing creation endpoint failed:", error);
    return res.status(500).json({ message: "Failed to create listing" });
  }
}

/**
 * Update listing parameters
 */
export async function updateListing(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const l = db.getListings().find((item) => item.id === id);

    if (!l) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (l.sellerId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: You are not the owner of this listing" });
    }

    db.updateListing(id, req.body);
    return res.json({ message: "Listing updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update listing parameters" });
  }
}

/**
 * Buyer purchase or quotation request
 */
export async function requestQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { listingId, message } = req.body;

    if (!listingId || !message) {
      return res.status(400).json({ message: "Please enter quotation details and bid terms" });
    }

    const listing = db.getListings().find((l) => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const newRequest = {
      id: `req-${Date.now()}`,
      buyerId: req.user!.id,
      buyerName: req.user!.name,
      buyerRole: req.user!.role,
      listingId,
      listingTitle: `${listing.fabricType} (${listing.weightKg} Kg)`,
      message,
      status: "PENDING" as const,
      createdAt: new Date().toISOString()
    };

    db.addBuyerRequest(newRequest);

    // Send notification to seller
    db.addNotification({
      id: `notif-${Date.now()}`,
      userId: listing.sellerId,
      title: "New Quotation Requested",
      message: `${req.user!.name} (Buyer) requested a quotation on your listing: ${listing.fabricType}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Automatically create first chat message thread
    db.addMessage({
      id: `msg-auto-${Date.now()}`,
      senderId: req.user!.id,
      senderName: req.user!.name,
      senderRole: req.user!.role,
      receiverId: listing.sellerId,
      receiverName: listing.sellerName || "Seller",
      content: `[Quotation Bid Request]: ${message}`,
      listingId,
      createdAt: new Date().toISOString(),
      read: false
    });

    return res.status(201).json({
      message: "Quotation request delivered to seller successfully",
      request: newRequest
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit quotation request" });
  }
}

/**
 * List quotation requests for active user
 */
export async function getBuyerRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const allReqs = db.getBuyerRequests();
    let filtered;
    
    if (req.user!.role === "SELLER") {
      // Find requests for listings owned by this seller
      const sellerListingIds = db.getListings()
        .filter((l) => l.sellerId === req.user!.id)
        .map((l) => l.id);
      
      filtered = allReqs.filter((r) => sellerListingIds.includes(r.listingId));
    } else {
      // Return requests made by this buyer
      filtered = allReqs.filter((r) => r.buyerId === req.user!.id);
    }

    return res.json({ requests: filtered });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch buyer quotation list" });
  }
}

/**
 * Moderate / Accept or Decline Quotation
 */
export async function updateRequestStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'DECLINED'

    if (status !== "ACCEPTED" && status !== "DECLINED") {
      return res.status(400).json({ message: "Invalid request status" });
    }

    const r = db.getBuyerRequests().find((reqItem) => reqItem.id === id);
    if (!r) {
      return res.status(404).json({ message: "Quotation request not found" });
    }

    db.updateBuyerRequest(id, status);

    // If accepted, we can mock transition listing status to SOLD!
    if (status === "ACCEPTED") {
      db.updateListing(r.listingId, { status: "SOLD" });
    }

    // Notify buyer
    db.addNotification({
      id: `notif-${Date.now()}`,
      userId: r.buyerId,
      title: `Bid Request ${status === "ACCEPTED" ? "Approved!" : "Declined"}`,
      message: `The seller updated your bid on ${r.listingTitle} to: ${status}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    return res.json({ message: `Bid request state updated to: ${status} successfully.` });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update quotation decision" });
  }
}

/**
 * Delete a listing (by owner or admin)
 */
export async function deleteListing(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const l = db.getListings().find((item) => item.id === id);

    if (!l) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (l.sellerId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete this listing" });
    }

    db.deleteListing(id);
    return res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete listing" });
  }
}
