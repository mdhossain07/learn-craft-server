const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5001;
const stripe = require("stripe")(process.env.SECRET_KEY);

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.esabfel.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const userCollection = client.db("craftDB").collection("users");
    const classCollection = client.db("craftDB").collection("classes");
    const assignmentCollection = client.db("craftDB").collection("assignments");
    const postAssignmentCollection = client
      .db("craftDB")
      .collection("postAssignments");
    const teacherCollection = client.db("craftDB").collection("teachers");
    const paymentCollection = client.db("craftDB").collection("payments");
    const cartCollection = client.db("craftDB").collection("carts");
    const enrollmentCollection = client.db("craftDB").collection("enrollments");
    const feedbackCollection = client.db("craftDB").collection("feedbacks");

    // jwt related API

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;

        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.admin === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // user related API

    app.post("/api/v1/create-user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(user);
    });

    app.get("/api/v1/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/user/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/api/v1/approved-user/:email", async (req, res) => {
      const { email } = req.params;
      const result = await teacherCollection.findOne(
        { email: email },
        { stats: "approved" }
      );
      res.send(result);
    });

    app.patch("/api/v1/admin/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const makeAdmin = {
        $set: { admin: "admin" },
      };
      const result = await userCollection.updateOne(filter, makeAdmin);
      res.send(result);
    });

    // admin API

    app.get("/api/v1/users/admin/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.admin === "admin";
      }
      res.send({ admin, user });
    });

    // class related API

    app.post("/api/v1/add-class", async (req, res) => {
      const myClass = req.body;
      const result = await classCollection.insertOne(myClass);
      res.send(result);
    });

    app.get("/api/v1/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/teacher-class", async (req, res) => {
      const { email } = req.query;
      const result = await classCollection
        .find({
          instructor_email: email,
        })
        .toArray();
      res.send(result);
    });

    app.get("/api/v1/class/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      // console.log(result);
      res.send(result);
    });

    app.get("/api/v1/recommend-class", async (req, res) => {
      const result = await classCollection
        .find({ enrollment: { $gte: 2 } })
        .toArray();
      res.send(result);
    });

    app.get("/api/v1/approved-classes", async (req, res) => {
      const { status, email } = req.query;
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get(`/api/v1/courses/search`, async (req, res) => {
      const { search } = req.query;
      const result = await classCollection
        .find({
          title: { $regex: search, $options: "i" },
        })
        .toArray();
      res.send(result);
    });

    app.get(`/api/v1/courses/sort`, async (req, res) => {
      const { sort } = req.query;
      console.log(sort);
      let sortValue = {};
      if (sort === "All Courses") {
        sortValue = {};
      }
      // let query = {};
      // if (sort === "Low To High") {
      //   sortValue = { price: 1 };
      // } else if (sort === "High To Low") {
      //   sortValue = { price: -1 };
      // } else if (sort === "All Courses") {
      //   sortValue = {};
      // }
      const result = await classCollection.find().sort(sortValue).toArray();

      console.log(result);
      // res.send(result);
    });

    app.patch("/api/v1/class/:id", async (req, res) => {
      const myClass = req.body;
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updateClass = {
        $set: {
          title: myClass.title,
          price: myClass.price,
          description: myClass.description,
          image: myClass.image,
        },
      };
      const result = await classCollection.updateOne(filter, updateClass);
      res.send(result);
    });

    app.delete("/api/v1/delete-class/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    app.patch(
      "/api/v1/approve/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const status = {
          $set: { status: "approved" },
        };
        const result = await classCollection.updateOne(filter, status);
        res.send(result);
      }
    );

    app.patch(
      "/api/v1/reject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const status = {
          $set: { status: "rejected" },
        };
        const result = await classCollection.updateOne(filter, status);
        res.send(result);
      }
    );

    // Assignment related API

    app.post("/api/v1/add-assignment", async (req, res) => {
      const assignments = req.body;
      const { classId } = req.body;
      const updateAssignment = await classCollection.updateOne(
        { _id: new ObjectId(classId) },
        { $inc: { assignment: 1 } }
      );
      if (updateAssignment.modifiedCount > 0) {
        const result = await assignmentCollection.insertOne(assignments);
        res.send(result);
      }
    });

    app.post("/api/v1/post-assignment", async (req, res) => {
      const assignment = req.body;
      const result = await postAssignmentCollection.insertOne(assignment);
      res.send(result);
    });

    app.get("/api/v1/assignments", async (req, res) => {
      const { id } = req.params;
      const query = { classId: id };
      const result = await assignmentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/api/v1/submitted-assignments", async (req, res) => {
      try {
        const { id, email } = req.query;
        const query = { email: email, assignmentId: id };
        const result = await postAssignmentCollection.findOne(query);
        res.send(result);
      } catch (err) {
        console.error("Error Fetching Data");
      }
    });

    app.get("/api/v1/assignments-count", async (req, res) => {
      try {
        const { email } = req.query;
        const query = { email: email };
        const result = await postAssignmentCollection.countDocuments(query);
        res.send({ result });
      } catch (err) {
        console.error("Error Fetching Data");
      }
    });

    app.get("/api/v1/assignment/:id", async (req, res) => {
      const { id } = req.params;
      const query = { classId: id };
      const result = await assignmentCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/api/v1/update-assignment/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { classId: id };
      const updateAssignment = {
        $inc: { PDA: 1 },
      };
      const result = await assignmentCollection.updateOne(
        filter,
        updateAssignment
      );
      res.send(result);
    });

    // teacher related API

    app.post("/api/v1/add-teacher", async (req, res) => {
      const teacher = req.body;
      const result = await teacherCollection.insertOne(teacher);
      res.send(result);
    });

    app.get("/api/v1/teachers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/teacher/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await teacherCollection.findOne(query);
      res.send(result);
    });

    app.patch("/api/v1/teacher-approve/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const status = {
        $set: { status: "approved" },
      };
      const result = await teacherCollection.updateOne(filter, status);
      res.send(result);
    });

    app.patch("/api/v1/teacher-reject/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const status = {
        $set: { status: "rejected" },
      };
      const result = await teacherCollection.updateOne(filter, status);
      res.send(result);
    });

    // cart API

    app.post("/api/v1/add-cart", async (req, res) => {
      const myClass = req.body;
      const result = await cartCollection.insertOne(myClass);
      res.send(result);
    });

    app.get("/api/v1/carts", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // enrollments API

    app.get("/api/v1/enrollments", async (req, res) => {
      const { email } = req.query;
      const query = { user_email: email };
      const result = await enrollmentCollection.find(query).toArray();
      const totalEnroll = await enrollmentCollection.countDocuments(query);
      res.send({ result, totalEnroll });
    });

    // payment API

    app.post("/api/v1/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100) || 1;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/api/v1/add-payment", async (req, res) => {
      const paymentInfo = req.body;
      const { classId } = req.body;
      const [myClassId] = classId;

      const classQuery = {
        _id: new ObjectId(myClassId),
        user_email: paymentInfo.email,
      };

      const isExist = await enrollmentCollection.findOne(classQuery);

      console.log(isExist);

      if (isExist) {
        const query = {
          _id: {
            $in: paymentInfo.cartIds.map((id) => new ObjectId(id)),
          },
        };
        const result = await cartCollection.deleteMany(query);
        res.send({ message: "already exists", result });
        return;
      } else {
        const enrollQuery = {
          _id: {
            $in: paymentInfo.classId.map((id) => new ObjectId(id)),
          },
        };
        const options = {
          projection: {
            _id: 0,
            title: 1,
            price: 1,
            instructor_name: 1,
            image: 1,
            assignment: 1,
          },
        };

        const getClass = await classCollection.findOne(enrollQuery, options);

        // console.log(getClass);

        const enroll = await enrollmentCollection.insertOne({
          title: getClass.title,
          instructor_name: getClass.instructor_name,
          image: getClass.image,
          assignment: getClass.assignment,
          price: getClass.price,
          user_email: paymentInfo.email,
          classId: myClassId,
        });

        const enrollClass = await classCollection.updateOne(
          { _id: { $in: paymentInfo.classId.map((id) => new ObjectId(id)) } },
          { $inc: { enrollment: 1 } }
        );

        const updateEnrollment = await enrollmentCollection.updateOne(
          { _id: { $in: paymentInfo.classId.map((id) => new ObjectId(id)) } },
          {
            $set: {
              user_email: paymentInfo.email,
            },
          }
        );

        const paymentResult = await paymentCollection.insertOne(paymentInfo);
        const query = {
          _id: {
            $in: paymentInfo.cartIds.map((id) => new ObjectId(id)),
          },
        };
        const result = await cartCollection.deleteMany(query);
        res.send({
          paymentResult,
          result,
          enroll,
          enrollClass,
          updateEnrollment,
        });
      }
    });

    app.get("/api/v1/payments", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // feedback related APIs

    app.post("/api/v1/add-feedback", async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    app.get("/api/v1/feedbacks", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Learn Craft server has started");
});

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
