import { Router } from "express";
import { 
  getListings, 
  getListingById, 
  createListing, 
  updateListing, 
  deleteListing,
  requestQuotation, 
  getBuyerRequests, 
  updateRequestStatus 
} from "../controllers/listing.controller.js";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, getListings);
router.get("/bids", requireAuth, getBuyerRequests);
router.get("/:id", optionalAuth, getListingById);
router.post("/", requireAuth, requireRole(["SELLER", "ADMIN"]), createListing);
router.post("/quotation", requireAuth, requireRole(["RECYCLER", "MANUFACTURER", "ADMIN"]), requestQuotation);
router.patch("/bids/:id", requireAuth, requireRole(["SELLER", "ADMIN"]), updateRequestStatus);
router.patch("/:id", requireAuth, updateListing);
router.delete("/:id", requireAuth, deleteListing);

export default router;
