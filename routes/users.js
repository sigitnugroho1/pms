var express = require('express');
var router = express.Router();
var navs = 3;



module.exports = (db) => {

    /* GET users listing. */

    router.get('/', (req, res) => {

        const url = req.query.page ? req.url : `/?page=1`;
        const page = req.query.page || 1
        const limit = 3
        const offset = (page - 1) * limit

        let temp = []
        let search = false

        if (req.query.checkid && req.query.id) {
            temp.push(`userid =  ${req.query.id}`)
            search = true
        }
        if (req.query.checkemail && req.query.email) {
            temp.push(`email like '${req.query.email}'`)
            search = true
        }
        if (req.query.checkpassword && req.query.password) {
            temp.push(`password like '${req.query.password}'`)
            search = true
        }
        if (req.query.checkfirstname && req.query.firstname) {
            temp.push(`firstname like '${req.query.firstname}'`)
            search = true
        }
        if (req.query.checklastname && req.query.lastname) {
            temp.push(`lastname like '${req.query.lastname}'`)
            search = true
        }
        if (req.query.checkposition && req.query.position) {
            temp.push(`position like '${req.query.position}'`)
            search = true
        }
        if (req.query.checktype && req.query.type) {
            temp.push(`type like '${req.query.type}'`)
            search = true
        }


        let sql = `SELECT count(*) as total  FROM  users`

        if (search) {
            sql += ' where ' + temp.join(' and ')
        }
        // console.log(response.rows);

        db.query(sql, (err, response) => {
            const total = response.rows[0].total
            const pages = Math.ceil(total / limit)
            // console.log('=====', pages);

            sql = `SELECT * FROM  users`
            if (search) {
                sql += ' where ' + temp.join(' and ')
            }
            sql += ` order by userid limit ${limit} OFFSET ${offset}`

            // console.log(sql);
            db.query(sql, (err, response) => {

                res.render('users/list', {
                    isAdmin: req.session.user.privillage,
                    user: req.session.user,
                    data: response.rows,
                    query: req.query,
                    navs,
                    pagination: {
                        page, limit, offset, total, pages, url
                    }
                })
            })
        });
    })


    // --------------------------------------> add user <--------------------------------
    router.get('/add', (req, res, next) => {
        res.render('users/add', {
            isAdmin: req.session.user.privillage,
            navs
        });
    });

    router.post('/add', function (req, res, next) {
        let sql = `INSERT INTO users(
           email, password, firstname, lastname, type, position)
           VALUES ('${req.body.email}', '${req.body.password}', '${req.body.firstname}', '${req.body.lastname}', '${req.body.type}', '${req.body.position}');`

        // console.log(sql);

        db.query(sql, (err, response) => {
            res.redirect('/users');
        });
    });



    // ------------------------------------> delete user <--------------------------------
    router.get('/delete/:userid', (req, res) => {
        let id = req.params.userid

        db.query(`DELETE FROM issues WHERE assignee = ${id}`, (err) => {
            db.query(`DELETE FROM members WHERE userid = ${id}`, (err) => {
                db.query(`DELETE FROM users WHERE userid = ${id}`, (err) => {

                    res.redirect('/users')
                })
            })
        })
    })



    // --------------------------------------> edit user <--------------------------------
    router.get('/edit/:userid', (req, res, next) => {
        let sql = `SELECT * FROM users WHERE userid = ${req.params.userid}`

        db.query(sql, (err, response) => {
            res.render('users/edit', {
                isAdmin: req.session.user.privillage,
                navs,
                query: req.query,
                item: response.rows[0]
            });
        })
    })


    router.post('/edit/:userid', (req, res) => {
        let sql = `UPDATE users SET email = '${req.body.email}', password = '${req.body.password}' , firstname = '${req.body.firstname}', lastname = '${req.body.lastname}', position = '${req.body.position}', type = '${req.body.type}' WHERE userid = ${req.params.userid}`
        // console.log(sql);

        db.query(sql, (err, rows) => {
            res.redirect('/users')
        })
    });





    return router

}