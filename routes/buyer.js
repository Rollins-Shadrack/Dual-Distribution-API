const express = require('express')
const router = express.Router();
const connection  = require('../Database/connectionDB')
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

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

//registering new Buyers
router.post('/register',upload.single('image'),async(req,res)=>{
    if(!req.file || !req.body.credentials.username || !req.body.credentials.email || !req.body.credentials.mobile || !req.body.credentials.address ||!req.body.credentials.password || !req.body.credentials.Cpassword){
        return res.status(400).json({message:"All fields are required!"})
    }
    const image = req.file.filename
    const {username, email, mobile,address,password,Cpassword} = req.body.credentials;
    if (password !== Cpassword){
        return res.status(400).json({message:"Passwords do not match"})
    }
    try{
        //hashing my password
        const hashedPassword = await bcrypt.hashSync(password, 10)

        //check if buyer is already registered
        const checkUser = `SELECT * FROM buyers WHERE email = '${email}'`;
        connection.query(checkUser, async(err, result) =>{
            if(err){
                console.log(err);
                return res.status(500).json({message:"Internal server error"})
            }
            if(result.length > 0){
                return res.status(409).json({message: "Email already exists"})
            }
            //we now register if the email doesn't exist
            const registerBuyer = `INSERT INTO buyers (username,email, mobile,address,image, password) VALUES ('${username}','${email}', '${mobile}', '${address}','${image}', '${hashedPassword}')`;
            connection.query(registerBuyer, (err, result) =>{
                if(err){
                    console.log(err)
                    return res.status(500).json({message:"Internal Server error"})
                }
                return res.status(200).json({message:`${username} Thank you for Joining Us`})
            })
        })

    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"})
    }
})

//login a buyer
router.post('/login', async(req,res) =>{
    const {email, password} = req.body
    if(!email || !password){
        return res.status(400).json({message:"All Fields are required!"})
    }
    try{
        connection.query(`SELECT * FROM buyers WHERE email = '${email}'`, (err,user) =>{
            if(err){
                console.log(err.message)
            }
            if(user){
                console.log(user)
                if (!user){
                    return res.status(401).json({message: "User doesn't exist, Please create account instead"});
                }
                const isMatch = bcrypt.compareSync(password,user[0].password)
                if(!isMatch){
                    return res.status(401).json({message: "Invalid Password"})
                }
                const token = jwt.sign({id: user[0].id}, "Rollins1234567890@shadrack", {expiresIn:"1h"});
                res.status(200).json({message: `Welcome back ${user[0].username}`, token})
            }
        })

    }catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error"})
    }
})

//get a single buyer
router.post('/buyer/:id', async(req,res) =>{
    connection.query(`SELECT * FROM buyers WHERE id = ?`, req.params.id, (err,user) =>{
        if(err){
            console.log(err.message)
        }
        if(user){
            res.status(200).json({user})
        }
    })
})
//select all buyers
router.post('/buyers',async(req,res) =>{
    connection.query(`SELECT * FROM buyers`,(err,users) =>{
        if(err){
            console.log(err.message)
        }
        if(users){
            //console.log(users)
            res.status(200).json(users)
        }
    })
})
//delete a buyer
router.post('/deletebuyer/:id', async(req,res) =>{
    try{
        connection.query(`SELECT * FROM buyers WHERE id = ${req.params.id}`, async (err, result) => {
            if(err){
                console.log(err)
                res.status(500).send('Error fetching retailer');
                return;
            }
            const buyer = result[0];
            const filepath = path.join(__dirname, '../uploadedImages', buyer.image);
            fs.unlinkSync(filepath);
            connection.query(`DELETE FROM buyers WHERE id = ${req.params.id}`,(err,result)=>{
                if(err){
                    console.log(err)
                    res.status(500).send('Error deleting');
                    return;
                }
                res.status(200);
            })
        });
    }catch(e){
        console.log(e)
        res.status(500).send('Error deleting ');
    }
})

module.exports = router
// import React, { useState } from 'react';
// import axios from 'axios';

// function SearchBar() {
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState([]);

//   const handleInputChange = (event) => {
//     setQuery(event.target.value);
//   };

//   const handleSubmit = (event) => {
//     event.preventDefault();
//     axios.get(`/api/search?query=${query}`)
//       .then(response => {
//         setResults(response.data);
//       })
//       .catch(error => {
//         console.log(error);
//       });
//   };

//   return (
//     <div>
//       <form onSubmit={handleSubmit}>
//         <input type="text" value={query} onChange={handleInputChange} />
//         <button type="submit">Search</button>
//       </form>
//       {results.map(result => (
//         <div key={result.id}>
//           <h2>{result.name}</h2>
//           <p>{result.description}</p>
//           <p>{result.price}</p>
//           <p>{result.category}</p>
//           <img src={result.image} alt={result.name} />
//         </div>
//       ))}
//     </div>
//   );
// }

// export default SearchBar;



// app.get('/api/search', (req, res) => {
//     const { query } = req.query;
//     const queryString = `
//       SELECT * FROM products WHERE name LIKE '%${query}%' OR description LIKE '%${query}%' OR category LIKE '%${query}%'
//       UNION
//       SELECT * FROM orders WHERE order_number LIKE '%${query}%' OR customer_name LIKE '%${query}%'
//       UNION
//       SELECT * FROM customers WHERE name LIKE '%${query}%' OR email LIKE '%${query}%' OR phone LIKE '%${query}%'
//     `;
//     connection.query(queryString, (error, results) => {
//       if (error) throw error;
//       res.send(results);
//     });
//   });
  
