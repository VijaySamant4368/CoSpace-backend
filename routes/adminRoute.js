import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import {
  viewUnverifiedOrgs,
  viewOrgDocs,
  verifyOrganization
} from "../controllers/adminController.js";

const router = Router();

router.get("/orgs/unverified", protect, adminOnly, viewUnverifiedOrgs);
router.get("/orgs/:orgId/docs", protect, adminOnly, viewOrgDocs);
router.patch("/orgs/:orgId/verify", protect, adminOnly, verifyOrganization);

export default router;
