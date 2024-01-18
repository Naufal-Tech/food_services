import express from "express";
import Controller from "../controllers/AddressCtrl.js";
import middleware from "../middleware/Auth.js";

// Pakai Express Router
const addressRouter = express.Router();

// CREATE BOOKING (POST): /api/v1/booking
addressRouter.post("/", middleware.protect, Controller.create);

// UPDATE BOOKING (PATCH): /api/v1/booking/:id
addressRouter.patch("/update", middleware.protect, Controller.update);

// UPDATE BOOKING (GET): /api/v1/booking/:id
addressRouter.get("/detail/:id", middleware.protect, Controller.detail);

// DELETE BOOKING (DELETE): /api/v1/booking/:id
addressRouter.delete("/", middleware.protect, Controller.delete);

// VIEW ALL BOOKING (GET): /api/v1/booking
addressRouter.get("/", middleware.protect, Controller.get);

export default addressRouter;
