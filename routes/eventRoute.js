import express from "express";
import multer from "multer";
import {createEvent,updateEvent,deleteEvent,listEvents,getEventById,getEventsByOrg} from "../controllers/eventController.js";
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: "temp/" }); // saves to /temp first

router.get("/", listEvents);
router.get("/:id", getEventById);
router.get("/org/:orgId", getEventsByOrg);

router.post("/create", protect, upload.single("image"), createEvent);
router.put("/update/:id", protect, upload.single("image"), updateEvent);
router.delete("/:id", protect, deleteEvent);

export default router;
