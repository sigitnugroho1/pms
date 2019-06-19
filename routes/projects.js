var express = require('express');
var router = express.Router();
var helpers = require('../helpers/util');
var navs = 1;
var moment = require('moment');
var path = require('path');

module.exports = (db) => {

    /* GET home page. */
    // =================================== Project ==================================
    // -->> menampilkan data member ditabel
    router.get('/', helpers.isLoggedIn, (req, res, next) => {

        const url = req.query.page ? req.url : `/?page=1`;
        const page = req.query.page || 1
        const limit = 3
        const offset = (page - 1) * limit

        let params = []
        let searching = false

        if (req.query.checkid && req.query.formid) {
            params.push(`projects.projectid = ${req.query.formid}`)
            searching = true
        }
        if (req.query.checkname && req.query.formname) {
            params.push(`projects.name ilike '%${req.query.formname}%'`) //ilike -> mengenal Semua bentuk huruf mau besar atau kecil dan % -> untuk mencari perhuruf
            searching = true
        }
        if (req.query.checkmember && req.query.formmember) {
            params.push(`CONCAT(users.firstname,' ',users.lastname) = '${req.query.formmember}'`)
            searching = true
        }


        // menghitung jumlah data
        let sql = `SELECT COUNT(id) AS total FROM (SELECT DISTINCT projects.projectid as id FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid`

        if (searching) {
            sql += ` WHERE ${params.join(' AND ')}`
        }
        sql += `) as project_member`
        // console.log('pertama', sql);

        db.query(sql, (err, data) => {

            const totalPages = data.rows[0].total;
            const pages = Math.ceil(totalPages / limit)

            // menampilkan data dari projects
            sql = `SELECT DISTINCT projects.projectid, projects.name FROM projects
      LEFT JOIN members ON projects.projectid = members.projectid
      LEFT JOIN users ON members.userid = users.userid`

            if (searching) {
                sql += ` WHERE ${params.join(' AND ')}`
            }
            sql += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`

            // membatasi query members berdasarkan project yang akan diolah saja /mencari anakannya
            let subquery = `SELECT DISTINCT projects.projectid FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid`

            if (searching) {
                subquery += ` WHERE ${params.join(' AND')}`
            }
            subquery += ` ORDER BY projectid LIMIT ${limit} OFFSET ${offset}`
            // console.log(subquery);

            //mendapatkan data members berdasarkan projects
            let sqlMembers = `SELECT projects.projectid, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members
      INNER JOIN projects ON members.projectid = projects.projectid
      INNER JOIN users ON users.userid = members.userid
      WHERE projects.projectid IN (${subquery})`;

            // menampilkan nama projects
            let sqlproject = `SELECT DISTINCT name from projects`
            // console.log('kedua', sql);
            // console.log('ketiga', sqlMembers);

            db.query(sql, (err, projectData) => {
                db.query(sqlproject, (err, projectdata) => {
                    db.query(sqlMembers, (err, memberData) => {

                        // console.log(projectData.rows);
                        // console.log(memberData.rows);

                        projectData.rows.map(project => {
                            project.members = memberData.rows.filter(member => { return member.projectid == project.projectid }).map(item => item.fullname)
                        })

                        // console.log('adding member', projectData.rows);

                        //mengambil semua data dari users untuk select filter member
                        db.query(`SELECT projectoption FROM users WHERE userid = ${req.session.user.userid}`, (err, response3) => {
                            db.query(`SELECT CONCAT(firstname,' ',lastname) AS fullname FROM users`, (err, usersData) => {


                                res.render('projects/formprojects', {
                                    isAdmin: req.session.user.privillage,
                                    data: projectData.rows,
                                    users: usersData.rows,
                                    projects: projectdata.rows,
                                    query: req.query, navs,
                                    pagination: {
                                        pages, page, totalPages, url, offset
                                    },
                                    projectoption: JSON.parse(response3.rows[0].projectoption)
                                })
                            })
                        })
                    })
                })
            })
        })
    });

    //     let params = []
    //     let searching = false

    //     if (req.query.checkid && req.query.formid) {
    //         params.push(`projects.projectid = ${req.query.formid}`)
    //         searching = true
    //     }
    //     if (req.query.checkname && req.query.formname) {
    //         params.push(`projects.name ilike '%${req.query.formname}%'`) 
    //         searching = true
    //     }
    //     if (req.query.checkmember && req.query.formmember) {
    //         params.push(`CONCAT(users.firstname,' ',users.lastname) = '${req.query.formmember}'`)
    //         searching = true
    //     }

    //     // menampilkan filter
    //     let sql = `SELECT * FROM members INNER JOIN users ON members.userid = users.userid INNER JOIN projects ON members.projectid = projects.projectid`

    //     if (searching) {
    //         sql += ` where ${params.join(' and ')}`
    //     }

    //     sql += ` order by projects.projectid`
    //     console.log(sql);

    //     // menampilkan user di formmember
    //     let sqluser = `SELECT userid, concat(firstname, ' ' ,lastname) as fullname
    //     FROM users`
    //     // menampilkan nama projects
    //     let sqlproject = `SELECT DISTINCT name from projects`

    //     db.query(sql, (err, data) => {
    //         db.query(sqluser, (err, userdata) => {
    //             db.query(sqlproject, (err, projectdata) => {
    //                 
    //                     res.render('projects/formprojects', {
    //                         users: userdata.rows,
    //                         data: data.rows,
    //                         query: req.query,
    //                         projects: projectdata.rows
    //                 })
    //             })
    //         });
    //     });
    // })



    // -------------------------------->> Option <<----------------------------------- 
    router.post('/projectoption', helpers.isLoggedIn, (req, res, next) => {
        let sql = `UPDATE users SET projectoption = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`
        // console.log(sql);
        db.query(sql, (err, rows) => {
            res.redirect('/projects')
        });
    })


    // ------------------------------->> add project <<------------------------------
    router.get('/add', helpers.isLoggedIn, (req, res) => {
        // console.log(req.session.user);
        db.query(`SELECT * FROM users ORDER BY userid`, (err, data) => {
            res.render('projects/add', {
                isAdmin: req.session.user.privillage,
                title: 'Add Project',
                data: data.rows,
                navs
            })
        })
    })

    router.post('/add', helpers.isLoggedIn, (req, res) => {
        // console.log(req.body)
        let sql = `select nextval('projects_projectid_seq') as nextid`;
        db.query(sql, (err, data) => {
            const projectid = data.rows[0].nextid

            sql = `insert into projects(projectid,name) values ('${projectid}','${req.body.name}')`
            db.query(sql, (err) => {
                if (err) return res.send(err)
                // console.log(sql);
                if (typeof req.body.members == 'string') {
                    sql = `insert into members (projectid,userid) values (${projectid}, ${req.body.members})`
                } else {
                    sql = `insert into members (projectid,userid) values ${req.body.members.map((item) => `(${projectid},${item})`).join(',')};`
                }
                db.query(sql, (err) => {
                    db.query(`UPDATE members SET role = subquery.position FROM(SELECT userid,position from users) AS subquery WHERE members.userid =subquery.userid`)
                    if (err) return res.send(err)
                    res.redirect('/projects')
                })
            })
        })
    })


    // ------------------------------->> delete project <<---------------------------
    router.get('/delete/:id', helpers.isLoggedIn, (req, res) => {
        let sql1 = `DELETE from members where projectid = '${req.params.id}'`
        let sql2 = `DELETE from projects where projectid = '${req.params.id}'`
        let sql3 = `DELETE FROM issues WHERE projectid = ${req.params.id}`

        db.query(sql1, (err) => {
            db.query(sql2, (err) => {
                db.query(sql3, (err) => {
                    res.redirect('/projects')
                })
            })
        })
    })

    //------------------------------->> edit project <<--------------------------------
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = req.params.projectid;
        db.query(`SELECT * FROM projects where projectid = ${projectid}`, (err, projectData) => {
            if (err) return res.send(err)
            db.query(`SELECT userid FROM members where projectid = ${projectid}`, (err, memberData) => {
                if (err) return res.send(err)
                db.query('select userid, firstname, lastname, position from users ORDER BY userid', (err, userData) => {
                    if (err) return res.send(err)
                    res.render('projects/edit', {
                        isAdmin: req.session.user.privillage,
                        project: projectData.rows[0],
                        members: memberData.rows.map(item => item.userid),
                        users: userData.rows, navs, projectid
                    })
                })
            })
        });
    });

    router.post('/edit/:projectid', helpers.isLoggedIn, (req, res) => {
        let projectid = req.params.projectid

        sqlProject = `UPDATE projects SET name = '${req.body.projectname}' WHERE projectid = ${projectid}`

        //mengosongkan dahulu member
        let sqlDeletemember = `DELETE FROM members where projectid =${projectid}`
        // console.log(req.body.users);

        db.query(sqlDeletemember, (err) => {
            db.query(sqlProject, (err) => {
                if (typeof req.body.users == 'string') {
                    sql = `insert into members (projectid,userid) values (${projectid}, ${req.body.users})`
                    // console.log('====', sql);
                } else {
                    sql = `insert into members (projectid,userid) values ${req.body.users.map((item) => `(${projectid},${item})`).join(',')};`
                    // console.log('====>', sql);
                }
                db.query(sql, (err) => {
                    db.query(`UPDATE members SET role = subquery.position FROM(SELECT userid,position from users) AS subquery WHERE members.userid =subquery.userid`)
                    if (err) return res.send(err)
                    res.redirect('/projects')
                })
            })
        })
    })


    // -------------------------------->> Overview <<-----------------------------------
    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res) => {
        let sidebar = 1;
        let id = req.params.projectid;
        let url = req.url

        let sqlBug = `SELECT COUNT(tracker), (SELECT COUNT(*) FROM issues WHERE tracker ='bug' AND projectid = ${id} AND status ='closed')
    AS closed FROM issues WHERE tracker = 'bug' AND projectid = ${id} AND status != 'closed'`
        let sqlFeature = `SELECT COUNT(tracker), (SELECT COUNT(*) FROM issues WHERE tracker ='feature' AND projectid = ${id} AND status ='closed')
    AS closed FROM issues WHERE tracker = 'feature' AND projectid = ${id} AND status != 'closed'`
        let sqlSupport = `SELECT COUNT(tracker), (SELECT COUNT(*) FROM issues WHERE tracker ='support' AND projectid = ${id} AND status ='closed')
    AS closed FROM issues WHERE tracker = 'support' AND projectid = ${id} AND status != 'closed'`

        db.query(sqlFeature, (err, rowsFeature) => {
            db.query(sqlBug, (err, rowsBug) => {
                db.query(sqlSupport, (err, rowsSupport) => {
                    db.query(`SELECT users.firstname, users.lastname FROM users INNER JOIN members ON users.userid = members.userid WHERE projectid = ${id}`, (err, rows) => {
                        res.render('projects/overview/view', {
                            isAdmin: req.session.user.privillage,
                            title: 'overview',
                            data: rows.rows,
                            id, url, navs, sidebar,
                            tracker: {
                                bug: rowsBug,
                                support: rowsSupport,
                                feature: rowsFeature
                            }
                        });
                    });
                })
            })
        });
    })


    // ---> =============================== Members =============================== <---
    // ------------------------------ filter && paginition -----------------------------
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        let sidebar = 2
        let id = req.params.projectid

        const page = req.query.page || 1
        const limit = 2
        const offset = (page - 1) * limit
        const url = req.query.page ? req.url : `/members/${id}?page=1`;      // supaya ke page nya ikut

        let temp = []
        let searching = false

        if (req.query.checkid2 && req.query.formid2) {
            temp.push(`members.id = ${req.query.formid2}`)
            searching = true
        }
        if (req.query.checkname2 && req.query.formname2) {
            temp.push(`members.userid = ${req.query.formname2} `)
            searching = true
        }
        // console.log('=====>', req.query.checkposition2, req.query.formposition2);

        if (req.query.checkposition2 && req.query.formposition2) {
            temp.push(`members.role like '${req.query.formposition2}'`)
            searching = true
        }

        //  menghitung jumlah data
        let sqlcount = `select count(*) as total from members left join  projects on members.projectid = projects.projectid  where projects.projectid = ${id}`      // 3
        // console.log(sqlcount);

        if (searching) {
            sqlcount += ` AND ${temp.join(' and ')}`
        }
        // console.log(sqlcount);


        db.query(sqlcount, (err, count) => {

            const total = count.rows[0].total
            const pages = Math.ceil(total / limit)
            // console.log(total);

            // proses filter
            let sql = `SELECT users.firstname,users.userid, users.lastname, members.id, members.role FROM users INNER JOIN members ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid WHERE projects.projectid = ${id}`

            if (searching) {
                sql += ` AND ${temp.join(' and ')}`                       // 1
            }
            // console.log(sql);
            sql += ` order by members.id limit ${limit} offset ${offset}`


            let sqlposition = `SELECT DISTINCT position from users`      // 2  
            // untuk menampilkan semua membername 
            let sqluser = `SELECT distinct members.userid,users.firstname, users.lastname from members left join users on members.userid = users.userid`
            // console.log(sqluser);
            // console.log(sql);

            let sqloption = `SELECT memberoption FROM users WHERE userid = ${req.session.user.userid}`
            // console.log(sqloption);

            db.query(sql, (err, data) => {
                db.query(sqlposition, (err, roledata) => {
                    db.query(sqluser, (err, user) => {
                        db.query(sqloption, (err, dataoption) => {


                            res.render('projects/members/list', {
                                isAdmin: req.session.user.privillage,
                                title: 'members',
                                data: data.rows,
                                role: roledata.rows,
                                query: req.query,
                                sidebar,
                                id, navs,
                                users: user.rows,
                                pagination: {
                                    page, url, limit, offset, total, pages
                                },
                                memberoption: JSON.parse(dataoption.rows[0].memberoption)
                            })
                        })
                    })
                })
            })
        })
    });
    // -------> langkah menetukan filter <----
    //     let temp = []
    //     let searching = false
    //     // console.log(req.query.checkname2);
    //     // console.log('========', req.query.formname2);

    //     if (req.query.checkid2 && req.query.formid2) {
    //         temp.push(`members.id = ${req.query.formid2}`)
    //         searching = true
    //     }
    //     if (req.query.checkname2 && req.query.formname2) {
    //         temp.push(`members.userid ilike '%${req.query.formname2}%' `)
    //         searching = true
    //     }
    //     if (req.query.checkposition2 && req.query.formposition2) {
    //         temp.push(`members.role like '${req.query.formposition2}'`)
    //         searching = true
    //     }


    //     let sql = `SELECT users.firstname,users.userid, users.lastname, members.id, members.role FROM users INNER JOIN members ON users.userid = members.userid INNER JOIN projects ON projects.projectid = members.projectid WHERE projects.projectid = ${id}`
    //     // console.log(sql);

    //     let sqlposition = `SELECT DISTINCT position FROM users`

    //     if (searching) {
    //         sql += ` AND ${temp.join(' and ')}`
    //     }
    //     db.query(sql, (err, data) => {
    //         db.query(sqlposition, (err, roledata) => {

    //             res.render('projects/members/list', {
    //                 data: data.rows,
    //                 role: roledata.rows,
    //                 sidebar,
    //                 id,
    //                 query: req.query
    //             })
    //         })
    //     })
    // });


    // ------------------------------->> members option <<------------------------------
    router.post('/membersoption/:projectid', helpers.isLoggedIn, (req, res) => {
        // console.log(req.session.user);

        let sql = `UPDATE users SET memberoption = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`

        // console.log(sql);
        db.query(sql, (err, rows) => {
            res.redirect(`/projects/members/${req.params.projectid}`)
        });
    })


    // ------------------------------>> add member <<----------------------------------
    router.get('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
        // res.send(req.params.projectid)
        let sidebar = 2
        let id = req.params.projectid;

        let sql2 = `SELECT userid, concat(firstname,' ', lastname) as fullname, position from users  WHERE userid NOT IN (
          SELECT userid FROM members WHERE projectid = ${id})`
        // console.log(sql2);

        let sql3 = `SELECT DISTINCT position FROM users`
        db.query(sql2, (err, rows2) => {
            // console.log(rows2.rows[0].fullname);

            db.query(sql3, (err, rows3) => {
                // console.log(sql3);
                res.render('projects/members/add', {
                    isAdmin: req.session.user.isAdmin,
                    title: 'overview',
                    data2: rows2.rows,
                    role: rows3.rows,
                    id,
                    navs,
                    sidebar
                });
            })
        })
    });


    router.post('/members/:projectid/add', helpers.isLoggedIn, (req, res) => {
        let sql = `INSERT INTO members (userid, role, projectid) VALUES (${req.body.user}, '${req.body.role}',${req.params.projectid})`

        db.query(sql, (err, rows) => {
            res.redirect(`/projects/members/${req.params.projectid}`)
        });
    });

    // -------------------------------->> delete member <-----------------------------
    router.get('/members/:projectid/delete/:mid', helpers.isLoggedIn, (req, res, next) => {
        db.query(`DELETE FROM members WHERE projectid = ${req.params.projectid} AND id = ${req.params.mid}`, (err, response) => {
            res.redirect(`/projects/members/${req.params.projectid}`)
        })
    });

    // -------------------------------->> edit member <<-------------------------------
    router.get('/members/:projectid/edit/:mid', helpers.isLoggedIn, (req, res) => {
        let id = req.params.projectid
        let sidebar = 2

        let sql = `SELECT users.firstname, members.id, members.role FROM users INNER JOIN members ON users.userid = members.userid WHERE 
        members.projectid = ${id} AND members.id = ${req.params.mid}`

        let sql2 = `SELECT DISTINCT position FROM users WHERE position NOT IN (
            SELECT role FROM members WHERE id = ${req.params.mid})`

        db.query(sql, (err, rows1) => {
            // console.log(rows1);
            db.query(sql2, (err, rows2) => {
                // console.log(rows2.rows);
                res.render('projects/members/edit', {
                    isAdmin: req.session.user.privillage,
                    query: req.query,
                    data: rows1.rows[0],
                    data2: rows2.rows,
                    navs,
                    sidebar,
                    id
                });
            })
        })
    })

    router.post('/members/:projectid/edit/:mid', helpers.isLoggedIn, (req, res) => {
        let sql = `UPDATE members SET role = '${req.body.member}' WHERE projectid = ${req.params.projectid} AND id = ${req.params.mid}`

        db.query(sql, (err, rows) => {
            res.redirect(`/projects/members/${req.params.projectid}`
            )
        })
    });


    // ------------------------------->> Issues <<-------------------------------- 
    router.get('/issues/:projectid', helpers.isLoggedIn, (req, res) => {
        let sidebar = 3
        let id = req.params.projectid

        const url = req.query.page ? req.url : `/issues/${id}/?page=1`;
        const page = req.query.page || 1
        const limit = 2
        const offset = (page - 1) * limit

        let temp = []
        let searching = false

        if (req.query.checkid3 && req.query.formid3) {
            temp.push(`issues.issuesid = ${req.query.formid3}`)
            searching = true
        }
        if (req.query.checksubject && req.query.formsubject) {
            temp.push(`issues.subject like '${req.query.formsubject}'`)
            searching = true
        }
        if (req.query.checktracker && req.query.formtracker) {
            temp.push(`issues.tracker like '${req.query.formtracker}'`)
            searching = true
        }

        //  menghitung jumlah data
        let sqlcount = `SELECT count(*) as total from issues where projectid = ${id}`

        if (searching) {
            sqlcount += ` AND ${temp.join(' and ')}`
        }
        // console.log(sqlcount);

        db.query(sqlcount, (err, count) => {
            const total = count.rows[0].total
            const pages = Math.ceil(total / limit)

            let sql = `SELECT * FROM issues WHERE projectid =${id}`
            // console.log(sql);

            if (searching) {
                sql += ' AND ' + temp.join(' AND ')
            }
            sql += ` order by issues.issuesid limit ${limit} offset ${offset}`; // sql
            // console.log(sql);


            let sqloption = `SELECT issueoption FROM users WHERE userid = ${req.session.user.userid}`
            // console.log(sqloption);

            db.query(sql, (err, datafilter) => {
                // db.query(sqlsubject, (err, datasubject) => {
                db.query(sqloption, (err, dataoption) => {

                    res.render('projects/issues/list', {
                        isAdmin: req.session.user.privillage,
                        data: datafilter.rows,
                        datacount: count.rows,
                        query: req.query,
                        sidebar,
                        id,
                        navs,
                        pagination: {
                            page, pages, offset, total, url, limit
                        },
                        issueoption: JSON.parse(dataoption.rows[0].issueoption)
                        //     })
                    })
                })
            })
        })
    })

    // ---------------------------------> issues option <-----------------------------
    router.post('/issuesoption/:projectid', helpers.isLoggedIn, (req, res) => {
        let sql = `UPDATE users SET issueoption = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`

        db.query(sql, (err, rows) => {
            res.redirect(`/projects/issues/${req.params.projectid}`)
        });
    })


    // ----------------------------------> issues add <-------------------------------
    router.get('/issues/:projectid/add', helpers.isLoggedIn, (req, res) => {
        let sidebar = 3
        let id = req.params.projectid;

        let sql2 = `SELECT * FROM users`

        db.query(sql2, (err, rows2) => {

            res.render('projects/issues/add', {
                isAdmin: req.session.user.privillage,
                title: 'overview',
                id, navs, sidebar,
                data: rows2.rows                // menampilkan nama assigne
            });
        })
    });


    router.post('/issues/:projectid/add', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid;

        let dayNow = moment().format('YYYY-MM-DD HH:mm:ss')

        //  setiap proses add masuk ke activity
        let sqlActivity = `INSERT INTO activity (time, title, description, author) VALUES 
        ('${moment().format('YYYY-MM-DD HH:mm:ss')}', '${req.body.subject} #${req.params.projectid} (${req.body.status})', '${req.body.description}', ${req.session.user.userid})`

        // console.log(req.body);

        // console.log('+++++++', req.files.sampleFile.name);
        let sql = `INSERT INTO issues (projectid, tracker, subject, description, status,
            priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate) VALUES 
            (${req.params.projectid}, '${req.body.tracker}',
            '${req.body.subject}', '${req.body.description}', '${req.body.status}', 
            '${req.body.priority}', '${req.body.assignee}', '${req.body.startdate}',
            '${req.body.duedate}', ${req.body.estimatedtime}, ${req.body.done},'${req.files.sampleFile.name}',${req.session.user.userid},'${dayNow}')`


        let sampleFile = req.files.sampleFile
        let uploadPath = path.join(__dirname, '../', 'public', 'images', sampleFile.name)
        sampleFile.mv(uploadPath, function (err) {
            if (err) {
                return res.status(500).send(err);
            }

            db.query(sql, (err) => {
                db.query(sqlActivity, (err, rows) => {
                    res.redirect(`/projects/issues/${projectid}`)
                    // })
                });
            });
        });
    })

    // -------------------------------> issues delete <-------------------------------
    router.get('/issues/:projectid/delete/:mid', helpers.isLoggedIn, (req, res, next) => {

        db.query(`DELETE FROM issues WHERE projectid = ${req.params.projectid} AND issuesid = ${req.params.mid}`, (err, response) => {

            res.redirect(`/projects/issues/${req.params.projectid}`)
        })
    });


    // -----------------------------> edit issues <-----------------------------------
    router.get('/issues/:projectid/edit/:mid', helpers.isLoggedIn, (req, res) => {
        let sidebar = 3
        let id = req.params.projectid

        let sql = `SELECT * FROM users`
        let sql2 = `SELECT * FROM issues WHERE projectid = ${id} AND issuesid =
    ${req.params.mid}`

        db.query(sql, (err, rows) => {
            db.query(sql2, (err, rowsissues) => {

                res.render('projects/issues/edit', {
                    isAdmin: req.session.user.privillage,
                    user: req.session.user,
                    query: req.query,
                    data: rows.rows,
                    data2: rowsissues.rows[0],
                    navs, sidebar, moment,
                    id
                });
            })
        })
    })


    router.post('/issues/:projectid/edit/:mid', helpers.isLoggedIn, (req, res) => {
        let dayNow = moment().format('YYYY-MM-DD HH:mm:ss')
        let temp = []
        let search = false
        // console.log(req.body);

        if (req.body.status == 'closed') {
            temp.push(`closeddate = '${dayNow}'`)
            search = true
        }
        // console.log(req.body.spenttime);

        if (req.body.spenttime) {
            temp.push(`spenttime = ${parseInt(req.body.spenttime)}`)
            search = true
        }
        if (req.body.targetversion) {
            temp.push(`targetversion = '${req.body.targetversion}'`)
            search = true
        }
        if (req.body.sampleFile) {
            temp.push(`files = '${req.body.sampleFile}'`)
            search = true
        }
        // console.log(req.body.sampleFile);

        let sql = `UPDATE issues SET tracker = '${req.body.tracker}', subject = '${req.body.subject}', description = '${req.body.description}', status = '${req.body.status}', priority = '${req.body.priority}', assignee = ${parseInt(req.body.assignee)}, startdate = '${req.body.startdate}', duedate = '${req.body.duedate}', estimatedtime = ${parseInt(req.body.estimatedtime)}, done = ${parseInt(req.body.done)}, updateddate = '${dayNow}'`

        console.log(sql);
        // console.log(req.body.duedate);
        // console.log(req.session.user);

        if (search) {
            sql += ' , ' + temp.join(' , ') + ` WHERE projectid = ${req.params.projectid} AND issuesid = ${req.params.mid}`
        } else {
            sql += `WHERE projectid = ${req.params.projectid} AND issuesid = ${req.params.mid}`
        }

        let sqlActivity = `INSERT INTO activity (time, title, description, author) VALUES 
        ('${moment().format('YYYY-MM-DD HH:mm:ss')}', '${req.body.subject} #${req.params.projectid} (${req.body.status})', '${req.body.description}', ${req.session.user.userid})`

        // console.log(sqlActivity);

        db.query(sqlActivity, (err, rows) => {
            db.query(sql, (err, rows) => {
                res.redirect(`/projects/issues/${req.params.projectid}`)
            })
        })
    })


    // ------------------------------------> activity <-------------------------------
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res) => {
        let sidebar = 4;
        let id = req.params.projectid;

        let dayNow = moment().format('YYYY-MM-DD HH:mm:ss');//now
        let lastSevenDay = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss')

        let sql = `SELECT * FROM activity WHERE time >= timestamp '${lastSevenDay}' AND time < timestamp '${dayNow}'`
        // console.log(sql);

        // var startdate = moment().subtract(1, "days").format("DD-MM-YYYY HH:mm:ss");
        // console.log(moment().subtract(1, "days").format("dddd"));

        db.query(sql, (err, rows) => {
            res.render('projects/activity/view', {
                isAdmin: req.session.user.privillage,
                title: 'activity',
                id, navs, sidebar,
                day: { dayNow, lastSevenDay }, moment,
                data: rows.rows,
                author: req.session.user.firstname
            });
        })
    });




    return router;
}