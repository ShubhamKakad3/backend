import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponses } from "../utils/ApiResponses.js";
import  jwt  from "jsonwebtoken";
import mongoose from "mongoose";




// generateAccessAndRefreshTokens for generating the tokens 
  const generateAccessAndRefreshTokens = async (user_Id) => {
    try {
      const user = await User.findById(user_Id);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      // adding refreshToken in refreshToken of mongodb and saving with save fron mongodb
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      // returning tokens
      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiErrors(
        500,
        "something went wrong while generating access and refresh tokens"
      );
    }
  };


// register user
const registerUser = asyncHandler(async (req, res) => {
  // logic steps to work
  // get the user details from frontend
  // check for validation - is empty or not
  // check user already exist or not, check email ,username- redirect according
  // check for images required - avatar,coverimage
  // upload images on cloudinary
  // create user object - creation entry in db
  // remove password and refresh token from response
  // check wether user created or not
  // redirect the response according to the situation

  // 1 getting details from user
  const { fullName, username, password, email } = req.body;
  console.log("email", email); // checking

  // 2 checking for fields empty or not  -with new syntax
  if (
    [fullName, username, password, email].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiErrors(400, "all fields are required and can not be empty");
  }

  // 3 checking for user exist or not
  const existedUser = await User.findOne({
    // or poerator used from mongodb
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiErrors(409, "user is already exist with username and email");
  }
  console.log("existing user checking in db : ", existedUser); //checking

  // 4 checking for reuired images locally uploaded or not, uploaded by multer in public temp
  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;
  if (!avatarLocalPath) {
    throw new ApiErrors(
      400,
      "avatar image is required and not uploaded locally by multer  "
    );
  }
  if (!coverImageLocalPath) {
    throw new ApiErrors(400, "coverImage is not uploaded locally and required");
  }
  console.log(avatarLocalPath, coverImageLocalPath); // checking
  console.log(req.files); // checking

  // 5 uploading on cloudinary, setup in utils/cloudinary , and giving the local path
  const avatar = await fileUploadOnCloudinary(avatarLocalPath);
  const coverImage = await fileUploadOnCloudinary(coverImageLocalPath);

  if (!avatar && !coverImage) {
    throw new ApiErrors(400, " avatar and coveImage are not found on locally ");
  }

  // 6 creating a user object first entry
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "", // extra safe checking
    email,
    password,
    username: username.toLowerCase(),
  });

  // 7 checking for wether user created or not and also removing password and refreshToken
  const createdUser = await User.findById(user._id).select(
    " -password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiErrors(
      500,
      " something went wrong while creating/registering a user"
    );
  }

  //  8 returning the response
  return res
    .status(201)
    .json(new ApiResponses(200, createdUser, "user registered successfully"));
})

// login user
const loginUser = asyncHandler(async (req, res) => {
  // get data from res.body
  // check user exist or not - username or email base
  // check password
  // access and refresh token
  // send cookies

  // 1 getting data and checking for they exist or not
  const { username, email, password } = req.body;

  if (!email && !username) {
    throw new ApiErrors(
      400,
      "either username or email is required out of both with password"
    );
  }

  // 2 check user exist or not in database and db is in another continent so await
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiErrors(404, "user does not exist in db");
  }

  // 3 check for the password if user matches or found , isPasswordCorrect from user model
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiErrors(402, "invalid password or credentials");
  }

  // passing user_id and getting access of both tokens
  const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // what we giving to loggedin user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 5 sending cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  //returning response with coolies
  console.log("user login successful"); // checking
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponses(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "user logged in successfully"
      )
    );
})


// logout user
const logoutUser = asyncHandler(async (req, res) => {
    // 1 fing the valid user to logout
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {refreshToken:undefined}
        },
        {
            new:true
        },

    )

    const options = {
      httpOnly: true,
      secure: true,
    };

    // return a response after logout and clearing the cookies
    console.log("user logout successful");// checking
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponses(200 ,{}, "user loged out successfully"))

})


// refresh access token - use after access token expired
const refreshAccessToken = asyncHandler(async (req, res) => {
  
// taking refresh token from cookies and body
    const inCommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!inCommingRefreshToken) {
    throw new ApiErrors(400, "unauthorised request with inCommingRefreshToken");
  }

    // verifying with jwt
  try {
    const decodedToken = jwt.verify(
      inCommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiErrors(402, " Invalid incoming refresh token ");
    }
      //  checking for incomming refresh token is equal to the refresh token of database so do user can access again
      if (inCommingRefreshToken !== user?.refreshToken) {
         throw new ApiErrors(401,"refresh token is expired or not valid ")
      }
      
      // get tokens
      const {refreshToken,accessToken } = await generateAccessAndRefreshTokens(user._id)
       
      const options = {
          httpOnly: true,
          secure:true
      }
  
      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
          new ApiResponses(
            200,
            { accessToken, refreshToken: newRefreshToken },
            "access token refreshed successfully"
          )
        );
  } catch (error) {
    throw new ApiErrors(404, error?.message || "invalid refresh token")
  }
});

// for changing the current password 
const changeCurrentPassword = asyncHandler(async (req,res) => {
  // taking passwords from body
  const { oldPassword, newPassword, confirmPassword } = req.body

  // just check for new and confirm passwords are equal or not - can be handled in front end
  if (!(newPassword === confirmPassword)) {
    throw new ApiErrors(400,"new password must match with the confirm password ")
  }

  // finding user in databse by id
  const user = await User.findById(req.user?._id)
  if (!user) {
    throw new ApiErrors(400, "old user not found for chamging the current password")
  }
  // if user is then checking for the correct old password 
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
  if (!isPasswordCorrect) {
     throw new ApiErrors(400, "invalid or incorrect old password ")
  }
  // if old password is correct or found then let the new password change - pre save from bcrypt in user model will modify it again and hashed
  user.password = newPassword
  // saving the new password in db 
  await user.save({validateBeforeSave:false})
 //  sendinig response 
  return res
    .status(200)
    .json(
      new ApiResponses(
        200,
        {},
        "new password changed successfully "
      )
    )

})


// get the current user in ui
const getCurrentUser = asyncHandler( async(req,res) => {
   // returning the response if user is there
  return res
    .status(200)
    .json(new ApiResponses(
      200,
      req.user,
      "current user fetched or loged in on his account"))
  
  

})


// updating user's account details
const updateUserAccoutDetails = asyncHandler(async (req,res) => {
  // get details from body to update
  const { fullName, email, password, username,avatar, } = req.body
  // check for the details are given by the body is there or not - they're require 
  if (!(fullName && email)) {
    throw new ApiErrors(400, "email and fullname is requiered for updation ")
  }
  // find the user in db for the details updation on the basis of provided details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    // from mongodb set operator which updates set fields -
    {
      $set: {
        fullName,   // es6 syntax no need pair
        email:email, // old syntax key value pair
         }
    },
    // this new give updated information after saving in db
    {new:true}
  
  ).select("-password")   // this selects the unrequired fields
   

  // returning updated user details which updated by user 
  return res
    .status(200)
    .json(new ApiResponses( 200 , user, "new details updated successfully by the user"))





})


// update image files avatar - use multer middleware before file upload, only multer can upload files  
const updateAvatarImage = asyncHandler(async (req, res) => {
  // taking file's local path from multer  - also u can save this localy 
  const avatarLocalPath = req.file?.path
  //check file is there or not
  if (!avatarLocalPath) {
    throw new ApiErrors(400, "avatar file is missing please check for the file uploaded for update or not")
  }
  // if file is then upload it on cloudinary 
  const avatar = await fileUploadOnCloudinary(avatarLocalPath)
  
  // check for after file uploaded on cloudinary, then file url
  if (avatar.url) {
    throw new ApiErrors(400, "file is not uploaded on cloudinary while updating - unsuccessful upload")
  }

  // if avatar url then update in db
  const user = await User.findByIdAndUpdate(
    res.user?._id,
    {
      $set: { avatar: avatar.url }, // this should be match with db names
    },
    { new: true }
  );

  // if avatar is updated in db successfully then return it to user - in ui
  return res
    .status(200)
    .json(new ApiResponses(200, user, " avatar image successfully uploaded and updated "))

});


// updating cover image -similar to the avatar
const updateCoverImage = asyncHandler( async(req,res) => {
  // 1
  const coverImageLocalPath = req.user?._id
  // 2
  if (!coverImageLocalPath) {
    throw new ApiErrors(400, "coverImage file is missing please check for the file uploaded for update or not");
  }
  // 3
  const coverImage = await fileUploadOnCloudinary(coverImageLocalPath);

  // 4
  if (coverImage.url) {
    throw new ApiErrors(
      400,
      "file is not uploaded on cloudinary while updating - unsuccessful upload"
    );
  }
  
// 5
  const user = await User.findByIdAndUpdate(
    res.user?._id,
    {
      // this should be match with db names
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  );

// 6
  return res
    .status(200)
    .json(
      new ApiResponses(
        200,
        user,
        " avatar image successfully uploaded and updated "
      )
    );

})


// get the user channel profile details - by using mongodb aggration pipeline 10x
const getUserChannelProfile = asyncHandler( async(req,res) => {
  // get the username from params
  const { username } = req.params;

  // check for user
  if (!username?.trim()) {
    throw new ApiErrors(400, "username is missing ");
  }

  // u can use this way to find the user in db
  // const user = await User.find({username})

  // finding user directly with mongodb aggregation - remember every user is a channel and every channel is a subscriber
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() }, // a user is channel here
    },
    {
      // lookup is looking or finding the subscribers of user's channel
      $lookup: {
        from: "subscriptions", // from the model of Subscription but in lowercase and plurral
        localField: "_id", // check with id
        foreignField: "channel", // look in the channels of subscription model
        as: "subscribers", // these are the subscribers of the user's channel -yet to count
      },
    },
    {
      // lookup is looking or finding the channels that he have subscribed to
      $lookup: {
        from: "subscriptions", // same field
        localField: "_id",
        foreignField: "subscriber",
        as: " subscribedTo", // user is subscribed to these channels
      },
    },
    {
      // it adds the fields
      $addFields: {
        // counting subscribers of user's channel with size operator
        subscribersCount: {
          $size: "$subscribers",
        },
        // couting user's channel subscribed to channels
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        // checking for user is subscribed or not so do it can display in ui - with condition operator
        isSubscribed: {
          $cond: {
            // check if user is loged in then id and in subscribers fiels find the subscriber
            if: { $in: [req.user?._id, "subscribers.subscriber"] },
            then: true, // subscribed
            else: false, // not subscribed
          },
        },
      },
    },
    {
      // pass what you want to provide to user with project operator that projects
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        createAt: 1,
      },
    },
  ]);

  // check for channel is
  if (!channel.length) {
    throw new ApiErrors(400, "channel does not exists");
  }

  console.log(channel); // checking -  what datatypes aggregates returns
  return res.status(200).json(
    new ApiResponses(
      200,
      channel[0], // first child of array for the front end developer
      "user channel fetched successfully "
    )
  );
})


// for the user's watch history - also mongodb aggregation pipline 
const getUserWatchHistory = asyncHandler(async () => {

  const user = await User.aggregate([
    {
      $match: {
        //  you'll needed have to create the id because mongodb gives u string not id ,object id is created by mongoose behind the scene
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    { // this is for all documents
      $lookup: {
        from: "video",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          { //  lookup for owner
            $lookup: {
              from: "user",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {// pass what u have to give to the user from owner
                  $project: {
                    fullName:1,
                    username: 1,
                    avatar:1
                  }
                }
              ]
              
            }
          },
          {
            $addFields: {
              owner: {
                $first: "owner", // get from owner[0]
              }
            }
          }
        ]
      },
    },
  ]);


  return res
    .status(200)
    .json(new ApiResponses(
      200,
      user[0].watchHistory,      // here u can give all
      "watchistory fetched successfully "
    ))

})




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserAccoutDetails,
  updateAvatarImage,
  updateCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
};