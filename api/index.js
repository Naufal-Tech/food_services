import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import "./globalModules.js";
// import dotenv from "dotenv";
import express from "express";
import "express-async-errors";
import mongoose from "mongoose";
import morgan from "morgan";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/connectDB.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";
import {
  globalErrHandler,
  notFoundErr,
} from "./middleware/globalErrHandler.js";
// import userRouter from "./routes/User.js";
import os from "os";
import routes from "./routes.js";

// Security
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import xss from "xss-clean";

/*** Invoke Express***/
const app = express();

/*** Invoke DOT-ENV***/
// dotenv.config();

//middlewares
app.use(express.json()); //pass incoming payload

// Setting up bodyParser:
app.use(express.urlencoded({ limit: "30mb", extended: true }));

// Set limit upload 30mb
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(bodyParser.json());
app.use(express.json());

// SETTING CORS:
app.use(cors());
app.options("*", cors());

// Cookie:
app.use(cookieParser());

// SECURITY
app.use(helmet());
app.use(xss());

// Schedule cron jobs
cronSchedule.calculatePenalty();

// Sanitize attack/prevent MongoDB injection
app.use(mongoSanitize());

// morgan untuk tracing http request dari client
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Middleware to log request details
app.use((req, res, next) => {
  const timestamp = moment().tz("Asia/Jakarta").format("DD-MM-YYYY");
  const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
  console.log(
    `URL: ${req.url}, Method: ${req.method}, Date: [${timestamp}] , Time: [${time}]`
  );
  next();
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, PUT, GET, POST, PATCH");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Setup static and middleware: (render assest static on public folder, css jpeg dsb)
app.use(express.static("./public"));

// Routes:
// app.use("/api/v1/users", userRouter);
routes(app);

// Setting Path:
const __dirname = dirname(fileURLToPath(import.meta.url));

// Sesuaikan Nama Folder FE
app.use(express.static(path.resolve(__dirname, "images")));

// Database Connection:
mongoose.set("strictQuery", false);

// Call the connectDB function
connectDB();

// method returns the system uptime in seconds
try {
  console.log(`The System Uptime is ${os.uptime()} seconds`);

  const currentOS = {
    name: os.type(),
    release: os.release(),
    totalMem: (os.totalmem() / (1024 * 1024)).toFixed(2) + " GB", // Convert to megabytes and add " GB"
    freeMem: (os.freemem() / (1024 * 1024)).toFixed(2) + " GB",
  };
  console.log("Your Current OS:", currentOS);
} catch (error) {
  console.error("An error occurred:", error);
}

// Define a simple route handler to indicate that the server is running
app.use("/test", (req, res) => {
  res.send("Server is running");
});

app.use("/api/v1/users/test", (req, res) => {
  res.json({ message: "Server is running" });
});

//Error Handlers Middleware
app.use(globalErrHandler);

// Not Found Error
app.use(notFoundErr);

//Error Handlers Middleware
app.use(errorHandlerMiddleware);

//404 error
app.use("*", (req, res) => {
  console.log(req.originalUrl);
  res.status(404).json({
    error: "Not Found",
    message: `The requested URL '${req.originalUrl}' was not found on this server.`,
  });
});

//Listen to server
const PORT = process.env.PORT || 9000;

app.listen(PORT, console.log(`Server is up and running on ${PORT}`));
