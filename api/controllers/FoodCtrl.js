import moment from "moment-timezone";
import { NotFoundError } from "../errors/index.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

const FoodController = {
  // Create Food
  create: async function (req, res) {
    try {
      const { food_name, price } = req.body;

      const food = new models.FoodDB({
        food_name,
        price,
        created_by: req.user._id,
      });

      await food.save();

      const createdAt = moment(food.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      return response.create(
        {
          _id: food._id,
          food_name: food.food_name,
          price: food.price,
          created_by: food.created_by,
          created_at: createdAt,
        },
        res,
        "Food created successfully"
      );
    } catch (error) {
      console.error(error);
      return response.INTERNAL_SERVER_ERROR(
        res,
        "Internal Server Error Message"
      );
    }
  },

  // Detail Food
  detail: async function (req, res) {
    const { id } = req.params;

    try {
      const food = await models.FoodDB.findOne({
        _id: id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!food) {
        return response.error(404, "Food is not found", res);
      }

      const convertTimestamps = (item) => {
        if (item) {
          item.created_at = moment(item.created_at)
            .tz("Asia/Jakarta")
            .format("DD-MM-YYYY HH:mm:ss");
          item.updated_at = moment(item.updated_at)
            .tz("Asia/Jakarta")
            .format("DD-MM-YYYY HH:mm:ss");
        }
        return item;
      };

      const convertTimestampsForArray = (array) => {
        return array.map((item) => convertTimestamps(item));
      };

      const createdAt = moment(food.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const updatedAt = moment(food.updated_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const responseData = {
        _id: food._id,
        food_name: food.food_name,
        price: food.price,
        toppings: convertTimestampsForArray(food.toppings),
        fillings: convertTimestampsForArray(food.fillings),
        created_at: createdAt,
        updated_at: food.updated_at ? updatedAt : null,
      };

      return response.ok(responseData, res, "Successfully Retrieved Food");
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  // Get Food:
  get: async function (req, res) {
    const {
      startDate,
      endDate,
      food,
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

      if (food) {
        queryObject.food_name = food;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let sortOption = {};
      if (sort === "Recently") {
        sortOption = { created_at: -1 };
      } else if (sort === "Oldest") {
        sortOption = { created_at: 1 };
      } else if (sort === "A-Z") {
        sortOption = { food_name: 1 };
      } else if (sort === "Z-A") {
        sortOption = { food_name: -1 };
      } else {
        sortOption = { created_at: -1 };
      }

      const foodData = await models.FoodDB.find(queryObject)
        .populate("toppings")
        .populate("fillings")
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

      const totalFood = await models.FoodDB.countDocuments(queryObject);

      const foodWithFormattedDates = foodData.map((item) => {
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
        food: foodWithFormattedDates,
        currentPage: page,
        totalFood,
        numOfPages: Math.ceil(totalFood / parseInt(limit)),
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch food",
      });
    }
  },

  // Food Delete
  delete: async function (req, res) {
    const { food_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const food = await models.FoodDB.findOne({ _id: food_id });

      if (!food) {
        throw new NotFoundError(
          `Delete Food failed, Food does not exist with id: ${food_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.FoodDB.updateOne({ _id: food_id }, deletionInfo, {
        session,
      });

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete a Food" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Food failed, an error occurred while deleting the Food with id: ${food_id}`,
      });
    }
  },

  // Restore Food
  restore: async function (req, res) {
    const { food_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const food = await models.FoodDB.findOne({ _id: food_id });

      if (!food) {
        throw new NotFoundError(
          `Restore Food failed, Food does not exist with id: ${food_id}`
        );
      }

      if (food.deleted_at && food.deleted_by) {
        await models.ToppingDB.updateOne(
          { _id: food_id },
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
          message: `Restore Food failed, Food with id: ${food_id} is not deleted or already restored`,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Restore Food failed, an error occurred while restoring the Food with id: ${food_id}`,
      });
    }
  },

  // Add Topping and Filling to Food
  addToppingAndFillingToFood: async function (req, res) {
    const { food_id, topping_id, filling_id } = req.body;

    try {
      const food = await models.FoodDB.findOne({
        _id: food_id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!food) {
        throw new NotFoundError(`Food with id ${food_id} not found.`);
      }

      if (topping_id) {
        const topping = await models.ToppingDB.findOne({
          _id: topping_id,
          deleted_by: { $exists: false },
          deleted_at: { $exists: false },
        });

        if (!topping) {
          throw new NotFoundError(`Topping with id ${topping_id} not found.`);
        }

        food.toppings.push(topping_id);
      }

      if (filling_id) {
        const filling = await models.FillingDB.findOne({
          _id: filling_id,
          deleted_by: { $exists: false },
          deleted_at: { $exists: false },
        });

        if (!filling) {
          throw new NotFoundError(`Filling with id ${filling_id} not found.`);
        }

        food.fillings.push(filling_id);
      }

      await food.save();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Topping and/or filling added to food successfully.",
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to add topping and/or filling to food.",
      });
    }
  },
};

export default FoodController;
