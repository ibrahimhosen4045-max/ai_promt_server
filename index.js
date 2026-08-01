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
    const bookmarkCollection = db.collection("bookmark")
    const ratingCollection = db.collection("ratings");
    const reviewCollection = db.collection("reviews");
    const reportCollection = db.collection("reports");
    const copyHistoryCollection = db.collection("copyHistory");
    

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

    // Prompt Status Counts
    const approved = prompts.filter(
      (prompt) => prompt.status === "approved"
    ).length;

    const pending = prompts.filter(
      (prompt) => prompt.status === "pending"
    ).length;

    const rejected = prompts.filter(
      (prompt) => prompt.status === "rejected"
    ).length;

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
      approved,
      pending,
      rejected,
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

    //user overview dashboard api

app.get("/api/user/dashboard-overview", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Total Bookmarks
    const totalBookmarks = await bookmarkCollection.countDocuments({
      userEmail: email,
    });

    const prompts = await creatorCollection.find().toArray();

const totalCopies = prompts.reduce(
  (sum, item) => sum + (item.copyCount || 0),
  0
);

    // Total Reviews
    const totalReviews = await reviewCollection.countDocuments({
      userEmail: email,
    });

    // Total Reports
    const totalReports = await reportCollection.countDocuments({
      userEmail: email,
    });

    // Recent Bookmarks
    const recentBookmarks = await bookmarkCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    // Copy Chart Data (এখন empty)
    const copyHistory = [];

    res.json({
      success: true,
      overview: {
        premium: user.isPremium || false,
        joinedAt: user.createdAt,

        savedPrompts: totalBookmarks,
        copiedPrompts: totalCopies,
        reviews: totalReviews,
        reports: totalReports,

        copyHistory,
        recentBookmarks,
      },
    });
  } catch (error) {
    console.error("Dashboard Overview Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

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

    //user add boock mark

    app.get("/api/bookmark", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    // User bookmark list
    const bookmarks = await bookmarkCollection
      .find({ userEmail: email })
      .toArray();

    if (bookmarks.length === 0) {
      return res.send({
        success: true,
        bookmarks: [],
      });
    }

    // Prompt IDs
    const promptIds = bookmarks.map(
      (item) => new ObjectId(item.promptId)
    );

    // Prompt details
    const prompts = await creatorCollection
      .find({
        _id: { $in: promptIds },
      })
      .toArray();

    // Merge bookmark + prompt data
    const result = bookmarks.map((bookmark) => {
      const prompt = prompts.find(
        (item) => item._id.toString() === bookmark.promptId
      );

      return {
        bookmarkId: bookmark._id,
        bookmarkedAt: bookmark.createdAt,

        ...(prompt || {}),
      };
    });

    res.send({
      success: true,
      total: result.length,
      bookmarks: result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//bookmark remove api

app.delete("/api/bookmark/:promptId", async (req, res) => {
  try {
    const { promptId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    // Bookmark খুঁজে বের করা
    const bookmark = await bookmarkCollection.findOne({
      promptId,
      userEmail: email,
    });

    if (!bookmark) {
      return res.status(404).send({
        success: false,
        message: "Bookmark not found",
      });
    }

    // Bookmark delete
    await bookmarkCollection.deleteOne({
      _id: bookmark._id,
    });

    // Prompt এর bookmarkCount ১ কমানো
    await creatorCollection.updateOne(
      { _id: new ObjectId(promptId) },
      {
        $inc: {
          bookmarkCount: -1,
        },
      }
    );

    res.send({
      success: true,
      message: "Bookmark removed successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
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

    // Total Saved Bookmarks
    const saved = await bookmarkCollection.countDocuments({
      userEmail: email,
    });

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

    //search function emplement banner

    app.get("/api/prompts/search", async (req, res) => {
      try {
        const { q } = req.query;
      
        // যদি search না থাকে তাহলে approved prompt return করবে
        if (!q || !q.trim()) {
          const prompts = await creatorCollection
            .find({ status: "approved" })
            .sort({ createdAt: -1 })
            .toArray();
        
          return res.send({
            success: true,
            total: prompts.length,
            data: prompts,
          });
        }
      
        const keyword = q.trim();
      
        const prompts = await creatorCollection
          .find({
            status: "approved",
            $or: [
              {
                title: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                description: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                content: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                category: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                aiTool: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                difficulty: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                creatorName: {
                  $regex: keyword,
                  $options: "i",
                },
              },
              {
                tags: {
                  $elemMatch: {
                    $regex: keyword,
                    $options: "i",
                  },
                },
              },
            ],
          })
          .sort({
            copyCount: -1,
            createdAt: -1,
          })
          .toArray();
        
        res.send({
          success: true,
          keyword,
          total: prompts.length,
          data: prompts,
        });
      } catch (error) {
        console.error(error);
      
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //promt details get api

    app.get("/api/prompt/:id", async (req, res) => {
      try {
        const { id } = req.params;
     
        const prompt = await creatorCollection.findOne({
          _id: new ObjectId(id),
        });
      
        if (!prompt) {
          return res.status(404).send({
            success: false,
            message: "Prompt not found",
          });
        }
      
        res.send({
          success: true,
          data: prompt,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //promt view count api

    app.patch("/api/prompt/view/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $inc: {
              viewCount: 1,
            },
          }
        );
      
        res.send({
          success: true,
          message: "View counted",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //copy count api

    app.patch("/api/prompt/copy/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $inc: {
              copyCount: 1,
            },
          }
        );
      
        res.send({
          success: true,
          message: "Copy count updated",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //add to boock mark api

    app.post("/api/bookmark", async (req, res) => {
      try {
        const { promptId, userEmail } = req.body;
      
        if (!promptId || !userEmail) {
          return res.status(400).send({
            success: false,
            message: "Prompt ID and User Email are required",
          });
        }
      
        const alreadyBookmarked = await bookmarkCollection.findOne({
          promptId,
          userEmail,
        });
      
        if (alreadyBookmarked) {
          return res.status(400).send({
            success: false,
            message: "Already bookmarked",
          });
        }
      
        await bookmarkCollection.insertOne({
          promptId,
          userEmail,
          createdAt: new Date(),
        });
      
        await creatorCollection.updateOne(
          {
            _id: new ObjectId(promptId),
          },
          {
            $inc: {
              bookmarkCount: 1,
            },
          }
        );
      
        res.send({
          success: true,
          message: "Bookmark added successfully",
        });
      
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //bockmark delet api

    app.delete("/api/bookmark/:promptId", async (req, res) => {
      try {
        const { promptId } = req.params;
        const { email } = req.query;
      
        const result = await bookmarkCollection.deleteOne({
          promptId,
          userEmail: email,
        });
      
        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Bookmark not found",
          });
        }
      
        // bookmark count কমানো
        await creatorCollection.updateOne(
          { _id: new ObjectId(promptId) },
          {
            $inc: {
              bookmarkCount: -1,
            },
          }
        );
      
        res.send({
          success: true,
          message: "Bookmark removed",
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //boockmark check api

    app.get("/api/bookmark/check", async (req, res) => {
  try {
    const { promptId, email } = req.query;

    const bookmark = await bookmarkCollection.findOne({
      promptId,
      userEmail: email,
    });

    res.send({
      success: true,
      bookmarked: !!bookmark,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

    //Rating submit api 

    app.post("/api/rating", async (req, res) => {
  try {
    const { promptId, userEmail, userName, rating } = req.body;

    

    const existing = await ratingCollection.findOne({
      promptId,
      userEmail,
    });

    if (existing) {
      await ratingCollection.updateOne(
        { _id: existing._id },
        {
          $set: {
            rating,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await ratingCollection.insertOne({
        promptId,
        userEmail,
        userName,
        rating,
        createdAt: new Date(),
      });
    }

    const ratings = await ratingCollection
      .find({ promptId })
      .toArray();

    const total = ratings.reduce((sum, r) => sum + Number(r.rating), 0);

    const averageRating = ratings.length
      ? Number((total / ratings.length).toFixed(1))
      : 0;

    await creatorCollection.updateOne(
      { _id: new ObjectId(promptId) },
      {
        $set: {
          averageRating,
          reviewCount: ratings.length,
        },
      }
    );

    res.send({
      success: true,
      message: "Rating submitted successfully",
      averageRating,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
    });

    //get Rating api

app.get("/api/rating/check", async (req, res) => {
  try {
    const { promptId, email } = req.query;

    const rating = await ratingCollection.findOne({
      promptId,
      userEmail: email,
    });

    res.send({
      success: true,
      rating: rating?.rating || 0,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//user reviw api

app.post("/api/review", async (req, res) => {
  try {
    const {
      promptId,
      userEmail,
      userName,
      userImage,
      rating,
      review,
    } = req.body;

    await reviewCollection.insertOne({
      promptId,
      userEmail,
      userName,
      userImage,
      rating,
      review,
      createdAt: new Date(),
    });

    res.send({
      success: true,
      message: "Review submitted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//get reviw check api

app.get("/api/review/:promptId", async (req, res) => {
  try {
    const reviews = await reviewCollection
      .find({
        promptId: req.params.promptId,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send({
      success: true,
      data: reviews,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//get reportet promt

app.post("/api/report", async (req, res) => {
  try {
    const {
      promptId,
      userEmail,
      userName,
      reason,
      description,
    } = req.body;

    const existing = await reportCollection.findOne({
      promptId,
      userEmail,
    });

    if (existing) {
      return res.status(400).send({
        success: false,
        message: "You already reported this prompt.",
      });
    }

    await reportCollection.insertOne({
      promptId,
      userEmail,
      userName,
      reason,
      description,
      status: "pending",
      createdAt: new Date(),
    });

    res.send({
      success: true,
      message: "Report submitted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});




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

    //admin get all prompt data this api

    app.get("/api/admin/all-prompts", async (req, res) => {
      try {
        const prompts = await creatorCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
      
        res.send(prompts);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin approve prompt api

    app.patch("/api/admin/prompt/approve/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "approved",
              updatedAt: new Date(),
            },
          }
        );
      
        res.send({
          success: true,
          message: "Prompt approved successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin rejected prompt api

    app.patch("/api/admin/prompt/reject/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "rejected",
              updatedAt: new Date(),
            },
          }
        );
      
        res.send({
          success: true,
          message: "Prompt rejected successfully",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin prompt premium and free taggle api

    app.patch("/api/admin/prompt/premium/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { isPremium } = req.body;
      
        const result = await creatorCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              isPremium,
              updatedAt: new Date(),
            },
          }
        );
      
        res.send({
          success: true,
          message: isPremium
            ? "Prompt marked as Premium"
            : "Prompt marked as Free",
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin delet promt api

    app.delete("/api/admin/prompt/:id", async (req, res) => {
      try {
        const { id } = req.params;
      
        const result = await creatorCollection.deleteOne({
          _id: new ObjectId(id),
        });
      
        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Prompt not found",
          });
        }
      
        res.send({
          success: true,
          message: "Prompt deleted successfully",
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin all payment state

    app.get("/api/admin/payment-stats", async (req, res) => {
      try {
        const payments = await paymentCollection.find().toArray();
      
        const totalPayments = payments.length;

        const users = await usersCollection.find().toArray()

        const premiumUsers = users.filter(
          (user) => user.isPremium === true
        ).length
      
        const totalRevenue = payments.reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        );
      
        const successfulPayments = payments.filter(
          (payment) => payment.status === "success"
        ).length;
      
        const failedPayments = payments.filter(
          (payment) => payment.status === "failed"
        ).length;
      
        const pendingPayments = payments.filter(
          (payment) => payment.status === "pending"
        ).length;
      
        res.send({
          success: true,
          data: {
            totalPayments,
            totalRevenue,
            successfulPayments,
            failedPayments,
            pendingPayments,
            premiumUsers
          },
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //admin all payment history

    app.get("/api/admin/payments", async (req, res) => {
      try {
        const payments = await paymentCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
      
        res.send({
          success: true,
          data: payments,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    //Admin Get All Reports

app.get("/api/admin/reports", async (req, res) => {
  try {
    const reports = await reportCollection
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send({
      success: true,
      data: reports,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//Delete Report

app.delete("/api/admin/report/:id", async (req, res) => {
  try {
    const result = await reportCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.send({
      success: true,
      message: "Report deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

//admin overview api

app.get("/api/admin/dashboard-overview", async (req, res) => {
  try {
    const months = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // =============================
    // Summary Counts
    // =============================

    const totalUsers = await usersCollection.countDocuments();

    const totalCreators = await usersCollection.countDocuments({
      role: "Creator",
    });

    const totalPrompts = await creatorCollection.countDocuments();

    const totalPremiumUsers = await usersCollection.countDocuments({
      isPremium: true,
    });

    const totalBookmarks = await bookmarkCollection.countDocuments();

    const totalReports = await reportCollection.countDocuments();

    const totalReviews = await reviewCollection.countDocuments();

    // =============================
    // Revenue
    // =============================

    const revenueResult = await paymentCollection
      .aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$amount",
            },
          },
        },
      ])
      .toArray();

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // =============================
    // Prompt Status
    // =============================

    const approvedPrompts = await creatorCollection.countDocuments({
      status: "approved",
    });

    const pendingPrompts = await creatorCollection.countDocuments({
      status: "pending",
    });

    const rejectedPrompts = await creatorCollection.countDocuments({
      status: "rejected",
    });

    // =============================
    // Recent Users
    // =============================

    const recentUsers = await usersCollection
      .find()
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .toArray();

    // =============================
    // Recent Prompts
    // =============================

    const recentPrompts = await creatorCollection
      .find()
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .toArray();

    // =============================
    // Top Creators
    // =============================

    const topCreatorsRaw = await creatorCollection
      .aggregate([
        {
          $group: {
            _id: "$creatorName",

            promptsCount: {
              $sum: 1,
            },

            copiesCount: {
              $sum: "$copyCount",
            },
          },
        },
        {
          $sort: {
            copiesCount: -1,
          },
        },
        {
          $limit: 5,
        },
      ])
      .toArray();

    const topCreators = topCreatorsRaw.map((item) => ({
      name: item._id,
      promptsCount: item.promptsCount,
      copiesCount: item.copiesCount,
    }));

    // =============================
    // Monthly Users
    // =============================

    const monthlyUsersRaw = await usersCollection
      .aggregate([
        {
          $group: {
            _id: {
              $month: "$createdAt",
            },
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray();

    const monthlyUsers = monthlyUsersRaw.map((item) => ({
      month: months[item._id],
      count: item.total,
    }));

    // =============================
    // Monthly Prompts
    // =============================

    const monthlyPromptsRaw = await creatorCollection
      .aggregate([
        {
          $group: {
            _id: {
              $month: "$createdAt",
            },
            total: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray();

    const monthlyPrompts = monthlyPromptsRaw.map((item) => ({
      month: months[item._id],
      count: item.total,
    }));

    // =============================
    // Response
    // =============================

    res.send({
      success: true,
      data: {
        // Summary
        totalUsers,
        totalCreators,
        totalPrompts,
        totalPremiumUsers,
        totalBookmarks,
        totalReviews,
        totalReports,
        totalRevenue,

        // Prompt Status
        approvedPrompts,
        pendingPrompts,
        rejectedPrompts,

        // Charts
        monthlyUsers,
        monthlyPrompts,
        topCreators,

        // Tables
        recentUsers,
        recentPrompts,
      },
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



