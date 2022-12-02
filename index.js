const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.cwbwt8c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}
async function run() {
    const categoryCollection = client.db('loveresell').collection('category');
    const usersCollection = client.db('loveresell').collection('users');
    const productCollection = client.db('loveresell').collection('products');
    const orderCollection = client.db('loveresell').collection('orders');
    const reportCollection = client.db('loveresell').collection('reports');
    const paymentCollection = client.db('loveresell').collection('payments');

    // ---------JWT----------
    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
            return res.send({ accessToken: token });
        }
        res.status(403).send({ accessToken: '' })
    });
    // -------------category------------

    app.get('/category', async (req, res) => {
        const query = {};
        const result = await categoryCollection.find(query).limit(3).toArray();
        res.send(result)
    })

    app.post('/category', async (req, res) => {
        const category = req.body;
        console.log(category);
        const result = await categoryCollection.insertOne(category);
        res.send(result)
    })

    // -----------------user-------------------
    app.get('/users', async (req, res) => {
        const query = {};
        const users = await usersCollection.find(query).toArray();
        const result = users.filter(user => user.name !== 'Admin')
        res.send(result)
    })
    app.post('/users', async (req, res) => {
        const user = req.body;
        console.log(user);
        const email = req.body.email;
        const query = {}
        const users = await usersCollection.find(query).toArray();
        const existUser = users.find(user => user.email === email);
        console.log(existUser)
        if (existUser) {
            return res.send({ message: 'User is exist' })
        }
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
        console.log(user)
        res.send({ isSeller: user?.status === 'seller' });
    })
    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email }
        const user = await usersCollection.findOne(query);
        res.send({ isAdmin: user?.status === 'admin' });
    })

    // ---------------Product search based on seller email--------------
    app.get('/products/seller', async (req, res) => {
        const email = req.query.email;
        const query = { email };
        const result = await productCollection.find(query).toArray();
        res.send(result)
    })
    app.get('/products/verify', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send({ isVerify: user?.verify })
    })

    // -----------------Product-------------------
    app.get('/products', async (req, res) => {
        const query = {};
        const result = await productCollection.find(query).toArray();
        res.send(result)
    })
    app.put('/product/order/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                paid: true
            }
        }
        console.log(filter, options, updatedDoc);
        const result = await productCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });

    // -------------------category based product--------------
    app.get('/products/category/:id', async (req, res) => {
        const id = req.params.id;
        const query = {
            category: id,
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
        else {
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
    app.put('/product/advertise/:id', verifyJWT, async (req, res) => {
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                advertise: true,
            }
        }
        console.log(filter, options, updatedDoc);
        const result = await productCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });
    // after payment paid true added in product table
    

    // --------------Order----------------
    app.get('/orders', verifyJWT, async (req, res) => {
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        const query = { email };
        const result = await orderCollection.find(query).toArray();
        res.send(result)
    })
    app.put('/orders/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const options = { upsert: true };
        const updatedDoc = {
            $set: {
                paid: true
            }
        }
        console.log(filter, options, updatedDoc);
        const result = await orderCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    });
    app.post('/orders', async (req, res) => {
        const user = req.body;
        const result = await orderCollection.insertOne(user);
        res.send(result);
    });

    // -------------report-------------
    app.get('/reports', async (req, res) => {
        const query = {};
        const result = await reportCollection.find(query).toArray();
        res.send(result)
    })
    app.post('/reports', async (req, res) => {
        const user = req.body;
        const result = await reportCollection.insertOne(user);
        res.send(result);
    });
    app.delete('/reports/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await reportCollection.deleteOne(filter);
        res.send(result);
    })

    // ---------Stripe Payment----------------
    app.get('/order/payment/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await orderCollection.findOne(filter);
        res.send(result);
    })
    app.post('/create-payment-intent', async (req, res) => {
        const order = req.body;
        const price = order.productPrice;
        const amount = price * 100;
        const payment = await stripe.paymentIntents.create({
            currency: 'usd',
            amount: amount,
            "payment_method_types": [
                "card"
            ]
        });
        res.send({
            clientSecret: payment.client_secret,
        });
    })
    // -------------Payment store------------------
    app.post('/payments', async(req,res)=>{
        const payment = req.body;
        const result = await paymentCollection.insertOne(payment);
        const productId = payment.productId;
        const filter = {_id: ObjectId(productId)}
        const updatedDoc = {
            $set: {
                paid: true
            }
        }
        const updateProduct = await productCollection.updateOne(filter,updatedDoc);
        const orderId = payment.orderId;
        const find = {_id: ObjectId(orderId)};
        const updateOrder = await orderCollection.updateOne(find, updatedDoc);
        res.send(result);
    })


}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('Love Resell server is running');
})

app.listen(port, () => console.log(`Love Resell running on ${port}`))