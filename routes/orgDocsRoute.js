import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { uploadDocs } from "../utils/uploadDocs.js";
import { submitOrgDocs } from "../controllers/orgDocsController.js";

const router = Router();

router.post(
  "/submit",
  protect,
  uploadDocs.fields([
    { name: "registrationCertificate", maxCount: 1 },
    { name: "taxExemptionCertificate", maxCount: 1 },
    { name: "legalIdentification", maxCount: 1 }
  ]),
  submitOrgDocs
);

export default router;
