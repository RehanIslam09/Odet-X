import bcrypt from "bcrypt";
import { Document, Model, Schema, model } from "mongoose";

import {
  BCRYPT_SALT_ROUNDS,
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/constants/auth.js";

export interface IUser {
  name: string;
  email: string;
  password: string;

  avatar?: string;
  bio?: string;

  /**
   * Stores a SHA-256 hash of the refresh token, never the raw token itself.
   * null = logged out (token explicitly invalidated)
   * undefined = field not selected from DB
   */
  refreshTokenHash?: string | null;

  isEmailVerified: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: MIN_NAME_LENGTH,
      maxlength: MAX_NAME_LENGTH,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: MIN_PASSWORD_LENGTH,
      maxlength: MAX_PASSWORD_LENGTH,
      select: false,
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: MAX_BIO_LENGTH,
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // Destructure to exclude sensitive and internal fields.
        // Using destructuring instead of `delete` satisfies strict TypeScript
        // which disallows the delete operator on non-optional properties.
        const {
          _id: _,
          __v: __,
          password: ___,
          refreshTokenHash: ____,
          ...safe
        } = ret as Record<string, unknown>;

        void _, void __, void ___, void ____;

        return safe;
      },
    },
  },
);

/**
 * Automatically hash the password before saving.
 * Only runs when the password field has actually changed.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compare a plaintext password with the stored hash.
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model<IUserDocument>("User", userSchema);

export default User;