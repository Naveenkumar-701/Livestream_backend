import Users from "../models/Users.js";
import { uploadFile } from "../utils/helpers.js";

export const getProfile = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    res.status(200).json({
      message: "Profile fetched successfully",
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// export const uploadCandidateProfileImage = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({ message: "id is required" });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "No file uploaded" });
//     }

//     if (!req.file.mimetype.startsWith("image/")) {
//       return res.status(400).json({ message: "Only image files are allowed" });
//     }

//     const key = `userProfile/${id}/${Date.now()}_${req.file.originalname}`;

//     const uploaded = await uploadFile(req.file, key);

//     const updatedCandidate = await Users.findByIdAndUpdate(
//       id,
//       {
//         profpicFileLocation: {
//           photo: uploaded.key,
//           photoName: uploaded.name,
//         },
//       },
//       { new: true }
//     );

//     if (!updatedCandidate) {
//       return res.status(404).json({ message: "Candidate not found" });
//     }

//     return res.status(200).json({
//       message: "Profile image uploaded successfully",
//       profileImage: updatedCandidate.profpicFileLocation,
//     });
//   } catch (error) {
//     console.error("Upload profile image error:", error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };

export const uploadCandidateProfileImage = async (req, res) => {
  try {
    console.log("👉 PARAM ID:", req.params.id);
    console.log("👉 REQ FILE:", req.file);   // ⭐ MOST IMPORTANT
    console.log("👉 REQ BODY:", req.body);   // optional

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }

    const key = `userProfile/${id}/${Date.now()}_${req.file.originalname}`;

    const uploaded = await uploadFile(req.file, key);

    const updatedCandidate = await Users.findByIdAndUpdate(
      id,
      {
        profpicFileLocation: {
          photo: uploaded.key,
          photoName: uploaded.name,
        },
      },
      { new: true }
    );

    if (!updatedCandidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    return res.status(200).json({
      message: "Profile image uploaded successfully",
      profileImage: updatedCandidate.profpicFileLocation,
    });
  } catch (error) {
    console.error("❌ Upload profile image error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


