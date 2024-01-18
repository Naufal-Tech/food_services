const calculatePenalty = async () => {
  try {
    // Schedule to run every day at 23:59:00 Asia/Jakarta time
    cron.schedule("59 23 * * *", async () => {
      console.log("testing");
      const users = await models.UserDB.find({
        "borrow_history.returned_at": { $exists: true },
        penalty: false,
      });

      const currentDate = moment().tz("Asia/Jakarta");
      const penaltyEndDate = currentDate.add(3, "days").valueOf();

      for (const user of users) {
        for (const history of user.borrow_history) {
          if (
            history.returned_at &&
            currentDate.diff(moment(history.returned_at), "days") > 7
          ) {
            // Check jika 3 hari telah lewat sejak pinalty
            const penaltyEndDateMoment = moment(user.penalty_end_date).tz(
              "Asia/Jakarta"
            );
            if (currentDate.diff(penaltyEndDateMoment, "days") > 3) {
              user.penalty = false;
              user.penalty_end_date = null;
            } else {
              user.penalty = true;
              user.penalty_end_date = penaltyEndDate;
            }
            break;
          }
        }
      }

      // Save changes to the database
      await mongoose.startSession();
      await mongoose.connection.transaction(async (session) => {
        for (const user of users) {
          await user.save({ session });
        }
      });

      console.log("Penalty calculation completed.");
    });
  } catch (error) {
    console.error("Error during penalty calculation:", error);
  }
};

export default calculatePenalty;
