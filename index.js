const express = require('express')
const app = express()
const auth = require('./test/7.x/auth.js')

/* const cuid = require( 'cuid' );
const fs = require('fs');
const bodyParser = require('body-parser'); */

/* const fileService = require( './model/fileservice' );
const tempPath = './test/upload/temp/';
const {resolve} = require("path"); */

app.use(express.static('./'))
//app.use( "/dist", express.static( '../dist' ) );
//app.use( "/", express.static( './' ) );

/* let options = {
  inflate: true,
  limit: '1024kb',
  type: 'application/octet-stream'
};
app.use(bodyParser.raw(options));
 */

app.post('/api/auth/login', auth.login)

app.post('/api/auth/logout', auth.logout)

app.get('/api/auth/refresh', auth.refresh)

// default route
app.use('*', express.static('./test/7.x/index.htm'))

// set our listener
var server = app.listen(8800, function () {})
