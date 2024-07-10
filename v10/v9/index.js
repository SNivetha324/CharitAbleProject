
require("dotenv").config();
const express = require("express");
const router= express.Router();
const bp = require("body-parser");
const mysql = require("mysql");
const multer = require('multer');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const cookieParser = require("cookie-parser");
const nodemailer = require('nodemailer');
const path = require('path');
//const route = require('./route/route')

//setup multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploaded_images/'); // Specify the directory for storing uploaded files
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); // Customize the file name if needed
    },
  });

  
  const upload = multer({ storage: storage });
//create connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});




//connect database

db.connect((err)=>{
    if(err){
        throw err;
    }
    else{
        console.log("Successfully connected");
    }
});
const app = express();
app.use(bp.urlencoded({extended:true}));

app.set('view engine','ejs');
app.use(express.static("public"));


app.listen('3000', ()=>{
    console.log("Server started on port 3000");
});

app.use((req, res, next) => {
    if (req.path === '/favicon.ico') {
      // Don't log or process the favicon request
      return res.status(204).end();
    }
    next();
  });

//setup session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
}, db);


// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await queryDatabase('SELECT * FROM user WHERE id = ?', [id]);
    done(null, user[0]);
  } catch (error) {
    done(error, null);
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "thisismysecrctekey",
    store: sessionStore,
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  }));
app.use(cookieParser());

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

app.post('/forgot-password', async (req, res) => {
  const resetToken = generateUniqueToken();
  // Store the token securely (e.g., in the database)

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: req.body.email,
    subject: 'Password Reset',
    text: `Click the following link to reset your password: http://your-app/reset-password/${resetToken}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent: ' + info.response);
      res.send('Password reset email sent.');
    }
  });
});

function queryDatabase(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database Query Error:", err);
            reject(err);
          } else {
            console.log("Database Query Result:", result); 
            resolve(result);
          }
    });
  });
}

async function insertUserIntoDatabase(sql) {
  try {
    await queryDatabase(sql);
  } catch (error) {
    console.error(error);
    throw error; // Propagate the error
  }
}

async function checkUserExistence(email, password) {
  try {
    const result = await queryDatabase(`SELECT * FROM user WHERE EMAILID = ? AND USER_PWD = ?`, [email, password]);
    return  result.length > 0;

  } catch (error) {
    console.error(error);
    throw error; // Propagate the error
  }
}


//login starts here
app.get(('/login'),(req,res)=>{
    res.render("login");
})


app.post('/login', async (req, res) => {
  const username = req.body.Email;
  const password = req.body.Password;

  // Check if the provided username exists in the database
  const sql = 'SELECT * FROM user WHERE EMAILID = ?';
  
  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error('Error querying database: ', err);
      res.status(500).send('Error logging in');
      return;
    }

    if (results.length > 0) {
      const user = results[0];

      // Compare hashed password with user input
      try {
        const passwordMatch = await bcrypt.compare(password, user.USER_PWD);

        if (passwordMatch) {
          // User authenticated, store user data in session
          req.session.user = {
            id: user.id,
            username: user.username,
          };
          res.redirect('/'); // Redirect to a home page upon successful login
        } else {
          res.send('Invalid username or password');
        }
      } catch (error) {
        console.error('Error comparing passwords: ', error);
        res.status(500).send('Error logging in');
      }
    } else {
      res.send('Invalid username or password');
    }
  });
});

//login ends here



app.get(('/signup'),(req,res)=>{
    res.render("signup");
})

app.post('/signup', express.urlencoded({ extended: true }), async (req, res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const phno = req.body.phno;
    const dob = req.body.dob;
    const gender = req.body.gen1;
    const Addr = req.body.Addr;
    const password = req.body.password;
    const confpass = req.body.confpass;
  
    try {
      const hashedPassword = await hashPassword(password);
      const existingUser = await checkUserExistence(email, hashedPassword);
  
      if (existingUser) {
        res.send("Failed to signup");
      } else {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const remarks = '5';
        const userType = 1;

        const timestamp = Date.now() % 100000; // Get current timestamp and limit to less than 5 digits
        const randomString = Math.random().toString(36).substring(2, 10); // Generate a random string

        const charity_id = parseInt(`${timestamp}${randomString}`, 10);
  

        const sql = `INSERT INTO user (CHARITY_ID, FNAME, LNAME, EMAILID, TELENO, DOB, GENDER, CONTACTADD, USER_PWD, DATEJOINED, DATEREMOVED, REMARKS, USER_TYPE)
          VALUES ('${charity_id}', '${firstName}', '${lastName}', '${email}', '${phno}', '${dob}', '${gender}', '${Addr}', '${hashedPassword}', '${formattedDate}', '${formattedDate}', '${remarks}', ${userType})`;
  
        await insertUserIntoDatabase(sql);
        res.redirect('/login');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  

  app.get('/donate',(req,res)=>{
    
    res.render("productUpload");
   
});

app.post('/needs',(req,res)=>{

    var product_name = req.body.need_name;
    var product_details = req.body.need_details;
    console.log(product_name);
    console.log(product_details);
    console.log("Mohan")



    const timestamp = Date.now() % 10000; // Get current timestamp and limit to less than 5 digits
    const randomString = Math.random().toString(36).substring(2, 10); // Generate a random string

    const randomId = parseInt(`${timestamp}${randomString}`, 10); // Combine timestamp and random string, then convert to an integer

    db.query('INSERT INTO item_need VALUES (?,?,?)', [randomId,product_details,product_name], (err, result) => {
    if (err) {
        console.error(err);
        res.render('postNeeds', { message: 'Error occurred. Please try again.' });
      } else {
        // Fetch all users from the database
        db.query('SELECT * FROM item_need', (err, rows) => {
          if (err) {
            console.error(err);
            res.render('postNeeds', { message: 'Error occurred. Please try again.', needsArray: [] });
          } else {
            // Render the page with the list of users
            let needs = rows;
            res.render('postNeeds', { message: 'User added successfully!', needsArray: needs });
          }
        });
      }
    
       
     });
        
});




app.get('/needs',(req,res)=>{

    let sql = 'SELECT * FROM item_need';
    let query = db.query(sql,(err,results)=>{
        if(err) throw err;
        let needs = results;
        //console.log(needs);
        
        //console.log(name);
        res.render("postNeeds",{ message: null,needsArray: needs });
    });

    
   

       
});








app.post('/donate',upload.single('img'),(req,res)=>{

    //need to get charity id from current user login
    var user_id=1;
    var product_name = req.body.prod_name;
    var product_cat = req.body.Catergory;
    var quality = req.body.quality;
    var year_of_usage = req.body.prod_usage;
    var details = req.body.remarks;
    var img_name ="./uploaded_images/"+req.file.originalname;
    var post_status=1;
    

    //generating for the db - date
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(currentDate.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;

    //generating for the db - category id
    var cat_id=0;
    if(product_cat=="Furniture"){
        cat_id=1;
    }
    else if(product_cat=="Books"){
        cat_id=2;
    }
    else if(product_cat=="Household"){
        cat_id=3;
    }
    else if(product_cat=="Electronics"){
        cat_id=4;
    }
    else if(product_cat=="Auto"){
        cat_id=5;
    }
    else if(product_cat=="Computers"){
        cat_id=6;
    }
    else if(product_cat=="Other"){
        cat_id=7;
    }

    //generating random product id for db

    const timestamp = Date.now() % 100000; // Get current timestamp and limit to less than 5 digits
    const randomString = Math.random().toString(36).substring(2, 10); // Generate a random string

    const randomId = parseInt(`${timestamp}${randomString}`, 10); // Combine timestamp and random string, then convert to an integer

  
    // console.log("Random id: "+randomId);
    // console.log(post_status);
    // console.log(formattedDate);
    // console.log(img_name);
    // console.log(product_name);
    // console.log(product_cat);
    // console.log(quality);
    // console.log(year_of_usage);
    // console.log(details);
    // console.log(cat_id);

   

    let sql = mysql.format("INSERT INTO item_posted VALUES (?,?,?,?,?,?,?,?,?,?)");
    let query = db.query(sql,[randomId,img_name,quality,year_of_usage,formattedDate,post_status,details,user_id,cat_id,product_name],(err,results)=>{
        if(err) throw err;
        console.log("successfully inserted");
       
    });

    //window.alert("Successfully inserted")

    res.redirect("/");
})


app.get('/',(req,res)=>{
    let sql = 'SELECT * FROM item_posted';
    let query = db.query(sql,(err,results)=>{
        if(err) throw err;
        let ans1 = results;
        //console.log(ans1);
        
        //console.log(name);
        res.render("index",{dbArray:ans1});
    });
});


app.get('/products/:topic', (req, res) => {
    
    //getting product id from path
    var id=req.path;
    //console.log(id);
    id = id.match(/(\d+)/);
   
    //console.log(matches[0]);
    
    
    
    
    let sql = mysql.format("SELECT * FROM item_posted where ITEM_POSTED_ID = ?", (id));
    let query = db.query(sql,(err,results)=>{
        if(err) throw err;
        let ans2 = results;
       
       
        res.render("productView",{prodArray:ans2});
        //console.log(name);
       
    });
    
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '23mx103@psgtech.ac.in',
    pass: 'lzyt wclt yifr kzol'
  }
});



app.get('/sendmail', async (req, res) => {
  //const { toEmail, subject, text } = req.body;

  const toEmail="23mx118@psgtech.ac.in";
  const subject="Test mail";
  const text="hello Mohannnnnn!";
  const mailOptions = {
      from: '23mx103@psgtech.ac.in', // Your Gmail address
      to: toEmail,
      subject: subject,
      text: text,
  };

  try {
      await transporter.sendMail(mailOptions);
      res.send('Email sent successfully!');
  } catch (error) {
      console.error(error);
      res.status(500).send('Error sending email.');
  }
});






 
