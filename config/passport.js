import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import moment from "moment";
import User from "../models/Users.js";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({
          $or: [{ "google.id": profile.id }, { email }],
        });

        if (user) {
          user.google = {
            id: profile.id,
            name: profile.displayName,
            email,
          };
          user.lastLogin = moment().toISOString();
          await user.save();
        } else {
          user = await User.create({
            email,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            method: "google",
            email_is_verified: true,
            recrootUserType: "TempSocial",
            google: {
              id: profile.id,
              name: profile.displayName,
              email,
            },
            lastLogin: moment().toISOString(),
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
