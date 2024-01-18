import express from "express";
import Controller from "../controllers/FillingCtrl.js";
import middleware from "../middleware/Auth.js";

const fillingRouter = express.Router();

// TOPPING CREATE (POST): /api/v1
fillingRouter.post("/", middleware.protect, Controller.create);

// TOPPING DETAIL (GET): /api/v1/food/detail/:id
fillingRouter.get("/detail/:id", middleware.protect, Controller.detail);

// TOPPING VIEW ALL (GET): /api/v1
fillingRouter.get("/", middleware.protect, Controller.get);

// TOPPING (DELETE): /api/v1
fillingRouter.delete("/", middleware.protect, Controller.delete);

// TOPPING (DELETE): /api/v1
fillingRouter.delete("/single", middleware.protect, Controller.deleteOne);

// TOPPING (DELETE): /api/v1
fillingRouter.patch("/push", middleware.protect, Controller.push);

export default fillingRouter;
