import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../db/connection';
import slugify from 'slugify';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        // Find existing user
        let result = await query('SELECT * FROM users WHERE google_id=$1 OR email=$2', [profile.id, email]);
        let user = result.rows[0];

        if (!user) {
          // Create new user
          const baseUsername = slugify(profile.displayName || email.split('@')[0], { lower: true, strict: true }).slice(0, 25);
          let username = baseUsername;
          let counter = 1;
          while (true) {
            const existing = await query('SELECT id FROM users WHERE username=$1', [username]);
            if (!existing.rows[0]) break;
            username = `${baseUsername}${counter++}`;
          }

          const newUser = await query(
            `INSERT INTO users (email, google_id, username, display_name, avatar_url, role, status, email_verified)
             VALUES ($1,$2,$3,$4,$5,'creator','active',true) RETURNING *`,
            [email, profile.id, username, profile.displayName, profile.photos?.[0]?.value]
          );
          user = newUser.rows[0];
        } else if (!user.google_id) {
          // Link Google to existing email account
          await query('UPDATE users SET google_id=$1, email_verified=true WHERE id=$2', [profile.id, user.id]);
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;
