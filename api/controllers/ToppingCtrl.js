import moment from "moment-timezone";
import { NotFoundError } from "../errors/index.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

const ToppingController = {
  // Create Topping
  create: async function (req, res) {
    try {
      const { food_id, topping_name, price } = req.body;

      const topping = new models.ToppingDB({
        topping_name,
        price,
        created_by: req.user._id,
      });

      await topping.save();

      const food = await models.FoodDB.findOneAndUpdate(
        { _id: food_id },
        { $push: { toppings: topping._id } },
        { new: true }
      );

      if (!food) {
        return response.error(404, "Food not found", res);
      }

      const createdAt = moment(topping.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      return response.create(
        {
          _id: topping._id,
          topping_name: topping.topping_name,
          price: topping.price,
          created_by: req.user._id,
          created_at: createdAt,
        },
        res,
        "Topping created successfully"
      );
    } catch (error) {
      console.error(error);
      return response.INTERNAL_SERVER_ERROR(
        res,
        "Internal Server Error Message"
      );
    }
  },

  // Detail Topping
  detail: async function (req, res) {
    const { id } = req.params;

    try {
      const topping = await models.ToppingDB.findOne({
        _id: id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!topping) {
        return response.error(404, "Topping is not found", res);
      }

      const createdAt = moment(topping.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const updatedAt = moment(topping.updated_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const responseData = {
        _id: topping._id,
        filling_name: topping.topping_name,
        price: topping.price,
        created_at: createdAt,
        updated_at: topping.updated_at ? updatedAt : null,
      };

      return response.ok(responseData, res, "Successfully Retrieved Topping");
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  // View All Topping
  get: async function (req, res) {
    const {
      startDate,
      endDate,
      topping,
      page = 1,
      limit = 10,
      sort = "Recently",
    } = req.query;

    try {
      const queryObject = {
        deleted_at: { $exists: false },
        deleted_by: { $exists: false },
      };

      if (startDate) {
        queryObject.created_at = {
          $gte: moment(startDate).startOf("day").valueOf(),
        };
      }

      if (endDate) {
        queryObject.created_at = {
          ...queryObject.created_at,
          $lte: moment(endDate).endOf("day").valueOf(),
        };
      }

      if (topping) {
        queryObject.topping_name = topping;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let sortOption = {};
      if (sort === "Recently") {
        sortOption = { created_at: -1 };
      } else if (sort === "Oldest") {
        sortOption = { created_at: 1 };
      } else if (sort === "A-Z") {
        sortOption = { topping_name: 1 };
      } else if (sort === "Z-A") {
        sortOption = { topping_name: -1 };
      } else {
        sortOption = { created_at: -1 };
      }

      const toppingData = await models.ToppingDB.find(queryObject)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

      const totalTopping = await models.ToppingDB.countDocuments(queryObject);

      const toppingWithFormattedDates = toppingData.map((item) => {
        return {
          ...item.toObject(),
          created_at: moment(item.created_at)
            .tz("Asia/Jakarta")
            .format("DD-MM-YYYY HH:mm:ss"),
          updated_at: item.updated_at
            ? moment(item.updated_at)
                .tz("Asia/Jakarta")
                .format("DD-MM-YYYY HH:mm:ss")
            : null,
        };
      });

      res.status(StatusCodes.OK).json({
        topping: toppingWithFormattedDates,
        currentPage: page,
        totalTopping,
        numOfPages: Math.ceil(totalTopping / parseInt(limit)),
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch food",
      });
    }
  },

  // Topping Delete
  delete: async function (req, res) {
    const { topping_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const topping = await models.ToppingDB.findOne({ _id: topping_id });

      if (!topping) {
        throw new NotFoundError(
          `Delete Topping failed, Topping does not exist with id: ${topping_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.ToppingDB.updateOne({ _id: topping_id }, deletionInfo, {
        session,
      });

      await models.FoodDB.updateMany(
        { toppings: topping_id },
        { $pull: { toppings: topping_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete a Topping" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Topping failed, an error occurred while deleting the Topping with id: ${topping_id}`,
      });
    }
  },

  // Topping Delete
  deleteOne: async function (req, res) {
    const { food_id, topping_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const topping = await models.ToppingDB.findOne({ _id: topping_id });

      if (!topping) {
        throw new NotFoundError(
          `Delete Topping failed, Topping does not exist with id: ${topping_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.ToppingDB.updateOne({ _id: topping_id }, deletionInfo, {
        session,
      });

      await models.FoodDB.updateOne(
        { _id: food_id, toppings: topping_id },
        { $pull: { toppings: topping_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete a Topping" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Topping failed, an error occurred while deleting the Topping with id: ${topping_id}`,
      });
    }
  },

  push: async function (req, res) {
    const { food_id, topping_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const topping = await models.ToppingDB.findOne({ _id: topping_id });

      if (!topping) {
        throw new NotFoundError(
          `Push Topping failed, Topping does not exist with id: ${topping_id}`
        );
      }

      // Push the specified topping to the related FoodDB document
      await models.FoodDB.updateOne(
        { _id: food_id },
        { $push: { toppings: topping_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Successfully Push Topping to FoodDB",
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Push Topping failed, an error occurred while pushing the Topping with id: ${topping_id} to FoodDB with id: ${food_id}`,
      });
    }
  },

  // Restore Topping
  restore: async function (req, res) {
    const { topping_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const topping = await models.ToppingDB.findOne({ _id: topping_id });

      if (!topping) {
        throw new NotFoundError(
          `Restore Topping failed, Topping does not exist with id: ${topping_id}`
        );
      }

      if (topping.deleted_at && topping.deleted_by) {
        await models.ToppingDB.updateOne(
          { _id: topping_id },
          {
            $unset: {
              deleted_at: 1,
              deleted_by: 1,
            },
          },
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        res
          .status(StatusCodes.OK)
          .json({ success: true, message: "Successfully Restored a Topping" });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `Restore Topping failed, Topping with id: ${topping_id} is not deleted or already restored`,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Restore Topping failed, an error occurred while restoring the Topping with id: ${topping_id}`,
      });
    }
  },
};

export default ToppingController;
