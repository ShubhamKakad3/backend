import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAccessToken } from "../controllers/user.controller.js";
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





export default router