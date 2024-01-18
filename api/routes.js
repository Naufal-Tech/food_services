import addressRouter from "./routes/Address.js";
import fillingRouter from "./routes/Filling.js";
import foodRouter from "./routes/Food.js";
import orderRouter from "./routes/Order.js";
import toppingRouter from "./routes/Topping.js";
import userRouter from "./routes/User.js";

const routes = (app) => {
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/address", addressRouter);
  app.use("/api/v1/food", foodRouter);
  app.use("/api/v1/topping", toppingRouter);
  app.use("/api/v1/filling", fillingRouter);
  app.use("/api/v1/order", orderRouter);
};

export default routes;
