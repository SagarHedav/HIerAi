import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as TwitterStrategy } from 'passport-twitter'
import User from '../models/user.model.js'

function safeUsername(base) {
  const slug = (base || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${slug || 'user'}${suffix}`
}

export function initPassport() {
  const GID = process.env.GOOGLE_CLIENT_ID
  const GSECRET = process.env.GOOGLE_CLIENT_SECRET
  if (GID && GSECRET) {
    passport.use(new GoogleStrategy({
      clientID: GID,
      clientSecret: GSECRET,
      callbackURL: `${process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3001'}/api/v1/auth/google/callback`,
      passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value
        const name = profile.displayName || (profile.name ? `${profile.name.givenName||''} ${profile.name.familyName||''}`.trim() : 'Google User')
        if (!email) return done(new Error('No email from Google'))

        let role = 'student'
        try {
          const st = req && req.query && req.query.state
          if (st) {
            const parsed = JSON.parse(Buffer.from(st, 'base64').toString())
            if (parsed && (parsed.role === 'student' || parsed.role === 'recruiter')) role = parsed.role
          }
        } catch {}

        let user = await User.findOne({ email })
        if (!user) {
          const username = safeUsername(profile.username || name)
          user = await User.create({
            provider: 'google',
            providerId: profile.id,
            name,
            email,
            username,
            role,
            password: '',
          })
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }))
  } else {
    console.warn('[auth] Google OAuth not configured: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET')
  }

  // Twitter strategy (enabled for signup/login if credentials provided)
  const TKEY = process.env.TWITTER_CONSUMER_KEY
  const TSECRET = process.env.TWITTER_CONSUMER_SECRET
  if (TKEY && TSECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: TKEY,
      consumerSecret: TSECRET,
      callbackURL: `${process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3001'}/api/v1/auth/twitter/callback`,
      includeEmail: true,
      passReqToCallback: true,
    }, async (req, token, tokenSecret, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || `${profile.username}@twitter.local`
        const name = profile.displayName || profile.username || 'Twitter User'

        let role = 'student'
        if (req && req.query && (req.query.role === 'student' || req.query.role === 'recruiter')) {
          role = req.query.role
        }

        let user = await User.findOne({ email })
        if (!user) {
          const username = safeUsername(profile.username || name)
          user = await User.create({
            provider: 'twitter',
            providerId: profile.id,
            name,
            email,
            username,
            role,
            password: '',
          })
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }))
  } else {
    console.warn('[auth] Twitter OAuth not configured: missing TWITTER_CONSUMER_KEY/TWITTER_CONSUMER_SECRET')
  }
}
export default passport
