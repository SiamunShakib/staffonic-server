const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000 ;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cyyds7t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function startServer() {
  try {
    // Connect the client first
    await client.connect();
    console.log("Connected to MongoDB");

    const userCollection = client.db('staffonic-admin').collection('user');
    const workRecordsCollection = client.db('staffonic-admin').collection('workRecords');
   const paymentsCollection = client.db("staffonic-admin").collection("payments");



    // user apis
    app.get('/users', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send({ insertedId: result.insertedId });
    });


    // works records apis
        app.get('/workRecords', async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email query is required" });
      const records = await workRecordsCollection.find({ email }).toArray();
      res.send(records);
    });

    app.post('/workRecords', async (req, res) => {
      const work = req.body;
      const result = await workRecordsCollection.insertOne(work);
      res.send({ insertedId: result.insertedId });
    });

      app.delete('/workRecords/:id', async (req, res) => {
      const id = req.params.id;
      const result = await workRecordsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.put('/workRecords/:id', async (req, res) => {
      const id = req.params.id;
      const updatedWork = req.body;
      const {_id, ...dataToUpdate} = updatedWork;
      const result = await workRecordsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: dataToUpdate }
      );
      res.send(result);
    });


    // Toggle employee verification
    app.patch("/users/:id/verify", async (req, res) => {
      const id = req.params.id;
      const user = await userCollection.findOne({ _id: new ObjectId(id) });
      const newStatus = !user?.isVerified; // toggle

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { isVerified: newStatus } }
      );
      res.send({ modifiedCount: result.modifiedCount, isVerified: newStatus });
    });


    // payment apis
      app.post("/payments", async (req, res) => {
      const payment = req.body; // {userId, salary, month, year, status}
      const result = await paymentsCollection.insertOne(payment);
      res.send({ insertedId: result.insertedId });
    });

    // get payments (for payroll/admin)
    app.get("/payments", async (req, res) => {
      const payments = await paymentsCollection.find().toArray();
      res.send(payments);
    });


    // Approve / execute a payment
app.patch("/payments/:id", async (req, res) => {
  const id = req.params.id;
  const { status, paymentDate } = req.body;

  try {
    const result = await paymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, paymentDate } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Payment not found" });
    }

    res.send({ modifiedCount: result.modifiedCount, status, paymentDate });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to update payment" });
  }
});


    // Get payment history for specific employee
    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const payments = await paymentsCollection
        .find({ email })
        .sort({ year: 1, month: 1 }) // earliest first
        .toArray();
      res.send(payments);
    });





// Fire a user (soft delete)
app.patch("/users/:id/fire", async (req, res) => {
  const id = req.params.id;
  const result = await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { fired: true } }
  );
  res.send(result);
});

// Make HR
app.patch("/users/:id/makeHR", async (req, res) => {
  const id = req.params.id;
  const result = await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role: "hr" } }
  );
  res.send(result);
});

// Adjust salary
app.patch("/users/:id/salary", async (req, res) => {
  const id = req.params.id;
  const { salary } = req.body;
  const result = await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { salary: salary } }
  );
  res.send(result);
});









    
    // root
    app.get('/', (req, res) => {
      res.send('staffonic is running');
    });

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

  } catch (err) {
    console.error(err);
  }
}

// Start the server and connect to DB
startServer();
