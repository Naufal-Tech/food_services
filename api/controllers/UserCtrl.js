import bcrypt from "bcrypt";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import moment from "moment-timezone";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import { generateToken } from "../helpers/userHelper.js";
import { formatImage } from "../middleware/multerMiddleware.js";
import attachCookies from "../utils/attachCookies.js";
import { hashPassword } from "../utils/userPassword.js";
const defaultDate = () => moment.tz(Date.now(), "Asia/Jakarta").valueOf();
const current_date = moment().tz("Asia/Jakarta").format();

dotenv.config();
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const UserController = {
  register: async function (req, res) {
    const { username, email, phoneNumber, password, fullName, role } = req.body;

    // Validation
    if (!username || !email || !password || !fullName || !phoneNumber) {
      throw new BadRequestError("Please provide all values");
    }

    let emailTrim = email.trim();
    let usernameTrim = username.trim();

    const session = await models.UserDB.startSession();
    session.startTransaction();

    try {
      // Validation Email
      const existingEmail = await models.UserDB.findOne({
        email: { $regex: new RegExp(emailTrim, "i") },
        $or: [
          { deleted_time: { $exists: false } },
          { deleted_by: { $exists: false } },
        ],
      });

      if (existingEmail) {
        return response.error(
          400,
          `A user with the Email: '${emailTrim}' already exists`,
          res
        );
      }

      // Validation username
      const words = usernameTrim.split(" ");
      if (words.length > 1) {
        return response.error(
          400,
          "Username cannot contain empty spaces in the middle",
          res
        );
      }

    const existingUsername = await models.UserDB.findOne({
      username: { $regex: new RegExp(`^${usernameTrim}$`, "i") },
      $or: [
        { deleted_time: { $exists: false } },
        { deleted_by: { $exists: false } },
      ],
    });

    if (existingUsername) {
      return response.error(
        400,
        `A user with username: '${usernameTrim}' already exists`,
        res
      );
    }

      // Validation phoneNumber
      const existingPhoneNumber = await models.UserDB.findOne({
        phoneNumber: { $regex: new RegExp(phoneNumber, "i") },
        $or: [
          { deleted_time: { $exists: false } },
          { deleted_by: { $exists: false } },
        ],
      });

      if (existingPhoneNumber) {
        return response.error(
          400,
          `A user with phoneNumber: '${phoneNumber}' already exists`,
          res
        );
      }

      // Validate the format of the phoneNumber (assuming a simple format)
      const phoneNumberRegex = /^\d{10,}$/; // At least 10 digits
      if (!phoneNumberRegex.test(phoneNumber)) {
        return response.error(
          400,
          "Please provide a valid phone number with at least 10 digits",
          res
        );
      }

      const hashedPassword = await hashPassword(password);

      const user = await models.UserDB.create({
        username: usernameTrim,
        fullName,
        email: emailTrim,
        phoneNumber,
        role,
        password: hashedPassword,
      });

      if (req.file) {
        try {
          const file = formatImage(req.file);
          const result = await cloudinary.uploader.upload(file, {
            folder: "FOOD",
          });

          user.img_profile = result.secure_url;
          user.img_profilePublic = result.public_id;
          await user.save();
        } catch (uploadError) {
          console.error("Error uploading image to Cloudinary:", uploadError);
          return responseData.error(
            500,
            "Error uploading image to Cloudinary",
            res
          );
        }
      }

      // Generate token:
      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      // Cookies:
      attachCookies({ res, token });

      if (user) {
        res.status(StatusCodes.CREATED).json({
          success: true,
          message: "Create user is successfully created",
          user: {
            _id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            slug: user.slug,
            role: user.role,
            img_profile: user.img_profile ? user.img_profile : null,
          },
          token,
        });
      } else {
        res.status(400);
        throw new Error("Invalid User Data");
      }
    } catch (error) {
      return response.error(400, error.message, res, error);
    } finally {
      if (session) {
        session.endSession();
      }
    }
  },

  login: async function (req, res) {
    const { userLogin, password } = req.body;

    if (!userLogin || !password) {
      return res
        .status(400)
        .json({ error: "Both email/username and password are required" });
    }

    const session = await models.UserDB.startSession();
    session.startTransaction();

    try {
      // Check if user exists with email
      let user = await models.UserDB.findOne({
        $or: [{ email: userLogin }, { phoneNumber: userLogin }],
        deleted_time: { $exists: false },
        deleted_by: { $exists: false },
      }).select("+password");

      // Check if user exists with username if no email match found
      if (!user) {
        user = await models.UserDB.findOne({
          username: userLogin,
        }).select("+password");
      }

      if (!user) {
        throw new UnAuthenticatedError("User not found");
      }

      // Check Password Match
      const passwordMatch = await user.comparePassword(password);
      if (!passwordMatch) {
        throw new UnAuthenticatedError("Invalid password");
      }

      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      // Generate Cookies
      attachCookies({ res, token });

      // Respond with token
      response.ok(
        {
          token,
          user: {
            _id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            slug: user.slug,
            role: user.role,
            img_profile: user.img_profile ? user.img_profile : null,
          },
        },
        res,
        `Login is successful`
      );
      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return response.error(400, err.message, res, err);
    }
  },

  // Update User
  update: async function (req, res) {
    let {
      username,
      fullName,
      email,
      phoneNumber,
      currentPassword,
      newPassword,
    } = req.body;

    const userId = req.user._id;

    let emailTrim = email ? email.trim() : undefined;
    let usernameTrim = username ? username.trim() : undefined;

    // Start a session
    const session = await models.UserDB.startSession();
    session.startTransaction();

    try {
      const user = await models.UserDB.findOne({
        _id: userId,
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      });

      if (!user) {
        return response.error(404, "User not found", res);
      }

      if (req.user.role != "Admin" && req.user._id != userId) {
        return response.error(401, "Unauthorized", res);
      }

      // Validasi Username
      if (username) {
        const words = usernameTrim.split(" ");
        if (words.length > 1) {
          return response.error(
            400,
            "Username cannot contain empty spaces in the middle",
            res
          );
        }

        const existingUsername = await models.UserDB.findOne({
          username: { $regex: new RegExp(usernameTrim, "i") },
          $or: [
            { deleted_time: { $exists: false } },
            { deleted_by: { $exists: false } },
          ],
          _id: { $ne: user._id },
        });

        if (existingUsername) {
          return response.error(
            400,
            `A user with username: '${usernameTrim}' already exists`,
            res
          );
        }

        user.username = usernameTrim;
      }

      // Validasi Email
      if (email) {
        const existingEmail = await models.UserDB.findOne({
          email: { $regex: new RegExp(emailTrim, "i") },
          $or: [
            { deleted_time: { $exists: false } },
            { deleted_by: { $exists: false } },
          ],
          _id: { $ne: user._id },
        });

        if (existingEmail) {
          return response.error(
            400,
            `A user with the Email: '${emailTrim}' already exists`,
            res
          );
        }
        user.email = emailTrim;
      }

      // Validation phoneNumber
      if (phoneNumber) {
        const existingPhoneNumber = await models.UserDB.findOne({
          phoneNumber: { $regex: new RegExp(phoneNumber, "i") },
          $or: [
            { deleted_time: { $exists: false } },
            { deleted_by: { $exists: false } },
          ],
          _id: { $ne: user._id },
        });

        if (existingPhoneNumber) {
          return response.error(
            400,
            `A user with phoneNumber: '${phoneNumber}' already exists`,
            res
          );
        }

        // Validate the format of the phoneNumber (assuming a simple format)
        const phoneNumberRegex = /^\d{10,}$/; // At least 10 digits
        if (!phoneNumberRegex.test(phoneNumber)) {
          return response.error(
            400,
            "Please provide a valid phone number with at least 10 digits",
            res
          );
        }

        user.phoneNumber = phoneNumber;
      }

      // Update Password
      if (
        currentPassword &&
        !bcrypt.compareSync(currentPassword, user.password)
      ) {
        return response.error(400, "Invalid current password", res);
      }

      // Update img_profile
      if (req.file && user.img_profilePublic) {
        try {
          await cloudinary.uploader.destroy(user.img_profilePublic);
        } catch (deleteError) {
          console.error(
            "Error deleting existing image from Cloudinary:",
            deleteError
          );
        }
      }

      if (req.file) {
        try {
          const file = formatImage(req.file);

          const result = await cloudinary.uploader.upload(file, {
            folder: "BOOK",
          });
          user.img_profile = result.secure_url;
          user.img_profilePublic = result.public_id;
        } catch (uploadError) {
          console.error("Error uploading image to Cloudinary:", uploadError);
          return response.error(
            500,
            "Error uploading image to Cloudinary",
            res
          );
        }
      }

      if (fullName) {
        user.fullName = fullName;
      }

      if (newPassword && newPassword.length >= 6) {
        const hashedNewPassword = await hashPassword(newPassword);
        user.password = hashedNewPassword;
      } else {
        delete user.password;
      }

      user.updated_by = req.user._id;
      user.updated_at = defaultDate();

      const options = { session };
      await models.UserDB(user).save(options);
      await session.commitTransaction();
      session.endSession();
      return response.ok(true, res, `Success`);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return response.error(400, err.message, res, err);
    }
  },

  delete: async function (req, res) {
    const { user_id } = req.body;
    const filter = {
      _id: user_id,
      deleted_at: {
        $exists: false,
      },
      deleted_by: {
        $exists: false,
      },
    };

    const user = await models.UserDB.findOne(filter);
    if (!user) {
      return response.error(400, "User not found", res, "User not found");
    }

    if (req.user.role != "Admin" && req.user._id != user_id) {
      return response.error(401, "Unauthorized", res);
    }

    const session = await models.UserDB.startSession();
    session.startTransaction();

    try {
      const options = { session };

      await models.UserDB.findByIdAndUpdate(
        user_id,
        { deleted_at: defaultDate(), deleted_by: req.user._id },
        options
      );

      await session.commitTransaction();
      session.endSession();

      return response.ok(true, res, `Success`);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return response.error(400, err.message, res, err);
    }
  },

  // INFO USER:
  infoUser: async function (req, res) {
    try {
      const user = await models.UserDB.findOne({
        _id: req.user._id,
        deleted_at: { $exists: false },
        deleted_by: { $exists: false },
      })
        .populate({
          path: "cart",
          match: {
            deleted_at: { $exists: false },
            deleted_by: { $exists: false },
          },
        })
        .populate({
          path: "address",
          match: {
            deleted_at: { $exists: false },
            deleted_by: { $exists: false },
          },
        });

      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ error: "User not found" });
      }

      // Format timestamps for each cart and user
      const formattedCart = user.cart.map((item) => {
        // Convert timestamps to readable format
        const formattedCreatedAt = moment(item.created_at).format(
          "DD-MM-YYYY HH:mm:ss"
        );
        const formattedUpdatedAt = moment(item.updated_at).format(
          "DD-MM-YYYY HH:mm:ss"
        );

        const { ...cartData } = item.toObject();

        return {
          ...cartData,
          created_at: formattedCreatedAt,
          updated_at: formattedUpdatedAt,
        };
      });

      // Exclude the 'password' field
      const { password, ...userWithoutPassword } = user.toObject();

      const formattedCreatedAt = moment(user.created_at).format(
        "DD-MM-YYYY HH:mm:ss"
      );
      const formattedUpdatedAt = moment(user.updated_at).format(
        "DD-MM-YYYY HH:mm:ss"
      );

      const userWithFormattedHours = {
        ...userWithoutPassword,
        cart: formattedCart,
        created_at: formattedCreatedAt,
        updated_at: formattedUpdatedAt,
      };

      res.status(StatusCodes.OK).json({ user: userWithFormattedHours });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  },

  detail: async function (req, res) {
    const { id } = req.params;

    try {
      const user = await models.UserDB.findOne({
        _id: id,
        role: { $ne: "Admin" },
        deleted_by: { $exists: false },
        deleted_at: { $exists: false },
      })
        .populate("address")
        .populate("cart");

      if (!user) {
        return response.error(404, "User not found", res);
      }

      // convert timestamps to local time
      const formatted = user.cart.map((item) => {
        const CreatedAt = moment
          .tz(item.created_at, "Asia/Jakarta")
          .format("DD-MM-YYYY HH:mm:ss");
        const UpdatedAt = moment
          .tz(item.updated_at, "Asia/Jakarta")
          .format("DD-MM-YYYY HH:mm:ss");

        return {
          ...item.toObject(),
          created_at: CreatedAt,
          updated_at: UpdatedAt,
        };
      });

      // Convert user timestamps to local time
      const convertedUser = {
        ...user.toObject(),
        created_at: moment
          .tz(user.created_at, "Asia/Jakarta")
          .format("DD-MM-YYYY HH:mm:ss"),
        updated_at: moment
          .tz(user.updated_at, "Asia/Jakarta")
          .format("DD-MM-YYYY HH:mm:ss"),
      };

      // Attach presensi to the user object
      const userResponse = {
        ...convertedUser,
        cart: formatted,
      };

      return response.ok(userResponse, res, "Successfully retrieved user");
    } catch (err) {
      return response.error(400, err.message, res, err);
    }
  },

  // View All User
  get: async function (req, res) {
    try {
      const {
        username,
        email,
        created_at_start,
        created_at_end,
        search,
        page = 1,
        limit = 10,
        sort = "Recently",
      } = req.query;

      const queryObject = {
        deleted_at: { $exists: false },
        deleted_by: { $exists: false },
      };

      if (email) {
        queryObject.email = { $regex: new RegExp(email, "i") };
      }

      if (username) {
        queryObject.username = { $regex: new RegExp(username, "i") };
      }

      if (created_at_start) {
        queryObject.created_at = {
          $gte: moment(created_at_start, "DD-MM-YYYY").startOf("day").valueOf(),
        };
      }

      if (created_at_end) {
        queryObject.created_at = {
          ...queryObject.created_at,
          $lte: moment(created_at_end, "DD-MM-YYYY").endOf("day").valueOf(),
        };
      }

      if (search) {
        const searchRegExp = new RegExp(search, "i");
        queryObject.$or = [{ username: searchRegExp }, { email: searchRegExp }];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      let sortOption = {};
      if (sort === "Recently") {
        sortOption = { created_at: -1 };
      } else if (sort === "Oldest") {
        sortOption = { created_at: 1 };
      } else if (sort === "A-Z") {
        sortOption = { fullName: 1 };
      } else if (sort === "Z-A") {
        sortOption = { fullName: -1 };
      } else {
        sortOption = { created_at: -1 };
      }

      const totalUsers = await models.UserDB.countDocuments(queryObject);

      const users = await models.UserDB.find(queryObject)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "cart",
          match: {
            deleted_at: { $exists: false },
            deleted_by: { $exists: false },
          },
        });

      const usersWithFormatted = users.map((user) => {
        const formatted = user.cart.map((item) => {
          const formattedCreatedAt = moment(item.created_at).format(
            "DD-MM-YYYY HH:mm:ss"
          );
          const formattedUpdatedAt = moment(item.updated_at).format(
            "DD-MM-YYYY HH:mm:ss"
          );

          return {
            ...item.toObject(),
            created_at: formattedCreatedAt,
            updated_at: formattedUpdatedAt,
          };
        });

        const formattedCreatedAt = moment(user.created_at).format(
          "DD-MM-YYYY HH:mm:ss"
        );
        const formattedUpdatedAt = moment(user.updated_at).format(
          "DD-MM-YYYY HH:mm:ss"
        );

        return {
          ...user.toObject(),
          cart: formatted,
          created_at: formattedCreatedAt,
          updated_at: formattedUpdatedAt,
        };
      });

      res.status(StatusCodes.OK).json({
        users: usersWithFormatted,
        currentPage: page,
        totalUsers,
        numOfPages: Math.ceil(totalUsers / parseInt(limit)),
      });
    } catch (err) {
      console.error(err);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to fetch users",
      });
    }
  },

  // Logout
  logout: (req, res) => {
    try {
      // Clear the token cookie
      res.cookie("token", "logout", {
        httpOnly: true,
        expires: new Date(Date.now()),
      });

      // Respond with a success message
      res.status(StatusCodes.OK).json({ message: "User Logged Out" });
    } catch (error) {
      console.error("Error during logout:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal Server Error" });
    }
  },
};

export default UserController;
