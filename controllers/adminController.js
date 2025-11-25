import asyncHandler from "../middleware/asyncHandler.js";
import Organization from "../models/Organization.js";

export const viewUnverifiedOrgs = asyncHandler(async (req, res) => {
  const orgs = await Organization.find({ verified: false })
    .select("name email username docs createdAt");

  res.json({ count: orgs.length, orgs });
});

export const viewOrgDocs = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const org = await Organization.findById(orgId)
    .select("name username email docs verified");

  if (!org) return res.status(404).json({ message: "Organization not found" });

  res.json({ org });
});

export const verifyOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const org = await Organization.findByIdAndUpdate(
    orgId,
    { verified: true, verifiedAt: new Date() },
    { new: true }
  );

  if (!org) return res.status(404).json({ message: "Organization not found" });

  res.json({ message: "Organization verified", org });
});

export const getOrgVerificationStats = asyncHandler(async (req, res) => {
  const [total, verifiedCount, pendingCount] = await Promise.all([
    Organization.countDocuments({}),
    Organization.countDocuments({ verified: true }),
    Organization.countDocuments({ verified: false }),
  ]);

  res.json({
    totalOrganizations: total,
    approvedOrganizations: verifiedCount,
    pendingVerifications: pendingCount,
  });
});