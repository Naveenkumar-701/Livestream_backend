// import Form from "../models/lea_preview_modal.js";


// export const createForm = async (req, res) => {
//     try {
//         const { fullName, workEmail, phoneNumber, organizationName } = req.body;


//         if (!fullName || !workEmail || !phoneNumber || !organizationName) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please fill all required fields.",
//                 missingFields: {
//                     fullName: !fullName ? "Full Name is required" : null,
//                     workEmail: !workEmail ? "Work Email is required" : null,
//                     phoneNumber: !phoneNumber ? "Phone Number is required" : null,
//                     organizationName: !organizationName
//                         ? "Organization Name is required"
//                         : null,
//                 },
//             });
//         }


//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(workEmail)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid email format. Please enter a valid work email.",
//             });
//         }


//         const phoneRegex = /^[0-9]{10}$/;
//         if (!phoneRegex.test(phoneNumber)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid phone number. It should contain 10 digits.",
//             });
//         }


//         const newForm = await Form.create({
//             fullName,
//             workEmail,
//             phoneNumber,
//             organizationName,
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Form submitted successfully!",
//             data: newForm,
//         });
//     } catch (err) {
//         console.error("Error saving form:", err);
//         return res
//             .status(500)
//             .json({ success: false, message: "Internal Server Error" });
//     }
// };

// // ✅ Get all forms (for admin/debug)
// export const getForms = async (req, res) => {
//     try {
//         const forms = await Form.find().sort({ createdAt: -1 });
//         return res.status(200).json({ success: true, data: forms });
//     } catch (err) {
//         console.error("Error fetching forms:", err);
//         return res
//             .status(500)
//             .json({ success: false, message: "Internal Server Error" });
//     }
// };







import Form from "../models/lea_preview_modal.js";
import { sendAdminNotification } from "../utils/sendEmail.js";

export const createForm = async (req, res) => {
    try {
        const { fullName, workEmail, phoneNumber, organizationName } = req.body;

        // validations
        if (!fullName || !workEmail || !phoneNumber || !organizationName) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields.",
                missingFields: {
                    fullName: !fullName ? "Full Name is required" : null,
                    workEmail: !workEmail ? "Work Email is required" : null,
                    phoneNumber: !phoneNumber ? "Phone Number is required" : null,
                    organizationName: !organizationName ? "Organization Name is required" : null,
                },
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(workEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format. Please enter a valid work email.",
            });
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number. It should contain 10 digits.",
            });
        }

        // save to DB
        const newForm = await Form.create({
            fullName,
            workEmail,
            phoneNumber,
            organizationName,
        });

        // try sending email (don't fail the API if email fails)
        sendAdminNotification({ fullName, workEmail, phoneNumber, organizationName })
            .then(() => {
                console.log("Admin email sent");
            })
            .catch((e) => {
                console.error("Failed to send admin email:", e?.response?.body || e.message);
            });

        return res.status(201).json({
            success: true,
            message: "Form submitted successfully!",
            data: newForm,
        });
    } catch (err) {
        console.error("Error saving form:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getForms = async (req, res) => {
    try {
        const forms = await Form.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: forms });
    } catch (err) {
        console.error("Error fetching forms:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
