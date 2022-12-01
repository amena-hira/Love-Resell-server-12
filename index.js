const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.cwbwt8c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    const categoryCollection = client.db('loveresell').collection('category');
    const usersCollection = client.db('loveresell').collection('users');
    const productCollection = client.db('loveresell').collection('products');
    const orderCollection = client.db('loveresell').collection('orders');

    app.get('/category',async(req,res)=>{
        const query = {};
        const result = await categoryCollection.find(query).limit(3).toArray();
        res.send(result)
    })

    app.post('/category',async(req,res)=>{
        const category = req.body;
        console.log(category);
        const result = await categoryCollection.insertOne(category);
        res.send(result)
    })

    // -----------------user-------------------
    app.get('/users',async(req,res)=>{
        const query = {};
        const result = await usersCollection.find(query).toArray();
        res.send(result)
    })
    app.post('/users', async (req, res) => {
        const user = req.body;
        console.log(user);
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });
    app.get('/users/sellers', async (req, res) => {
        const query = { status: 'seller' }
        const sellers = await usersCollection.find(query).toArray();
        res.send(sellers);
    })
    app.delete('/users/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await usersCollection.deleteOne(filter);
        res.send(result);
    })
    // --------------seller verify-----------------
    app.put('/users/sellers/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                verify: true
            }
        }
        const sellers = await usersCollection.updateOne(filter, updatedDoc, options);
        res.send(sellers);
    })
    // -------------Hook Seller and Admin-----------------
    app.get('/users/seller/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await usersCollection.findOne(query);
        res.send({ isSeller: user?.status === 'seller' });
    })
    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await usersCollection.findOne(query);
        res.send({ isAdmin: user?.status === 'admin' });
    })

    // ---------------Product search based on seller email--------------
    app.get('/products/seller',async(req,res)=>{
        const email = req.query.email;
        const query = {email};
        const result = await productCollection.find(query).toArray();
        res.send(result)
    })
    app.get('/products/verify',async(req,res)=>{
        const email = req.query.email;
        const query = {email:email};
        const user = await usersCollection.findOne(query);
        res.send({isVerify: user?.verify})
    })
    
    // -----------------Product-------------------
    app.get('/products',async(req,res)=>{
        const query = {};
        const result = await productCollection.find(query).toArray();
        res.send(result)
    })
    app.get('/products/category/:id', async (req, res) => {
        const id = req.params.id;
        const query = { 
            category: id,
            availableStatus: 'available'
        };
        const result = await productCollection.find(query).toArray();
        res.send(result);
    })
    app.post('/products', async (req, res) => {
        const product = req.body;
        const email = req.query.email;
        const query = {
            email
        }
        const user = await usersCollection.findOne(query);
        if (user?.status === 'seller') {
            const result = await productCollection.insertOne(product);
            res.send(result);
        }
        else{
            res.send({ isSeller: false });
        }
    });
    app.put('/products/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                availableStatus: 'sold'
            }
        }
        const result = await productCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });
    app.put('/product/advertise/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                advertise: true
            }
        }
        console.log(filter,options,updatedDoc);
        const result = await productCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });

    // --------------Order----------------
    app.get('/orders',async(req,res)=>{
        const email = req.query.email;
        const query = {email};
        const result = await orderCollection.find(query).toArray();
        res.send(result)
    })
    app.post('/orders', async (req, res) => {
        const user = req.body;
        const result = await orderCollection.insertOne(user);
        res.send(result);
    });
    app.put('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                paid: true
            }
        }
        console.log(filter,options,updatedDoc);
        const result = await orderCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });
    

}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('doctors portal server is running');
})

app.listen(port, () => console.log(`Doctors portal running on ${port}`))