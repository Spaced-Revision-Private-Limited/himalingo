import jwt from "jsonwebtoken";


const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Attach user payload to the request object
    req.user = {id: decoded.id},

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};


export { auth };