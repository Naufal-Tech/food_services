const createToken = async (user, organization_id, secret, expiresIn) => {
  const { _id } = user;
  return await jwt.sign({ _id, organization_id }, secret, {
    expiresIn, //set expire token
  });
};

const createTokenVerify = async (user, secret, expiresIn) => {
  const { _id } = user;
  return await jwt.sign({ _id }, secret, {
    expiresIn, //set expire token
  });
};

const userFirstLastName = (user) => {
  const user_name = user.name.split(" ");
  const first_name = user_name[0];
  const last_name = user.name.substring(
    user_name[0].length + 1,
    user.name.length
  );
  return { first_name, last_name };
};

const formatWorkingHours = (workingHours) => {
  const hours = Math.floor(workingHours);
  const minutes = Math.floor((workingHours - hours) * 60);
  const seconds = Math.floor(((workingHours - hours) * 60 - minutes) * 60);

  return `${hours} hours, ${minutes} minutes, ${seconds} seconds`;
};
const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_LIFETIME,
    });
    return token;
  } catch (error) {
    // Handle the error appropriately (e.g., log it or throw a custom error)
    throw new Error("Unable to generate token");
  }
};

const verifyToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Get user from the token
    // const vendor = await models.VendorDB.findById(decoded.id).select('-password');
    const user = await models.UserDB.findById(decoded.id).select("-password");
    return { user };
  } catch (error) {
    console.log(error);
    return null;
  }
};

const sendError = async (res, error, statusCode = 401) => {
  res.status(statusCode).json({ error });
};

const generateRandomByte = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(30, (err, buff) => {
      if (err) reject(err);
      const buffString = buff.toString("hex");

      console.log(buffString);
      resolve(buffString);
    });
  });
};

function generateGuestId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  const seconds = ("0" + now.getSeconds()).slice(-2);
  const guestId = `Guest-${year}${month}${day}${hours}${minutes}${seconds}`;

  return guestId;
}

function generateInvoiceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  const seconds = ("0" + now.getSeconds()).slice(-2);
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  const invoiceId = `INV${randomNum}-${year}${month}${day}-${hours}${minutes}${seconds}`;

  return invoiceId;
}

function generateTransactionId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  const seconds = ("0" + now.getSeconds()).slice(-2);
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  const invoiceId = `TRF${randomNum}${year}${month}${day}${hours}${minutes}${seconds}`;

  return invoiceId;
}

// 4 Random Number
const generateOTP = (otp_length = 6) => {
  let OTP = "";
  for (let i = 1; i <= otp_length; i++) {
    const randomVal = Math.round(Math.random() * 9);
    OTP += randomVal;
  }
  return OTP;
};

// Validate Email
function validateEmail(email) {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

async function generateBookingId() {
  let code = "";
  let sequence = 0;
  let isUnique = false;

  while (!isUnique) {
    sequence++;
    code = sequence.toString().padStart(4, "0");

    // Check if the code already exists in the database
    const existingBooking = await models.BookingDB.findOne({
      bookingId: code,
    });

    if (!existingBooking) {
      isUnique = true;
    }
  }

  return code;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

// Function to calculate totalAmount based on item prices Food, Topping and Filling
const calculateTotalAmount = async (items) => {
  try {
    let totalAmount = 0;

    for (const item of items) {
      const food = await models.FoodDB.findById(item.food).select("price");
      const toppings = await models.ToppingDB.find({
        _id: { $in: item.toppings },
      }).select("price");
      const fillings = await models.FillingDB.find({
        _id: { $in: item.fillings },
      }).select("price");

      // Log the prices and quantities to check if they are valid numbers
      console.log("Food Price:", food.price);
      console.log(
        "Toppings Prices:",
        toppings.map((topping) => topping.price)
      );
      console.log(
        "Fillings Prices:",
        fillings.map((filling) => filling.price)
      );
      console.log("Item Quantity:", item.quantity);

      // Calculate total price for the food item
      const itemTotalPrice =
        food.price +
        toppings.reduce((sum, topping) => sum + topping.price, 0) +
        fillings.reduce((sum, filling) => sum + filling.price, 0);

      console.log("Item Total Price:", itemTotalPrice);

      totalAmount += itemTotalPrice * item.quantity;
    }

    console.log("Total Amount:", totalAmount);

    return totalAmount;
  } catch (error) {
    console.error("Error in calculateTotalAmount:", error);
    return NaN;
  }
};

export {
  calculateTotalAmount,
  createToken,
  createTokenVerify,
  formatWorkingHours,
  generateBookingId,
  generateGuestId,
  generateInvoiceId,
  generateOTP,
  generateRandomByte,
  generateToken,
  generateTransactionId,
  hashPassword,
  sendError,
  userFirstLastName,
  validateEmail,
  verifyToken,
};
