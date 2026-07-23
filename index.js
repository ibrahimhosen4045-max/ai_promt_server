const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const { ObjectId } = require("mongodb");
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


    //Getting Data for myPromt
    app.get("/api/creator/mypromt",async (req, res) => {
      const {email} = req.query;
      const result = await creatorCollection.find({creatorEmail: email}).toArray();
      res.send(result)
    })

    //delet api in myCreator desboard
    app.delete("/api/creator/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.deleteOne({
          _id: new ObjectId(id),
        });
      
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    //Update creator api deshboard

    app.patch("/api/creator/:id", async (req, res)=> {
      try{
        const id = req.params.id;
        const updateData = req.body;

        const filter = {
          _id: new ObjectId(id)
        };

        const updateDoc = {
          $set: {
            title: updateData.title,
            description:updateData.description,
            content: updateData.content,
            visibility:updateData.visibility,
            difficulty: updateData.difficulty,
          }
        }

        const result = await creatorCollection.updateOne(filter, updateDoc)
        res.send(result)
      } catch(error){
        res.status(500).send({
          message: "Update failed",
          error: error.message,
        })
      }
    })


    // add promt with creatorpage
    app.post("/api/creator", async (req, res) => {
      const {title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility, creatorId, creatorName, creatorEmail, creatorImage,} = req.body;

      const promtData = {   title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility, creatorId, creatorName, creatorEmail, creatorImage, copyCount: 0, bookmarkCount: 0, status: "pending", createdAt: new Date(), updatedAt: new Date(),}

      const result = await creatorCollection.insertOne(promtData)
      res.status(201).json({
      success: true,
      message: "Prompt added successfully",
      insertedId: result.insertedId,
    });
    })

    app.get("/api/allPromt", async ( req, res) => {
      const promt = creatorCollection.find();
      const result = await promt.toArray();
      res.send(result)
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

