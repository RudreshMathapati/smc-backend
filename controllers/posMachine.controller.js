import PosMachine from "../models/posMachine.model.js";

// GET all POS machines
export const getAllPosMachines = async (req, res) => {
  try {
    const machines = await PosMachine.find();
    res.status(200).json(machines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const createPosMachine = async (req, res) => {
  try {
    const { name, deviceId, model, vendor } = req.body;

    if (!name) {
      return res.status(400).json({ message: "POS number is required" });
    }

    // Always add prefix
    const posName = `SMT-ETM-${String(name).padStart(3, "0")}`;

    // Check duplicate
    const exists = await PosMachine.findOne({ posName });
    if (exists) {
      return res.status(400).json({ message: "POS already exists" });
    }

    const newPos = new PosMachine({
      posName,
      deviceId,
      model,
      vendor,
    });

    await newPos.save();

    res.json({ message: "POS Machine added", data: newPos });
  } catch (error) {
    res.status(500).json({ message: "Error creating POS machine" });
  }
};

// UPDATE existing POS machine
// export const updatePosMachine = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { deviceId, model, vendor } = req.body;

//     const updatedMachine = await PosMachine.findByIdAndUpdate(
//       id,
//       {deviceId, model, vendor },
//       { new: true }
//     );

//     if (!updatedMachine) {
//       return res.status(404).json({ message: "POS Machine not found" });
//     }

//     res.status(200).json(updatedMachine);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
export const updatePosMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, deviceId, model, vendor } = req.body;

    // 1. Format the posName string from the numeric 'name' sent by frontend
    const formattedPosName = `SMT-ETM-${String(name).padStart(3, "0")}`;

    // 2. Perform the update
    // We update 'posName' (the schema field) with our 'formattedPosName'
    const updatedMachine = await PosMachine.findByIdAndUpdate(
      id,
      { 
        posName: formattedPosName, 
        deviceId, 
        model, 
        vendor 
      },
      { 
        new: true,           // Return the document AFTER update
        runValidators: true  // Ensure unique/required rules are checked
      }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: "POS Machine not found" });
    }

    res.status(200).json(updatedMachine);
  } catch (error) {
    // Handle MongoDB Duplicate Key Error (11000)
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate Error: POS Name or Device ID already in use." 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// DELETE a POS machine
export const deletePosMachine = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PosMachine.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "POS Machine not found" });
    }

    res.status(200).json({ message: "POS Machine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
