// import PosMachine from "../models/posMachine.model.js";

// // GET all POS machines
// export const getAllPosMachines = async (req, res) => {
//   try {
//     const machines = await PosMachine.find();
//     res.status(200).json(machines);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// export const createPosMachine = async (req, res) => {
//   try {
//     const { name, deviceId, model, vendor } = req.body;

//     if (!name) {
//       return res.status(400).json({ message: "POS number is required" });
//     }

//     // Always add prefix
//     const posName = `SMT-ETM-${String(name).padStart(3, "0")}`;

//     // Check duplicate
//     const exists = await PosMachine.findOne({ posName });
//     if (exists) {
//       return res.status(400).json({ message: "POS already exists" });
//     }

//     const newPos = new PosMachine({
//       posName,
//       deviceId,
//       model,
//       vendor,
//     });

//     await newPos.save();

//     res.json({ message: "POS Machine added", data: newPos });
//   } catch (error) {
//     res.status(500).json({ message: "Error creating POS machine" });
//   }
// };
// export const updatePosMachine = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, deviceId, model, vendor } = req.body;

//     // 1. Format the posName string from the numeric 'name' sent by frontend
//     const formattedPosName = `SMT-ETM-${String(name).padStart(3, "0")}`;

//     // 2. Perform the update
//     // We update 'posName' (the schema field) with our 'formattedPosName'
//     const updatedMachine = await PosMachine.findByIdAndUpdate(
//       id,
//       { 
//         posName: formattedPosName, 
//         deviceId, 
//         model, 
//         vendor 
//       },
//       { 
//         new: true,           // Return the document AFTER update
//         runValidators: true  // Ensure unique/required rules are checked
//       }
//     );

//     if (!updatedMachine) {
//       return res.status(404).json({ message: "POS Machine not found" });
//     }

//     res.status(200).json(updatedMachine);
//   } catch (error) {
//     // Handle MongoDB Duplicate Key Error (11000)
//     if (error.code === 11000) {
//       return res.status(400).json({ 
//         message: "Duplicate Error: POS Name or Device ID already in use." 
//       });
//     }
//     res.status(500).json({ message: error.message });
//   }
// };

// // DELETE a POS machine
// export const deletePosMachine = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await PosMachine.findByIdAndDelete(id);
//     if (!deleted) {
//       return res.status(404).json({ message: "POS Machine not found" });
//     }

//     res.status(200).json({ message: "POS Machine deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
import PosMachine from "../models/posMachine.model.js";
import BusPOS from "../models/busPosMapping.model.js";

// GET all POS machines
export const getAllPosMachines = async (req, res) => {
  try {
    const machines = await PosMachine.find({ isDeleted: { $ne: true } });
    res.status(200).json(machines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET POS machine by serial number or name
export const getPosBySerial = async (req, res) => {
  try {
    const { serial } = req.params;
    if (!serial) {
      return res.status(400).json({ message: "Serial number is required" });
    }

    const trimmed = serial.trim();
    const machine = await PosMachine.findOne({
      isDeleted: { $ne: true },
      $or: [
        { serialNumber: trimmed },
        { posName: trimmed },
        { deviceId: trimmed },
      ],
    });

    if (!machine) {
      return res.status(404).json({ message: "POS machine not found" });
    }

    res.status(200).json({
      posMachineId: machine._id,
      posName: machine.posName,
      deviceId: machine.deviceId,
      serialNumber: machine.serialNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// CREATE POS Machine
export const createPosMachine = async (req, res) => {
  try {
    const { name, deviceId, model, vendor, serialNumber } = req.body;

    if (!name) {
      return res.status(400).json({ message: "POS name is required" });
    }

    // Check duplicate name directly
    const exists = await PosMachine.findOne({ posName: name });
    if (exists) {
      return res.status(400).json({ message: "POS already exists" });
    }

    const newPos = new PosMachine({
      posName: name,   // direct save (no formatting)
      deviceId,
      model,
      vendor,
      serialNumber,
    });

    await newPos.save();

    res.status(201).json({ message: "POS Machine added", data: newPos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE POS Machine
export const updatePosMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, deviceId, model, vendor, serialNumber } = req.body;

    const updatedMachine = await PosMachine.findByIdAndUpdate(
      id,
      {
        posName: name,   // direct update (no formatting)
        deviceId,
        model,
        vendor,
        serialNumber,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: "POS Machine not found" });
    }

    res.status(200).json(updatedMachine);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Duplicate Error: POS Name or Device ID already exists",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// DELETE POS Machine
export const deletePosMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await PosMachine.findById(id);

    if (!machine) {
      return res.status(404).json({ message: "POS Machine not found" });
    }

    if (machine.isDeleted) {
      return res.status(400).json({ message: "POS Machine is already deleted" });
    }

    // Step 1: Soft-delete the POS machine
    machine.isDeleted = true;
    const suffix = `_del_${Date.now()}`;
    machine.posName = `${machine.posName}${suffix}`;
    machine.deviceId = `${machine.deviceId}${suffix}`;
    await machine.save();

    // Step 2: Soft-delete bus-POS mapping for this machine
    await BusPOS.updateMany(
      { posMachine: machine._id, isDeleted: { $ne: true } },
      { isDeleted: true }
    );

    res.status(200).json({ message: "POS Machine deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};