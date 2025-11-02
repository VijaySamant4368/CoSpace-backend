import express from "express";

import {createEvent,updateEvent,deleteEvent,listEvents,getEventById,getEventsByOrg} from "../controllers/eventController.js";
import { protect } from '../middleware/auth.js';
import { upload } from "../utils/upload.js";

const router = express.Router();

router.get("/", listEvents);
router.get("/:id", getEventById);
router.get("/org/:orgId", getEventsByOrg);

router.post("/create", protect, upload.single("image"), createEvent);
router.put("/update/:id", protect, upload.single("image"), updateEvent);
router.delete("/:id", protect, deleteEvent);

export default router;
