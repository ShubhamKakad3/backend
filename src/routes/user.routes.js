import { Router } from "express";
import {
  loginUser, logoutUser, registerUser, refreshAccessToken,
  changeCurrentPassword, getCurrentUser, updateUserAccoutDetails, updateAvatarImage,
  updateCoverImage, getUserChannelProfile, getUserWatchHistory
} from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

// register route
router.route("/register").post(
// multer middleware injecting for image file upload
    upload.fields([
           {
             name: "avatar",
             maxCount: 1,
           },
           {
             name: "coverImage",
             maxCount: 1,
           }
    ]),
  registerUser
);

// login route
router.route("/login").post(loginUser)

// logout route
router.route("/logout").post( verifyJWT,logoutUser)

// refresh access token
router.route("/refresh-token").post(refreshAccessToken)

// change password
router.route("/change-password").post(verifyJWT ,changeCurrentPassword)

// for current user in ui
router.route("/current-user").get(verifyJWT, getCurrentUser)

// for updating account details
router.route("/update-account").patch(verifyJWT, updateUserAccoutDetails)

// for avatar image update
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"),updateAvatarImage)

// for cover image update
router.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)

// user channel profile from params 
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

// user's watch history
router.route("/watch-history").get(verifyJWT,getUserWatchHistory)

export default router