const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { Schema } = require('mongoose');

const { toJSON, paginate } = require('./plugins');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: { type: String, unique: true, index: true },
    bio: {
      type: String,
      maxLength: 280,
    },
    avatarUrl: { type: String, default: '' },
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

    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    planStatus: { type: String, enum: ['active', 'pending_upgrade', 'expired'], default: 'active' },
    planExpiresAt: { type: Date, default: null },
    photoCount: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    /**
     * Hard disable — blocks login entirely.
     * Use canCheckout to block POS only; use isActive to block everything.
     */
    isActive: {
      type: Boolean,
      default: true,
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
    bio: this.bio,
    role: this.role,
    isActive: this.isActive,
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
