var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer')
var helpers = require('../helpers/util')
var navs = 2
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotalySecretKey');



module.exports = (db) => {

    /* GET home page. */
    // ===================== login ==================================
    router.get('/', (req, res, next) => {
        db.query(`SELECT * FROM users`, (err, data) => {
            res.render('formlogin', {
                title: 'Login',
                loginMessage: req.flash('LoginMessage')
            });
        })
    });


    router.post('/', (req, res) => {
        db.query(`SELECT * FROM users WHERE email = '${req.body.email}' AND password = '${req.body.password}'`, (err, data) => {

            if (data.rows.length > 0) {
                req.session.user = data.rows[0]

                res.redirect('./projects')
                // console.log(req.session.user);
            } else {
                req.flash('LoginMessage', 'email atau password anda salah')
                res.redirect('/')
            }
        })
    })



    // ===================== logout ==================================
    router.get('/logout', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/')
        })
    })


    router.get('/lupa-password', (req, res) => {
        db.query(`SELECT * FROM users`, (err, data) => {
            res.render('password-forget', { title: 'Lupa Password', forgetMessage: req.flash('ForgetMessage') })
        })
    })

    router.post('/lupa-password', (req, res) => {
        db.query(`SELECT * FROM users WHERE firstname = '${req.body.firstname}' AND lastname = '${req.body.lastname}' AND position = '${req.body.position}' AND email = '${req.body.email}'`, (err, data) => {

            if (data.rows.length > 0) {
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'sigit@gmail.com',
                        pass: '1sampe5'
                    }
                })

                var mailOptions = {
                    from: 'sigit1@gmail.com',
                    to: req.body.email,
                    subject: 'Lupa password PMS',
                    html: `<p>Nama: ${data.rows[0].firstname} ${data.rows[0].lastname}</p>
          <p>Position : ${data.rows[0].position}</p>
          <p>User ID : ${data.rows[0].userid}</p>
          <p>Password : ${data.rows[0].password}</p>`
                };
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) throw err;
                    console.log('Email sent : ' + info.response);
                    res.redirect('/')
                })
            } else {
                req.flash('ForgetMessage', 'Data yang anda masukan salah, silakan coba lagi...')
                res.redirect('/lupa-password')
            }
        })
    })


    // ===================== profile ==================================
    router.get('/profile', (req, res) => {
        // console.log(req.session.user.email);
        let sql = `SELECT * FROM users WHERE userid = ${req.session.user.userid}`
        db.query(sql, (err, data) => {
            // console.log(data);
            if (err) {
                console.log(err);
            }
            res.render('profile/formprofile', {
                isAdmin: req.session.user.privillage,
                user: req.session.user,
                data: data.rows[0], navs  // memanggil data tunggal pakai where menggunakan format ini 
            })
        });
    })

    router.post('/profile/:id', helpers.isLoggedIn, (req, res) => {
        let temp = []
        if (req.body.password) {
            temp.push(`password = '${req.body.password}'`)
        }
        if (req.body.radio1) {
            temp.push(`position = '${req.body.radio1}'`)
        }
        if (req.body.check1) {
            temp.push(`type = '${req.body.check1}'`)
        }

        let sql = `UPDATE users SET password = '${req.body.password}', position = '${req.body.position}', type = ${(req.body.type ? true : false)} where userid = ${req.session.user.userid}`
        // console.log(sql);
        // console.log(req.session.user);
        db.query(sql, (err) => {
            if (err) {
                console.log(err);
            }
            res.redirect('/projects')
        })
    })




    return router;
}


// let sql = `UPDATE users SET ${temp.join(',')} WHERE email LIKE '${req.session.user.email}'`
