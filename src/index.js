import dotenv from 'dotenv'    // conf required 
import connectDB from './db/index.js'
import app from './app.js'
dotenv.config({path:'./env'})


// database function call
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8100, () => {
            console.log(`app is listening at ${process.env.PORT}`);
        })
    })
    .catch((error) => {
        console.log("mongoDB connection failed !!!",error);
    })



































/*
// database connection in index file directly  option-1
import mongoose from "mongoose";
import express from "express";
import {DB_NAME} from './constants.js'
const app = express()
;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (error) =>{
            console.log('error', error);
            throw error    
        })
        
        app.listen(process.env.PORT, () => {
            console.log(` app is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.log('mongobd connection failed', error);
        throw error
    }
})()
*/
