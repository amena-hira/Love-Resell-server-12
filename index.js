const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.cwbwt8c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log(uri)

async function run() {
    const categoryCollection = client.db('loveresell').collection('category');

    app.get('/category',async(req,res)=>{
        const query = {};
        const result = await categoryCollection.find(query).toArray();
        res.send(result)
    })

    app.post('/category',async(req,res)=>{
        const category = req.body;
        console.log(category);
        const result = await categoryCollection.insertOne(category);
        res.send(result)
    })

}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('doctors portal server is running');
})

app.listen(port, () => console.log(`Doctors portal running on ${port}`))