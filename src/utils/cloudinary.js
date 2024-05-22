import { v2 as cloudinary } from 'cloudinary';

import fs from "fs";

// Configuration
cloudinary.config({ // file upload permission configuration
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: 777152546872174,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // File has been uploaded successfully
        // console.log("File is uploaded on cloudinary", response.url) -> log's in console whether file is uploaded successfully

        // unlink the file synchronously
        fs.unlinkSync(localFilePath)
        console.log(response, " This is the response from cloudinary")
        return response;
    }
    catch (error) {
        fs.unlinkSync(localFilePath); // Removed the locally saved temporary file as the upload operation got failed.
        return null;
    }
}


/* // Upload an image
const uploadResult = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg", {
    public_id: "shoes"
}).catch((error) => { console.log(error) }); */



export { uploadOnCloudinary }












