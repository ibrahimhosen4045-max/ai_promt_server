const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());



const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db('prompt_shearing_platform')
    const creatorCollection = db.collection("promt_collection")


    // add promt with creatorpage
    app.post("/api/creator", async (req, res) => {
      const {title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility, creatorId, creatorName, creatorEmail, creatorImage,} = req.body;

      const promtData = {   title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility, creatorId, creatorName, creatorEmail, creatorImage, copyCount: 0, bookmarkCount: 0, status: "pending", createdAt: new Date(), updatedAt: new Date(),}

      const result = await creatorCollection.insertOne(promtData)
      return result
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Creator Dashboard (Private Route)
// Routes:
// Creator Dashboard Home
// Add Prompt
// My Prompts
// Creator Dashboard Home (Analytics)
// Display summary cards:
// Total Prompts
// Total Copies
// Total Bookmarks
// Analytics Chart
// Display charts using Recharts:
// Total Copies
// Prompt Growth
// Add Prompt
// Fields:
// Prompt Title
// Prompt Description
// Prompt Content
// Category
// AI Tool
// Tags
// Difficulty Level ( Beginner / Intermediate / Pro )
// Thumbnail Image (Image upload functionality)
// Visibility (Public / Private)
// copyCount: 0 (initially)
// status: pending (Default value)
// All newly submitted prompts are automatically marked as pending and remain hidden from the marketplace until reviewed by an admin. Admins can either approve the prompt, or reject it if it does not meet platform guidelines.
// My Prompts
// Show all prompts added by the creator in table format and Implement delete and update functionality.
