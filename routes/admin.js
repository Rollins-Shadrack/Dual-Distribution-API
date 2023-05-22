const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const connection = require('../Database/connectionDB')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const jwt = require('jsonwebtoken')

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

//register an Admin

router.post('/register',upload.single('image'),async(req,res) =>{

    if(!req.file || !req.body.credentials.name || !req.body.credentials.email || !req.body.credentials.password || !req.body.credentials.Cpassword){
        return res.status(400).json({message:"All fields are required!"})
    }
    const image = req.file.filename
    const {name,email, password,Cpassword} = req.body.credentials
    if(password !== Cpassword){
        return res.status(400).json({message:"Passwords do not match"})
    }
    try{
        //hashing password
        const hashedPassword = await bcrypt.hashSync(password, 10)

        const sql = `INSERT INTO admins (name, email, image, password) VALUES ('${name}','${email}', '${image}', '${hashedPassword}')`;
        connection.query(sql,(err,result) =>{
            if(err){
                console.log(err)
                return res.status(500).json({message:"Internal Server error"})
            }
            return res.status(200).json({message:`Admin Added Successfully`})
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({message:"Internal server error"})
    }
    
})

//login an admin
router.post('/login', async(req,res) =>{
    const {email,password} = req.body;
    console.log(req.body)
    if(!email || !password){
        return res.status(400).json({message:"All Fields are required!"})
    }
    try{
        connection.query(`SELECT * FROM admins WHERE email = ?`,email, async(err,admin) =>{
            if(err){
                console.log(err.message)
            } 
            if(admin){
                if (admin.length === 0 || admin.length === undefined){
                    return res.status(401).json({message: "Admin doesn't exist"})
                }
                console.log(admin)
                const isMatch = await bcrypt.compareSync(password,admin[0].password)
                if(!isMatch){
                    return res.status(401).json({message: "Invalid Password"})
                }
                const token = jwt.sign({id: admin[0].id}, "Rollins1234567890@shadrack", {expiresIn:"1h"});
                res.status(200).json({message: `Welcome back ${admin[0].name}`, token})
            }
        })
    }catch(err){
        console.error(err)
        res.status(500).json({message:"Internal server error"})
    }
})

//get all admin
router.post('/admins', async(req,res) =>{
    connection.query(`SELECT * FROM admins`,(err,admins) =>{
        if(err){
            console.log(err.message)
        }
        if(admins){
            res.status(200).json(admins)
        }
    })
})
//get a single admin
router.post('/getadmin/:id', async(req,res) =>{
    connection.query(`SELECT * FROM admins WHERE id = ?`, req.params.id, (err,user) =>{
        if(err){
            console.log(err.message)
        }
        if(user){
            res.status(200).json({user})
        }
    })
})

//delete an admin
router.post('/admin/:id', async(req,res)=>{
    try{
        connection.query(`SELECT * FROM admins WHERE id = ${req.params.id}`, async (err, result) => {
            if(err){
                console.log(err)
                res.status(500).send('Error fetching admin');
                return;
            }
            const admin = result[0];
            const filepath = path.join(__dirname, '../uploadedImages', admin.image);
            fs.unlinkSync(filepath);
            connection.query(`DELETE FROM admins WHERE id = ${req.params.id}`,(err,result)=>{
                if(err){
                    console.log(err)
                    res.status(500).send('Error deleting admin');
                    return;
                }
                res.status(200).send('Admin deleted successfully');
            })
        });
    }catch(e){
        console.log(e)
        res.status(500).send('Error deleting admin');
    }
})



module.exports = router