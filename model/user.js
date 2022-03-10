const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
	{
		name: { 
			type: String, 
			required: true
		},
		email: {
			type: String,
			required: true,
			unique: true
		},
		password: { 
			type: String, 
			required: true 
		},
		status: {
			type: String, 
			enum: ['Pending', 'Active'],
			default: 'Pending'
		},
		code: {
			type: String
		}
	},
	{ 
		collection: 'users' 
	}
)

const model = mongoose.model('UserSchema', UserSchema)

module.exports = model