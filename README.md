# 📖 Arc Onchain Guestbook

An onchain guestbook built on **Arc Testnet** using **Arc Studio**.

The project allows users to connect their wallet and leave messages that are recorded through a smart contract on Arc Testnet.

## 🌐 Live Demo

👉 https://cheery-maamoul-b6d3a1.netlify.app/

## 📜 Smart Contract

**Network:** Arc Testnet

**Contract Address:**

`0x68f59fddff891f764d46098dfe3843ce4ce69814`

> ⚠️ This project is deployed on Arc Testnet for experimentation and learning. Testnet assets have no monetary value.

## ✨ Features

* 🔗 Wallet connection
* ✍️ Onchain guestbook messages
* 📜 Solidity smart contract
* ⚡ Built for Arc Testnet
* 🧑‍💻 Simple and clean UI
* 🛠️ Built and tested with Arc Studio

## 🏗️ Tech Stack

* **Blockchain:** Arc Testnet
* **Smart Contracts:** Solidity
* **Frontend:** TypeScript
* **UI:** React + Tailwind CSS
* **Build Tool:** Vite
* **Package Manager:** Bun
* **Contract Tooling:** Foundry

## 📁 Project Structure

```text
arc-onchain-guestbook/
├── contracts/       # Solidity smart contracts
├── scripts/         # Deployment and utility scripts
├── src/             # Frontend application
├── foundry.toml     # Foundry configuration
├── package.json     # Project dependencies
├── vite.config.ts   # Vite configuration
└── README.md
```

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/vijay0664kumar/arc-onchain-guestbook.git
cd arc-onchain-guestbook
```

### Install dependencies

```bash
bun install
```

### Configure environment variables

Create a local `.env` file using `.env.example`.

**Never commit `.env`, private keys, seed phrases, or API secrets.**

### Run locally

```bash
bun run dev
```

## 🎯 How It Works

1. Connect your wallet.
2. Enter a guestbook message.
3. Submit the transaction.
4. The message is recorded onchain.
5. View the guestbook entries through the application.

## 🔐 Security

This project is intended for testing and learning on Arc Testnet.

* Never share private keys or seed phrases.
* Never commit API keys or RPC credentials.
* Keep sensitive environment variables in `.env`.
* Use `.env.example` for public configuration examples.

## 🛠️ Built With Arc Studio

This project was built and tested using **Arc Studio** while exploring onchain application development on Arc Testnet.

## 📌 Status

🚧 **Testnet / Experimental**

The project is currently deployed on Arc Testnet.

## 👤 Author

**vijay0664kumar**

GitHub:
https://github.com/vijay0664kumar

## 📄 License

This project is for educational and experimental purposes.
