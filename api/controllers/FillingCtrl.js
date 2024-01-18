import moment from "moment-timezone";
import { NotFoundError } from "../errors/index.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

const FillingController = {
  // Create Filling
  create: async function (req, res) {
    try {
      const { food_id, filling_name, price } = req.body;

      const filling = new models.FillingDB({
        filling_name,
        price,
        created_by: req.user._id,
      });

      await filling.save();

      const food = await models.FoodDB.findOneAndUpdate(
        { _id: food_id },
        { $push: { fillings: filling._id } },
        { new: true }
      );

      if (!food) {
        return response.error(404, "Food not found", res);
      }

      const createdAt = moment(filling.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      return response.create(
        {
          _id: filling._id,
          filling_name: filling.filling_name,
          price: filling.price,
          created_by: req.user._id,
          created_at: createdAt,
        },
        res,
        "Filling created successfully"
      );
    } catch (error) {
      console.error(error);
      return response.INTERNAL_SERVER_ERROR(
        res,
        "Internal Server Error Message"
      );
    }
  },

  // Detail Filling
  detail: async function (req, res) {
    const { id } = req.params;

    try {
      const filling = await models.FillingDB.findOne({
        _id: id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!filling) {
        return response.error(404, "Filling is not found", res);
      }

      const createdAt = moment(filling.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const updatedAt = moment(filling.updated_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const responseData = {
        _id: filling._id,
        filling_name: filling.filling_name,
        price: filling.price,
        created_at: createdAt,
        updated_at: filling.updated_at ? updatedAt : null,
      };

      return response.ok(responseData, res, "Successfully Retrieved Filling");
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  // View Filling:
  get: async function (req, res) {
    const {
      startDate,
      endDate,
      filling,
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

      if (filling) {
        queryObject.filling_name = filling;
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

      const fillingData = await models.FillingDB.find(queryObject)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

      const totalFilling = await models.FillingDB.countDocuments(queryObject);

      const fillingWithFormattedDates = fillingData.map((item) => {
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
        filling: fillingWithFormattedDates,
        currentPage: page,
        totalFilling,
        numOfPages: Math.ceil(totalTopping / parseInt(limit)),
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch food",
      });
    }
  },

  // Delete Filling
  delete: async function (req, res) {
    const { filling_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const filling = await models.FillingDB.findOne({ _id: filling_id });

      if (!filling) {
        throw new NotFoundError(
          `Delete Filling failed, Filling does not exist with id: ${filling_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.FillingDB.updateOne({ _id: filling_id }, deletionInfo, {
        session,
      });

      await models.FoodDB.updateMany(
        { fillings: filling_id },
        { $pull: { fillings: filling_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete Filling" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Filling failed, an error occurred while deleting the Filling with id: ${filling_id}`,
      });
    }
  },

  // Filling Delete
  deleteOne: async function (req, res) {
    const { food_id, filling_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const filling = await models.FillingDB.findOne({ _id: filling_id });

      if (!filling) {
        throw new NotFoundError(
          `Delete Filling failed, Filling does not exist with id: ${filling_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.FillingDB.updateOne({ _id: filling_id }, deletionInfo, {
        session,
      });

      await models.FoodDB.updateOne(
        { _id: food_id, fillings: filling_id },
        { $pull: { fillings: filling_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete Filling" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Filling failed, an error occurred while deleting the Filling with id: ${filling_id}`,
      });
    }
  },

  // Filling Push One to FoodDB
  push: async function (req, res) {
    const { food_id, filling_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const filling = await models.FillingDB.findOne({ _id: filling_id });

      if (!filling) {
        throw new NotFoundError(
          `Push Filling failed, Filling does not exist with id: ${filling_id}`
        );
      }

      await models.FoodDB.updateOne(
        { _id: food_id },
        { $push: { fillings: filling_id } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Successfully Push Filling to FoodDB",
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Push Filling failed, an error occurred while pushing the Filling with id: ${filling_id} to FoodDB with id: ${food_id}`,
      });
    }
  },

  // Restore Filling
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

export default FillingController;
