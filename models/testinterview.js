import mongoose from "mongoose";

const testinterviewSchema = new mongoose.Schema(
    {
        interviewerId: [
            {
                id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                isLead: { type: Boolean, default: false },
            },
        ],

        selectedResult: [
            {
                selectedType: { type: Boolean, default: false },
                selectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "shareduser" },
            },
        ],

        candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        college: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
        employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        selectedClients: [],

        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "companyinterview",
        },

        isLive: { type: Boolean, default: false },

        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

        submitted: { type: Date },

        isInterviewExpired: { type: Boolean, default: false },

        /* ---------------------- FIXED BLOCK #1 ---------------------- */
        similarQuestions: [
            {
                questionId: {
                    type: String,
                    default: "",
                },
                lists: [
                    {
                        question: {
                            type: String,
                            default: "",
                        },
                        duration: {
                            type: Number,
                            default: 3,
                        },
                        type: {
                            type: String,
                            default: "",
                        },
                        answer: {
                            type: String,
                            default: "",
                        },
                    },
                ],
            },
        ],

        /* ---------------------- FIXED BLOCK #2 ---------------------- */
        questionsList: [
            {
                question: {
                    type: String,
                    default: "",
                },
                duration: {
                    type: Number,
                    default: 3,
                },
                type: {
                    type: String,
                    default: "",
                },
                answer: {
                    type: String,
                    default: "",
                },
                language: {
                    type: String,
                    default: "",
                },
                timings: {
                    startTime: { type: String, default: "" },
                    endTime: { type: String, default: "" },
                },
                section: {
                    type: String,
                    default: "",
                },
                codedAnswer: {
                    type: String,
                    default: "",
                },
                fileKey: {
                    type: String,
                    default: "",
                },
                lineCount: {
                    type: Number,
                    default: 0,
                },
                interrputedReason: { type: [String], default: [] },

                follow_up_questions: [
                    {
                        timings: {
                            startTime: { type: String, default: "" },
                            endTime: { type: String, default: "" },
                        },
                        interrputedReason: { type: [String], default: [] },
                    },
                ],
            },
        ],

        /* ---------------------- FIXED BLOCK #3 ---------------------- */
        multiQuestionsList: [
            {
                question: {
                    type: String,
                    default: "",
                },
                duration: {
                    type: Number,
                    default: 3,
                },
                type: {
                    type: String,
                    default: "",
                },
                answer: {
                    type: String,
                    default: "",
                },
                timings: {
                    startTime: { type: String, default: "" },
                    endTime: { type: String, default: "" },
                },
                section: {
                    type: String,
                    default: "",
                },
                lineCount: {
                    type: Number,
                    default: 0,
                },

                follow_up_questions: [
                    {
                        timings: {
                            startTime: { type: String, default: "" },
                            endTime: { type: String, default: "" },
                        },
                    },
                ],
            },
        ],

        /* ---------------------- REST unchanged ---------------------- */

        checkInstructions: { type: Boolean, default: false },
        checkCameraTest: { type: Boolean, default: false },

        job_title: { type: String },
        job_desc: { type: String },
        experience: { type: Number },

        status: { type: String, default: "not conducted" },

        tenMinSmsD: { type: Boolean, default: false },
        tenMinSmsS: { type: Boolean, default: false },

        TestvideoData: { type: String },
        TeststreamId: { type: String },
        streamId: { type: String },

        unconpercent: { type: String },
        Testunconpercent: { type: String },
        uncondata: { type: Array },

        AIScore: { type: Number, default: 0 },
        final_overall_score: { type: Number, default: 0 },

        speech_rate: { type: String },
        mean_pitch: { type: String },
        sentiment_score: { type: String },
        grammar_score: { type: String },

        words_per_minute: { type: String },
        Voice_pitch: { type: String },

        TestsimilarList: [],
        similarList: [],
        Testrecfedlist: [],

        interviewStatus: { type: String, default: "not started" },

        testAttempts: { type: Number, default: 0 },
        realWinAttempts: { type: Number, default: 0 },

        testTranscribe: { type: String },
        realTranscribe: { type: String },

        intruptedType: { type: String },
        interviewType: { type: String },

        personalityscore: { type: String },
        commskillscore: { type: String },

        techscore: { type: Number, default: 0 },

        reportSentToEmployer: { type: Boolean, default: false },

        firstFree: { type: Boolean },
        referedSecond: { type: Boolean },
        interviewCreated: { type: Boolean },
        paid: { type: Boolean },

        answerList: { type: Array },
        subscribed: { type: Boolean, default: false },

        Speaker_attitude: { type: String },
        Longest_Pause: { type: Number, default: 0 },

        Grammatical_Errors_per_100_words: { type: Number, default: 0 },

        False_starts: {
            Repetitions: { type: Number, default: 0 },
            Revisions: { type: Number, default: 0 },
            "Word Fragments": { type: Number, default: 0 },
            "Interrupted Utterance": { type: Number, default: 0 },
            "Broken Utterance": { type: Number, default: 0 },
        },

        Variety_of_sentence_structures: {
            simple_count: { type: Number, default: 0 },
            compound_count: { type: Number, default: 0 },
            complex_count: { type: Number, default: 0 },
            compound_complex_count: { type: Number, default: 0 },
        },

        Fluency_and_coherence_score: { type: Number, default: 0 },
        Lexical_resource_score: { type: Number, default: 0 },
        Pronounciation_score: { type: Number, default: 0 },
        Grammatical_Range_and_Accuracy_score: { type: Number, default: 0 },
        Overall_score: { type: Number, default: 0 },

        byEmployer: { type: Boolean },
        deactivated: { type: Boolean },

        "Fluency-and_coherence": {
            Strengths: [],
            Area_of_Improvement: [],
            Actionable_recommendations: [],
        },

        Lexical_Resource: {
            Strengths: [],
            Area_of_Improvement: [],
            Actionable_recommendations: [],
        },

        Grammatical_Range_and_Accuracy: {
            Strengths: [],
            Area_of_Improvement: [],
            Actionable_recommendations: [],
        },

        Pronunciation: {
            Strengths: [],
            Area_of_Improvement: [],
            Actionable_recommendations: [],
        },

        "Overall Recommendation": {
            Strengths: [],
            Area_of_Improvement: [],
            Actionable_recommendations: [],
        },

        comments: [
            {
                comment: { type: String, default: "" },
                user: { type: mongoose.Schema.Types.ObjectId, ref: "shareduser" },
                read: { default: false, type: Boolean },
                date: { type: Date, default: Date.now },
            },
        ],

        overAllWeaknesses: [],
        overAllStrengths: [],
        skills: [],

        twetyfrwp: { type: Boolean },
        fortyetwp: { type: Boolean },
        seventytwp: { type: Boolean },
        halfhrwp: { type: Boolean },

        dueDate: { type: Date },
        expireExtnd: { type: Boolean, default: false },

        screenShare: { type: Boolean, default: false },
        resumeBased: { type: Boolean },

        isProgrammingRelated: {
            type: String,
            enum: ["yes", "no"],
        },

        programming_language: { type: String },

        candidateSummary: { type: String },
        candidateSummaryLanguage: { type: String },

        technical_skill_feedback_language: { type: String },
        technical_skill_feedback: { type: String },

        roleFit: { type: String, maxlength: 15 },

        question_type: { type: Array },

        self_interview: { type: Boolean, default: false },
        followUp: { type: Boolean, default: false },
        assisted: { type: Boolean, default: false },

        interviewActivityLog: {
            candidateLogin: { type: Date, default: null },
            candidateUser: { type: String, default: null },

            employerLogin: { type: Date, default: null },
            employerUser: { type: String, default: null },

            employerInterviewSubmit: { type: Date, default: null },
            employerSubmitUser: { type: String, default: null },
        },

        inviteUrl: { type: String },

        stageConfig: { type: Object },
        tokenConfig: { type: Object },
        scrntokenConfig: { type: Object },
        emptokenConfig: { type: Object },
        compoConfig: { type: Object },

        assistquestionsList: { type: Array },

        interviewStarted: { type: Date },

        multiLanguage: { type: Boolean, default: false },
        candidatesDueDate: { type: String },
        employerInformed: { type: Boolean, default: false },

        leaBlue: { type: Boolean, default: false },

        streamIdstart: { type: String },
        streamvideoData: { type: String },
        finalVideoUrl: { type: String, default: "" },


        email_status: { type: Boolean, default: false },
        calender_id: { type: String, default: "" },
        cvKey: { type: String, default: "" },

        comm_proficiency_level: { type: String },
        comm_overall_summary: { type: String },

        claudeCost: { type: String },

        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
        timeZone: { type: String, default: "" },

        strengency: { type: String, default: "Moderate" },

        priorityPercentage: { type: Number, default: 0 },
        mandatoryPercentage: { type: Number, default: 0 },
        niceToHavePercentage: { type: Number, default: 0 },

        mandatorySkills: { type: Array },
        prioritySkills: { type: Array },
        niceSkills: { type: Array },

        deleteRequestedAt: { type: Date, default: null },
        isDeleted: { type: Boolean, default: false },

        viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        enableCheckInterrupt: { type: Boolean, default: true },
        interruptedStatus: { type: Boolean, default: false },

        question_version: { type: Number, default: 0 },
        interrupted: { type: Boolean, default: false },

        isCalling: { type: Boolean, default: false },
        leaCallingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LeaCalling",
            default: null,
        },

        leacalling: { type: Boolean, default: false },
        leaMcq: { type: Boolean, default: false },

        allProject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "allProjects",
        },

        interviewBy: { type: String, default: "employer" },

        testIntervieData: { type: Object },
    },
    { timestamps: true, strict: false }
);

const TestInterview = mongoose.model("testinterview", testinterviewSchema);

export default TestInterview;
