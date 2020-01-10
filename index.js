import express from 'express';
import mysql from 'mysql';
import exphbs  from 'express-handlebars';
import bodyParser from 'body-parser';

const HTTP_PORT = 8280;
const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.engine('handlebars', exphbs());
server.set('view engine', 'handlebars');

// API
server.get('/', function (req, res) {
    const connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
    });

    connection.connect();

    connection.query('SHOW DATABASES', function (error, results, fields) {
        if (error) return res.send(500);

        const dbs = results.map(result => result.Database);
        res.render('home', {
            dbs,
        });
    });

    connection.end();
});

server.post('/make-query', (req, res) => {
    console.log(req.body)
})

server.get('/sample', async (req, res) => {
    const connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'employees'
    });

    connection.connect();

    connection.query('SHOW DATABASES', function (error, results, fields) {
    if (error) throw error;
    res.send(results);
    });

    connection.end();
});

server.listen(HTTP_PORT, function () {
  console.log(`SQLExplorer listening on port ${HTTP_PORT}!`);
});