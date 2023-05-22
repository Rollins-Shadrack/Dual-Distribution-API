const express = require('express')
const router = express.Router();
const multer  = require('multer')
const path = require('path')
const connection = require('../Database/connectionDB')
const fs = require('fs')
const datetime = require('node-datetime')
const axios = require('axios')
const unirest = require('unirest')


//set up the storage engine for multer
const storage = multer.diskStorage({
    destination: (req,file,cb) =>{
        cb(null, './uploadedImages')
    },
    filename:(req, file, cb) =>{
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // set up the filename for the uploaded files
    }
})

const upload = multer({storage:storage})

router.post('/addproduct', upload.single('image'), async(req,res) =>{
    
    if(!req.file || !req.body.credentials.pname || !req.body.credentials.pdesc || !req.body.credentials.pqty || !req.body.credentials.pprice){
        return res.status(400).json({message:"All fields are required!"})
    }
        const image = req.file.filename
        const {pname,pdesc, pqty,pprice} = req.body.credentials
    try{
        const sql = `INSERT INTO products (productname, productdescription, productquantity, productprice, productimage) VALUES ('${pname}','${pdesc}', '${pqty}', '${pprice}', '${image}')`;
        connection.query(sql,(err,result) =>{
            if(err){
                console.log(err)
                return res.status(500).json({message:"Internal Server error"})
            }
            return res.status(200).json({message:`Product Added Successfully`})
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"})
    }
    
})

//getting all products
router.post('/products',async(req,res) =>{
    connection.query(`SELECT * FROM products`,(err,products) =>{
        if(err){
            console.log(err.message)
        }
        if(products){
            res.status(200).json(products)
        }
    })
})

//delete a product
router.post('/deleteproduct/:id', async(req,res) =>{
    try{
        connection.query(`SELECT * FROM products WHERE id = ${req.params.id}`, async(err,result)=>{
            if(err){
                console.log(err)
                res.status(500).json({message:"Unable to fetch product"})
                return;
            }
            const product = result[0];
            const filepath = path.join(__dirname, '../uploadedImages', product.productimage);
            fs.unlinkSync(filepath);
            connection.query(`DELETE FROM products WHERE id = ${req.params.id}`,(err,result) =>{
                if(err){
                    console.log(err)
                }
                res.status(200)
            })
        })

    }catch(e){
        console.log(e)
    }
})

//getting the path of the uploaded Image
router.get('/image/:filename', (req, res) => {
    const filepath = path.join(__dirname, '../uploadedImages', req.params.filename);
    res.sendFile(filepath);
    //console.log(filepath)
  });

//save orders
router.post('/order',async(req,res) =>{
    const { customer, products, mode } = req.body;
    const productsJSON = JSON.stringify(products);
    const customerJSON = JSON.stringify(customer);
    const sql = `INSERT INTO orders (customer, mode, products) VALUES (?, ?, ?)`;
    connection.query(sql, [customerJSON, mode, productsJSON], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Failed to create order');
        } 
        return res.status(200).json({message:`Order Created Successfully`})
        
      });
})

const access = (req,res,next)=>{
    unirest('GET', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
    .headers({ 'Authorization': `Basic cFJZcjZ6anEwaThMMXp6d1FETUxwWkIzeVBDa2hNc2M6UmYyMkJmWm9nMHFRR2xWOQ==` })
    .send()
    .end(response => {
        if (response.error) throw new Error(response.error);
        req.access = JSON.parse(response.raw_body)
        next()
    })
}

router.post('/stkpush',access,async(req,res) =>{
    try{
        unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl')
        .headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${req.access.access_token}`
        })
        .send(JSON.stringify({
            "ShortCode": 174379,
            "PhoneNumber": 254797398004,
            "ResponseType": "Completed",
            "ConfirmationURL": 'https://associatesjaeda.com/mpesa/callbacks',
            "ValidationURL": 'https://associatesjaeda.com/mpesa/callbacks',
        }))
        .end(response => {
            if (response.error) return res.send(response.error);
            res.send(response.raw_body);
        });
    } 
    catch(err){
        res.send(err.message)
    }
})

let token = (req,res, next) =>{
    const consumer_key = "qBChFQm0BhkA6rR5b7lkwDGCo9QnSnk5";
    const consumer_secret = "pEH8JnVduZzkrGzA";
    const url ="https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth ="Basic " + new Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");
    const headers = {
        "Authorization": auth
    }
    axios.get(url, {
        headers: headers
    }).then((response) => {
        console.log(response.data);
        let data = response.data
        let access_token = data.access_token
        req.token = access_token
        next()
    }).catch((error) => { console.log(error.message) })
}

//making an stk push
 router.post ('/stk_push',token,(req,res)=> {
    const shortcode = "174379"
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
    const token = req.token;
    //console.log(token)
    const dt = datetime.create();
    const formatted = dt.format('YmdHMS');
    let datenow = new Date();
    const passString = shortcode + passkey + formatted;
    const password = Buffer.from(passString).toString('base64')
    console.log(password)
    req.Expass = password
    req.time = formatted
    axios({
        method: 'post',
        url: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        data: JSON.stringify({
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": formatted,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": 1,
            "PartyA": 254708374149,
            "PartyB": shortcode,
            "PhoneNumber": 254797398004,
            "CallBackURL": "https://associatesjaeda.com/mpesa/callbacks",
            "AccountReference": "Jaeda And Associates",
            "TransactionDesc": "Payment of Goods" 
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    }).then((response) => {
        // if(response.status == 200){
        //     let datedel = Math.round(+new Date()/1000);
        //     let newID = datedel + "-" + response.data.MerchantRequestID;
        //     const sql = "insert into mpesa (sno, pl_mobile, pl_amount, pl_CheckoutRequestId,pl_MerchantrequestId) VALUES(?,?,?,?,?)";
        //     connection.query(sql,[newID,"0793910610",1,response.data.CheckoutRequestID,response.data.MerchantRequestID],(err,row)=>{
        //         if(err){
        //             throw err;
        //         }
        //         if(row){
        //             console.log("successfull")
        //         }
        //     })
        // }
        // req.CheckoutRequestID = response.data.CheckoutRequestID

    }).catch((error) => { console.log(error.message) })
}) 

// router.get('/access_token',token)
// router.post("/stk_push",token,stkPush)

module.exports = router