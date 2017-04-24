import crypto from 'crypto'
import mongoose from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'
import jwt from 'jsonwebtoken'
import {secret} from '../config'

export default getUserSchema

function getUserSchema() {
  const UserSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, `can't be blank`],
        match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
        index: true,
      },
      email: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, `can't be blank`],
        match: [/\S+@\S+\.\S+/, 'is invalid'],
        index: true,
      },
      bio: String,
      image: String,
      favorites: [{type: mongoose.Schema.Types.ObjectId, ref: 'Article'}],
      following: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
      hash: String,
      salt: String,
    },
    {timestamps: true},
  )

  UserSchema.plugin(uniqueValidator, {message: 'is already taken.'})

  UserSchema.methods.validPassword = function(password) {
    const hash = crypto
      .pbkdf2Sync(password, this.salt, 10000, 512, 'sha512')
      .toString('hex')
    return this.hash === hash
  }

  UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex')
    this.hash = crypto
      .pbkdf2Sync(password, this.salt, 10000, 512, 'sha512')
      .toString('hex')
  }

  UserSchema.methods.generateJWT = function() {
    const today = new Date()
    const exp = new Date(today)
    exp.setDate(today.getDate() + 60)

    return jwt.sign(
      {
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000, 10),
      },
      secret,
    )
  }

  UserSchema.methods.toAuthJSON = function() {
    return {
      username: this.username,
      email: this.email,
      bio: this.bio,
      token: this.generateJWT(),
      image: this.image,
    }
  }

  UserSchema.methods.toProfileJSONFor = function(user) {
    return {
      username: this.username,
      bio: this.bio,
      // WORKSHOP_START
      // this is where the bug is...
      // we're not adding this.image
      // to the object!
      // WORKSHOP_END
      // FINAL_START
      image: this.image,
      // FINAL_END
      following: user ? user.isFollowing(this._id) : false,
    }
  }

  UserSchema.methods.favorite = function(id) {
    if (this.favorites.indexOf(id) === -1) {
      this.favorites.push(id)
    }

    return this.save()
  }

  UserSchema.methods.unfavorite = function(id) {
    this.favorites.remove(id)
    return this.save()
  }

  UserSchema.methods.isFavorite = function(id) {
    return this.favorites.some(favoriteId => {
      return favoriteId.toString() === id.toString()
    })
  }

  UserSchema.methods.follow = function(id) {
    if (this.following.indexOf(id) === -1) {
      this.following.push(id)
    }

    return this.save()
  }

  UserSchema.methods.unfollow = function(id) {
    this.following.remove(id)
    return this.save()
  }

  UserSchema.methods.isFollowing = function(id) {
    return this.following.some(followId => {
      return followId.toString() === id.toString()
    })
  }

  return UserSchema
}