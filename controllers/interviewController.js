// import TestInterview from "../models/testinterview.js";

// export const getInterviewQuestions = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const interview = await TestInterview.findById(id)
//             .select("questionsList job_title job_desc")
//             .lean();

//         if (!interview) {
//             return res.status(404).json({ ok: false, message: "Interview not found" });
//         }

//         return res.json({
//             ok: true,
//             job_title: interview.job_title,
//             job_desc: interview.job_desc,
//             questions: interview.questionsList
//         });

//     } catch (err) {
//         console.error("Get Questions Error:", err);
//         return res.status(500).json({ ok: false, message: "Server Error" });
//     }
// };



// backend/controllers/testInterview.js

import TestInterview from "../models/testinterview.js";
import axios from 'axios';

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
            language = "javascript",
            followUpIndex = 0,
            followupResponse = []
        } = req.body;

        console.log("📥 AI Follow-up Request:", {
            interviewId,
            questionId,
            answerLength: answer?.length,
            questionType,
            language,
            followUpIndex,
            followupResponse: followupResponse
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

        const interview = await TestInterview.findById(interviewId)
            .select("questionsList job_title complexity experience skills")
            .lean();

        if (!interview) {
            return res.status(404).json({
                ok: false,
                message: "Interview not found"
            });
        }

        // Check if answer is valid
        const hasValidAnswer = answer && answer.trim() !== "";

        // Maximum 3 follow-ups per question
        if (!hasValidAnswer || followUpIndex >= 3) {
            console.log("❌ No valid answer or max follow-ups reached");
            return res.json({
                ok: true,
                followUpQuestion: null,
                message: "No follow-up generated"
            });
        }

        // Process followupResponse array (similar to friend's logic)
        let conversation = [];

        // Filter out empty responses and keep valid ones
        if (Array.isArray(followupResponse)) {
            conversation = followupResponse.filter(item => {
                // Keep only items with valid candidate answers
                return item &&
                    item.candiAnswer &&
                    item.candiAnswer.trim() !== "";
            });

            // If last item has empty answer, remove it
            if (conversation.length > 0) {
                const lastItem = conversation[conversation.length - 1];
                if (!lastItem.candiAnswer || lastItem.candiAnswer.trim() === "") {
                    conversation.pop();
                }
            }
        }

        // Add current Q&A to conversation (formatted like friend's structure)
        const newConversationItem = {
            question: questionText,
            candiAnswer: answer.trim(),
            quesType: questionType,
            language: questionType === "coding" ? language : null,
            timestamp: new Date().toISOString(),
            followUpIndex: followUpIndex
        };

        // Check if we should clear conversation array based on your criteria
        const shouldClearConversation =
            conversation.length > 3 ||
            (conversation.length > 0 &&
                conversation[conversation.length - 1].candiAnswer === "");

        if (shouldClearConversation) {
            console.log("🧹 Clearing conversation array - length > 3 or empty last answer");
            conversation = [newConversationItem]; // Start fresh with current item
        } else {
            conversation.push(newConversationItem);
        }

        // Keep only last 3 conversations for context
        if (conversation.length > 3) {
            conversation = conversation.slice(-3);
        }

        console.log("📝 Processed Conversation:", conversation.length, "items");
        conversation.forEach((item, idx) => {
            console.log(`  ${idx + 1}. Q: ${item.question?.substring(0, 50)}...`);
            console.log(`     A: ${item.candiAnswer?.substring(0, 50)}...`);
        });

        // Determine which AI API to use (same logic as friend's code)
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

        // Prepare payload based on question type
        let payload;
        if (questionType === "coding" || firstIsCoding) {
            payload = {
                conversation: conversation.map(item => ({
                    question: item.question,
                    answer: item.candiAnswer,
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
                    answer: item.candiAnswer,
                    quesType: item.quesType
                })),
                complexity: interview.complexity || "Intermediate",
                experience: interview.experience || "2-5 years",
                language: interview.skills || "Software Development",
                type: questionType,
                role: interview.job_title,
            };
        }

        // Log payload for debugging
        console.log("📤 Payload to AI API:", JSON.stringify(payload, null, 2));

        // Call AI API
        const response = await axios.post(apiUrl, payload);
        console.log("🤖 AI Response:", response?.data);

        let followUpQuestion = null;
        let followSts = "false";

        if (response.data?.question) {
            // Determine follow-up question type based on index (same logic as friend's code)
            let followUpQuestionType = questionType;
            if (conversation.length > 0 && conversation[0].quesType === "coding") {
                if (followUpIndex === 0) {
                    followUpQuestionType = "theoretical";
                } else if (followUpIndex === 1) {
                    followUpQuestionType = "coding";
                } else if (followUpIndex === 2) {
                    followUpQuestionType = "theoretical";
                }
            }

            followUpQuestion = {
                question: response.data.question,
                idealAnswer: response.data.idealAnswer || "",
                quesType: followUpQuestionType,
                duration: 3,
                language: language,
                followUpIndex: followUpIndex + 1,
                isAIGenerated: true
            };

            followSts = "true";
        }

        return res.json({
            ok: true,
            followUpQuestion,
            followSts,
            conversation: conversation, // Return processed conversation for frontend
            message: followUpQuestion ? "AI follow-up generated" : "No follow-up generated"
        });

    } catch (error) {
        console.error("❌ AI Follow-up Error:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to generate AI follow-up"
        });
    }
};