const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error"));
    db.once("open", function (callback) {
      console.log("\n\n\n\n");
      console.log(
        `Server successfully compiled on ${moment().format(
          "YYYY-MM-DD HH:mm:ss"
        )} \nDatabase connection Success with port ${
          process.env.PORT
        }!\nConnect to MongoDB Atlas\n\n\n\n\n`
      );
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    // Call the `atlas` function if needed.
  }
};

export default connectDB;
