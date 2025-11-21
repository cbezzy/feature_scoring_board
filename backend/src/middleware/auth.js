const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {

  const token = req.cookies?.pcfb_token;

  if (!token) {
    console.log("NO pcfb_token found");
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (e) {
    console.log("JWT verify failed:", e.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authRequired };
