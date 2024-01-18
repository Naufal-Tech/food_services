import moment from "moment-timezone";
import mongoose from "mongoose";

const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();

const fillingSchema = new mongoose.Schema(
  {
    filling_name: {
      type: String,
      required: true,
    },

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

const FillingDB = mongoose.model("fillings", fillingSchema, "fillings");

export default FillingDB;
