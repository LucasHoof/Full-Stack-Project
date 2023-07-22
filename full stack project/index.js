// include the express module
var express = require("express");

// create an express application
var app = express();
const url = require('url');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');

// fs module - provides an API for interacting with the file system
var fs = require("fs");

// helps in managing user sessions
var session = require('express-session');

// include the mysql module
var mysql = require("mysql");

const con = mysql.createConnection({
  host: "cse-mysql-classes-01.cse.umn.edu",
  user: "C4131DF23U40",               // replace with the database user provided to you
  password: "1650",                  // replace with the database password provided to you
  database: "C4131DF23U40",           // replace with the database user provided to you
  port: 3306
});

con.connect(function(err) {
  if (err) throw err;
});

// helpful for reading, compiling, rendering pug templates
const pug = require("pug");  

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');

// var formidable = require('formidable')
const qs = require('querystring');


// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
app.use(session({
  secret: "csci4131secretkey",
  saveUninitialized: true,
  resave: false
}
));

// server listens on port 9007 for incoming connections
app.listen(9007, () => console.log('Listening on port 9007!'));

app.set('view engine', 'pug');

// function to return the welcome page
app.get('/',function(req, res) {
  res.render(__dirname + '/client/welcome');
});

app.get('/login',function(req, res) {
  if(req.session.loggedIn){
    res.redirect('/schedule');
  }
  else{
    res.render(__dirname + '/client/login');
  }
});

app.get('/logout',function(req, res) {
  if(req.session.loggedIn){
    req.session.destroy(function(err) {
      console.log("logged out");
      res.redirect('/');
    })
  }
  else{
    res.redirect('/login');
  }
});

app.get('/schedule',function(req, res) {
  if(req.session.loggedIn){
    res.render(__dirname + '/client/schedule');
  }
  else{
    res.redirect('/login');
  }
});

app.get('/addEvent',function(req, res) {
  if(req.session.loggedIn){
    res.render(__dirname + '/client/addEvent');
  }
  else{
    res.redirect('/login');
  }
});

app.get('/loginCheck', (req, res) => {
  if(req.session.loggedIn){
    console.log("you're already logged in silly");
    res.redirect('/');
  }
  else{
    var parsed = url.parse(req.url);
    var query  = qs.parse(parsed.query);
    var username = query.username;
    var password = query.password;
    var sqlParams = [username];

    const sql = "SELECT * FROM tbl_accounts WHERE acc_login=?";

    con.query(sql, sqlParams, function (err, qresult) {
      if (err) {
          throw err;
      }
      else if(qresult.length != 0){
        const passwordHash = bcrypt.hashSync(password, 10);

        bcrypt.compare(password, qresult[0].acc_password, function(err, result) {
          if(qresult[0].acc_login == username && result){
            req.session.loggedIn = true;
            console.log("login good");
            res.send("it's good!");
          }
          else{
            console.log("login bad");
            res.send("it's bad!");
          }
        });
      }
      else{
        console.log("no results");
        res.send("it's bad!");
      }
    });
  }
});

app.get('/getSchedule', (req, res) => {
  if(req.session.loggedIn){
    var parsed = url.parse(req.url);
    var query  = qs.parse(parsed.query);
    var day = query.day;
    var sqlParams = [day];

    const sql = "SELECT * FROM tbl_events WHERE event_day=?";

    con.query(sql, sqlParams, function (err, qresult) {
      if (err) {
          throw err;
      }
      else if(qresult.length != 0){
        qresult.sort(function(a,b){
          var aStart = a.event_start;
          var bStart = b.event_start;
          var result = aStart.localeCompare(bStart);
          return result;
        });

        res.send(qresult);
      }
      else{
        console.log("no results");
        res.send([]);
      }
    });
  }
  else{
    res.redirect('/login');
  }
});

app.get('/edit/:id', (req, res) => {
  if(req.session.loggedIn){
    var id = req.params.id;
    var sqlParams = [id];

    const sql = "SELECT * FROM tbl_events WHERE event_id=?";

    con.query(sql, sqlParams, function (err, result) {
      if (err) {
          throw err;
      }
      else if(result.length != 0){
        eventToEdit = {
          id: result[0].event_id,
          day: result[0].event_day,
          name: result[0].event_event,
          start: result[0].event_start,
          end: result[0].event_end,
          location: result[0].event_location,
          phone: result[0].event_phone,
          info: result[0].event_info,
          url: result[0].event_url
        }

        res.render(__dirname + '/client/updateEvent', {record:eventToEdit});
      }
    });
  }
  else{
    res.redirect('/login');
  }
});

app.get('/delete/:id', function(req, res) {
  if(req.session.loggedIn){
    var id = req.params.id;
    var sqlParams = [id];
    console.log("Deleting event " + id);
    const sql1 = "SELECT * FROM tbl_events WHERE event_id=?";

    con.query(sql1, sqlParams, function (err, result) {
      if (err) {
          throw err;
      }

      if(result.length != 0){
        const sql2 = "DELETE FROM tbl_events WHERE event_id=?";
        con.query(sql2, sqlParams, function (err, result) {
          if (err) {
              throw err;
          }
          console.log("Deleted event " + id);
          res.send("deleted");
        });
      }
      else{
        console.log("Event " + id + " could not be found")
        res.redirect('*')
      }
      
    });
  }
  else{
    res.redirect('/login');
  }
});

app.post('/postEventEntry',function(req, res) {
  if(req.session.loggedIn){
    const bodyContent = req.body;

    const rowToBeInserted = {
      event_day: bodyContent.day,
      event_event: bodyContent.event,
      event_start: bodyContent.start,
      event_end: bodyContent.end,
      event_location: bodyContent.location,
      event_phone: bodyContent.phone,
      event_info: bodyContent.info,
      event_url: bodyContent.url   
    };

    con.query('INSERT tbl_events SET ?', rowToBeInserted, function (err, result) {
      if (err) {
          throw err;
      }
      console.log("Table record inserted!");
      res.redirect('/schedule');
    });
  }
  else{
    res.redirect('/login');
  }
});

app.post('/updateEvent/:id',function(req, res) {
  if(req.session.loggedIn){
    var id = req.params.id;
    const bodyContent = req.body;

    const rowToBeInserted = [
      bodyContent.day,
      bodyContent.event,
      bodyContent.start,
      bodyContent.end,
      bodyContent.location,
      bodyContent.phone,
      bodyContent.info,
      bodyContent.url,
      id
    ];

    var sql = "UPDATE tbl_events SET event_day = ?, event_event = ?, event_start = ?, event_end = ?, event_location = ?, event_phone = ?, event_info = ?, event_url = ? WHERE event_id = ?"

    con.query(sql, rowToBeInserted, function (err, result) {
      if (err) {
          throw err;
      }
      console.log("Table record updated!");
      res.redirect('/schedule');
    });
  }
  else{
    res.redirect('/login');
  }
});

// middle ware to serve static files
app.use('/client', express.static(__dirname + '/client'));


// function to return the 404 message and error to client
app.get('*', function(req, res) {
  // add details
  res.sendStatus(404);
});
