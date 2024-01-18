import moment from "moment-timezone";
import mongoose from "mongoose";

const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();

const FoodSchema = new mongoose.Schema(
  {
    food_name: {
      type: String,
      required: true,
      unique: true,
    },

    toppings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "toppings",
      },
    ],

    fillings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "fillings",
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    /* CONFIG */
    created_at: {
      type: Number,
      default: defaultDate,
    },

    updated_at: {
      type: Number,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    deleted_at: {
      type: Number,
    },

    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
      },
    },
  }
);

const FoodDB = mongoose.model("food", FoodSchema, "food");

export default FoodDB;
