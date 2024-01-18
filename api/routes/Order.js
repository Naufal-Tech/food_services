import express from "express";
import Controller from "../controllers/OrderCtrl.js";
import middleware from "../middleware/Auth.js";

const orderRouter = express.Router();

// ORDER CREATE (POST): /api/v1/order/api/v1
orderRouter.post("/", middleware.protect, Controller.create);

// ORDER DETAIL (GET): /api/v1/order/detail/:id
orderRouter.get("/detail/:id", middleware.protect, Controller.detail);

// ORDER VIEW ALL (GET): /api/v1/order/api/v1
orderRouter.get("/", middleware.protect, Controller.get);

// ORDER (DELETE): /api/v1/order/api/v1
orderRouter.delete("/", middleware.protect, Controller.delete);

export default orderRouter;
