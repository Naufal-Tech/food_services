import dotenv from "dotenv";
import moment from "moment-timezone";
import {
  BadRequestError,
  NotFoundError,
  UnAuthenticatedError,
} from "../errors/index.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");

// Configure Cloudinary
dotenv.config();

const AddressController = {
  create: async function (req, res) {
    const { country, city, street, postalCode } = req.body;

    // Validation
    if (!country || !city || !street) {
      throw new BadRequestError("Please Provide All Values");
    }

    try {
      const address = new models.AddressDB({
        country,
        city,
        street,
        postalCode,
        created_by: req.user._id,
      });

      await address.save();

      const formattedCreatedAt = moment(address.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      // Push or update the user address field
      const userId = req.user._id;
      await models.UserDB.findByIdAndUpdate(userId, {
        $push: { address: address._id },
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Address Created Successfully",
        address: {
          ...address.toObject(),
          created_at: formattedCreatedAt,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Address Creation Failed",
      });
    }
  },

  update: async function (req, res) {
    const { address_id, country, city, street, postalCode } = req.body;

    // Validation
    if (!country && !city && !street && !postalCode) {
      throw new BadRequestError("Please provide at least one field to update");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const address = await models.AddressDB.findById(address_id);

      if (!address) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Tour is not found",
        });
      }

      if (country) {
        address.country = country;
      }

      if (city) {
        address.city = city;
      }

      if (street) {
        address.street = street;
      }

      if (postalCode) {
        address.postalCode = postalCode;
      }

      address.updated_at = defaultDate();
      address.updated_by = req.user._id;

      const formattedCreatedAt = moment(address.created_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      const formattedUpdatedAt = moment(address.updated_at)
        .tz("Asia/Jakarta")
        .format("DD-MM-YYYY HH:mm:ss");

      await address.save();
      await session.commitTransaction();
      session.endSession();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Address updated successfully",
        address: {
          ...address.toObject(),
          created_at: formattedCreatedAt,
          updated_at: formattedUpdatedAt,
        },
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Address Updated Failed",
      });
    }
  },

  detail: async function (req, res) {
    const { id } = req.params;

    try {
      const address = await models.AddressDB.findOne({
        _id: id,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!address) {
        return response.error(404, "Address is not found", res);
      }

      const convertedAddress = {
        ...address.toObject(),
        created_at: moment
          .tz(address.created_at, "Asia/Jakarta")
          .format("DD-MM-YYYY HH:mm:ss"),
        ...(address.updated_at
          ? {
              updated_at: moment
                .tz(address.updated_at, "Asia/Jakarta")
                .format("DD-MM-YYYY HH:mm:ss"),
            }
          : {}),
      };

      return response.ok(
        convertedAddress,
        res,
        "Successfully Retrieved Address"
      );
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  get: async function (req, res) {
    const { country, city, search, sort, page = 1, limit = 10 } = req.query;

    try {
      const queryObject = {
        deleted_at: { $exists: false },
        deleted_by: { $exists: false },
      };

      if (city) {
        queryObject.city = { $regex: new RegExp(city, "i") };
      }

      if (country) {
        queryObject.country = { $regex: new RegExp(country, "i") };
      }

      if (search) {
        const searchRegExp = new RegExp(search, "i");
        queryObject.$or = [{ city: searchRegExp }, { country: searchRegExp }];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let sortOption = {};
      if (sort === "Recently") {
        sortOption = { created_at: -1 };
      } else if (sort === "Oldest") {
        sortOption = { created_at: 1 };
      } else if (sort === "A-Z") {
        sortOption = { city: 1 };
      } else if (sort === "Z-A") {
        sortOption = { city: -1 };
      } else {
        sortOption = { created_at: -1 };
      }

      const address = await models.AddressDB.find(queryObject)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit));

      const totalAddress = await models.AddressDB.countDocuments(queryObject);

      res.status(StatusCodes.OK).json({
        address,
        currentPage: page,
        totalAddress,
        numOfPages: Math.ceil(totalAddress / parseInt(limit)),
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch address",
      });
    }
  },

  delete: async function (req, res) {
    const { address_id } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const address = await models.AddressDB.findOne({
        _id: address_id,
        deleted_at: { $exists: false },
        deleted_by: { $exists: false },
      });

      if (!address) {
        throw new NotFoundError(
          `Delete Address failed, address does not exist with id: ${address_id}`
        );
      }

      console.log("address created by", address.created_by);

      console.log("user", req.user._id);

      if (
        req.user.role != "Admin" &&
        toString(address.created_by) != toString(req.user._id)
      ) {
        throw new UnAuthenticatedError(
          "You do not have permission to delete this address."
        );
      }

      const deletionInfo = {
        deleted_at: defaultDate(),
        deleted_by: req.user._id,
      };

      await models.AddressDB.updateOne({ _id: address_id }, deletionInfo, {
        session,
      });

      await session.commitTransaction();
      session.endSession();

      res
        .status(StatusCodes.OK)
        .json({ success: true, message: "Successfully Delete a Address" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: `Delete Address failed, An error occurred while deleting the Address with id: ${address_id}`,
      });
    }
  },
};

export default AddressController;
