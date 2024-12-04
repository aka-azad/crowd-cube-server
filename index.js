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

const { MongoClient, ServerApiVersion } = require("mongodb");
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
      console.log(data);
      console.log(userData);
    });

    //campaigns data

    app.post("/campaigns", async (req, res) => {
      const campaignData = req.body;
      const result = await campaignsCollection.insertOne(campaignData);
      res.send(result);
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
