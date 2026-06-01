const mongoose = require("mongoose");

const cartSchema = mongoose.Schema({
      username: {
    type: String,
    required: true
  },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Cart", cartSchema);