
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
      enum: ["buyer", "seller"],
      required: true,
      default: "buyer",
    },

},{
    timestamps:true
});

module.exports = mongoose.model("User",userSchema);