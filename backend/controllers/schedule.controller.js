import User from '../models/user.model.js'
import Meeting from '../models/meeting.model.js'
import { mailtrapClient, sender } from '../lib/mailtrap.js'

function buildICS({ title, start, end, location, description }){
  const dt = d=> new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z'
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HIerAi//Schedule//EN\nBEGIN:VEVENT\nDTSTART:${dt(start)}\nDTEND:${dt(end)}\nSUMMARY:${title}\nDESCRIPTION:${(description||'').replace(/\n/g,' ')}\nLOCATION:${location||'Online'}\nEND:VEVENT\nEND:VCALENDAR` }

export const getAvailability = async (req,res)=>{
  try{
    const userId = req.params.userId || req.user._id
    const u = await User.findById(userId).select('availabilitySlots name email')
    res.json(u?.availabilitySlots || [])
  }catch(e){ res.status(500).json({message:'Server error'}) }
}

export const setAvailability = async (req,res)=>{
  try{
    await User.findByIdAndUpdate(req.user._id, { availabilitySlots: req.body.slots||[] })
    res.json({ ok:true })
  }catch(e){ res.status(500).json({message:'Server error'}) }
}

export const listMeetings = async (req,res)=>{
  try{
    const me = req.user._id
    const items = await Meeting.find({ $or: [{host: me},{guest: me}], status:'scheduled' })
      .sort({ startsAt: 1 })
      .populate('host','name email username')
      .populate('guest','name email username')
    res.json(items)
  }catch(e){ res.status(500).json({message:'Server error'}) }
}

export const createMeeting = async (req,res)=>{
  try{
    const { hostId, guestId, startsAt, durationMin=30, title='Interview', location='Online', notes='' } = req.body
    const start = new Date(startsAt)
    const end = new Date(start.getTime() + durationMin*60000)
    const m = await Meeting.create({ host: hostId, guest: guestId, startsAt: start, endsAt: end, title, location, notes })

    // send emails with ICS
    try{
      const host = await User.findById(hostId).select('email name')
      const guest = await User.findById(guestId).select('email name')
      const ics = buildICS({ title, start, end, location, description: notes })
      const attachments = [{ filename:'invite.ics', content: ics, contentType:'text/calendar' }]
      await mailtrapClient.send({ from: sender, to: [{email: host.email}], subject:`Meeting scheduled with ${guest.name}`, html:`<p>Meeting created.</p>`, attachments })
      await mailtrapClient.send({ from: sender, to: [{email: guest.email}], subject:`Meeting scheduled with ${host.name}`, html:`<p>Meeting created.</p>`, attachments })
    }catch(err){}

    res.status(201).json(m)
  }catch(e){ res.status(500).json({message:'Server error'}) }
}

export const cancelMeeting = async (req,res)=>{
  try{
    const id = req.params.id
    await Meeting.findByIdAndUpdate(id, { status: 'cancelled' })
    res.json({ ok: true })
  }catch(e){ res.status(500).json({message:'Server error'}) }
}