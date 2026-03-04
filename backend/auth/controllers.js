const IS_PRODUCTION = process.env.NODE_ENV !== "development";

// TODO: complete register
export const register = async (req, res) => {}

// TODO: complete login
export const login = async (req, res) => {}

// TODO: complete googleCallback
export const googleCallback = async (req, res) => {}

export const logout = (req, res) => {
  res.clearCookie("authJwt", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "None",
  });
  return res.sendStatus(204);
};
