import dotenv from "dotenv";

dotenv.config({
  debug: true,
  encoding: "UTF-8",
  path: process.env.NODE_ENV == "dev" ? ".env.local" : ".env.prod",
});

console.log(
  `Environment: ${process.env.NODE_ENV == "dev" ? "Development" : "Production"}`,
);

const devEnv = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PEPPER_SECRET: process.env.PINECONE_API_KEY,
  GPT5_NANO_API_KEY: process.env.GPT5_NANO_API_KEY,
  CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY
};

const prodEnv = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PEPPER_SECRET: process.env.PINECONE_API_KEY,
  GPT5_NANO_API_KEY: process.env.GPT5_NANO_API_KEY,
  CONFIDENCE_THRESHOLD: process.env.CONFIDENCE_THRESHOLD,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY
};

export const envConfig = process.env.NODE_ENV == "dev" ? devEnv : prodEnv;
