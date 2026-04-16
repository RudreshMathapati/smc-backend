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
export const updatePosMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name ,deviceId, model, vendor } = req.body;

    const updatedMachine = await PosMachine.findByIdAndUpdate(
      id,
      { name,deviceId, model, vendor },
      { new: true }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: "POS Machine not found" });
    }

    res.status(200).json(updatedMachine);
  } catch (error) {
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
