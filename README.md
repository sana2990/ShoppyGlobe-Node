Node Project
***********************************GITHub Link******************************************************
https://github.com/sana2990/ShoppyGlobe-Node

***************************** DESCRIPTION **********************************************************

This project is a Node.js + Express + MongoDB based E-Commerce Backend API that provides functionality for user authentication, product management, and a user-specific shopping cart system.

The system uses JWT (JSON Web Token) for secure authentication and ensures that each user can only access their own cart data.

 Technologies Used are Node.js, Express.js, MongoDB (Mongoose ODM), JSON Web Token (JWT), Thunder Client (for API testing)

 Project Setup
Install Dependencies
npm install express mongoose jsonwebtoken

npm install nodemon --save-dev


Start MongoDB
Ensure MongoDB is running locally:
mongodb://127.0.0.1:27017/Products

Start MongoDB service:
mongod

Run the Server
node server.js

Server Output
MongoDB Connected
Server running on port 5300

//Register
You can register new user byt typing username and password in body of the thunderclient request. We dont need authetication for this.

//Login
Then the user can login by providing their credentials(username, passowrd) to create a JWT. is unique key can be used till the session expire(1hr in this case) after session expiration user has to login again to create a new token to be used further.

//Get Products
The user can pass the recieved valid token in the authorization part of the header and can get all products available

//post Product
The user can create a new product by adding all necessary details like product name, brand, stock availability, and proce of each product.

//get Product by ID
The user can also find any product by poduct id to see all details for that specific product. we need to give authorization in header and product id in the url.

//get cart
this also takes authirisation and shows the items in the cart according to the username provided in the body part. if there is no item in the cart an empty array will be returned [] ; in case the cart items have some data it will show in the array

//get cart by id
this will show the xart items based on the cart id provided in the url

//delete cart item by id
this will delete the cart items by the id provided if the username is matches to that of the cart and that the user is authorised to access.
