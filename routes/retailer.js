const express = require('express')
const router = express.Router();
const connection  = require('../Database/connectionDB')
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

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

//registering a new retailer
router.post('/register',upload.single('image'), async(req,res)=>{
    if(!req.file || !req.body.credentials.username || !req.body.credentials.email || !req.body.credentials.mobile || !req.body.credentials.address || !req.body.credentials.regNumber || !req.body.credentials.password || !req.body.credentials.Cpassword){
        return res.status(400).json({message:"All fields are required!"})
    }
    const image = req.file.filename
    const {username,email,mobile,address,regNumber, password,Cpassword} = req.body.credentials
    if(password !== Cpassword){
        return res.status(400).json({message:"Passwords do not match"})
    }
    try{
        //hashing password
        const hashedPassword = await bcrypt.hashSync(password, 10)

        //check if the user is already registered
        const checkUser = `SELECT * FROM retailers WHERE email = '${email}'`;
        connection.query(checkUser, async(err,result)=>{
            if(err){
                console.log(err);
                return res.status(500).json({message:"Internal server error"})
            }
            if(result.length > 0){
                return res.status(409).json({message: "Email already exists"})
            }

            //we now register if the email doesn't exist
            const registerRetailer = `INSERT INTO retailers (username,email, mobile,address, regNumber,image, password) VALUES ('${username}','${email}', '${mobile}', '${address}','${regNumber}','${image}', '${hashedPassword}')`;
            connection.query(registerRetailer, (err,result)=>{
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

//logging in a retailer
router.post('/login',async(req,res)=>{
    const {email, password} = req.body
    //console.log(req.body)
    if(!email || !password){
        return res.status(400).json({message:"All Fields are required!"})
    }
    try{
        connection.query(`SELECT * FROM retailers WHERE email = ?`, email,(err,user)=>{
            if(err){
                console.log(err.message)
            }
            if(user){
                //console.log(user[0])
                if (user.length === 0 || user.length === undefined){
                    return res.status(401).json({message: "User doesn't exist, Please create account instead"})
                }
                const isMatch = bcrypt.compareSync(password,user[0].password)
                if(!isMatch){
                    return res.status(401).json({message: "Invalid Password"})
                }
                const token = jwt.sign({user: user[0]}, "Rollins1234567890@shadrack", {expiresIn:"1h"});
                res.status(200).json({message: `Welcome back ${user[0].username}`, token})
            }
        })
    } catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error"})
    }
})
//get a single retailer
router.post('/retailer/:id', async(req,res) =>{
    connection.query(`SELECT * FROM retailers WHERE id = ?`, req.params.id, (err,user) =>{
        if(err){
            console.log(err.message)
        }
        if(user){
            res.status(200).json({user})
        }
    })
})
//select all retailers
router.post('/retailers',async(req,res) =>{
    connection.query(`SELECT * FROM retailers`,(err,users) =>{
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
router.post('/deleteretailer/:id', async(req,res) =>{
    try{
        connection.query(`SELECT * FROM retailers WHERE id = ${req.params.id}`, async (err, result) => {
            if(err){
                console.log(err)
                res.status(500).send('Error fetching');
                return;
            }
            const retailer = result[0];
            const filepath = path.join(__dirname, '../uploadedImages', retailer.image);
            fs.unlinkSync(filepath);
            connection.query(`DELETE FROM retailers WHERE id = ${req.params.id}`,(err,result)=>{
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


  