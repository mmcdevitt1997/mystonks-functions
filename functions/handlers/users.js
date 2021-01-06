
const {db, admin} = require('../util/admin')

const config = require('../util/config')

const firebase = require('firebase')
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators')
const { response } = require('express')

// signup users 
exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userName: request.body.userName
    }

    
    const {valid, errors} = validateSignupData(newUser)

    if(!valid) return response.status(400).json(errors)
    
    const noImg = 'stonkspic.jfif'

    let token, userId 
    db.doc(`/users/${newUser.userName}`).get()
        .then(doc => {
        if(doc.exists){
           return response.status(400).json({handle: 'this handle is already taken'})
        } else {
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
        })
        .then(data => {
           userId = data.user.uid
           return data.user.getIdToken()
        })
        .then(idToken => {
           token = idToken
           const userCredentials = {
               userName: newUser.userName,
               email: newUser.email,
               createdAt: new Date().toISOString(),
               imageUrl: `https:"//firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
               userId: userId
           }
           return db.doc(`/users/${newUser.userName}`).set(userCredentials)
        })
        .then(() =>{
         return response.status(201).json({ token })
        })
        .catch(err => {
            console.error(err)
            if(err.code === 'auth/email-already-in-use'){
                return response.status(400).json({email: 'Email is already in use'})
            }else{
                return response.status(500).json({error: err.code})
            }
        })
}
// login users 
exports.login = (request, response) =>{
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const {valid, errors} = validateLoginData(user)

    if(!valid) return response.status(400).json(errors)


    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken()
    })
    .then(token =>{
        return response.json({token})
    })
    .catch(err =>{
        console.error(err)
        if(err.code === 'auth/wrong-password'){
            return response.status(403).json({ general: 'Wrong credentials, please try again'})
        }else return response.status(500).json({error: err.code})
    })
}

// Add user details 
exports.addUserDetails = (request, response) => {
    let userDetails = reduceUserDetails(request.body)

    db.doc(`/users/${request.user.userName}`).update(userDetails)
    .then(() => {
       return response.json({ message: 'Details added successfully'}) 
    })
    .catch(err => {
        console.error(err)
        return response.status(500).json({error: err.code})
    })
}

// Get own user details 
exports.getAuthenticatedUser = (request, response) => {
    let userData = {}
    db.doc(`/users/${request.user.userName}`).get()
    .then(doc => {
        if(doc.exists){
            userData.credentials = doc.data()
            return db.collection('likes').where('userName', '==', request.user.userName).get()
        }
    })
    .then(data => {
        userData.likes = []
      data.forEach(doc => {
          userData.likes.push(doc.data())
      })  
      return response.json(userData)
    })
    .catch(err => {
        console.error(err)
        return response.status(500).json({ error: err.code })
    })
}




// Upload Image 
exports.uploadImage = (request, response) =>{
    const BusBoy = require('busboy')
    const path = require('path')
    const os = require('os')
    const fs = require('fs')

    const busboy = new BusBoy({ headers: request.headers})

    let imageFileName
    let imageToBeUploaded = {}

    busboy.on('file', (fieldname, file, filename, encoding, mimetype ) =>{
        if(mimetype !== 'image/jpeg' &&  mimetype !== 'image/png' ){
            return response.status(400).json({ error: 'Wrong file type submitted'})
        }

        //image.png 
        const imageExtension = filename.split('.')[filename.split('.').length - 1]
        imageFileName =`${Math.round(Math.random()*1000000000)}.${imageExtension}` 

        const filepath = path.join(os.tmpdir(), imageFileName)
        imageToBeUploaded = {filepath, mimetype}
        file.pipe(fs.createWriteStream(filepath))
    })
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
         resumable: false, 
         metadata: {
             metadata: {
                 contentType: imageToBeUploaded 
             }
         }  
        })
        .then(() => {
            console.log(imageFileName)
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`  
          return db.doc(`/users/${request.user.userName}`).update({imageUrl: imageUrl})
        })
        .then(() => {
           return  response.json({ message: 'Image uploaded successfully'})
        })
        .catch(err => {
            console.error(err)
            return response.status(500).json({err})
        })
    })
    busboy.end(request.rawBody)
}