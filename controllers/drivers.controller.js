import Driver from "../models/drivers.model.js";

// Register Driver
export const registerDriver = async (req, res) => {
  try {
    const { name, batch_no, type } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ batch_no });
    if (existingDriver) {
      return res.status(400).json({ message: "Batch No already exists" });
    }

    const newDriver = new Driver({
      name,
      batch_no,
      type,
    });

    await newDriver.save();
    res
      .status(201)
      .json({ message: "Driver registered successfully", newDriver });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login Driver
export const loginDriver = async (req, res) => {
  res.status(400).json({ message: "Drivers do not have passwords to log in" });
};

// Get All Drivers
export const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Single Driver by ID
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver)
      return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Driver
export const updateDriver = async (req, res) => {
  try {
    const { name, type } = req.body;
    let updatedData = { name, type };

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!driver)
      return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver updated", driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Driver
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver)
      return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
