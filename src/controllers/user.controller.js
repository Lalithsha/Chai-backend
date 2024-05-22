import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

// Register user
const registerUser = asyncHandler(async (req, res) => {
    /* res.status(200).json({
        message: "ok"
    }) */

    // 1. Get user details from frontend
    const { fullName, email, username, password } = req.body
    // console.log("email: ", email);
    // console.log(req.body, "body")

    // Validation. check whether anything is empty is not. 
    /* if (fullname === "") {
        throw new ApiError(400, "Full name is required")
    } */

    if ( // 2. Validation - not empty
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    // email filtering  // string ka kaunsa method hai ki check ho ki usem @ hai ki nahi 

    // 3. Check if any user already 
    const existedUser = await User.findOne({
        // Operators 
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. Check for image, check for avatar
    // console.log(req.files, "Checking files are present or not"); // checking
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // cover image local path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // Checking if cover image is exits
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Learning Purpose 
    // console.log(req.files, " req files")

    // checking avatar came from server
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avartar file is required");
    }

    // 5. Upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const converImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // 6. Create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: converImage?.url || "",// Above we have checed for avatar is present or not
        // but we have not check for coverImage though cover image is not compulsory but it will break the code 
        // so checking here that if exists then fine else add/get a empty string.
        email,
        password,
        username: username.toLowerCase()

    })

    // 7. Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        // Fields you do not want from response.
        "-password -refreshToken"
    );

    // 8. check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while whlie registering the user")
    }
    console.log(createdUser, "Hello JI created user here")

    // 9. Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered scuccessfully")
    )


})











export { registerUser }

















