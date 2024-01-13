import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
        },
      
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
        },
    
    fullName: {
      type: String,
      required: true,
      trim: true,
      index:true
        },
    
    avatar: {
        type:String, //cloudinary
        required:true
        },
    
    coverImage: {
        type:String, // cloudinary
        },
    
    watchHistory: [
        
        {
            type: mongoose.Schema.Types.ObjectId,
            ref:'Video'
        }
    ],
    
    password: {
        type: String,
        required:[true,'password is required']   // default message
    },
    
    refreshToken: {
        type:String
    }    
  },
  { timestamps: true }
);


// encript the password before save with mongoose pre hook and bcrypt. 
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})


// injecting custom methods and comparing passwords 
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)     // initial password from user and encripted password from bcrypt
}


// jwt tokens methods
userSchema.methods.generateAccessToken = function () {
     return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );
}

userSchema.methods.generateRefreshToken = function () {
     return jwt.sign(
      {
        _id: this._id,
        
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      },)
}



export const User = mongoose.model('User',userSchema)