import express from "express";
import Controller from "../controllers/FoodCtrl.js";
import middleware from "../middleware/Auth.js";

const foodRouter = express.Router();

// FOOD CREATE (POST): /api/v1
foodRouter.post("/", middleware.protect, Controller.create);

// FOOD DETAIL (GET): /api/v1/food/detail/:id
foodRouter.get("/detail/:id", middleware.protect, Controller.detail);

// FOOD VIEW ALL (GET): /api/v1
foodRouter.get("/", middleware.protect, Controller.get);

// FOOD (DELETE): /api/v1
foodRouter.delete("/", middleware.protect, Controller.delete);

export default foodRouter;
