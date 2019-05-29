const mysql = require('mysql');
const express = require('express');
var app = express();
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('./auth-middleware');

app.use(bodyparser.json());

var mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'taskdb',
    multipleStatements: true
});

mysqlConnection.connect((err) => {
    if (!err)
        console.log('DB connection succeded.');
    else
        console.log('DB connection failed \n Error : ' + JSON.stringify(err, undefined, 2));
});

app.listen(3000, () => console.log('Express server is runnig at port no : 3000'));


//Get all tasks
app.get('/tasks', (req, res) => {
    mysqlConnection.query('SELECT * FROM tasks', (err, rows, fields) => {
        if (!err)
            res.send(rows);
        else
            console.log(err);
    })
});

//Get a task
app.get('/tasks/:id', auth, (req, res) => {
    mysqlConnection.query('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send(rows);
        else
            console.log(err);
    })
});

// Add a task
app.post('/tasks', function (req, res) {
    var taskName = req.body.name;
    var description = req.body.description;
    mysqlConnection.query("INSERT INTO `tasks` (name, description) VALUES (?, ?)", [taskName.toString(), description],
        function (err, result) {
            if (err) throw err;
            console.log("1 record inserted");
        });
    res.send('Added successfully.');
});

// Edit a task
app.put('/tasks', function (req, res) {
    var id = req.body.id;
    var taskName = req.body.name;
    var description = req.body.description;
    mysqlConnection.query("UPDATE `tasks` SET `name` = ?, `description` = ? WHERE `tasks`.`id` = ?", [taskName.toString(), description, id],
        function (err, result) {
            if (err) throw err;
            console.log("1 record updated");
        });
    res.send('Updated successfully.');
});

//Delete a task
app.delete('/tasks/:id', (req, res) => {
    mysqlConnection.query('DELETE FROM tasks WHERE id = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send('Deleted successfully.');
        else
            console.log(err);
    })
});

//Add an user
app.post('/users', function (req, res) {
    var userName = req.body.name;
    var userPassword;
    bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({
                error: err
            });
        } else {
            userPassword = hash;
            mysqlConnection.query("INSERT INTO `users` (name, password) VALUES (?, ?)", [userName, userPassword],
                function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
            res.send('Added successfully.');
        }
    })
});

//get user
function getUser(userName) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query("SELECT * FROM `users` WHERE `name`=?", userName,
            (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
    });
}

//Get an user
app.post('/login', async (req, res) => {
    var userName = req.body.name;
    var userPassword = req.body.password;
    var user;

    await getUser(userName).then(
        result => user = result,
    );

    console.log("dwa", user);


    if (user[0]) {
        bcrypt.compare(userPassword, user[0].password, (err, result) => {
            if (err) {
                console.log("nie");

                return res.status(401).json({
                    message: 'Auth failed'
                });
            }
            if (result) {
                console.log("ta");

                const token = jwt.sign({
                    id: user[0].id,
                    name: user[0].name
                },
                    'secret123',
                    {
                        expiresIn: "1h"
                    });
                return res.status(200).json({
                    message: 'auth successful',
                    token: token
                });
            }
        });
    }
    else {
        res.status(401).json({
            message: 'Auth failed'
        });
    }
});