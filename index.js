const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors")
var admin = require("firebase-admin");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialization

var serviceAccount = require("./ema-jhon-simple-bffef-firebase-adminsdk-ftlxf-03402de9ad.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


//middleware 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o9fdd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1]
        try {
            const decodeUser = await admin.auth().verifyIdToken(idToken);
            req.decodeUserEmail = decodeUser.email;
        } catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("online_shop");
        const productCollection = database.collection("products");
        const orderCollection = database.collection("orders")
        // get api
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray()
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            })
        })

        //post 
        app.get("/orders", verifyToken, async (req, res) => {

            const email = req.query.email
            if (req.decodeUserEmail === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query)
                const orders = await cursor.toArray();
                res.json(orders)
            }
            else {
                res.status(401).json({ message: 'user not authorized' })
            }
        })

        app.post("/orders", async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order)
            res.json(result)
        })

        // use post to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const product = await productCollection.find(query).toArray()
            res.json(product)
        })

    }
    finally {

    }
} run().catch(console.dir)


app.get("/", (req, res) => {
    console.log("hitting back end");
    res.send("hitting server")
})
app.listen(port, () => {
    console.log("listen to ", port);
})
