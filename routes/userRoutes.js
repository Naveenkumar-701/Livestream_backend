import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { getProfile, uploadCandidateProfileImage } from "../controllers/userController.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();
/**
 * Upload candidate profile image
 * @route POST /api/candidate/upload-profile-image
 */

router.get("/profile", verifyToken, getProfile);

router.post(
  "/upload-profile-image",
  upload.single("file"),
  uploadCandidateProfileImage
);
export default router;
