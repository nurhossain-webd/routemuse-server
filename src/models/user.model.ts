import { Schema, model, type HydratedDocument } from "mongoose";

export const userRoles = ["user", "admin"] as const;
export const authProviders = ["local", "google"] as const;

export type UserRole = (typeof userRoles)[number];
export type AuthProvider = (typeof authProviders)[number];

export interface TravelPreferences {
  preferredCategories: string[];
  preferredLocations: string[];
  budgetMin?: number;
  budgetMax?: number;
  travelStyle?: string;
}

export interface User {
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string;
  role: UserRole;
  authProvider: AuthProvider;
  googleId?: string;
  travelPreferences: TravelPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const travelPreferencesSchema = new Schema<TravelPreferences>(
  {
    preferredCategories: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    travelStyle: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    avatar: { type: String, trim: true },
    role: { type: String, enum: userRoles, default: "user" },
    authProvider: { type: String, enum: authProviders, required: true },
    googleId: { type: String, unique: true, sparse: true, select: false },
    travelPreferences: { type: travelPreferencesSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, returnedObject) => {
        delete returnedObject.passwordHash;
        delete returnedObject.googleId;
        return returnedObject;
      },
    },
  },
);

userSchema.pre("validate", function validateProviderCredentials() {
  if (this.authProvider === "local" && !this.passwordHash) {
    this.invalidate("passwordHash", "A password is required for local accounts");
  }

  if (this.authProvider === "google" && !this.googleId) {
    this.invalidate("googleId", "A Google ID is required for Google accounts");
  }

  const { budgetMin, budgetMax } = this.travelPreferences;
  if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
    this.invalidate(
      "travelPreferences.budgetMax",
      "Maximum budget must be greater than or equal to minimum budget",
    );
  }
});

export const UserModel = model<User>("User", userSchema);
