const nodemailer = require('nodemailer')
require('dotenv').config()
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2;

const OAuth2_client = new OAuth2(process.env.clientId, process.env.clientSecret);
OAuth2_client.setCredentials({ refresh_token: process.env.refreshToken })

const user = process.env.user;
const accessToken = OAuth2_client.getAccessToken();

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: 'OAuth2',
        user: user,
        clientId: process.env.clientId,
        clientSecret: process.env.clientSecret,
        refreshToken: process.env.refreshToken,
        accessToken: accessToken
    }
});

module.exports.confirmationEmail = (name, email, code) => {
    transport.sendMail({
        from: user,
        to: email,
        subject: "Verification of Email",
        html: `<h1>Email Confirmation</h1>
        <h2>Hello ${name}</h2>
        <p>Thank you for subscribing. Please confirm your email by clicking on the following link</p>
        <a href=http://localhost:3000/verify/${code}> Click here</a>
        </div>`
        
    }).catch(err => console.log(err));
}

module.exports.passwordReset = (name, email, code) => {
    transport.sendMail({
        from: user,
        to: email,
        subject: "Email for Password of Recovery",
        html: `<h2>Hello ${name}</h2>
        <p>Please click on the link to reset the password for your account.</p>
        <a href=http://localhost:3000/recovery/${code}> Click here</a>
        </div>`
        
    }).catch(err => console.log(err));
}

module.exports.deleteAcc = (name, email, code) => {
    transport.sendMail({
        from: user,
        to: email,
        subject: "Email for deletion of Account",
        html: `<h2>Hello ${name}</h2>
        <p>Your account has been deleted from the portal. You will now not able to login again using your account.</p>
        </div>`
        
    }).catch(err => console.log(err));
}