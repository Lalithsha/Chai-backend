// Controllers -> Functionality

// middlewares -> code to run in-between -> agar koii request aye aur server pe jane ke pehle mai koii checking lagana chahta
// hu toh mai middle ware mai karta hu. -> example cookies.

// utils -> utilities -> file upload utility example: profile, videos.
// mail utility , token utility. -> jo functionlity jo baar baar repeat hoti hai kiyu na usse ek file folder mai
// rakh diya jaye aur uska naam Utilities naam rakh diya jaye 

// require('dotenv').config() // This is used to shared the env to all the files of the project for usage.
import dotenv from "dotenv"; // The above code reduces the code consistency so we have used thir apporoach of first 
// importing the dotenv and then using it later. 

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";
import { app } from "./app.js"

dotenv.config({
    path: './env'
})


connectDB()
    .then(() => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(` Server is running at port: ${process.env.PORT}`)
        })
    })
    .catch((error) => {
        console.log("MongoDB db connection failed !!!! ", error)
    })




































// First way to connect to database in index.js file using if e approach.
/* import express from "express";
const app = express();

(async () => { // database connection 
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("Error", (error) => {
            console.log("Error: ", error);
            throw error;
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Error: ", error);
        throw error
    }
})() */
