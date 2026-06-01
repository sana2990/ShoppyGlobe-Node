const mongoose = require("mongoose");
const Product = require("./products");
const express = require("express");
const Cart = require("./cart");
const products = require("./products");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// JWT Secret Key
const JWT_SECRET = "secretkey"; 

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/Products")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// --- NEW: INLINE USER SCHEMA & MODEL FOR EVALUATION ---
// (You can also move this into a separate "user.js" file if preferred)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true } // In production, always hash this with bcrypt!
});
const User = mongoose.model("User", userSchema);


// --- AUTHENTICATION & AUTHORIZATION ROUTES ---

/**
 * @route   POST /register
 * @desc    Register a new user
 */
app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already taken" });
        }

        // Create and save new user
        const newUser = new User({ username, password });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
});

/**
 * @route   POST /login
 * @desc    Authenticate user and return a JWT token
 */
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Find user in database
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Generate JWT Token (assigned to 1 hour for standard usage instead of 1 minute)
        const accessToken = jwt.sign(
            { userId: user._id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: "1h" }
        );

        res.status(200).json({ token: accessToken });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});


// --- JWT AUTHENTICATION MIDDLEWARE ---
function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];

  // If no token is provided, return 401 Unauthorized
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired JWT token" });
    }
    req.user = decodedUser; // Attach user info to request payload
    next();
  });
}


// --- PRODUCT ROUTES ---

app.get("/products", authenticateUser, async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching products",
            error: error.message
        });
    }
});

app.get("/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product Not Found" });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: "Product not found" });
    }
});       

app.post("/products", authenticateUser, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: "Product successfully added" });
    } catch (error) {
        res.status(500).json({
            message: "Product Not Added",
            error: error.message,
        });
    }
});

app.put("/products/:id", authenticateUser, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating product",
      error: error.message
    });
  }
});

app.delete("/products/:id", authenticateUser, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product: deletedProduct
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message
    });
  }
});


// --- PROTECTED CART ROUTES ---

app.post("/cart", authenticateUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const username = req.user.username;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const existingItem = await Cart.findOne({
      username,
      productId
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();

      product.stock -= quantity;
      await product.save();

      return res.status(200).json({
        message: "Cart updated (quantity increased)",
        cartItem: existingItem
      });
    }

    const cartItem = new Cart({
      username,
      productId,
      quantity
    });

    await cartItem.save();

    product.stock -= quantity;
    await product.save();

    res.status(201).json({
      message: "Item added to cart",
      cartItem
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/cart", authenticateUser, async (req, res) => {
  try {
    const { cartId, quantity } = req.body;
    const username = req.user.username;

    const cartItem = await Cart.findOne({
      _id: cartId,
      username
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const product = await Product.findById(cartItem.productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const diff = quantity - cartItem.quantity;

    if (diff > 0 && product.stock < diff) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    product.stock -= diff;
    await product.save();

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({
      message: "Cart updated successfully",
      cartItem
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/cart", authenticateUser, async (req, res) => {
  try {
    const username = req.user.username;

    const cartItems = await Cart.find({ username })
      .populate("productId");

    res.status(200).json(cartItems);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/cart/:id", authenticateUser, async (req, res) => {
  try {
    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
      return res.status(404).json({
        message: "Cart item not found"
      });
    }

    res.status(200).json(cartItem);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching cart item",
      error: error.message
    });
  }
});

app.delete("/cart/:cartId", authenticateUser, async (req, res) => {
  try {
    const username = req.user.username;

    const cartItem = await Cart.findOne({
      _id: req.params.cartId,
      username
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const product = await Product.findById(cartItem.productId);

    if (product) {
      product.stock += cartItem.quantity;
      await product.save();
    }

    await Cart.deleteOne({
      _id: req.params.cartId,
      username
    });

    res.status(200).json({
      message: "Cart item deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(5300, () => {
    console.log("Server running on port 5300");
});
