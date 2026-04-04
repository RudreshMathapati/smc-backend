import Pass from "../models/pass.model.js";

// @desc Create a new pass
// @route POST /api/passes
export const createPass = async (req, res) => {
  try {
    const { passName, concession, description } = req.body;

    const newPass = new Pass({
      passName,
      concession,
      description,
    });

    const savedPass = await newPass.save();
    res.status(201).json(savedPass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc Get all passes
// @route GET /api/passes
export const getPasses = async (req, res) => {
  try {
    const passes = await Pass.find();
    res.json(passes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get a pass by ID
// @route GET /api/passes/:id
export const getPassById = async (req, res) => {
  try {
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ message: "Pass not found" });
    res.json(pass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update a pass
// @route PUT /api/passes/:id
export const updatePass = async (req, res) => {
  try {
    const { passName, concession, description } = req.body;

    const pass = await Pass.findByIdAndUpdate(
      req.params.id,
      { passName, concession, description },
      { new: true, runValidators: true }
    );

    if (!pass) return res.status(404).json({ message: "Pass not found" });
    res.json(pass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc Delete a pass
// @route DELETE /api/passes/:id
export const deletePass = async (req, res) => {
  try {
    const pass = await Pass.findByIdAndDelete(req.params.id);
    if (!pass) return res.status(404).json({ message: "Pass not found" });
    res.json({ message: "Pass deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
