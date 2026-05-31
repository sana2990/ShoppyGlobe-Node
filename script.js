const mongoose = require("mongoose");
const Product = require("./products");
const express = require("express");
const Cart = require("./cart");
const products = require("./products");
const  jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/Products")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));


app.get("/products", async (req, res) => {
    try {
        const products = await Product.find();

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching products",
            error: error.message
        });
    }
}) ;

app.get("/products/:id", async (req,res) => {
    try{
        
        const product = await Product.findById(req.params.id);

        if(!product) {
            return res.status(404).json({
                message: "Product Not Found"
            });
        }
        res.status(200).json(product);

    }
    catch(error) {
        res.status(500).json({
            message: "Product not found"
        });
    }
});       

app.post("/products",authenticateUser, async (req,res)=> {
    try{
        const product = new Product(req.body);
        const savedProduct = await product.save();

        res.status(201).json({
            message:"Product succesfully added",
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Product Not Added",
            error: error.message,
        });
    }
});


app.post("/cart",authenticateUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock"
      });
    }

    const cartItem = new Cart({
      productId,
      quantity
    });

    await cartItem.save();

    product.stock = product.stock - quantity;

    await product.save();

    res.status(201).json({
      message: "Product added to cart",
      cartItem
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

app.put("/cart/:id",authenticateUser, async (req, res) => {
  try {
    const { quantity } = req.body;

    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart item not found"
      });
    }

    const product = await Product.findById(cartItem.productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const difference = quantity - cartItem.quantity;

    if (difference > 0 && product.stock < difference) {
      return res.status(400).json({
        message: "Insufficient stock"
      });
    }

    product.stock = product.stock - difference;
    await product.save();

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({
      message: "Cart updated successfully",
      cartItem
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

//delete from cart and add the deleted quantity in products table
app.delete("/cart/:productId",authenticateUser, async (req, res) => {
  try {
    const productId = req.params.productId;

    // 1. Find cart item from DB
    const cartItem = await Cart.findOne({ productId });

    if (!cartItem) {
      return res.status(404).json({
        message: "Product not found in cart"
      });
    }

    // 2. Find product from DB
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // 3. Restore stock
    product.stock += cartItem.quantity;
    await product.save();

    // 4. Remove cart item
    await Cart.deleteOne({ productId });

    res.status(200).json({
      message: "Product removed from cart",
      updatedProduct: product
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

app.post("/login", (req,res) => {
  const user = req.body.username;

  const accessToken = jwt.sign(user,"secretkey");
  res.send({token: accessToken});
})

//authenticating the user
function authenticateUser(req,res,next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];

  jwt.verify(token, "secretkey", (err,user) => {
    if(err) {
      return res.status(403).json({message:"Invalid jwt token"});
    }
    req.user = user;
    next();
  })
}
app.listen(5300, () => {
    console.log("Server: 5300");
});