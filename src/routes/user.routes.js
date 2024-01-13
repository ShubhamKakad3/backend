import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
const router = Router()

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






export default router