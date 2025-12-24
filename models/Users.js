import bcrypt from "bcrypt";
import { model, Schema } from "mongoose";
import mongoose from "mongoose";
// const bcrypt = require("bcrypt");
//  companyId: {
//       type: Schema.Types.ObjectId,
//       ref: "Company",
//     },
const ThirdPartyProviderSchema = new Schema({
  provider_name: {
    type: String,
    default: null,
  },
  provider_id: {
    type: String,
    default: null,
  },
  provider_data: {
    type: {},
    default: null,
  },
});

// Create Schema
const UserSchema = new mongoose.Schema(
  {
    userInvitationStatus: {
      type: String,
    },
    jobRoleId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    testInterviewbyEmployer: {
      type: Boolean,
    },
    phoneNumber: {
      type: String,
    },
    firstName: {
      type: String,
      required: [true, "First Name is required"],
    },
    lastName: {
      type: String,
      required: [true, "Last Name is required"],
    },
    companyLink: {
      type: String,
      // required: true,
    },
    sector: {
      type: String,
      // required: true,
    },
    organization: {
      type: String,
      // required: true,
    },

    recrootUserType: {
      type: String,
      required: true,
    },
    checked: {
      type: Boolean,
      default: false,
    },
    newsLetters: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    currentRole: {
      type: String,
    },
    email_is_verified: {
      type: Boolean,
      default: false,
    },
    postalCode: {
      type: String,
    },
    password: {
      type: String,
    },
    referral_code: {
      type: String,
      default: function () {
        let hash = Math.floor(1000 + Math.random() * 9000);
        return hash;
      },
    },
    referred_by: {
      type: String,
      default: null,
    },
    third_party_auth: [ThirdPartyProviderSchema],
    date: {
      type: Date,
      default: Date.now,
    },
    login: {
      type: String,
      authantication: String,
    },
    mobile: {
      type: Number,
    },
    about: {
      type: String,
      default: null,
    },
    profpicFileLocation: {
      photo: {
        type: String,
        default: null,
      },
      photoName: {
        type: String,
        default: null,
      },
    },
    profilePercentage: {
      type: Number,
      default: 0,
    },
    percentageDisplay: {
      type: Boolean,
      default: false,
    },
    jobTitle: {
      type: String,
    },
    isNonportalUser: {
      type: Boolean,
      default: false,
    },
    cmName: {
      type: String,
    },
    mockPayments: [],
    resume: {
      jobsPreference: { type: Array, default: null },
      resumeFileLocation: [
        {
          resume: String,
          resumeName: String,
          status: {
            type: Boolean,
            default: true,
          },
          resume_text: String,
          isPdf: {
            type: Boolean,
            default: false,
          },
        },
      ],
      coverLetterFileLocation: [
        {
          title: String,
          organization: String,
          certificatepath: String,
          coverName: String,
        },
      ],
      certificateFileLocation: [
        {
          certificate: String,
          certificateName: String,
        },
      ],
      // resumeFileLocation: String,
      // coverLetterFileLocation: String,
      desiredJobField: String,
      resumeFirstName: String,
      resumeLastName: String,
      mobileNumber: String,
      carearLevel: String,
      totalWorkExperience: String,
      notice: String,
      jobsPreference: [],
      skills: [
        {
          skillName: String,
          Experience: String,
          Compitance: String,
        },
      ],
      gender: String,
      languages: [],
      cvSetting: String,
      location: {
        country: {
          type: Object,
        },
        state: {
          type: Object,
        },
        city: {
          type: Object,
        },
      },
      currentOffer: {
        type: String,
      },
      notice: {
        type: String,
      },
      salaryCurrency: {
        type: String,
      },
      workPrefence: {
        type: Array,
      },
      currentSalary: {
        salary: { type: Number, default: null },
        denomination: { type: String, default: null },
      },
      expectedSalary: {
        salary: { type: Number, default: null },
        denomination: { type: String, default: null },
      },
      country: [],
      nationality: [],
      countrieswithworkingRights: [],
      availableToWork: {
        days: [],
        fromDate: String,
        toDate: String,
      },
      education: [
        {
          collegeName: String,
          country: String,
          degreeName: String,
          duration: String,
          experience: String,
          graduate: String,
          logo: String,
          state: String,
          fromDate: String,
          toDate: String,
        },
      ],
      workExperience: [
        {
          companyName: String,
          experience: String,
          duration: String,
          location: String,
        },
      ],
      projects: [
        {
          portafolioLink: String,
          ProjectName: String,
          Organization: String,
          Description: String,
        },
      ],
      traning: [
        {
          title: String,
          instituete: String,
          date: String,
        },
      ],
      socialMediaLink: {
        fb: String,
        twitter: String,
        linkin: String,
        utube: String,
      },
    },
    affidasData: {
      type: Object,
    },
    token: { type: String },
    refreshToken: { type: String },
    channelDetails: {},
    RuleArn: { type: String },
    google: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    linkedin: {
      id: {
        type: String,
      },
      name: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    method: {
      type: String,
    },
    identifier: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    profession: {
      type: String,
      default: null,
    },
    immediate: {
      type: Boolean,
      default: false,
    },
    myPreferenceInfo: {
      jobTitles: { type: Array, default: null },
      workPlaces: { type: Array, default: null },
      jobLocations: { type: Array, default: null },
      jobTypes: { type: Array, default: null },
      immediateJoiner: { type: String, default: "no" },
    },
    industries: {
      type: Array,
      default: [],
    },
    refferedby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    refferals: {
      type: Array,
      default: [],
    },
    testInterviewPayments: {
      type: Array,
      default: [],
    },
    testInterviewQuota: {
      type: Number,
      default: 0,
    },
    testInterviewbyCollege: {
      type: Boolean,
    },
    allocatedCount: {
      type: Number,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    admindepartmentId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    overallRec: {
      type: Array,
    },
    overallComm: {},
    tempStudent: {
      type: Boolean,
    },
    country: {
      type: String,
      default: null,
    },
    mobile_code: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    placementTours: {
      step_one: { type: Boolean, default: true },
      step_two: { type: Boolean, default: true },
      step_three: { type: Boolean, default: true },
      dashboard: { type: Boolean, default: true },
      department: { type: Boolean, default: true },
      invite: { type: Boolean, default: true },
      createInterviews: {
        type: Boolean,
        default: true,
      },
      createStudents: {
        type: Boolean,
        default: true,
      },
      goToSettings: {
        type: Boolean,
        default: true,
      },
      shareWithEmployer: {
        type: Boolean,
        default: true,
      },
      Insights: {
        type: Boolean,
        default: true,
      },
      departmentInsights: {
        type: Boolean,
        default: true,
      },
      inviteUsers: { type: Boolean, default: true },
      invitingUsers: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      upgrade: { type: Boolean, default: true },
      settings: { type: Boolean, default: true },
      studentSettings: { type: Boolean, default: true },
      package: { type: Boolean, default: true },
      emails: { type: Boolean, default: true },
      inviteStatus: {
        type: Boolean,
      },
    },
    recrootTours: {
      step_one: { type: Boolean, default: true },
      step_two: { type: Boolean, default: true },
      step_three: { type: Boolean, default: true },
      all_interviews: { type: Boolean, default: true },
      interview_candidates: { type: Boolean, default: true },
      subscription: { type: Boolean, default: true },
    },
    interviewCount: { type: Number, default: 0 },
    interviewAllocated: { type: Number, default: 0 },
    archiveStatus: { type: Boolean, default: false },
    deleteRequest: {
      _id: false, // 👈 prevents MongoDB from creating an _id
      reasons: {
        type: [String],
        default: [],
      },
      othersText: {
        type: String,
        default: null,
      },
      deletionRequestedAt: {
        type: Date,
        default: null,
      },
    },
    loginviaotp: { type: Boolean, default: false },
    freeParsers: [],
    newSkills: [],
    newExperience: [],
    newEducation: [],
    parsedData: {},
    selfInterviewDone: {
      type: Boolean,
      default: false,
    },
    inviteType: {
      type: String,
    },
    temporaryPassword: {
      type: String,
      default: "",
    },
    newphoneNumber: {
      type: String,
    },
    assistUser: {
      type: Boolean,
      default: false,
    },
    consentConfirmation: {
      type: Boolean,
      default: false,
    },
    resumeUser: {
      type: Boolean,
      default: false,
    },
    availabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Availability",
    },
    isAvailabilityAdded: {
      type: Boolean,
      default: false,
    },
    isLogReportEnabled: {
      type: Boolean,
      default: false,
    },
    reportFrequency: {
      type: String,
      default: "weekly",
    },
    lastLogReportDate: {
      type: Date,
    },
    isEmployerVerified: {
      type: Boolean,
      default: false,
    },
    mobile_is_verified: {
      type: Boolean,
      default: false,
    },
    payments: [],
    stripeCusId: {
      type: String,
    },
    countryDetails: {},
  },
  { strict: false }
);

UserSchema.methods.isValidPassword = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

export default model("User", UserSchema);
