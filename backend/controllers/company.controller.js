import { Company } from "../models/company.model.js";
import { Job } from "../models/job.model.js";
import getDataUri from "../lib/datauri.js";
import cloudinary from "../lib/cloudinary.js";

export const registerCompany = async (req, res) => {
    try {
        const { companyName, description, website, location, logo } = req.body;
        if (!companyName) {
            return res.status(400).json({
                message: "Company name is required.",
                success: false
            });
        }
        let company = await Company.findOne({ name: companyName });
        if (company) {
            return res.status(400).json({
                message: "You can't register same company.",
                success: false
            })
        };
        company = await Company.create({
            name: companyName,
            description: description || '',
            website: website || '',
            location: location || '',
            logo: logo || '',
            userId: req.user._id
        });

        return res.status(201).json({
            message: "Company registered successfully.",
            company,
            success: true
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success:false });
    }
}
export const getCompany = async (req, res) => {
    try {
        const userId = req.user._id; // logged in user id
        const companies = await Company.find({ userId });
        if (!companies) {
            return res.status(404).json({
                message: "Companies not found.",
                success: false
            })
        }
        return res.status(200).json({
            companies,
            success:true
        })
    } catch (error) {
        console.log(error);
    }
}
// get company by id
export const getCompanyById = async (req, res) => {
    try {
        const companyId = req.params.id;
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                message: "Company not found.",
                success: false
            })
        }
        return res.status(200).json({
            company,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const updateCompany = async (req, res) => {
    try {
        const { name, description, website, location , logo } = req.body;
 
        const file = req.file;
        // idhar cloudinary ayega
        // const fileUri = getDataUri(file);
        // const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
        // const logo = cloudResponse.secure_url;
    
        const updateData = { name, description, website, location, logo };

        const company = await Company.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (!company) {
            return res.status(404).json({
                message: "Company not found.",
                success: false
            })
        }
        return res.status(200).json({
            message:"Company information updated.",
            success:true
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success:false });
    }
}

export const deleteCompany = async (req, res) => {
    try {
        const companyId = req.params.id;
        // ensure company belongs to the logged in recruiter
        const company = await Company.findOne({ _id: companyId, userId: req.user._id });
        if (!company) {
            return res.status(404).json({ message: 'Company not found or not owned by user', success: false });
        }
        // safeguard: block deletion if jobs exist for this company
        const jobsCount = await Job.countDocuments({ company: companyId });
        if (jobsCount > 0) {
            return res.status(400).json({
                message: `Cannot delete company with ${jobsCount} linked job(s). Please remove or reassign those jobs first.`,
                success: false
            });
        }
        await Company.deleteOne({ _id: companyId });
        return res.status(200).json({ message: 'Company deleted successfully', success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
}
