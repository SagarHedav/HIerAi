import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        default: "Earth",
    },
    role: {
        type: String,
        enum:['student','recruiter',],
        required: true,
        default: "student",
    },
    username:{
        type: String,    
        required: true,
        unique: true,
    },
    profilePicture: {
        type: String,
        default: "",
    },
    bannerImg: {
        type: String,
        default: "",
    },
    headline: {
        type: String,
        default: "",
    },
    about: {
        type: String,
        default: "",
    },
    skills: [String],
    experience: [{
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String
    },],
    education: [{
        school: String,
        fieldOfStudy: String,
        startYear: Number,
        endYear: Number,
    },],
    projects: [{
        title: String,
        description: String,
        startDate: Date,
        endDate: Date,
        link: String
    },],
    connections: [{
        type: mongoose.Schema.Types.ObjectId,    
        ref: "User",
    }],
    phoneNumber: {
        type: String,
        default: "",
    }
}, {
    timestamps: true,
});

const User = mongoose.model("User", userSchema);

export default User;