const {db} = require('../util/admin')

exports.addPost = (request, response) => {
    const newPost ={
        body: request.body.body,
        userName: request.user.userName,
        title: request.body.title,
    }
    db
        .collection('posts')
        .add(newPost)
        .then((doc) => {
            response.json({message:`document ${doc.id} created successfully`})
        })
        .catch((err) =>{
           response.status(500).json({error: "something went wrong"}) 
           console.error(err)
        })
}



exports.getAllPosts = (request, response) => {
    db.collection('posts').get()
     .then(data => {
         let posts = []
         data.forEach(doc => {
             posts.push({
                 postId: doc.id,
                 body: doc.data().body,
                 userName: doc.data().userName,
                 title: doc.data().title
         })
         return response.json(posts)
     })
     .catch((err) => console.error(err))
    })}
