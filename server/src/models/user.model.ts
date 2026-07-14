import bcrypt from "bcrypt";
import { Document, Model, Schema, model } from "mongoose";

import {
  BCRYPT_SALT_ROUNDS,
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/constants/auth";

export interface IUser {
  name: string;
  email: string;
  password: string;

  avatar?: string;
  bio?: string;

  refreshToken?: string;

  isEmailVerified: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUserDocument> {}

const userSchema = new Schema<IUserDocument, IUserModel>(
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

    refreshToken: {
      type: String,
      default: "",
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
      transform(_doc, ret) {
        ret.id = String(ret._id);

        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshToken;

        return ret;
      },
    },
  },
);

/**
 * Automatically hash the password before saving.
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

const User = model<IUserDocument, IUserModel>("User", userSchema);

export default User;