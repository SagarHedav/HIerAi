import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import Notification from "../models/notification.model.js";
import getDataUri from "../lib/datauri.js";
import cloudinary from "../lib/cloudinary.js";
import { extractTextFromBuffer } from "../lib/extractText.js";
import { scoreWithGemini } from "../services/ai/gemini.js";
import { scoreLocal } from "../services/ai/local.js";

export const applyForJob = async (req, res) => {
  try {
    const { jobId, fullName, email, phone, coverLetter, resumeDriveLink } = req.body;
    const userId = req.user._id;

    if (!jobId) {
      return res.status(400).json({ message: "Job id is required." });
    }

    // Check if already applied
    const existing = await Application.findOne({ job: jobId, applicant: userId });
    if (existing) {
      return res.status(400).json({ message: "Already applied for this job." });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Prepare resume payload
    let resumePayload = null;
    let resumeTextNormalized = '';
    if (req.file) {
      // Extract text from uploaded file buffer before upload
      resumeTextNormalized = await extractTextFromBuffer(req.file.mimetype, req.file.buffer)
      // Upload to cloudinary as raw file
      const fileDataUri = getDataUri(req.file);
      const uploadRes = await cloudinary.uploader.upload(fileDataUri.content, {
        resource_type: 'raw',
        folder: 'hierai/resumes'
      });
      resumePayload = {
        provider: 'upload',
        url: uploadRes.secure_url,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };
    } else if (resumeDriveLink) {
      resumePayload = {
        provider: 'drive',
        driveLink: resumeDriveLink,
      };
    } else {
      return res.status(400).json({ message: 'Resume file or drive link is required.' });
    }

    // AI scoring: choose provider
    let aiScore = null, aiSummary = '', aiDetails = {}, aiProvider = '';
    const jobText = `${job.title}\n${job.description}`;
    const requirements = job.requirements || [];
    const resumeText = resumeTextNormalized || '';

    const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'local')).toLowerCase()
    if (provider === 'local') {
      try {
        const ai = await scoreLocal({ jobText, requirements, resumeText })
        aiScore = ai.score; aiSummary = ai.rationale; aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }; aiProvider = 'local'
      } catch {}
    } else {
      try {
        const ai = await scoreWithGemini({ jobText, requirements, resumeText, coverLetter, weights: {} })
        aiScore = ai.score; aiSummary = ai.rationale; aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }; aiProvider = 'gemini'
      } catch {
        // fallback to local if Gemini fails
        try {
          const ai = await scoreLocal({ jobText, requirements, resumeText })
          aiScore = ai.score; aiSummary = ai.rationale; aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }; aiProvider = 'local'
        } catch {}
      }
    }

    const application = await Application.create({
      job: jobId,
      applicant: userId,
      answers: { fullName, email, phone, coverLetter },
      resume: resumePayload,
      resumeTextNormalized,
      resumeScore: aiScore,
      aiSummary,
      aiDetails,
      aiProvider: aiScore!=null ? aiProvider : '',
      aiScoredAt: aiScore!=null ? new Date() : undefined,
    });

    await Job.findByIdAndUpdate(jobId, { $push: { applications: application._id } });

    // Create notification for the applicant
    await Notification.create({
      recipient: userId,
      type: "applicationApplied",
      relatedJob: jobId,
    });

    res.status(201).json({ message: "Application submitted.", application });
  } catch (err) {
    console.error("Apply for job error:", err); // This will show the real error in your backend terminal
    res.status(500).json({ message: "Failed to apply", error: err.message });
  }
};
export const getAppliedJobs = async (req,res) => {
    try {
        const userId = req.user._id;
        const application = await Application.find({applicant:userId}).sort({createdAt:-1}).populate({
            path:'job',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'company',
                options:{sort:{createdAt:-1}},
            }
        });
        if(!application){
            return res.status(404).json({
                message:"No Applications",
                success:false
            })
        };
        return res.status(200).json({
            application,
            success:true
        })
    } catch (error) {
        console.log(error);
    }
}
// admin dekhega kitna user ne apply kiya hai
export const getApplicants = async (req,res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path:'applications',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'applicant'
            }
        });
        if(!job){
            return res.status(404).json({
                message:'Job not found.',
                success:false
            })
        };
        return res.status(200).json({
            job, 
            succees:true
        });
    } catch (error) {
        console.log(error);
    }
}
// Manual re-score for recruiters
export const scoreApplicationAI = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const app = await Application.findById(applicationId).populate({ path: 'job' })
    if (!app) return res.status(404).json({ message: 'Application not found' })
    // Only the recruiter who created the job can trigger re-score
    if (String(app.job.created_by) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const jobText = `${app.job.title}\n${app.job.description}`
    const requirements = app.job.requirements || []
    const resumeText = (app.resumeTextNormalized || '').trim()
    const coverLetter = (app.answers?.coverLetter || '').trim()

    if (!resumeText && !coverLetter) {
      return res.status(400).json({ message: 'No resume text or cover letter available to score.' })
    }

    const provider = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'local')).toLowerCase()

    if (provider === 'local') {
      try {
        const ai = await scoreLocal({ jobText, requirements, resumeText })
        app.resumeScore = ai.score
        app.aiSummary = ai.rationale
        app.aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }
        app.aiProvider = 'local'
        app.aiScoredAt = new Date()
        await app.save()
        return res.json({ message: 'Scored', score: app.resumeScore })
      } catch (e) {
        return res.status(500).json({ message: 'Local scoring failed', error: e.message })
      }
    }

    // try gemini first then fallback to local
    if (!process.env.GEMINI_API_KEY) {
      // fallback to local
      try {
        const ai = await scoreLocal({ jobText, requirements, resumeText })
        app.resumeScore = ai.score
        app.aiSummary = ai.rationale
        app.aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }
        app.aiProvider = 'local'
        app.aiScoredAt = new Date()
        await app.save()
        return res.json({ message: 'Scored', score: app.resumeScore })
      } catch (e) {
        return res.status(500).json({ message: 'Local scoring failed', error: e.message })
      }
    }

    try {
      const ai = await scoreWithGemini({ jobText, requirements, resumeText, coverLetter, weights: {} })
      app.resumeScore = ai.score
      app.aiSummary = ai.rationale
      app.aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }
      app.aiProvider = 'gemini'
      app.aiScoredAt = new Date()
      await app.save()
      return res.json({ message: 'Scored', score: app.resumeScore })
    } catch (aiErr) {
      console.error('AI scoring error:', aiErr)
      // fallback to local
      try {
        const ai = await scoreLocal({ jobText, requirements, resumeText })
        app.resumeScore = ai.score
        app.aiSummary = ai.rationale
        app.aiDetails = { strengths: ai.strengths, gaps: ai.gaps, matchedKeywords: ai.matchedKeywords }
        app.aiProvider = 'local'
        app.aiScoredAt = new Date()
        await app.save()
        return res.json({ message: 'Scored locally', score: app.resumeScore })
      } catch (e) {
        return res.status(502).json({ message: 'AI provider error', error: aiErr.message })
      }
    }
  } catch (e) {
    console.error('scoreApplicationAI error:', e)
    res.status(500).json({ message: 'Server error', error: e.message })
  }
}

export const updateStatus = async (req,res) => {
    try {
        const {status} = req.body;
        const applicationId = req.params.id;
        if(!status){
            return res.status(400).json({
                message:'status is required',
                success:false
            })
        };

        // find the application by applicantion id
        const application = await Application.findOne({_id:applicationId});
        if(!application){
            return res.status(404).json({
                message:"Application not found.",
                success:false
            })
        };

        // update the status
        application.status = status.toLowerCase();
        await application.save();

        // Notify applicant about status
        const notifyType = application.status === 'accepted'
            ? 'applicationAccepted'
            : application.status === 'rejected'
            ? 'applicationRejected'
            : null;
        if (notifyType) {
            await Notification.create({
                recipient: application.applicant,
                type: notifyType,
                relatedJob: application.job,
            });
        }

        return res.status(200).json({
            message:"Status updated successfully.",
            success:true
        });

    } catch (error) {
        console.log(error);
    }
}

export const deleteApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const app = await Application.findById(applicationId).populate({ path: 'job' });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    // Only recruiter who created the job can delete the application
    if (String(app.job.created_by) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Application.deleteOne({ _id: applicationId });
    await Job.findByIdAndUpdate(app.job._id, { $pull: { applications: applicationId } });
    return res.json({ message: 'Application deleted' });
  } catch (e) {
    console.error('deleteApplication error:', e);
    res.status(500).json({ message: 'Server error', error: e.message });
  }
}
