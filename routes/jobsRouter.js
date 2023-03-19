import express from 'express'
import  {createJob,updateJob,deleteJob,getAllJobs,showStats} from '../controllers/jobsController.js'

const router  = express.Router()

router.route('/').post(createJob).get(getAllJobs)
router.route('/stats').get(showStats)
router.route('/:id').get(deleteJob).patch(updateJob)


export default router