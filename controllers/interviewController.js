
// // backend/controllers/testInterview.js

// import TestInterview from "../models/testinterview.js";
// import axios from 'axios';
// import { EgressClient } from "livekit-server-sdk";

// export const getInterviewQuestions = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const interview = await TestInterview.findById(id)
//             .select("questionsList job_title job_desc")
//             .lean();

//         if (!interview) {
//             return res.status(404).json({ ok: false, message: "Interview not found" });
//         }

//         // Transform questions to include follow-ups properly
//         const transformedQuestions = interview.questionsList.map(q => ({
//             _id: q._id,
//             question: q.question,
//             quesType: q.quesType,
//             programming_language: q.programming_language,
//             follow_up_questions: q.follow_up_questions || [],
//             section: q.section,
//             duration: q.duration
//         }));

//         return res.json({
//             ok: true,
//             job_title: interview.job_title,
//             job_desc: interview.job_desc,
//             questions: transformedQuestions
//         });

//     } catch (err) {
//         console.error("Get Questions Error:", err);
//         return res.status(500).json({ ok: false, message: "Server Error" });
//     }
// };


// export const generateAIFollowUp = async (req, res) => {
//     try {
//         const {
//             interviewId,
//             questionId,
//             answer,
//             questionType,
//             language = "",
//             followUpIndex = 0,
//             followupResponse = [],
//             timings = {},
//             employerTesting = false,
//             schedule_id = ""
//         } = req.body;

//         const { startTime, endTime } = timings;

//         console.log("📥 AI Follow-up Request:", {
//             interviewId,
//             questionId,
//             answerLength: answer?.length,
//             questionType,
//             language,
//             followUpIndex,
//             followupResponseCount: followupResponse?.length,
//             employerTesting,
//             schedule_id,
//             timings: {
//                 startTime,
//                 endTime
//             }

//         });

//         // Get question text if available
//         const questionText = req.body.questionText || "";

//         // Check if this is an introduction/general question
//         const isIntroductionQuestion = questionText.toLowerCase().includes('yourself') ||
//             questionText.toLowerCase().includes('introduce') ||
//             questionText.toLowerCase().includes('about you');

//         if (isIntroductionQuestion) {
//             console.log("🚫 Introduction question - skipping follow-ups");
//             return res.json({
//                 ok: true,
//                 followUpQuestion: null,
//                 message: "Introduction question - no follow-ups generated"
//             });
//         }

//         const interview = await TestInterview.findById(interviewId)
//             .select("questionsList job_title complexity experience skills")
//             .lean();

//         if (!interview) {
//             return res.status(404).json({
//                 ok: false,
//                 message: "Interview not found"
//             });
//         }

//         // Check if answer is valid
//         const hasValidAnswer = answer && answer.trim() !== "";

//         if (!hasValidAnswer) {
//             console.log("❌ No valid answer - skipping follow-up");
//             return res.json({
//                 ok: true,
//                 followUpQuestion: null,
//                 message: "No follow-up generated - empty answer"
//             });
//         }

//         // Process followupResponse array
//         let conversation = [];

//         // CRITICAL FIX: Build conversation from followupResponse
//         if (Array.isArray(followupResponse) && followupResponse.length > 0) {
//             // Use the followupResponse array as is (it should already have parent + previous follow-ups)
//             conversation = followupResponse.map(item => ({
//                 question: item.question,
//                 candiAnswer: item.candiAnswer,
//                 quesType: item.quesType,
//                 language: item.language,
//                 followUpIndex: item.followUpIndex,
//                 timestamp: item.timestamp || new Date().toISOString()
//             }));

//             console.log(`📝 Using existing conversation from followupResponse (${conversation.length} items)`);
//         } else {
//             // If no followupResponse, start with parent
//             console.log("🎯 Starting new conversation with parent");
//             conversation = [{
//                 question: questionText,
//                 candiAnswer: answer.trim(),
//                 quesType: questionType,
//                 language: questionType === "coding" ? language : null,
//                 followUpIndex: 0,
//                 timestamp: new Date().toISOString()
//             }];
//         }

//         // Add current answer to conversation if not already present
//         const currentIndex = conversation.findIndex(item => item.followUpIndex === followUpIndex);
//         if (currentIndex === -1) {
//             // Add as new item
//             conversation.push({
//                 question: questionText,
//                 candiAnswer: answer.trim(),
//                 quesType: questionType,
//                 language: questionType === "coding" ? language : null,
//                 followUpIndex: followUpIndex,
//                 timings: {
//                     startTime,
//                     endTime
//                 },
//                 timestamp: new Date().toISOString()
//             });
//             console.log(`Added follow-up ${followUpIndex} to conversation`);
//         } else {
//             // Update existing
//             conversation[currentIndex] = {
//                 ...conversation[currentIndex],
//                 candiAnswer: answer.trim(),
//                 timings: {
//                     startTime,
//                     endTime
//                 },
//                 timestamp: new Date().toISOString()
//             };
//             console.log(`🔄 Updated follow-up ${followUpIndex} in conversation`);
//         }

//         // Sort conversation by followUpIndex
//         conversation.sort((a, b) => a.followUpIndex - b.followUpIndex);

//         // Log the conversation structure
//         console.log("📊 Current Conversation Structure:");
//         console.log(`Total items: ${conversation.length}`);
//         conversation.forEach((item, idx) => {
//             const type = item.followUpIndex === 0 ? 'PARENT' : `FOLLOW-UP ${item.followUpIndex}`;
//             console.log(`  [${idx}] ${type}:`);
//             console.log(`      Q: ${item.question?.substring(0, 60)}...`);
//             console.log(`      A: ${item.candiAnswer?.substring(0, 60)}...`);
//             console.log(`      Type: ${item.quesType}, Lang: ${item.language || 'N/A'}`);
//         });

//         // ========== CRITICAL FIX: Change from 2 to 3 ==========
//         // Check if we should generate another follow-up
//         // followUpIndex values: parent=0, follow-up1=1, follow-up2=2, follow-up3=3
//         // We want to stop AFTER follow-up 3, so check if followUpIndex >= 3
//         if (followUpIndex >= 3) { // CHANGED FROM 2 TO 3
//             console.log("✅ Maximum 3 follow-ups reached for this parent question");
//             return res.json({
//                 ok: true,
//                 followUpQuestion: null,
//                 followSts: "false",
//                 conversation: conversation,
//                 message: "Maximum follow-ups reached"
//             });
//         }
//         // ========== END CRITICAL FIX ==========

//         // Determine which AI API to use based on conversation content
//         const firstIsCoding = conversation.length > 0 && conversation[0].quesType === "coding";
//         let apiUrl;

//         if (questionType === "coding" || firstIsCoding) {
//             apiUrl = "https://tivzgnlnhqyqndrs3wlb6ekqem0joqpy.lambda-url.ap-south-1.on.aws/";
//         } else if (conversation.length < 3) {
//             apiUrl = "https://nl3rhpawmzf2otzlso2uehmxma0voanp.lambda-url.ap-south-1.on.aws/";
//         } else {
//             apiUrl = "https://x5xlubxolfop4rm7pkmtz5pb4a0kpxss.lambda-url.ap-south-1.on.aws/";
//         }

//         console.log("🔗 Using API:", apiUrl);

//         // Prepare payload for AI - send ALL conversation items
//         let payload;
//         if (questionType === "coding" || firstIsCoding) {
//             payload = {
//                 conversation: conversation.map(item => ({
//                     question: item.question,
//                     answer: item.candiAnswer || item.answer,
//                     quesType: item.quesType,
//                     language: item.language
//                 })),
//                 Complexity_Level: interview.complexity || "Intermediate",
//                 Experience_Range: interview.experience || "2-5 years",
//                 Domain_Context: interview.skills || "Software Development",
//                 type: questionType,
//                 role: interview.job_title,
//                 Language: language,
//                 Focus_Weights: {
//                     reasoning: 0.2,
//                     complexity: 0.1,
//                     edge_cases: 0.15,
//                     testing: 0.15,
//                     security: 0.05,
//                     maintainability: 0.1,
//                     architecture: 0.05,
//                     data_structures: 0.15,
//                     libraries: 0.025,
//                     authorship_verification: 0.05,
//                 },
//             };
//         } else {
//             payload = {
//                 conversation: conversation.map(item => ({
//                     question: item.question,
//                     answer: item.candiAnswer || item.answer,
//                     quesType: item.quesType
//                 })),
//                 complexity: interview.complexity || "Intermediate",
//                 experience: interview.experience || "2-5 years",
//                 language: interview.skills || "Software Development",
//                 type: questionType,
//                 role: interview.job_title,
//             };
//         }

//         console.log("📤 Payload to AI API - Conversation items:", conversation.length);

//         // Call AI API
//         const response = await axios.post(apiUrl, payload);
//         console.log("🤖 AI Response:", response?.data);

//         let followUpQuestion = null;
//         let followSts = "false";

//         if (response.data?.question) {
//             // Determine next follow-up index
//             const nextFollowUpIndex = followUpIndex + 1;

//             // Determine follow-up question type
//             let followUpQuestionType = questionType;
//             if (conversation.length > 0 && conversation[0].quesType === "coding") {
//                 // Alternate between theoretical and coding
//                 if (nextFollowUpIndex === 1) {
//                     followUpQuestionType = "theoretical";
//                 } else if (nextFollowUpIndex === 2) {
//                     followUpQuestionType = "coding";
//                 } else if (nextFollowUpIndex === 3) {
//                     followUpQuestionType = "theoretical";
//                 }
//             }

//             followUpQuestion = {
//                 question: response.data.question,
//                 idealAnswer: response.data.idealAnswer || "",
//                 quesType: followUpQuestionType,
//                 duration: 3,
//                 language: language,
//                 followUpIndex: nextFollowUpIndex, // This will be 1, 2, or 3
//                 isAIGenerated: true
//             };

//             followSts = "true";

//             console.log(`✅ Generated follow-up ${nextFollowUpIndex} (${followUpQuestionType})`);
//             console.log(`   Question: ${followUpQuestion.question.substring(0, 80)}...`);
//         }

//         return res.json({
//             ok: true,
//             followUpQuestion,
//             followSts,
//             conversation: conversation,
//             message: followUpQuestion ? `Follow-up ${followUpIndex + 1} generated` : "No follow-up generated"
//         });

//     } catch (error) {
//         console.error("❌ AI Follow-up Error:", error);
//         return res.status(500).json({
//             ok: false,
//             message: "Failed to generate AI follow-up"
//         });
//     }
// };


// // COMMON UNIVERSAL FUNCTION FOR UPDATING INTERVIEW STATUS
// export const updateInterviewStatus = async (req, res) => {
//     try {
//         const { interviewId, interviewStatus } = req.body;

//         console.log("📥 Received Status Update Request:", req.body);

//         if (!interviewId || !interviewStatus) {
//             console.log("❌ Missing fields:", req.body);
//             return res.status(400).json({
//                 ok: false,
//                 message: "interviewId and interviewStatus are required"
//             });
//         }

//         // Status update object
//         const updateData = { interviewStatus };

//         if (interviewStatus === "started") {
//             updateData.interviewStarted = new Date();
//             console.log("⏳ Interview marked as STARTED");
//         }

//         if (interviewStatus === "completed") {
//             updateData.interviewCompleted = new Date();
//             console.log("🏁 Interview marked as COMPLETED");
//         }

//         // Update Database
//         const updated = await TestInterview.findByIdAndUpdate(
//             interviewId,
//             updateData,
//             { new: true }
//         );

//         console.log("✅ DB Updated Successfully:", {
//             id: interviewId,
//             status: updated.interviewStatus,
//             started: updated.interviewStarted,
//             completed: updated.interviewCompleted
//         });

//         return res.json({
//             ok: true,
//             message: `Interview status updated to ${interviewStatus}`,
//             data: updated
//         });

//     } catch (error) {
//         console.error("🔥 Backend Error (updateInterviewStatus):", error);
//         return res.status(500).json({
//             ok: false,
//             message: "Server error while updating status"
//         });
//     }
// };


// export const saveInterviewEvent = async (req, res) => {
//     try {
//         const {
//             interviewId,
//             interviewType = true,
//             interviewStatus,
//             byEmployer = true,
//             currentQuestionId = null,
//             reason = "",
//             candidateInterivew = false
//         } = req.body;

//         console.log("📥 Interruption Event Received:", req.body);

//         if (!interviewId || !interviewStatus || !reason) {
//             return res.status(400).json({
//                 ok: false,
//                 message: "interviewId, interviewStatus, and reason are required"
//             });
//         }

//         const payload = {
//             interviewType,
//             interviewStatus,
//             byEmployer,
//             currentQuestionId,
//             reason,
//             candidateInterivew,
//             eventTime: new Date()
//         };

//         await TestInterview.findByIdAndUpdate(
//             interviewId,
//             { $push: { interruptions: payload } }
//         );

//         console.log("✅ Interruption saved:", payload);

//         if (reason === "window_closed") {
//             console.log("🛑 Window closed — auto-finalizing interview");

//             await TestInterview.findByIdAndUpdate(interviewId, {
//                 status: "completed",
//                 completed: new Date()
//             });

//             console.log("✅ Auto-finalize complete for interview:", interviewId);
//         }

//         return res.json({
//             ok: true,
//             message: "Interruption recorded",
//             data: payload
//         });

//     } catch (err) {
//         console.error("❌ saveInterviewEvent Error:", err);
//         return res.status(500).json({
//             ok: false,
//             message: "Internal Server Error"
//         });
//     }
// };


// //// finalize answer for close tab


// export const finalizeInterview = async (req, res) => {
//     try {

//         const { interviewId, egressId, question, answer, timestamp, vodPlaylistUrl } = req.body;

//         console.log("📥 Finalize Interview Triggered:", req.body);

//         if (!interviewId) {
//             console.warn("⚠️ finalizeInterview called without interviewId");
//             return res.status(400).json({ ok: false, message: "interviewId required" });
//         }

//         //  Store the last answer in DB (optional but recommended)
//         try {
//             await TestInterview.updateOne(
//                 { _id: interviewId },
//                 {
//                     $push: {
//                         autoSavedAnswers: {
//                             question: question || "",
//                             answer: answer || "",
//                             timestamp: timestamp || Date.now()
//                         }
//                     }
//                 }
//             );
//             console.log("💾 Last answer saved into autoSavedAnswers");
//         } catch (err) {
//             console.log("⚠️ DB save failed (autoSavedAnswers):", err.message);
//         }

//         try {
//             if (vodPlaylistUrl) {

//                 const cleanedUrl = String(vodPlaylistUrl).trim();
//                 await TestInterview.updateOne(
//                     { _id: interviewId },
//                     { $set: { finalVideoUrl: cleanedUrl } }
//                 );

//                 const updatedDoc = await TestInterview.findById(interviewId).select("finalVideoUrl").lean();
//                 console.log("🎥 Saved finalVideoUrl in DB:", updatedDoc?.finalVideoUrl);
//             } else {
//                 console.log("⚠️ No vodPlaylistUrl provided — skipping video save");
//             }
//         } catch (err) {
//             console.error("❌ Error saving finalVideoUrl to DB:", err.message);
//         }

//         if (egressId) {
//             try {
//                 const client = new EgressClient(
//                     process.env.LIVEKIT_HOST,
//                     process.env.LIVEKIT_API_KEY,
//                     process.env.LIVEKIT_API_SECRET
//                 );

//                 const resp = await client.stopEgress(egressId);
//                 console.log("🛑 Egress stopped via finalize:", resp.status);
//             } catch (err) {
//                 if (err && err.code === "failed_precondition") {
//                     console.log("⚠️ Egress already stopped earlier");
//                 } else {
//                     console.error("❌ Error stopping egress:", err?.message || err);
//                 }
//             }
//         } else {
//             console.log(" No egressId provided in finalize request");
//         }

//         return res.json({ ok: true });
//     } catch (err) {
//         console.error("❌ finalizeInterview error:", err);
//         return res.status(500).json({ ok: false });
//     }
// };


















// backend/controllers/testInterview.js

import mongoose from "mongoose";
import TestInterview from "../models/testinterview.js";
import axios from 'axios';
import { EgressClient } from "livekit-server-sdk";

export const getInterviewQuestions = async (req, res) => {
    try {
        const { id } = req.params;

        const interview = await TestInterview.findById(id)
            .select("questionsList job_title job_desc")
            .lean();

        if (!interview) {
            return res.status(404).json({ ok: false, message: "Interview not found" });
        }

        // Transform questions to include follow-ups properly
        const transformedQuestions = interview.questionsList.map(q => ({
            _id: q._id,
            question: q.question,
            quesType: q.quesType,
            programming_language: q.programming_language,
            follow_up_questions: q.follow_up_questions || [],
            section: q.section,
            duration: q.duration
        }));

        return res.json({
            ok: true,
            job_title: interview.job_title,
            job_desc: interview.job_desc,
            questions: transformedQuestions
        });

    } catch (err) {
        console.error("Get Questions Error:", err);
        return res.status(500).json({ ok: false, message: "Server Error" });
    }
};


export const generateAIFollowUp = async (req, res) => {
    try {
        const {
            interviewId,
            questionId,
            answer,
            questionType,
            language = "",
            followUpIndex = 0,
            followupResponse = [],
            timings = {},
            employerTesting = false,
            schedule_id = ""
        } = req.body;

        const { startTime, endTime } = timings;

        console.log("📥 AI Follow-up Request:", {
            interviewId,
            questionId,
            answerLength: answer?.length,
            questionType,
            language,
            followUpIndex,
            followupResponseCount: followupResponse?.length,
            employerTesting,
            schedule_id,
            timings: {
                startTime,
                endTime
            }

        });

        // Get question text if available
        const questionText = req.body.questionText || "";

        // Check if this is an introduction/general question
        const isIntroductionQuestion = questionText.toLowerCase().includes('yourself') ||
            questionText.toLowerCase().includes('introduce') ||
            questionText.toLowerCase().includes('about you');

        if (isIntroductionQuestion) {
            console.log("🚫 Introduction question - skipping follow-ups");
            return res.json({
                ok: true,
                followUpQuestion: null,
                message: "Introduction question - no follow-ups generated"
            });
        }

        // const interview = await TestInterview.findById(interviewId)
        //     .select("questionsList job_title complexity experience skills")
        //     .lean();

        const result = await TestInterview.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(interviewId)
                }
            },
            {
                $lookup: {
                    from: "companyinterviews", // 🔴 collection name (check plural!)
                    localField: "interviewId",
                    foreignField: "_id",
                    as: "companyInterview"
                }
            },
            {
                $unwind: {
                    path: "$companyInterview",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    questionsList: 1,
                    job_title: 1,
                    complexity: 1,
                    experience: 1,
                    skills: 1,
                    interview_type: "$companyInterview.interview_type"
                }
            }
        ]);

        const interview = result[0];

        if (!interview) {
            console.log("❌ TestInterview not found for ID:", interviewId);
            return res.status(404).json({
                ok: false,
                message: "Interview not found"
            });
        }

        console.log("🏷 BACKEND interview_type:", interview.interview_type);

        console.log("🏢 Company Interview Type:", interview?.interview_type);


        if (!interview) {
            return res.status(404).json({
                ok: false,
                message: "Interview not found"
            });
        }

        // Check if answer is valid
        const hasValidAnswer = answer && answer.trim() !== "";

        if (!hasValidAnswer) {
            console.log("❌ No valid answer - skipping follow-up");
            return res.json({
                ok: true,
                followUpQuestion: null,
                message: "No follow-up generated - empty answer"
            });
        }

        // Process followupResponse array
        let conversation = [];

        // CRITICAL FIX: Build conversation from followupResponse
        if (Array.isArray(followupResponse) && followupResponse.length > 0) {
            // Use the followupResponse array as is (it should already have parent + previous follow-ups)
            conversation = followupResponse.map(item => ({
                question: item.question,
                candiAnswer: item.candiAnswer,
                quesType: item.quesType,
                language: item.language,
                followUpIndex: item.followUpIndex,
                timestamp: item.timestamp || new Date().toISOString()
            }));

            console.log(`📝 Using existing conversation from followupResponse (${conversation.length} items)`);
        } else {
            // If no followupResponse, start with parent
            console.log("🎯 Starting new conversation with parent");
            conversation = [{
                question: questionText,
                candiAnswer: answer.trim(),
                quesType: questionType,
                language: questionType === "coding" ? language : null,
                followUpIndex: 0,
                timestamp: new Date().toISOString()
            }];
        }

        // Add current answer to conversation if not already present
        const currentIndex = conversation.findIndex(item => item.followUpIndex === followUpIndex);
        if (currentIndex === -1) {
            // Add as new item
            conversation.push({
                question: questionText,
                candiAnswer: answer.trim(),
                quesType: questionType,
                language: questionType === "coding" ? language : null,
                followUpIndex: followUpIndex,
                timings: {
                    startTime,
                    endTime
                },
                timestamp: new Date().toISOString()
            });
            console.log(`Added follow-up ${followUpIndex} to conversation`);
        } else {
            // Update existing
            conversation[currentIndex] = {
                ...conversation[currentIndex],
                candiAnswer: answer.trim(),
                timings: {
                    startTime,
                    endTime
                },
                timestamp: new Date().toISOString()
            };
            console.log(`🔄 Updated follow-up ${followUpIndex} in conversation`);
        }

        // Sort conversation by followUpIndex
        conversation.sort((a, b) => a.followUpIndex - b.followUpIndex);

        // Log the conversation structure
        console.log("📊 Current Conversation Structure:");
        console.log(`Total items: ${conversation.length}`);
        conversation.forEach((item, idx) => {
            const type = item.followUpIndex === 0 ? 'PARENT' : `FOLLOW-UP ${item.followUpIndex}`;
            console.log(`  [${idx}] ${type}:`);
            console.log(`      Q: ${item.question?.substring(0, 60)}...`);
            console.log(`      A: ${item.candiAnswer?.substring(0, 60)}...`);
            console.log(`      Type: ${item.quesType}, Lang: ${item.language || 'N/A'}`);
        });

        // ========== CRITICAL FIX: Change from 2 to 3 ==========
        // Check if we should generate another follow-up
        // followUpIndex values: parent=0, follow-up1=1, follow-up2=2, follow-up3=3
        // We want to stop AFTER follow-up 3, so check if followUpIndex >= 3
        const maxFollowUps =
            interview?.interview_type === "screening" ? 1 : 3;

        console.log("🔢 Max Follow-ups Allowed:", maxFollowUps);

        if (followUpIndex >= maxFollowUps) {
            console.log(`✅ Max follow-ups reached (${maxFollowUps})`);
            return res.json({
                ok: true,
                followUpQuestion: null,
                followSts: "false",
                conversation,
                maxFollowUps,
                interview_type: interview.interview_type || "unknown",
                message: "Maximum follow-ups reached"
            });
        }

        // ========== END CRITICAL FIX ==========

        // Determine which AI API to use based on conversation content
        const firstIsCoding = conversation.length > 0 && conversation[0].quesType === "coding";
        let apiUrl;

        if (questionType === "coding" || firstIsCoding) {
            apiUrl = "https://tivzgnlnhqyqndrs3wlb6ekqem0joqpy.lambda-url.ap-south-1.on.aws/";
        } else if (conversation.length < 3) {
            apiUrl = "https://nl3rhpawmzf2otzlso2uehmxma0voanp.lambda-url.ap-south-1.on.aws/";
        } else {
            apiUrl = "https://x5xlubxolfop4rm7pkmtz5pb4a0kpxss.lambda-url.ap-south-1.on.aws/";
        }

        console.log("🔗 Using API:", apiUrl);

        // Prepare payload for AI - send ALL conversation items
        let payload;
        if (questionType === "coding" || firstIsCoding) {
            payload = {
                conversation: conversation.map(item => ({
                    question: item.question,
                    answer: item.candiAnswer || item.answer,
                    quesType: item.quesType,
                    language: item.language
                })),
                Complexity_Level: interview.complexity || "Intermediate",
                Experience_Range: interview.experience || "2-5 years",
                Domain_Context: interview.skills || "Software Development",
                type: questionType,
                role: interview.job_title,
                Language: language,
                Focus_Weights: {
                    reasoning: 0.2,
                    complexity: 0.1,
                    edge_cases: 0.15,
                    testing: 0.15,
                    security: 0.05,
                    maintainability: 0.1,
                    architecture: 0.05,
                    data_structures: 0.15,
                    libraries: 0.025,
                    authorship_verification: 0.05,
                },
            };
        } else {
            payload = {
                conversation: conversation.map(item => ({
                    question: item.question,
                    answer: item.candiAnswer || item.answer,
                    quesType: item.quesType
                })),
                complexity: interview.complexity || "Intermediate",
                experience: interview.experience || "2-5 years",
                language: interview.skills || "Software Development",
                type: questionType,
                role: interview.job_title,
            };
        }

        console.log("📤 Payload to AI API - Conversation items:", conversation.length);

        // Call AI API
        const response = await axios.post(apiUrl, payload);
        console.log("🤖 AI Response:", response?.data);

        let followUpQuestion = null;
        let followSts = "false";

        if (response.data?.question) {
            // Determine next follow-up index
            const nextFollowUpIndex = followUpIndex + 1;

            if (nextFollowUpIndex > maxFollowUps) {
                console.log("🚫 Follow-up exceeds allowed limit");
                return res.json({
                    ok: true,
                    followUpQuestion: null,
                    followSts: "false",
                    conversation,
                    maxFollowUps
                });
            }


            // Determine follow-up question type
            let followUpQuestionType = questionType;
            if (conversation.length > 0 && conversation[0].quesType === "coding") {
                // Alternate between theoretical and coding
                if (nextFollowUpIndex === 1) {
                    followUpQuestionType = "theoretical";
                } else if (nextFollowUpIndex === 2) {
                    followUpQuestionType = "coding";
                } else if (nextFollowUpIndex === 3) {
                    followUpQuestionType = "theoretical";
                }
            }

            followUpQuestion = {
                question: response.data.question,
                idealAnswer: response.data.idealAnswer || "",
                quesType: followUpQuestionType,
                duration: 3,
                language: language,
                followUpIndex: nextFollowUpIndex, // This will be 1, 2, or 3
                isAIGenerated: true
            };

            followSts = "true";

            console.log(`✅ Generated follow-up ${nextFollowUpIndex} (${followUpQuestionType})`);
            console.log(`   Question: ${followUpQuestion.question.substring(0, 80)}...`);
        }

        return res.json({
            ok: true,
            followUpQuestion,
            followSts,
            conversation,
            maxFollowUps,
            interview_type: interview.interview_type || "unknown",
            message: followUpQuestion
                ? `Follow-up ${followUpIndex + 1} generated`
                : "No follow-up generated"
        });


    } catch (error) {
        console.error("❌ AI Follow-up Error:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to generate AI follow-up"
        });
    }
};


// COMMON UNIVERSAL FUNCTION FOR UPDATING INTERVIEW STATUS
export const updateInterviewStatus = async (req, res) => {
    try {
        const { interviewId, interviewStatus } = req.body;

        console.log("📥 Received Status Update Request:", req.body);

        if (!interviewId || !interviewStatus) {
            console.log("❌ Missing fields:", req.body);
            return res.status(400).json({
                ok: false,
                message: "interviewId and interviewStatus are required"
            });
        }

        // Status update object
        const updateData = { interviewStatus };

        if (interviewStatus === "started") {
            updateData.interviewStarted = new Date();
            console.log("⏳ Interview marked as STARTED");
        }

        if (interviewStatus === "completed") {
            updateData.interviewCompleted = new Date();
            console.log("🏁 Interview marked as COMPLETED");
        }

        // Update Database
        const updated = await TestInterview.findByIdAndUpdate(
            interviewId,
            updateData,
            { new: true }
        );

        console.log("✅ DB Updated Successfully:", {
            id: interviewId,
            status: updated.interviewStatus,
            started: updated.interviewStarted,
            completed: updated.interviewCompleted
        });

        return res.json({
            ok: true,
            message: `Interview status updated to ${interviewStatus}`,
            data: updated
        });

    } catch (error) {
        console.error("🔥 Backend Error (updateInterviewStatus):", error);
        return res.status(500).json({
            ok: false,
            message: "Server error while updating status"
        });
    }
};


export const saveInterviewEvent = async (req, res) => {
    try {
        const {
            interviewId,
            interviewType = true,
            interviewStatus,
            byEmployer = true,
            currentQuestionId = null,
            reason = "",
            candidateInterivew = false
        } = req.body;

        console.log("📥 Interruption Event Received:", req.body);

        if (!interviewId || !interviewStatus || !reason) {
            return res.status(400).json({
                ok: false,
                message: "interviewId, interviewStatus, and reason are required"
            });
        }

        const payload = {
            interviewType,
            interviewStatus,
            byEmployer,
            currentQuestionId,
            reason,
            candidateInterivew,
            eventTime: new Date()
        };

        await TestInterview.findByIdAndUpdate(
            interviewId,
            { $push: { interruptions: payload } }
        );

        console.log("✅ Interruption saved:", payload);

        if (reason === "window_closed") {
            console.log("🛑 Window closed — auto-finalizing interview");

            await TestInterview.findByIdAndUpdate(interviewId, {
                status: "completed",
                completed: new Date()
            });

            console.log("✅ Auto-finalize complete for interview:", interviewId);
        }

        return res.json({
            ok: true,
            message: "Interruption recorded",
            data: payload
        });

    } catch (err) {
        console.error("❌ saveInterviewEvent Error:", err);
        return res.status(500).json({
            ok: false,
            message: "Internal Server Error"
        });
    }
};


//// finalize answer for close tab


export const finalizeInterview = async (req, res) => {
    try {

        const { interviewId, egressId, question, answer, timestamp, vodPlaylistUrl } = req.body;

        console.log("📥 Finalize Interview Triggered:", req.body);

        if (!interviewId) {
            console.warn("⚠️ finalizeInterview called without interviewId");
            return res.status(400).json({ ok: false, message: "interviewId required" });
        }

        //  Store the last answer in DB (optional but recommended)
        try {
            await TestInterview.updateOne(
                { _id: interviewId },
                {
                    $push: {
                        autoSavedAnswers: {
                            question: question || "",
                            answer: answer || "",
                            timestamp: timestamp || Date.now()
                        }
                    }
                }
            );
            console.log("💾 Last answer saved into autoSavedAnswers");
        } catch (err) {
            console.log("⚠️ DB save failed (autoSavedAnswers):", err.message);
        }

        try {
            if (vodPlaylistUrl) {

                const cleanedUrl = String(vodPlaylistUrl).trim();
                await TestInterview.updateOne(
                    { _id: interviewId },
                    { $set: { finalVideoUrl: cleanedUrl } }
                );

                const updatedDoc = await TestInterview.findById(interviewId).select("finalVideoUrl").lean();
                console.log("🎥 Saved finalVideoUrl in DB:", updatedDoc?.finalVideoUrl);
            } else {
                console.log("⚠️ No vodPlaylistUrl provided — skipping video save");
            }
        } catch (err) {
            console.error("❌ Error saving finalVideoUrl to DB:", err.message);
        }

        if (egressId) {
            try {
                const client = new EgressClient(
                    process.env.LIVEKIT_HOST,
                    process.env.LIVEKIT_API_KEY,
                    process.env.LIVEKIT_API_SECRET
                );

                const resp = await client.stopEgress(egressId);
                console.log("🛑 Egress stopped via finalize:", resp.status);
            } catch (err) {
                if (err && err.code === "failed_precondition") {
                    console.log("⚠️ Egress already stopped earlier");
                } else {
                    console.error("❌ Error stopping egress:", err?.message || err);
                }
            }
        } else {
            console.log(" No egressId provided in finalize request");
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error("❌ finalizeInterview error:", err);
        return res.status(500).json({ ok: false });
    }
};

// Save answer in db as structure

export const saveInterviewAnswersStructured = async (req, res) => {
    try {
        const { interviewId, answers } = req.body;

        if (!interviewId || !Array.isArray(answers)) {
            return res.status(400).json({ ok: false });
        }

        const interview = await TestInterview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ ok: false });
        }

        // Group answers by parent question
        const grouped = {};

        for (const a of answers) {
            if (!grouped[a.questionId]) {
                grouped[a.questionId] = [];
            }
            grouped[a.questionId].push(a);
        }

        // Process each question
        interview.questionsList.forEach((q) => {
            const qAnswers = grouped[q._id.toString()];
            if (!qAnswers) return;

            // sort by followUpIndex
            qAnswers.sort((a, b) => a.followUpIndex - b.followUpIndex);

            q.follow_up_questions = q.follow_up_questions || [];

            qAnswers.forEach((ans) => {
                if (ans.followUpIndex === 0) {
                    // ✅ Parent answer
                    q.answer = ans.candiAnswer;
                    q.timings = {
                        startTime: ans.startTime,
                        endTime: ans.endTime,
                    };
                } else {
                    // ✅ Follow-up answers
                    q.follow_up_questions.push({
                        question: ans.question,
                        answer: ans.candiAnswer,
                        timings: {
                            startTime: ans.startTime,
                            endTime: ans.endTime,
                        },
                    });
                }
            });
        });

        interview.submitted = new Date();
        interview.interviewStatus = "completed";

        await interview.save();

        console.log("✅ Structured interview answers saved");

        res.json({ ok: true });
    } catch (err) {
        console.error("❌ saveInterviewAnswersStructured:", err);
        res.status(500).json({ ok: false });
    }
};

