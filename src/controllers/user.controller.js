import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {

    try {

        const user = await User.findById(userId)
        // Generating access and refresh tokens based on userid's
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Saving refresh tokens in db
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        // Here access token is also generated / saved 
        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }

}


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


// Login user
const loginUser = asyncHandler(async (req, res) => {

    /* 
    // Todos:
     1. req body -> data
     2. username or email
     3. Find the user
     4. Password check
     5. Access and refresh token
     6. Send token in cookie
     */

    // 1.
    const { email, username, password } = req.body;

    if (!username && !email) { // I need both username and email
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, " User does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // 5
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // logged in user 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // 6 
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in Successfully"
            )
        )

})


const logoutUser = asyncHandler(async (req, rest) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
        }
    },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }
    return rest.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out "))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unathroized request") // Token is not correct/available
    }

    try {

        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new Error(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or userd")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return response.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))

})


const getCurrentUser = asyncHandler(async (req, res) => {


    return res.status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))

})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))

})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment


    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "avatar image updated successfully"))


})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "cover image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    // Getting a document
    const channel = await User.aggregate([
        {
            $match: { // user matching
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: { // counting user's subscriber count using channel
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel", // using this we wil get subscribers
                as: "subscribers"
            }
        },
        {
            $lookup: { // counting user's channel through its subscriber count.
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber", // using this we wil get subscribers
                as: "subscribedTo" // People you have subscribed. This is just a naming convention
            }
        },
        {
            $addFields: { // Adding additional fields to user model, Added fields are subscribresCount,channelSubscribedTo and more.
                subscribersCount: {
                    // calcuate subscribers
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $condition: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // After performing the about tasks, sharing the required fields.
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ]
    )
    console.log(channel, "from user controller doing channel")

    if (!channel?.length) {
        throw new ApiError(404, " channel does not exist")
    }

    return res.status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos", // In video.model at the end you have exported Video so here lowecase with plural happens interally so doing that here explicity.
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [ // using a pipline for getting owner after getting the watchHistory from user.
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ // Using a sub-pipeline for only getting required fields so that we can avoid username, fullname, coverimage non required fields.
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                },
                                { // for improving the returing structore of data (Array)
                                    $addFields: {
                                        owner: {
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }

    ])

    return res.status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully"))

})




export {
    registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser,
    updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile
}

















