import Job from '../models/Job.js';
import { StatusCodes } from 'http-status-codes';
import {
    BadRequestError,
    NotFoundError,
    UnAuthenticatedError,
} from '../errors/index.js';
import mongoose from 'mongoose';
import checkPermissions from '../utils/checkPermissions.js';
import moment from 'moment';


const createJob = async (req, res) => {
    const { position, company } = req.body;

    if (!position || !company) {
        throw new BadRequestError('Please provide all values');
    }
    req.body.createdBy = req.user.userId;
    const job = await Job.create(req.body);
    res.status(StatusCodes.CREATED).json({ job });
};
const updateJob = async (req, res) => {

    const { id: jobID } = req.params;
    const { company, position } = req.body;

    if (!company || !position) {
        throw new BadRequestError("please provide all values");
    }
    const job = await Job.findOne({ _id: jobID })
    if (!job) {
        throw new NotFoundError(` no job with id${jobID} was found `)
    }

    checkPermissions(req.user, job.createdBy)
    const updateJob = await Job.findOneAndUpdate({ _id: jobID }, req.body, { new: true, runValidators: true })
    res.status(StatusCodes.OK).json(updateJob)
};
const deleteJob = async (req, res) => {
    const { id: jobId } = req.params;

    const job = await Job.findOne({ _id: jobId });

    if (!job) {
        throw new NotFoundError(`No job with id : ${jobId}`);
    }

    checkPermissions(req.user, job.createdBy);
    console.log(job)
    await Job.deleteOne({ _id: job._id });
    res.status(StatusCodes.OK).json({ msg: 'Success! Job removed' });
};

const getAllJobs = async (req, res) => {

    const jobs = await Job.find({ createdBy: req.user.userId })
    res.status(StatusCodes.OK).json({ jobs, totalJobs: jobs.length, numOfPages: 1 })

};


const showStats = async (req, res) => {
    //aggregate with mongodb
    let stats = await Job.aggregate([
        { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    //return one object contains all the values 
    stats = stats.reduce((acc, curr) => {
        const { _id: title, count } = curr;
        acc[title] = count;
        return acc;
    }, {});

    const defaultStats = {
        pending: stats.pending || 0,
        interview: stats.interview || 0,
        declined: stats.declined || 0,
    };
    let monthlyApplications = [];
    monthlyApplications = await Job.aggregate([
        { $match: { createdBy:new mongoose.Types.ObjectId(req.user.userId) } },
        {
            $group: {
                _id: {
                    year: {
                        $year: '$createdAt',
                    },
                    month: {
                        $month: '$createdAt',
                    },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 },
    ]);

    monthlyApplications = monthlyApplications
        .map((item) => {
            const {
                _id: { year, month },
                count,
            } = item;
            // accepts 0-11
            const date = moment()
                .month(month - 1) // -1 because mongo db counts months from  1 to 12 and moment counts from 0 to 11
                .year(year)
                .format('MMM Y');
            return { date, count };
        })
        .reverse();

    res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};

export { createJob, updateJob, deleteJob, getAllJobs, showStats };
