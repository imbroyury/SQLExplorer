import express from 'express';
import mysql from 'mysql';
import exphbs  from 'express-handlebars';
import bodyParser from 'body-parser';

const HTTP_PORT = 8280;
const server = express();

server.use(bodyParser.urlencoded({ extended: true }));
server.engine('handlebars', exphbs());
server.set('view engine', 'handlebars');

const exluded_dbs = ['mysql', 'information_schema', 'performance_schema'];

const pool = mysql.createPool({
    connectionLimit : 20,
    host            : 'localhost',
    user            : 'root',
    password        : '1234',
});

const getDatabaseList = async () => new Promise((resolve, reject) => {
    pool.query('SHOW DATABASES', (err, results) => {
        if (err) return reject(err);
        const dbs = results
            .map(result => result.Database)
            .filter(db => !exluded_dbs.includes(db));

        resolve(dbs);
    });
});

const getConnection = async () => new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
        if (err) return reject(err);
        resolve(connection);
    })
});

const changeConnectionUser = async (connection, user) => new Promise((resolve, reject) => {
    connection.changeUser(user, (err) => {
        if (err) return reject(err);
        resolve(connection);
    })
});

const queryConnection = async (connection, query) => new Promise((resolve, reject) => {
    connection.query(query, (err, result, fields) => {
        if (err) return reject(err);
        resolve({ result, fields });
    });
});

const getDBsViewModel = (dbs, selectedDB) => dbs.map(db => ({ db, selected: db === selectedDB }));

server.get('/', async (req, res) => {
    const dbs = await getDatabaseList();
    res.render('query', { dbs: getDBsViewModel(dbs, null) });
});

server.post('/', async (req, res) => {
    const { db: selectedDB, query } = req.body;

    try {
        const dbs = await getDatabaseList();
        const isDBValid = dbs.includes(selectedDB);
        const dbsVM = getDBsViewModel(dbs, selectedDB);

        if (!isDBValid) {
            return res.render('query', { dbs: dbsVM, error: 'Invalid DB' })
        }

        try {
            const connection = await getConnection();
            await changeConnectionUser(connection, { database: selectedDB });
            const { result, fields } = await queryConnection(connection, query);
            connection.release();
            if ([result, fields].every(Array.isArray)) {
                res.render('query', {
                    dbs: dbsVM,
                    query,
                    results: {
                        table:  {
                            columns: fields.map(field => field.name),
                            rows: result,
                        },
                    }
                });
            } else {
                res.render('query', {
                    dbs: dbsVM,
                    query,
                    results: {
                        message: `Rows modified: ${result.affectedRows}`,
                    }
                });
            }
        } catch(e) {
            res.render('query', {
                dbs: dbsVM,
                query,
                error: e.sqlError ? e.sqlError : e,
            })
        }
    } catch(e) {
        res.render('error');
    }

})

server.listen(HTTP_PORT, function () {
  console.log(`SQLExplorer listening on port ${HTTP_PORT}!`);
});