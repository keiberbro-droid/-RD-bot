# RD-Bot

RD-Bot is a simple Node.js application that prints a welcome message.

## The Problem This Solves

This project helps you get your first Node.js bot running, especially in a Termux environment on Android. The instructions below will guide you through setting up the necessary tools to run this bot and to fix common Termux issues, such as the `ls` command not being found.

## Setup on Termux

To get this bot running on Termux, you will need to install a few packages.

1.  **Update package lists:**
    ```bash
    pkg update && pkg upgrade
    ```

2.  **Install essential packages:**
    This command will install `git` (if you need to clone the repository), `nodejs` (to run the bot), and `coreutils` (which provides common commands like `ls`).

    ```bash
    pkg install git nodejs coreutils
    ```

3.  **Give Termux access to storage (Optional):**
    This is not required for the bot to run, but it is good practice for future projects.
    ```bash
    termux-setup-storage
    ```

4.  **Get the code:**
    If you haven't cloned the repository yet, you can do so with:
    ```bash
    git clone https://github.com/user/repo.git # Replace with your repository URL
    cd rd-bot
    ```
    If you already have the code, just navigate to the project directory.

5.  **Install dependencies:**
    This project does not have any external dependencies, but it is good practice to run this command.
    ```bash
    npm install
    ```

## How to Run the Bot

To run the bot, simply use the `npm start` command from within the project directory:

```bash
npm start
```

You should see the following output:
```
> rd-bot@1.0.0 start
> node index.js

✅ Hola! Este es mi primer bot en Node.js
```
