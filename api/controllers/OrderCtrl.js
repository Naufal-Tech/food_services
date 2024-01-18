import moment from "moment-timezone";
import { NotFoundError } from "../errors/index.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

const OrderController = {
  // Order Create
  create: async function (req, res) {
    try {
      const { items } = req.body;

      // Validate required fields
      if (!items) {
        throw new BadRequestError(
          "Please provide all required fields for the order."
        );
      }

      // Calculate totalAmount
      const totalAmount = await userHelper.calculateTotalAmount(items);

      // Create the order
      const order = await models.OrderDB.create({
        items,
        totalAmount: totalAmount,
        ordered_by: req.user._id,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Order created successfully.",
        order,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create the order.",
      });
    }
  },

  // Detail Order
  detail: async function (req, res) {
    const { order_id } = req.params;

    try {
      const order = await models.OrderDB.findOne({
        _id: order_id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!order) {
        return response.error(404, "Order is not found", res);
      }

      const createdAt = moment(order.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const updatedAt = moment(order.updated_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const responseData = {
        _id: order._id,
        ordered_by: order.order_by,
        items: order.items,
        created_at: createdAt,
        updated_at: order.updated_at ? updatedAt : null,
      };

      return response.ok(responseData, res, "Successfully Retrieved Order");
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  // View All Order
  get: async function (req, res) {
    const {
      startDate,
      endDate,
      status,
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

      if (status) {
        queryObject.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let sortOption = {};
      if (sort === "Recently") {
        sortOption = { created_at: -1 };
      } else if (sort === "Oldest") {
        sortOption = { created_at: 1 };
      } else if (sort === "A-Z") {
        sortOption = { status: 1 };
      } else if (sort === "Z-A") {
        sortOption = { status: -1 };
      } else {
        sortOption = { created_at: -1 };
      }

      const orderData = await models.OrderDB.find(queryObject)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

      const totalOrder = await models.OrderDB.countDocuments(queryObject);

      const orderWithFormattedDates = orderData.map((item) => {
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
        order: orderWithFormattedDates,
        currentPage: page,
        totalOrder,
        numOfPages: Math.ceil(totalTopping / parseInt(limit)),
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch order",
      });
    }
  },

  // Delete Order
  delete: async function (req, res) {
    const { order_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await models.OrderDB.findOne({ _id: order_id });

      if (!order) {
        throw new NotFoundError(
          `Delete Order failed, Order does not exist with id: ${order_id}`
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.OrderDB.updateOne({ _id: order_id }, deletionInfo, {
        session,
      });

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete a Order" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Order failed, an error occurred while deleting the Order with id: ${order_id}`,
      });
    }
  },

  // Order Restore
  restore: async function (req, res) {
    const { order_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await models.OrderDB.findOne({ _id: order_id });

      if (!order) {
        throw new NotFoundError(
          `Restore Order failed, Order does not exist with id: ${order_id}`
        );
      }

      if (order.deleted_at && order.deleted_by) {
        await models.OrderDB.updateOne(
          { _id: order_id },
          {
            $unset: {
              order_at: 1,
              order_by: 1,
            },
          },
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        res
          .status(StatusCodes.OK)
          .json({ success: true, message: "Successfully Restored a Order" });
      } else {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `Restore Order failed, Order with id: ${order_id} is not deleted or already restored`,
        });
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Restore Order failed, an error occurred while restoring the Order with id: ${order_id}`,
      });
    }
  },
};

export default OrderController;
