import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config()
const {
  NOSQL_DATASOURCE_URL,
  NOSQL_DATASOURCE_USERNAME,
  NOSQL_DATASOURCE_PASSWORD,
  NOSQL_DATASOURCE_DATABASE
} = process.env;

export const config = {
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  MONGO_URI:`mongodb+srv://${NOSQL_DATASOURCE_USERNAME}:${NOSQL_DATASOURCE_PASSWORD}@${NOSQL_DATASOURCE_URL}/?authSource=${NOSQL_DATASOURCE_DATABASE}&authMechanism=SCRAM-SHA-1`
}


export const connectDB = async ()=>{
  try {
    const conn =  await mongoose.connect(config.MONGO_URI,{
      dbName: "dev_giloy" 
    });
      console.log("databaseurl",config.MONGO_URI);
      console.log("Connected DB:", mongoose.connection.name);
  } catch (error) {
    console.log(`Error : ${error.message}`)
  }

}








