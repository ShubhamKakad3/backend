import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_KEY_SECRET,
});

// uploading the files on cloudinary
const fileUploadOnCloudinary = async(localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file on cloudinary 
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        console.log(`file uploaded on cloudinary successfully ${response.url}`);
        return response;
    } catch (error) {
      fs.unlinkSync(localFilePath); // it will remove all the locally saved temporary file as the the upload gets faild on cloudinary
        console.log('file upload on cloudinary failed');
        return null
    }
}
export { fileUploadOnCloudinary };