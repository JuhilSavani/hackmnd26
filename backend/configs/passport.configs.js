import passport from "passport";
import { Strategy } from 'passport-jwt';
import { User } from "../models/user.models.js";

const JWT_SECRET = process.env.JWT_SECRET;

const jwtOptions = {
  jwtFromRequest: (req) => req?.cookies?.sessionCookie|| null,
  secretOrKey: JWT_SECRET,
};

export const configPassport = () => {
  passport.use(
    new Strategy(jwtOptions, async (jwtPayload, callback) => {
      try {
        const user = await User.findByPk(jwtPayload.sub, {
          attributes: ["id", "username", "email", "createdAt"],
        });
        if (user) {
          return callback(null, user);
        } else {
          return callback(null, false);
        }
      } catch (error) {
        console.error("[Passport Config] Error during JWT user lookup:", error);
        return callback(error, false);
      }
    })
  );
};

export const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    
    if (!user) {
      // 'info' contains the reason for failure
      console.error("❌ Auth Failed:", info?.message);
      return res.status(401).json({ 
        message: "Unauthorized", 
        reason: info?.message 
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};