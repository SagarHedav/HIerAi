import mongoose from 'mongoose'

const meetingSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Interview' },
  location: { type: String, default: 'Online' },
  notes: { type: String, default: '' },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled','cancelled'], default: 'scheduled' }
}, { timestamps: true })

const Meeting = mongoose.model('Meeting', meetingSchema)
export default Meeting