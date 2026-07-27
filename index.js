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
    const usersCollection = db.collection("user");
    const paymentCollection = db.collection("payments");

    

    //creator...........................................................
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
        const { email } = req.query;
      
        const user = await usersCollection.findOne({
          email,
        });
        if (user?.isBlocked) {
          return res.status(403).json({
            success: false,
            message: "Your account has been blocked.",
          });
        }
      
        const result = await creatorCollection.deleteOne({
          _id: new ObjectId(id),
          creatorEmail: email,
        });
      
        res.send(result);
      
      } catch (error) {
        res.status(500).send({
          message: error.message,
        });
      }
    });

    //Update creator api deshboard

    app.patch("/api/creator/:id", async (req, res)=> {
      try{
      
       const { id } = req.params;
       const { creatorEmail, ...updateData } = req.body;

         const user = await usersCollection.findOne({
            email: creatorEmail,
          });
        
          if (user?.isBlocked) {
            return res.status(403).json({
              success: false,
             message: "Your account has been blocked.",
            });
          }

       const filter = {
         _id: new ObjectId(id),
         creatorEmail,
       };

        const updateDoc = {
          $set: {
            title: updateData.title,
            description:updateData.description,
            content: updateData.content,
            visibility:updateData.visibility,
            difficulty: updateData.difficulty,
            updatedAt: new Date()
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

    //creator dashboard api

    // Creator Dashboard Analytics
app.get("/api/creator/dashboard", async (req, res) => {
  try {
    const { email } = req.query;

    const prompts = await creatorCollection
      .find({ creatorEmail: email })
      .toArray();

    const totalPrompts = prompts.length;

    const totalCopies = prompts.reduce(
      (sum, prompt) => sum + (prompt.copyCount || 0),
      0
    );

    const totalBookmarks = prompts.reduce(
      (sum, prompt) => sum + (prompt.bookmarkCount || 0),
      0
    );

    const totalEarnings = prompts.reduce(
      (sum, prompt) => sum + (prompt.earning || 0),
      0
    );

    // Prompt Growth Chart
    const growth = await creatorCollection.aggregate([
      {
        $match: {
          creatorEmail: email,
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: "%b",
                date: "$createdAt",
              },
            },
          },
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          total: 1,
        },
      },
    ]).toArray();

    res.send({
      totalPrompts,
      totalCopies,
      totalBookmarks,
      totalEarnings,
      growth,
    });

  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});


    // add promt with creatorpage
    app.post("/api/creator", async (req, res) => {
      const {title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility,  creatorId, creatorName, creatorEmail, creatorImage,} = req.body;


      const user = await usersCollection.findOne({
        email: creatorEmail,
      });

      if (user?.isBlocked) {
        return res.status(403).json({
          success: false,
         message: "Your account has been blocked.",
        });
      }

      const existing = await creatorCollection.findOne({title, creatorEmail})

      if(existing){
        return res.status(400).json({
          message: "You already have a promt with this title"
        })
      }

      const promtData = {   title, description, content, category, aiTool, tags, difficulty, thumbnail, visibility, creatorId, creatorName, creatorEmail, creatorImage, status: "pending", isPremium: false, copyCount: 0, reviewCount: 0, averageRating: 0.0, bookmarkCount: 0, viewCount: 0, createdAt: new Date(), updatedAt: new Date(),}


      const result = await creatorCollection.insertOne(promtData)

      
      res.status(201).json({
      success: true,
      message: "Prompt added successfully",
      insertedId: result.insertedId,
    });
    })

//usser..............................................................

    //user add promt api

    app.post("/api/user/addPrompt", async (req, res) => {
  try {
    const { title, description, content, category, aiTool, tags, difficulty, thumbnail, userId, userName, userEmail, userImage, } = req.body;

    const user = await usersCollection.findOne({
        email: userEmail,
      });

      if (user?.isBlocked) {
        return res.status(403).json({
          success: false,
         message: "Your account has been blocked.",
        });
      }

    // একই Title আছে কিনা
    const existing = await creatorCollection.findOne({
      title,
      userEmail,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a prompt with this title.",
      });
    }

    // Free User Limit (৩টা Prompt)
    const totalPrompts = await creatorCollection.countDocuments({
      userEmail,
      role: "user",
    });

    if (totalPrompts >= 3) {
      return res.status(400).json({
        success: false,
        message:
          "Free users can only add 3 prompts. Upgrade to Premium.",
      });
    }

    const promptData = { title, description, content, category, aiTool, tags, difficulty, thumbnail, userId, userName, userEmail, userImage, role: "user", visibility: "Public", status: "pending", isPremium: false, copyCount: 0, bookmarkCount: 0, reviewCount: 0, averageRating: 0.0, viewCount: 0, createdAt: new Date(), updatedAt: new Date(), };

    const result = await creatorCollection.insertOne(promptData);

    res.status(201).json({
      success: true,
      message: "Prompt submitted successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add prompt.",
      error: error.message,
    });
  }
    });

    //user get  mypromt api
    app.get("/api/user/myPrompt",async (req, res) => {
      const {email} = req.query;
      const result = await creatorCollection.find({userEmail: email, role: "user"}).toArray();
      res.send(result)
    })

    //user update mypromt

    app.patch("/api/user/:id", async (req, res)=> {
      try{
       const { id } = req.params;
       const { userEmail, ...updateData } = req.body;

       const user = await usersCollection.findOne({
        email: userEmail,
       });

      if (user?.isBlocked) {
        return res.status(403).json({
          success: false,
         message: "Your account has been blocked.",
        });
      }

       const filter = {
         _id: new ObjectId(id),
         userEmail,
       };

        const updateDoc = {
          $set: {
            title: updateData.title,
            description:updateData.description,
            content: updateData.content,
            visibility:updateData.visibility,
            difficulty: updateData.difficulty,
            updatedAt: new Date()
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

    //user delete my promt

    app.delete("/api/user/:id", async (req, res) => {
      
      try {
        const { id } = req.params;
        const { email } = req.query;

        const user = await usersCollection.findOne({
          email,
        });

        if (user?.isBlocked) {
          return res.status(403).json({
            success: false,
          message: "Your account has been blocked.",
          });
        }

        const result = await creatorCollection.deleteOne({
          _id: new ObjectId(id),
          userEmail: email,
        });
      
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

//profile............................

    //User Profile Stats API

    app.get("/api/user/profile-stats", async (req, res) => {
      try {
        const { email } = req.query;
      
        const user = await usersCollection.findOne({ email });
      
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
      
        const totalSubmitted = await creatorCollection.countDocuments({
          userEmail: email,
          role: "user",
        });
      
        const approved = await creatorCollection.countDocuments({
          userEmail: email,
          role: "user",
          status: "approved",
        });
      
        const pending = await creatorCollection.countDocuments({
          userEmail: email,
          role: "user",
          status: "pending",
        });
      
        // Bookmark feature পরে করলে এখন 0 রাখো
        const saved = 0;
      
        res.json({
          success: true,
          user,
          stats: {
            totalSubmitted,
            approved,
            pending,
            saved,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    //Update Profile API

    app.put("/api/user/profile", async (req, res) => {
      try {
        const { email, name, image } = req.body;

        const users = await usersCollection.findOne({
          email,
        });

        if (users?.isBlocked) {
          return res.status(403).json({
            success: false,
            message: "Your account has been blocked.",
          });
        }
      
        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              name,
              image,
              updatedAt: new Date(),
            },
          }
        );
      
        const user = await usersCollection.findOne({ email });
      
        res.json({
          success: true,
          message: "Profile updated successfully",
          user,
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    //Premium Upgrade API

    app.patch("/api/user-premium", async (req, res) => {
      try {
        const { email } = req.body;

        const users = await usersCollection.findOne({
          email,
        });

        if (users?.isBlocked) {
          return res.status(403).json({
            success: false,
            message: "Your account has been blocked.",
          });
        }
      

        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
      
        // Payment Save
        await paymentCollection.insertOne({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          amount: 5,
          currency: "USD",
          plan: "Lifetime Premium",
          paymentMethod: "Demo Card",
          transactionId: `TXN-${Date.now()}`,
          status: "success",
          createdAt: new Date(),
        });
      
        // Premium Update
        await usersCollection.updateOne(
          { email },
          {
            $set: {
              isPremium: true,
              premiumSince: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      
        const updatedUser = await usersCollection.findOne({ email });
      
        res.send({
          success: true,
          message: "Premium activated successfully",
          user: updatedUser,
        });
      
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //Delete Account API

    app.delete("/api/user-account-delet", async (req, res) => {
      try {
        const { email } = req.body;
      
        console.log("Email:", email);
      
        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email is required",
          });
        }
      
        // Delete prompts
        await creatorCollection.deleteMany({
          $or: [
            { userEmail: email },
            { creatorEmail: email },
          ],
        });
      
        // Delete user
        const userResult = await usersCollection.deleteOne({
          email,
        });
      
        if (userResult.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
      
        return res.json({
          success: true,
          message: "Account deleted successfully",
        });
      
      } catch (error) {
        console.error("DELETE ACCOUNT ERROR:");
        console.error(error);
      
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });;


//app all promt ..........................................

    app.get("/api/allPromt", async ( req, res) => {
      const result = await creatorCollection
      .find({
      status: "approved",
      visibility: "Public",
      })
      .toArray();

      res.send(result);
    })


//admin.............................................................................

// all regisrer user

    app.get("/api/allUser/register", async(req, res) => {
      try {
        const result = await usersCollection.find().toArray()
        res.send(result)
      } catch (error){
        res.status(500).send(error)
      }
    })

    //admin user er role chang api

    app.patch("/api/admin/user/role/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;
      
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              role,
              updatedAt: new Date(),
            },
          }
        );
      
        res.send({
          success: true,
          message: "Role updated successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin user delet api

    app.delete("/api/admin/user-delet/:id", async (req, res) => {
      try {
        console.log("DELETE API HIT");
      
        const { id } = req.params;
        console.log("ID:", id);
      
        const user = await usersCollection.findOne({
          _id: new ObjectId(id),
        });
      
        console.log("USER:", user);
      
        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }
      
        const promptResult = await creatorCollection.deleteMany({
          $or: [
            { userEmail: user.email },
            { creatorEmail: user.email },
          ],
        });
      
        console.log("Prompt Deleted:", promptResult.deletedCount);
      
        const paymentResult = await paymentCollection.deleteMany({
          userEmail: user.email,
        });
      
        console.log("Payment Deleted:", paymentResult.deletedCount);
      
        const userResult = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });
      
        console.log("User Deleted:", userResult.deletedCount);
      
        res.send({
          success: true,
          message: "User deleted successfully",
        });
      
      } catch (error) {
        console.log(error);
      
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin block unblock api

    app.patch("/api/admin/user-block/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { isBlocked } = req.body;
      
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isBlocked,
              updatedAt: new Date(),
            },
          }
        );
      
        res.send({
          success: true,
          message: isBlocked
            ? "User blocked successfully"
            : "User unblocked successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

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



