import moment from "moment-timezone";
import mongoose from "mongoose";

const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();

const orderSchema = new mongoose.Schema(
  {
    ordered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "food",
          required: true,
        },
        toppings: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "topping",
          },
        ],
        fillings: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "filling",
          },
        ],
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    orderDate: {
      type: Number,
      default: defaultDate,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered"],
      default: "Pending",
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

const OrderDB = mongoose.model("order", orderSchema, "order");

export default OrderDB;
