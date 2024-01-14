import { ApiErrors } from "../utils/ApiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


// this middleware is verifying the user for logout 
export const verifyJWT = asyncHandler(async (req,_,next) => {
    try {
        //read jwt in details
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if (!token) {
                 throw new ApiErrors(401, " unauthorised request ")
             }
         const decodedToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken");
         
        if (!user) {
            // frontend remain
            throw new ApiErrors(401,"invalid access token")
        }

        req.user = user
        next()

        
    } catch (error) {
        throw new ApiErrors(401, error?.message || "invalid access token ")
    }
})