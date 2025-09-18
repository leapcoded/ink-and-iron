Ink & Iron - The Body Mod Journal
A modern, secure, and feature-rich web application for tracking your body modification journey. Log your tattoos, piercings, and stretches, track your progress with smart recommendations, and visually catalog your collection with a dedicated photo gallery. Built with Vanilla JavaScript and Firebase, and deployed via GitHub Actions.

Live Demo: https://your-github-username.github.io/your-repo-name/

✨ Features
Comprehensive Logging: Easily log new tattoos, piercings, stretches, and aftercare routines with dedicated fields for each.

Smart Stretch Tracking: Get personalized recommendations for your next stretch based on safe, community-approved waiting times.

Secure Authentication: Sign in safely with your Google account. All your data is private and protected by Firebase Security Rules.

Cloud-Powered: Your data is stored securely in your own personal cloud database (Firebase Firestore), accessible from any device.

Photo Gallery: Automatically creates a beautiful gallery from all the photos you've uploaded with your logs.

Jewelry Collection: A dedicated tab to visually catalog all the jewelry you've logged.

Detailed Stats: See your entire journey at a glance with statistics on total logs, largest stretch size, time under the needle, and more.

Achievements: Unlock dozens of achievements for reaching milestones in your modification journey.

Customizable Themes: Personalize the look and feel of your journal with multiple color themes.

Data Management: Export all your data to a local JSON file for backup or import it to another device.

🛠️ Technologies Used
Frontend:

HTML5

Tailwind CSS for styling

Vanilla JavaScript (ES6+)

Backend & Database:

Firebase

Authentication for secure Google Sign-In.

Cloud Firestore as a NoSQL database for log and user data.

Cloud Storage for hosting user-uploaded photos.

Deployment:

GitHub Actions for Continuous Integration & Deployment.

GitHub Pages for hosting.

🚀 Setup and Local Installation
To run this project locally or deploy your own version, follow these steps:

1. Clone the Repository
git clone [https://github.com/your-github-username/your-repo-name.git](https://github.com/your-github-username/your-repo-name.git)
cd your-repo-name

2. Create a Firebase Project
This application requires a Firebase backend.

Go to the Firebase Console and create a new project.

Add a new Web App to the project.

Copy the firebaseConfig object provided.

Enable Google as a sign-in provider in the Authentication > Sign-in method tab.

In Authentication settings, add your deployment domain (e.g., your-username.github.io) to the list of Authorized domains.

Create a Cloud Firestore database. Start in Production mode and use the provided security rules below.

Create a Cloud Storage bucket and use the provided security rules.

3. Firebase Security Rules
Set these rules in the "Rules" tab of Firestore and Storage respectively.

Firestore Rules (firestore.rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

Storage Rules (storage.rules):

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

4. Set Up GitHub Secrets for Deployment
The project uses a GitHub Action to securely inject your Firebase keys during deployment. You must create the following secrets in your repository settings under Settings > Secrets and variables > Actions:

FIREBASE_API_KEY: Your Firebase API Key.

FIREBASE_AUTH_DOMAIN: Your Firebase auth domain.

FIREBASE_PROJECT_ID: Your Firebase project ID.

FIREBASE_STORAGE_BUCKET: Your Firebase storage bucket URL.

FIREBASE_MESSAGING_SENDER_ID: Your messaging sender ID.

FIREBASE_APP_ID: Your Firebase app ID.

FIREBASE_MEASUREMENT_ID: Your measurement ID.

🚢 Deployment
The included GitHub Actions workflow (.github/workflows/deploy.yml) handles everything. On every push to the main branch, it will:

Check out the code.

Inject your Firebase keys from GitHub Secrets into script.js.

Deploy the application to the gh-pages branch, making it live on GitHub Pages.

📄 License
This project is licensed under the MIT License - see the LICENSE.md file for details.
