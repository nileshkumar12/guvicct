
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    phone:{
        type:String
    },
    dob:{
        type:String
    },
     gender:{
        type:String
    },
    profileimg:{
        type:String
    },

    password:{
        type:String,
        required:true
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },
    role: {
      type: String,
            enum: ["buyer", "seller", "admin"],
      required: true,
      default: "buyer",
    },

    store: {
      storeName: {
        type: String,
      },

      storeDescription: {
        type: String,
      },

      sellerName: {
        type: String,
      },

      email: {
        type: String,
      },

      phone: {
        type: String,
      },

      category: {
        type: String,
      },

      gstin: {
        type: String,
      },

      pan: {
        type: String,
      },

      address: {
        type: String,
      },

      city: {
        type: String,
      },

      state: {
        type: String,
      },

      pincode: {
        type: String,
      },

      openingTime: {
        type: String,
      },

      closingTime: {
        type: String,
      },

      storeLogo: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User",userSchema);