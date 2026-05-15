const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      maxLength: 100,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
      default: 'cashier',
    },

    // ── POS access control ─────────────────────────────────────────────────
    /**
     * Owner can toggle this off to immediately block a cashier from processing
     * checkouts without deleting their account.
     * Owners always bypass this — checked in canCheckout.middleware.js.
     */
    canCheckout: {
      type: Boolean,
      default: true,
    },

    /**
     * Hard disable — blocks login entirely.
     * Use canCheckout to block POS only; use isActive to block everything.
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Security & audit ───────────────────────────────────────────────────
    /**
     * Daily checkout limit in pesos.
     * Null = no limit. Set to e.g. 10000 for a ₱10,000/day cap per cashier.
     */
    dailyCheckoutLimit: {
      type: Number,
      default: null,
    },

    /**
     * Tracks last login metadata for audit purposes.
     */
    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
    },

    /**
     * PIN for sensitive actions like applying discounts.
     * Hashed with bcrypt. Optional — null means no PIN required.
     * Future use: require PIN for discount above threshold.
     */
    pin: {
      type: String,
      select: false,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.methods.comparePin = function (plain) {
  if (!this.pin) return Promise.resolve(false);
  return bcrypt.compare(plain, this.pin);
};

/** Safe user object — strips sensitive fields for API responses */
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    canCheckout: this.canCheckout,
    isActive: this.isActive,
    dailyCheckoutLimit: this.dailyCheckoutLimit,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
