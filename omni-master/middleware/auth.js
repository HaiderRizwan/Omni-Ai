const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateSubscriptionStatus } = require('./subscription');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      console.log('[Auth] Authorization header present');
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies (if using cookies)
    if (!token && req.cookies && req.cookies.token) {
      console.log('[Auth] Token found in cookies');
      token = req.cookies.token;
    }

    if (!token) {
      console.warn('[Auth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('[Auth] Token verified for user:', decoded.userId);

      // Get user from token
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.warn('[Auth] No user found for token userId:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        console.warn('[Auth] User is deactivated:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      req.user = user;

      // Validate subscription status and continue chain inside that middleware
      return validateSubscriptionStatus(req, res, next);
    } catch (error) {
      console.warn('[Auth] Token verification failed');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Silently fail - don't set req.user
      }
    }

    next();
  } catch (error) {
    // Silently fail - don't set req.user
    next();
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};
