import mongoose from "mongoose";

const companyInterviewSchema = new mongoose.Schema(
    {
        candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
        employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        isDraftVersion: { type: Boolean, default: false },
        submitted: { type: Date },

        interview_title: { type: String },
        job_title: { type: String },

        jobRoleId: { type: mongoose.Schema.Types.ObjectId },

        job_desc_file: { type: String },
        additional_info: { type: String },

        skills: { type: Array },

        status: { type: String, default: "not conducted" },
        dueDate: { type: Date },

        interviewStatus: { type: String, default: "not started" },
        interview_type: { type: String },

        interviewsQuestionList: { type: Array },
        oldQuestions: { type: Array, default: [] },
        question_version: { type: Number, default: 0 },

        interviewsMultiQuestionList: { type: Array },
        studentList: { type: Array },

        interviewTitle: { type: String },
        jobDescription: { type: String },

        inviteType: { type: String },
        inviteUrl: { type: String },

        resumeBased: { type: Boolean },
        experience: { type: String },
        complexity: { type: String },

        question_type: { type: Array },
        num_questions: { type: Number },

        isProgrammingRelated: {
            type: String,
            enum: ["yes", "no"],
        },

        programming_language: { type: String },

        manPassword: { type: String },

        screenShare: { type: Boolean, default: false },
        assisted: { type: Boolean, default: false },
        self_interview: { type: Boolean, default: false },

        stageConfig: { type: Object },

        pricingByMin: { type: Boolean, default: false },
        multiLanguage: { type: Boolean, default: false },
        isTech: { type: Boolean, default: false },

        leaBlue: { type: Boolean, default: false },

        generalLanguage: { type: String },

        invitedViaRecroot: { type: Boolean, default: true },
        leaMcq: { type: Boolean, default: false },

        emailsSent: [
            {
                email: { type: String },
                status: { type: Boolean },
            },
        ],

        strengency: { type: String, default: "Moderate" },

        mandatoryPercentage: { type: Number, default: 0 },
        niceToHavePercentage: { type: Number, default: 0 },

        mandatorySkills: { type: Array },
        prioritySkills: { type: Array },
        niceSkills: { type: Array },

        responsibilities: { type: Array },
        requirements: { type: Array },

        allProject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "allProjects",
        },

        interviewBy: { type: String, default: "employer" },

        langauage: { type: String, default: "english" },
    },
    { timestamps: true, strict: false }
);

const CompanyInterview = mongoose.model(
    "companyinterview",
    companyInterviewSchema
);

export default CompanyInterview;
