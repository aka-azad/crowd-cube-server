const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//ROOT

app.get("/", (req, res) => {
  res.send("Server is Running");
});

//mongoDB

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //db and collections
    const database = client.db("crowdcubeDB");
    const usersCollection = database.collection("users");
    const campaignsCollection = database.collection("campaigns");
    const donationsCollection = database.collection("donations");

    //user data
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

    //campaigns data

    app.post("/campaigns", async (req, res) => {
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
        .limit(6)
        .toArray();
      res.send(runningCampaigns);
    });

    //user specific campaigns
    app.get("/campaigns/:id", async (req, res) => {
      const email = req.params.id;
      const filter = { email: email };
      const cursor = campaignsCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/campaigns/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: data,
      };
      const result = await campaignsCollection.updateOne(filter, updatedData);
      res.send(result);
    });

    app.patch("/fundBalance/:id", async (req, res) => {
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

    app.delete("/my-campaigns/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await campaignsCollection.deleteOne(filter);
      res.send(result);
    });

    //donation data

    app.post("/donations", async (req, res) => {
      const donationData = req.body;
      const result = await donationsCollection.insertOne(donationData);
      res.send(result);
    });

    app.get("/donations", async (req, res) => {
      const { userEmail } = req.query;
      const donations = await donationsCollection
        .find({ email: userEmail })
        .toArray();
      res.send(donations);
    });

    // Send a ping to confirm a successful connection
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
