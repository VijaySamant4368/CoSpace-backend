import { v2 as cloudinary } from "cloudinary";
import { uploadDocument } from "../utils/document.js"; // Same as your existing uploadDocument utility
import asyncHandler from "../middleware/asyncHandler.js";
import Organization from "../models/Organization.js";

export const submitOrgDocs = asyncHandler(async (req, res) => {
  const { actor } = req;

  if (!actor || actor.type !== "org") {
    return res.status(403).json({ message: "Only organizations can submit documents" });
  }

  const org = await Organization.findById(actor.id);
  if (!org) return res.status(404).json({ message: "Organization not found" });

  const files = req.files || {};

  async function processDoc(fieldName) {
    const f = files[fieldName]?.[0];
    if (!f) return null;

    const url = await uploadDocument(f);  // This function should now handle in-memory uploads
    return url;
  }

  const regCert = await processDoc("registrationCertificate");
  const taxCert = await processDoc("taxExemptionCertificate");
  const legalId = await processDoc("legalIdentification");

  if (regCert) org.docs.registrationCertificate = regCert;
  if (taxCert) org.docs.taxExemptionCertificate = taxCert;
  if (legalId) org.docs.legalIdentification = legalId;

  // submitting docs resets verification requirement
  org.verified = false;
  org.verifiedAt = null;

  await org.save();

  res.json({
    message: "Documents submitted",
    docs: org.docs,
    verified: org.verified
  });
});
