import { Job } from "../models/job.model.js";

// admin post krega job
export const postJob = async (req, res) => {
    try {
        const { title, description, requirements, responsibilities, salary, location, jobType, experience, position, companyId } = req.body;
        const userId = req.user._id;

        const missing = [];
        if (!title) missing.push('title');
        if (!description) missing.push('description');
        if (!requirements) missing.push('requirements');
        if (!salary && salary !== 0) missing.push('salary');
        if (!location) missing.push('location');
        if (!jobType) missing.push('jobType');
        if (!experience && experience !== 0) missing.push('experience');
        if (!position && position !== 0) missing.push('position');
        if (!companyId) missing.push('companyId');
        if (missing.length) {
            return res.status(400).json({
                message: `Missing required field(s): ${missing.join(', ')}`,
                missing,
                success: false
            });
        };
        const job = await Job.create({
            title,
            description,
            requirements: requirements.split(","),
            responsibilities: (responsibilities ? responsibilities.split(",") : []),
            salary: Number(salary),
            location,
            jobType,
            experienceLevel: experience,
            position,
            company: companyId,
            created_by: userId
        });
        return res.status(201).json({
            message: "New job created successfully.",
            job,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
}
// student k liye
// import Job from '../models/job.model.js' // Ensure this import is correct

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('created_by', 'name')
      .populate('company', 'name');
    res.status(200).json(jobs);
  } catch (err) {
    console.error("Error fetching jobs:", err); // Log error for debugging
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
}
// student
export const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path: "applications"
        });
        if (!job) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            })
        };
        return res.status(200).json({ job, success: true });
    } catch (error) {
        console.log(error);
    }
}
// admin kitne job create kra hai abhi tk
export const getAdminJobs = async (req, res) => {
    try {
        const adminId = req.user._id;
        const jobs = await Job.find({ created_by: adminId })
            .populate({ path:'company' })
            .populate({
                path:'applications',
                options:{ sort:{ createdAt:-1 }},
                populate:{ path:'applicant', select:'name username profilePicture' }
            });
        if (!jobs) {
            return res.status(404).json({
                message: "Jobs not found.",
                success: false
            })
        };
        return res.status(200).json({
            jobs,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}