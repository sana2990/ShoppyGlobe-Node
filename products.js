const mongoose = require("mongoose");


const userSchema = mongoose.Schema({
    name: {type:String, required:true},
    stock : {type: Number, default: 0},
    brand: {type:String},
    price: {type: Number, required:true},
});

module.exports = mongoose.model("products", userSchema);