const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User Schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
      match: [/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
      match: [/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Creates index automatically
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true, // Creates index automatically
      trim: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Hide password by default
    },

    role: {
      type: String,
      enum: ["CLIENT", "PROVIDER", "ADMIN"],
      default: "CLIENT",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt
  }
);

// Hash Password Before Save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Instance Method: Compare Password
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Remove Sensitive Fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Static Methods

// Find user by email (include password)
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select("+password");
};

// Find user by phone
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone });
};

// Update profile
userSchema.statics.updateProfile = function (id, updateData) {
  const allowedFields = ["firstName", "lastName", "phone"];
  const updateFields = {};

  allowedFields.forEach((field) => {
    if (updateData[field]) updateFields[field] = updateData[field];
  });

  return this.findByIdAndUpdate(id, updateFields, {
    new: true,
    runValidators: true,
  });
};

// Delete user
userSchema.statics.deleteUser = function (id) {
  return this.findByIdAndDelete(id);
};

// Export Model
const User = mongoose.model("User", userSchema);
module.exports = User;


// Static Concept
/*
What We Used Before

Before creating custom static methods, we used built-in Mongoose methods directly inside controllers:
User.findOne({ email })
User.findById(id)
User.create(data)
User.findByIdAndUpdate(id)

What Changed Now?

Now we created custom static methods, like:

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select("+password");
};

Short Answer:

Before → We used Mongoose built-in static methods directly.
Now → We created custom static methods for better structure.
*/