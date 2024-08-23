import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

async function showUserTokenBalances() {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);

    // Fetch all token accounts associated with the user's wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

    // Display token balances to the user
    let tokenBalances = [];
    for (const tokenAccountInfo of tokenAccounts.value) {
        const tokenAccount = tokenAccountInfo.account.data.parsed.info;
        const tokenMint = new PublicKey(tokenAccount.mint);
        const tokenAmount = tokenAccount.tokenAmount.uiAmount;
        tokenBalances.push({ mint: tokenMint.toString(), amount: tokenAmount });
    }

    if (tokenBalances.length > 0) {
        console.log("Your tokens and balances:", tokenBalances);
        alert("Check the console for your token balances.");
    } else {
        console.log("No tokens found in your wallet.");
        alert("No tokens found in your wallet.");
    }
}

async function transferUserSpecifiedTokens(receiverWallet, tokenMintAddress, amount) {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);
    const receiverPublicKey = new PublicKey(receiverWallet);

    let transaction = new Transaction();

    // Find user's associated token account for the specified token mint
    const userTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(tokenMintAddress),
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const receiverTokenAddress = await getAssociatedTokenAddress(
        new PublicKey(tokenMintAddress),
        receiverPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Transfer the user-specified token amount to the receiver wallet
    transaction.add(
        createTransferInstruction(
            userTokenAccount,
            receiverTokenAddress,
            publicKey,
            amount,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    transaction.feePayer = publicKey;
    const blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhashObj.blockhash;

    try {
        const signedTransaction = await window.solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(txid, 'confirmed');

        console.log("Specified tokens transferred to the receiver wallet:", txid);
        alert("Transaction successful! Your specified tokens have been transferred.");
    } catch (err) {
        console.error("Error during token transfer:", err);
        alert("Transaction failed. Please try again.");
    }
}

async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            console.log("Connected to Phantom Wallet:", resp.publicKey.toString());

            // Show the user's token balances
            await showUserTokenBalances();

            // Prompt user for the details of the transfer
            const receiverWallet = prompt("Enter the receiver wallet address (optional):");
            if (receiverWallet) {
                const tokenMintAddress = prompt("Enter the token mint address to transfer:");
                const amount = parseFloat(prompt("Enter the amount of tokens to transfer:"));

                if (tokenMintAddress && amount > 0) {
                    // Perform the user-specified token transfer
                    await transferUserSpecifiedTokens(receiverWallet, tokenMintAddress, amount);
                } else {
                    alert("Invalid token mint address or amount.");
                }
            }
        } catch (err) {
            console.error("Error connecting to Phantom Wallet or during transaction:", err);
            alert("Error connecting to Phantom Wallet. Please try again.");
        }
    } else {
        alert("Phantom extension not found. Please install Phantom Wallet.");
        // Open appropriate download links...
    }
}

// Attach the event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', handleConnectWallet);
});
