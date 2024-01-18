import express from "express";
import Controller from "../controllers/UserCtrl.js";
import middleware from "../middleware/Auth.js";
import { upload } from "../middleware/multerMiddleware.js";
import { validateUser } from "../models/user.js";

const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, //15 menit
  max: 10, // ten request max in 15 menit
  message:
    "Too many requests from this IP address, please try again after 15 minutes",
});

// Pakai Express Router
const userRouter = express.Router();

//POST: /api/v1/users/register
userRouter.post(
  "/register",
  upload.single("img_profile"),
  validateUser,
  apiLimiter,
  Controller.register
);

//POST: /api/v1/users/login
userRouter.post("/login", upload.none(), Controller.login);

//PATCH: /api/v1/users/update
userRouter.patch(
  "/",
  upload.single("img_profile"),
  middleware.protect,
  Controller.update
);

//DELETE: /api/v1/users/delete
userRouter.delete("/", upload.none(), middleware.protect, Controller.delete);

//GET: /api/v1/users/delete
userRouter.get(
  "/detail/:id",
  upload.none(),
  middleware.protect,
  Controller.detail
);

//GET: /api/v1/users/info
userRouter.get("/info", upload.none(), middleware.protect, Controller.infoUser);

//GET: /api/v1/users/
userRouter.get("/", upload.none(), middleware.protect, Controller.get);

//GET/api/v1/users/logout
userRouter.get("/logout", upload.none(), Controller.logout);

export default userRouter;
