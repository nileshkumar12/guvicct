
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User",userSchema);