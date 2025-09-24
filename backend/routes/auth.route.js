import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import {signup,login,logout,getCurrentUser} from "../controllers/auth.controller.js" ;
import {protectRoute} from "../middleware/auth.middleware.js";
const router = express.Router();
const isProd = process.env.NODE_ENV === "production";
router.post("/signup",signup);
router.post("/login",login);
router.post("/logout",logout);

// Capability endpoint to let the frontend know which providers are configured
router.get('/providers', (req, res) => {
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    twitter: Boolean(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET),
  })
})

// OAuth start endpoints
router.get('/google', (req,res,next)=>{
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ message: 'Google OAuth not configured' })
  }
  const role = req.query.role || 'student'
  const state = Buffer.from(JSON.stringify({ role })).toString('base64')
  passport.authenticate('google', { scope:['profile','email'], state })(req,res,next)
})


// OAuth Twitter start (kept for signup)
router.get('/twitter', (req,res,next)=>{
  if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
    return res.status(501).json({ message: 'Twitter OAuth not configured' })
  }
  const role = req.query.role || 'student'
  const base = process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3001'
  passport.authenticate('twitter', { callbackURL: `${base}/api/v1/auth/twitter/callback?role=${encodeURIComponent(role)}` })(req,res,next)
})

// OAuth callbacks
router.get('/google/callback', (req,res,next)=>{
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).send('Google OAuth not configured')
  }
  next()
}, passport.authenticate('google', { failureRedirect: (process.env.CLIENT_URL||'http://localhost:5173') + '/login', session:false }), (req,res)=>{
  const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '3d' })
  res.cookie('hierai', token, {
    httpOnly: true,
    maxAge: 3*24*60*60*1000,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  })
  res.redirect(process.env.CLIENT_URL || 'https://hierai-frontend.onrender.com')
})

// Twitter callback (kept for signup)
router.get('/twitter/callback', (req,res,next)=>{
  if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
    return res.status(501).send('Twitter OAuth not configured')
  }
  next()
}, passport.authenticate('twitter', { failureRedirect: (process.env.CLIENT_URL||'http://localhost:5173') + '/login', session:false }), (req,res)=>{
  const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '3d' })
  res.cookie('hierai', token, {
    httpOnly: true,
    maxAge: 3*24*60*60*1000,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  })
  res.redirect(process.env.CLIENT_URL || 'https://hierai-frontend.onrender.com')
})

router.get("/me",protectRoute,getCurrentUser)
export default router;
