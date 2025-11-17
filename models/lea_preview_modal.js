import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        workEmail: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        organizationName: { type: String, required: true },
    },
    { timestamps: true, collection: "leapreviewcall" }
);

const Form = mongoose.model("Form", formSchema);

export default Form;
