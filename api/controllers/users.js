const mongoose = require("mongoose");
//bcrypt to encrypt passwords
const bcryptjs = require('bcryptjs');
const User = require('../models/user');
//JWT for generating tokens
const jwt = require('jsonwebtoken');
//For validating Tokens
const checkAuth = require("../middleware/check-auth");
//Multer for File upload
const multer = require('multer');

//Define the storage folder
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './uploads/');
    },
    filename: function(req, file, cb){
        cb(null, new Date().toISOString()+ file.originalname);
    }
});

//Filefilter to specify accepted file types
const fileFilter = (req, file, cb)=>{
    //reject a file
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null, true);
    }else{
        cb(null, false);
    }
    
}

//multer 
const upload = multer({
    storage: storage, 
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter,
})

//Signup(POST) a new user
exports.user_signup = (req, res, next)=>{

    User.find({email: req.body.email})
        .exec()
        .then(user=>{
            if(user.length >= 1){
                return res.status(409).json({
                    mesage: `User with email ${req.body.email} exists`
                })
            }else{
                bcryptjs.hash(req.body.password, 10, (err, hash)=>{
                    if(err){
                        return res.status(500).json({
                            error: err
                        })
                    }else{
                        const user = new User({
                            _id: new mongoose.Types.ObjectId(),
                            name: req.body.name,
                            email: req.body.email,
                            password: hash,
                            dp: "blank"
                        })
                        user
                            .save()
                            .then(result=>{
                                res.status(201).json({
                                    message: "User Created"
                                })
                            })
                            .catch(err=>{
                                console.log(err);
                                res.status(500).json({
                                    error: err
                                })
                            });
                    }
                })
            }
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        });   
}

//Login(POST) an existing user
exports.user_login = (req,res,next)=>{
    User.find({email: req.body.email})
        .exec()
        .then(user=>{
            if(user.length < 1){
                return res.status(401).json({
                    message: "Auth Failed"
                })
            }
            bcryptjs.compare(req.body.password, user[0].password, function(err, result) {
                if(err){
                    return res.status(401).json({
                        message: "Auth Failed"
                    })
                }
                if(result){
                    const token = jwt.sign({
                        email: user[0].email,
                        id: user[0]._id
                    }, 
                    process.env.JWT_KEY, {
                        expiresIn: '1h'
                    }
                    );


                    return res.status(200).json({
                        mesage: "Auth Successful",
                        token: token,
                        user: {
                            name: user[0].name,
                            email: user[0].email,
                            id: user[0]._id,
                            dp: user[0].dp
                        }
                    });
                }
                return res.status(401).json({
                    message: "Auth Failed"
                })
            });
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
}

//Set Display Picture for a User
exports.user_dp = upload.single('dp'), checkAuth, (req,res,next)=>{
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    
    const id = req.params.id;

    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const dp = req.file.path;

    bcryptjs.hash(req.body.password, 10, (err, hash)=>{
        User.update({_id: id}, {name: name, email: email, password: hash, dp: dp})
        .exec()
        .then(result=>{
            console.log(result);
            res.status(200).json({
                message: "Edit Sucessful",
                user: {
                    name: name,
                    email: email,
                    password: password,
                    dp: dp
                },
                request: {
                    type: "PATCH",
                    url: fullUrl
                }
            })
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        })
    })
    

}

//Edit(PATCH) a user
exports.user_edit = checkAuth, (req, res, next)=>{
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const id = req.params.id;
    // const updateOps = {};
    // for(const ops of req.body){
    //     updateOps[ops.propName] = ops.value
    // }
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    bcryptjs.hash(password, 10, (err, hash)=>{

        // console.log(hash)
        User.update({_id: id}, {name: name, email: email, password: hash})
        .exec()
        .then(result=>{
            console.log(result);
            res.status(200).json({
                message: "Edit Sucessful",
                user: {
                    name: name,
                    email: email,
                    password: hash,
                    dp: dp
                },
                request: {
                    type: "PATCH",
                    url: fullUrl
                }
            })
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        })
    })
    
    
}

//Get details of a user
exports.view_user = (req, res, next)=>{
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    var imgUrl = req.protocol + '://' + req.get('host');
    const id = req.params.id;
    User.findById(id)
        .exec()
        .then(result=>{
            console.log(result);
            if(result != null){
                res.status(200).json({
                    message:"Request Successful",
                    user: {
                        name: result.name,
                        email: result.email,
                        dp: `${imgUrl}/${result.dp}`
                    },
                    request: {
                        type: "GET",
                        url: fullUrl
                    }
                })
            }else{
                res.status(200).json({
                    message:"Note does not exist or it has been deleted",
                    request: {
                        type: "GET",
                        url: fullUrl
                    }
                })
            }
            
            
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
    
}


//DELETE user
exports.delete_user = checkAuth, (req, res, next)=>{
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const id = req.params.id;
    User.remove({_id: id})
        .exec()
        .then(result=>{
            console.log(result);
            res.status(200).json({
                message: "User Deleted",
                request: {
                    type: "DELETE",
                    url: fullUrl
                }
            })
        })
        .catch(err=>{
            console.log(err);
            res.status(500).json({
                error: err
            })
        });
    
}