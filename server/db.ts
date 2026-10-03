import fs from "fs";
import path from "path";
import { hashPassword } from "./utils/crypto.js";

// Database file path
const DB_FILE = path.join(process.cwd(), "db_data.json");

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "SELLER" | "RECYCLER" | "MANUFACTURER" | "EPR" | "ADMIN";
  verified: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"; // relevant for Recyclers and Manufacturers
  organizationName?: string;
  location?: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName?: string;
  weightKg: number;
  quantity: number;
  location: string;
  imageUrl: string;
  fabricType: string;
  material: string;
  condition: string;
  color: string;
  texture: string;
  recyclabilityScore: number;
  estimatedPriceKES: number;
  confidence: number;
  recommendedIndustries: string[];
  upcyclingIdeas: string[];
  carbonSavingsKg: number;
  description: string;
  status: "PUBLISHED" | "SOLD" | "DRAFT";
  viewsCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  receiverId: string;
  receiverName?: string;
  content: string;
  listingId?: string;
  createdAt: string;
  read: boolean;
}

export interface BuyerRequest {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerRole: string;
  listingId: string;
  listingTitle: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  url?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: string;
  timestamp: string;
}

interface DBStructure {
  users: User[];
  listings: Listing[];
  messages: Message[];
  buyerRequests: BuyerRequest[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

// In-Memory Fallback State in case we run in write-prohibited servers
let dbState: DBStructure = {
  users: [],
  listings: [],
  messages: [],
  buyerRequests: [],
  notifications: [],
  auditLogs: []
};

// Seed Function
function generateSeedData(): DBStructure {
  const users: User[] = [
    {
      id: "u-admin",
      name: "UziLink System Admin",
      email: "admin@uzilink.com",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
      verified: true,
      approvalStatus: "APPROVED",
      organizationName: "UziLink Ltd",
      location: "Nairobi, HQ",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-seller-1",
      name: "David mitumba Trader",
      email: "seller@uzilink.com",
      passwordHash: hashPassword("seller123"),
      role: "SELLER",
      verified: true,
      approvalStatus: "APPROVED",
      organizationName: "Nairobi Mitumba Sorting",
      location: "Gikomba Market, Nairobi",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-recycler-1",
      name: "Green Loop Fiber Recyclers",
      email: "recycler@uzilink.com",
      passwordHash: hashPassword("recycler123"),
      role: "RECYCLER",
      verified: true,
      approvalStatus: "APPROVED",
      organizationName: "Green Loop Textile Solutions",
      location: "Industrial Area, Nairobi",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-manuf-1",
      name: "Rivatex East Africa",
      email: "manufacturer@uzilink.com",
      passwordHash: hashPassword("manufacturer123"),
      role: "MANUFACTURER",
      verified: true,
      approvalStatus: "APPROVED",
      organizationName: "Rivatex Textile Millers",
      location: "Eldoret, Kenya",
      createdAt: new Date().toISOString()
    },
    {
      id: "u-epr-1",
      name: "Joyce Kamau (KEPRO)",
      email: "epr@uzilink.com",
      passwordHash: hashPassword("epr123"),
      role: "EPR",
      verified: true,
      approvalStatus: "APPROVED",
      organizationName: "Kenya Extended Producer Responsibility Org",
      location: "Gigiri, Nairobi",
      createdAt: new Date().toISOString()
    }
  ];

  const listings: Listing[] = [
    {
      id: "list-1",
      sellerId: "u-seller-1",
      sellerName: "David Mitumba Trader",
      weightKg: 450,
      quantity: 9,
      location: "Gikomba Market, Nairobi",
      imageUrl: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600",
      fabricType: "Denim & Twill",
      material: "100% Cotton & Denim Blends",
      condition: "Post-consumer Textile Waste (Sorted)",
      color: "Blue, Teal, Charcoal",
      texture: "Rough, Heavy weave",
      recyclabilityScore: 84,
      estimatedPriceKES: 27500,
      confidence: 94,
      recommendedIndustries: ["Eco-Jeans Manufacturing", "Insulation & Acoustic Panel Production", "Upholstery & Heavy Duty Bags"],
      upcyclingIdeas: ["Denim patchwork tote bags", "Premium recycled denim yarn", "Thermal isolation boards"],
      carbonSavingsKg: 1350,
      description: "Batch of sorted post-consumer denim and denim waste cutouts. Sorted carefully, stripped of metal rivets, buttons, and zippers. Excellent candidate for mechanical recycling back into cotton yarn or high-strength insulation batts.",
      status: "PUBLISHED",
      viewsCount: 24,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "list-2",
      sellerId: "u-seller-1",
      sellerName: "David Mitumba Trader",
      weightKg: 280,
      quantity: 5,
      location: "Nanyuki Sorting Depot",
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600",
      fabricType: "Knit Jersey",
      material: "Polyester-Cotton Blends (60/40)",
      condition: "Pre-consumer Manufacturing Cutting Scraps",
      color: "Multi-color Mixed",
      texture: "Soft, Stretchy",
      recyclabilityScore: 72,
      estimatedPriceKES: 14000,
      confidence: 88,
      recommendedIndustries: ["Wiping rags & industrial absorbents", "Non-woven textile machinery", "Automotive seat stuffing"],
      upcyclingIdeas: ["Mechanically shredded fluff for matresses", "Industrial oil absorption pillows", "Low-cost cleaning wipers"],
      carbonSavingsKg: 620,
      description: "Fresh manufacturing scraps and offcuts of knit jersey sports apparel. Pure dry waste, clean and unwashed. Highly elastic fibers ready for industrial non-woven felt processing or shredding.",
      status: "PUBLISHED",
      viewsCount: 15,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "list-3",
      sellerId: "u-seller-1",
      sellerName: "David Mitumba Trader",
      weightKg: 1200,
      quantity: 24,
      location: "Mombasa Port Warehouse",
      imageUrl: "https://images.unsplash.com/photo-1563161402-8411cf22c882?auto=format&fit=crop&q=80&w=600",
      fabricType: "Synthetic Fleece",
      material: "100% Recycled Polyester (PET)",
      condition: "Bale Waste - Impure Post-consumer",
      color: "Black & Dark Gray",
      texture: "Soft, Fuzzy, Medium Pile",
      recyclabilityScore: 92,
      estimatedPriceKES: 68000,
      confidence: 96,
      recommendedIndustries: ["Fiber-to-fiber polyester spinning", "Carpet and rug manufacturing", "Geotextile fabric weaving"],
      upcyclingIdeas: ["Polyester pellet compounding", "Outdoor insulation blankets", "High-durability geo-membranes"],
      carbonSavingsKg: 4200,
      description: "Bulk post-consumer polar fleece jackets and winter apparel scraps sorted specifically by fiber content. 100% polyester composition supports direct chemical recycling (depolymerization) or mechanical thermal pelletizing.",
      status: "PUBLISHED",
      viewsCount: 8,
      createdAt: new Date().toISOString()
    }
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      senderId: "u-recycler-1",
      senderName: "Green Loop Fiber Recyclers",
      senderRole: "RECYCLER",
      receiverId: "u-seller-1",
      receiverName: "David Mitumba Trader",
      content: "Hello David, we saw your sorted Denim batch (list-1). We are highly interested in buying the entire 450 Kg batch. Do you offer transportation to Gikomba or should we arrange pickup?",
      listingId: "list-1",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    },
    {
      id: "msg-2",
      senderId: "u-seller-1",
      senderName: "David Mitumba Trader",
      senderRole: "SELLER",
      receiverId: "u-recycler-1",
      receiverName: "Green Loop Fiber Recyclers",
      content: "Hi Green Loop! Thanks for reaching out. We standardly offer pickup from our Gikomba depot, but we can arrange delivery for an extra KES 2,500. Let me know if that works for you!",
      listingId: "list-1",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: false
    }
  ];

  const buyerRequests: BuyerRequest[] = [
    {
      id: "req-1",
      buyerId: "u-recycler-1",
      buyerName: "Green Loop Fiber Recyclers",
      buyerRole: "RECYCLER",
      listingId: "list-1",
      listingTitle: "Denim & Twill (450 Kg)",
      message: "Bid submitted for KES 27,500. Standard industrial recycling contract terms requested.",
      status: "PENDING",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: "notif-1",
      userId: "u-seller-1",
      title: "New Bid Received",
      message: "Green Loop Fiber Recyclers requested a quotation for your Denim listing.",
      read: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "notif-2",
      userId: "u-admin",
      title: "New Registration Approval Needed",
      message: "Eco-Weave Mills (Manufacturer) registered and is pending document review.",
      read: false,
      createdAt: new Date().toISOString()
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: "audit-1",
      action: "SYSTEM_START",
      details: "UziLink MVP Database populated and seeded successfully.",
      timestamp: new Date().toISOString()
    }
  ];

  return { users, listings, messages, buyerRequests, notifications, auditLogs };
}

/**
 * Load Database from File or fallback to seeded data
 */
export function lockAndLoadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const p = fs.readFileSync(DB_FILE, "utf-8");
      dbState = JSON.parse(p);
      return dbState;
    } else {
      dbState = generateSeedData();
      saveDB();
      return dbState;
    }
  } catch (e) {
    console.error("DB File read failed. Working on in-memory state", e);
    if (dbState.users.length === 0) {
      dbState = generateSeedData();
    }
    return dbState;
  }
}

/**
 * Save Database back to JSON file
 */
export function saveDB(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (error) {
    console.error("DB write failed. Using in-memory states.", error);
  }
}

// Initial Sync
lockAndLoadDB();

// DB Data Getters & Setters
export const db = {
  getUsers: () => dbState.users,
  addUser: (user: User) => {
    dbState.users.push(user);
    saveDB();
    db.addAuditLog("u-system", "USER_REGISTERED", `New user registered: ${user.name} (${user.email}) as ${user.role}`);
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const idx = dbState.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      dbState.users[idx] = { ...dbState.users[idx], ...updates };
      saveDB();
    }
  },
  
  getListings: () => dbState.listings,
  addListing: (listing: Listing) => {
    dbState.listings.unshift(listing);
    saveDB();
    db.addAuditLog(listing.sellerId, "LISTING_CREATED", `Listing created: ${listing.fabricType} - ${listing.weightKg}Kg`);
  },
  updateListing: (id: string, updates: Partial<Listing>) => {
    const idx = dbState.listings.findIndex((l) => l.id === id);
    if (idx !== -1) {
      dbState.listings[idx] = { ...dbState.listings[idx], ...updates };
      saveDB();
    }
  },
  deleteListing: (id: string) => {
    dbState.listings = dbState.listings.filter((l) => l.id !== id);
    saveDB();
    db.addAuditLog("u-admin", "LISTING_DELETED", `Admin deleted listing with ID: ${id}`);
  },

  getMessages: () => dbState.messages,
  addMessage: (msg: Message) => {
    dbState.messages.push(msg);
    saveDB();
  },
  markMessagesAsRead: (userId: string, senderId: string) => {
    dbState.messages.forEach((m) => {
      if (m.receiverId === userId && m.senderId === senderId) {
        m.read = true;
      }
    });
    saveDB();
  },

  getBuyerRequests: () => dbState.buyerRequests,
  addBuyerRequest: (req: BuyerRequest) => {
    dbState.buyerRequests.unshift(req);
    saveDB();
    db.addAuditLog(req.buyerId, "REQUEST_SUBMITTED", `Submitted purchase request for listing: ${req.listingId}`);
  },
  updateBuyerRequest: (id: string, status: "PENDING" | "ACCEPTED" | "DECLINED") => {
    const req = dbState.buyerRequests.find((r) => r.id === id);
    if (req) {
      req.status = status;
      saveDB();
    }
  },

  getNotifications: () => dbState.notifications,
  addNotification: (notif: Notification) => {
    dbState.notifications.unshift(notif);
    saveDB();
  },
  markNotificationsAsRead: (userId: string) => {
    dbState.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    saveDB();
  },

  getAuditLogs: () => dbState.auditLogs,
  addAuditLog: (userId: string, action: string, details: string) => {
    const user = dbState.users.find((u) => u.id === userId);
    dbState.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userEmail: user?.email || "system",
      action,
      details,
      timestamp: new Date().toISOString()
    });
    // Keep audit logs capped to 500 for performance
    if (dbState.auditLogs.length > 500) {
      dbState.auditLogs = dbState.auditLogs.slice(0, 500);
    }
    saveDB();
  }
};
