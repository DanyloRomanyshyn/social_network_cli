const { MongoClient, ObjectId } = require('mongodb');
const inquirer = require('inquirer');

async function connectToDatabase() {
    const uri = 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db('social_network');
}

async function registerUser(db) {
    const usersCollection = db.collection('users');
    const answers = await inquirer.prompt([
        { name: 'email', message: 'Enter your email:' },
        { name: 'password', message: 'Enter your password:' },
        { name: 'firstName', message: 'Enter your first name:' },
        { name: 'lastName', message: 'Enter your last name:' },
        { name: 'interests', message: 'Enter your interests (comma-separated):' },
    ]);

    const interestsArray = answers.interests.split(',').map(interest => interest.trim());
    const newUser = {
        email: answers.email,
        password: answers.password,
        firstName: answers.firstName,
        lastName: answers.lastName,
        interests: interestsArray,
    };

    await usersCollection.insertOne(newUser);
    console.log('User registered successfully!');
}

async function loginUser(db) {
    const usersCollection = db.collection('users');
    const answers = await inquirer.prompt([
        { name: 'email', message: 'Enter your email:' },
        { name: 'password', message: 'Enter your password:' }
    ]);

    const user = await usersCollection.findOne({
        email: answers.email,
        password: answers.password
    });

    if (user) {
        console.log(`Login successful! Welcome, ${user.firstName}!`);
        await userMenu(db, user);
    } else {
        console.log('Invalid email or password.');
    }
	
}

async function userMenu(db, user) {
    while (true) {
        const choice = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: ['View My Posts', 'View News Feed', 'Create Post', 'Add Friend', 'Remove Friend', 'View All Users', 'View Friends List', 'Logout']
            }
        ]);

        if (choice.action === 'View My Posts') {
            await viewMyPosts(db, user);
        } else if (choice.action === 'View News Feed') {
            await viewNewsFeed(db, user._id);
        } else if (choice.action === 'Create Post') {
            await createPost(db, user);
        } else if (choice.action === 'Add Friend') {
            await addFriend(db, user);
        } else if (choice.action === 'Remove Friend') {
            await removeFriend(db, user);
        } else if (choice.action === 'View All Users') {
            await viewAllUsers(db);
        } else if (choice.action === 'View Friends List') {
            await viewFriendsList(db, user);
        } else if (choice.action === 'Logout') {
            console.log('You have been logged out.');
            break;
        }
    }
}

async function viewMyPosts(db, user) {
    const postsCollection = db.collection('posts');
    const myPosts = await postsCollection.find({ userId: user._id }).toArray();
    console.log('Your Posts:');
    myPosts.forEach((post, index) => {
        console.log(`\nPost ${index + 1}:\nContent: ${post.content}\nDate: ${post.createdAt}\nReactions: ${JSON.stringify(post.reactions)}`);
    });
}


async function viewNewsFeed(db, userId) {
    try {
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            console.log("Користувача не знайдено.");
            return;
        }

        const friendsIds = user.friends.map(friendId => new ObjectId(friendId));
        friendsIds.push(user._id);

        const posts = await db.collection('posts').find({ userId: { $in: friendsIds } }).toArray();
		
        console.log("Новинна стрічка:");
        if (posts.length === 0) {
            console.log("Ваші друзі ще не опублікували постів.");
            return;
        }

        posts.forEach((post, index) => {
            console.log(`Пост ${index + 1} від користувача ${post.userId}:`);
            console.log(`Зміст: ${post.content}`);
            console.log(`Дата: ${post.createdAt}`);
            console.log(`Реакції: ${JSON.stringify(post.reactions)}`);
            console.log('---');
        });
    } catch (error) {
        console.error("Помилка при отриманні новинної стрічки:", error);
    }
}








async function createPost(db, user) {
    const postsCollection = db.collection('posts');
    const answer = await inquirer.prompt([
        { name: 'content', message: 'Enter the content of your post:' }
    ]);

    const newPost = {
        userId: user._id,
        content: answer.content,
        createdAt: new Date(),
        reactions: {}
    };

    await postsCollection.insertOne(newPost);
    console.log('Your post has been created successfully!');
}

async function addFriend(db, user) {
    const usersCollection = db.collection('users');
    const answer = await inquirer.prompt([
        { name: 'friendEmail', message: 'Enter the email of the friend you want to add:' }
    ]);

    const friend = await usersCollection.findOne({ email: answer.friendEmail });
    if (friend) {
        await usersCollection.updateOne(
            { _id: user._id },
            { $addToSet: { friends: friend._id } }
        );
        console.log(`${friend.firstName} ${friend.lastName} has been added to your friends list.`);
    } else {
        console.log('User not found.');
    }
}

async function removeFriend(db, currentUser) {
    const emailResponse = await inquirer.prompt({
        type: 'input',
        name: 'email',
        message: 'Enter the email of the friend you want to remove:',
    });

    const friend = await db.collection('users').findOne({ email: emailResponse.email });
    
    if (!friend) {
        console.log("User with this email does not exist.");
        return;
    }
	
	console.log("Attempting to remove friend with ID:", friend._id);

    const result = await db.collection('users').updateOne(
        { _id: currentUser._id },
        { $pull: { friends: friend._id } }
    );

    if (result.modifiedCount > 0) {
        console.log(`${friend.firstName} ${friend.lastName} has been removed from your friends list.`);
    } else {
        console.log("This user is not in your friends list.");
    }
}




async function viewAllUsers(db) {
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find().toArray();
    console.log('All Users:');
    allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.email}`);
    });
}

async function viewFriendsList(db, currentUser) {
    const user = await db.collection('users').findOne({ _id: currentUser._id });
    if (!user || !user.friends || user.friends.length === 0) {
        console.log("You have no friends.");
        return;
    }
    
    // Отримуємо дані друзів за їхніми ID
    const friends = await db.collection('users').find({ _id: { $in: user.friends } }).toArray();
    
    console.log("Your Friends:");
    friends.forEach((friend, index) => {
        console.log(`${index + 1}. ${friend.firstName} ${friend.lastName} - ${friend.email}`);
    });
}


async function mainMenu() {
    const db = await connectToDatabase();
    const choice = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Choose an action:',
            choices: ['Register', 'Login']
        }
    ]);

    if (choice.action === 'Register') {
        await registerUser(db);
    } else if (choice.action === 'Login') {
        await loginUser(db);
    }
}

mainMenu().catch(console.error);
