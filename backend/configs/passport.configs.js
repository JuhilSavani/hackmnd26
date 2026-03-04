import passport from "passport";

// TODO: define jwtOptions

// TODO: complete configPassport
export const configPassport = () => {}

export const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized", reason: info?.message });
    }
    req.user = user;
    next();
  })(req, res, next);
};