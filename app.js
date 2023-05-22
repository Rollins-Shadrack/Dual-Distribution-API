const express = require('express')
const app = express()
const cors = require("cors");
//const connection = require('./Database/connectionDB')

//Initializing body parser
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

//setting up our cors
app.use(cors({
  origin:'*',
  credentials:true
}))

//setting up the routes
app.use('/retailer', require('./routes/retailer'))
app.use('/buyer', require('./routes/buyer'))
app.use('/wholeseller', require('./routes/wholeseller'))
app.use('/product', require('./routes/product'))
app.use('/admin', require('./routes/admin'))
  
const PORT = process.env.PORT || 8000;

app.listen(PORT, ()=>console.log(`server started at port ${PORT}`))