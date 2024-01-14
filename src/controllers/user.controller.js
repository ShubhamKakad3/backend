import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponses } from "../utils/ApiResponses.js";
import  jwt  from "jsonwebtoken";

// generateAccessAndRefreshTokens
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



export { registerUser, loginUser, logoutUser, refreshAccessToken };