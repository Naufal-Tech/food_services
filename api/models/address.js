import moment from "moment-timezone";
import mongoose from "mongoose";

const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();

const AddressSchema = new mongoose.Schema(
  {
    country: {
      type: String,
    },

    city: {
      type: String,
    },

    street: {
      type: String,
    },

    postalCode: {
      type: Number,
    },

    /* CONFIG */
    created_at: {
      type: Date,
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

const AddressDB = mongoose.model("address", AddressSchema, "address");

export default AddressDB;
