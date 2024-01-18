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

// TOPPING (DELETE MANY): /api/v1/food
toppingRouter.delete("/", middleware.protect, Controller.delete);

// TOPPING (DELETE SINGLE or PULL SINGLE): /api/v1/food/single
toppingRouter.delete("/single", middleware.protect, Controller.deleteOne);

// TOPPING (PATCH or UPDATE SINGLE): /api/v1/food/push
toppingRouter.patch("/push", middleware.protect, Controller.push);

export default toppingRouter;
