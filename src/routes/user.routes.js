import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";


const router = Router()


router.route("/register").post(
    upload.fields([

        // avatar & cover image
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        }

    ]),
    // Method execution, above is the middleware
    registerUser
)
// router.route("/login").post(login)














export default router
