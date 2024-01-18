import express from "express";
import Controller from "../controllers/ToppingCtrl.js";
import middleware from "../middleware/Auth.js";

const toppingRouter = express.Router();

// TOPPING CREATE (POST): /api/v1
toppingRouter.post("/", middleware.protect, Controller.create);

// TOPPING DETAIL (GET): /api/v1/food/detail/:id
toppingRouter.get("/detail/:id", middleware.protect, Controller.detail);

// TOPPING VIEW ALL (GET): /api/v1
toppingRouter.get("/", middleware.protect, Controller.get);

// TOPPING (DELETE): /api/v1
toppingRouter.delete("/", middleware.protect, Controller.delete);

// TOPPING (DELETE): /api/v1
toppingRouter.delete("/single", middleware.protect, Controller.deleteOne);

export default toppingRouter;
