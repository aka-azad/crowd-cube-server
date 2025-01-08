const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://crowdcube-f0e0f.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

// Root
app.get("/", (req, res) => {
  res.send("Server is Running");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("crowdcubeDB");
    const usersCollection = database.collection("users");
    const campaignsCollection = database.collection("campaigns");
    const donationsCollection = database.collection("donations");

    // JWT related APIs
    app.post("/login", async (req, res) => {
      const email = req.body;

      const user = await usersCollection.findOne(email);

      if (!user) {
        return res.status(400).send({ success: false });
      }

      const token = jwt.sign(email, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          sameSite: "none",
          secure: true//process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    // Users data
    app.post("/users", async (req, res) => {
      const userData = req.body;
      const userEmail = req.body.email;
      const filter = { email: userEmail };
      const data = await usersCollection.findOne(filter);
      if (data === null) {
        const result = await usersCollection.insertOne(userData);
        res.send(result);
        return;
      }
      res.send({ response: "user already added" });
    });

    // Campaign related APIs
    app.post("/campaigns", verifyToken, async (req, res) => {
      const campaignData = req.body;
      const result = await campaignsCollection.insertOne(campaignData);
      res.send(result);
    });

    app.get("/campaigns", async (req, res) => {
      const cursor = campaignsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/running-campaigns", async (req, res) => {
      const currentDate = new Date();
      const filter = { deadline: { $gt: currentDate.toISOString() } };
      const runningCampaigns = await campaignsCollection
        .find(filter)
        .limit(8)
        .toArray();
      res.send(runningCampaigns);
    });

    app.get("/my-campaigns", verifyToken, async (req, res) => {
      const { userEmail } = req.query;
      const filter = { email: userEmail };
      const cursor = campaignsCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/campaigns/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: data,
      };
      const result = await campaignsCollection.updateOne(filter, updatedData);
      res.send(result);
    });

    app.patch("/fundBalance/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const previousData = await campaignsCollection.findOne(filter);
      const newData = data.fundBalance + previousData.fundBalance;
      const updatedData = {
        $set: { fundBalance: newData },
      };
      const result = await campaignsCollection.updateOne(filter, updatedData);
      res.send(result);
    });

    app.get("/campaign/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await campaignsCollection.findOne(filter);
      res.send(result);
    });

    app.delete("/my-campaigns/delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await campaignsCollection.deleteOne(filter);
      res.send(result);
    });

    // Donation related APIs
    app.post("/donations", verifyToken, async (req, res) => {
      const donationData = req.body;
      const result = await donationsCollection.insertOne(donationData);
      res.send(result);
    });

    app.get("/my-donations", verifyToken, async (req, res) => {
      const { userEmail } = req.query;
      const filter = { email: userEmail };
      const donations = await donationsCollection.find(filter).toArray();
      res.send(donations);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => console.log("server running on port:", port));
