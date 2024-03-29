import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'


// database connection in db folder option-2
const connectDB = async() => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`mongoDB is connected !! DB host ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`mongoDB connection failed  `, error);
        process.exit(1)
    }
}


export default connectDB