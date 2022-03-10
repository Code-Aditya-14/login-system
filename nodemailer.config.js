const nodemailer = require('nodemailer')
const config = require('./config')

const user = config.user
const pass = config.password

const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: user,
        pass: pass,
    },
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
        <p>Please click on the link to delete your account from this website.</p>
        <a href=http://localhost:3000/delete/${code}> Click here</a>
        </div>`
        
    }).catch(err => console.log(err));
}