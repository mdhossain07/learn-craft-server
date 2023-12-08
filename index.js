const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
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
    const teacherCollection = client.db("craftDB").collection("teachers");
    const paymentCollection = client.db("craftDB").collection("payments");
    const cartCollection = client.db("craftDB").collection("carts");

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

    app.get("/api/v1/users", async (req, res) => {
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

    app.get("/apiv1/users/admin/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.admin === "admin";
      }
      res.send(admin);
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
      res.send(result);
    });

    app.get("/api/v1/approved-classes", async (req, res) => {
      const { status, email } = req.query;
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
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

    app.patch("/api/v1/approve/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const status = {
        $set: { status: "approved" },
      };
      const result = await classCollection.updateOne(filter, status);
      res.send(result);
    });

    app.patch("/api/v1/reject/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const status = {
        $set: { status: "rejected" },
      };
      const result = await classCollection.updateOne(filter, status);
      res.send(result);
    });

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

    app.get("/api/v1/assignments", async (req, res) => {
      const result = await assignmentCollection.find().toArray();
      res.send(result);
    });

    // teacher related API

    app.post("/api/v1/add-teacher", async (req, res) => {
      const teacher = req.body;
      const result = await teacherCollection.insertOne(teacher);
      res.send(result);
    });

    app.get("/api/v1/teachers", async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/teacher/:id", async (req, res) => {
      const { id } = req.body;
      const query = { _id: new ObjectId(id) };
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

    app.get("/api/v1/payments", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/api/v1/add-payment", async (req, res) => {
      const paymentInfo = req.body;
      const paymentResult = await paymentCollection.insertOne(paymentInfo);
      const query = {
        _id: {
          $in: paymentInfo.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const result = await cartCollection.deleteMany(query);
      res.send({ paymentResult, result });
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
