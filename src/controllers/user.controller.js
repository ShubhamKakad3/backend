import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { fileUploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponses } from "../utils/ApiResponses.js";
const registerUser = asyncHandler( async(req, res) => {
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
    // or poerator used
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

export{registerUser}