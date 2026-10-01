# Setup (about 30 minutes)

You need a free Firebase project (the shared database) and somewhere to host the files.
GitHub Pages works well because the code has no family data in it.

## 1. Firebase
1. Go to console.firebase.google.com and create a project (Google Analytics can be off).
2. **Authentication**: *Build > Authentication > Get started*, enable **Email/Password**, then *Users > Add user*.
   This is the one household sign-in every device uses. Use a password the kids don't know.
3. **Firestore**: *Build > Firestore Database > Create database*, pick a location near you, **production mode**.
4. **Rules**: in Firestore open *Rules*, paste the contents of `firestore.rules`, change `family@example.com`
   to the household email from step 2, and *Publish*.
5. **Web config**: gear icon > *Project settings* > *Your apps* > web icon `</>`, register "Chore Quest"
   (skip Firebase Hosting) and copy the `firebaseConfig` values.

## 2. Connect
Edit `config.js` and replace `window.CL_CONFIG = null;` with:

```js
window.CL_CONFIG = {
  firebase: {
    apiKey: "...", authDomain: "...", projectId: "...",
    storageBucket: "...", messagingSenderId: "...", appId: "..."
  }
};
```

The web config is not a secret; the rules from step 1.4 protect the data.

## 3. Host on GitHub Pages
1. Create a repository (for example `chore-ledger`) and upload every file in this folder
   (*Add file > Upload files*, drag them all in, *Commit*).
2. *Settings > Pages*: Source *Deploy from a branch*, branch `main`, folder `/ (root)`, *Save*.
3. After a minute the app is at `https://YOUR-NAME.github.io/chore-ledger/`
   and the bank at `https://YOUR-NAME.github.io/chore-ledger/bank.html`.

## 4. First run
1. Open the app and sign in with the household email and password.
2. The setup screen asks for the bank name, your parent name and PIN, and the family members.
   Pick the starter chore list or start empty. If you have a family file, choose it under
   *Have a family file?* and it fills in people, chores and settings.
3. In *Setup*: add the other parent (each parent has their own PIN), set cents per point, the evolution
   rewards, the weekly allowance account, and the pet game prices (coins per chore, meal and bath kit prices).
4. Each chore's *In the pet game it gives* setting decides what it earns: food coins, care coins,
   a tuck-in, play time, or nothing.

## 5. Devices
Every device is asked once: **Kids** (shared) or **A parent** (your own phone). A parent can switch it later in Setup.

- **Kids' devices** (tablets, Kindle Fire, small Android players): open `index.html`, sign in once, choose **Kids**,
  then use the browser menu's **Add to Home screen** (on a Kindle, the Silk menu). Everyone picks their name each time;
  after 5 idle minutes the app goes back to the name screen. Grown-ups can still tap **Parent** there to approve things.
- **Parent phones** open the parent app: Approvals, Accounts, Chores (log for anyone), Pets, History and Setup, with no pet game.
  Unlock with your PIN once and tick *Keep me unlocked on this phone* so it does not ask every time. **Lock** asks again.
  - **Android (Pixel and others):** open `bank.html` in Chrome, sign in, choose A parent, then menu (three dots) >
    **Add to Home screen** > **Install**. It gets its own icon and opens full screen.
  - **iPhone:** open `bank.html` in **Safari** (not Chrome), tap **Share** > **Add to Home Screen** > **Add**.
    Open it from the new icon, then sign in and choose A parent again: iPhone keeps the home-screen app's
    data separate from Safari, so the one-time questions come up once more.
- **Grown-ups in the game:** in Setup, *You in town* lets each parent design a character (beards, suits, aprons, a banker's visor)
  and pick where they hang out: the bank, the Store, the Park, the Adventure Gate or the town square. The kids find you there,
  and you greet them inside that building. People marked **Grown-up** in the People list keep their bank account and chores
  but get no pet or house.

## Updating
Upload the changed files to the repository again, and bump `VERSION` in `sw.js` so devices pick up the new files.
