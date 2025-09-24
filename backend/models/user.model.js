import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    provider: {
        type: String,
        enum: ['local','google','twitter'],
        default: 'local',
    },
    providerId: {
        type: String,
        default: '',
    },
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
        required: function() { return this.provider === 'local'; },
        default: '',
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
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }],
    phoneNumber: {
        type: String,
        default: "",
    },
    availabilitySlots: [{
        dayOfWeek: { type: Number, min: 0, max: 6 },
        start: String, // '09:00'
        end: String,   // '12:00'
        durationMin: { type: Number, default: 30 }
    }]
}, {
    timestamps: true,
});

const User = mongoose.model("User", userSchema);

export default User;