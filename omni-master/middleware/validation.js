const Joi = require('joi');

// User registration validation
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters',
        'any.required': 'Username is required'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string()
      .trim()
      .max(50)
      .required()
      .messages({
        'string.empty': 'First name is required',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),
    lastName: Joi.string()
      .trim()
      .max(50)
      .required()
      .messages({
        'string.empty': 'Last name is required',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// User login validation
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    identifier: Joi.string()
      .required()
      .messages({
        'string.empty': 'Email or username is required',
        'any.required': 'Email or username is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Update profile validation
const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    username: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Admin update user validation
const validateUpdateUser = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .trim()
      .max(50)
      .messages({
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    username: Joi.string()
      .min(3)
      .max(50)
      .trim()
      .messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 50 characters'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    role: Joi.string()
      .valid('user', 'admin')
      .messages({
        'any.only': 'Role must be either user or admin'
      }),
    isActive: Joi.boolean()
      .messages({
        'boolean.base': 'isActive must be a boolean value'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Generic validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Subscription validation
const validateStartTrial = (req, res, next) => {
  const schema = Joi.object({
    planId: Joi.string()
      .optional()
      .allow('', null)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateUpgradeSubscription = (req, res, next) => {
  const schema = Joi.object({
    planId: Joi.string()
      .optional()
      .allow('', null),
    billingCycle: Joi.string()
      .valid('monthly', 'yearly')
      .default('monthly')
      .messages({
        'any.only': 'Billing cycle must be either monthly or yearly'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateCancelSubscription = (req, res, next) => {
  const schema = Joi.object({
    immediately: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'Immediately must be a boolean value'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

const validateCreateSubscriptionPlan = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.empty': 'Plan name is required',
        'string.min': 'Plan name must be at least 2 characters long',
        'string.max': 'Plan name cannot exceed 50 characters',
        'any.required': 'Plan name is required'
      }),
    displayName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Display name is required',
        'string.min': 'Display name must be at least 2 characters long',
        'string.max': 'Display name cannot exceed 100 characters',
        'any.required': 'Display name is required'
      }),
    description: Joi.string()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    price: Joi.object({
      monthly: Joi.number()
        .min(0)
        .required()
        .messages({
          'number.base': 'Monthly price must be a number',
          'number.min': 'Monthly price cannot be negative',
          'any.required': 'Monthly price is required'
        }),
      yearly: Joi.number()
        .min(0)
        .required()
        .messages({
          'number.base': 'Yearly price must be a number',
          'number.min': 'Yearly price cannot be negative',
          'any.required': 'Yearly price is required'
        })
    }).required(),
    features: Joi.object({
      apiCalls: Joi.number()
        .min(0)
        .default(1000),
      storage: Joi.number()
        .min(0)
        .default(100),
      premiumFeatures: Joi.array()
        .items(Joi.string())
        .default([]),
      canCreateTeams: Joi.boolean()
        .default(false),
      canExportData: Joi.boolean()
        .default(false),
      hasPrioritySupport: Joi.boolean()
        .default(false),
      hasAdvancedAnalytics: Joi.boolean()
        .default(false),
      hasApiAccess: Joi.boolean()
        .default(false)
    }).default(),
    isPopular: Joi.boolean()
      .default(false),
    sortOrder: Joi.number()
      .min(0)
      .default(0),
    trialDays: Joi.number()
      .min(0)
      .max(365)
      .default(14)
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateUpdateProfile,
  validateUpdateUser,
  validateStartTrial,
  validateUpgradeSubscription,
  validateCancelSubscription,
  validateCreateSubscriptionPlan,
  validate
};
