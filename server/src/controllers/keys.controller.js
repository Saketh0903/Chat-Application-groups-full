import User from "../models/user.model.js";

// PUT /api/keys  -> save/update current user's public key
export const upsertPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== "string" || publicKey.length < 32) {
      return res.status(400).json({ message: "Invalid publicKey" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { publicKey },
      { new: true }
    ).select("-password");
    res.status(200).json({ publicKey: user.publicKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET /api/keys/:id -> get a user's public key
export const getPublicKey = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("publicKey");
    if (!user || !user.publicKey) {
      return res.status(404).json({ message: "Public key not found" });
    }
    res.status(200).json({ publicKey: user.publicKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
