export type UserRole = "SELLER" | "RECYCLER" | "MANUFACTURER" | "EPR" | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  verified: boolean;
  organizationName?: string;
  location?: string;
  createdAt?: string;
}

export interface ListingItem {
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

export interface DirectMessage {
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

export interface ChatThread {
  lastMessage: DirectMessage;
  partnerId: string;
  partnerName: string;
}

export interface BuyerRequestItem {
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

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  url?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminAnalyticsReport {
  totalWeightKg: number;
  solvedWeightKg: number;
  totalCarbonSavedKg: number;
  totalKESValue: number;
  userCount: number;
  roleStats: {
    SELLER: number;
    RECYCLER: number;
    MANUFACTURER: number;
    EPR: number;
    ADMIN: number;
  };
  pendingReviewCount: number;
  recentLogs: AuditLogItem[];
}
